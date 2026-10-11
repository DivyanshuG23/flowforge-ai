// Verification script for Dashboard Live Workflows Integration

const API_BASE = 'http://localhost:5000/api';

async function verifyDashboardWorkflowIntegration() {
  console.log('=== FlowForge AI Live Recent Workflows Integration Test ===');
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

  // 1. Authenticate new test user
  const email = `dashboard_user_${Date.now()}@example.com`;
  const password = 'password123!';
  const regRes = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Dashboard Lead', email, password })
  });
  const regData = await regRes.json();
  assert(regRes.status === 201 && regData.success, 'Test user registered');

  const loginRes = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  const loginData = await loginRes.json();
  const token = loginData.token;
  assert(loginRes.status === 200 && !!token, 'Test user logged in with JWT');

  const authHeaders = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };

  // 2. Initial state: 0 workflows (Empty State check)
  const initialFetch = await fetch(`${API_BASE}/workflows`, { headers: authHeaders });
  const initialData = await initialFetch.json();
  assert(initialFetch.status === 200 && initialData.count === 0, 'Initial workflows count is 0 (Empty state triggers)');

  // 3. Create Workflow 1
  const wf1Res = await fetch(`${API_BASE}/workflows`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      name: 'Auth Verification Flow',
      nodes: [
        { id: 'node-1', type: 'custom', position: { x: 50, y: 100 }, data: { label: 'Start' } },
        { id: 'node-2', type: 'custom', position: { x: 350, y: 100 }, data: { label: 'Verify' } }
      ],
      edges: [
        { id: 'e1-2', source: 'node-1', target: 'node-2' }
      ]
    })
  });
  const wf1Data = await wf1Res.json();
  assert(wf1Res.status === 201 && !!wf1Data.workflow?._id, 'Workflow 1 created');
  const wf1Id = wf1Data.workflow._id;

  // 4. Create Workflow 2
  const wf2Res = await fetch(`${API_BASE}/workflows`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      name: 'Anomaly Triage Pipeline',
      nodes: [
        { id: 'node-a', type: 'custom', position: { x: 80, y: 150 }, data: { label: 'Trigger' } },
        { id: 'node-b', type: 'custom', position: { x: 400, y: 150 }, data: { label: 'AI Agent' } },
        { id: 'node-c', type: 'custom', position: { x: 750, y: 150 }, data: { label: 'Output' } }
      ],
      edges: [
        { id: 'ea-b', source: 'node-a', target: 'node-b' },
        { id: 'eb-c', source: 'node-b', target: 'node-c' }
      ]
    })
  });
  const wf2Data = await wf2Res.json();
  assert(wf2Res.status === 201 && !!wf2Data.workflow?._id, 'Workflow 2 created');
  const wf2Id = wf2Data.workflow._id;

  // 5. Fetch workflows as Dashboard does on load
  const dashFetch = await fetch(`${API_BASE}/workflows`, { headers: authHeaders });
  const dashData = await dashFetch.json();
  assert(dashFetch.status === 200 && dashData.count === 2, 'Dashboard receives exactly 2 workflows');
  
  // Verify sort order: newest first
  assert(dashData.workflows[0]._id === wf2Id, 'Newest workflow appears first in list (ordered by updatedAt desc)');

  // Verify dashboard display fields are present
  const firstWf = dashData.workflows[0];
  assert(firstWf.name === 'Anomaly Triage Pipeline', 'Workflow name present and accurate');
  assert(Array.isArray(firstWf.nodes) && firstWf.nodes.length === 3, 'Node count accessible for UI tag (3 nodes)');
  assert(Array.isArray(firstWf.edges) && firstWf.edges.length === 2, 'Connection count accessible for UI tag (2 connections)');
  assert(!!firstWf.updatedAt, 'Timestamp field present for formatting');

  // 6. Test Open/Edit capability (GET /api/workflows/:id)
  const openWfRes = await fetch(`${API_BASE}/workflows/${wf2Id}`, { headers: authHeaders });
  const openWfData = await openWfRes.json();
  assert(openWfRes.status === 200 && openWfData.workflow.name === 'Anomaly Triage Pipeline', 'Open action successfully resolves target workflow');

  // 7. Test Delete action
  const deleteRes = await fetch(`${API_BASE}/workflows/${wf1Id}`, {
    method: 'DELETE',
    headers: authHeaders
  });
  const deleteData = await deleteRes.json();
  assert(deleteRes.status === 200 && deleteData.success, 'Delete API call succeeds');

  // 8. Confirm list updates after delete
  const postDeleteFetch = await fetch(`${API_BASE}/workflows`, { headers: authHeaders });
  const postDeleteData = await postDeleteFetch.json();
  assert(postDeleteData.count === 1 && postDeleteData.workflows.length === 1, 'Workflow list reflects deletion (count decreased to 1)');
  assert(postDeleteData.workflows[0]._id === wf2Id, 'Only non-deleted workflow remains in list');

  // Confirm deleted workflow cannot be fetched
  const verifyDeletedRes = await fetch(`${API_BASE}/workflows/${wf1Id}`, { headers: authHeaders });
  assert(verifyDeletedRes.status === 404, 'Deleted workflow returns 404 Not Found');

  console.log(`\n=== Verification Complete: ${passed}/${total} checks passed ===\n`);
}

verifyDashboardWorkflowIntegration().catch(console.error);
