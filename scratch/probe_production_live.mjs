import https from 'https';

console.log('🔍 Starting FlowForge AI Live Production Smoke Test Probe...\n');

const FRONTEND_URL = 'https://flowforge-ai-ten.vercel.app';
const BACKEND_URL = 'https://flowforge-ai-api-hj63.onrender.com';

async function makeRequest(url, options = {}) {
  const start = Date.now();
  const res = await fetch(url, options);
  const duration = Date.now() - start;
  let text = '';
  try {
    text = await res.text();
  } catch {}
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {}
  return {
    status: res.status,
    statusText: res.statusText,
    headers: Object.fromEntries(res.headers.entries()),
    duration,
    bodyText: text,
    bodyJson: json
  };
}

async function runLiveProbes() {
  const results = [];

  // Probe 1: Backend Health Check
  console.log('1. Probing Backend Health Check...');
  try {
    const res = await makeRequest(`${BACKEND_URL}/api/health`);
    console.log(`   Status: ${res.status} ${res.statusText} (${res.duration}ms)`);
    console.log(`   Response:`, res.bodyJson);
    const pass = res.status === 200 && res.bodyJson?.success === true && res.bodyJson?.status === 'healthy';
    results.push({ name: 'Backend Health Check', url: `${BACKEND_URL}/api/health`, pass, details: res.bodyJson });
  } catch (err) {
    console.error('   Error:', err.message);
    results.push({ name: 'Backend Health Check', pass: false, error: err.message });
  }

  // Probe 2: CORS Preflight for Vercel Frontend Origin
  console.log('\n2. Probing CORS Preflight with Vercel Origin...');
  try {
    const res = await makeRequest(`${BACKEND_URL}/api/workflows`, {
      method: 'OPTIONS',
      headers: {
        'Origin': FRONTEND_URL,
        'Access-Control-Request-Method': 'GET',
        'Access-Control-Request-Headers': 'Authorization,Content-Type'
      }
    });
    console.log(`   Status: ${res.status} (${res.duration}ms)`);
    console.log(`   Access-Control-Allow-Origin: ${res.headers['access-control-allow-origin']}`);
    console.log(`   Access-Control-Allow-Credentials: ${res.headers['access-control-allow-credentials']}`);
    console.log(`   Access-Control-Allow-Headers: ${res.headers['access-control-allow-headers']}`);
    const pass = (res.status === 204 || res.status === 200) && res.headers['access-control-allow-origin'] === FRONTEND_URL;
    results.push({ 
      name: 'CORS Preflight Headers', 
      pass, 
      allowOrigin: res.headers['access-control-allow-origin'],
      allowCreds: res.headers['access-control-allow-credentials']
    });
  } catch (err) {
    console.error('   Error:', err.message);
    results.push({ name: 'CORS Preflight Headers', pass: false, error: err.message });
  }

  // Probe 3: Unauthenticated Workflow Protection (IDOR guard)
  console.log('\n3. Probing Unauthenticated GET /api/workflows...');
  try {
    const res = await makeRequest(`${BACKEND_URL}/api/workflows`);
    console.log(`   Status: ${res.status} ${res.statusText} (${res.duration}ms)`);
    console.log(`   Response:`, res.bodyJson);
    const pass = res.status === 401 && res.bodyJson?.success === false;
    results.push({ name: 'Unauthenticated /api/workflows Rejection', pass, status: res.status });
  } catch (err) {
    console.error('   Error:', err.message);
    results.push({ name: 'Unauthenticated /api/workflows Rejection', pass: false, error: err.message });
  }

  // Probe 4: Unauthenticated Executions Protection
  console.log('\n4. Probing Unauthenticated GET /api/executions & /api/executions/stats...');
  try {
    const res1 = await makeRequest(`${BACKEND_URL}/api/executions`);
    const res2 = await makeRequest(`${BACKEND_URL}/api/executions/stats`);
    console.log(`   GET /api/executions: ${res1.status}`);
    console.log(`   GET /api/executions/stats: ${res2.status}`);
    const pass = res1.status === 401 && res2.status === 401;
    results.push({ name: 'Unauthenticated /api/executions Protection', pass });
  } catch (err) {
    console.error('   Error:', err.message);
    results.push({ name: 'Unauthenticated /api/executions Protection', pass: false, error: err.message });
  }

  // Probe 5: Invalid Login Rejection (Error Translation & Security)
  console.log('\n5. Probing Invalid Credentials Login POST /api/auth/login...');
  try {
    const res = await makeRequest(`${BACKEND_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'nonexistent-smoke-test@flowforge.internal', password: 'InvalidPassword123!' })
    });
    console.log(`   Status: ${res.status} (${res.duration}ms)`);
    console.log(`   Response:`, res.bodyJson);
    const pass = res.status === 401 && res.bodyJson?.success === false;
    results.push({ name: 'Invalid Credentials Rejection', pass, status: res.status, message: res.bodyJson?.message });
  } catch (err) {
    console.error('   Error:', err.message);
    results.push({ name: 'Invalid Credentials Rejection', pass: false, error: err.message });
  }

  // Probe 6: Public Webhook Ingress Token Format Validation
  console.log('\n6. Probing Webhook Token Format Guard POST /api/webhooks/invalid-token...');
  try {
    const res = await makeRequest(`${BACKEND_URL}/api/webhooks/invalid-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ test: 'smoke' })
    });
    console.log(`   Status: ${res.status} (${res.duration}ms)`);
    // Non-hex token is rejected by webhookController with 404 'Webhook endpoint not found.' to prevent enumeration
    const pass = res.status === 404 && res.bodyJson?.message === 'Webhook endpoint not found.';
    results.push({ name: 'Webhook Route & Token Format Guard', pass, status: res.status, message: res.bodyJson?.message });
  } catch (err) {
    console.error('   Error:', err.message);
    results.push({ name: 'Webhook Route & Token Format Guard', pass: false, error: err.message });
  }

  // Probe 7: Frontend Vercel Production Delivery
  console.log('\n7. Probing Live Vercel Frontend...');
  try {
    const res = await makeRequest(FRONTEND_URL);
    console.log(`   Status: ${res.status} (${res.duration}ms)`);
    const hasRoot = res.bodyText.includes('<div id="root">');
    const hasTitle = res.bodyText.includes('FlowForge AI');
    const pass = res.status === 200 && hasRoot && hasTitle;
    console.log(`   Contains root container: ${hasRoot}, Has title: ${hasTitle}`);
    results.push({ name: 'Vercel Frontend HTML Delivery', pass, status: res.status });
  } catch (err) {
    console.error('   Error:', err.message);
    results.push({ name: 'Vercel Frontend HTML Delivery', pass: false, error: err.message });
  }

  // Summary
  console.log('\n========================================');
  console.log('LIVE PRODUCTION PROBE RESULTS:');
  console.log('========================================');
  let passedCount = 0;
  for (const r of results) {
    console.log(`${r.pass ? '✅ [PASS]' : '❌ [FAIL]'} ${r.name}`);
    if (r.pass) passedCount++;
  }
  console.log(`\nTotal: ${passedCount}/${results.length} probes passed.`);
}

runLiveProbes();
