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

console.log('=== FlowForge AI: Phase 3 Frontend Persistence & Condition Routing Verification ===\n');

// 1. Authenticate test user
const timestamp = Date.now();
const testEmail = `fe_cond_${timestamp}@flowforge.test`;
const password = 'Password123!';

await apiRequest('/auth/register', {
  method: 'POST',
  body: { name: 'Frontend Tester', email: testEmail, password }
});
const loginRes = await apiRequest('/auth/login', {
  method: 'POST',
  body: { email: testEmail, password }
});
const token = loginRes.data?.token;
assert(Boolean(token), 'Authenticated user for frontend persistence verification');

// 2. Create initial workflow with configured Condition node
console.log('\n--- 1. Save Initial Workflow with Condition Node ---');
const initialNodes = [
  {
    id: 'trig-1',
    type: 'custom',
    position: { x: 50, y: 150 },
    data: {
      type: 'trigger',
      label: 'Webhook Init',
      payload: { status: 200, count: 42 }
    }
  },
  {
    id: 'cond-1',
    type: 'custom',
    position: { x: 300, y: 150 },
    data: {
      type: 'condition',
      label: 'Check Status 200',
      description: 'Branches execution based on conditions',
      field: 'payload.status',
      operator: 'equals',
      value: 200
    }
  },
  {
    id: 'out-true',
    type: 'custom',
    position: { x: 550, y: 50 },
    data: { type: 'output', label: 'Success Branch Output' }
  },
  {
    id: 'out-false',
    type: 'custom',
    position: { x: 550, y: 250 },
    data: { type: 'output', label: 'Fallback Branch Output' }
  }
];

const initialEdges = [
  { id: 'edge-t-c', source: 'trig-1', target: 'cond-1' },
  { id: 'edge-c-true', source: 'cond-1', target: 'out-true', sourceHandle: 'true' },
  { id: 'edge-c-false', source: 'cond-1', target: 'out-false', sourceHandle: 'false' }
];

const createRes = await apiRequest('/workflows', {
  method: 'POST',
  token,
  body: {
    name: 'Frontend Condition Node Test',
    description: 'Testing Condition node properties and persistence',
    nodes: initialNodes,
    edges: initialEdges
  }
});

assert(createRes.status === 201, 'Workflow created in MongoDB with 201 status');
const wfId = createRes.data?.workflow?._id;
assert(Boolean(wfId), 'Received workflow ID from API');

// 3. Reload workflow and verify condition properties survived persistence
console.log('\n--- 2. Reload Workflow & Verify Saved Node Properties ---');
const getRes = await apiRequest(`/workflows/${wfId}`, { method: 'GET', token });
assert(getRes.status === 200, 'GET /api/workflows/:id succeeded');

const loadedWf = getRes.data?.workflow;
const loadedCondNode = loadedWf?.nodes?.find(n => n.id === 'cond-1');
assert(Boolean(loadedCondNode), 'Loaded workflow contains condition node "cond-1"');
assert(loadedCondNode.data?.field === 'payload.status', 'Persisted field "payload.status" restored correctly');
assert(loadedCondNode.data?.operator === 'equals', 'Persisted operator "equals" restored correctly');
assert(loadedCondNode.data?.value === 200, 'Persisted value 200 (number) restored correctly');

const loadedEdges = loadedWf?.edges || [];
const trueEdge = loadedEdges.find(e => e.source === 'cond-1' && e.target === 'out-true');
const falseEdge = loadedEdges.find(e => e.source === 'cond-1' && e.target === 'out-false');
assert(trueEdge?.sourceHandle === 'true', 'Restored edge preserves sourceHandle "true"');
assert(falseEdge?.sourceHandle === 'false', 'Restored edge preserves sourceHandle "false"');

// 4. Execute initial workflow (Evaluates to TRUE)
console.log('\n--- 3. Execute Initial Workflow (TRUE Branch Route) ---');
const execTrueRes = await apiRequest(`/workflows/${wfId}/execute`, { method: 'POST', token });
assert(execTrueRes.status === 200, 'Execution API responded with 200');
assert(execTrueRes.data?.success === true, 'Execution reported success: true');
assert(execTrueRes.data?.execution?.status === 'succeeded', 'Execution status is succeeded');

const trueSteps = execTrueRes.data?.execution?.nodeExecutions || [];
const trueStepMap = {};
for (const step of trueSteps) {
  trueStepMap[step.nodeId] = step;
}

assert(trueStepMap['cond-1']?.status === 'succeeded', 'Condition node succeeded');
assert(trueStepMap['cond-1']?.output?.result === true, 'Condition evaluated to result: true');
assert(trueStepMap['cond-1']?.output?.evaluatedBranch === 'true', 'evaluatedBranch is "true"');
assert(trueStepMap['out-true']?.status === 'succeeded', 'True branch output succeeded (Emerald)');
assert(trueStepMap['out-false']?.status === 'skipped', 'False branch output skipped (Muted Gray)');

// 5. Update workflow in Properties Panel (simulate changing condition rule to evaluate FALSE)
console.log('\n--- 4. Update Condition Node in Properties Panel (Switch to FALSE rule) ---');
const updatedNodes = initialNodes.map(node => {
  if (node.id === 'cond-1') {
    return {
      ...node,
      data: {
        ...node.data,
        label: 'Check Count Greater Than 100',
        field: 'payload.count',
        operator: 'greater_than',
        value: 100 // 42 is NOT > 100, so will evaluate FALSE
      }
    };
  }
  return node;
});

const updateRes = await apiRequest(`/workflows/${wfId}`, {
  method: 'PUT',
  token,
  body: {
    nodes: updatedNodes,
    edges: initialEdges
  }
});

assert(updateRes.status === 200, 'PUT /api/workflows/:id succeeded');

// Verify updated values survived
const reloadedRes = await apiRequest(`/workflows/${wfId}`, { method: 'GET', token });
const reloadedCondNode = reloadedRes.data?.workflow?.nodes?.find(n => n.id === 'cond-1');
assert(reloadedCondNode.data?.field === 'payload.count', 'Updated field "payload.count" restored');
assert(reloadedCondNode.data?.operator === 'greater_than', 'Updated operator "greater_than" restored');
assert(reloadedCondNode.data?.value === 100, 'Updated value 100 restored');

// 6. Execute updated workflow (Evaluates to FALSE)
console.log('\n--- 5. Execute Updated Workflow (FALSE Branch Route) ---');
const execFalseRes = await apiRequest(`/workflows/${wfId}/execute`, { method: 'POST', token });
assert(execFalseRes.status === 200, 'Execution API responded with 200');
assert(execFalseRes.data?.success === true, 'Execution reported success: true');
assert(execFalseRes.data?.execution?.status === 'succeeded', 'Execution status is succeeded');

const falseSteps = execFalseRes.data?.execution?.nodeExecutions || [];
const falseStepMap = {};
for (const step of falseSteps) {
  falseStepMap[step.nodeId] = step;
}

assert(falseStepMap['cond-1']?.status === 'succeeded', 'Condition node succeeded');
assert(falseStepMap['cond-1']?.output?.result === false, 'Condition evaluated to result: false');
assert(falseStepMap['cond-1']?.output?.evaluatedBranch === 'false', 'evaluatedBranch is "false"');
assert(falseStepMap['out-true']?.status === 'skipped', 'True branch output skipped (Muted Gray)');
assert(falseStepMap['out-false']?.status === 'succeeded', 'False branch output succeeded (Emerald)');

console.log('\n========================================');
console.log(`TOTAL CHECKS: ${passed + failed}`);
console.log(`PASSED: ${passed}`);
console.log(`FAILED: ${failed}`);
console.log('========================================\n');

process.exit(failed > 0 ? 1 : 0);
