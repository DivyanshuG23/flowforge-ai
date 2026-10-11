import mongoose from 'mongoose';

/**
 * Position sub-schema representing X/Y coordinates in React Flow canvas
 */
const positionSchema = new mongoose.Schema(
  {
    x: {
      type: Number,
      required: [true, 'X coordinate is required'],
      default: 0
    },
    y: {
      type: Number,
      required: [true, 'Y coordinate is required'],
      default: 0
    }
  },
  { _id: false }
);

/**
 * Node sub-schema representing a visual workflow building block
 */
const nodeSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: [true, 'Node ID is required'],
      trim: true,
      maxlength: [100, 'Node ID cannot exceed 100 characters']
    },
    type: {
      type: String,
      default: 'custom',
      trim: true,
      maxlength: [50, 'Node type cannot exceed 50 characters']
    },
    position: {
      type: positionSchema,
      required: true,
      default: () => ({ x: 0, y: 0 })
    },
    data: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    measured: {
      type: mongoose.Schema.Types.Mixed
    },
    selected: {
      type: Boolean,
      default: false
    }
  },
  { _id: false }
);

/**
 * Edge sub-schema representing visual connections between node handles
 */
const edgeSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: [true, 'Edge ID is required'],
      trim: true,
      maxlength: [100, 'Edge ID cannot exceed 100 characters']
    },
    source: {
      type: String,
      required: [true, 'Edge source node ID is required'],
      trim: true,
      maxlength: [100, 'Source node ID cannot exceed 100 characters']
    },
    target: {
      type: String,
      required: [true, 'Edge target node ID is required'],
      trim: true,
      maxlength: [100, 'Target node ID cannot exceed 100 characters']
    },
    sourceHandle: {
      type: String,
      trim: true,
      maxlength: [100, 'Source handle ID cannot exceed 100 characters']
    },
    targetHandle: {
      type: String,
      trim: true,
      maxlength: [100, 'Target handle ID cannot exceed 100 characters']
    },
    animated: {
      type: Boolean,
      default: true
    },
    style: {
      type: mongoose.Schema.Types.Mixed
    },
    data: {
      type: mongoose.Schema.Types.Mixed
    }
  },
  { _id: false }
);

/**
 * Main Workflow Schema
 */
const workflowSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Workflow name is required'],
      trim: true,
      minlength: [1, 'Workflow name cannot be empty'],
      maxlength: [100, 'Workflow name cannot exceed 100 characters']
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters'],
      default: ''
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required'],
      index: true
    },
    nodes: {
      type: [nodeSchema],
      default: [],
      validate: {
        validator: function (v) {
          return Array.isArray(v) && v.length <= 100;
        },
        message: 'A workflow cannot exceed 100 nodes.'
      }
    },
    edges: {
      type: [edgeSchema],
      default: [],
      validate: {
        validator: function (v) {
          return Array.isArray(v) && v.length <= 200;
        },
        message: 'A workflow cannot exceed 200 edges.'
      }
    }
  },
  {
    timestamps: true
  }
);

// Compound index for listing user workflows sorted by recent updates
workflowSchema.index({ user: 1, updatedAt: -1 });

const Workflow = mongoose.model('Workflow', workflowSchema);

export default Workflow;
