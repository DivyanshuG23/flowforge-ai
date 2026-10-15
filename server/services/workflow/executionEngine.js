import { validateWorkflowGraph } from './graphValidator.js';
import { executeApiRequestNode } from './httpExecutor.js';
import { evaluateConditionNode } from './conditionEvaluator.js';
import { executeAiRequest } from './aiExecutor.js';
import {
  buildWorkflowContext,
  executeActionNode,
  interpolateTemplate
} from './templateInterpolator.js';

/**
 * Foundation Workflow Execution Engine
 * Executes deterministic node pipelines synchronously with detailed step telemetry
 */

// Supported node types
const SUPPORTED_NODE_TYPES = new Set(['trigger', 'output', 'action', 'api', 'condition', 'ai']);

/**
 * Execute an AI node safely using the secure backend AI executor
 * @param {Object} node - Workflow node definition
 * @param {Object} incomingInput - Aggregated data from parent nodes
 * @returns {Promise<{ success: boolean, output?: any, error?: string, requestTelemetry?: any }>}
 */
const executeAiNode = async (node, incomingInput, options = {}, workflowContext = null) => {
  const nodeData = node.data || {};

  // Support deterministic non-billable demo fixtures for technical interview demonstrations (strictly opt-in)
  const isExplicitFixture =
    typeof nodeData.demoFixture === 'string'
      ? ['high-severity', 'low-severity', 'failover-recovery'].includes(nodeData.demoFixture)
      : typeof nodeData.demoFixture === 'object' && nodeData.demoFixture !== null;

  if (isExplicitFixture) {
    let fixture = nodeData.demoFixture;
    if (fixture === 'high-severity') {
      fixture = {
        structured: {
          severity: 'high',
          reason: 'Database connection pool exhausted during transaction commit with 14.8% error rate',
          recommendedAction: 'Trigger PagerDuty alert and scale database connection pool'
        }
      };
    } else if (fixture === 'low-severity') {
      fixture = {
        structured: {
          severity: 'low',
          reason: 'Nominal operational telemetry within baseline thresholds',
          recommendedAction: 'Archive incident telemetry to routine audit ledger'
        }
      };
    } else if (fixture === 'failover-recovery') {
      fixture = {
        structured: {
          severity: 'high',
          reason: 'Groq fallback confirmed critical database pool exhaustion',
          recommendedAction: 'Escalate to on-call infrastructure team'
        },
        provider: 'groq',
        model: 'openai/gpt-oss-20b',
        failoverLog: [
          {
            provider: 'gemini',
            model: 'gemini-2.5-flash',
            status: 404,
            error: 'AI model not found or unsupported by provider (HTTP 404). This model models/gemini-2.5-flash is no longer available to new users.',
            durationMs: 420,
            success: false,
            retryable: false,
            permanent: true
          },
          {
            provider: 'groq',
            model: 'openai/gpt-oss-20b',
            status: 200,
            durationMs: 280,
            success: true,
            retryable: false,
            permanent: false
          }
        ]
      };
    }

    if (typeof fixture === 'object') {
      const structuredOutput = fixture.structured ?? (typeof fixture === 'object' && !fixture.text ? fixture : null);
      const textOutput = fixture.text || (structuredOutput ? JSON.stringify(structuredOutput, null, 2) : '');
      return {
        success: true,
        output: {
          text: textOutput,
          structured: structuredOutput,
          model: fixture.model || 'demo-fixture',
          provider: fixture.provider || 'deterministic-fixture',
          usage: { promptTokens: 35, completionTokens: 25, totalTokens: 60 },
          durationMs: fixture.durationMs || 75,
          failoverLog: fixture.failoverLog || null,
          isDemoFixture: true,
          ...(structuredOutput && typeof structuredOutput === 'object' && !Array.isArray(structuredOutput)
            ? { data: structuredOutput }
            : {})
        },
        requestTelemetry: { isDemoFixture: true, label: 'Deterministic Demo Fixture (Non-billable)' }
      };
    }
  }

  let prompt = '';
  if (typeof nodeData.prompt === 'string' && nodeData.prompt.trim()) {
    prompt = nodeData.prompt.trim();
  } else if (typeof nodeData.instruction === 'string' && nodeData.instruction.trim()) {
    prompt = nodeData.instruction.trim();
  } else if (typeof nodeData.description === 'string' && nodeData.description.trim()) {
    prompt = nodeData.description.trim();
  }

  // Dynamically interpolate template variables in prompt
  if (workflowContext && prompt.includes('{{')) {
    prompt = interpolateTemplate(prompt, workflowContext);
  }

  let systemPrompt = nodeData.systemPrompt;
  if (workflowContext && typeof systemPrompt === 'string' && systemPrompt.includes('{{')) {
    systemPrompt = interpolateTemplate(systemPrompt, workflowContext);
  }

  const aiOptions = {
    prompt,
    systemPrompt,
    model: nodeData.model,
    provider: nodeData.provider,
    temperature: nodeData.temperature,
    maxTokens: nodeData.maxTokens,
    outputFormat: nodeData.outputFormat,
    timeoutMs: nodeData.timeoutMs,
    baseUrl: nodeData.baseUrl,
    maxRetries: nodeData.maxRetries,
    enableFailover: nodeData.enableFailover === true,
    failoverChain: nodeData.failoverChain,
    _sleepFn: nodeData._sleepFn,
    input: incomingInput,
    _fetchFn: nodeData._fetchFn
  };

  const aiResult = await executeAiRequest(aiOptions);

  if (aiResult.success) {
    const structuredOutput = aiResult.structured ?? null;
    return {
      success: true,
      output: {
        text: aiResult.text || '',
        structured: structuredOutput,
        model: aiResult.model,
        provider: aiResult.provider,
        usage: aiResult.usage || { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
        durationMs: aiResult.durationMs || 0,
        failoverLog: aiResult.failoverLog || null,
        ...(structuredOutput && typeof structuredOutput === 'object' && !Array.isArray(structuredOutput)
          ? { data: structuredOutput }
          : {})
      },
      requestTelemetry: aiResult.telemetry || null
    };
  }

  return {
    success: false,
    error: aiResult.error || 'AI node execution failed.',
    output: aiResult.failoverLog ? { failoverLog: aiResult.failoverLog } : null,
    requestTelemetry: aiResult.telemetry || null
  };
};

/**
 * Execute a single node safely and deterministically without eval or side effects
 * @param {Object} node - Workflow node definition
 * @param {Object} incomingInput - Aggregated data from parent nodes
 * @returns {Promise<{ success: boolean, output?: any, error?: string, requestTelemetry?: any }>}
 */
const executeNodeSafely = async (node, incomingInput, options = {}, workflowContext = null) => {
  const nodeType = node.data?.type || node.type || 'action';

  switch (nodeType) {
    case 'trigger': {
      // Deterministic trigger output supporting manual, scheduled, or webhook payloads
      const basePayload = options.triggerPayload || node.data?.payload || {
        event: 'pipeline_initiated',
        status: 'active'
      };

      return {
        success: true,
        requestTelemetry: options.triggerPayload || node.data?.payload || null,
        output: {
          triggerType: options.triggerSource || node.data?.triggerType || 'manual',
          timestamp: new Date().toISOString(),
          payload: basePayload,
          ...(typeof basePayload === 'object' && basePayload !== null && !Array.isArray(basePayload)
            ? basePayload
            : {}),
          ...(options.metadata ? { metadata: options.metadata } : {})
        }
      };
    }

    case 'action': {
      return executeActionNode(node, incomingInput, workflowContext);
    }

    case 'output': {
      // Deterministic terminal output collection with optional dynamic target formatting
      const rawTarget = node.data?.target || 'HTTP 200 Response';
      const target = (workflowContext ? interpolateTemplate(rawTarget, workflowContext) : rawTarget) ?? rawTarget;

      let finalPayload = incomingInput ?? null;
      if (node.data?.payloadTemplate || node.data?.mapping) {
        const actionResult = executeActionNode(node, incomingInput, workflowContext);
        finalPayload = actionResult.output?.data ?? incomingInput;
      }

      return {
        success: true,
        output: {
          finalized: true,
          completedAt: new Date().toISOString(),
          receivedInput: finalPayload,
          target
        }
      };
    }

    case 'ai': {
      return await executeAiNode(node, incomingInput, options, workflowContext);
    }

    case 'api': {
      return await executeApiRequestNode(node, incomingInput, options, workflowContext);
    }

    case 'condition': {
      return evaluateConditionNode(node, incomingInput, workflowContext);
    }

    default:
      return {
        success: false,
        error: `Unsupported node type "${nodeType}" on node "${node.id}".`
      };
  }
};

/**
 * Execute a validated workflow pipeline
 * @param {Object} workflow - Saved workflow document
 * @returns {Promise<{ status: string, error?: string, nodeExecutions: Array, durationMs: number }>}
 */
export const executeWorkflowPipeline = async (workflow, options = {}) => {
  const startTime = Date.now();

  const plainWorkflow =
    typeof workflow?.toObject === 'function' ? workflow.toObject() : workflow || {};

  const nodes = plainWorkflow.nodes || [];
  const edges = plainWorkflow.edges || [];

  // 1. Graph validation and topological sort
  const validation = validateWorkflowGraph(nodes, edges);
  if (!validation.isValid) {
    const durationMs = Date.now() - startTime;
    return {
      status: 'failed',
      error: validation.error,
      nodeExecutions: [],
      durationMs
    };
  }

  const executionOrder = validation.executionOrder;
  const nodeOutputs = new Map();
  const nodeExecutions = [];

  // Build incoming and outgoing edge lookups with unique edge keys
  const incomingEdgesMap = new Map();
  const outgoingEdgesMap = new Map();
  for (const node of nodes) {
    incomingEdgesMap.set(node.id, []);
    outgoingEdgesMap.set(node.id, []);
  }

  const normalizedEdges = edges.map((edge, idx) => {
    const key = edge.id || `edge-${edge.source}-${edge.target}-${edge.sourceHandle || 'default'}-${idx}`;
    return {
      ...edge,
      _key: key
    };
  });

  for (const edge of normalizedEdges) {
    if (incomingEdgesMap.has(edge.target)) {
      incomingEdgesMap.get(edge.target).push(edge);
    }
    if (outgoingEdgesMap.has(edge.source)) {
      outgoingEdgesMap.get(edge.source).push(edge);
    }
  }

  const activeEdgeKeys = new Set();
  const inactiveEdgeKeys = new Set();

  let pipelineFailed = false;
  let pipelineError = null;

  // 2. Execute nodes sequentially along deterministic topological order
  for (let i = 0; i < executionOrder.length; i++) {
    const node = executionOrder[i];
    const nodeType = node.data?.type || node.type || 'action';
    const nodeLabel = node.data?.label || node.id;

    if (pipelineFailed) {
      // Upstream failed: mark remaining nodes as skipped
      nodeExecutions.push({
        nodeId: node.id,
        nodeType,
        nodeLabel,
        status: 'skipped',
        startedAt: null,
        completedAt: null,
        durationMs: 0,
        input: null,
        output: null,
        error: 'Skipped due to upstream execution failure'
      });
      continue;
    }

    // Branch reachability check
    const incomingEdges = incomingEdgesMap.get(node.id) || [];
    let activeIncoming = [];

    if (incomingEdges.length > 0) {
      activeIncoming = incomingEdges.filter((e) => activeEdgeKeys.has(e._key));

      // If a node has incoming connections but none are active, it is on an unselected branch
      if (activeIncoming.length === 0) {
        nodeExecutions.push({
          nodeId: node.id,
          nodeType,
          nodeLabel,
          status: 'skipped',
          startedAt: null,
          completedAt: null,
          durationMs: 0,
          input: null,
          output: null,
          error: 'Skipped: branch was not taken'
        });

        // Deactivate all outgoing edges from this skipped node
        const outEdges = outgoingEdgesMap.get(node.id) || [];
        for (const outEdge of outEdges) {
          inactiveEdgeKeys.add(outEdge._key);
        }
        continue;
      }
    }

    const nodeStartTime = new Date();

    // Aggregate inputs ONLY from active incoming edges
    let aggregatedInput = null;
    if (incomingEdges.length === 0) {
      aggregatedInput = null;
    } else if (activeIncoming.length === 1) {
      aggregatedInput = nodeOutputs.get(activeIncoming[0].source) ?? null;
    } else if (activeIncoming.length > 1) {
      aggregatedInput = {};
      for (const edge of activeIncoming) {
        aggregatedInput[edge.source] = nodeOutputs.get(edge.source) ?? null;
      }
    }

    // Construct rich, prototype-safe workflow resolution context
    const workflowContext = buildWorkflowContext({
      nodes,
      nodeOutputs,
      currentNode: node,
      incomingInput: aggregatedInput,
      options
    });

    // Execute node safely
    const nodeResult = await executeNodeSafely(node, aggregatedInput, options, workflowContext);
    const nodeEndTime = new Date();
    const nodeDurationMs = nodeEndTime.getTime() - nodeStartTime.getTime();

    const recordedInput = nodeResult.requestTelemetry || aggregatedInput;

    if (nodeResult.success) {
      nodeOutputs.set(node.id, nodeResult.output);
      nodeExecutions.push({
        nodeId: node.id,
        nodeType,
        nodeLabel,
        status: 'succeeded',
        startedAt: nodeStartTime,
        completedAt: nodeEndTime,
        durationMs: nodeDurationMs,
        input: recordedInput,
        output: nodeResult.output,
        error: null
      });

      // Route outgoing edges
      const outEdges = outgoingEdgesMap.get(node.id) || [];
      if (nodeType === 'condition') {
        const evaluatedBranch = nodeResult.result ? 'true' : 'false';
        for (const outEdge of outEdges) {
          const handle = (outEdge.sourceHandle || '').trim().toLowerCase();
          if (handle === evaluatedBranch || (!handle && evaluatedBranch === 'true')) {
            activeEdgeKeys.add(outEdge._key);
          } else {
            inactiveEdgeKeys.add(outEdge._key);
          }
        }
      } else {
        // Standard nodes activate all outgoing connections upon success
        for (const outEdge of outEdges) {
          activeEdgeKeys.add(outEdge._key);
        }
      }
    } else {
      pipelineFailed = true;
      pipelineError = nodeResult.error;
      nodeExecutions.push({
        nodeId: node.id,
        nodeType,
        nodeLabel,
        status: 'failed',
        startedAt: nodeStartTime,
        completedAt: nodeEndTime,
        durationMs: nodeDurationMs,
        input: recordedInput,
        output: nodeResult.output || null,
        error: nodeResult.error
      });

      // Deactivate all outgoing edges upon failure
      const outEdges = outgoingEdgesMap.get(node.id) || [];
      for (const outEdge of outEdges) {
        inactiveEdgeKeys.add(outEdge._key);
      }
    }
  }

  const totalDurationMs = Date.now() - startTime;

  return {
    status: pipelineFailed ? 'failed' : 'succeeded',
    error: pipelineError,
    nodeExecutions,
    durationMs: totalDurationMs
  };
};
