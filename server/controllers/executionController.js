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
    });

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
