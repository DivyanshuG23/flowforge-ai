import mongoose from '../server/node_modules/mongoose/index.js';
import { getAllowedOrigins } from '../server/config/corsConfig.js';
import { getHealthStatus, getLivenessStatus, getReadinessStatus } from '../server/controllers/healthController.js';

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

async function apiRequest(url, { method = 'GET', headers = {}, body = null } = {}) {
  const config = {
    method,
    headers: {
      ...headers
    }
  };
  if (body) {
    config.headers['Content-Type'] = 'application/json';
    config.body = JSON.stringify(body);
  }
  const res = await fetch(url, config);
  let data = null;
  try {
    data = await res.json();
  } catch {}
  return {
    status: res.status,
    headers: res.headers,
    data
  };
}

async function runTests() {
  console.log('=== FlowForge AI — Phase 6B: Deployment Readiness & Security Verification ===\n');

  // -------------------------------------------------------------
  // Part 1: CORS Allowlist & Origin Security Unit & Integration
  // -------------------------------------------------------------
  console.log('--- 1. CORS Allowlist Unit Tests ---');
  const initialClientOrigin = process.env.CLIENT_ORIGIN;
  const initialNodeEnv = process.env.NODE_ENV;

  try {
    process.env.CLIENT_ORIGIN = 'https://flowforge.app, https://preview.flowforge.app';
    process.env.NODE_ENV = 'development';
    let devOrigins = getAllowedOrigins();
    assert(devOrigins.has('https://flowforge.app'), 'Includes first configured origin');
    assert(devOrigins.has('https://preview.flowforge.app'), 'Includes second trimmed configured origin');
    assert(devOrigins.has('http://localhost:5173'), 'Includes local Vite dev origin in development');
    assert(devOrigins.has('http://localhost:3000'), 'Includes local React dev origin in development');

    process.env.NODE_ENV = 'production';
    let prodOrigins = getAllowedOrigins();
    assert(prodOrigins.has('https://flowforge.app'), 'Production includes configured origin');
    assert(!prodOrigins.has('http://localhost:5173'), 'Production strictly excludes localhost:5173 if not in CLIENT_ORIGIN');
    assert(!prodOrigins.has('http://localhost:3000'), 'Production strictly excludes localhost:3000');
  } finally {
    process.env.CLIENT_ORIGIN = initialClientOrigin;
    process.env.NODE_ENV = initialNodeEnv;
  }

  // -------------------------------------------------------------
  // Part 2: Health Check Controller Unit Tests
  // -------------------------------------------------------------
  console.log('\n--- 2. Health Check Controller Logic Tests ---');

  // Mock response helper
  const createMockRes = () => {
    const res = {
      statusCode: 200,
      body: null,
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(data) {
        this.body = data;
        return this;
      }
    };
    return res;
  };

  // Test Liveness probe
  const livenessRes = createMockRes();
  getLivenessStatus({}, livenessRes);
  assert(livenessRes.statusCode === 200, 'Liveness probe returns HTTP 200');
  assert(livenessRes.body.status === 'alive', 'Liveness reports status: alive');
  assert(typeof livenessRes.body.uptimeSeconds === 'number', 'Liveness reports uptime in seconds');
  assert(!livenessRes.body.database, 'Liveness probe does not query database state');

  // Test Readiness probe with simulated disconnect
  const originalReadyState = mongoose.connection.readyState;
  try {
    // Simulate disconnected state (0)
    Object.defineProperty(mongoose.connection, 'readyState', { value: 0, configurable: true });
    const unreadyRes = createMockRes();
    getReadinessStatus({}, unreadyRes);
    assert(unreadyRes.statusCode === 503, 'Readiness probe returns HTTP 503 when DB disconnected');
    assert(unreadyRes.body.status === 'unhealthy', 'Reports unhealthy status');
    assert(unreadyRes.body.database === 'disconnected', 'Reports database: disconnected');
    assert(!JSON.stringify(unreadyRes.body).includes('mongodb://'), 'Does not leak connection URI');

    // Simulate connected state (1)
    Object.defineProperty(mongoose.connection, 'readyState', { value: 1, configurable: true });
    const readyRes = createMockRes();
    getReadinessStatus({}, readyRes);
    assert(readyRes.statusCode === 200, 'Readiness probe returns HTTP 200 when DB connected');
    assert(readyRes.body.status === 'healthy', 'Reports healthy status');
    assert(readyRes.body.database === 'connected', 'Reports database: connected');
    assert(!JSON.stringify(readyRes.body).includes('mongodb://'), 'Does not leak connection URI or credentials');
  } finally {
    Object.defineProperty(mongoose.connection, 'readyState', { value: originalReadyState, configurable: true });
  }

  // -------------------------------------------------------------
  // Part 3: Live Server Integration Tests
  // -------------------------------------------------------------
  console.log('\n--- 3. Live Server End-to-End Integration Tests ---');
  const BASE_URL = 'http://localhost:5000';

  // 3.1 Live Health Check Endpoints
  const liveHealth = await apiRequest(`${BASE_URL}/api/health`);
  assert(liveHealth.status === 200, 'Live /api/health responds with 200 OK');
  assert(liveHealth.data.database === 'connected', 'Live health check verifies MongoDB connected');
  assert(liveHealth.data.status === 'healthy', 'Live health check status is healthy');

  const liveLiveness = await apiRequest(`${BASE_URL}/api/health/liveness`);
  assert(liveLiveness.status === 200, 'Live /api/health/liveness responds with 200 OK');
  assert(liveLiveness.data.status === 'alive', 'Live liveness probe reports status: alive');

  const liveReadiness = await apiRequest(`${BASE_URL}/api/health/readiness`);
  assert(liveReadiness.status === 200, 'Live /api/health/readiness responds with 200 OK');
  assert(liveReadiness.data.database === 'connected', 'Live readiness probe confirms database connectivity');

  // 3.2 Live CORS Allow / Deny Tests
  console.log('\n--- 4. Live CORS Preflight & Origin Protection Tests ---');

  // Allowed Origin Preflight
  const allowedPreflight = await apiRequest(`${BASE_URL}/api/health`, {
    method: 'OPTIONS',
    headers: {
      Origin: 'http://localhost:5173',
      'Access-Control-Request-Method': 'GET'
    }
  });
  assert(allowedPreflight.status === 204, 'Preflight from allowed origin returns 204 No Content');
  assert(
    allowedPreflight.headers.get('access-control-allow-origin') === 'http://localhost:5173',
    'Preflight sets Access-Control-Allow-Origin header matching requester'
  );
  assert(
    allowedPreflight.headers.get('access-control-allow-credentials') === 'true',
    'Preflight allows credentials'
  );

  // Allowed Origin GET Request
  const allowedGet = await apiRequest(`${BASE_URL}/api/health`, {
    headers: { Origin: 'http://localhost:5173' }
  });
  assert(allowedGet.status === 200, 'GET from allowed origin returns 200 OK');
  assert(
    allowedGet.headers.get('access-control-allow-origin') === 'http://localhost:5173',
    'Response headers include Access-Control-Allow-Origin for authorized origin'
  );

  // Disallowed Origin Request
  const disallowedOrigin = await apiRequest(`${BASE_URL}/api/health`, {
    headers: { Origin: 'https://evil-unauthorized-site.com' }
  });
  assert(
    disallowedOrigin.status === 403,
    'Request from unauthorized origin is blocked with HTTP 403 Forbidden'
  );
  assert(
    disallowedOrigin.data?.message?.includes('CORS policy'),
    'Helpful, safe error message returned for CORS block'
  );
  assert(
    !disallowedOrigin.headers.get('access-control-allow-origin'),
    'Access-Control-Allow-Origin header is omitted for unauthorized origin'
  );

  // Non-browser request without Origin header (curl / health check)
  const noOriginReq = await apiRequest(`${BASE_URL}/api/health`);
  assert(noOriginReq.status === 200, 'Non-browser request without Origin header is accepted cleanly');

  // -------------------------------------------------------------
  // Part 5: Authentication & Workflow Pipeline with Rate Limiter
  // -------------------------------------------------------------
  console.log('\n--- 5. Authentication, Rate Limiting & Execution Tests ---');

  const testEmail = `deploy_${Date.now()}@flowforge.test`;
  const testPassword = 'Password123!';

  // Register
  const regRes = await apiRequest(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    body: { name: 'Deploy Tester', email: testEmail, password: testPassword }
  });
  assert(regRes.status === 201, 'User registered successfully with HTTP 201');

  // Login
  const loginRes = await apiRequest(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    body: { email: testEmail, password: testPassword }
  });
  assert(loginRes.status === 200, 'User logged in successfully with HTTP 200');
  const token = loginRes.data?.token;
  assert(Boolean(token), 'Received JWT auth token');

  // RateLimit headers verification on auth
  const hasRateLimitHeaders =
    loginRes.headers.has('ratelimit') ||
    loginRes.headers.has('ratelimit-limit') ||
    loginRes.headers.has('x-ratelimit-limit') ||
    loginRes.headers.has('ratelimit-remaining');
  assert(hasRateLimitHeaders, 'Auth response includes RateLimit tracking headers');

  // Create Workflow
  const wfRes = await apiRequest(`${BASE_URL}/api/workflows`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: {
      name: 'Deployment Readiness Test Workflow',
      description: 'Verifies pipeline execution after Phase 6B hardening',
      nodes: [
        {
          id: 'trigger-1',
          type: 'custom',
          position: { x: 0, y: 0 },
          data: { type: 'trigger', label: 'Start Trigger' }
        },
        {
          id: 'condition-1',
          type: 'custom',
          position: { x: 200, y: 0 },
          data: {
            type: 'condition',
            label: 'Check Status',
            field: 'status',
            operator: 'equals',
            value: 'active'
          }
        },
        {
          id: 'output-1',
          type: 'custom',
          position: { x: 400, y: 0 },
          data: { type: 'output', label: 'Finish' }
        }
      ],
      edges: [
        {
          id: 'e1-2',
          source: 'trigger-1',
          target: 'condition-1'
        },
        {
          id: 'e2-3',
          source: 'condition-1',
          target: 'output-1',
          sourceHandle: 'true'
        }
      ]
    }
  });
  assert(wfRes.status === 201, 'Workflow created in MongoDB with HTTP 201');
  const workflowId = wfRes.data?.workflow?._id;
  assert(Boolean(workflowId), 'Workflow ID generated and returned');

  // Execute Workflow
  const execRes = await apiRequest(`${BASE_URL}/api/workflows/${workflowId}/execute`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` }
  });
  assert(execRes.status === 200, 'Workflow executed successfully with HTTP 200');
  assert(execRes.data?.success === true, 'Execution reported success: true');
  assert(execRes.data?.execution?.status === 'succeeded', 'Execution status is "succeeded"');
  assert(execRes.data?.execution?.nodeExecutions?.length === 3, 'All 3 pipeline nodes executed and recorded');

  // Check rate limit header on execution route
  const execRateLimit =
    execRes.headers.has('ratelimit') ||
    execRes.headers.has('ratelimit-limit') ||
    execRes.headers.has('x-ratelimit-limit') ||
    execRes.headers.has('ratelimit-remaining');
  assert(execRateLimit, 'Execution response includes RateLimit tracking headers');

  // Verify 429 status code when rate limit threshold is exceeded using isolated instance
  console.log('\n--- 6. Rate Limit Saturation (HTTP 429) Tests ---');
  const express = (await import('../server/node_modules/express/index.js')).default;
  const rateLimit = (await import('../server/node_modules/express-rate-limit/dist/index.mjs')).default;

  const testApp = express();
  testApp.use(express.json());

  const testLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 2,
    standardHeaders: 'draft-7',
    legacyHeaders: true,
    handler: (req, res) => {
      res.status(429).json({
        success: false,
        message: 'Too many authentication attempts from this IP. Please try again after 15 minutes.'
      });
    }
  });

  testApp.post('/test-rate-limit', testLimiter, (req, res) => {
    res.status(200).json({ success: true });
  });

  const testServer = await new Promise((resolve) => {
    const s = testApp.listen(5099, () => resolve(s));
  });

  try {
    const r1 = await apiRequest('http://localhost:5099/test-rate-limit', { method: 'POST', body: { email: 'a@b.com', password: 'secret_password' } });
    assert(r1.status === 200, 'First request within rate limit returns 200 OK');

    const r2 = await apiRequest('http://localhost:5099/test-rate-limit', { method: 'POST', body: { email: 'a@b.com', password: 'secret_password' } });
    assert(r2.status === 200, 'Second request within rate limit returns 200 OK');

    const r3 = await apiRequest('http://localhost:5099/test-rate-limit', { method: 'POST', body: { email: 'a@b.com', password: 'secret_password' } });
    assert(r3.status === 429, 'Excessive requests trigger HTTP 429 Too Many Requests');
    assert(
      r3.data?.message?.includes('Too many authentication attempts'),
      'HTTP 429 response contains clear, safe user-facing cooldown message'
    );
    assert(
      !JSON.stringify(r3.data || '').includes('secret_password'),
      'HTTP 429 response does not log or echo sensitive request payloads'
    );
  } finally {
    await new Promise((resolve) => testServer.close(resolve));
  }

  // -------------------------------------------------------------
  // Summary
  // -------------------------------------------------------------
  console.log('\n========================================');
  console.log(`TOTAL CHECKS: ${passed + failed}`);
  console.log(`PASSED: ${passed}`);
  console.log(`FAILED: ${failed}`);
  console.log('========================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Test execution failed with fatal error:', err);
  process.exit(1);
});
