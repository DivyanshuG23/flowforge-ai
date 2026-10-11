import mongoose from 'mongoose';
import Workflow from '../models/Workflow.js';

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
    const { name, description, nodes, edges } = req.body;

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

    // Owner ID is strictly bound from verified JWT claims
    const workflow = await Workflow.create({
      name: name.trim(),
      description: description ? description.trim() : '',
      user: req.user.id,
      nodes: Array.isArray(nodes) ? nodes : [],
      edges: Array.isArray(edges) ? edges : []
    });

    return res.status(201).json({
      success: true,
      message: 'Workflow created successfully.',
      workflow: {
        _id: workflow._id,
        name: workflow.name,
        description: workflow.description,
        nodes: workflow.nodes,
        edges: workflow.edges,
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
    // Only return workflows owned by this user
    const workflows = await Workflow.find({ user: req.user.id })
      .sort({ updatedAt: -1 })
      .select('-__v');

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

    return res.status(200).json({
      success: true,
      workflow
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
    const { name, description, nodes, edges } = req.body;

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

    const updatedWorkflow = await workflow.save();

    return res.status(200).json({
      success: true,
      message: 'Workflow updated successfully.',
      workflow: updatedWorkflow
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
