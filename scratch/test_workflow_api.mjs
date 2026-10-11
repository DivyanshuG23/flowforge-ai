// Scratch test script for FlowForge AI Workflow Persistence API

const API_BASE = 'http://localhost:5000/api';

async function runTests() {
  console.log('--- Starting FlowForge AI Workflow Persistence API Tests ---');
  let testsPassed = 0;
  let testsTotal = 0;

  const assert = (condition, msg) => {
    testsTotal++;
    if (condition) {
      console.log(`[PASS] ${msg}`);
      testsPassed++;
    } else {
      console.error(`[FAIL] ${msg}`);
    }
  };

  // 1. Unauthenticated access check
  const unauthRes = await fetch(`${API_BASE}/workflows`);
  const unauthData = await unauthRes.json();
  assert(unauthRes.status === 401 && unauthData.success === false, 'Unauthenticated GET /api/workflows returns 401');

  // Helper to register/login
  const getAuthToken = async (email, name) => {
    const password = 'password123!';
    try {
      await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password })
      });
    } catch (e) {
      // might already exist
    }

    const loginRes = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const loginData = await loginRes.json();
    return loginData.token;
  };

  const timestamp = Date.now();
  const tokenA = await getAuthToken(`wf_test_a_${timestamp}@example.com`, 'User A');
  const tokenB = await getAuthToken(`wf_test_b_${timestamp}@example.com`, 'User B');
  assert(!!tokenA && !!tokenB, 'Successfully authenticated User A and User B');

  // 2. Create Workflow with User A
  const sampleNodes = [
    {
      id: 'node-trigger-1',
      type: 'custom',
      position: { x: 100, y: 150 },
      data: { type: 'trigger', label: 'Webhook Entry', description: 'Receives payload' }
    },
    {
      id: 'node-ai-1',
      type: 'custom',
      position: { x: 450, y: 150 },
      data: { type: 'ai', label: 'Triage Agent', description: 'Analyzes anomalies' }
    }
  ];

  const sampleEdges = [
    {
      id: 'edge-1-2',
      source: 'node-trigger-1',
      target: 'node-ai-1',
      animated: true,
      style: { stroke: '#E5B45B', strokeWidth: 2 }
    }
  ];

  // Malformed input checks
  const emptyNameRes = await fetch(`${API_BASE}/workflows`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${tokenA}`
    },
    body: JSON.stringify({ name: '   ', nodes: sampleNodes })
  });
  assert(emptyNameRes.status === 400, 'POST /api/workflows with empty name returns 400 Bad Request');

  const createRes = await fetch(`${API_BASE}/workflows`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${tokenA}`
    },
    body: JSON.stringify({
      name: 'Incident Auto-Remediation',
      description: 'Autonomous incident response pipeline',
      nodes: sampleNodes,
      edges: sampleEdges
    })
  });
  const createData = await createRes.json();
  assert(createRes.status === 201 && createData.success === true, 'POST /api/workflows returns 201 Created');
  assert(createData.workflow && createData.workflow._id, 'Created workflow contains MongoDB _id');
  const workflowIdA = createData.workflow._id;

  // 3. List workflows for User A
  const listARes = await fetch(`${API_BASE}/workflows`, {
    headers: { 'Authorization': `Bearer ${tokenA}` }
  });
  const listAData = await listARes.json();
  assert(listARes.status === 200 && Array.isArray(listAData.workflows), 'GET /api/workflows returns 200 array');
  assert(listAData.workflows.some(w => w._id === workflowIdA), 'User A workflow list includes created workflow');

  // 4. Fetch single workflow for User A
  const getARes = await fetch(`${API_BASE}/workflows/${workflowIdA}`, {
    headers: { 'Authorization': `Bearer ${tokenA}` }
  });
  const getAData = await getARes.json();
  assert(getARes.status === 200 && getAData.workflow.name === 'Incident Auto-Remediation', 'GET /api/workflows/:id returns 200 with correct name');
  assert(getAData.workflow.nodes.length === 2 && getAData.workflow.edges.length === 1, 'Nodes and edges preserved accurately');

  // 5. Update workflow with User A
  const updateRes = await fetch(`${API_BASE}/workflows/${workflowIdA}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${tokenA}`
    },
    body: JSON.stringify({
      name: 'Incident Auto-Remediation (Updated)',
      description: 'Enhanced LLM workflow'
    })
  });
  const updateData = await updateRes.json();
  assert(updateRes.status === 200 && updateData.workflow.name === 'Incident Auto-Remediation (Updated)', 'PUT /api/workflows/:id updates workflow');

  // 6. Security & Cross-User Isolation (IDOR Protection)
  // User B tries to GET User A's workflow
  const userBGetRes = await fetch(`${API_BASE}/workflows/${workflowIdA}`, {
    headers: { 'Authorization': `Bearer ${tokenB}` }
  });
  assert(userBGetRes.status === 404, 'User B GET User A workflow returns 404 Not Found (Cross-user isolation)');

  // User B tries to PUT User A's workflow
  const userBPutRes = await fetch(`${API_BASE}/workflows/${workflowIdA}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${tokenB}`
    },
    body: JSON.stringify({ name: 'Hacked by User B' })
  });
  assert(userBPutRes.status === 404, 'User B PUT User A workflow returns 404 Not Found (Unauthorized update blocked)');

  // User B tries to DELETE User A's workflow
  const userBDeleteRes = await fetch(`${API_BASE}/workflows/${workflowIdA}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${tokenB}` }
  });
  assert(userBDeleteRes.status === 404, 'User B DELETE User A workflow returns 404 Not Found (Unauthorized delete blocked)');

  // Invalid ObjectId format check
  const invalidIdRes = await fetch(`${API_BASE}/workflows/invalid-object-id-123`, {
    headers: { 'Authorization': `Bearer ${tokenA}` }
  });
  assert(invalidIdRes.status === 400, 'GET with malformed ObjectId returns 400 Bad Request');

  // 7. Delete workflow with User A
  const deleteRes = await fetch(`${API_BASE}/workflows/${workflowIdA}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${tokenA}` }
  });
  assert(deleteRes.status === 200, 'DELETE /api/workflows/:id with owner returns 200 OK');

  // Verify deletion
  const verifyDeleteRes = await fetch(`${API_BASE}/workflows/${workflowIdA}`, {
    headers: { 'Authorization': `Bearer ${tokenA}` }
  });
  assert(verifyDeleteRes.status === 404, 'GET deleted workflow returns 404 Not Found');

  console.log(`\n--- Summary: ${testsPassed}/${testsTotal} tests passed ---`);
}

runTests().catch(console.error);
