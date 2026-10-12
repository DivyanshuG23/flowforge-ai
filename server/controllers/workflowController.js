import mongoose from 'mongoose';
import Workflow from '../models/Workflow.js';
import {
  registerSchedule,
  unregisterSchedule,
  isValidCron,
  isValidTimezone,
  getScheduleStatus
} from '../services/workflow/schedulerService.js';
import { generateWebhookToken } from './webhookController.js';

/**
 * Validates array of React Flow nodes
 * @param {Array} nodes 
 * @returns {string|null} error message or null
 */
const validateNodes = (nodes) => {
  if (!Array.isArray(nodes)) {
    return 'Nodes must be an array.';
  }
  if (nodes.length > 100) {
    return 'Workflow exceeds maximum allowed limit of 100 nodes.';
  }
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    if (!node || typeof node !== 'object') {
      return `Invalid node structure at index ${i}.`;
    }
    if (!node.id || typeof node.id !== 'string' || !node.id.trim()) {
      return `Node at index ${i} is missing a valid string ID.`;
    }
    if (node.position && (typeof node.position.x !== 'number' || typeof node.position.y !== 'number')) {
      return `Node "${node.id}" has invalid coordinates. X and Y must be numbers.`;
    }
  }
  return null;
};

/**
 * Validates array of React Flow edges
 * @param {Array} edges 
 * @returns {string|null} error message or null
 */
const validateEdges = (edges) => {
  if (!Array.isArray(edges)) {
    return 'Edges must be an array.';
  }
  if (edges.length > 200) {
    return 'Workflow exceeds maximum allowed limit of 200 connections.';
  }
  for (let i = 0; i < edges.length; i++) {
    const edge = edges[i];
    if (!edge || typeof edge !== 'object') {
      return `Invalid edge structure at index ${i}.`;
    }
    if (!edge.id || typeof edge.id !== 'string' || !edge.id.trim()) {
      return `Edge at index ${i} is missing a valid string ID.`;
    }
    if (!edge.source || typeof edge.source !== 'string' || !edge.target || typeof edge.target !== 'string') {
      return `Edge "${edge.id}" must specify both source and target node IDs.`;
    }
  }
  return null;
};

/**
 * @route   POST /api/workflows
 * @desc    Create a new workflow
 * @access  Private (JWT required)
 */
export const createWorkflow = async (req, res) => {
  try {
    const { name, description, nodes, edges, schedule, webhook } = req.body;

    // Validate workflow name
    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Workflow name is required and cannot be empty.'
      });
    }

    if (name.trim().length > 100) {
      return res.status(400).json({
        success: false,
        message: 'Workflow name cannot exceed 100 characters.'
      });
    }

    if (description && (typeof description !== 'string' || description.length > 500)) {
      return res.status(400).json({
        success: false,
        message: 'Workflow description must be a string and cannot exceed 500 characters.'
      });
    }

    // Validate nodes if provided
    if (nodes !== undefined) {
      const nodeError = validateNodes(nodes);
      if (nodeError) {
        return res.status(400).json({
          success: false,
          message: nodeError
        });
      }
    }

    // Validate edges if provided
    if (edges !== undefined) {
      const edgeError = validateEdges(edges);
      if (edgeError) {
        return res.status(400).json({
          success: false,
          message: edgeError
        });
      }
    }

    // Validate schedule if provided
    let validatedSchedule = undefined;
    if (schedule && typeof schedule === 'object') {
      const isEnabled = Boolean(schedule.enabled);
      const cron = typeof schedule.cron === 'string' ? schedule.cron.trim() : '';
      const timezone = typeof schedule.timezone === 'string' ? schedule.timezone.trim() : 'UTC';

      if (isEnabled) {
        if (!isValidCron(cron)) {
          return res.status(400).json({
            success: false,
            message: 'Invalid cron expression format (expected 5 fields, e.g. "0 9 * * *").'
          });
        }
        if (!isValidTimezone(timezone)) {
          return res.status(400).json({
            success: false,
            message: `Invalid or unsupported timezone "${timezone}".`
          });
        }
      }
      validatedSchedule = {
        enabled: isEnabled,
        cron,
        timezone,
        lastRunAt: null,
        nextRunAt: null,
        lastStatus: null
      };
    }

    // Set up webhook configuration with unguessable token
    const validatedWebhook = {
      enabled: Boolean(webhook?.enabled),
      token: generateWebhookToken(),
      secret: typeof webhook?.secret === 'string' ? webhook.secret.trim() : '',
      lastTriggeredAt: null,
      totalTriggers: 0
    };

    // Owner ID is strictly bound from verified JWT claims
    const workflow = await Workflow.create({
      name: name.trim(),
      description: description ? description.trim() : '',
      user: req.user.id,
      nodes: Array.isArray(nodes) ? nodes : [],
      edges: Array.isArray(edges) ? edges : [],
      ...(validatedSchedule ? { schedule: validatedSchedule } : {}),
      webhook: validatedWebhook
    });

    // Register active schedule in memory
    if (workflow.schedule?.enabled) {
      registerSchedule(workflow);
    }

    return res.status(201).json({
      success: true,
      message: 'Workflow created successfully.',
      workflow: {
        _id: workflow._id,
        name: workflow.name,
        description: workflow.description,
        nodes: workflow.nodes,
        edges: workflow.edges,
        schedule: workflow.schedule,
        webhook: {
          enabled: workflow.webhook.enabled,
          token: workflow.webhook.token,
          hasSecret: Boolean(workflow.webhook.secret)
        },
        createdAt: workflow.createdAt,
        updatedAt: workflow.updatedAt
      }
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((val) => val.message);
      return res.status(400).json({
        success: false,
        message: messages.join(', ')
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Failed to create workflow due to an internal server error.'
    });
  }
};

/**
 * @route   GET /api/workflows
 * @desc    List all workflows belonging to authenticated user
 * @access  Private (JWT required)
 */
export const getWorkflows = async (req, res) => {
  try {
    // Only return workflows owned by this user, excluding secret
    const workflows = await Workflow.find({ user: req.user.id })
      .sort({ updatedAt: -1 })
      .select('-__v -webhook.secret');

    return res.status(200).json({
      success: true,
      count: workflows.length,
      workflows
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve workflows.'
    });
  }
};

/**
 * @route   GET /api/workflows/:id
 * @desc    Fetch a single workflow owned by the authenticated user
 * @access  Private (JWT required)
 */
export const getWorkflowById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid workflow ID format.'
      });
    }

    // Strict ownership enforcement
    const workflow = await Workflow.findOne({
      _id: id,
      user: req.user.id
    }).select('-__v');

    if (!workflow) {
      return res.status(404).json({
        success: false,
        message: 'Workflow not found or access denied.'
      });
    }

    const workflowObj = workflow.toObject();
    if (workflowObj.webhook) {
      workflowObj.webhook.hasSecret = Boolean(workflowObj.webhook.secret && workflowObj.webhook.secret.trim());
      delete workflowObj.webhook.secret;
    }

    return res.status(200).json({
      success: true,
      workflow: workflowObj
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve workflow.'
    });
  }
};

/**
 * @route   PUT /api/workflows/:id
 * @desc    Update a workflow owned by the authenticated user
 * @access  Private (JWT required)
 */
export const updateWorkflow = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, nodes, edges, schedule, webhook } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid workflow ID format.'
      });
    }

    // Check ownership before applying changes
    const workflow = await Workflow.findOne({
      _id: id,
      user: req.user.id
    });

    if (!workflow) {
      return res.status(404).json({
        success: false,
        message: 'Workflow not found or access denied.'
      });
    }

    // Validate updates
    if (name !== undefined) {
      if (typeof name !== 'string' || !name.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Workflow name cannot be empty.'
        });
      }
      if (name.trim().length > 100) {
        return res.status(400).json({
          success: false,
          message: 'Workflow name cannot exceed 100 characters.'
        });
      }
      workflow.name = name.trim();
    }

    if (description !== undefined) {
      if (typeof description !== 'string' || description.length > 500) {
        return res.status(400).json({
          success: false,
          message: 'Workflow description cannot exceed 500 characters.'
        });
      }
      workflow.description = description.trim();
    }

    if (nodes !== undefined) {
      const nodeError = validateNodes(nodes);
      if (nodeError) {
        return res.status(400).json({
          success: false,
          message: nodeError
        });
      }
      workflow.nodes = nodes;
    }

    if (edges !== undefined) {
      const edgeError = validateEdges(edges);
      if (edgeError) {
        return res.status(400).json({
          success: false,
          message: edgeError
        });
      }
      workflow.edges = edges;
    }

    // Update schedule configuration if provided
    if (schedule !== undefined) {
      if (typeof schedule !== 'object' || schedule === null) {
        return res.status(400).json({
          success: false,
          message: 'Schedule configuration must be an object.'
        });
      }
      const isEnabled = Boolean(schedule.enabled);
      const cron = schedule.cron !== undefined ? String(schedule.cron).trim() : workflow.schedule?.cron || '';
      const timezone = schedule.timezone !== undefined ? String(schedule.timezone).trim() : workflow.schedule?.timezone || 'UTC';

      if (isEnabled) {
        if (!isValidCron(cron)) {
          return res.status(400).json({
            success: false,
            message: 'Invalid cron expression format (expected 5 fields, e.g. "0 9 * * *").'
          });
        }
        if (!isValidTimezone(timezone)) {
          return res.status(400).json({
            success: false,
            message: `Invalid or unsupported timezone "${timezone}".`
          });
        }
      }

      workflow.schedule = {
        ...(workflow.schedule?.toObject ? workflow.schedule.toObject() : workflow.schedule || {}),
        enabled: isEnabled,
        cron,
        timezone
      };
    }

    // Update webhook configuration if provided
    if (webhook !== undefined) {
      if (typeof webhook !== 'object' || webhook === null) {
        return res.status(400).json({
          success: false,
          message: 'Webhook configuration must be an object.'
        });
      }
      const isEnabled = Boolean(webhook.enabled);
      let token = workflow.webhook?.token;
      if (!token || webhook.regenerateToken) {
        token = generateWebhookToken();
      }
      let secret = workflow.webhook?.secret || '';
      if (webhook.secret !== undefined && webhook.secret !== null && String(webhook.secret).trim() !== '') {
        secret = String(webhook.secret).trim();
      } else if (webhook.clearSecret) {
        secret = '';
      }

      workflow.webhook = {
        ...(workflow.webhook?.toObject ? workflow.webhook.toObject() : workflow.webhook || {}),
        enabled: isEnabled,
        token,
        secret
      };
    }

    const updatedWorkflow = await workflow.save();

    // Sync in-memory cron scheduler
    if (updatedWorkflow.schedule?.enabled) {
      registerSchedule(updatedWorkflow);
    } else {
      unregisterSchedule(updatedWorkflow._id);
    }

    const workflowResponse = updatedWorkflow.toObject();
    if (workflowResponse.webhook) {
      workflowResponse.webhook.hasSecret = Boolean(
        workflowResponse.webhook.secret && workflowResponse.webhook.secret.trim()
      );
      delete workflowResponse.webhook.secret;
    }

    return res.status(200).json({
      success: true,
      message: 'Workflow updated successfully.',
      workflow: workflowResponse
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((val) => val.message);
      return res.status(400).json({
        success: false,
        message: messages.join(', ')
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Failed to update workflow.'
    });
  }
};

/**
 * @route   DELETE /api/workflows/:id
 * @desc    Delete a workflow owned by the authenticated user
 * @access  Private (JWT required)
 */
export const deleteWorkflow = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid workflow ID format.'
      });
    }

    // Strict ownership enforcement
    const workflow = await Workflow.findOneAndDelete({
      _id: id,
      user: req.user.id
    });

    if (!workflow) {
      return res.status(404).json({
        success: false,
        message: 'Workflow not found or access denied.'
      });
    }

    // Unregister any active cron jobs immediately
    unregisterSchedule(workflow._id);

    return res.status(200).json({
      success: true,
      message: 'Workflow deleted successfully.'
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to delete workflow.'
    });
  }
};

/**
 * @route   POST /api/workflows/:id/duplicate
 * @desc    Duplicate an existing workflow owned by the authenticated user
 * @access  Private (JWT required)
 */
export const duplicateWorkflow = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid workflow ID format.'
      });
    }

    // Strict ownership enforcement
    const sourceWorkflow = await Workflow.findOne({
      _id: id,
      user: req.user.id
    });

    if (!sourceWorkflow) {
      return res.status(404).json({
        success: false,
        message: 'Workflow not found or access denied.'
      });
    }

    // Sanitize nodes: strip runtime telemetry and transient execution state
    const sourceNodes = Array.isArray(sourceWorkflow.nodes) ? sourceWorkflow.nodes : [];
    const sanitizedNodes = sourceNodes.map((node) => {
      const raw = node.toObject ? node.toObject() : { ...node };
      const { id: nodeId, type, position, measured, selected, data = {} } = raw;

      // Filter out any runtime telemetry or execution engine attributes
      const {
        runtimeStatus,
        runtimeDurationMs,
        runtimeError,
        runtimeOutput,
        runtimeInput,
        lastExecutionId,
        executionLogs,
        ...cleanData
      } = data;

      return {
        id: nodeId,
        type: type || 'custom',
        position: position ? { x: position.x || 0, y: position.y || 0 } : { x: 0, y: 0 },
        data: cleanData,
        measured: measured || undefined,
        selected: false
      };
    });

    // Sanitize edges: ensure clean connection clones
    const sourceEdges = Array.isArray(sourceWorkflow.edges) ? sourceWorkflow.edges : [];
    const sanitizedEdges = sourceEdges.map((edge) => {
      const raw = edge.toObject ? edge.toObject() : { ...edge };
      const {
        id: edgeId,
        source,
        target,
        sourceHandle,
        targetHandle,
        animated,
        style,
        data
      } = raw;

      return {
        id: edgeId,
        source,
        target,
        sourceHandle: sourceHandle || undefined,
        targetHandle: targetHandle || undefined,
        animated: animated !== undefined ? animated : true,
        style: style || undefined,
        data: data || undefined
      };
    });

    // Form duplicate name: append " (Copy)" respecting 100 char limit
    let duplicateName = `${sourceWorkflow.name} (Copy)`;
    if (duplicateName.length > 100) {
      duplicateName = duplicateName.slice(0, 93).trim() + ' (Copy)';
    }

    const duplicatedWorkflow = await Workflow.create({
      name: duplicateName,
      description: sourceWorkflow.description || '',
      user: req.user.id,
      nodes: sanitizedNodes,
      edges: sanitizedEdges
    });

    return res.status(201).json({
      success: true,
      message: 'Workflow duplicated successfully.',
      workflow: {
        _id: duplicatedWorkflow._id,
        name: duplicatedWorkflow.name,
        description: duplicatedWorkflow.description,
        nodes: duplicatedWorkflow.nodes,
        edges: duplicatedWorkflow.edges,
        createdAt: duplicatedWorkflow.createdAt,
        updatedAt: duplicatedWorkflow.updatedAt
      }
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((val) => val.message);
      return res.status(400).json({
        success: false,
        message: messages.join(', ')
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Failed to duplicate workflow due to an internal server error.'
    });
  }
};

/**
 * @route   GET /api/workflows/:id/triggers
 * @desc    Get trigger configurations (schedule & webhook status) for a workflow
 * @access  Private (JWT required)
 */
export const getWorkflowTriggers = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid workflow ID format.'
      });
    }

    const workflow = await Workflow.findOne({
      _id: id,
      user: req.user.id
    });

    if (!workflow) {
      return res.status(404).json({
        success: false,
        message: 'Workflow not found or access denied.'
      });
    }

    const scheduleStatus = getScheduleStatus(workflow._id);

    return res.status(200).json({
      success: true,
      workflowId: workflow._id,
      schedule: {
        enabled: Boolean(workflow.schedule?.enabled),
        cron: workflow.schedule?.cron || '',
        timezone: workflow.schedule?.timezone || 'UTC',
        lastRunAt: workflow.schedule?.lastRunAt || null,
        lastStatus: workflow.schedule?.lastStatus || null,
        isRegisteredInMemory: scheduleStatus.isRegistered,
        inFlight: scheduleStatus.inFlight
      },
      webhook: {
        enabled: Boolean(workflow.webhook?.enabled),
        token: workflow.webhook?.token || null,
        hasSecret: Boolean(workflow.webhook?.secret && workflow.webhook.secret.trim()),
        lastTriggeredAt: workflow.webhook?.lastTriggeredAt || null,
        totalTriggers: workflow.webhook?.totalTriggers || 0,
        endpointPath: workflow.webhook?.token ? `/api/workflows/webhook/${workflow.webhook.token}` : null
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve workflow triggers.'
    });
  }
};

/**
 * @route   PUT /api/workflows/:id/schedule
 * @desc    Configure and toggle workflow server-side cron schedule
 * @access  Private (JWT required)
 */
export const updateWorkflowSchedule = async (req, res) => {
  try {
    const { id } = req.params;
    const { enabled, cron, timezone } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid workflow ID format.'
      });
    }

    const workflow = await Workflow.findOne({
      _id: id,
      user: req.user.id
    });

    if (!workflow) {
      return res.status(404).json({
        success: false,
        message: 'Workflow not found or access denied.'
      });
    }

    const isEnabled = enabled !== undefined ? Boolean(enabled) : Boolean(workflow.schedule?.enabled);
    const cronExp = cron !== undefined ? String(cron).trim() : workflow.schedule?.cron || '';
    const tz = timezone !== undefined ? String(timezone).trim() : workflow.schedule?.timezone || 'UTC';

    if (isEnabled) {
      if (!isValidCron(cronExp)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid cron expression format (expected 5 fields, e.g. "0 9 * * *").'
        });
      }
      if (!isValidTimezone(tz)) {
        return res.status(400).json({
          success: false,
          message: `Invalid or unsupported timezone "${tz}".`
        });
      }
    }

    workflow.schedule = {
      ...(workflow.schedule?.toObject ? workflow.schedule.toObject() : workflow.schedule || {}),
      enabled: isEnabled,
      cron: cronExp,
      timezone: tz
    };

    await workflow.save();

    if (isEnabled) {
      registerSchedule(workflow);
    } else {
      unregisterSchedule(workflow._id);
    }

    const scheduleStatus = getScheduleStatus(workflow._id);

    return res.status(200).json({
      success: true,
      message: isEnabled ? 'Workflow schedule registered and active.' : 'Workflow schedule deactivated.',
      schedule: {
        enabled: isEnabled,
        cron: cronExp,
        timezone: tz,
        isRegisteredInMemory: scheduleStatus.isRegistered,
        lastRunAt: workflow.schedule?.lastRunAt || null,
        lastStatus: workflow.schedule?.lastStatus || null
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to update schedule.'
    });
  }
};

/**
 * @route   PUT /api/workflows/:id/webhook
 * @desc    Configure and toggle workflow webhook trigger
 * @access  Private (JWT required)
 */
export const updateWorkflowWebhook = async (req, res) => {
  try {
    const { id } = req.params;
    const { enabled, secret, regenerateToken } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid workflow ID format.'
      });
    }

    const workflow = await Workflow.findOne({
      _id: id,
      user: req.user.id
    });

    if (!workflow) {
      return res.status(404).json({
        success: false,
        message: 'Workflow not found or access denied.'
      });
    }

    const isEnabled = enabled !== undefined ? Boolean(enabled) : Boolean(workflow.webhook?.enabled);
    let token = workflow.webhook?.token;
    if (!token || regenerateToken) {
      token = generateWebhookToken();
    }
    let webhookSecret = workflow.webhook?.secret || '';
    if (secret !== undefined && secret !== null && String(secret).trim() !== '') {
      webhookSecret = String(secret).trim();
    } else if (req.body?.clearSecret) {
      webhookSecret = '';
    }

    workflow.webhook = {
      ...(workflow.webhook?.toObject ? workflow.webhook.toObject() : workflow.webhook || {}),
      enabled: isEnabled,
      token,
      secret: webhookSecret,
      lastTriggeredAt: workflow.webhook?.lastTriggeredAt || null,
      totalTriggers: workflow.webhook?.totalTriggers || 0
    };

    await workflow.save();

    return res.status(200).json({
      success: true,
      message: isEnabled ? 'Webhook trigger enabled.' : 'Webhook trigger disabled.',
      webhook: {
        enabled: isEnabled,
        token,
        hasSecret: Boolean(webhookSecret),
        endpointPath: `/api/workflows/webhook/${token}`,
        lastTriggeredAt: workflow.webhook?.lastTriggeredAt || null,
        totalTriggers: workflow.webhook?.totalTriggers || 0
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to update webhook configuration.'
    });
  }
};

