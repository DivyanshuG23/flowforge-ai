import mongoose from 'mongoose';

/**
 * Node execution trace recording individual step telemetry
 */
const nodeExecutionSchema = new mongoose.Schema(
  {
    nodeId: {
      type: String,
      required: true,
      trim: true
    },
    nodeType: {
      type: String,
      required: true,
      trim: true
    },
    nodeLabel: {
      type: String,
      trim: true,
      default: ''
    },
    status: {
      type: String,
      enum: ['pending', 'running', 'succeeded', 'failed', 'skipped'],
      required: true,
      default: 'pending'
    },
    startedAt: {
      type: Date,
      default: null
    },
    completedAt: {
      type: Date,
      default: null
    },
    durationMs: {
      type: Number,
      default: 0
    },
    input: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    },
    output: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    },
    error: {
      type: String,
      default: null
    }
  },
  { _id: false }
);

/**
 * Execution Schema representing an execution run of a saved workflow
 */
const executionSchema = new mongoose.Schema(
  {
    workflow: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Workflow',
      required: [true, 'Workflow reference is required'],
      index: true
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required'],
      index: true
    },
    status: {
      type: String,
      enum: ['queued', 'running', 'succeeded', 'failed'],
      default: 'queued',
      required: true,
      index: true
    },
    startedAt: {
      type: Date,
      default: Date.now,
      required: true
    },
    completedAt: {
      type: Date,
      default: null
    },
    durationMs: {
      type: Number,
      default: 0
    },
    nodeExecutions: {
      type: [nodeExecutionSchema],
      default: []
    },
    error: {
      type: String,
      default: null
    },
    triggerSource: {
      type: String,
      enum: ['manual', 'scheduled', 'webhook'],
      default: 'manual',
      required: true,
      index: true
    },
    triggerData: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    }
  },
  {
    timestamps: true
  }
);

// Compound index for querying user execution history
executionSchema.index({ user: 1, createdAt: -1 });
executionSchema.index({ workflow: 1, createdAt: -1 });

const Execution = mongoose.model('Execution', executionSchema);

export default Execution;
