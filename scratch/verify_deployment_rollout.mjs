const BACKEND_URL = 'https://flowforge-ai-api-hj63.onrender.com';
const FRONTEND_URL = 'https://flowforge-ai-ten.vercel.app';

console.log('⏳ Polling production deployment status...\n');

async function checkDeployment() {
  const maxAttempts = 12; // up to ~4 minutes
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    console.log(`[Attempt ${attempt}/${maxAttempts}] Checking live Render and Vercel status...`);

    try {
      // 1. Check Health
      const healthRes = await fetch(`${BACKEND_URL}/api/health`);
      const healthData = await healthRes.json().catch(() => null);

      // 2. Check Webhook Route (indicates whether new commit 23f57ae is deployed)
      const webhookRes = await fetch(`${BACKEND_URL}/api/webhooks/invalid-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ping: true })
      });
      const webhookData = await webhookRes.json().catch(() => null);

      // 3. Check CORS preflight
      const corsRes = await fetch(`${BACKEND_URL}/api/workflows`, {
        method: 'OPTIONS',
        headers: {
          'Origin': FRONTEND_URL,
          'Access-Control-Request-Method': 'GET',
          'Access-Control-Request-Headers': 'Authorization,Content-Type'
        }
      });
      const allowOrigin = corsRes.headers.get('access-control-allow-origin');

      // 4. Check Frontend
      const feRes = await fetch(FRONTEND_URL);
      const feHtml = await feRes.text();
      const hasRoot = feHtml.includes('<div id="root">');

      console.log(`   Health: HTTP ${healthRes.status} (Uptime: ${healthData?.uptimeSeconds}s)`);
      console.log(`   Webhook Route: HTTP ${webhookRes.status} - Message: "${webhookData?.message || ''}"`);
      console.log(`   CORS Allow-Origin: "${allowOrigin}"`);
      console.log(`   Frontend: HTTP ${feRes.status} (Root: ${hasRoot})`);

      // If webhook route returns HTTP 400 (Invalid webhook token format), new server.js is LIVE!
      if (webhookRes.status === 400 && webhookData?.message?.includes('Invalid webhook token format')) {
        console.log('\n🎉 NEW DEPLOYMENT IS CONFIRMED LIVE ON RENDER! 🎉');
        return true;
      }

      if (webhookRes.status === 404) {
        console.log('   Render is still deploying or running previous build. Waiting 20 seconds...');
      }
    } catch (err) {
      console.log('   Encountered transient error during poll:', err.message);
    }

    if (attempt < maxAttempts) {
      await new Promise(r => setTimeout(r, 20000));
    }
  }

  console.log('\n⚠️ Polling completed. Render build may still be in progress.');
  return false;
}

checkDeployment();
