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

async function runAiPersistenceTests() {
  console.log('=== FlowForge AI: Phase 5D Frontend Persistence & AI Node Properties Verification ===\n');

  // Register & login test user
  const email = `ai_persist_user_${Date.now()}@example.com`;
  const password = 'Password123!';
  await apiRequest('/auth/register', {
    method: 'POST',
    body: { name: 'AI Persistence User', email, password }
  });
  const loginRes = await apiRequest('/auth/login', {
    method: 'POST',
    body: { email, password }
  });
  const token = loginRes.data?.token;
  assert(Boolean(token), 'Authenticated user created for AI persistence verification');

  // 1. Save Initial Workflow with AI Node
  console.log('\n--- 1. Save Initial Workflow with AI Node ---');
  const initialAiWorkflow = {
    name: 'AI Incident Triage Pipeline',
    description: 'Autonomous AI analysis and routing',
    nodes: [
      {
        id: 'trig-1',
        type: 'custom',
        position: { x: 80, y: 180 },
        data: {
          type: 'trigger',
          label: 'Webhook Trigger',
          description: 'Listens for incoming alerts',
          payload: { event: 'high_memory_usage', pod: 'worker-7' }
        }
      },
      {
        id: 'ai-node-1',
        type: 'custom',
        position: { x: 420, y: 180 },
        data: {
          type: 'ai',
          label: 'AI Diagnostic Agent',
          description: 'Analyzes traces with LLM reasoning',
          provider: 'gemini',
          model: 'gemini-1.5-flash',
          prompt: 'Analyze incident traces and determine recovery status.',
          systemPrompt: 'You are an autonomous Site Reliability Engineer assistant.',
          outputFormat: 'json',
          temperature: 0.2,
          maxTokens: 1024,
          timeoutMs: 15000
        }
      },
      {
        id: 'out-1',
        type: 'custom',
        position: { x: 760, y: 180 },
        data: {
          type: 'output',
          label: 'Commit Response',
          description: 'Finalizes execution state'
        }
      }
    ],
    edges: [
      { id: 'e1', source: 'trig-1', target: 'ai-node-1' },
      { id: 'e2', source: 'ai-node-1', target: 'out-1' }
    ]
  };

  const createRes = await apiRequest('/workflows', {
    method: 'POST',
    token,
    body: initialAiWorkflow
  });

  assert(createRes.status === 201, 'Workflow created in MongoDB with 201 status');
  const workflowId = createRes.data?.workflow?._id;
  assert(Boolean(workflowId), 'Received workflow ID from API');

  // 2. Reload Workflow & Verify Saved Properties
  console.log('\n--- 2. Reload Workflow & Verify Saved Node Properties ---');
  const reloadRes = await apiRequest(`/workflows/${workflowId}`, { token });
  assert(reloadRes.status === 200, 'GET /api/workflows/:id succeeded');

  const loadedAiNode = reloadRes.data?.workflow?.nodes?.find((n) => n.id === 'ai-node-1');
  assert(Boolean(loadedAiNode), 'Loaded workflow contains AI node "ai-node-1"');
  assert(loadedAiNode.data.provider === 'gemini', 'Persisted provider "gemini" restored correctly');
  assert(loadedAiNode.data.model === 'gemini-1.5-flash', 'Persisted model "gemini-1.5-flash" restored correctly');
  assert(loadedAiNode.data.prompt === 'Analyze incident traces and determine recovery status.', 'Persisted prompt restored correctly');
  assert(loadedAiNode.data.systemPrompt === 'You are an autonomous Site Reliability Engineer assistant.', 'Persisted systemPrompt restored correctly');
  assert(loadedAiNode.data.outputFormat === 'json', 'Persisted outputFormat "json" restored correctly');
  assert(loadedAiNode.data.temperature === 0.2, 'Persisted temperature 0.2 restored correctly');
  assert(loadedAiNode.data.maxTokens === 1024, 'Persisted maxTokens 1024 restored correctly');
  assert(loadedAiNode.data.timeoutMs === 15000, 'Persisted timeoutMs 15000 restored correctly');

  // Verify No Secret Credentials in MongoDB Document
  const docString = JSON.stringify(reloadRes.data.workflow);
  assert(!docString.includes('AIzaSy'), 'No Gemini secrets stored in MongoDB document');
  assert(!docString.includes('sk-proj'), 'No OpenAI secrets stored in MongoDB document');
  assert(!loadedAiNode.data.apiKey, 'Node configuration contains no apiKey property');

  // 3. Update AI Node in Properties Panel (Switch to OpenAI)
  console.log('\n--- 3. Update AI Node in Properties Panel (Switch to OpenAI) ---');
  const updatedNodes = reloadRes.data.workflow.nodes.map((node) => {
    if (node.id === 'ai-node-1') {
      return {
        ...node,
        data: {
          ...node.data,
          label: 'OpenAI Remediation Agent',
          provider: 'openai',
          model: 'gpt-4o-mini',
          prompt: 'Formulate Kubernetes pod restart instruction in plain text.',
          systemPrompt: 'You are an expert DevOps engineer.',
          outputFormat: 'text',
          temperature: 0.5,
          maxTokens: 512,
          timeoutMs: 20000
        }
      };
    }
    return node;
  });

  const updateRes = await apiRequest(`/workflows/${workflowId}`, {
    method: 'PUT',
    token,
    body: { nodes: updatedNodes }
  });
  assert(updateRes.status === 200, 'PUT /api/workflows/:id succeeded');

  // 4. Reload Updated Workflow and Verify Changes
  console.log('\n--- 4. Reload Updated Workflow & Verify Modified Properties ---');
  const reloadUpdatedRes = await apiRequest(`/workflows/${workflowId}`, { token });
  const updatedAiNode = reloadUpdatedRes.data?.workflow?.nodes?.find((n) => n.id === 'ai-node-1');

  assert(updatedAiNode.data.label === 'OpenAI Remediation Agent', 'Updated label restored');
  assert(updatedAiNode.data.provider === 'openai', 'Updated provider "openai" restored');
  assert(updatedAiNode.data.model === 'gpt-4o-mini', 'Updated model "gpt-4o-mini" restored');
  assert(updatedAiNode.data.prompt === 'Formulate Kubernetes pod restart instruction in plain text.', 'Updated prompt restored');
  assert(updatedAiNode.data.outputFormat === 'text', 'Updated outputFormat "text" restored');
  assert(updatedAiNode.data.temperature === 0.5, 'Updated temperature 0.5 restored');
  assert(updatedAiNode.data.maxTokens === 512, 'Updated maxTokens 512 restored');
  assert(updatedAiNode.data.timeoutMs === 20000, 'Updated timeoutMs 20000 restored');

  // 5. Cross-User Isolation (IDOR Protection)
  console.log('\n--- 5. Cross-User Isolation Check ---');
  const emailB = `ai_user_b_${Date.now()}@example.com`;
  await apiRequest('/auth/register', {
    method: 'POST',
    body: { name: 'User B', email: emailB, password: 'Password123!' }
  });
  const loginBRes = await apiRequest('/auth/login', {
    method: 'POST',
    body: { email: emailB, password: 'Password123!' }
  });
  const tokenB = loginBRes.data?.token;

  const userBGetRes = await apiRequest(`/workflows/${workflowId}`, { token: tokenB });
  assert(userBGetRes.status === 404, 'User B cannot access User A AI workflow (Cross-user isolation)');

  console.log('\n========================================');
  console.log(`TOTAL CHECKS: ${passed + failed}`);
  console.log(`PASSED: ${passed}`);
  console.log(`FAILED: ${failed}`);
  console.log('========================================\n');

  if (failed > 0) process.exit(1);
}

runAiPersistenceTests().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
