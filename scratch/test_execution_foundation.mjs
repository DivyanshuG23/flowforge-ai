// Comprehensive test suite for Phase 5 Execution Engine Foundation

import { validateWorkflowGraph } from '../server/services/workflow/graphValidator.js';

const API_BASE = 'http://localhost:5000/api';

async function runExecutionFoundationTests() {
  console.log('=== FlowForge AI Execution Engine Foundation Tests ===\n');
  let passed = 0;
  let total = 0;

  const assert = (condition, description) => {
    total++;
    if (condition) {
      console.log(`[PASS] ${description}`);
      passed++;
    } else {
      console.error(`[FAIL] ${description}`);
    }
  };

  // --- PART 1: Direct Graph Validation Unit Tests ---
  console.log('-- Part 1: Graph Validation & Topological Sorting --');

  // Test 1: Valid DAG with multiple start nodes
  const validDagNodes = [
    { id: 'node-b', data: { type: 'action' } },
    { id: 'node-a', data: { type: 'trigger' } },
    { id: 'node-c', data: { type: 'output' } },
    { id: 'node-d', data: { type: 'trigger' } }
  ];
  const validDagEdges = [
    { id: 'e1', source: 'node-a', target: 'node-b' },
    { id: 'e2', source: 'node-b', target: 'node-c' },
    { id: 'e3', source: 'node-d', target: 'node-c' }
  ];
  const dagResult = validateWorkflowGraph(validDagNodes, validDagEdges);
  assert(dagResult.isValid === true, 'Valid DAG passes validation');
  const orderIds = dagResult.executionOrder.map(n => n.id);
  assert(
    orderIds.indexOf('node-a') < orderIds.indexOf('node-b') &&
    orderIds.indexOf('node-b') < orderIds.indexOf('node-c') &&
    orderIds.indexOf('node-d') < orderIds.indexOf('node-c'),
    'Deterministic topological order respects all dependencies'
  );

  // Test 2: Cycle Detection (A -> B -> C -> A)
  const cycleNodes = [
    { id: 'node-1', data: { type: 'trigger' } },
    { id: 'node-2', data: { type: 'action' } },
    { id: 'node-3', data: { type: 'output' } }
  ];
  const cycleEdges = [
    { id: 'e1', source: 'node-1', target: 'node-2' },
    { id: 'e2', source: 'node-2', target: 'node-3' },
    { id: 'e3', source: 'node-3', target: 'node-1' } // circular!
  ];
  const cycleResult = validateWorkflowGraph(cycleNodes, cycleEdges);
  assert(cycleResult.isValid === false, 'Cycle detection catches circular dependency');
  assert(cycleResult.error.includes('cycle') || cycleResult.error.includes('circular'), 'Clear error message returned for cycle');

  // Test 3: Self-loop detection
  const selfLoopEdges = [
    { id: 'e-self', source: 'node-1', target: 'node-1' }
  ];
  const selfLoopResult = validateWorkflowGraph(cycleNodes, selfLoopEdges);
  assert(selfLoopResult.isValid === false && selfLoopResult.error.includes('Self-referencing'), 'Self-referencing loop rejected');

  // Test 4: Missing node reference
  const missingNodeEdges = [
    { id: 'e-ghost', source: 'node-1', target: 'non-existent-node-99' }
  ];
  const missingResult = validateWorkflowGraph(cycleNodes, missingNodeEdges);
  assert(missingResult.isValid === false && missingResult.error.includes('non-existent'), 'Edge referencing non-existent node rejected');

  // Test 5: Duplicate node ID detection
  const dupNodes = [
    { id: 'same-id', data: { type: 'trigger' } },
    { id: 'same-id', data: { type: 'output' } }
  ];
  const dupResult = validateWorkflowGraph(dupNodes, []);
  assert(dupResult.isValid === false && dupResult.error.includes('Duplicate node ID'), 'Duplicate node ID rejected');

  // --- PART 2: API End-to-End Execution Tests ---
  console.log('\n-- Part 2: Secure Execution API & Runtime Telemetry --');

  // Register & login User A
  const emailA = `exec_user_a_${Date.now()}@example.com`;
  const password = 'password123!';
  await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Execution User A', email: emailA, password })
  });
  const loginARes = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: emailA, password })
  });
  const tokenA = (await loginARes.json()).token;

  // Register & login User B (for IDOR testing)
  const emailB = `exec_user_b_${Date.now()}@example.com`;
  await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Execution User B', email: emailB, password })
  });
  const loginBRes = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: emailB, password })
  });
  const tokenB = (await loginBRes.json()).token;

  // Create valid workflow for User A (Trigger -> Action -> Output)
  const validWorkflowPayload = {
    name: 'Foundation Safe Pipeline',
    nodes: [
      { id: 'trig-1', type: 'custom', position: { x: 50, y: 100 }, data: { type: 'trigger', label: 'Manual Trigger' } },
      { id: 'act-1', type: 'custom', position: { x: 350, y: 100 }, data: { type: 'action', label: 'Transform Payload' } },
      { id: 'out-1', type: 'custom', position: { x: 650, y: 100 }, data: { type: 'output', label: 'Commit Result' } }
    ],
    edges: [
      { id: 'e1', source: 'trig-1', target: 'act-1' },
      { id: 'e2', source: 'act-1', target: 'out-1' }
    ]
  };

  const createRes = await fetch(`${API_BASE}/workflows`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${tokenA}`
    },
    body: JSON.stringify(validWorkflowPayload)
  });
  const createdWf = (await createRes.json()).workflow;
  const workflowId = createdWf._id;

  // Test 6: Unauthenticated execution request rejected with 401
  const unauthExecRes = await fetch(`${API_BASE}/workflows/${workflowId}/execute`, {
    method: 'POST'
  });
  assert(unauthExecRes.status === 401, 'Unauthenticated execution request rejected with 401');

  // Test 7: User B cannot execute User A's workflow (IDOR protection)
  const idorExecRes = await fetch(`${API_BASE}/workflows/${workflowId}/execute`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${tokenB}` }
  });
  assert(idorExecRes.status === 404, 'User B executing User A workflow returns 404 Not Found (IDOR protection)');

  // Test 8: User A executes valid workflow successfully
  const execRes = await fetch(`${API_BASE}/workflows/${workflowId}/execute`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${tokenA}` }
  });
  const execData = await execRes.json();
  assert(execRes.status === 200 && execData.success === true, 'POST /api/workflows/:id/execute succeeds');
  assert(execData.execution && execData.execution.status === 'succeeded', 'Execution status is "succeeded"');
  assert(execData.execution.nodeExecutions.length === 3, 'All 3 nodes executed and recorded');
  assert(
    execData.execution.nodeExecutions.every(n => n.status === 'succeeded'),
    'Every supported node reported status "succeeded"'
  );
  assert(typeof execData.execution.durationMs === 'number', 'Duration measured in ms');
  const executionId = execData.execution._id;

  // Test 9: Execution record persisted and retrievable by owner
  const getExecRes = await fetch(`${API_BASE}/executions/${executionId}`, {
    headers: { 'Authorization': `Bearer ${tokenA}` }
  });
  const getExecData = await getExecRes.json();
  assert(getExecRes.status === 200 && getExecData.execution._id === executionId, 'Execution record retrievable from MongoDB by ID');

  // Test 10: User B cannot read User A's execution record
  const userBGetExecRes = await fetch(`${API_BASE}/executions/${executionId}`, {
    headers: { 'Authorization': `Bearer ${tokenB}` }
  });
  assert(userBGetExecRes.status === 404, 'User B cannot access User A execution record (IDOR protected)');

  // Test 11: Workflow with Unsupported Node Type (e.g. AI node in foundation phase)
  const unsupportedWfPayload = {
    name: 'Pipeline with AI Agent Node',
    nodes: [
      { id: 'trig-1', type: 'custom', position: { x: 50, y: 100 }, data: { type: 'trigger', label: 'Trigger' } },
      { id: 'ai-1', type: 'custom', position: { x: 350, y: 100 }, data: { type: 'ai', label: 'AI Anomaly Triage' } },
      { id: 'out-1', type: 'custom', position: { x: 650, y: 100 }, data: { type: 'output', label: 'Output' } }
    ],
    edges: [
      { id: 'e1', source: 'trig-1', target: 'ai-1' },
      { id: 'e2', source: 'ai-1', target: 'out-1' }
    ]
  };

  const createAiWfRes = await fetch(`${API_BASE}/workflows`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${tokenA}`
    },
    body: JSON.stringify(unsupportedWfPayload)
  });
  const aiWfId = (await createAiWfRes.json()).workflow._id;

  const execAiRes = await fetch(`${API_BASE}/workflows/${aiWfId}/execute`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${tokenA}` }
  });
  const execAiData = await execAiRes.json();
  assert(execAiData.success === false, 'Execution fails safely when unsupported node type is present');
  assert(execAiData.execution.status === 'failed', 'Execution status marked "failed"');
  const aiNodeExec = execAiData.execution.nodeExecutions.find(n => n.nodeId === 'ai-1');
  assert(aiNodeExec && aiNodeExec.status === 'failed', 'AI node marked as failed');
  assert(
    aiNodeExec.error.includes('not supported in the foundation execution engine') ||
    aiNodeExec.error.includes('GEMINI_API_KEY') ||
    aiNodeExec.error.includes('AI Node requires') ||
    aiNodeExec.error.includes('AI execution failed'),
    'Clear, honest error message provided'
  );
  const downstreamNodeExec = execAiData.execution.nodeExecutions.find(n => n.nodeId === 'out-1');
  assert(downstreamNodeExec && downstreamNodeExec.status === 'skipped', 'Downstream node safely skipped upon failure');

  console.log(`\n=== Execution Foundation Tests Complete: ${passed}/${total} passed ===\n`);
}

runExecutionFoundationTests().catch(console.error);
