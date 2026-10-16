import {
  executeAiRequest,
  buildPromptWithContext,
  parseStructuredOutput,
  sanitizeUrl,
  sanitizeHeaders,
  sanitizeSecretsInString,
  validateProviderEndpoint,
  formatProviderError,
  MAX_INPUT_BYTES,
  MAX_RESPONSE_BYTES,
  DEFAULT_TIMEOUT_MS
} from '../server/services/workflow/aiExecutor.js';

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

console.log('=== FlowForge AI: Secure Backend AI Executor Service Tests ===\n');

// Helper to create mock ReadableStream from a string
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

// Helper to create mock oversized ReadableStream
function createOversizedStream(targetBytes) {
  const chunk = new Uint8Array(1024 * 64); // 64 KB chunks
  let emitted = 0;
  return new ReadableStream({
    pull(controller) {
      if (emitted >= targetBytes) {
        controller.close();
        return;
      }
      controller.enqueue(chunk);
      emitted += chunk.byteLength;
    }
  });
}

// -------------------------------------------------------------
// 1. Secret Redaction & Sanitization Tests
// -------------------------------------------------------------
console.log('--- 1. Secret Redaction & URL Sanitization Tests ---');

const testGeminiUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=AIzaSyD_SECRET_KEY_1234567890';
const sanitizedUrl = sanitizeUrl(testGeminiUrl);
assert(!sanitizedUrl.includes('AIzaSyD_SECRET_KEY_1234567890'), 'Gemini key is removed from URL');
assert(sanitizedUrl.includes('key=%5BREDACTED%5D') || sanitizedUrl.includes('key=[REDACTED]'), 'URL replaces key parameter with [REDACTED]');

const testHeaders = {
  authorization: 'Bearer sk-proj-1234567890abcdef1234567890abcdef',
  'x-api-key': 'secret-api-key-value',
  'content-type': 'application/json',
  accept: 'application/json'
};
const sanitizedH = sanitizeHeaders(testHeaders);
assert(sanitizedH.authorization === '[REDACTED]', 'Redacts authorization header');
assert(sanitizedH['x-api-key'] === '[REDACTED]', 'Redacts x-api-key header');
assert(sanitizedH['content-type'] === 'application/json', 'Preserves content-type header');

const leakString = 'Error occurred: invalid key AIzaSyD1234567890abcdef1234567890abcdef or token sk-1234567890abcdef1234567890';
const cleanString = sanitizeSecretsInString(leakString);
assert(!cleanString.includes('AIzaSyD1234567890abcdef'), 'Scrubs raw Gemini key from string');
assert(!cleanString.includes('sk-1234567890abcdef'), 'Scrubs raw OpenAI key from string');
assert(cleanString.includes('[REDACTED_GEMINI_KEY]'), 'Replaces with [REDACTED_GEMINI_KEY]');
assert(cleanString.includes('[REDACTED_OPENAI_KEY]'), 'Replaces with [REDACTED_OPENAI_KEY]');

// -------------------------------------------------------------
// 2. Endpoint Validation & SSRF Prevention Tests
// -------------------------------------------------------------
console.log('\n--- 2. Endpoint Validation & SSRF Prevention Tests ---');

// Non-HTTPS should be rejected
const httpCheck = await validateProviderEndpoint('http://api.openai.com/v1/chat/completions');
assert(!httpCheck.isValid, 'Blocks non-HTTPS endpoint protocol');
assert(httpCheck.error.includes('Only HTTPS'), 'Reports HTTPS requirement');

// Unapproved host should be rejected
const unapprovedHostCheck = await validateProviderEndpoint('https://evil-unapproved-ai.com/v1');
assert(!unapprovedHostCheck.isValid, 'Blocks unapproved custom host');
assert(unapprovedHostCheck.error.includes('not in the approved AI provider allowlist'), 'Reports allowlist violation');

// Private IP / Localhost SSRF should be rejected
const loopbackCheck = await validateProviderEndpoint('https://127.0.0.1:8000/v1');
assert(!loopbackCheck.isValid, 'Blocks loopback IP endpoint');

const metadataCheck = await validateProviderEndpoint('https://169.254.169.254/latest/meta-data');
assert(!metadataCheck.isValid, 'Blocks cloud metadata IP endpoint');

// -------------------------------------------------------------
// 3. Prompt Building & Context Interpolation Tests
// -------------------------------------------------------------
console.log('\n--- 3. Prompt Building & Context Interpolation Tests ---');

const promptOnly = buildPromptWithContext('Analyze this payload', null);
assert(promptOnly === 'Analyze this payload', 'Preserves prompt when input is null');

const promptWithInput = buildPromptWithContext('Triage error', { statusCode: 500, message: 'DB down' });
assert(promptWithInput.includes('Triage error'), 'Includes prompt directive');
assert(promptWithInput.includes('Workflow Input Context'), 'Includes context separator');
assert(promptWithInput.includes('"statusCode": 500'), 'Serializes structured input JSON');
assert(promptWithInput.includes('DB down'), 'Includes input data fields');

// -------------------------------------------------------------
// 4. Structured Output Parsing Tests
// -------------------------------------------------------------
console.log('\n--- 4. Structured Output Parsing Tests ---');

// Valid JSON
const parsedDirect = parseStructuredOutput('{"status": "ok", "confidence": 0.95}', 'json');
assert(parsedDirect !== null && parsedDirect.status === 'ok' && parsedDirect.confidence === 0.95, 'Parses direct JSON output');

// Markdown code block JSON
const markdownJson = 'Here is the analysis:\n```json\n{"action": "retry", "delayMs": 500}\n```\nDone.';
const parsedFence = parseStructuredOutput(markdownJson, 'json');
assert(parsedFence !== null && parsedFence.action === 'retry' && parsedFence.delayMs === 500, 'Parses JSON from markdown code block');

// Outermost JSON in chatty response
const chattyJson = 'Sure! Here is your result: {"recommendation": "scale_up"} Hope that helps!';
const parsedChatty = parseStructuredOutput(chattyJson, 'json');
assert(parsedChatty !== null && parsedChatty.recommendation === 'scale_up', 'Parses outermost JSON in conversational text');

// Non-JSON text when json requested
const nonJson = 'I could not format this as JSON because of an internal error.';
const parsedInvalid = parseStructuredOutput(nonJson, 'json');
assert(parsedInvalid === null, 'Honestly returns null when text is not valid JSON (no fabrication)');

// Plain text format requested
const textRequested = parseStructuredOutput('Just normal text output.', 'text');
assert(textRequested === null, 'Returns null for non-JSON text when format is text');

// -------------------------------------------------------------
// 5. Successful Gemini Execution (Mocked Fetch)
// -------------------------------------------------------------
console.log('\n--- 5. Successful Gemini Execution (Mocked) ---');

const originalGeminiKey = process.env.GEMINI_API_KEY;
process.env.GEMINI_API_KEY = 'mock-gemini-test-key-12345';

const mockGeminiSuccess = async (url, opts) => {
  assert(opts.method === 'POST', 'Gemini uses POST method');
  assert(opts.headers['Content-Type'] === 'application/json', 'Gemini sends JSON content type');
  const body = JSON.parse(opts.body);
  assert(body.contents[0].parts[0].text.includes('Diagnose issue'), 'Gemini payload contains prompt');

  const geminiResponse = {
    candidates: [
      {
        content: {
          parts: [{ text: 'Analysis completed: System CPU spike resolved.' }],
          role: 'model'
        },
        finishReason: 'STOP'
      }
    ],
    usageMetadata: {
      promptTokenCount: 18,
      candidatesTokenCount: 32,
      totalTokenCount: 50
    }
  };

  return {
    ok: true,
    status: 200,
    headers: new Headers({ 'content-type': 'application/json' }),
    body: createMockStream(JSON.stringify(geminiResponse))
  };
};

const geminiResult = await executeAiRequest({
  provider: 'gemini',
  prompt: 'Diagnose issue',
  input: { metric: 'cpu', value: 92 },
  _fetchFn: mockGeminiSuccess
});

assert(geminiResult.success === true, 'Gemini execution succeeds');
assert(geminiResult.text === 'Analysis completed: System CPU spike resolved.', 'Extracts correct Gemini text');
assert(geminiResult.provider === 'gemini', 'Reports gemini provider');
assert(geminiResult.model === 'gemini-3.8-flash', 'Uses default gemini model');
assert(geminiResult.usage.promptTokens === 18, 'Extracts prompt tokens');
assert(geminiResult.usage.completionTokens === 32, 'Extracts completion tokens');
assert(geminiResult.usage.totalTokens === 50, 'Extracts total tokens');
assert(typeof geminiResult.durationMs === 'number' && geminiResult.durationMs >= 0, 'Records execution duration');
assert(!geminiResult.telemetry.endpoint.includes('mock-gemini-test-key-12345'), 'Sanitizes key in telemetry endpoint');

// -------------------------------------------------------------
// 6. Successful OpenAI Execution (Mocked Fetch)
// -------------------------------------------------------------
console.log('\n--- 6. Successful OpenAI-Compatible Execution (Mocked) ---');

const originalOpenAiKey = process.env.OPENAI_API_KEY;
process.env.OPENAI_API_KEY = 'mock-openai-test-key-67890';

const mockOpenAiSuccess = async (url, opts) => {
  assert(opts.method === 'POST', 'OpenAI uses POST method');
  assert(opts.headers.Authorization === 'Bearer mock-openai-test-key-67890', 'OpenAI sends Bearer token');
  const body = JSON.parse(opts.body);
  assert(body.model === 'gpt-4o-mini', 'OpenAI uses correct default model');
  assert(body.messages.some((m) => m.content.includes('Evaluate alert')), 'OpenAI payload contains prompt');

  const openAiResponse = {
    id: 'chatcmpl-test-123',
    object: 'chat.completion',
    model: 'gpt-4o-mini',
    choices: [
      {
        index: 0,
        message: {
          role: 'assistant',
          content: '```json\n{"action": "escalate", "severity": "P1"}\n```'
        },
        finish_reason: 'stop'
      }
    ],
    usage: {
      prompt_tokens: 25,
      completion_tokens: 15,
      total_tokens: 40
    }
  };

  return {
    ok: true,
    status: 200,
    headers: new Headers({ 'content-type': 'application/json' }),
    body: createMockStream(JSON.stringify(openAiResponse))
  };
};

const openAiResult = await executeAiRequest({
  provider: 'openai',
  prompt: 'Evaluate alert',
  outputFormat: 'json',
  _fetchFn: mockOpenAiSuccess
});

assert(openAiResult.success === true, 'OpenAI execution succeeds');
assert(openAiResult.provider === 'openai', 'Reports openai provider');
assert(openAiResult.model === 'gpt-4o-mini', 'Reports correct model');
assert(openAiResult.structured !== null, 'Extracts structured JSON output');
assert(openAiResult.structured.action === 'escalate', 'Structured output has correct action');
assert(openAiResult.structured.severity === 'P1', 'Structured output has correct severity');
assert(openAiResult.usage.totalTokens === 40, 'Extracts total tokens');

// -------------------------------------------------------------
// 7. Missing Credentials Tests
// -------------------------------------------------------------
console.log('\n--- 7. Missing Credentials Tests ---');

delete process.env.GEMINI_API_KEY;
const missingGemini = await executeAiRequest({
  provider: 'gemini',
  prompt: 'Analyze'
});
assert(missingGemini.success === false, 'Fails when GEMINI_API_KEY is missing');
assert(missingGemini.error.includes('GEMINI_API_KEY is not configured'), 'Returns clear missing GEMINI_API_KEY message');

delete process.env.OPENAI_API_KEY;
const missingOpenAi = await executeAiRequest({
  provider: 'openai',
  prompt: 'Analyze'
});
assert(missingOpenAi.success === false, 'Fails when OPENAI_API_KEY is missing');
assert(missingOpenAi.error.includes('OPENAI_API_KEY is not configured'), 'Returns clear missing OPENAI_API_KEY message');

// Restore mock keys for remaining tests
process.env.GEMINI_API_KEY = 'mock-gemini-test-key-12345';
process.env.OPENAI_API_KEY = 'mock-openai-test-key-67890';

// -------------------------------------------------------------
// 8. Invalid Provider & Input Validation Tests
// -------------------------------------------------------------
console.log('\n--- 8. Invalid Provider & Input Validation Tests ---');

const badProvider = await executeAiRequest({
  provider: 'unsupported-provider',
  prompt: 'Hello'
});
assert(badProvider.success === false, 'Fails with unsupported provider');
assert(badProvider.error.includes('Unsupported AI provider'), 'Reports unsupported provider error');

const emptyPrompt = await executeAiRequest({
  provider: 'gemini',
  prompt: '   '
});
assert(emptyPrompt.success === false, 'Fails with empty prompt string');
assert(emptyPrompt.error.includes('non-empty string prompt'), 'Reports prompt validation error');

const invalidOptions = await executeAiRequest(null);
assert(invalidOptions.success === false, 'Fails when options is null');
assert(invalidOptions.error.includes('valid configuration object'), 'Reports invalid options object');

// -------------------------------------------------------------
// 9. Input & Response Size Limit Tests
// -------------------------------------------------------------
console.log('\n--- 9. Input & Response Size Limit Tests ---');

// Input > 32 KB
const oversizedInputString = 'x'.repeat(MAX_INPUT_BYTES + 500);
const oversizedInputResult = await executeAiRequest({
  provider: 'gemini',
  prompt: oversizedInputString
});
assert(oversizedInputResult.success === false, 'Rejects input exceeding 32 KB limit');
assert(oversizedInputResult.error.includes('exceeds maximum allowed size of 32768 bytes (32 KB)'), 'Reports 32 KB limit error');

// Response stream > 512 KB
const mockOversizedResponse = async () => {
  return {
    ok: true,
    status: 200,
    headers: new Headers({ 'content-type': 'application/json' }),
    body: createOversizedStream(MAX_RESPONSE_BYTES + 1024 * 64)
  };
};

const oversizedRespResult = await executeAiRequest({
  provider: 'gemini',
  prompt: 'Generate big output',
  _fetchFn: mockOversizedResponse
});
assert(oversizedRespResult.success === false, 'Cancels and fails when response stream exceeds 512 KB');
assert(oversizedRespResult.error.includes('exceeded maximum limit of 512 KB'), 'Reports 512 KB response limit error');

// -------------------------------------------------------------
// 10. HTTP Error Handling (401, 429, 5xx) Tests
// -------------------------------------------------------------
console.log('\n--- 10. HTTP Error Handling (401, 429, 5xx) Tests ---');

// HTTP 401
const mock401 = async () => ({
  ok: false,
  status: 401,
  headers: new Headers(),
  body: createMockStream('{"error": "Unauthorized key"}')
});
const res401 = await executeAiRequest({
  provider: 'gemini',
  prompt: 'Test 401',
  _fetchFn: mock401
});
assert(res401.success === false, 'Handles HTTP 401 failure');
assert(res401.error.includes('authentication failed (HTTP 401)'), 'Returns clean 401 message');
assert(res401.status === 401, 'Preserves 401 status code');

// HTTP 429
const mock429 = async () => ({
  ok: false,
  status: 429,
  headers: new Headers(),
  body: createMockStream('{"error": "Rate limit exceeded"}')
});
const res429 = await executeAiRequest({
  provider: 'openai',
  prompt: 'Test 429',
  _fetchFn: mock429
});
assert(res429.success === false, 'Handles HTTP 429 rate limit failure');
assert(res429.error.includes('rate limit reached (HTTP 429)'), 'Returns clean 429 cooldown message');
assert(res429.status === 429, 'Preserves 429 status code');

// HTTP 503
const mock503 = async () => ({
  ok: false,
  status: 503,
  headers: new Headers(),
  body: createMockStream('{"error": "Service temporarily unavailable"}')
});
const res503 = await executeAiRequest({
  provider: 'gemini',
  prompt: 'Test 503',
  _fetchFn: mock503
});
assert(res503.success === false, 'Handles HTTP 503 service error');
assert(res503.error.includes('upstream service error (HTTP 503)'), 'Returns clean 503 service error message');
assert(res503.status === 503, 'Preserves 503 status code');

// HTTP 404 Model Not Found
const mock404 = async () => ({
  ok: false,
  status: 404,
  headers: new Headers(),
  body: createMockStream('{"error": {"code": 404, "message": "models/deprecated-model is not found for API version v1beta"}}')
});
const res404 = await executeAiRequest({
  provider: 'gemini',
  model: 'deprecated-model',
  prompt: 'Test 404',
  _fetchFn: mock404
});
assert(res404.success === false, 'Handles HTTP 404 model not found');
assert(res404.error.includes('AI model not found or unsupported by provider (HTTP 404)'), 'Returns actionable 404 error guidance');
assert(res404.error.includes('models/deprecated-model is not found'), 'Extracts sanitized model not found message');
assert(res404.status === 404, 'Preserves 404 status code');

// -------------------------------------------------------------
// 11. Timeout & Abort Handling Tests
// -------------------------------------------------------------
console.log('\n--- 11. Timeout & Abort Handling Tests ---');

const mockTimeout = async (url, opts) => {
  return new Promise((resolve, reject) => {
    // Listen for abort signal
    if (opts.signal) {
      opts.signal.addEventListener('abort', () => {
        const abortErr = new Error('The operation was aborted');
        abortErr.name = 'AbortError';
        reject(abortErr);
      });
    }
  });
};

const timeoutResult = await executeAiRequest({
  provider: 'gemini',
  prompt: 'Simulate timeout',
  timeoutMs: 1000,
  _fetchFn: mockTimeout
});

assert(timeoutResult.success === false, 'Times out cleanly');
assert(timeoutResult.isTimeout === true, 'Flags isTimeout true');
assert(timeoutResult.error.includes('timed out after 1000ms'), 'Returns accurate timeout error message');

// -------------------------------------------------------------
// 12. Safety Filter & Empty Candidate Handling Tests
// -------------------------------------------------------------
console.log('\n--- 12. Safety Filter & Malformed Response Tests ---');

// Gemini Safety Block
const mockSafetyBlock = async () => ({
  ok: true,
  status: 200,
  headers: new Headers(),
  body: createMockStream(JSON.stringify({
    candidates: [{ finishReason: 'SAFETY' }]
  }))
});
const safetyResult = await executeAiRequest({
  provider: 'gemini',
  prompt: 'Trigger safety',
  _fetchFn: mockSafetyBlock
});
assert(safetyResult.success === false, 'Handles Gemini safety filter block');
assert(safetyResult.error.includes('blocked by provider safety filter'), 'Reports safety filter error');

// Empty candidates
const mockEmptyCandidates = async () => ({
  ok: true,
  status: 200,
  headers: new Headers(),
  body: createMockStream(JSON.stringify({ candidates: [] }))
});
const emptyResult = await executeAiRequest({
  provider: 'gemini',
  prompt: 'Empty candidates',
  _fetchFn: mockEmptyCandidates
});
assert(emptyResult.success === false, 'Handles empty candidate list');
assert(emptyResult.error.includes('empty candidates'), 'Reports empty candidates error');

// Clean up environment variables
if (originalGeminiKey !== undefined) {
  process.env.GEMINI_API_KEY = originalGeminiKey;
} else {
  delete process.env.GEMINI_API_KEY;
}
if (originalOpenAiKey !== undefined) {
  process.env.OPENAI_API_KEY = originalOpenAiKey;
} else {
  delete process.env.OPENAI_API_KEY;
}

// -------------------------------------------------------------
// Test Summary
// -------------------------------------------------------------
console.log('\n=============================================================');
console.log(`Results: ${passed} passed, ${failed} failed (${passed + failed} total)`);
console.log('=============================================================');

if (failed > 0) {
  process.exit(1);
}
