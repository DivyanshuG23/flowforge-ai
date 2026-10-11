import { executeWorkflowPipeline } from '../server/services/workflow/executionEngine.js';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    passed++;
    console.log(`  ✓ ${message}`);
  } else {
    failed++;
    console.error(`  ✗ FAIL: ${message}`);
  }
}

console.log('=== FlowForge AI: Phase 5C Execution Engine AI Integration Tests ===\n');

// Helper to create mock ReadableStream
function createMockStream(content) {
  const encoder = new TextEncoder();
  const uint8 = encoder.encode(content);
  return new ReadableStream({
    start(controller) {
      controller.enqueue(uint8);
      controller.close();
    }
  });
}

// -------------------------------------------------------------
// 1. AI Node Success with Valid Structured Output
// -------------------------------------------------------------
console.log('--- 1. AI Node Success with Valid Structured Output ---');

const mockStructuredFetch = async () => {
  const geminiResponse = {
    candidates: [
      {
        content: {
          parts: [{ text: '```json\n{"anomalyDetected": true, "riskLevel": "high", "code": 503}\n```' }],
          role: 'model'
        },
        finishReason: 'STOP'
      }
    ],
    usageMetadata: {
      promptTokenCount: 22,
      candidatesTokenCount: 18,
      totalTokenCount: 40
    }
  };

  return {
    ok: true,
    status: 200,
    headers: new Headers({ 'content-type': 'application/json' }),
    body: createMockStream(JSON.stringify(geminiResponse))
  };
};

process.env.GEMINI_API_KEY = 'mock-gemini-key-phase5c';

const structuredWf = {
  nodes: [
    { id: 'trig-1', data: { type: 'trigger', label: 'Alert Trigger', payload: { service: 'auth-service', error: 'DB_TIMEOUT' } } },
    {
      id: 'ai-1',
      data: {
        type: 'ai',
        label: 'AI Diagnostic',
        prompt: 'Analyze error payload and determine risk',
        outputFormat: 'json',
        _fetchFn: mockStructuredFetch
      }
    },
    { id: 'out-1', data: { type: 'output', label: 'Commit Result' } }
  ],
  edges: [
    { id: 'e1', source: 'trig-1', target: 'ai-1' },
    { id: 'e2', source: 'ai-1', target: 'out-1' }
  ]
};

const structResult = await executeWorkflowPipeline(structuredWf);

assert(structResult.status === 'succeeded', 'Pipeline status is succeeded');
assert(structResult.nodeExecutions.length === 3, 'Recorded telemetry for all 3 nodes');

const aiExec = structResult.nodeExecutions.find((n) => n.nodeId === 'ai-1');
assert(aiExec && aiExec.status === 'succeeded', 'AI node status is succeeded');
assert(aiExec.output.text.includes('"riskLevel": "high"'), 'AI node output contains raw text');
assert(aiExec.output.structured !== null, 'AI node output structured is not null');
assert(aiExec.output.structured.anomalyDetected === true, 'AI node output structured has anomalyDetected: true');
assert(aiExec.output.structured.riskLevel === 'high', 'AI node output structured has riskLevel: "high"');
assert(aiExec.output.data.riskLevel === 'high', 'AI node exposes structured data under .data for easy lookup');
assert(aiExec.output.usage.totalTokens === 40, 'AI node records total tokens usage');
assert(aiExec.durationMs >= 0, 'AI node records duration in ms');

const outExec = structResult.nodeExecutions.find((n) => n.nodeId === 'out-1');
assert(outExec && outExec.status === 'succeeded', 'Downstream output node succeeded');
assert(outExec.output.receivedInput.structured.riskLevel === 'high', 'Downstream output node received AI structured output');

// -------------------------------------------------------------
// 2. AI Node Success with Plain Text Output
// -------------------------------------------------------------
console.log('\n--- 2. AI Node Success with Plain Text Output ---');

const mockTextFetch = async () => {
  const geminiResponse = {
    candidates: [
      {
        content: {
          parts: [{ text: 'System diagnostics normal. No mitigation action is necessary at this time.' }],
          role: 'model'
        },
        finishReason: 'STOP'
      }
    ],
    usageMetadata: {
      promptTokenCount: 15,
      candidatesTokenCount: 14,
      totalTokenCount: 29
    }
  };

  return {
    ok: true,
    status: 200,
    headers: new Headers({ 'content-type': 'application/json' }),
    body: createMockStream(JSON.stringify(geminiResponse))
  };
};

const textWf = {
  nodes: [
    { id: 'trig-1', data: { type: 'trigger', label: 'Periodic Health Check' } },
    {
      id: 'ai-1',
      data: {
        type: 'ai',
        label: 'AI Summarizer',
        prompt: 'Summarize system state',
        outputFormat: 'text',
        _fetchFn: mockTextFetch
      }
    },
    { id: 'out-1', data: { type: 'output', label: 'Log Summary' } }
  ],
  edges: [
    { id: 'e1', source: 'trig-1', target: 'ai-1' },
    { id: 'e2', source: 'ai-1', target: 'out-1' }
  ]
};

const textResult = await executeWorkflowPipeline(textWf);

assert(textResult.status === 'succeeded', 'Text pipeline succeeded');
const aiTextExec = textResult.nodeExecutions.find((n) => n.nodeId === 'ai-1');
assert(aiTextExec && aiTextExec.status === 'succeeded', 'Text AI node succeeded');
assert(aiTextExec.output.text === 'System diagnostics normal. No mitigation action is necessary at this time.', 'Preserves exact generated text');
assert(aiTextExec.output.structured === null, 'Honestly reports structured as null for plain text (no fabrication)');
assert(aiTextExec.output.data === undefined, 'Data shortcut is undefined when non-JSON');

// -------------------------------------------------------------
// 3. Downstream Condition Node Consuming AI Output
// -------------------------------------------------------------
console.log('\n--- 3. Downstream Condition Node Consuming AI Output ---');

// Case A: Condition evaluates structured field data.riskLevel == 'high' -> TRUE branch
const aiBranchingWfA = {
  nodes: [
    { id: 'trig-1', data: { type: 'trigger', label: 'Trigger' } },
    {
      id: 'ai-1',
      data: {
        type: 'ai',
        label: 'AI Classifier',
        prompt: 'Classify incident',
        outputFormat: 'json',
        _fetchFn: mockStructuredFetch
      }
    },
    {
      id: 'cond-1',
      data: {
        type: 'condition',
        label: 'Is High Risk?',
        field: 'data.riskLevel',
        operator: 'equals',
        value: 'high'
      }
    },
    { id: 'out-true', data: { type: 'output', label: 'Escalate to PagerDuty' } },
    { id: 'out-false', data: { type: 'output', label: 'Log Low Priority' } }
  ],
  edges: [
    { id: 'e1', source: 'trig-1', target: 'ai-1' },
    { id: 'e2', source: 'ai-1', target: 'cond-1' },
    { id: 'e3', source: 'cond-1', target: 'out-true', sourceHandle: 'true' },
    { id: 'e4', source: 'cond-1', target: 'out-false', sourceHandle: 'false' }
  ]
};

const branchResultA = await executeWorkflowPipeline(aiBranchingWfA);
assert(branchResultA.status === 'succeeded', 'Branch pipeline A succeeded');
const condExecA = branchResultA.nodeExecutions.find((n) => n.nodeId === 'cond-1');
assert(condExecA && condExecA.status === 'succeeded', 'Condition node succeeded');
assert(condExecA.output.result === true, 'Condition evaluated AI output to TRUE');
assert(condExecA.output.evaluatedBranch === 'true', 'evaluatedBranch is true');

const trueOutA = branchResultA.nodeExecutions.find((n) => n.nodeId === 'out-true');
assert(trueOutA && trueOutA.status === 'succeeded', 'True branch output succeeded (Escalate to PagerDuty)');

const falseOutA = branchResultA.nodeExecutions.find((n) => n.nodeId === 'out-false');
assert(falseOutA && falseOutA.status === 'skipped', 'False branch output skipped');

// Case B: AI returns low risk -> Condition evaluates FALSE branch
const mockLowRiskFetch = async () => ({
  ok: true,
  status: 200,
  headers: new Headers({ 'content-type': 'application/json' }),
  body: createMockStream(JSON.stringify({
    candidates: [{ content: { parts: [{ text: '{"riskLevel": "low"}' }] } }]
  }))
});

const aiBranchingWfB = {
  ...aiBranchingWfA,
  nodes: aiBranchingWfA.nodes.map((n) =>
    n.id === 'ai-1' ? { ...n, data: { ...n.data, _fetchFn: mockLowRiskFetch } } : n
  )
};

const branchResultB = await executeWorkflowPipeline(aiBranchingWfB);
const condExecB = branchResultB.nodeExecutions.find((n) => n.nodeId === 'cond-1');
assert(condExecB.output.result === false, 'Condition evaluated AI output to FALSE');
assert(condExecB.output.evaluatedBranch === 'false', 'evaluatedBranch is false');
assert(branchResultB.nodeExecutions.find((n) => n.nodeId === 'out-true').status === 'skipped', 'True branch skipped');
assert(branchResultB.nodeExecutions.find((n) => n.nodeId === 'out-false').status === 'succeeded', 'False branch succeeded');

// Case C: Condition evaluates AI text with 'contains' operator
const aiTextBranchingWf = {
  nodes: [
    { id: 'trig-1', data: { type: 'trigger', label: 'Trigger' } },
    {
      id: 'ai-1',
      data: {
        type: 'ai',
        label: 'AI Analyst',
        prompt: 'Diagnose issue',
        _fetchFn: mockTextFetch
      }
    },
    {
      id: 'cond-1',
      data: {
        type: 'condition',
        label: 'Mentions normal?',
        field: 'text',
        operator: 'contains',
        value: 'normal'
      }
    },
    { id: 'out-true', data: { type: 'output', label: 'Report Normal' } },
    { id: 'out-false', data: { type: 'output', label: 'Report Issue' } }
  ],
  edges: [
    { id: 'e1', source: 'trig-1', target: 'ai-1' },
    { id: 'e2', source: 'ai-1', target: 'cond-1' },
    { id: 'e3', source: 'cond-1', target: 'out-true', sourceHandle: 'true' },
    { id: 'e4', source: 'cond-1', target: 'out-false', sourceHandle: 'false' }
  ]
};

const textBranchRes = await executeWorkflowPipeline(aiTextBranchingWf);
assert(textBranchRes.nodeExecutions.find((n) => n.nodeId === 'cond-1').output.result === true, 'Condition correctly evaluated text contains');
assert(textBranchRes.nodeExecutions.find((n) => n.nodeId === 'out-true').status === 'succeeded', 'True branch succeeded for text condition');

// -------------------------------------------------------------
// 4. AI Node Failure and Downstream Skipping
// -------------------------------------------------------------
console.log('\n--- 4. AI Node Failure and Downstream Skipping ---');

const mockFailingFetch = async () => ({
  ok: false,
  status: 500,
  headers: new Headers(),
  body: createMockStream('{"error": "Internal AI cluster failure"}')
});

const failingWf = {
  nodes: [
    { id: 'trig-1', data: { type: 'trigger', label: 'Trigger' } },
    {
      id: 'ai-1',
      data: {
        type: 'ai',
        label: 'AI Diagnostic',
        prompt: 'Analyze',
        _fetchFn: mockFailingFetch
      }
    },
    { id: 'act-1', data: { type: 'action', label: 'Transform Results' } },
    { id: 'out-1', data: { type: 'output', label: 'Commit' } }
  ],
  edges: [
    { id: 'e1', source: 'trig-1', target: 'ai-1' },
    { id: 'e2', source: 'ai-1', target: 'act-1' },
    { id: 'e3', source: 'act-1', target: 'out-1' }
  ]
};

const failResult = await executeWorkflowPipeline(failingWf);

assert(failResult.status === 'failed', 'Pipeline status is failed');
const failedAi = failResult.nodeExecutions.find((n) => n.nodeId === 'ai-1');
assert(failedAi && failedAi.status === 'failed', 'AI node is marked failed');
assert(failedAi.error.includes('upstream service error (HTTP 500)'), 'AI node records sanitized 500 error');
assert(failedAi.durationMs >= 0, 'Failed AI node records duration');

const skippedAct = failResult.nodeExecutions.find((n) => n.nodeId === 'act-1');
assert(skippedAct && skippedAct.status === 'skipped', 'Dependent Action node is skipped');
assert(skippedAct.error.includes('upstream execution failure'), 'Action skip reason cites upstream failure');

const skippedOut = failResult.nodeExecutions.find((n) => n.nodeId === 'out-1');
assert(skippedOut && skippedOut.status === 'skipped', 'Terminal Output node is skipped');

// -------------------------------------------------------------
// 5. Missing Credentials & Provider Timeout
// -------------------------------------------------------------
console.log('\n--- 5. Missing Credentials & Provider Timeout ---');

// Test A: Missing Credentials
delete process.env.GEMINI_API_KEY;

const missingCredsWf = {
  nodes: [
    { id: 'trig-1', data: { type: 'trigger', label: 'Trigger' } },
    {
      id: 'ai-1',
      data: {
        type: 'ai',
        label: 'AI Node',
        prompt: 'Analyze'
      }
    },
    { id: 'out-1', data: { type: 'output', label: 'Output' } }
  ],
  edges: [
    { id: 'e1', source: 'trig-1', target: 'ai-1' },
    { id: 'e2', source: 'ai-1', target: 'out-1' }
  ]
};

const noCredsRes = await executeWorkflowPipeline(missingCredsWf);
assert(noCredsRes.status === 'failed', 'Fails pipeline when credentials are missing');
const noCredsAi = noCredsRes.nodeExecutions.find((n) => n.nodeId === 'ai-1');
assert(noCredsAi.status === 'failed', 'AI node marked failed for missing credentials');
assert(noCredsAi.error.includes('GEMINI_API_KEY is not configured'), 'Error identifies missing GEMINI_API_KEY');
assert(noCredsRes.nodeExecutions.find((n) => n.nodeId === 'out-1').status === 'skipped', 'Downstream node skipped on missing credentials');

// Restore mock key
process.env.GEMINI_API_KEY = 'mock-gemini-key-phase5c';

// Test B: Provider Timeout
const mockTimeoutFetch = async (url, opts) => {
  return new Promise((resolve, reject) => {
    if (opts.signal) {
      opts.signal.addEventListener('abort', () => {
        const err = new Error('The operation was aborted');
        err.name = 'AbortError';
        reject(err);
      });
    }
  });
};

const timeoutWf = {
  nodes: [
    { id: 'trig-1', data: { type: 'trigger', label: 'Trigger' } },
    {
      id: 'ai-1',
      data: {
        type: 'ai',
        label: 'Slow AI Node',
        prompt: 'Analyze',
        timeoutMs: 1000,
        _fetchFn: mockTimeoutFetch
      }
    },
    { id: 'out-1', data: { type: 'output', label: 'Output' } }
  ],
  edges: [
    { id: 'e1', source: 'trig-1', target: 'ai-1' },
    { id: 'e2', source: 'ai-1', target: 'out-1' }
  ]
};

const timeoutRes = await executeWorkflowPipeline(timeoutWf);
assert(timeoutRes.status === 'failed', 'Timeout causes pipeline failure');
const timeoutAi = timeoutRes.nodeExecutions.find((n) => n.nodeId === 'ai-1');
assert(timeoutAi.status === 'failed', 'Timed-out AI node marked failed');
assert(timeoutAi.error.includes('timed out after 1000ms'), 'Error indicates exact timeout limit');
assert(timeoutRes.nodeExecutions.find((n) => n.nodeId === 'out-1').status === 'skipped', 'Downstream node skipped on timeout');

// -------------------------------------------------------------
// 6. Sequential AI Nodes (Chained LLMs)
// -------------------------------------------------------------
console.log('\n--- 6. Sequential AI Nodes (Chained LLMs) ---');

let node2ReceivedContext = null;

const mockAi1 = async () => ({
  ok: true,
  status: 200,
  headers: new Headers({ 'content-type': 'application/json' }),
  body: createMockStream(JSON.stringify({
    candidates: [{ content: { parts: [{ text: '{"triage": "memory_leak", "component": "worker"}' }] } }],
    usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 15, totalTokenCount: 25 }
  }))
});

const mockAi2 = async (url, opts) => {
  const body = JSON.parse(opts.body);
  node2ReceivedContext = body.contents[0].parts[0].text;
  return {
    ok: true,
    status: 200,
    headers: new Headers({ 'content-type': 'application/json' }),
    body: createMockStream(JSON.stringify({
      candidates: [{ content: { parts: [{ text: '{"remediation": "restart_pod", "gracePeriod": 30}' }] } }],
      usageMetadata: { promptTokenCount: 25, candidatesTokenCount: 12, totalTokenCount: 37 }
    }))
  };
};

const chainedWf = {
  nodes: [
    { id: 'trig-1', data: { type: 'trigger', label: 'Trigger', payload: { alert: 'OOM' } } },
    {
      id: 'ai-triage',
      data: {
        type: 'ai',
        label: 'AI Triage',
        prompt: 'Determine root cause',
        outputFormat: 'json',
        _fetchFn: mockAi1
      }
    },
    {
      id: 'ai-remediation',
      data: {
        type: 'ai',
        label: 'AI Remediation',
        prompt: 'Formulate recovery plan',
        outputFormat: 'json',
        _fetchFn: mockAi2
      }
    },
    { id: 'out-1', data: { type: 'output', label: 'Execute Action' } }
  ],
  edges: [
    { id: 'e1', source: 'trig-1', target: 'ai-triage' },
    { id: 'e2', source: 'ai-triage', target: 'ai-remediation' },
    { id: 'e3', source: 'ai-remediation', target: 'out-1' }
  ]
};

const chainedRes = await executeWorkflowPipeline(chainedWf);
assert(chainedRes.status === 'succeeded', 'Chained AI pipeline succeeded');
const triageExec = chainedRes.nodeExecutions.find((n) => n.nodeId === 'ai-triage');
const remediationExec = chainedRes.nodeExecutions.find((n) => n.nodeId === 'ai-remediation');
assert(triageExec.status === 'succeeded', 'First AI node (Triage) succeeded');
assert(remediationExec.status === 'succeeded', 'Second AI node (Remediation) succeeded');
assert(node2ReceivedContext.includes('memory_leak'), 'Second AI node received output from first AI node in prompt context');
assert(remediationExec.output.structured.remediation === 'restart_pod', 'Second AI node generated remediation output');

// -------------------------------------------------------------
// 7. AI Nodes Inside Conditional Branches
// -------------------------------------------------------------
console.log('\n--- 7. AI Nodes Inside Conditional Branches ---');

let aiBranchTrueCalled = false;
let aiBranchFalseCalled = false;

const mockAiTrue = async () => {
  aiBranchTrueCalled = true;
  return {
    ok: true,
    status: 200,
    headers: new Headers({ 'content-type': 'application/json' }),
    body: createMockStream(JSON.stringify({
      candidates: [{ content: { parts: [{ text: 'Deep AI analysis for enterprise tier.' }] } }]
    }))
  };
};

const mockAiFalse = async () => {
  aiBranchFalseCalled = true;
  return {
    ok: true,
    status: 200,
    headers: new Headers({ 'content-type': 'application/json' }),
    body: createMockStream(JSON.stringify({
      candidates: [{ content: { parts: [{ text: 'Standard AI analysis for free tier.' }] } }]
    }))
  };
};

const branchAiWf = {
  nodes: [
    { id: 'trig-1', data: { type: 'trigger', label: 'Trigger', payload: { tier: 'enterprise' } } },
    {
      id: 'cond-1',
      data: {
        type: 'condition',
        label: 'Is Enterprise?',
        field: 'payload.tier',
        operator: 'equals',
        value: 'enterprise'
      }
    },
    {
      id: 'ai-true',
      data: {
        type: 'ai',
        label: 'Enterprise AI',
        prompt: 'Deep analysis',
        _fetchFn: mockAiTrue
      }
    },
    {
      id: 'ai-false',
      data: {
        type: 'ai',
        label: 'Standard AI',
        prompt: 'Standard analysis',
        _fetchFn: mockAiFalse
      }
    },
    { id: 'out-true', data: { type: 'output', label: 'Out True' } },
    { id: 'out-false', data: { type: 'output', label: 'Out False' } }
  ],
  edges: [
    { id: 'e1', source: 'trig-1', target: 'cond-1' },
    { id: 'e2', source: 'cond-1', target: 'ai-true', sourceHandle: 'true' },
    { id: 'e3', source: 'cond-1', target: 'ai-false', sourceHandle: 'false' },
    { id: 'e4', source: 'ai-true', target: 'out-true' },
    { id: 'e5', source: 'ai-false', target: 'out-false' }
  ]
};

const branchAiRes = await executeWorkflowPipeline(branchAiWf);
assert(branchAiRes.status === 'succeeded', 'Branch AI pipeline succeeded');
assert(aiBranchTrueCalled === true, 'Selected branch AI node was called');
assert(aiBranchFalseCalled === false, 'Unselected branch AI node was NOT called (selective execution)');
assert(branchAiRes.nodeExecutions.find((n) => n.nodeId === 'ai-true').status === 'succeeded', 'Selected AI node succeeded');
assert(branchAiRes.nodeExecutions.find((n) => n.nodeId === 'ai-false').status === 'skipped', 'Unselected AI node was marked SKIPPED');
assert(branchAiRes.nodeExecutions.find((n) => n.nodeId === 'out-false').status === 'skipped', 'Downstream of unselected AI node marked SKIPPED');

// -------------------------------------------------------------
// 8. Diamond DAG Convergence with AI Node
// -------------------------------------------------------------
console.log('\n--- 8. Diamond DAG Convergence with AI Node ---');

let convergingExecCount = 0;

const diamondAiWf = {
  nodes: [
    { id: 'trig-1', data: { type: 'trigger', label: 'Trigger', payload: { mode: 'ai' } } },
    {
      id: 'cond-1',
      data: {
        type: 'condition',
        label: 'Use AI?',
        field: 'payload.mode',
        operator: 'equals',
        value: 'ai'
      }
    },
    {
      id: 'ai-path',
      data: {
        type: 'ai',
        label: 'AI Generator',
        prompt: 'Generate answer',
        _fetchFn: mockStructuredFetch
      }
    },
    {
      id: 'rule-path',
      data: {
        type: 'action',
        label: 'Rule-based Generator'
      }
    },
    {
      id: 'converging-out',
      data: {
        type: 'output',
        label: 'Unified Output'
      }
    }
  ],
  edges: [
    { id: 'e1', source: 'trig-1', target: 'cond-1' },
    { id: 'e2', source: 'cond-1', target: 'ai-path', sourceHandle: 'true' },
    { id: 'e3', source: 'cond-1', target: 'rule-path', sourceHandle: 'false' },
    { id: 'e4', source: 'ai-path', target: 'converging-out' },
    { id: 'e5', source: 'rule-path', target: 'converging-out' }
  ]
};

const diamondRes = await executeWorkflowPipeline(diamondAiWf);
assert(diamondRes.status === 'succeeded', 'Diamond pipeline succeeded');
assert(diamondRes.nodeExecutions.find((n) => n.nodeId === 'ai-path').status === 'succeeded', 'AI path executed and succeeded');
assert(diamondRes.nodeExecutions.find((n) => n.nodeId === 'rule-path').status === 'skipped', 'Rule path skipped');

const convergingExecs = diamondRes.nodeExecutions.filter((n) => n.nodeId === 'converging-out');
assert(convergingExecs.length === 1, 'Converging Output executed EXACTLY ONCE (no duplicates)');
assert(convergingExecs[0].status === 'succeeded', 'Converging Output status is succeeded');
assert(convergingExecs[0].output.receivedInput.structured.riskLevel === 'high', 'Converging node received input strictly from active AI path');

// -------------------------------------------------------------
// Test Summary
// -------------------------------------------------------------
console.log('\n=============================================================');
console.log(`Results: ${passed} passed, ${failed} failed (${passed + failed} total)`);
console.log('=============================================================');

if (failed > 0) {
  process.exit(1);
}
