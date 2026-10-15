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
import { BUILT_IN_TEMPLATES } from '../data/templatesData.js';

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

    const userId = req.user?.id || req.user?._id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.'
      });
    }

    // Strict ownership enforcement
    const sourceWorkflow = await Workflow.findOne({
      _id: id,
      user: userId
    });

    if (!sourceWorkflow) {
      return res.status(404).json({
        success: false,
        message: 'Workflow not found or access denied.'
      });
    }

    // Map old node IDs to newly generated unique node IDs for referential integrity
    const nodeIdMap = new Map();

    // Sanitize nodes: strip runtime telemetry and transient execution state, remap IDs
    const sourceNodes = Array.isArray(sourceWorkflow.nodes) ? sourceWorkflow.nodes : [];
    const sanitizedNodes = sourceNodes.map((node, index) => {
      const raw = node.toObject ? node.toObject() : { ...node };
      const { id: oldNodeId, type, position, measured, selected, data = {} } = raw;

      // Extract node type for semantic, readable node IDs (e.g. node_trigger_...)
      const nodeType = (typeof data?.type === 'string' && data.type.trim())
        ? data.type.trim()
        : (typeof type === 'string' && type.trim() && type !== 'custom' ? type.trim() : 'node');

      const cleanType = nodeType.replace(/[^a-zA-Z0-9_-]/g, '');
      const uniqueSuffix = `${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 7)}_${index}`;
      const newNodeId = `node_${cleanType}_${uniqueSuffix}`;

      if (oldNodeId) {
        nodeIdMap.set(String(oldNodeId), newNodeId);
      }

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

      // Also ensure internal cleanData.id is updated if present
      if (cleanData.id) {
        cleanData.id = newNodeId;
      }

      return {
        id: newNodeId,
        type: type || 'custom',
        position: position ? { x: position.x || 0, y: position.y || 0 } : { x: 0, y: 0 },
        data: cleanData,
        measured: measured || undefined,
        selected: false
      };
    });

    // Sanitize edges: ensure clean connection clones with remapped source and target identifiers
    const sourceEdges = Array.isArray(sourceWorkflow.edges) ? sourceWorkflow.edges : [];
    const sanitizedEdges = sourceEdges.map((edge, index) => {
      const raw = edge.toObject ? edge.toObject() : { ...edge };
      const {
        id: oldEdgeId,
        source,
        target,
        sourceHandle,
        targetHandle,
        animated,
        style,
        data
      } = raw;

      const newEdgeId = `edge_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 7)}_${index}`;
      const remappedSource = (source && nodeIdMap.has(String(source)))
        ? nodeIdMap.get(String(source))
        : source;
      const remappedTarget = (target && nodeIdMap.has(String(target)))
        ? nodeIdMap.get(String(target))
        : target;

      return {
        id: newEdgeId,
        source: remappedSource,
        target: remappedTarget,
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

    // Schedule: preserve cron & timezone configuration but disable to prevent duplicate automated executions
    const duplicatedSchedule = sourceWorkflow.schedule ? {
      enabled: false,
      cron: sourceWorkflow.schedule.cron || '',
      timezone: sourceWorkflow.schedule.timezone || 'UTC',
      lastRunAt: null,
      nextRunAt: null,
      lastStatus: null,
      lockedUntil: null,
      lockedBy: null
    } : undefined;

    // Webhook: generate a fresh unguessable token and disable by default for security isolation
    const duplicatedWebhook = {
      enabled: false,
      token: generateWebhookToken(),
      secret: typeof sourceWorkflow.webhook?.secret === 'string' ? sourceWorkflow.webhook.secret : '',
      lastTriggeredAt: null,
      totalTriggers: 0
    };

    const duplicatedWorkflow = await Workflow.create({
      name: duplicateName,
      description: sourceWorkflow.description || '',
      user: userId,
      nodes: sanitizedNodes,
      edges: sanitizedEdges,
      ...(duplicatedSchedule ? { schedule: duplicatedSchedule } : {}),
      webhook: duplicatedWebhook
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
        schedule: duplicatedWorkflow.schedule,
        webhook: {
          enabled: duplicatedWorkflow.webhook?.enabled || false,
          token: duplicatedWorkflow.webhook?.token,
          hasSecret: Boolean(duplicatedWorkflow.webhook?.secret)
        },
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

/**
 * @route   GET /api/workflows/templates
 * @desc    Get all available built-in workflow blueprint templates
 * @access  Private (JWT required)
 */
export const getWorkflowTemplates = async (req, res) => {
  try {
    const templates = BUILT_IN_TEMPLATES.map((tmpl) => ({
      id: tmpl.id,
      name: tmpl.name,
      category: tmpl.category,
      badge: tmpl.badge,
      badgeColor: tmpl.badgeColor,
      description: tmpl.description,
      nodeCount: tmpl.nodeCount,
      edgeCount: tmpl.edgeCount,
      flowPreview: tmpl.flowPreview
    }));

    return res.status(200).json({
      success: true,
      count: templates.length,
      templates
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve workflow blueprints.'
    });
  }
};

/**
 * @route   POST /api/workflows/from-template
 * @route   POST /api/workflows/from-template/:templateId
 * @desc    Instantiate a new workflow from a built-in blueprint with remapped IDs and safe trigger configuration
 * @access  Private (JWT required)
 */
export const createWorkflowFromTemplate = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.'
      });
    }

    const templateId = req.params?.templateId || req.body?.templateId;
    let targetTemplate = null;

    if (templateId) {
      targetTemplate = BUILT_IN_TEMPLATES.find((t) => t.id === templateId);
    }

    // If templateId was provided but not found, and no custom template nodes are provided, return 404
    if (templateId && !targetTemplate && (!Array.isArray(req.body?.nodes) || req.body.nodes.length === 0)) {
      return res.status(404).json({
        success: false,
        message: `Template "${templateId}" not found or unavailable.`
      });
    }

    // If neither templateId nor raw nodes provided, reject with 400
    if (!targetTemplate && (!Array.isArray(req.body?.nodes) || req.body.nodes.length === 0)) {
      return res.status(400).json({
        success: false,
        message: 'A valid templateId or template nodes payload is required.'
      });
    }

    const templateData = targetTemplate?.workflowData || {
      name: req.body?.name,
      description: req.body?.description,
      nodes: req.body?.nodes || [],
      edges: req.body?.edges || []
    };

    // Calculate workflow name, respecting 100 char limit
    let workflowName = (req.body?.name && typeof req.body.name === 'string' && req.body.name.trim())
      ? req.body.name.trim()
      : targetTemplate?.name
        ? `${targetTemplate.name}`
        : 'New Workflow from Blueprint';

    if (workflowName.length > 100) {
      workflowName = workflowName.slice(0, 100).trim();
    }

    const workflowDescription = (req.body?.description && typeof req.body.description === 'string')
      ? req.body.description.trim()
      : (targetTemplate?.description || templateData.description || '');

    // Map old node IDs to newly generated unique node IDs for referential integrity
    const nodeIdMap = new Map();

    const rawNodes = Array.isArray(req.body?.nodes) && req.body.nodes.length > 0
      ? req.body.nodes
      : (templateData.nodes || []);
    const rawEdges = Array.isArray(req.body?.edges) && req.body.edges.length > 0
      ? req.body.edges
      : (templateData.edges || []);

    const sanitizedNodes = rawNodes.map((node, index) => {
      const raw = node.toObject ? node.toObject() : JSON.parse(JSON.stringify(node));
      const { id: oldNodeId, type, position, measured, selected, data = {} } = raw;

      const nodeType = (typeof data?.type === 'string' && data.type.trim())
        ? data.type.trim()
        : (typeof type === 'string' && type.trim() && type !== 'custom' ? type.trim() : 'node');

      const cleanType = nodeType.replace(/[^a-zA-Z0-9_-]/g, '');
      const uniqueSuffix = `${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 7)}_${index}`;
      const newNodeId = `node_${cleanType}_${uniqueSuffix}`;

      if (oldNodeId) {
        nodeIdMap.set(String(oldNodeId), newNodeId);
      }

      // Filter out any runtime telemetry, previous execution records, or secrets
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

      if (cleanData.id) {
        cleanData.id = newNodeId;
      }

      return {
        id: newNodeId,
        type: type || 'custom',
        position: position ? { x: Number(position.x) || 0, y: Number(position.y) || 0 } : { x: 0, y: 0 },
        data: cleanData,
        measured: measured || undefined,
        selected: false
      };
    });

    const sanitizedEdges = rawEdges.map((edge, index) => {
      const raw = edge.toObject ? edge.toObject() : JSON.parse(JSON.stringify(edge));
      const {
        id: oldEdgeId,
        source,
        target,
        sourceHandle,
        targetHandle,
        animated,
        style,
        data
      } = raw;

      const newEdgeId = `edge_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 7)}_${index}`;
      const remappedSource = (source && nodeIdMap.has(String(source)))
        ? nodeIdMap.get(String(source))
        : source;
      const remappedTarget = (target && nodeIdMap.has(String(target)))
        ? nodeIdMap.get(String(target))
        : target;

      return {
        id: newEdgeId,
        source: remappedSource,
        target: remappedTarget,
        sourceHandle: sourceHandle || undefined,
        targetHandle: targetHandle || undefined,
        animated: animated !== undefined ? animated : true,
        style: style || undefined,
        data: data || undefined
      };
    });

    // Triggers start safely disabled
    const validatedSchedule = {
      enabled: false,
      cron: req.body?.schedule?.cron || templateData.schedule?.cron || '',
      timezone: req.body?.schedule?.timezone || templateData.schedule?.timezone || 'UTC',
      lastRunAt: null,
      nextRunAt: null,
      lastStatus: null,
      lockedUntil: null,
      lockedBy: null
    };

    const validatedWebhook = {
      enabled: false,
      token: generateWebhookToken(),
      secret: '',
      lastTriggeredAt: null,
      totalTriggers: 0
    };

    const createdWorkflow = await Workflow.create({
      name: workflowName,
      description: workflowDescription,
      user: userId,
      nodes: sanitizedNodes,
      edges: sanitizedEdges,
      schedule: validatedSchedule,
      webhook: validatedWebhook
    });

    return res.status(201).json({
      success: true,
      message: `Workflow created from blueprint "${targetTemplate?.name || workflowName}" successfully.`,
      workflow: {
        _id: createdWorkflow._id,
        name: createdWorkflow.name,
        description: createdWorkflow.description,
        nodes: createdWorkflow.nodes,
        edges: createdWorkflow.edges,
        schedule: createdWorkflow.schedule,
        webhook: {
          enabled: createdWorkflow.webhook?.enabled || false,
          token: createdWorkflow.webhook?.token,
          hasSecret: Boolean(createdWorkflow.webhook?.secret)
        },
        createdAt: createdWorkflow.createdAt,
        updatedAt: createdWorkflow.updatedAt
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
      message: 'Failed to instantiate template due to an internal server error.'
    });
  }
};


