import { executeWorkflowPipeline } from '../server/services/workflow/executionEngine.js';
import { validateWorkflowGraph } from '../server/services/workflow/graphValidator.js';

const API_BASE = 'http://localhost:5000/api';

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

async function apiRequest(endpoint, { method = 'GET', body = null, token = null } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  const config = {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  };

  const res = await fetch(`${API_BASE}${endpoint}`, config);
  let data = null;
  try {
    data = await res.json();
  } catch (e) {
    data = null;
  }
  return { status: res.status, data };
}

console.log('=== FlowForge AI: Phase 2 Branch Reachability & Engine Routing Tests ===\n');

// 1. TRUE Branch Routing Tests
console.log('--- 1. TRUE Branch Execution & Selective Skipping ---');
const trueBranchWorkflow = {
  nodes: [
    { id: 'trig_1', data: { type: 'trigger', payload: { status: 200, count: 5 } } },
    { id: 'cond_1', data: { type: 'condition', field: 'payload.status', operator: 'equals', value: 200 } },
    { id: 'act_true', data: { type: 'action', label: 'Action on True' } },
    { id: 'out_true', data: { type: 'output', label: 'Output True' } },
    { id: 'act_false', data: { type: 'action', label: 'Action on False' } },
    { id: 'out_false', data: { type: 'output', label: 'Output False' } }
  ],
  edges: [
    { id: 'e1', source: 'trig_1', target: 'cond_1' },
    { id: 'e2', source: 'cond_1', target: 'act_true', sourceHandle: 'true' },
    { id: 'e3', source: 'act_true', target: 'out_true' },
    { id: 'e4', source: 'cond_1', target: 'act_false', sourceHandle: 'false' },
    { id: 'e5', source: 'act_false', target: 'out_false' }
  ]
};

const trueRes = await executeWorkflowPipeline(trueBranchWorkflow);
assert(trueRes.status === 'succeeded', 'Pipeline status is "succeeded" for true branch');
assert(trueRes.nodeExecutions.length === 6, 'Recorded telemetry for all 6 nodes');

const stepMapTrue = {};
for (const step of trueRes.nodeExecutions) {
  stepMapTrue[step.nodeId] = step;
}

assert(stepMapTrue['trig_1']?.status === 'succeeded', 'Trigger succeeded');
assert(stepMapTrue['cond_1']?.status === 'succeeded', 'Condition node succeeded');
assert(stepMapTrue['cond_1']?.output?.result === true, 'Condition evaluated to TRUE');
assert(stepMapTrue['cond_1']?.output?.evaluatedBranch === 'true', 'evaluatedBranch recorded as "true"');
assert(stepMapTrue['act_true']?.status === 'succeeded', 'True branch action succeeded');
assert(stepMapTrue['out_true']?.status === 'succeeded', 'True branch output succeeded');
assert(stepMapTrue['act_false']?.status === 'skipped', 'False branch action marked SKIPPED');
assert(stepMapTrue['out_false']?.status === 'skipped', 'False branch output marked SKIPPED');
assert(stepMapTrue['act_false']?.error?.includes('branch was not taken'), 'Skipped node recorded "branch was not taken"');

// 2. FALSE Branch Routing Tests
console.log('\n--- 2. FALSE Branch Execution & Selective Skipping ---');
const falseBranchWorkflow = {
  nodes: [
    { id: 'trig_1', data: { type: 'trigger', payload: { status: 404, error: 'Not Found' } } },
    { id: 'cond_1', data: { type: 'condition', field: 'payload.status', operator: 'equals', value: 200 } },
    { id: 'act_true', data: { type: 'action', label: 'Action on True' } },
    { id: 'out_true', data: { type: 'output', label: 'Output True' } },
    { id: 'act_false', data: { type: 'action', label: 'Action on False' } },
    { id: 'out_false', data: { type: 'output', label: 'Output False' } }
  ],
  edges: [
    { id: 'e1', source: 'trig_1', target: 'cond_1' },
    { id: 'e2', source: 'cond_1', target: 'act_true', sourceHandle: 'true' },
    { id: 'e3', source: 'act_true', target: 'out_true' },
    { id: 'e4', source: 'cond_1', target: 'act_false', sourceHandle: 'false' },
    { id: 'e5', source: 'act_false', target: 'out_false' }
  ]
};

const falseRes = await executeWorkflowPipeline(falseBranchWorkflow);
assert(falseRes.status === 'succeeded', 'Pipeline status is "succeeded" for false branch');

const stepMapFalse = {};
for (const step of falseRes.nodeExecutions) {
  stepMapFalse[step.nodeId] = step;
}

assert(stepMapFalse['cond_1']?.status === 'succeeded', 'Condition node succeeded');
assert(stepMapFalse['cond_1']?.output?.result === false, 'Condition evaluated to FALSE');
assert(stepMapFalse['cond_1']?.output?.evaluatedBranch === 'false', 'evaluatedBranch recorded as "false"');
assert(stepMapFalse['act_true']?.status === 'skipped', 'True branch action marked SKIPPED');
assert(stepMapFalse['out_true']?.status === 'skipped', 'True branch output marked SKIPPED');
assert(stepMapFalse['act_false']?.status === 'succeeded', 'False branch action succeeded');
assert(stepMapFalse['out_false']?.status === 'succeeded', 'False branch output succeeded');

// 3. Diamond-Shaped Graph Convergence Tests
console.log('\n--- 3. Diamond-Shaped DAG Convergence (Branches Re-joining) ---');
const diamondTrueWorkflow = {
  nodes: [
    { id: 'd_trig', data: { type: 'trigger', payload: { role: 'admin' } } },
    { id: 'd_cond', data: { type: 'condition', field: 'payload.role', operator: 'equals', value: 'admin' } },
    { id: 'd_act_a', data: { type: 'action', label: 'Admin Route' } },
    { id: 'd_act_b', data: { type: 'action', label: 'User Route' } },
    { id: 'd_merge', data: { type: 'output', label: 'Unified Terminal Output' } }
  ],
  edges: [
    { id: 'de1', source: 'd_trig', target: 'd_cond' },
    { id: 'de2', source: 'd_cond', target: 'd_act_a', sourceHandle: 'true' },
    { id: 'de3', source: 'd_cond', target: 'd_act_b', sourceHandle: 'false' },
    { id: 'de4', source: 'd_act_a', target: 'd_merge' },
    { id: 'de5', source: 'd_act_b', target: 'd_merge' }
  ]
};

const diamondRes = await executeWorkflowPipeline(diamondTrueWorkflow);
assert(diamondRes.status === 'succeeded', 'Diamond pipeline succeeded');

const diamondSteps = {};
for (const step of diamondRes.nodeExecutions) {
  diamondSteps[step.nodeId] = step;
}

assert(diamondSteps['d_cond']?.output?.result === true, 'Condition evaluated true');
assert(diamondSteps['d_act_a']?.status === 'succeeded', 'Admin route succeeded');
assert(diamondSteps['d_act_b']?.status === 'skipped', 'User route marked skipped');
assert(diamondSteps['d_merge']?.status === 'succeeded', 'Converging output node executed and succeeded');
assert(diamondRes.nodeExecutions.filter(s => s.nodeId === 'd_merge').length === 1, 'Converging node executed EXACTLY ONCE (no duplicates)');

// Test diamond DAG when FALSE branch taken
const diamondFalseWorkflow = {
  ...diamondTrueWorkflow,
  nodes: [
    { id: 'd_trig', data: { type: 'trigger', payload: { role: 'guest' } } },
    { id: 'd_cond', data: { type: 'condition', field: 'payload.role', operator: 'equals', value: 'admin' } },
    { id: 'd_act_a', data: { type: 'action', label: 'Admin Route' } },
    { id: 'd_act_b', data: { type: 'action', label: 'User Route' } },
    { id: 'd_merge', data: { type: 'output', label: 'Unified Terminal Output' } }
  ]
};

const diamondFalseRes = await executeWorkflowPipeline(diamondFalseWorkflow);
const diamondFalseSteps = {};
for (const step of diamondFalseRes.nodeExecutions) {
  diamondFalseSteps[step.nodeId] = step;
}

assert(diamondFalseSteps['d_cond']?.output?.result === false, 'Condition evaluated false');
assert(diamondFalseSteps['d_act_a']?.status === 'skipped', 'Admin route marked skipped');
assert(diamondFalseSteps['d_act_b']?.status === 'succeeded', 'User route succeeded');
assert(diamondFalseSteps['d_merge']?.status === 'succeeded', 'Converging output node executed via false path');
assert(diamondFalseRes.nodeExecutions.filter(s => s.nodeId === 'd_merge').length === 1, 'Converging node executed exactly once via false path');

// 4. Nested Sequential Conditions
console.log('\n--- 4. Nested / Chained Condition Routing ---');
const chainedWorkflow = {
  nodes: [
    { id: 'c_trig', data: { type: 'trigger', payload: { code: 200, tier: 'pro' } } },
    { id: 'c_cond1', data: { type: 'condition', field: 'payload.code', operator: 'equals', value: 200 } },
    { id: 'c_cond2', data: { type: 'condition', field: 'payload.tier', operator: 'equals', value: 'enterprise' } },
    { id: 'c_out_t1_t2', data: { type: 'output', label: '200 Enterprise' } },
    { id: 'c_out_t1_f2', data: { type: 'output', label: '200 Non-Enterprise' } },
    { id: 'c_out_f1', data: { type: 'output', label: 'Non-200 Fallback' } }
  ],
  edges: [
    { id: 'ce1', source: 'c_trig', target: 'c_cond1' },
    { id: 'ce2', source: 'c_cond1', target: 'c_cond2', sourceHandle: 'true' },
    { id: 'ce3', source: 'c_cond1', target: 'c_out_f1', sourceHandle: 'false' },
    { id: 'ce4', source: 'c_cond2', target: 'c_out_t1_t2', sourceHandle: 'true' },
    { id: 'ce5', source: 'c_cond2', target: 'c_out_t1_f2', sourceHandle: 'false' }
  ]
};

const chainedRes = await executeWorkflowPipeline(chainedWorkflow);
assert(chainedRes.status === 'succeeded', 'Chained pipeline succeeded');

const chainedSteps = {};
for (const step of chainedRes.nodeExecutions) {
  chainedSteps[step.nodeId] = step;
}

assert(chainedSteps['c_cond1']?.output?.result === true, 'Cond 1 evaluated TRUE');
assert(chainedSteps['c_cond2']?.status === 'succeeded', 'Cond 2 executed');
assert(chainedSteps['c_cond2']?.output?.result === false, 'Cond 2 evaluated FALSE ("pro" !== "enterprise")');
assert(chainedSteps['c_out_t1_t2']?.status === 'skipped', 'Out T1_T2 skipped');
assert(chainedSteps['c_out_t1_f2']?.status === 'succeeded', 'Out T1_F2 succeeded');
assert(chainedSteps['c_out_f1']?.status === 'skipped', 'Out F1 skipped');

// 5. Invalid Configuration & Failure Handling
console.log('\n--- 5. Invalid Configuration & Safe Failure Tests ---');
const badOpWorkflow = {
  nodes: [
    { id: 'b_trig', data: { type: 'trigger' } },
    { id: 'b_cond', data: { type: 'condition', field: 'status', operator: 'unsupported_op', value: 1 } },
    { id: 'b_out', data: { type: 'output' } }
  ],
  edges: [
    { id: 'be1', source: 'b_trig', target: 'b_cond' },
    { id: 'be2', source: 'b_cond', target: 'b_out', sourceHandle: 'true' }
  ]
};

const badOpRes = await executeWorkflowPipeline(badOpWorkflow);
assert(badOpRes.status === 'failed', 'Pipeline status is failed for unsupported operator');
assert(badOpRes.nodeExecutions[1]?.status === 'failed', 'Condition node marked FAILED');
assert(badOpRes.nodeExecutions[1]?.error?.includes('unsupported operator'), 'Error message identifies unsupported operator');
assert(badOpRes.nodeExecutions[2]?.status === 'skipped', 'Downstream node marked skipped on failure');
assert(badOpRes.nodeExecutions[2]?.error?.includes('upstream execution failure'), 'Downstream skip reason indicates upstream failure');

// Missing field configuration
const missingFieldWorkflow = {
  nodes: [
    { id: 'mf_trig', data: { type: 'trigger' } },
    { id: 'mf_cond', data: { type: 'condition', operator: 'equals', value: 1 } },
    { id: 'mf_out', data: { type: 'output' } }
  ],
  edges: [
    { id: 'mfe1', source: 'mf_trig', target: 'mf_cond' },
    { id: 'mfe2', source: 'mf_cond', target: 'mf_out', sourceHandle: 'true' }
  ]
};

const missingFieldRes = await executeWorkflowPipeline(missingFieldWorkflow);
assert(missingFieldRes.status === 'failed', 'Fails honestly when field configuration is missing');
assert(missingFieldRes.nodeExecutions[1]?.status === 'failed', 'Condition node marked FAILED');
assert(missingFieldRes.nodeExecutions[1]?.error?.includes('requires a valid field path'), 'Error message identifies missing field path');

// 6. Dead-End / Unconnected Branch Scenarios
console.log('\n--- 6. Unconnected Handle / Dead-End Branch Handling ---');
const unconnectedWorkflow = {
  nodes: [
    { id: 'u_trig', data: { type: 'trigger', payload: { code: 500 } } },
    { id: 'u_cond', data: { type: 'condition', field: 'payload.code', operator: 'equals', value: 200 } },
    { id: 'u_out_true', data: { type: 'output', label: 'Only True Connected' } }
  ],
  edges: [
    { id: 'ue1', source: 'u_trig', target: 'u_cond' },
    { id: 'ue2', source: 'u_cond', target: 'u_out_true', sourceHandle: 'true' }
    // Note: False handle has no edge connected
  ]
};

const unconnectedRes = await executeWorkflowPipeline(unconnectedWorkflow);
assert(unconnectedRes.status === 'succeeded', 'Completes cleanly when evaluated branch has no outgoing connection');
const uSteps = {};
for (const step of unconnectedRes.nodeExecutions) {
  uSteps[step.nodeId] = step;
}
assert(uSteps['u_cond']?.output?.result === false, 'Condition evaluated false');
assert(uSteps['u_out_true']?.status === 'skipped', 'True output skipped');

// 7. Live API & MongoDB Execution Integration
console.log('\n--- 7. Live API & MongoDB Execution Integration ---');
const timestamp = Date.now();
const testEmail = `cond_exec_${timestamp}@flowforge.test`;
const password = 'Password123!';

await apiRequest('/auth/register', {
  method: 'POST',
  body: { name: 'Condition Tester', email: testEmail, password }
});
const loginRes = await apiRequest('/auth/login', {
  method: 'POST',
  body: { email: testEmail, password }
});
const token = loginRes.data?.token;
assert(Boolean(token), 'User authenticated for condition execution test');

// Create workflow with Condition node in MongoDB
const createRes = await apiRequest('/workflows', {
  method: 'POST',
  token,
  body: {
    name: 'Condition Branching Live Test',
    nodes: [
      { id: 't1', type: 'custom', data: { type: 'trigger', payload: { status: 'healthy' } }, position: { x: 0, y: 0 } },
      { id: 'c1', type: 'custom', data: { type: 'condition', field: 'payload.status', operator: 'equals', value: 'healthy' }, position: { x: 200, y: 0 } },
      { id: 'out_t', type: 'custom', data: { type: 'output', label: 'Healthy Alert' }, position: { x: 400, y: -100 } },
      { id: 'out_f', type: 'custom', data: { type: 'output', label: 'Unhealthy Alert' }, position: { x: 400, y: 100 } }
    ],
    edges: [
      { id: 'e1', source: 't1', target: 'c1' },
      { id: 'e2', source: 'c1', target: 'out_t', sourceHandle: 'true' },
      { id: 'e3', source: 'c1', target: 'out_f', sourceHandle: 'false' }
    ]
  }
});

const wfId = createRes.data?.workflow?._id;
assert(Boolean(wfId), 'Workflow saved to MongoDB with Condition node and sourceHandles');

// Execute via POST /api/workflows/:id/execute
const liveExecRes = await apiRequest(`/workflows/${wfId}/execute`, { method: 'POST', token });
assert(liveExecRes.status === 200, 'Execution API responded with 200');
assert(liveExecRes.data?.success === true, 'Execution response success is true');
assert(liveExecRes.data?.execution?.status === 'succeeded', 'Execution document status is succeeded');

const liveSteps = liveExecRes.data?.execution?.nodeExecutions || [];
assert(liveSteps.length === 4, 'Recorded 4 execution step traces in MongoDB');

const liveStepMap = {};
for (const step of liveSteps) {
  liveStepMap[step.nodeId] = step;
}

assert(liveStepMap['t1']?.status === 'succeeded', 'Live Trigger succeeded');
assert(liveStepMap['c1']?.status === 'succeeded', 'Live Condition succeeded');
assert(liveStepMap['c1']?.output?.result === true, 'Live Condition output result is true');
assert(liveStepMap['out_t']?.status === 'succeeded', 'Live True branch Output succeeded (Emerald)');
assert(liveStepMap['out_f']?.status === 'skipped', 'Live False branch Output skipped (Muted Gray)');

// Retrieve persisted execution by ID
const execId = liveExecRes.data?.execution?._id;
const getExecRes = await apiRequest(`/executions/${execId}`, { method: 'GET', token });
assert(getExecRes.status === 200 && getExecRes.data?.execution?._id === execId, 'Retrieved persisted execution by ID from MongoDB');

// 8. Graph Cycle Validation Regression
console.log('\n--- 8. Graph Validation & Cycle Detection Regression ---');
const cycleWithCondition = {
  nodes: [
    { id: 'n1', data: { type: 'trigger' } },
    { id: 'n2', data: { type: 'condition', field: 'status', operator: 'equals', value: 1 } },
    { id: 'n3', data: { type: 'action' } }
  ],
  edges: [
    { id: 'ce1', source: 'n1', target: 'n2' },
    { id: 'ce2', source: 'n2', target: 'n3', sourceHandle: 'true' },
    { id: 'ce3', source: 'n3', target: 'n2' } // Cycle back to condition
  ]
};

const cycleCheck = validateWorkflowGraph(cycleWithCondition.nodes, cycleWithCondition.edges);
assert(cycleCheck.isValid === false, 'Cycle detection catches circular loop through Condition node');
assert(cycleCheck.error.includes('contains a cycle'), 'Clear cycle error message returned');

console.log('\n========================================');
console.log(`TOTAL CHECKS: ${passed + failed}`);
console.log(`PASSED: ${passed}`);
console.log(`FAILED: ${failed}`);
console.log('========================================\n');

process.exit(failed > 0 ? 1 : 0);
