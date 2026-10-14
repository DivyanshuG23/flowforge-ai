const BACKEND_URL = 'https://flowforge-ai-api-hj63.onrender.com';
const FRONTEND_URL = 'https://flowforge-ai-ten.vercel.app';

async function verifyDeployedReadonly() {
  console.log('=== Verifying Deployed FlowForge AI Service Availability ===\n');

  // 1. Frontend Availability
  const fe = await fetch(FRONTEND_URL);
  const feText = await fe.text();
  console.log('1. Frontend:', fe.status, fe.statusText, '| Root element present:', feText.includes('<div id="root">'));

  // 2. Backend Health & Readiness
  const hRes = await fetch(`${BACKEND_URL}/api/health`);
  const h = await hRes.json();
  console.log('2. Health (status):', hRes.status, '| DB:', h.database, '| Uptime:', h.uptimeSeconds, 's');

  const rRes = await fetch(`${BACKEND_URL}/api/health/readiness`);
  const r = await rRes.json();
  console.log('3. Readiness (status):', rRes.status, '| DB:', r.database);

  // 3. CORS Preflight
  const cors = await fetch(`${BACKEND_URL}/api/workflows`, {
    method: 'OPTIONS',
    headers: {
      'Origin': FRONTEND_URL,
      'Access-Control-Request-Method': 'GET',
      'Access-Control-Request-Headers': 'Authorization,Content-Type'
    }
  });
  console.log('4. CORS Allow-Origin:', cors.headers.get('access-control-allow-origin') || 'MISSING');

  // 4. Protected Route Guard (No Token)
  const wfGuard = await fetch(`${BACKEND_URL}/api/workflows`);
  const wfGuardData = await wfGuard.json();
  console.log('5. Workflows Auth Guard (HTTP status):', wfGuard.status, '| Error message:', wfGuardData.message);

  const execGuard = await fetch(`${BACKEND_URL}/api/executions`);
  const execGuardData = await execGuard.json();
  console.log('6. Executions Auth Guard (HTTP status):', execGuard.status, '| Error message:', execGuardData.message);

  // 5. Auth Payload Validation Guard
  const authVal = await fetch(`${BACKEND_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({})
  });
  const authValData = await authVal.json();
  console.log('7. Auth Validation Guard (HTTP status):', authVal.status, '| Error message:', authValData.message);

  // 6. Webhook Format Guard
  const hookGuard = await fetch(`${BACKEND_URL}/api/webhooks/invalid-token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ping: true })
  });
  const hookGuardData = await hookGuard.json();
  console.log('8. Webhook Format Guard (HTTP status):', hookGuard.status, '| Error message:', hookGuardData.message);
}

verifyDeployedReadonly().catch((err) => {
  console.error('Fatal probe error:', err);
  process.exit(1);
});
