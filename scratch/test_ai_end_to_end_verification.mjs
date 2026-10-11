import { executeWorkflowPipeline } from '../server/services/workflow/executionEngine.js';
import { executeAiRequest } from '../server/services/workflow/aiExecutor.js';

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

async function apiRequest(endpoint, { method = 'GET', body = null, token = null } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const config = {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  };
  const res = await fetch(`${API_BASE}${endpoint}`, config);
  let data = null;
  try {
    data = await res.json();
  } catch {}
  return { status: res.status, data };
}

async function runEndToEndVerification() {
  console.log('=== FlowForge AI: Phase 5E Final End-to-End AI Verification ===\n');

  // Authenticate user
  const email = `ai_e2e_${Date.now()}@flowforge.test`;
  const password = 'Password123!';
  await apiRequest('/auth/register', {
    method: 'POST',
    body: { name: 'E2E Tester', email, password }
  });
  const loginRes = await apiRequest('/auth/login', {
    method: 'POST',
    body: { email, password }
  });
  const token = loginRes.data?.token;
  assert(Boolean(token), 'User authenticated for end-to-end verification');

  // -------------------------------------------------------------
  // Part 1: Full Application Flow: Save, Reload, Execute
  // -------------------------------------------------------------
  console.log('\n--- 1. Full Application Flow: Save, Reload & Verify Persistence ---');

  let promptReceivedByMock = null;
  const mockE2eFetch = async (url, opts) => {
    const body = JSON.parse(opts.body);
    promptReceivedByMock = body.contents[0].parts[0].text;
    const responsePayload = {
      candidates: [
        {
          content: {
            parts: [{ text: '```json\n{"rootCause": "Database connection pool starvation", "severity": "P1"}\n```' }],
            role: 'model'
          },
          finishReason: 'STOP'
        }
      ],
      usageMetadata: {
        promptTokenCount: 28,
        candidatesTokenCount: 20,
        totalTokenCount: 48
      }
    };
    return {
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      body: createMockStream(JSON.stringify(responsePayload))
    };
  };

  const workflowDefinition = {
    name: 'Incident Diagnostic Flow',
    description: 'Trigger -> AI Diagnostic -> Terminal Output',
    nodes: [
      {
        id: 'node-trigger-1',
        type: 'custom',
        position: { x: 50, y: 150 },
        data: {
          type: 'trigger',
          label: 'Alert Trigger',
          payload: { incidentId: 'INC-404', service: 'payment-gateway', latencyMs: 4200 }
        }
      },
      {
        id: 'node-ai-1',
        type: 'custom',
        position: { x: 380, y: 150 },
        data: {
          type: 'ai',
          label: 'AI Diagnostic',
          provider: 'gemini',
          model: 'gemini-1.5-flash',
          prompt: 'Identify root cause of latency surge and return JSON diagnosis.',
          systemPrompt: 'You are an autonomous SRE expert.',
          outputFormat: 'json',
          temperature: 0.2,
          maxTokens: 1024,
          timeoutMs: 15000,
          _fetchFn: mockE2eFetch
        }
      },
      {
        id: 'node-output-1',
        type: 'custom',
        position: { x: 720, y: 150 },
        data: {
          type: 'output',
          label: 'Terminal Response'
        }
      }
    ],
    edges: [
      { id: 'edge-trig-ai', source: 'node-trigger-1', target: 'node-ai-1' },
      { id: 'edge-ai-out', source: 'node-ai-1', target: 'node-output-1' }
    ]
  };

  const saveRes = await apiRequest('/workflows', {
    method: 'POST',
    token,
    body: workflowDefinition
  });
  assert(saveRes.status === 201, 'Workflow saved to MongoDB with 201 Created');
  const workflowId = saveRes.data?.workflow?._id;

  const reloadRes = await apiRequest(`/workflows/${workflowId}`, { token });
  assert(reloadRes.status === 200, 'Workflow reloaded from MongoDB with 200 OK');
  const reloadedAi = reloadRes.data?.workflow?.nodes?.find((n) => n.id === 'node-ai-1');
  assert(reloadedAi?.data?.provider === 'gemini', 'Persisted provider restored');
  assert(reloadedAi?.data?.model === 'gemini-1.5-flash', 'Persisted model restored');
  assert(reloadedAi?.data?.prompt.includes('Identify root cause'), 'Persisted prompt restored');
  assert(reloadedAi?.data?.outputFormat === 'json', 'Persisted outputFormat restored');
  assert(reloadRes.data?.workflow?.edges?.length === 2, 'Persisted edge connections restored');

  // Execute workflow pipeline
  console.log('\n--- 2. Pipeline Execution & Upstream Context Verification ---');
  process.env.GEMINI_API_KEY = 'mock-gemini-key-e2e';
  const execResult = await executeWorkflowPipeline(workflowDefinition);

  assert(execResult.status === 'succeeded', 'Workflow execution succeeded');
  assert(promptReceivedByMock.includes('INC-404'), 'AI node received upstream trigger context in prompt');
  assert(promptReceivedByMock.includes('payment-gateway'), 'AI node received upstream service data');
  assert(promptReceivedByMock.includes('Identify root cause'), 'AI node received user prompt directive');

  const aiExecTrace = execResult.nodeExecutions.find((n) => n.nodeId === 'node-ai-1');
  assert(aiExecTrace.status === 'succeeded', 'AI node execution status is succeeded');
  assert(aiExecTrace.output.structured.rootCause === 'Database connection pool starvation', 'AI node produced valid structured rootCause');
  assert(aiExecTrace.output.structured.severity === 'P1', 'AI node produced valid structured severity');
  assert(aiExecTrace.output.usage.totalTokens === 48, 'Recorded accurate token usage (48 tokens)');
  assert(aiExecTrace.durationMs >= 0, 'Measured execution duration in ms');

  const outExecTrace = execResult.nodeExecutions.find((n) => n.nodeId === 'node-output-1');
  assert(outExecTrace.status === 'succeeded', 'Output node succeeded');
  assert(outExecTrace.output.receivedInput.structured.rootCause === 'Database connection pool starvation', 'Output node received AI structured data');

  // -------------------------------------------------------------
  // Part 2: Plain Text Mode vs Structured JSON Mode
  // -------------------------------------------------------------
  console.log('\n--- 3. Plain Text Mode vs Structured JSON Mode ---');

  const mockPlainText = async () => ({
    ok: true,
    status: 200,
    headers: new Headers({ 'content-type': 'application/json' }),
    body: createMockStream(JSON.stringify({
      candidates: [{ content: { parts: [{ text: 'System load is nominal across all worker nodes.' }] } }]
    }))
  });

  const textWfDef = {
    nodes: [
      { id: 't1', data: { type: 'trigger' } },
      { id: 'ai-txt', data: { type: 'ai', prompt: 'Status report', outputFormat: 'text', _fetchFn: mockPlainText } },
      { id: 'o1', data: { type: 'output' } }
    ],
    edges: [
      { id: 'e1', source: 't1', target: 'ai-txt' },
      { id: 'e2', source: 'ai-txt', target: 'o1' }
    ]
  };

  const textExecRes = await executeWorkflowPipeline(textWfDef);
  const textAiTrace = textExecRes.nodeExecutions.find((n) => n.nodeId === 'ai-txt');
  assert(textAiTrace.output.text === 'System load is nominal across all worker nodes.', 'Plain text generated accurately');
  assert(textAiTrace.output.structured === null, 'Honestly reports structured as null for plain text');
  assert(textAiTrace.output.data === undefined, 'No synthetic data object fabricated in plain text mode');

  // -------------------------------------------------------------
  // Part 3: Branch Reachability & Selective Skipping
  // -------------------------------------------------------------
  console.log('\n--- 4. Branch Reachability & Selective Skipping ---');

  let branchAiACalled = false;
  let branchAiBCalled = false;

  const branchWf = {
    nodes: [
      { id: 'trig', data: { type: 'trigger', payload: { code: 200 } } },
      { id: 'cond', data: { type: 'condition', field: 'payload.code', operator: 'equals', value: 200 } },
      {
        id: 'ai-branch-true',
        data: {
          type: 'ai',
          prompt: 'Handle success',
          _fetchFn: async () => {
            branchAiACalled = true;
            return {
              ok: true,
              status: 200,
              headers: new Headers(),
              body: createMockStream(JSON.stringify({ candidates: [{ content: { parts: [{ text: 'Success handling' }] } }] }))
            };
          }
        }
      },
      {
        id: 'ai-branch-false',
        data: {
          type: 'ai',
          prompt: 'Handle error',
          _fetchFn: async () => {
            branchAiBCalled = true;
            return { ok: true, status: 200, headers: new Headers(), body: createMockStream('{}') };
          }
        }
      },
      { id: 'out-true', data: { type: 'output' } },
      { id: 'out-false', data: { type: 'output' } }
    ],
    edges: [
      { id: 'e1', source: 'trig', target: 'cond' },
      { id: 'e2', source: 'cond', target: 'ai-branch-true', sourceHandle: 'true' },
      { id: 'e3', source: 'cond', target: 'ai-branch-false', sourceHandle: 'false' },
      { id: 'e4', source: 'ai-branch-true', target: 'out-true' },
      { id: 'e5', source: 'ai-branch-false', target: 'out-false' }
    ]
  };

  const branchRes = await executeWorkflowPipeline(branchWf);
  assert(branchRes.status === 'succeeded', 'Branch pipeline succeeded');
  assert(branchAiACalled === true, 'AI node on TRUE branch executed');
  assert(branchAiBCalled === false, 'AI node on FALSE branch was skipped without making any provider request');
  assert(branchRes.nodeExecutions.find((n) => n.nodeId === 'ai-branch-false').status === 'skipped', 'Unselected AI node marked SKIPPED');
  assert(branchRes.nodeExecutions.find((n) => n.nodeId === 'out-false').status === 'skipped', 'Downstream of unselected AI node marked SKIPPED');

  // -------------------------------------------------------------
  // Part 4: Honest Failure Matrix
  // -------------------------------------------------------------
  console.log('\n--- 5. Honest Failure Matrix ---');

  // 1. Missing credentials
  delete process.env.GEMINI_API_KEY;
  const missingCredRes = await executeAiRequest({ provider: 'gemini', prompt: 'test' });
  assert(missingCredRes.success === false && missingCredRes.error.includes('GEMINI_API_KEY is not configured'), 'Missing credentials fails honestly');
  process.env.GEMINI_API_KEY = 'mock-gemini-key-e2e';

  // 2. Empty prompt
  const emptyPromptRes = await executeAiRequest({ provider: 'gemini', prompt: '   ' });
  assert(emptyPromptRes.success === false && emptyPromptRes.error.includes('non-empty string prompt'), 'Empty prompt fails honestly');

  // 3. Provider timeout
  const mockTimeout = async (u, opts) => new Promise((_, reject) => {
    opts.signal.addEventListener('abort', () => reject(Object.assign(new Error('aborted'), { name: 'AbortError' })));
  });
  const timeoutRes = await executeAiRequest({ provider: 'gemini', prompt: 'test', timeoutMs: 1000, _fetchFn: mockTimeout });
  assert(timeoutRes.success === false && timeoutRes.isTimeout === true, 'Provider timeout fails honestly');

  // 4. HTTP 401
  const mock401 = async () => ({ ok: false, status: 401, headers: new Headers(), body: createMockStream('{"error": "Invalid API key"}') });
  const res401 = await executeAiRequest({ provider: 'gemini', prompt: 'test', _fetchFn: mock401 });
  assert(res401.success === false && res401.status === 401, 'HTTP 401 fails honestly');

  // 5. HTTP 429
  const mock429 = async () => ({ ok: false, status: 429, headers: new Headers(), body: createMockStream('{"error": "Quota exceeded"}') });
  const res429 = await executeAiRequest({ provider: 'gemini', prompt: 'test', _fetchFn: mock429 });
  assert(res429.success === false && res429.status === 429, 'HTTP 429 rate limit fails honestly');

  // 6. HTTP 500
  const mock500 = async () => ({ ok: false, status: 500, headers: new Headers(), body: createMockStream('{"error": "Internal error"}') });
  const res500 = await executeAiRequest({ provider: 'gemini', prompt: 'test', _fetchFn: mock500 });
  assert(res500.success === false && res500.status === 500, 'HTTP 500 fails honestly');

  // 7. Malformed JSON envelope from provider
  const mockBadEnvelope = async () => ({ ok: true, status: 200, headers: new Headers(), body: createMockStream('{ not valid json') });
  const resBadEnvelope = await executeAiRequest({ provider: 'gemini', prompt: 'test', _fetchFn: mockBadEnvelope });
  assert(resBadEnvelope.success === false && resBadEnvelope.error.includes('unparseable'), 'Malformed provider envelope fails honestly');

  // -------------------------------------------------------------
  // Part 5: Security & IDOR Isolation Check
  // -------------------------------------------------------------
  console.log('\n--- 6. Security & IDOR Cross-User Isolation ---');

  // Register User B
  const emailB = `ai_user_b_${Date.now()}@flowforge.test`;
  await apiRequest('/auth/register', {
    method: 'POST',
    body: { name: 'User B', email: emailB, password: 'Password123!' }
  });
  const loginB = await apiRequest('/auth/login', {
    method: 'POST',
    body: { email: emailB, password: 'Password123!' }
  });
  const tokenB = loginB.data?.token;

  // User B tries to read User A workflow
  const idorWfRes = await apiRequest(`/workflows/${workflowId}`, { token: tokenB });
  assert(idorWfRes.status === 404, 'User B blocked from viewing User A workflow (404 Not Found)');

  // User B tries to execute User A workflow
  const idorExecRes = await apiRequest(`/workflows/${workflowId}/execute`, { method: 'POST', token: tokenB });
  assert(idorExecRes.status === 404, 'User B blocked from executing User A workflow (404 Not Found)');

  // Clean up mock environment variable
  delete process.env.GEMINI_API_KEY;

  console.log('\n========================================');
  console.log(`TOTAL CHECKS: ${passed + failed}`);
  console.log(`PASSED: ${passed}`);
  console.log(`FAILED: ${failed}`);
  console.log('========================================\n');

  if (failed > 0) process.exit(1);
}

runEndToEndVerification().catch((err) => {
  console.error('E2E verification error:', err);
  process.exit(1);
});
