import { validateUrlForSsrf } from './ssrfValidator.js';

/**
 * FlowForge AI — Secure Backend AI Executor Service
 *
 * Executes real LLM inference requests against Google Gemini and OpenAI-compatible endpoints
 * using Node.js native fetch, AbortController, and streaming response bounds.
 *
 * Security Guarantees:
 * 1. Credentials loaded strictly from server process.env (never from node data or client payloads).
 * 2. URL and header secret sanitization in all error, logging, and telemetry paths.
 * 3. SSRF prevention and approved HTTPS endpoint allowlisting for custom endpoints.
 * 4. Input payload size capped at 32 KB.
 * 5. Streamed response body capped at 512 KB.
 * 6. Configurable timeout: default 15s, min 1s, max 60s.
 * 7. Honest failure reporting (no synthetic responses when calls fail).
 */

// Constraints & Limits
export const MAX_INPUT_BYTES = 32 * 1024; // 32 KB
export const MAX_RESPONSE_BYTES = 512 * 1024; // 512 KB
export const DEFAULT_TIMEOUT_MS = 15000; // 15 seconds
export const MIN_TIMEOUT_MS = 1000; // 1 second
export const MAX_TIMEOUT_MS = 60000; // 60 seconds

export const DEFAULT_GEMINI_MODEL = 'gemini-1.5-flash';
export const DEFAULT_OPENAI_MODEL = 'gpt-4o-mini';
export const DEFAULT_TEMPERATURE = 0.2;
export const DEFAULT_MAX_TOKENS = 1024;

export const ALLOWED_PROVIDERS = new Set(['gemini', 'openai', 'openai-compatible']);
export const ALLOWED_OUTPUT_FORMATS = new Set(['text', 'json']);

// Allowlist of approved HTTPS hosts for AI inference endpoints
export const APPROVED_HTTPS_HOSTS = new Set([
  'generativelanguage.googleapis.com',
  'api.openai.com',
  'api.groq.com',
  'api.deepseek.com',
  'api.anthropic.com',
  'api.together.xyz',
  'api.fireworks.ai',
  'api.mistral.ai',
  'api.perplexity.ai'
]);

const SENSITIVE_HEADER_KEYS = new Set([
  'authorization',
  'proxy-authorization',
  'x-api-key',
  'api-key',
  'apikey',
  'cookie',
  'set-cookie',
  'x-goog-api-key',
  'x-auth-token',
  'x-access-token'
]);

/**
 * Sanitizes URLs to remove sensitive query parameters (e.g., Gemini ?key=...)
 * @param {string} rawUrl
 * @returns {string} Sanitized URL
 */
export const sanitizeUrl = (rawUrl) => {
  if (!rawUrl || typeof rawUrl !== 'string') return '';
  try {
    const parsed = new URL(rawUrl);
    if (parsed.searchParams.has('key')) {
      parsed.searchParams.set('key', '[REDACTED]');
    }
    return parsed.toString();
  } catch {
    return rawUrl.replace(/([?&]key=)[^&]+/gi, '$1[REDACTED]');
  }
};

/**
 * Sanitizes headers to prevent secret leaks in telemetry or logs
 * @param {Object|Headers} headers
 * @returns {Object} Sanitized headers object
 */
export const sanitizeHeaders = (headers) => {
  if (!headers) return {};
  const sanitized = {};

  const entries =
    typeof headers.entries === 'function'
      ? Array.from(headers.entries())
      : Object.entries(headers);

  for (const [key, value] of entries) {
    const lowerKey = key.toLowerCase();
    if (SENSITIVE_HEADER_KEYS.has(lowerKey)) {
      sanitized[key] = '[REDACTED]';
    } else {
      sanitized[key] = typeof value === 'string' ? value : String(value);
    }
  }

  return sanitized;
};

/**
 * Scrubs potential secrets (API keys, bearer tokens) from string messages
 * @param {string} text
 * @returns {string}
 */
export const sanitizeSecretsInString = (text) => {
  if (!text || typeof text !== 'string') return '';
  return text
    .replace(/AIza[0-9A-Za-z_-]{30,}/g, '[REDACTED_GEMINI_KEY]')
    .replace(/sk-[0-9A-Za-z_-]{20,}/g, '[REDACTED_OPENAI_KEY]')
    .replace(/Bearer\s+[0-9A-Za-z_.\-]+/gi, 'Bearer [REDACTED]')
    .replace(/([?&]key=)[^&\s]+/gi, '$1[REDACTED]');
};

/**
 * Validates a provider endpoint URL against SSRF rules and the approved host list
 * @param {string} rawUrl
 * @returns {Promise<{ isValid: boolean, error?: string, parsedUrl?: URL }>}
 */
export const validateProviderEndpoint = async (rawUrl) => {
  if (!rawUrl || typeof rawUrl !== 'string') {
    return { isValid: false, error: 'Endpoint URL is required.' };
  }

  let parsedUrl;
  try {
    parsedUrl = new URL(rawUrl.trim());
  } catch {
    return { isValid: false, error: 'Malformed endpoint URL format.' };
  }

  // Enforce HTTPS
  if (parsedUrl.protocol !== 'https:') {
    return {
      isValid: false,
      error: `Unsupported endpoint protocol "${parsedUrl.protocol}". Only HTTPS endpoints are permitted.`
    };
  }

  const hostname = parsedUrl.hostname.toLowerCase();

  // Check against approved hosts
  const allowedHosts = new Set(APPROVED_HTTPS_HOSTS);

  // If server configured custom OPENAI_BASE_URL or AI_ALLOWED_HOSTS, dynamically allow its hostname
  if (process.env.OPENAI_BASE_URL) {
    try {
      const customUrl = new URL(process.env.OPENAI_BASE_URL);
      allowedHosts.add(customUrl.hostname.toLowerCase());
    } catch {}
  }
  if (process.env.AI_ALLOWED_HOSTS) {
    const extraHosts = process.env.AI_ALLOWED_HOSTS.split(',').map((h) => h.trim().toLowerCase());
    for (const h of extraHosts) {
      if (h) allowedHosts.add(h);
    }
  }

  if (!allowedHosts.has(hostname)) {
    return {
      isValid: false,
      error: `Endpoint host "${hostname}" is not in the approved AI provider allowlist.`
    };
  }

  // Validate against SSRF (private IPs, loopback, cloud metadata)
  const ssrfCheck = await validateUrlForSsrf(rawUrl);
  if (!ssrfCheck.isAllowed) {
    return {
      isValid: false,
      error: ssrfCheck.reason || 'Endpoint blocked by SSRF security policy.'
    };
  }

  return { isValid: true, parsedUrl };
};

/**
 * Safely reads a response body stream up to maxBytes limit, cancelling reader if exceeded
 * @param {Response} response
 * @param {number} maxBytes
 * @returns {Promise<{ text: string, sizeBytes: number, isOversized: boolean }>}
 */
export const readStreamWithLimit = async (response, maxBytes = MAX_RESPONSE_BYTES) => {
  // Check Content-Length header if present
  const clHeader = response.headers?.get?.('content-length');
  if (clHeader) {
    const declaredLength = parseInt(clHeader, 10);
    if (!isNaN(declaredLength) && declaredLength > maxBytes) {
      return { text: '', sizeBytes: declaredLength, isOversized: true };
    }
  }

  if (!response.body) {
    const text = typeof response.text === 'function' ? await response.text() : '';
    const sizeBytes = Buffer.byteLength(text, 'utf8');
    return {
      text: sizeBytes > maxBytes ? '' : text,
      sizeBytes,
      isOversized: sizeBytes > maxBytes
    };
  }

  const reader = response.body.getReader();
  const chunks = [];
  let totalBytes = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      totalBytes += value.length;
      if (totalBytes > maxBytes) {
        try {
          await reader.cancel();
        } catch {}
        return { text: '', sizeBytes: totalBytes, isOversized: true };
      }
      chunks.push(value);
    }
  } catch (err) {
    if (totalBytes > maxBytes) {
      return { text: '', sizeBytes: totalBytes, isOversized: true };
    }
    throw err;
  }

  const totalBuffer = Buffer.concat(chunks);
  const text = totalBuffer.toString('utf8');
  return { text, sizeBytes: totalBytes, isOversized: false };
};

/**
 * Builds user prompt string merged with upstream workflow context
 * @param {string} prompt
 * @param {any} input
 * @returns {string}
 */
export const buildPromptWithContext = (prompt, input) => {
  if (input === undefined || input === null) {
    return prompt;
  }

  let formattedInput;
  if (typeof input === 'string') {
    formattedInput = input;
  } else {
    try {
      formattedInput = JSON.stringify(input, null, 2);
    } catch {
      formattedInput = String(input);
    }
  }

  return `${prompt}\n\n--- Workflow Input Context ---\n${formattedInput}\n------------------------------`;
};

/**
 * Attempts to parse structured output from model text
 * @param {string} text
 * @param {'text'|'json'} outputFormat
 * @returns {any|null} Parsed JSON object/array or null
 */
export const parseStructuredOutput = (text, outputFormat) => {
  if (!text || typeof text !== 'string') return null;
  const trimmed = text.trim();

  // 1. Direct JSON parse
  try {
    return JSON.parse(trimmed);
  } catch {}

  // 2. Markdown fenced code block ```json ... ``` or ``` ... ```
  const codeBlockMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (codeBlockMatch) {
    try {
      return JSON.parse(codeBlockMatch[1].trim());
    } catch {}
  }

  // 3. Outermost JSON object / array if json output requested
  if (outputFormat === 'json') {
    const firstBrace = trimmed.indexOf('{');
    const lastBrace = trimmed.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      try {
        return JSON.parse(trimmed.slice(firstBrace, lastBrace + 1));
      } catch {}
    }

    const firstBracket = trimmed.indexOf('[');
    const lastBracket = trimmed.lastIndexOf(']');
    if (firstBracket !== -1 && lastBracket > firstBracket) {
      try {
        return JSON.parse(trimmed.slice(firstBracket, lastBracket + 1));
      } catch {}
    }
  }

  return null;
};

/**
 * Sanitizes and extracts provider error message without leaking secrets
 * @param {number} status
 * @param {string} responseText
 * @param {string} providerName
 * @returns {string}
 */
export const formatProviderError = (status, responseText, providerName) => {
  if (status === 401) {
    return `AI provider authentication failed (HTTP 401). Verify that your server API key is configured correctly.`;
  }
  if (status === 429) {
    return `AI provider rate limit reached (HTTP 429). Please retry after cooldown.`;
  }
  if (status >= 500) {
    return `AI provider upstream service error (HTTP ${status}). The service may be temporarily unavailable.`;
  }

  let extractedMsg = '';
  if (responseText) {
    try {
      const parsed = JSON.parse(responseText);
      extractedMsg =
        parsed.error?.message ||
        parsed.message ||
        parsed.error ||
        '';
    } catch {
      extractedMsg = responseText.slice(0, 200);
    }
  }

  const safeMsg = sanitizeSecretsInString(extractedMsg);
  return safeMsg
    ? `AI provider rejected request (HTTP ${status}): ${safeMsg}`
    : `AI provider request failed with HTTP ${status}.`;
};

/**
 * Executes Google Gemini REST API request
 */
const executeGeminiRequest = async (config, options) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || !apiKey.trim()) {
    return {
      success: false,
      error: 'AI execution failed: GEMINI_API_KEY is not configured in server environment variables.',
      durationMs: 0
    };
  }

  const model = config.model || DEFAULT_GEMINI_MODEL;
  const endpointUrl = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const sanitizedEndpoint = sanitizeUrl(endpointUrl);

  const endpointValidation = await validateProviderEndpoint(endpointUrl);
  if (!endpointValidation.isValid) {
    return {
      success: false,
      error: `Gemini endpoint blocked: ${endpointValidation.error}`,
      durationMs: 0
    };
  }

  const payload = {
    contents: [
      {
        role: 'user',
        parts: [{ text: config.fullPrompt }]
      }
    ],
    generationConfig: {
      temperature: config.temperature,
      maxOutputTokens: config.maxTokens
    }
  };

  if (config.systemPrompt && typeof config.systemPrompt === 'string' && config.systemPrompt.trim()) {
    payload.systemInstruction = {
      parts: [{ text: config.systemPrompt.trim() }]
    };
  }

  if (config.outputFormat === 'json') {
    payload.generationConfig.responseMimeType = 'application/json';
  }

  const controller = new AbortController();
  const timer = setTimeout(() => {
    controller.abort(new Error('AI_REQUEST_TIMEOUT'));
  }, config.timeoutMs);

  const startTime = Date.now();
  const fetchFn = options._fetchFn || globalThis.fetch;

  try {
    const response = await fetchFn(endpointUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload),
      signal: controller.signal
    });

    clearTimeout(timer);
    const durationMs = Date.now() - startTime;

    const { text, sizeBytes, isOversized } = await readStreamWithLimit(
      response,
      MAX_RESPONSE_BYTES
    );

    if (isOversized) {
      return {
        success: false,
        error: `AI response body exceeded maximum limit of 512 KB.`,
        durationMs
      };
    }

    if (!response.ok) {
      return {
        success: false,
        error: formatProviderError(response.status, text, 'Gemini'),
        durationMs,
        status: response.status
      };
    }

    let parsedResponse;
    try {
      parsedResponse = JSON.parse(text);
    } catch {
      return {
        success: false,
        error: 'AI provider returned an unparseable response envelope.',
        durationMs
      };
    }

    // Extract text from Gemini structure
    const candidate = parsedResponse.candidates?.[0];
    if (!candidate) {
      const blockReason = parsedResponse.promptFeedback?.blockReason;
      return {
        success: false,
        error: blockReason
          ? `AI request was blocked by provider safety policy: ${blockReason}`
          : 'AI provider returned empty candidates in response.',
        durationMs
      };
    }

    if (candidate.finishReason === 'SAFETY') {
      return {
        success: false,
        error: 'AI response generation was blocked by provider safety filter.',
        durationMs
      };
    }

    const generatedText = candidate.content?.parts?.[0]?.text || '';
    const structuredOutput = parseStructuredOutput(generatedText, config.outputFormat);

    const usage = {
      promptTokens: parsedResponse.usageMetadata?.promptTokenCount || 0,
      completionTokens: parsedResponse.usageMetadata?.candidatesTokenCount || 0,
      totalTokens: parsedResponse.usageMetadata?.totalTokenCount || 0
    };

    return {
      success: true,
      text: generatedText,
      structured: structuredOutput,
      model,
      provider: 'gemini',
      usage,
      durationMs,
      telemetry: {
        endpoint: sanitizedEndpoint,
        status: response.status,
        model,
        durationMs
      }
    };
  } catch (err) {
    clearTimeout(timer);
    const durationMs = Date.now() - startTime;

    if (controller.signal.aborted || err.name === 'AbortError' || err.message === 'AI_REQUEST_TIMEOUT') {
      return {
        success: false,
        error: `AI request timed out after ${config.timeoutMs}ms.`,
        durationMs,
        isTimeout: true
      };
    }

    return {
      success: false,
      error: `AI provider connection error: ${sanitizeSecretsInString(err.message || 'Unknown network error')}`,
      durationMs
    };
  }
};

/**
 * Executes OpenAI-compatible chat completions REST request
 */
const executeOpenAiRequest = async (config, options) => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || !apiKey.trim()) {
    return {
      success: false,
      error: 'AI execution failed: OPENAI_API_KEY is not configured in server environment variables.',
      durationMs: 0
    };
  }

  const model = config.model || DEFAULT_OPENAI_MODEL;
  const baseUrl = (process.env.OPENAI_BASE_URL || options.baseUrl || 'https://api.openai.com/v1').replace(/\/+$/, '');
  const endpointUrl = `${baseUrl}/chat/completions`;
  const sanitizedEndpoint = sanitizeUrl(endpointUrl);

  const endpointValidation = await validateProviderEndpoint(endpointUrl);
  if (!endpointValidation.isValid) {
    return {
      success: false,
      error: `OpenAI endpoint blocked: ${endpointValidation.error}`,
      durationMs: 0
    };
  }

  const messages = [];
  if (config.systemPrompt && typeof config.systemPrompt === 'string' && config.systemPrompt.trim()) {
    messages.push({ role: 'system', content: config.systemPrompt.trim() });
  }
  messages.push({ role: 'user', content: config.fullPrompt });

  const payload = {
    model,
    messages,
    temperature: config.temperature,
    max_tokens: config.maxTokens
  };

  if (config.outputFormat === 'json') {
    payload.response_format = { type: 'json_object' };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => {
    controller.abort(new Error('AI_REQUEST_TIMEOUT'));
  }, config.timeoutMs);

  const startTime = Date.now();
  const fetchFn = options._fetchFn || globalThis.fetch;

  try {
    const response = await fetchFn(endpointUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify(payload),
      signal: controller.signal
    });

    clearTimeout(timer);
    const durationMs = Date.now() - startTime;

    const { text, sizeBytes, isOversized } = await readStreamWithLimit(
      response,
      MAX_RESPONSE_BYTES
    );

    if (isOversized) {
      return {
        success: false,
        error: `AI response body exceeded maximum limit of 512 KB.`,
        durationMs
      };
    }

    if (!response.ok) {
      return {
        success: false,
        error: formatProviderError(response.status, text, 'OpenAI'),
        durationMs,
        status: response.status
      };
    }

    let parsedResponse;
    try {
      parsedResponse = JSON.parse(text);
    } catch {
      return {
        success: false,
        error: 'AI provider returned an unparseable response envelope.',
        durationMs
      };
    }

    const choice = parsedResponse.choices?.[0];
    if (!choice || !choice.message) {
      return {
        success: false,
        error: 'AI provider returned empty choices in response.',
        durationMs
      };
    }

    const generatedText = choice.message.content || '';
    const structuredOutput = parseStructuredOutput(generatedText, config.outputFormat);

    const usage = {
      promptTokens: parsedResponse.usage?.prompt_tokens || 0,
      completionTokens: parsedResponse.usage?.completion_tokens || 0,
      totalTokens: parsedResponse.usage?.total_tokens || 0
    };

    return {
      success: true,
      text: generatedText,
      structured: structuredOutput,
      model,
      provider: config.provider,
      usage,
      durationMs,
      telemetry: {
        endpoint: sanitizedEndpoint,
        status: response.status,
        model,
        durationMs
      }
    };
  } catch (err) {
    clearTimeout(timer);
    const durationMs = Date.now() - startTime;

    if (controller.signal.aborted || err.name === 'AbortError' || err.message === 'AI_REQUEST_TIMEOUT') {
      return {
        success: false,
        error: `AI request timed out after ${config.timeoutMs}ms.`,
        durationMs,
        isTimeout: true
      };
    }

    return {
      success: false,
      error: `AI provider connection error: ${sanitizeSecretsInString(err.message || 'Unknown network error')}`,
      durationMs
    };
  }
};

/**
 * Main Standalone AI Request Executor Service
 *
 * @param {Object} options
 * @param {string} [options.provider] - 'gemini' | 'openai' | 'openai-compatible' (default: process.env.AI_PROVIDER || 'gemini')
 * @param {string} [options.model] - Model name
 * @param {string} options.prompt - Task instruction / prompt
 * @param {string} [options.systemPrompt] - System directive
 * @param {any} [options.input] - Upstream workflow input context
 * @param {number} [options.temperature] - 0.0 to 2.0 (default 0.2)
 * @param {number} [options.maxTokens] - Max tokens to generate (default 1024, max 4096)
 * @param {'text'|'json'} [options.outputFormat] - Expected output format (default 'text')
 * @param {number} [options.timeoutMs] - Request timeout in ms (default 15000, min 1000, max 60000)
 * @param {string} [options.baseUrl] - Custom base URL override for openai-compatible endpoints
 * @param {Function} [options._fetchFn] - Internal dependency injection for tests
 * @returns {Promise<{ success: boolean, text?: string, structured?: any, model?: string, provider?: string, usage?: object, durationMs: number, error?: string }>}
 */
export const executeAiRequest = async (options = {}) => {
  if (!options || typeof options !== 'object') {
    return {
      success: false,
      error: 'Options must be a valid configuration object.',
      durationMs: 0
    };
  }

  // 1. Validate Provider
  const provider = (options.provider || process.env.AI_PROVIDER || 'gemini').trim().toLowerCase();
  if (!ALLOWED_PROVIDERS.has(provider)) {
    return {
      success: false,
      error: `Unsupported AI provider "${options.provider}". Allowed providers: ${Array.from(ALLOWED_PROVIDERS).join(', ')}.`,
      durationMs: 0
    };
  }

  // 2. Validate Prompt
  if (typeof options.prompt !== 'string' || !options.prompt.trim()) {
    return {
      success: false,
      error: 'AI Node requires a non-empty string prompt.',
      durationMs: 0
    };
  }

  // 3. Build prompt with context
  const fullPrompt = buildPromptWithContext(options.prompt.trim(), options.input);

  // 4. Enforce Input Size Limit (32 KB)
  const totalInputBytes = Buffer.byteLength(
    (options.systemPrompt || '') + fullPrompt,
    'utf8'
  );
  if (totalInputBytes > MAX_INPUT_BYTES) {
    return {
      success: false,
      error: `Input payload (${totalInputBytes} bytes) exceeds maximum allowed size of ${MAX_INPUT_BYTES} bytes (32 KB).`,
      durationMs: 0
    };
  }

  // 5. Validate & Clamp Parameters
  let temperature = typeof options.temperature === 'number' ? options.temperature : DEFAULT_TEMPERATURE;
  if (isNaN(temperature) || temperature < 0 || temperature > 2) {
    temperature = DEFAULT_TEMPERATURE;
  }

  let maxTokens = typeof options.maxTokens === 'number' ? Math.floor(options.maxTokens) : DEFAULT_MAX_TOKENS;
  if (isNaN(maxTokens) || maxTokens < 1 || maxTokens > 4096) {
    maxTokens = DEFAULT_MAX_TOKENS;
  }

  const outputFormat = options.outputFormat === 'json' ? 'json' : 'text';

  let timeoutMs = typeof options.timeoutMs === 'number' ? Math.floor(options.timeoutMs) : DEFAULT_TIMEOUT_MS;
  if (isNaN(timeoutMs) || timeoutMs < MIN_TIMEOUT_MS) {
    timeoutMs = MIN_TIMEOUT_MS;
  } else if (timeoutMs > MAX_TIMEOUT_MS) {
    timeoutMs = MAX_TIMEOUT_MS;
  }

  const config = {
    provider,
    model: options.model?.trim?.() || (provider === 'gemini' ? DEFAULT_GEMINI_MODEL : DEFAULT_OPENAI_MODEL),
    fullPrompt,
    systemPrompt: options.systemPrompt,
    temperature,
    maxTokens,
    outputFormat,
    timeoutMs
  };

  // 6. Route to Provider
  if (provider === 'gemini') {
    return await executeGeminiRequest(config, options);
  }

  // OpenAI or OpenAI-Compatible
  return await executeOpenAiRequest(config, options);
};
