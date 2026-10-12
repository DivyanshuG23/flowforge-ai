import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import dependencies from server node_modules
import dotenv from '../server/node_modules/dotenv/lib/main.js';
import mongoose from '../server/node_modules/mongoose/index.js';

// Load server .env
dotenv.config({ path: path.resolve(__dirname, '../server/.env') });

process.env.PORT = '5055';
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

async function runExecutionHistoryTests() {
  console.log('=== FlowForge AI: Phase 7C Execution History & Metrics Tests ===\n');

  // Dynamic import of the server app
  const serverModule = await import('../server/server.js');
  const app = serverModule.default;

  // Wait for database connection to be ready
  if (mongoose.connection.readyState !== 1) {
    console.log('Waiting for MongoDB Atlas connection...');
    await new Promise((resolve) => {
      mongoose.connection.once('open', resolve);
      setTimeout(resolve, 5000); // 5s timeout fallback
    });
  }
  console.log(`Connected to MongoDB. State: ${mongoose.connection.readyState}\n`);

  const API_BASE = 'http://localhost:5055/api';

  // -------------------------------------------------------------
  // 1. Unauthenticated Endpoint Protection
  // -------------------------------------------------------------
  console.log('--- 1. Security & Authentication Checks ---');

  const unauthListRes = await fetch(`${API_BASE}/executions`);
  assert(unauthListRes.status === 401, 'Unauthenticated GET /api/executions returns 401');

  const unauthStatsRes = await fetch(`${API_BASE}/executions/stats`);
  assert(unauthStatsRes.status === 401, 'Unauthenticated GET /api/executions/stats returns 401');

  const unauthDetailRes = await fetch(`${API_BASE}/executions/64b1f2e3c4d5e6f7a8b9c0d1`);
  assert(unauthDetailRes.status === 401, 'Unauthenticated GET /api/executions/:id returns 401');

  // -------------------------------------------------------------
  // 2. User Authentication (User A and User B for Data Isolation)
  // -------------------------------------------------------------
  console.log('\n--- 2. User Provisioning & Authentication ---');

  const timestamp = Date.now();
  const userAEmail = `test_exec_a_${timestamp}@flowforge.test`;
  const userBEmail = `test_exec_b_${timestamp}@flowforge.test`;
  const password = 'TestPassword123!';

  const registerAndLogin = async (name, email) => {
    await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password })
    });

    const loginRes = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const loginData = await loginRes.json();
    return loginData.token;
  };

  const tokenA = await registerAndLogin('User A Executions', userAEmail);
  const tokenB = await registerAndLogin('User B Executions', userBEmail);

  assert(!!tokenA, 'User A registered and received JWT token');
  assert(!!tokenB, 'User B registered and received JWT token');

  const headersA = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${tokenA}`
  };

  const headersB = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${tokenB}`
  };

  // -------------------------------------------------------------
  // 3. User A Initial Stats & Executions (Empty State)
  // -------------------------------------------------------------
  console.log('\n--- 3. Initial Empty State Verification ---');

  const initialStatsRes = await fetch(`${API_BASE}/executions/stats`, { headers: headersA });
  const initialStats = await initialStatsRes.json();
  assert(initialStatsRes.status === 200 && initialStats.success === true, 'GET /api/executions/stats returns 200');
  assert(initialStats.stats.total === 0, 'Initial total executions is 0');
  assert(initialStats.stats.succeeded === 0, 'Initial succeeded executions is 0');
  assert(initialStats.stats.failed === 0, 'Initial failed executions is 0');
  assert(initialStats.stats.running === 0, 'Initial running executions is 0');
  assert(initialStats.stats.successRate === 0, 'Initial success rate is 0%');

  const initialListRes = await fetch(`${API_BASE}/executions`, { headers: headersA });
  const initialList = await initialListRes.json();
  assert(initialListRes.status === 200 && initialList.success === true, 'GET /api/executions returns 200');
  assert(initialList.totalExecutions === 0, 'Initial totalExecutions is 0');
  assert(Array.isArray(initialList.executions) && initialList.executions.length === 0, 'Initial executions array is empty');

  // -------------------------------------------------------------
  // 4. Create and Execute Workflows
  // -------------------------------------------------------------
  console.log('\n--- 4. Workflow Creation & Pipeline Execution ---');

  const workflowPayload1 = {
    name: `Telemetry Pipeline 1 - ${timestamp}`,
    description: 'Pipeline for verifying execution telemetry and stats',
    nodes: [
      {
        id: 'node-trigger-1',
        type: 'custom',
        position: { x: 100, y: 100 },
        data: { type: 'trigger', label: 'Webhook Trigger', description: 'Start' }
      },
      {
        id: 'node-output-1',
        type: 'custom',
        position: { x: 400, y: 100 },
        data: { type: 'output', label: 'HTTP Response', description: 'End' }
      }
    ],
    edges: [
      {
        id: 'edge-1-2',
        source: 'node-trigger-1',
        target: 'node-output-1'
      }
    ]
  };

  const createWfRes1 = await fetch(`${API_BASE}/workflows`, {
    method: 'POST',
    headers: headersA,
    body: JSON.stringify(workflowPayload1)
  });
  const createWfData1 = await createWfRes1.json();
  const wfId1 = createWfData1.workflow?._id;
  assert(!!wfId1, `Workflow 1 created with ID: ${wfId1}`);

  // Execute Workflow 1
  console.log('Executing Workflow 1 via POST /api/workflows/:id/execute...');
  const execRes1 = await fetch(`${API_BASE}/workflows/${wfId1}/execute`, {
    method: 'POST',
    headers: headersA
  });
  const execData1 = await execRes1.json();
  assert(execRes1.status === 200 && execData1.success === true, 'Workflow 1 executed successfully');
  const execution1 = execData1.execution;
  assert(!!execution1?._id, `Execution record created with ID: ${execution1?._id}`);
  assert(execution1.status === 'succeeded', 'Execution 1 status is succeeded');
  assert(execution1.durationMs >= 0, `Execution 1 duration: ${execution1.durationMs}ms`);
  assert(Array.isArray(execution1.nodeExecutions) && execution1.nodeExecutions.length === 2, 'Execution 1 recorded 2 node executions');

  // Execute Workflow 1 a second time
  console.log('Executing Workflow 1 second run...');
  const execRes2 = await fetch(`${API_BASE}/workflows/${wfId1}/execute`, {
    method: 'POST',
    headers: headersA
  });
  const execData2 = await execRes2.json();
  const execution2 = execData2.execution;
  assert(execRes2.status === 200 && execution2?.status === 'succeeded', 'Workflow 1 second run succeeded');

  // -------------------------------------------------------------
  // 5. Verify User A Updated Execution Statistics
  // -------------------------------------------------------------
  console.log('\n--- 5. Updated Execution Metrics Verification ---');

  const updatedStatsRes = await fetch(`${API_BASE}/executions/stats`, { headers: headersA });
  const updatedStats = await updatedStatsRes.json();
  assert(updatedStats.success === true, 'Stats retrieved successfully');
  assert(updatedStats.stats.total === 2, `Total executions updated to 2 (received: ${updatedStats.stats.total})`);
  assert(updatedStats.stats.succeeded === 2, `Succeeded runs updated to 2 (received: ${updatedStats.stats.succeeded})`);
  assert(updatedStats.stats.failed === 0, 'Failed runs remain 0');
  assert(updatedStats.stats.successRate === 100, `Success rate calculated as 100% (received: ${updatedStats.stats.successRate}%)`);

  // -------------------------------------------------------------
  // 6. Verify User A Execution List, Pagination & Populated Workflow
  // -------------------------------------------------------------
  console.log('\n--- 6. User Execution History & Pagination ---');

  const listRes = await fetch(`${API_BASE}/executions`, { headers: headersA });
  const listData = await listRes.json();
  assert(listData.success === true, 'GET /api/executions succeeded');
  assert(listData.totalExecutions === 2, `totalExecutions is 2 (received: ${listData.totalExecutions})`);
  assert(listData.count === 2, `count is 2 (received: ${listData.count})`);
  assert(listData.executions.length === 2, 'Returned 2 execution records');

  // Verify newest-first sort order
  const date1 = new Date(listData.executions[0].createdAt).getTime();
  const date2 = new Date(listData.executions[1].createdAt).getTime();
  assert(date1 >= date2, 'Executions are sorted in newest-first descending order');

  // Verify workflow field is populated
  const firstExec = listData.executions[0];
  assert(firstExec.workflow !== null && typeof firstExec.workflow === 'object', 'Workflow field is populated as an object');
  assert(firstExec.workflow.name === workflowPayload1.name, `Populated workflow name matches: "${firstExec.workflow.name}"`);

  // Test pagination limit = 1
  const page1Res = await fetch(`${API_BASE}/executions?page=1&limit=1`, { headers: headersA });
  const page1Data = await page1Res.json();
  assert(page1Data.currentPage === 1, 'Pagination currentPage is 1');
  assert(page1Data.limit === 1, 'Pagination limit is 1');
  assert(page1Data.totalPages === 2, `Pagination totalPages is 2 (received: ${page1Data.totalPages})`);
  assert(page1Data.executions.length === 1, 'Page 1 returns exactly 1 execution');
  assert(page1Data.executions[0]._id === execution2._id, 'Page 1 returns most recent execution (Run 2)');

  const page2Res = await fetch(`${API_BASE}/executions?page=2&limit=1`, { headers: headersA });
  const page2Data = await page2Res.json();
  assert(page2Data.currentPage === 2, 'Pagination currentPage is 2');
  assert(page2Data.executions.length === 1, 'Page 2 returns exactly 1 execution');
  assert(page2Data.executions[0]._id === execution1._id, 'Page 2 returns previous execution (Run 1)');

  // Test status filtering
  const succeededFilterRes = await fetch(`${API_BASE}/executions?status=succeeded`, { headers: headersA });
  const succeededFilterData = await succeededFilterRes.json();
  assert(succeededFilterData.totalExecutions === 2, 'Filter status=succeeded returns 2 runs');

  const failedFilterRes = await fetch(`${API_BASE}/executions?status=failed`, { headers: headersA });
  const failedFilterData = await failedFilterRes.json();
  assert(failedFilterData.totalExecutions === 0, 'Filter status=failed returns 0 runs');

  // -------------------------------------------------------------
  // 7. Verify Execution Detail By ID
  // -------------------------------------------------------------
  console.log('\n--- 7. Execution Detail Retrieval ---');

  const detailRes = await fetch(`${API_BASE}/executions/${execution1._id}`, { headers: headersA });
  const detailData = await detailRes.json();
  assert(detailRes.status === 200 && detailData.success === true, 'GET /api/executions/:id returns 200');
  assert(detailData.execution._id === execution1._id, 'Execution ID matches');
  assert(detailData.execution.workflow?.name === workflowPayload1.name, 'Execution workflow is populated');
  assert(Array.isArray(detailData.execution.nodeExecutions), 'nodeExecutions array is present');
  assert(detailData.execution.nodeExecutions.length === 2, 'nodeExecutions contains 2 steps');
  assert(detailData.execution.nodeExecutions[0].nodeId === 'node-trigger-1', 'Step 1 is trigger node');
  assert(detailData.execution.nodeExecutions[1].nodeId === 'node-output-1', 'Step 2 is output node');

  // Invalid ID format returns 400
  const invalidIdRes = await fetch(`${API_BASE}/executions/invalid-id-format`, { headers: headersA });
  assert(invalidIdRes.status === 400, 'Invalid execution ID format returns 400');

  // -------------------------------------------------------------
  // 8. Strict User-Level Data Isolation (User B cannot see User A's data)
  // -------------------------------------------------------------
  console.log('\n--- 8. Cross-User Data Isolation Verification ---');

  // User B list executions
  const userBListRes = await fetch(`${API_BASE}/executions`, { headers: headersB });
  const userBListData = await userBListRes.json();
  assert(userBListData.totalExecutions === 0, 'User B executions list is isolated (totalExecutions: 0)');
  assert(userBListData.executions.length === 0, 'User B receives 0 executions');

  // User B stats
  const userBStatsRes = await fetch(`${API_BASE}/executions/stats`, { headers: headersB });
  const userBStatsData = await userBStatsRes.json();
  assert(userBStatsData.stats.total === 0, 'User B stats are isolated (total: 0)');
  assert(userBStatsData.stats.succeeded === 0, 'User B succeeded is 0');

  // User B attempts to access User A's execution directly by ID
  const crossUserDetailRes = await fetch(`${API_BASE}/executions/${execution1._id}`, { headers: headersB });
  assert(crossUserDetailRes.status === 404, 'User B accessing User A execution returns 404 access denied');

  // -------------------------------------------------------------
  // 9. Clean up test artifacts
  // -------------------------------------------------------------
  console.log('\n--- 9. Cleanup ---');

  try {
    const Execution = (await import('../server/models/Execution.js')).default;
    const Workflow = (await import('../server/models/Workflow.js')).default;
    const User = (await import('../server/models/User.js')).default;

    await Execution.deleteMany({ _id: { $in: [execution1._id, execution2._id] } });
    await Workflow.deleteMany({ _id: wfId1 });
    await User.deleteMany({ email: { $in: [userAEmail, userBEmail] } });
    console.log('Cleaned up test executions, workflows, and users.');
  } catch (cleanErr) {
    console.warn('Cleanup warning:', cleanErr.message);
  }

  // Summary
  console.log('\n======================================================');
  console.log(`Execution History Test Results: ${passed} passed, ${failed} failed`);
  console.log('======================================================');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runExecutionHistoryTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
