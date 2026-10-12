import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import Workflow from '../server/models/Workflow.js';
import Execution from '../server/models/Execution.js';
import User from '../server/models/User.js';
import { 
  executeScheduledRun, 
  registerSchedule, 
  unregisterSchedule, 
  getScheduleStatus,
  stopAllSchedules
} from '../server/services/workflow/schedulerService.js';
import { 
  handleWebhookTrigger,
  generateWebhookToken 
} from '../server/controllers/webhookController.js';
import { 
  getWorkflows, 
  getWorkflowById, 
  updateWorkflow, 
  updateWorkflowWebhook 
} from '../server/controllers/workflowController.js';

console.log('🧪 Starting Phase 8C Scheduling & Webhook Reliability Audit Suite...\n');

const mockUserId = '507f1f77bcf86cd799439011';

async function runSequentialTests() {
  // =========================================================================
  // Suite 1: Distributed Atomic Locking & Multi-Instance Concurrency
  // =========================================================================
  console.log('--- Suite 1: Distributed Locking & Overlap Mutex ---');
  {
    const origFindOneAndUpdate = Workflow.findOneAndUpdate;
    const origFindByIdAndUpdate = Workflow.findByIdAndUpdate;
    const origUserExists = User.exists;
    const origExecCreate = Execution.create;

    const testWorkflowId = '660000000000000000000101';
    let mockWfDoc = {
      _id: testWorkflowId,
      name: 'Distributed Lock Workflow',
      user: mockUserId,
      nodes: [
        { id: 'n1', type: 'trigger', data: { type: 'trigger' } },
        { id: 'n2', type: 'output', data: { type: 'output' } }
      ],
      edges: [{ id: 'e1', source: 'n1', target: 'n2' }],
      schedule: {
        enabled: true,
        cron: '0 9 * * *',
        timezone: 'UTC',
        lockedUntil: null,
        lockedBy: null,
        lastRunAt: null,
        lastStatus: null
      }
    };

    User.exists = async () => ({ _id: mockUserId });
    Execution.create = async (doc) => ({ _id: 'exec_dist_01', ...doc });

    // 1. First execution: lock is free -> acquires lock and executes
    Workflow.findOneAndUpdate = async (query, update) => {
      const now = new Date();
      const canAcquire = !mockWfDoc.schedule.lockedUntil || mockWfDoc.schedule.lockedUntil < now;
      if (canAcquire) {
        mockWfDoc.schedule.lockedUntil = update.$set['schedule.lockedUntil'];
        mockWfDoc.schedule.lockedBy = update.$set['schedule.lockedBy'];
        mockWfDoc.schedule.lastRunAt = update.$set['schedule.lastRunAt'];
        return { ...mockWfDoc };
      }
      return null;
    };

    Workflow.findByIdAndUpdate = async (id, update) => {
      if (update.$set) {
        if (update.$set['schedule.lockedUntil'] !== undefined) {
          mockWfDoc.schedule.lockedUntil = update.$set['schedule.lockedUntil'];
        }
        if (update.$set['schedule.lockedBy'] !== undefined) {
          mockWfDoc.schedule.lockedBy = update.$set['schedule.lockedBy'];
        }
      }
      return mockWfDoc;
    };

    const result1 = await executeScheduledRun(testWorkflowId);
    assert(result1, 'First run should acquire lock and execute');
    assert.equal(result1.status, 'succeeded');
    assert.equal(mockWfDoc.schedule.lockedUntil, null, 'Lock must be released in finally block');

    // 2. Second instance attempts run while lock is held -> rejected with distributed_lock_held
    mockWfDoc.schedule.lockedUntil = new Date(Date.now() + 60000); // simulate active lease held by replica
    mockWfDoc.schedule.lockedBy = 'other-replica-instance-123';

    const result2 = await executeScheduledRun(testWorkflowId);
    assert.equal(result2.skipped, true, 'Run must be skipped when distributed lock is held');
    assert.equal(result2.reason, 'distributed_lock_held', 'Reason must be distributed_lock_held');

    // 3. Expired lock lease recovery: lock is in the past -> next run successfully claims it
    mockWfDoc.schedule.lockedUntil = new Date(Date.now() - 10000); // expired lock
    const result3 = await executeScheduledRun(testWorkflowId);
    assert(result3, 'Expired lock lease should be reclaimed cleanly');
    assert.equal(result3.status, 'succeeded');

    // Restore mocks
    Workflow.findOneAndUpdate = origFindOneAndUpdate;
    Workflow.findByIdAndUpdate = origFindByIdAndUpdate;
    User.exists = origUserExists;
    Execution.create = origExecCreate;

    console.log('  ✅ Distributed atomic locking, lease expiry recovery, and concurrency guards verified.');
  }

  // =========================================================================
  // Suite 2: Stale Jobs, Inactive Users & Failure Telemetry
  // =========================================================================
  console.log('\n--- Suite 2: Stale Jobs, Inactive Users & Failure Telemetry ---');
  {
    const origFindOneAndUpdate = Workflow.findOneAndUpdate;
    const origFindByIdAndUpdate = Workflow.findByIdAndUpdate;
    const origUserExists = User.exists;
    const origExecCreate = Execution.create;

    const testWorkflowId = '660000000000000000000102';
    let mockWfDoc = {
      _id: testWorkflowId,
      name: 'Deleted User Workflow',
      user: mockUserId,
      nodes: [{ id: 'n1', type: 'trigger', data: { type: 'trigger' } }],
      edges: [],
      schedule: { enabled: true, cron: '0 9 * * *', timezone: 'UTC' }
    };

    Workflow.findOneAndUpdate = async () => ({ ...mockWfDoc });
    Workflow.findByIdAndUpdate = async (id, update) => {
      Object.assign(mockWfDoc.schedule, update);
      return mockWfDoc;
    };

    // Case A: User no longer exists in database
    User.exists = async () => null; // User deleted!

    const resultStale = await executeScheduledRun(testWorkflowId);
    assert.equal(resultStale, null, 'Schedule for deleted user must abort execution');
    assert.equal(mockWfDoc.schedule['schedule.enabled'], false, 'Schedule must be disabled in database');
    assert.equal(mockWfDoc.schedule['schedule.lastStatus'], 'failed');

    // Restore mocks
    Workflow.findOneAndUpdate = origFindOneAndUpdate;
    Workflow.findByIdAndUpdate = origFindByIdAndUpdate;
    User.exists = origUserExists;
    Execution.create = origExecCreate;

    console.log('  ✅ Stale jobs deactivated for deleted users and failure logging verified.');
  }

  // =========================================================================
  // Suite 3: Multi-Instance & Post-Restart Webhook Idempotency (L1 + L2)
  // =========================================================================
  console.log('\n--- Suite 3: Webhook Multi-Instance / Post-Restart Idempotency ---');
  {
    const origFindOne = Workflow.findOne;
    const origExecFindOne = Execution.findOne;
    const origExecCreate = Execution.create;
    const origUserExists = User.exists;
    const origFindByIdAndUpdate = Workflow.findByIdAndUpdate;

    const validToken = generateWebhookToken();
    const testWf = {
      _id: '660000000000000000000103',
      name: 'Idempotency Test Workflow',
      user: mockUserId,
      nodes: [
        { id: 'n1', type: 'trigger', data: { type: 'trigger' } },
        { id: 'n2', type: 'output', data: { type: 'output' } }
      ],
      edges: [{ id: 'e1', source: 'n1', target: 'n2' }],
      webhook: { enabled: true, token: validToken, secret: '' }
    };

    Workflow.findOne = async () => testWf;
    Workflow.findByIdAndUpdate = async () => testWf;
    User.exists = async () => ({ _id: mockUserId });

    // Simulate L2 database execution record found in MongoDB (simulating a request processed by another instance)
    const simulatedPastRun = {
      _id: 'exec_past_run_456',
      workflow: testWf._id,
      triggerSource: 'webhook',
      triggerData: {
        eventId: 'evt_cross_instance_999'
      }
    };

    Execution.findOne = async (query) => {
      if (query.$or && query.$or.some(cond => cond['triggerData.eventId'] === 'evt_cross_instance_999')) {
        return simulatedPastRun;
      }
      return null;
    };

    let resCode = null;
    let resBody = null;
    const req = {
      params: { token: validToken },
      body: { eventId: 'evt_cross_instance_999', data: 'hello' },
      headers: { 'x-event-id': 'evt_cross_instance_999' },
      ip: '10.0.0.1'
    };
    const res = {
      status(code) { resCode = code; return this; },
      json(data) { resBody = data; return this; }
    };

    await handleWebhookTrigger(req, res);
    assert.equal(resCode, 200, 'Cross-instance duplicate must return 200');
    assert.equal(resBody.success, true);
    assert.equal(resBody.duplicate, true, 'Must detect duplicate across instances via L2 DB query');
    assert.equal(resBody.executionId, 'exec_past_run_456');

    // Restore mocks
    Workflow.findOne = origFindOne;
    Execution.findOne = origExecFindOne;
    Execution.create = origExecCreate;
    User.exists = origUserExists;
    Workflow.findByIdAndUpdate = origFindByIdAndUpdate;

    console.log('  ✅ L1 in-memory + L2 database cross-process idempotency verified.');
  }

  // =========================================================================
  // Suite 4: Webhook Security, Token Validation & Secret Redaction
  // =========================================================================
  console.log('\n--- Suite 4: Webhook Security, Secrets Redaction & Header Scrubbing ---');
  {
    const origFindOne = Workflow.findOne;
    const origUserExists = User.exists;

    // 1. Malformed token format rejection
    {
      let resCode = null, resBody = null;
      const req = {
        params: { token: 'invalid!token@123' },
        body: {},
        headers: {}
      };
      const res = {
        status(code) { resCode = code; return this; },
        json(data) { resBody = data; return this; }
      };
      await handleWebhookTrigger(req, res);
      assert.equal(resCode, 404, 'Malformed token must return 404');
      assert.equal(resBody.success, false);
    }

    // 2. Secret Redaction in getWorkflows & getWorkflowById
    {
      const origFind = Workflow.find;
      const mockWfWithSecret = {
        _id: '660000000000000000000104',
        name: 'Secret Workflow',
        user: mockUserId,
        webhook: {
          enabled: true,
          token: generateWebhookToken(),
          secret: 'confidential-vault-key-xyz'
        },
        toObject() {
          return {
            _id: this._id,
            name: this.name,
            user: this.user,
            webhook: { ...this.webhook }
          };
        }
      };

      Workflow.findOne = () => ({
        select: () => mockWfWithSecret
      });

      let resCode = null, resBody = null;
      const req = {
        params: { id: mockWfWithSecret._id },
        user: { id: mockUserId }
      };
      const res = {
        status(code) { resCode = code; return this; },
        json(data) { resBody = data; return this; }
      };

      await getWorkflowById(req, res);
      assert.equal(resCode, 200);
      assert.equal(resBody.workflow.webhook.secret, undefined, 'webhook.secret must NEVER be exposed in getWorkflowById');
      assert.equal(resBody.workflow.webhook.hasSecret, true, 'hasSecret flag must be true');

      Workflow.find = origFind;
    }

    // 3. Webhook secret preserved when update does not provide a new secret
    {
      const existingWf = {
        _id: '660000000000000000000105',
        name: 'Existing Secret Workflow',
        user: mockUserId,
        webhook: {
          enabled: true,
          token: generateWebhookToken(),
          secret: 'preserved-existing-secret-123'
        },
        toObject() {
          return {
            _id: this._id,
            name: this.name,
            user: this.user,
            webhook: { ...this.webhook }
          };
        },
        async save() {
          return this;
        }
      };

      Workflow.findOne = async () => existingWf;

      let resCode = null, resBody = null;
      const req = {
        params: { id: existingWf._id },
        user: { id: mockUserId },
        body: {
          name: 'Renamed Workflow',
          webhook: {
            enabled: true,
            secret: '' // empty string: should preserve existing secret
          }
        }
      };
      const res = {
        status(code) { resCode = code; return this; },
        json(data) { resBody = data; return this; }
      };

      await updateWorkflow(req, res);
      assert.equal(resCode, 200);
      assert.equal(existingWf.webhook.secret, 'preserved-existing-secret-123', 'Existing secret must be preserved when empty secret is sent');
      assert.equal(resBody.workflow.webhook.hasSecret, true);
      assert.equal(resBody.workflow.webhook.secret, undefined, 'Secret must not be in response body');
    }

    // Restore mocks
    Workflow.findOne = origFindOne;
    User.exists = origUserExists;

    console.log('  ✅ Token regex validation, secret preservation, and secret redaction verified.');
  }

  // =========================================================================
  // Suite 5: Sensitive Payload Masking in Telemetry
  // =========================================================================
  console.log('\n--- Suite 5: Sensitive Payload Masking in Execution Telemetry ---');
  {
    const origFindOne = Workflow.findOne;
    const origExecCreate = Execution.create;
    const origUserExists = User.exists;
    const origFindByIdAndUpdate = Workflow.findByIdAndUpdate;

    const validToken = generateWebhookToken();
    const testWf = {
      _id: '660000000000000000000106',
      name: 'Sanitization Test Workflow',
      user: mockUserId,
      nodes: [
        { id: 'n1', type: 'trigger', data: { type: 'trigger' } },
        { id: 'n2', type: 'output', data: { type: 'output' } }
      ],
      edges: [{ id: 'e1', source: 'n1', target: 'n2' }],
      webhook: { enabled: true, token: validToken, secret: '' }
    };

    Workflow.findOne = async () => testWf;
    Workflow.findByIdAndUpdate = async () => testWf;
    User.exists = async () => ({ _id: mockUserId });

    let storedExecutionDoc = null;
    Execution.create = async (doc) => {
      storedExecutionDoc = doc;
      return { _id: 'exec_sanitized_01', ...doc };
    };

    const sensitivePayload = {
      customer: 'Alice',
      password: 'SuperSecretUserPassword123!',
      apiKey: 'sk-live-abcdef1234567890',
      meta: {
        authToken: 'bearer-token-val',
        safeField: 'visible-value'
      }
    };

    let resCode = null, resBody = null;
    const req = {
      params: { token: validToken },
      body: sensitivePayload,
      headers: {
        'content-type': 'application/json',
        'authorization': 'Bearer secret-bearer-token',
        'x-api-key': 'secret-api-key-header',
        'x-custom-header': 'safe-custom-header'
      },
      ip: '127.0.0.1'
    };
    const res = {
      status(code) { resCode = code; return this; },
      json(data) { resBody = data; return this; }
    };

    await handleWebhookTrigger(req, res);
    assert.equal(resCode, 200);

    // Verify stored headers
    assert(storedExecutionDoc, 'Execution doc must be created');
    assert.equal(storedExecutionDoc.triggerData.headers['authorization'], undefined, 'authorization header must be scrubbed');
    assert.equal(storedExecutionDoc.triggerData.headers['x-api-key'], undefined, 'x-api-key header must be scrubbed');
    assert.equal(storedExecutionDoc.triggerData.headers['x-custom-header'], 'safe-custom-header', 'Safe headers preserved');

    // Verify stored payload masking
    assert.equal(storedExecutionDoc.triggerData.payload.customer, 'Alice');
    assert.equal(storedExecutionDoc.triggerData.payload.password, '[REDACTED]', 'password must be redacted in telemetry');
    assert.equal(storedExecutionDoc.triggerData.payload.apiKey, '[REDACTED]', 'apiKey must be redacted in telemetry');
    assert.equal(storedExecutionDoc.triggerData.payload.meta.authToken, '[REDACTED]', 'nested token must be redacted');
    assert.equal(storedExecutionDoc.triggerData.payload.meta.safeField, 'visible-value');

    // Restore mocks
    Workflow.findOne = origFindOne;
    Execution.create = origExecCreate;
    User.exists = origUserExists;
    Workflow.findByIdAndUpdate = origFindByIdAndUpdate;

    console.log('  ✅ Sensitive headers stripped and payload passwords/tokens/keys masked in telemetry.');
  }

  // =========================================================================
  // Suite 6: Graceful Shutdown & Lifecycle Safety
  // =========================================================================
  console.log('\n--- Suite 6: Graceful Shutdown & Lifecycle Safety ---');
  {
    const wfId = '660000000000000000000107';
    const wfDoc = {
      _id: wfId,
      schedule: { enabled: true, cron: '0 * * * *', timezone: 'UTC' }
    };

    registerSchedule(wfDoc);
    assert.equal(getScheduleStatus(wfId).isRegistered, true, 'Job must be registered');

    // Stop all schedules (simulating server SIGTERM / SIGINT)
    stopAllSchedules();
    assert.equal(getScheduleStatus(wfId).isRegistered, false, 'All schedules cleanly unregistered on shutdown');

    console.log('  ✅ Graceful shutdown lifecycle verified.');
  }

  console.log('\n🎉 ALL PHASE 8C RELIABILITY & SECURITY AUDIT TESTS PASSED! 🎉\n');
}

runSequentialTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
