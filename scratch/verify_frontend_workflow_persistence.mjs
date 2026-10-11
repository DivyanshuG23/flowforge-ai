// Verification script testing the exact API lifecycle used by WorkflowEditor.jsx

const API_BASE = 'http://localhost:5000/api';

async function verifyPersistenceLifecycle() {
  console.log('=== FlowForge AI Workflow Persistence Integration Verification ===');
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

  // 1. Authenticate user
  const email = `editor_tester_${Date.now()}@example.com`;
  const password = 'password123!';
  const registerRes = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Editor Tester', email, password })
  });
  const regData = await registerRes.json();
  assert(registerRes.status === 201 && regData.success, 'User registered successfully');

  const loginRes = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  const loginData = await loginRes.json();
  const token = loginData.token;
  assert(loginRes.status === 200 && !!token, 'User logged in and acquired JWT');

  const authHeaders = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };

  // 2. Initial state: exactly what WorkflowEditor sends on initial Save
  const initialNodes = [
    {
      id: 'node-trigger-1',
      type: 'custom',
      position: { x: 80, y: 180 },
      data: {
        type: 'trigger',
        label: 'Webhook Trigger',
        description: 'Listens for incoming HTTP events'
      }
    },
    {
      id: 'node-ai-1',
      type: 'custom',
      position: { x: 420, y: 180 },
      data: {
        type: 'ai',
        label: 'AI Anomaly Triage',
        description: 'Analyzes traces with LLM reasoning'
      }
    },
    {
      id: 'node-output-1',
      type: 'custom',
      position: { x: 760, y: 180 },
      data: {
        type: 'output',
        label: 'Return Response',
        description: 'Finalizes execution and commits state'
      }
    }
  ];

  const initialEdges = [
    {
      id: 'edge-1-2',
      source: 'node-trigger-1',
      target: 'node-ai-1',
      animated: true,
      style: { stroke: '#E5B45B', strokeWidth: 2 }
    },
    {
      id: 'edge-2-3',
      source: 'node-ai-1',
      target: 'node-output-1',
      animated: true,
      style: { stroke: '#E5B45B', strokeWidth: 2 }
    }
  ];

  // 3. Create workflow (First Save)
  const createRes = await fetch(`${API_BASE}/workflows`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      name: 'Customer Incident Pipeline',
      description: 'Autonomous triage',
      nodes: initialNodes,
      edges: initialEdges
    })
  });
  const createData = await createRes.json();
  assert(createRes.status === 201 && createData.success, 'createWorkflow returned 201 Created');
  assert(!!createData.workflow?._id, 'Returned workflow contains valid MongoDB _id');
  const workflowId = createData.workflow._id;

  // 4. Repeated save test (subsequent save triggers PUT with existing workflowId)
  const modifiedNodes = [
    ...initialNodes,
    {
      id: 'node-action-1',
      type: 'custom',
      position: { x: 600, y: 320 },
      data: {
        type: 'action',
        label: 'Format Notification',
        description: 'Enriches alert payload'
      }
    }
  ];

  const updateRes = await fetch(`${API_BASE}/workflows/${workflowId}`, {
    method: 'PUT',
    headers: authHeaders,
    body: JSON.stringify({
      name: 'Customer Incident Pipeline (V2)',
      description: 'Autonomous triage with enriched notification',
      nodes: modifiedNodes,
      edges: initialEdges
    })
  });
  const updateData = await updateRes.json();
  assert(updateRes.status === 200 && updateData.success, 'updateWorkflow returned 200 OK');
  assert(updateData.workflow.name === 'Customer Incident Pipeline (V2)', 'Workflow name updated in DB');
  assert(updateData.workflow.nodes.length === 4, 'Updated node count saved (4 nodes)');

  // 5. Verify no duplicates created
  const listRes = await fetch(`${API_BASE}/workflows`, {
    headers: authHeaders
  });
  const listData = await listRes.json();
  assert(listData.count === 1 && listData.workflows.length === 1, 'No duplicate created on repeated saves; user has exactly 1 workflow');

  // 6. Simulate browser refresh / direct navigation to /workflows/:id
  const getByIdRes = await fetch(`${API_BASE}/workflows/${workflowId}`, {
    headers: authHeaders
  });
  const getByIdData = await getByIdRes.json();
  assert(getByIdRes.status === 200 && getByIdData.success, 'Fetch /api/workflows/:id succeeded');
  const fetchedWf = getByIdData.workflow;
  assert(fetchedWf.name === 'Customer Incident Pipeline (V2)', 'Restored title matches saved state');
  assert(fetchedWf.nodes.length === 4, 'Restored all 4 nodes');
  assert(fetchedWf.edges.length === 2, 'Restored all connection edges');
  
  // Verify node structure integrity
  const actionNode = fetchedWf.nodes.find(n => n.id === 'node-action-1');
  assert(
    actionNode && actionNode.position.x === 600 && actionNode.position.y === 320,
    'Preserved custom node position and coordinates'
  );
  assert(
    actionNode && actionNode.data.label === 'Format Notification',
    'Preserved custom node data payload'
  );

  // 7. Error handling check on load failure
  const invalidFetchRes = await fetch(`${API_BASE}/workflows/60c72b2f9b1d8b2bad123456`, {
    headers: authHeaders
  });
  assert(invalidFetchRes.status === 404, 'Non-existent workflow ID returns 404');

  console.log(`\n=== Verification Complete: ${passed}/${total} checks passed ===\n`);
}

verifyPersistenceLifecycle().catch(console.error);
