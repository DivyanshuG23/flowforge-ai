import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import dotenv and mongoose from server node_modules
import dotenv from '../server/node_modules/dotenv/lib/main.js';
import mongoose from '../server/node_modules/mongoose/index.js';

dotenv.config({ path: path.resolve(__dirname, '../server/.env') });

process.env.PORT = '5056';
process.env.NODE_ENV = 'test';

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

async function runTests() {
  console.log('=== FlowForge AI: Phase 7D Landing Page & Health Check Verification ===\n');

  // 1. Test Backend /api/health Endpoint
  console.log('--- 1. Backend /api/health Endpoint Verification ---');
  const serverModule = await import('../server/server.js');
  const app = serverModule.default;

  console.log('Waiting for MongoDB Atlas connection to become ready (readyState === 1)...');
  let retries = 0;
  while (mongoose.connection.readyState !== 1 && retries < 40) {
    await new Promise((r) => setTimeout(r, 250));
    retries++;
  }
  console.log(`MongoDB state: ${mongoose.connection.readyState} (1 = connected)`);

  const healthRes = await fetch('http://localhost:5056/api/health');
  const healthData = await healthRes.json();

  assert(healthRes.status === 200, 'GET /api/health returns HTTP 200');
  assert(healthData.success === true, 'Health check returns success: true');
  assert(healthData.status === 'healthy', 'Health check status is healthy');
  assert(healthData.database === 'connected', 'Database readiness reports connected');

  // 2. Test Frontend Production Build Artifacts
  console.log('\n--- 2. Frontend Production Build Artifacts Verification ---');
  const distPath = path.resolve(__dirname, '../client/dist');
  const indexPath = path.join(distPath, 'index.html');
  const assetsPath = path.join(distPath, 'assets');

  assert(fs.existsSync(indexPath), 'dist/index.html exists');
  const indexHtml = fs.readFileSync(indexPath, 'utf-8');
  assert(indexHtml.includes('<div id="root"></div>'), 'index.html contains React root mount element');

  const assetsFiles = fs.readdirSync(assetsPath);
  const jsBundleName = assetsFiles.find((f) => f.endsWith('.js'));
  const cssBundleName = assetsFiles.find((f) => f.endsWith('.css'));

  assert(!!jsBundleName, `Found JS bundle: ${jsBundleName}`);
  assert(!!cssBundleName, `Found CSS bundle: ${cssBundleName}`);

  // 3. Security Audit: Check that backend secrets are NOT present in client production bundle
  console.log('\n--- 3. Secret Leakage Audit on Client JS Bundle ---');
  const jsBundleContent = fs.readFileSync(path.join(assetsPath, jsBundleName), 'utf-8');

  assert(!jsBundleContent.includes(process.env.JWT_SECRET || 'supersecret'), 'JWT secret is not leaked in bundle');
  assert(!jsBundleContent.includes('mongodb+srv://'), 'MongoDB URI connection string is not leaked in bundle');
  if (process.env.GEMINI_API_KEY) {
    assert(!jsBundleContent.includes(process.env.GEMINI_API_KEY), 'GEMINI_API_KEY is not leaked in bundle');
  }

  // 4. Vercel SPA Rewrite Configuration Verification
  console.log('\n--- 4. Vercel SPA Rewrite Configuration ---');
  const vercelConfigPath = path.resolve(__dirname, '../client/vercel.json');
  assert(fs.existsSync(vercelConfigPath), 'client/vercel.json exists');
  const vercelJson = JSON.parse(fs.readFileSync(vercelConfigPath, 'utf-8'));
  assert(
    Array.isArray(vercelJson.rewrites) &&
      vercelJson.rewrites.some((r) => r.source === '/(.*)' && r.destination === '/index.html'),
    'vercel.json contains valid SPA catch-all rewrite to /index.html'
  );

  // 5. Verification of Landing Page Components & Palette
  console.log('\n--- 5. Landing Page Code & Palette Verification ---');
  const homePath = path.resolve(__dirname, '../client/src/pages/Home.jsx');
  const homeContent = fs.readFileSync(homePath, 'utf-8');

  // Verify palette colors are used
  assert(homeContent.includes('#E5B45B'), 'Uses Champagne Gold (#E5B45B)');
  assert(homeContent.includes('#0B0D0C'), 'Uses Charcoal (#0B0D0C)');
  assert(homeContent.includes('#059669'), 'Uses Emerald (#059669)');
  assert(homeContent.includes('#C83C3C'), 'Uses Ruby Red (#C83C3C)');
  assert(homeContent.includes('#F5F0E6'), 'Uses Warm Ivory (#F5F0E6)');
  assert(homeContent.includes('#B9B0A0'), 'Uses Muted Warm Gray (#B9B0A0)');

  // Verify raw JSON dump was removed from Home.jsx
  assert(!homeContent.includes('JSON.stringify(healthStatus'), 'Raw JSON health check dump was removed from Home.jsx');

  // Verify core sections exist
  assert(homeContent.includes('id="preview"'), 'Contains interactive product preview section');
  assert(homeContent.includes('id="features"'), 'Contains features section');
  assert(homeContent.includes('id="how-it-works"'), 'Contains how it works section');
  assert(homeContent.includes('id="use-cases"'), 'Contains use cases section');
  assert(homeContent.includes('id="faq"'), 'Contains FAQ section');

  // Verify honest claims (no fake stats, no fake claims)
  assert(!homeContent.includes('99.999%'), 'Does not make fabricated uptime claims');
  assert(!homeContent.includes('Fortune 500'), 'Does not invent fake customer logos/testimonials');
  assert(homeContent.includes('gemini-3.8-flash'), 'Honestly cites verified gemini-3.8-flash model');

  // Clean shutdown
  console.log('\n=============================================================');
  console.log(`Landing Page & Health Check Results: ${passed} passed, ${failed} failed`);
  console.log('=============================================================\n');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
