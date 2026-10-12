import os from 'os';
import crypto from 'crypto';
import cron from 'node-cron';
import Workflow from '../../models/Workflow.js';
import Execution from '../../models/Execution.js';
import User from '../../models/User.js';
import { executeWorkflowPipeline } from './executionEngine.js';

/**
 * Foundation Workflow Scheduler Service
 * Manages server-side cron scheduling with persistence, overlap prevention,
 * timezone verification, distributed locking, and execution history integration.
 */

// Unique instance identifier for distributed lock leasing
const INSTANCE_ID = `${os.hostname() || 'node'}-${process.pid}-${crypto.randomBytes(4).toString('hex')}`;

// In-memory registry of active cron jobs indexed by workflowId string
const activeJobs = new Map();

// In-flight mutex set to prevent overlapping runs of the same workflow within this process
const inFlightWorkflows = new Set();

/**
 * Validate a 5-field cron expression
 * @param {string} cronExpression
 * @returns {boolean}
 */
export const isValidCron = (cronExpression) => {
  if (!cronExpression || typeof cronExpression !== 'string') return false;
  const trimmed = cronExpression.trim();
  // Standard 5-field check
  const parts = trimmed.split(/\s+/);
  if (parts.length !== 5) return false;
  return cron.validate(trimmed);
};

/**
 * Validate an IANA timezone identifier
 * @param {string} timezone
 * @returns {boolean}
 */
export const isValidTimezone = (timezone) => {
  if (!timezone || typeof timezone !== 'string') return false;
  try {
    Intl.DateTimeFormat(undefined, { timeZone: timezone.trim() });
    return true;
  } catch {
    return false;
  }
};

/**
 * Execute a scheduled workflow run
 * @param {string} workflowId
 */
export const executeScheduledRun = async (workflowId) => {
  const idStr = workflowId.toString();

  // 1. In-process mutex: skip execution if this process is already running this workflow
  if (inFlightWorkflows.has(idStr)) {
    console.warn(`[Scheduler] Workflow ${idStr} is currently in-flight locally. Skipping overlapping run.`);
    try {
      await Workflow.findByIdAndUpdate(idStr, {
        'schedule.lastStatus': 'skipped',
        'schedule.lastRunAt': new Date()
      });
    } catch {
      // Ignore background status update errors
    }
    return { skipped: true, reason: 'overlapping_execution' };
  }

  // 2. Multi-instance distributed lock: acquire atomic lease in MongoDB
  const now = new Date();
  const LEASE_DURATION_MS = 5 * 60 * 1000; // 5-minute lease prevents deadlocks on process crash
  const lockExpiry = new Date(now.getTime() + LEASE_DURATION_MS);

  let lockedWorkflow = null;
  try {
    lockedWorkflow = await Workflow.findOneAndUpdate(
      {
        _id: idStr,
        'schedule.enabled': true,
        $or: [
          { 'schedule.lockedUntil': null },
          { 'schedule.lockedUntil': { $lt: now } }
        ]
      },
      {
        $set: {
          'schedule.lockedUntil': lockExpiry,
          'schedule.lockedBy': INSTANCE_ID,
          'schedule.lastRunAt': now
        }
      },
      { new: true }
    );
  } catch (lockErr) {
    console.warn(`[Scheduler] Error acquiring distributed lock for workflow ${idStr}:`, lockErr.message);
  }

  if (!lockedWorkflow) {
    console.warn(`[Scheduler] Workflow ${idStr} is locked by another instance or running. Skipping duplicate run.`);
    return { skipped: true, reason: 'distributed_lock_held' };
  }

  inFlightWorkflows.add(idStr);

  const workflowToRun = lockedWorkflow;

  try {
    // 3. User verification: ensure owning user exists and is active
    const ownerId = workflowToRun.user || workflowToRun.userId;
    if (ownerId) {
      const userExists = await User.exists({ _id: ownerId });
      if (!userExists) {
        console.warn(`[Scheduler] Workflow ${idStr} belongs to a non-existent or deleted user. Deactivating schedule.`);
        unregisterSchedule(idStr);
        await Workflow.findByIdAndUpdate(idStr, {
          'schedule.enabled': false,
          'schedule.lastStatus': 'failed',
          'schedule.lockedUntil': null,
          'schedule.lockedBy': null
        });
        return null;
      }
    }

    if (!Array.isArray(workflowToRun.nodes) || workflowToRun.nodes.length === 0) {
      console.warn(`[Scheduler] Workflow ${idStr} has no nodes to execute.`);
      return null;
    }

    console.log(`[Scheduler] Triggering scheduled execution for workflow "${workflowToRun.name}" (${idStr})...`);

    // 4. Execute workflow pipeline server-side
    const executionResult = await executeWorkflowPipeline(workflowToRun, {
      triggerSource: 'scheduled',
      metadata: {
        cron: workflowToRun.schedule.cron,
        timezone: workflowToRun.schedule.timezone,
        scheduledAt: now.toISOString(),
        instanceId: INSTANCE_ID
      }
    });

    // 5. Create authenticated execution record in MongoDB
    const execution = await Execution.create({
      workflow: workflowToRun._id,
      user: ownerId,
      status: executionResult.status,
      startedAt: new Date(Date.now() - executionResult.durationMs),
      completedAt: new Date(),
      durationMs: executionResult.durationMs,
      nodeExecutions: executionResult.nodeExecutions,
      triggerSource: 'scheduled',
      triggerData: {
        cron: workflowToRun.schedule.cron,
        timezone: workflowToRun.schedule.timezone,
        instanceId: INSTANCE_ID
      },
      error: executionResult.error || null
    });

    // 6. Update workflow lastRunAt and lastStatus (preserving schedule.enabled for future runs)
    await Workflow.findByIdAndUpdate(idStr, {
      'schedule.lastRunAt': new Date(),
      'schedule.lastStatus': executionResult.status
    });

    console.log(
      `[Scheduler] Workflow ${idStr} executed with status: ${executionResult.status} (${executionResult.durationMs}ms)`
    );

    return execution;
  } catch (error) {
    console.error(`[Scheduler] Scheduled execution error for workflow ${idStr}:`, error.message);
    try {
      await Execution.create({
        workflow: workflowToRun._id || idStr,
        user: workflowToRun.user || workflowToRun.userId,
        status: 'failed',
        startedAt: now,
        completedAt: new Date(),
        durationMs: Date.now() - now.getTime(),
        nodeExecutions: [],
        triggerSource: 'scheduled',
        triggerData: {
          cron: workflowToRun.schedule?.cron || null,
          timezone: workflowToRun.schedule?.timezone || null,
          instanceId: INSTANCE_ID
        },
        error: error.message || 'Scheduled execution aborted due to an internal error.'
      });
    } catch (execErr) {
      console.error(`[Scheduler] Failed to record failure execution record for workflow ${idStr}:`, execErr.message);
    }

    try {
      await Workflow.findByIdAndUpdate(idStr, {
        'schedule.lastStatus': 'failed',
        'schedule.lastRunAt': new Date()
      });
    } catch {
      // Ignore background error update failures
    }
    return null;
  } finally {
    inFlightWorkflows.delete(idStr);
    try {
      // Release distributed lock in MongoDB
      await Workflow.findByIdAndUpdate(idStr, {
        $set: {
          'schedule.lockedUntil': null,
          'schedule.lockedBy': null
        }
      });
    } catch {
      // Ignore lock release error
    }
  }
};

/**
 * Register or update a workflow's server-side schedule in memory
 * @param {Object} workflow
 * @returns {boolean} true if successfully registered, false otherwise
 */
export const registerSchedule = (workflow) => {
  if (!workflow || !workflow._id) return false;
  const idStr = workflow._id.toString();

  // If already registered, stop existing job first
  unregisterSchedule(idStr);

  const scheduleConfig = workflow.schedule;
  if (!scheduleConfig || !scheduleConfig.enabled) {
    return false;
  }

  const cronExpression = (scheduleConfig.cron || '').trim();
  const timezone = (scheduleConfig.timezone || 'UTC').trim();

  if (!isValidCron(cronExpression)) {
    console.warn(`[Scheduler] Cannot schedule workflow ${idStr}: invalid cron expression "${cronExpression}".`);
    return false;
  }

  if (!isValidTimezone(timezone)) {
    console.warn(`[Scheduler] Cannot schedule workflow ${idStr}: invalid timezone "${timezone}".`);
    return false;
  }

  try {
    const task = cron.schedule(
      cronExpression,
      () => {
        executeScheduledRun(idStr).catch((err) => {
          console.error(`[Scheduler] Uncaught error in scheduled job ${idStr}:`, err);
        });
      },
      {
        scheduled: true,
        timezone: timezone
      }
    );

    activeJobs.set(idStr, {
      task,
      workflowId: idStr,
      cron: cronExpression,
      timezone: timezone,
      registeredAt: new Date()
    });

    console.log(
      `[Scheduler] Successfully registered schedule for workflow ${idStr} [${cronExpression}] in ${timezone}.`
    );
    return true;
  } catch (error) {
    console.error(`[Scheduler] Failed to register cron for workflow ${idStr}:`, error.message);
    return false;
  }
};

/**
 * Unregister and cancel a scheduled workflow
 * @param {string|mongoose.Types.ObjectId} workflowId
 */
export const unregisterSchedule = (workflowId) => {
  if (!workflowId) return;
  const idStr = workflowId.toString();

  const existing = activeJobs.get(idStr);
  if (existing) {
    try {
      existing.task.stop();
      if (typeof existing.task.destroy === 'function') {
        existing.task.destroy();
      }
    } catch (err) {
      console.warn(`[Scheduler] Error stopping job for workflow ${idStr}:`, err.message);
    }
    activeJobs.delete(idStr);
    console.log(`[Scheduler] Unregistered schedule for workflow ${idStr}.`);
  }
};

/**
 * Inspect schedule status in memory
 * @param {string|mongoose.Types.ObjectId} workflowId
 * @returns {{ isRegistered: boolean, cron?: string, timezone?: string, inFlight: boolean }}
 */
export const getScheduleStatus = (workflowId) => {
  const idStr = workflowId.toString();
  const job = activeJobs.get(idStr);
  return {
    isRegistered: !!job,
    cron: job?.cron || null,
    timezone: job?.timezone || null,
    inFlight: inFlightWorkflows.has(idStr),
    registeredAt: job?.registeredAt || null
  };
};

/**
 * Initialize scheduler on server startup
 * Restores all enabled schedules from MongoDB
 * @returns {Promise<number>} Number of restored schedules
 */
export const initScheduler = async () => {
  try {
    console.log('[Scheduler] Initializing server-side workflow scheduler...');
    const enabledWorkflows = await Workflow.find({ 'schedule.enabled': true });

    let count = 0;
    for (const wf of enabledWorkflows) {
      const ok = registerSchedule(wf);
      if (ok) count++;
    }

    console.log(`[Scheduler] Initialized ${count} active workflow schedule(s) from database.`);
    return count;
  } catch (error) {
    console.error('[Scheduler] Error restoring schedules from database:', error.message);
    return 0;
  }
};

/**
 * Gracefully stop all scheduled jobs (e.g. during server shutdown)
 */
export const stopAllSchedules = () => {
  console.log(`[Scheduler] Stopping ${activeJobs.size} active schedule(s)...`);
  for (const [idStr, job] of activeJobs.entries()) {
    try {
      job.task.stop();
      if (typeof job.task.destroy === 'function') {
        job.task.destroy();
      }
    } catch {
      // Ignore stop errors during shutdown
    }
  }
  activeJobs.clear();
  inFlightWorkflows.clear();
  console.log('[Scheduler] All schedules stopped.');
};

export default {
  isValidCron,
  isValidTimezone,
  executeScheduledRun,
  registerSchedule,
  unregisterSchedule,
  getScheduleStatus,
  initScheduler,
  stopAllSchedules
};
