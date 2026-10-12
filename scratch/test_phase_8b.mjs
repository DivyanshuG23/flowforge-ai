import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { 
  isValidCron, 
  isValidTimezone, 
  registerSchedule, 
  unregisterSchedule, 
  getScheduleStatus 
} from '../server/services/workflow/schedulerService.js';
import { handleWebhookTrigger } from '../server/controllers/webhookController.js';
import { executeWorkflowPipeline } from '../server/services/workflow/executionEngine.js';
import Workflow from '../server/models/Workflow.js';
import Execution from '../server/models/Execution.js';
import User from '../server/models/User.js';

console.log('🧪 Starting Phase 8B Automated Verification Suite...\n');

// =========================================================================
// Test Suite 1: Cron & Timezone Validation
// =========================================================================
console.log('--- Test Suite 1: Cron & Timezone Validation ---');
{
  // Valid crons
  assert.equal(isValidCron('0 9 * * *'), true, '0 9 * * * must be valid');
  assert.equal(isValidCron('*/15 * * * *'), true, '*/15 * * * * must be valid');
  assert.equal(isValidCron('0 0 * * 0'), true, '0 0 * * 0 must be valid');
  assert.equal(isValidCron('30 4 1,15 * *'), true, '30 4 1,15 * * must be valid');
  assert.equal(isValidCron('0 * * * *'), true, '0 * * * * must be valid');

  // Invalid crons
  assert.equal(isValidCron('invalid-cron'), false, 'invalid-cron must be false');
  assert.equal(isValidCron(''), false, 'empty string must be false');
  assert.equal(isValidCron(null), false, 'null must be false');
  assert.equal(isValidCron(undefined), false, 'undefined must be false');
  assert.equal(isValidCron(12345), false, 'number must be false');
  assert.equal(isValidCron('60 * * * *'), false, 'minute 60 must be false');
  assert.equal(isValidCron('* * * * * * *'), false, '7-part cron must be false');

  // Valid timezones
  assert.equal(isValidTimezone('UTC'), true, 'UTC must be valid');
  assert.equal(isValidTimezone('America/New_York'), true, 'America/New_York must be valid');
  assert.equal(isValidTimezone('Europe/London'), true, 'Europe/London must be valid');
  assert.equal(isValidTimezone('Asia/Kolkata'), true, 'Asia/Kolkata must be valid');
  assert.equal(isValidTimezone('Asia/Tokyo'), true, 'Asia/Tokyo must be valid');

  // Invalid timezones
  assert.equal(isValidTimezone('Mars/Phobos'), false, 'Mars/Phobos must be false');
  assert.equal(isValidTimezone('Invalid/Zone'), false, 'Invalid/Zone must be false');
  assert.equal(isValidTimezone(''), false, 'empty timezone must be false');
  assert.equal(isValidTimezone(null), false, 'null timezone must be false');

  console.log('  ✅ Cron syntax and IANA timezone validation verified.');
}

// =========================================================================
// Test Suite 2: Scheduler Service Mutex & Overlap Protection
// =========================================================================
console.log('\n--- Test Suite 2: Scheduler In-Flight Overlap Mutex ---');
{
  const mockWorkflow = {
    _id: '660000000000000000000001',
    schedule: {
      enabled: true,
      cron: '0 9 * * *',
      timezone: 'UTC'
    }
  };

  assert.equal(getScheduleStatus(mockWorkflow._id).inFlight, false, 'Workflow initially not in flight');

  // Register a valid schedule in memory
  const registered = registerSchedule(mockWorkflow);
  assert.equal(registered, true, 'Schedule registration should succeed');
  assert.equal(getScheduleStatus(mockWorkflow._id).isRegistered, true, 'Workflow should be scheduled in memory');

  // Test registration with invalid cron
  const invalidCronWf = {
    _id: '660000000000000000000002',
    schedule: { enabled: true, cron: 'bad-cron', timezone: 'UTC' }
  };
  assert.equal(registerSchedule(invalidCronWf), false, 'Invalid cron registration must fail');

  // Test registration with invalid timezone
  const invalidTzWf = {
    _id: '660000000000000000000003',
    schedule: { enabled: true, cron: '0 9 * * *', timezone: 'Bad/Tz' }
  };
  assert.equal(registerSchedule(invalidTzWf), false, 'Invalid timezone registration must fail');

  // Clean up schedule
  unregisterSchedule(mockWorkflow._id);
  assert.equal(getScheduleStatus(mockWorkflow._id).isRegistered, false, 'Workflow schedule successfully unregistered');

  console.log('  ✅ Scheduler lifecycle and registration verified.');
}

// =========================================================================
// Test Suite 3: Webhook Security, Token & Secret Validation
// =========================================================================
console.log('\n--- Test Suite 3: Webhook Security, Secrets & Payload Limits ---');
(async () => {
  const mockToken = crypto.randomBytes(24).toString('hex');
  const mockSecret = 'super-secret-webhook-key-2026';
  const mockUserId = '507f1f77bcf86cd799439011';

  User.exists = async () => ({ _id: mockUserId });
  Execution.findOne = async () => null;

  // 1. Non-existent token -> 404
  {
    const origFindOne = Workflow.findOne;
    Workflow.findOne = async () => null;

    let resCode = null;
    let resBody = null;
    const req = {
      params: { token: '0123456789abcdef0123456789abcdef' },
      body: { event: 'test' },
      headers: {},
      ip: '127.0.0.1'
    };
    const res = {
      status(code) { resCode = code; return this; },
      json(data) { resBody = data; return this; }
    };

    await handleWebhookTrigger(req, res);
    assert.equal(resCode, 404, 'Non-existent token must return 404');
    assert.equal(resBody.success, false);
    assert(resBody.message.includes('not found'));

    Workflow.findOne = origFindOne;
  }

  // 2. Disabled webhook -> 403
  {
    const origFindOne = Workflow.findOne;
    Workflow.findOne = async () => ({
      _id: '660000000000000000000010',
      name: 'Disabled Hook Workflow',
      webhook: { enabled: false, token: mockToken }
    });

    let resCode = null;
    let resBody = null;
    const req = {
      params: { token: mockToken },
      body: { event: 'test' },
      headers: {},
      ip: '127.0.0.1'
    };
    const res = {
      status(code) { resCode = code; return this; },
      json(data) { resBody = data; return this; }
    };

    await handleWebhookTrigger(req, res);
    assert.equal(resCode, 403, 'Disabled webhook must return 403');
    assert.equal(resBody.success, false);
    assert(resBody.message.includes('disabled'));

    Workflow.findOne = origFindOne;
  }

  // 3. Webhook with secret requiring authentication
  {
    const origFindOne = Workflow.findOne;
    Workflow.findOne = async () => ({
      _id: '660000000000000000000011',
      name: 'Secure Hook Workflow',
      userId: mockUserId,
      webhook: { enabled: true, token: mockToken, secret: mockSecret }
    });

    // Case A: Missing secret header -> 401
    {
      let resCode = null;
      let resBody = null;
      const req = {
        params: { token: mockToken },
        body: { event: 'test' },
        headers: {},
        ip: '127.0.0.1'
      };
      const res = {
        status(code) { resCode = code; return this; },
        json(data) { resBody = data; return this; }
      };

      await handleWebhookTrigger(req, res);
      assert.equal(resCode, 401, 'Missing secret must return 401');
      assert.equal(resBody.success, false);
    }

    // Case B: Incorrect secret header -> 401
    {
      let resCode = null;
      let resBody = null;
      const req = {
        params: { token: mockToken },
        body: { event: 'test' },
        headers: { 'x-webhook-secret': 'wrong-password' },
        ip: '127.0.0.1'
      };
      const res = {
        status(code) { resCode = code; return this; },
        json(data) { resBody = data; return this; }
      };

      await handleWebhookTrigger(req, res);
      assert.equal(resCode, 401, 'Wrong secret must return 401');
      assert.equal(resBody.success, false);
    }

    Workflow.findOne = origFindOne;
  }

  // 4. Oversized payload (>64KB) -> 413
  {
    const origFindOne = Workflow.findOne;
    Workflow.findOne = async () => ({
      _id: '660000000000000000000012',
      name: 'Oversized Hook Workflow',
      userId: mockUserId,
      webhook: { enabled: true, token: mockToken }
    });

    // Create a payload larger than 64KB (65536 bytes)
    const largeString = 'A'.repeat(70000);
    let resCode = null;
    let resBody = null;
    const req = {
      params: { token: mockToken },
      body: { data: largeString },
      headers: {},
      ip: '127.0.0.1'
    };
    const res = {
      status(code) { resCode = code; return this; },
      json(data) { resBody = data; return this; }
    };

    await handleWebhookTrigger(req, res);
    assert.equal(resCode, 413, 'Oversized payload must return 413');
    assert.equal(resBody.success, false);
    assert(resBody.message.includes('exceeds 64KB'));

    Workflow.findOne = origFindOne;
  }

  console.log('  ✅ Webhook security, token lookup, secret auth, and 64KB limits verified.');

  // =========================================================================
  // Test Suite 4: Replay & Idempotency Detection
  // =========================================================================
  console.log('\n--- Test Suite 4: Webhook Replay & Idempotency Detection ---');
  {
    const origFindOne = Workflow.findOne;
    const origCreate = Execution.create;
    const origFindByIdAndUpdate = Workflow.findByIdAndUpdate;

    const testToken = crypto.randomBytes(24).toString('hex');
    const mockWf = {
      _id: '660000000000000000000020',
      name: 'Idempotency Workflow',
      user: mockUserId,
      userId: mockUserId,
      nodes: [
        { id: 'node_trigger', type: 'trigger', data: { type: 'trigger' } },
        { id: 'node_output', type: 'output', data: { type: 'output' } }
      ],
      edges: [
        { id: 'e1', source: 'node_trigger', target: 'node_output' }
      ],
      webhook: { enabled: true, token: testToken }
    };

    Workflow.findOne = async () => mockWf;
    Workflow.findByIdAndUpdate = async () => mockWf;
    Execution.create = async (doc) => ({
      _id: '660000000000000000000099',
      ...doc
    });

    // First call with an event ID
    let res1Code = null, res1Body = null;
    const req1 = {
      params: { token: testToken },
      body: { eventId: 'evt_unique_12345', data: 'first transmission' },
      headers: { 'x-event-id': 'evt_unique_12345' },
      ip: '127.0.0.1'
    };
    const res1 = {
      status(code) { res1Code = code; return this; },
      json(data) { res1Body = data; return this; }
    };

    await handleWebhookTrigger(req1, res1);
    assert.equal(res1Code, 200, 'First trigger should succeed with 200');
    assert.equal(res1Body.success, true);
    assert.equal(res1Body.duplicate, false, 'First run is not duplicate');

    // Duplicate call with the same event ID within 5 min window
    let res2Code = null, res2Body = null;
    const req2 = {
      params: { token: testToken },
      body: { eventId: 'evt_unique_12345', data: 'first transmission' },
      headers: { 'x-event-id': 'evt_unique_12345' },
      ip: '127.0.0.1'
    };
    const res2 = {
      status(code) { res2Code = code; return this; },
      json(data) { res2Body = data; return this; }
    };

    await handleWebhookTrigger(req2, res2);
    assert.equal(res2Code, 200, 'Duplicate trigger handled cleanly with 200');
    assert.equal(res2Body.success, true);
    assert.equal(res2Body.duplicate, true, 'Second run must be marked as duplicate event');
    assert(res2Body.message.toLowerCase().includes('idempotent'), 'Response notes idempotency');

    Workflow.findOne = origFindOne;
    Execution.create = origCreate;
    Workflow.findByIdAndUpdate = origFindByIdAndUpdate;

    console.log('  ✅ Webhook duplicate event & replay prevention verified.');
  }

  // =========================================================================
  // Test Suite 5: Execution Engine Pipeline & Trigger Payload Propagation
  // =========================================================================
  console.log('\n--- Test Suite 5: Pipeline Trigger Source & Payload Propagation ---');
  {
    const pipelineWorkflow = {
      _id: '660000000000000000000030',
      name: 'Trigger Propagation Test',
      nodes: [
        { 
          id: 'trigger_1', 
          type: 'trigger', 
          data: { type: 'trigger', label: 'Start' } 
        },
        { 
          id: 'action_1', 
          type: 'action', 
          data: { type: 'action', label: 'Process', actionType: 'transform' } 
        },
        { 
          id: 'output_1', 
          type: 'output', 
          data: { type: 'output', label: 'Finish' } 
        }
      ],
      edges: [
        { id: 'e1', source: 'trigger_1', target: 'action_1' },
        { id: 'e2', source: 'action_1', target: 'output_1' }
      ]
    };

    const webhookPayload = {
      orderId: 'ORD-9876',
      total: 149.99,
      customer: { name: 'Ada Lovelace', email: 'ada@example.com' }
    };

    // Execute with webhook options
    const result = await executeWorkflowPipeline(pipelineWorkflow, {
      triggerSource: 'webhook',
      triggerPayload: webhookPayload,
      metadata: { webhookToken: 'sample-token' }
    });

    assert.equal(result.status, 'succeeded', 'Workflow execution should succeed');
    assert.equal(result.nodeExecutions.length, 3, 'All 3 nodes should execute');

    // Trigger Node output must receive the webhook payload
    const triggerTrace = result.nodeExecutions.find(n => n.nodeId === 'trigger_1');
    assert(triggerTrace, 'Trigger node trace must exist');
    assert.equal(triggerTrace.output.orderId, 'ORD-9876', 'Trigger output contains orderId');
    assert.equal(triggerTrace.output.total, 149.99, 'Trigger output contains total');
    assert.equal(triggerTrace.output.customer.name, 'Ada Lovelace', 'Trigger output contains customer');

    // Action Node input must receive trigger node output
    const actionTrace = result.nodeExecutions.find(n => n.nodeId === 'action_1');
    assert(actionTrace, 'Action node trace must exist');
    assert(actionTrace.input, 'Action node must receive input from upstream');
    assert.equal(actionTrace.input.orderId, 'ORD-9876', 'Action node received trigger output');

    console.log('  ✅ Trigger payload propagation through downstream nodes verified.');
  }

  // =========================================================================
  // Test Suite 6: Execution Model Schema Validations
  // =========================================================================
  console.log('\n--- Test Suite 6: Execution Model Schema Fields ---');
  {
    // Test that Execution model accepts triggerSource enum ('manual', 'scheduled', 'webhook')
    const manualExec = new Execution({
      workflow: '660000000000000000000040',
      userId: '507f1f77bcf86cd799439011',
      triggerSource: 'manual'
    });
    assert.equal(manualExec.triggerSource, 'manual');

    const scheduledExec = new Execution({
      workflow: '660000000000000000000040',
      userId: '507f1f77bcf86cd799439011',
      triggerSource: 'scheduled'
    });
    assert.equal(scheduledExec.triggerSource, 'scheduled');

    const webhookExec = new Execution({
      workflow: '660000000000000000000040',
      userId: '507f1f77bcf86cd799439011',
      triggerSource: 'webhook',
      triggerData: { sourceIp: '127.0.0.1', event: 'ping' }
    });
    assert.equal(webhookExec.triggerSource, 'webhook');
    assert.equal(webhookExec.triggerData.event, 'ping');

    console.log('  ✅ Execution schema triggerSource and triggerData fields verified.');
  }

  console.log('\n🎉 ALL PHASE 8B AUTOMATED TESTS PASSED SUCCESSFULLY! 🎉\n');
})();
