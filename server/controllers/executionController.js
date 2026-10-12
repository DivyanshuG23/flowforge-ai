import mongoose from 'mongoose';
import Workflow from '../models/Workflow.js';
import Execution from '../models/Execution.js';
import { executeWorkflowPipeline } from '../services/workflow/executionEngine.js';

/**
 * @route   POST /api/workflows/:id/execute
 * @desc    Execute a saved workflow owned by the authenticated user
 * @access  Private (JWT required)
 */
export const executeWorkflow = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid workflow ID format.'
      });
    }

    // Verify ownership and load workflow
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

    if (!Array.isArray(workflow.nodes) || workflow.nodes.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot execute empty workflow. Please add at least one node.'
      });
    }

    // Execute pipeline synchronously
    const executionResult = await executeWorkflowPipeline(workflow);

    // Persist execution record in MongoDB
    const execution = await Execution.create({
      workflow: workflow._id,
      user: req.user.id,
      status: executionResult.status,
      startedAt: new Date(Date.now() - executionResult.durationMs),
      completedAt: new Date(),
      durationMs: executionResult.durationMs,
      nodeExecutions: executionResult.nodeExecutions,
      triggerSource: 'manual',
      error: executionResult.error || null
    });

    if (executionResult.status === 'succeeded') {
      return res.status(200).json({
        success: true,
        message: 'Workflow executed successfully.',
        execution
      });
    }

    return res.status(200).json({
      success: false,
      message: executionResult.error || 'Workflow execution halted due to an error.',
      execution
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Workflow execution failed due to an internal server error.'
    });
  }
};

/**
 * @route   GET /api/workflows/:id/executions
 * @desc    Get execution history for a workflow owned by the authenticated user
 * @access  Private (JWT required)
 */
export const getWorkflowExecutions = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid workflow ID format.'
      });
    }

    // Verify ownership
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

    const executions = await Execution.find({
      workflow: id,
      user: req.user.id
    })
      .sort({ createdAt: -1 })
      .limit(50);

    return res.status(200).json({
      success: true,
      count: executions.length,
      executions
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve workflow executions.'
    });
  }
};

/**
 * @route   GET /api/executions
 * @desc    Get execution history for the authenticated user with pagination and filtering
 * @access  Private (JWT required)
 */
export const getUserExecutions = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 10));
    const skip = (page - 1) * limit;

    // Strict user-level data isolation
    const filter = { user: req.user.id };

    // Filter by status if specified and valid
    const validStatuses = ['queued', 'running', 'succeeded', 'failed'];
    if (req.query.status && validStatuses.includes(req.query.status)) {
      filter.status = req.query.status;
    }

    // Filter by specific workflow if specified
    if (req.query.workflowId && mongoose.Types.ObjectId.isValid(req.query.workflowId)) {
      filter.workflow = req.query.workflowId;
    }

    // Filter by triggerSource if specified
    const validTriggers = ['manual', 'scheduled', 'webhook'];
    if (req.query.triggerSource && validTriggers.includes(req.query.triggerSource)) {
      filter.triggerSource = req.query.triggerSource;
    }

    const [totalExecutions, executions] = await Promise.all([
      Execution.countDocuments(filter),
      Execution.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('workflow', 'name description')
        .lean()
    ]);

    const totalPages = Math.ceil(totalExecutions / limit) || 1;

    return res.status(200).json({
      success: true,
      count: executions.length,
      totalExecutions,
      totalPages,
      currentPage: page,
      limit,
      executions
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve executions.'
    });
  }
};

/**
 * @route   GET /api/executions/stats
 * @desc    Get aggregated execution metrics for the authenticated user
 * @access  Private (JWT required)
 */
export const getUserExecutionStats = async (req, res) => {
  try {
    const userId = req.user.id;

    const [total, succeeded, failed, running, queued] = await Promise.all([
      Execution.countDocuments({ user: userId }),
      Execution.countDocuments({ user: userId, status: 'succeeded' }),
      Execution.countDocuments({ user: userId, status: 'failed' }),
      Execution.countDocuments({ user: userId, status: 'running' }),
      Execution.countDocuments({ user: userId, status: 'queued' })
    ]);

    const successRate = total > 0 ? Math.round((succeeded / total) * 100) : 0;

    return res.status(200).json({
      success: true,
      stats: {
        total,
        succeeded,
        failed,
        running,
        queued,
        successRate
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve execution statistics.'
    });
  }
};

/**
 * @route   GET /api/executions/:id
 * @desc    Fetch execution telemetry trace by execution ID
 * @access  Private (JWT required)
 */
export const getExecutionById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid execution ID format.'
      });
    }

    const execution = await Execution.findOne({
      _id: id,
      user: req.user.id
    }).populate('workflow', 'name description');

    if (!execution) {
      return res.status(404).json({
        success: false,
        message: 'Execution record not found or access denied.'
      });
    }

    return res.status(200).json({
      success: true,
      execution
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve execution record.'
    });
  }
};

