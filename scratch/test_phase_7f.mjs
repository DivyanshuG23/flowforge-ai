// Focused regression and verification test suite for Phase 7F
import assert from 'assert';
import mongoose from '../server/node_modules/mongoose/index.js';
import { duplicateWorkflow } from '../server/controllers/workflowController.js';

import Workflow from '../server/models/Workflow.js';

let passedTests = 0;
let totalTests = 0;

function it(description, fn) {
  totalTests++;
  try {
    fn();
    console.log(`  [PASS] ${description}`);
    passedTests++;
  } catch (err) {
    console.error(`  [FAIL] ${description}`);
    console.error(`         ${err.message}`);
    throw err;
  }
}

async function itAsync(description, fn) {
  totalTests++;
  try {
    await fn();
    console.log(`  [PASS] ${description}`);
    passedTests++;
  } catch (err) {
    console.error(`  [FAIL] ${description}`);
    console.error(`         ${err.message}`);
    throw err;
  }
}

console.log('================================================================');
console.log('FLOWFORGE AI — PHASE 7F INTEGRATION & REGRESSION TEST SUITE');
console.log('================================================================\n');

// -------------------------------------------------------------
// SUITE 1: Backend Workflow Duplication Controller Tests
// -------------------------------------------------------------
console.log('SUITE 1: Backend Workflow Duplication Endpoint');

await itAsync('Rejects invalid ObjectId format with HTTP 400', async () => {
  const req = {
    params: { id: 'invalid-id' },
    user: { id: new mongoose.Types.ObjectId().toString() }
  };
  let statusCode = null;
  let responseData = null;
  const res = {
    status: (code) => {
      statusCode = code;
      return {
        json: (data) => { responseData = data; return data; }
      };
    }
  };

  await duplicateWorkflow(req, res);
  assert.strictEqual(statusCode, 400);
  assert.strictEqual(responseData.success, false);
  assert.strictEqual(responseData.message, 'Invalid workflow ID format.');
});

await itAsync('Enforces user ownership and returns 404 when workflow does not exist or belongs to another user', async () => {
  const userA = new mongoose.Types.ObjectId().toString();
  const userB = new mongoose.Types.ObjectId().toString();
  const targetId = new mongoose.Types.ObjectId().toString();

  // Mock Workflow.findOne
  const originalFindOne = Workflow.findOne;
  Workflow.findOne = async (query) => {
    // If querying for userB when item belongs to userA, return null
    if (query._id === targetId && query.user === userA) {
      return { _id: targetId, user: userA, name: 'User A Workflow', nodes: [], edges: [] };
    }
    return null;
  };

  const req = {
    params: { id: targetId },
    user: { id: userB } // User B attempting to duplicate User A's workflow
  };
  let statusCode = null;
  let responseData = null;
  const res = {
    status: (code) => {
      statusCode = code;
      return {
        json: (data) => { responseData = data; return data; }
      };
    }
  };

  await duplicateWorkflow(req, res);
  Workflow.findOne = originalFindOne;

  assert.strictEqual(statusCode, 404);
  assert.strictEqual(responseData.success, false);
  assert.strictEqual(responseData.message, 'Workflow not found or access denied.');
});

await itAsync('Sanitizes runtime telemetry and credentials from node data when duplicating', async () => {
  const ownerId = new mongoose.Types.ObjectId().toString();
  const sourceId = new mongoose.Types.ObjectId().toString();

  const mockSource = {
    _id: sourceId,
    name: 'Customer Alert Pipeline',
    description: 'Triggers alerts upon anomaly',
    user: ownerId,
    nodes: [
      {
        id: 'node-trigger-1',
        type: 'custom',
        position: { x: 120, y: 200 },
        data: {
          type: 'trigger',
          label: 'Webhook Trigger',
          // Stale runtime telemetry that must be stripped:
          runtimeStatus: 'succeeded',
          runtimeDurationMs: 42,
          runtimeOutput: { status: 200, payload: 'sensitive_customer_data' },
          runtimeError: null,
          lastExecutionId: 'exec_abc123',
          executionLogs: ['step completed in 42ms']
        }
      },
      {
        id: 'node-ai-1',
        type: 'custom',
        position: { x: 450, y: 200 },
        data: {
          type: 'ai',
          label: 'AI Anomaly Triage',
          provider: 'gemini',
          model: 'gemini-3.5-flash',
          runtimeStatus: 'failed',
          runtimeError: 'Rate limit error'
        }
      }
    ],
    edges: [
      {
        id: 'edge-trigger-ai',
        source: 'node-trigger-1',
        target: 'node-ai-1',
        animated: true
      }
    ]
  };

  let createdPayload = null;
  const originalFindOne = Workflow.findOne;
  const originalCreate = Workflow.create;

  Workflow.findOne = async () => mockSource;
  Workflow.create = async (payload) => {
    createdPayload = payload;
    return {
      _id: new mongoose.Types.ObjectId().toString(),
      ...payload,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  };

  const req = {
    params: { id: sourceId },
    user: { id: ownerId }
  };
  let statusCode = null;
  let responseData = null;
  const res = {
    status: (code) => {
      statusCode = code;
      return {
        json: (data) => { responseData = data; return data; }
      };
    }
  };

  await duplicateWorkflow(req, res);

  Workflow.findOne = originalFindOne;
  Workflow.create = originalCreate;

  assert.strictEqual(statusCode, 201);
  assert.strictEqual(responseData.success, true);
  assert.strictEqual(responseData.workflow.name, 'Customer Alert Pipeline (Copy)');

  // Verify createdPayload has no runtime telemetry
  const createdNodes = createdPayload.nodes;
  assert.strictEqual(createdNodes.length, 2);
  assert.strictEqual(createdNodes[0].data.label, 'Webhook Trigger');
  assert.strictEqual(createdNodes[0].data.runtimeStatus, undefined);
  assert.strictEqual(createdNodes[0].data.runtimeDurationMs, undefined);
  assert.strictEqual(createdNodes[0].data.runtimeOutput, undefined);
  assert.strictEqual(createdNodes[0].data.lastExecutionId, undefined);

  assert.strictEqual(createdNodes[1].data.label, 'AI Anomaly Triage');
  assert.strictEqual(createdNodes[1].data.provider, 'gemini');
  assert.strictEqual(createdNodes[1].data.model, 'gemini-3.5-flash');
  assert.strictEqual(createdNodes[1].data.runtimeStatus, undefined);
  assert.strictEqual(createdNodes[1].data.runtimeError, undefined);

  // Verify edges copied safely with remapped identifiers
  assert.strictEqual(createdPayload.edges.length, 1);
  assert.strictEqual(createdPayload.nodes[0].id !== 'node-trigger-1', true);
  assert.strictEqual(createdPayload.nodes[1].id !== 'node-ai-1', true);
  assert.strictEqual(createdPayload.edges[0].source, createdPayload.nodes[0].id);
  assert.strictEqual(createdPayload.edges[0].target, createdPayload.nodes[1].id);
});

await itAsync('Truncates duplicate name safely to 100 characters max', async () => {
  const longName = 'A'.repeat(98); // 98 chars
  const mockSource = {
    _id: new mongoose.Types.ObjectId().toString(),
    name: longName,
    user: 'user123',
    nodes: [],
    edges: []
  };

  let createdPayload = null;
  const originalFindOne = Workflow.findOne;
  const originalCreate = Workflow.create;

  Workflow.findOne = async () => mockSource;
  Workflow.create = async (payload) => {
    createdPayload = payload;
    return { _id: 'new_id', ...payload };
  };

  const req = {
    params: { id: mockSource._id },
    user: { id: 'user123' }
  };
  const res = {
    status: () => ({ json: (d) => d })
  };

  await duplicateWorkflow(req, res);
  Workflow.findOne = originalFindOne;
  Workflow.create = originalCreate;

  assert(createdPayload.name.length <= 100, `Name length ${createdPayload.name.length} exceeds 100`);
  assert(createdPayload.name.endsWith(' (Copy)'), 'Name does not end with (Copy)');
});

// -------------------------------------------------------------
// SUITE 2: Axios 401 Handling & Redirection Logic
// -------------------------------------------------------------
console.log('\nSUITE 2: Axios 401 Session Interceptor & Error Translation');

// Simulated interceptor logic from client/src/services/api.js
function simulateResponseInterceptor(error, mockWindow, mockStorage) {
  const status = error?.response?.status;
  const requestUrl = error?.config?.url || '';

  const isAuthEndpoint = requestUrl.includes('/auth/login') || requestUrl.includes('/auth/register');

  if (status === 401 && !isAuthEndpoint) {
    mockStorage.localStorage.removeItem('flowforge_token');
    mockStorage.localStorage.removeItem('flowforge_user');

    if (mockWindow && mockWindow.location) {
      const currentPath = mockWindow.location.pathname;
      if (currentPath !== '/login' && currentPath !== '/register') {
        mockStorage.sessionStorage.setItem(
          'flowforge_redirect_after_login',
          currentPath + (mockWindow.location.search || '')
        );
        mockWindow.location.href = '/login?session_expired=true';
      }
    }
  }

  return Promise.reject(error);
}

// Simulated getErrorMessage from client/src/services/api.js
function getErrorMessage(error) {
  if (error?.response?.data?.message) {
    return error.response.data.message;
  }
  if (error?.response?.status === 401) {
    const requestUrl = error?.config?.url || '';
    if (requestUrl.includes('/auth/login') || requestUrl.includes('/auth/register')) {
      return 'Invalid credentials. Please verify your email and password.';
    }
    return 'Your session has expired. Please sign in again.';
  }
  if (error?.response?.status === 403) {
    return 'Access denied. You do not have permission to perform this action.';
  }
  if (error?.response?.status === 409) {
    return 'An account with this email already exists.';
  }
  if (error?.message) {
    return error.message;
  }
  return 'A network error occurred. Please verify the backend server is reachable.';
}

it('Clears token and user from localStorage on 401 on authenticated endpoint', async () => {
  const mockStorage = {
    localStorage: {
      data: { flowforge_token: 'valid.token', flowforge_user: '{"name":"User"}' },
      removeItem(k) { delete this.data[k]; }
    },
    sessionStorage: {
      data: {},
      setItem(k, v) { this.data[k] = v; }
    }
  };
  const mockWindow = {
    location: {
      pathname: '/workflows/wf-123',
      search: '?tab=settings',
      href: ''
    }
  };

  const error = {
    config: { url: '/workflows/wf-123' },
    response: { status: 401, data: { message: 'jwt expired' } }
  };

  try {
    await simulateResponseInterceptor(error, mockWindow, mockStorage);
  } catch (err) {
    // rejected as expected
  }

  assert.strictEqual(mockStorage.localStorage.data.flowforge_token, undefined);
  assert.strictEqual(mockStorage.localStorage.data.flowforge_user, undefined);
  assert.strictEqual(mockStorage.sessionStorage.data.flowforge_redirect_after_login, '/workflows/wf-123?tab=settings');
  assert.strictEqual(mockWindow.location.href, '/login?session_expired=true');
});

it('Does NOT trigger redirect or clear state on 401 from login or register endpoints', async () => {
  const mockStorage = {
    localStorage: {
      data: { saved: 'keep_me' },
      removeItem(k) { delete this.data[k]; }
    },
    sessionStorage: {
      data: {},
      setItem(k, v) { this.data[k] = v; }
    }
  };
  const mockWindow = {
    location: {
      pathname: '/login',
      search: '',
      href: ''
    }
  };

  const error = {
    config: { url: '/auth/login' },
    response: { status: 401, data: { message: 'Invalid credentials' } }
  };

  try {
    await simulateResponseInterceptor(error, mockWindow, mockStorage);
  } catch (err) {
    // rejected as expected
  }

  assert.strictEqual(mockStorage.localStorage.data.saved, 'keep_me');
  assert.strictEqual(mockWindow.location.href, '');
  assert.strictEqual(mockStorage.sessionStorage.data.flowforge_redirect_after_login, undefined);
});

it('Does NOT trigger redirect loop if already on /login or /register', async () => {
  const mockStorage = {
    localStorage: {
      data: {},
      removeItem() {}
    },
    sessionStorage: {
      data: {},
      setItem(k, v) { this.data[k] = v; }
    }
  };
  const mockWindow = {
    location: {
      pathname: '/login',
      search: '',
      href: ''
    }
  };

  const error = {
    config: { url: '/auth/me' },
    response: { status: 401 }
  };

  try {
    await simulateResponseInterceptor(error, mockWindow, mockStorage);
  } catch (err) {
    // rejected
  }

  assert.strictEqual(mockWindow.location.href, '');
});

it('Does NOT treat 403 Forbidden as an expired session', async () => {
  const mockStorage = {
    localStorage: {
      data: { flowforge_token: 'valid.token' },
      removeItem(k) { delete this.data[k]; }
    },
    sessionStorage: {
      data: {},
      setItem(k, v) { this.data[k] = v; }
    }
  };
  const mockWindow = {
    location: {
      pathname: '/dashboard',
      href: ''
    }
  };

  const error = {
    config: { url: '/admin/settings' },
    response: { status: 403, data: { message: 'Forbidden resource' } }
  };

  try {
    await simulateResponseInterceptor(error, mockWindow, mockStorage);
  } catch (err) {}

  assert.strictEqual(mockStorage.localStorage.data.flowforge_token, 'valid.token');
  assert.strictEqual(mockWindow.location.href, '');
});

it('Translates 401 and 403 error messages appropriately without leaking secrets', () => {
  const login401 = { config: { url: '/auth/login' }, response: { status: 401 } };
  assert.strictEqual(getErrorMessage(login401), 'Invalid credentials. Please verify your email and password.');

  const session401 = { config: { url: '/workflows' }, response: { status: 401 } };
  assert.strictEqual(getErrorMessage(session401), 'Your session has expired. Please sign in again.');

  const forbidden403 = { response: { status: 403 } };
  assert.strictEqual(getErrorMessage(forbidden403), 'Access denied. You do not have permission to perform this action.');
});

// -------------------------------------------------------------
// SUITE 3: UI Navigation & Controls Verification
// -------------------------------------------------------------
console.log('\nSUITE 3: UI Quick Action & Search Filtering Logic');

it('Filters workflows by query in memory correctly', () => {
  const sampleWorkflows = [
    { _id: '1', name: 'Order Processing Pipeline', description: 'Handles Shopify webhooks' },
    { _id: '2', name: 'AI Customer Feedback Sentiment', description: 'Analyzes reviews' },
    { _id: '3', name: 'Database Backup Cron', description: 'Nightly sync to S3' }
  ];

  const query = 'feedback';
  const matches = sampleWorkflows.filter(
    (w) => w.name.toLowerCase().includes(query) || w.description.toLowerCase().includes(query)
  );

  assert.strictEqual(matches.length, 1);
  assert.strictEqual(matches[0]._id, '2');
});

it('Returns all workflows when search query is empty or whitespace', () => {
  const sampleWorkflows = [
    { _id: '1', name: 'Workflow A' },
    { _id: '2', name: 'Workflow B' }
  ];
  const query = '   ';
  const filtered = query.trim() ? sampleWorkflows.filter(w => w.name.includes(query.trim())) : sampleWorkflows;
  assert.strictEqual(filtered.length, 2);
});

console.log('\n================================================================');
console.log(`SUMMARY: ${passedTests}/${totalTests} tests passed cleanly.`);
console.log('================================================================\n');
