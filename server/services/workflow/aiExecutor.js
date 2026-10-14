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

export const DEFAULT_GEMINI_MODEL = process.env.GEMINI_DEFAULT_MODEL || 'gemini-3.8-flash';
export const DEFAULT_GROQ_MODEL = process.env.GROQ_DEFAULT_MODEL || 'openai/gpt-oss-20b';
export const DEFAULT_OPENAI_MODEL = process.env.OPENAI_DEFAULT_MODEL || 'gpt-4o-mini';
export const DEFAULT_MISTRAL_MODEL = process.env.MISTRAL_DEFAULT_MODEL || 'mistral-small-latest';
export const DEFAULT_TEMPERATURE = 0.2;
export const DEFAULT_MAX_TOKENS = 1024;

export const RETRYABLE_HTTP_STATUSES = new Set([429, 500, 502, 503, 504]);
export const MAX_AI_RETRIES = 2; // Up to 2 retries (total 3 attempts)
export const INITIAL_RETRY_DELAY_MS = 1000; // 1 second base backoff
export const BACKOFF_MULTIPLIER = 2; // Exponential factor
export const MAX_RETRY_DELAY_MS = 5000; // Cap backoff delay at 5 seconds
export const MAX_JITTER_RATIO = 0.3; // 0% to 30% randomized jitter

export const ALLOWED_PROVIDERS = new Set(['gemini', 'openai', 'openai-compatible', 'groq', 'mistral']);
export const ALLOWED_OUTPUT_FORMATS = new Set(['text', 'json']);

// Provider Metadata Configuration
export const PROVIDER_CONFIGS = {
  gemini: {
    id: 'gemini',
    name: 'Google Gemini',
    envKey: 'GEMINI_API_KEY',
    defaultModel: DEFAULT_GEMINI_MODEL,
    protocol: 'gemini'
  },
  groq: {
    id: 'groq',
    name: 'Groq',
    envKey: 'GROQ_API_KEY',
    defaultModel: DEFAULT_GROQ_MODEL,
    protocol: 'openai-compatible',
    baseUrl: 'https://api.groq.com/openai/v1'
  },
  openai: {
    id: 'openai',
    name: 'OpenAI',
    envKey: 'OPENAI_API_KEY',
    defaultModel: DEFAULT_OPENAI_MODEL,
    protocol: 'openai-compatible',
    baseUrl: 'https://api.openai.com/v1'
  },
  mistral: {
    id: 'mistral',
    name: 'Mistral AI',
    envKey: 'MISTRAL_API_KEY',
    defaultModel: DEFAULT_MISTRAL_MODEL,
    protocol: 'openai-compatible',
    baseUrl: 'https://api.mistral.ai/v1'
  },
  'openai-compatible': {
    id: 'openai-compatible',
    name: 'OpenAI-Compatible Gateway',
    envKey: 'OPENAI_API_KEY',
    defaultModel: DEFAULT_OPENAI_MODEL,
    protocol: 'openai-compatible',
    baseUrl: 'https://api.openai.com/v1'
  }
};

// Default automatic failover priority cascade
export const DEFAULT_FAILOVER_CHAIN = [
  { provider: 'gemini', model: DEFAULT_GEMINI_MODEL },
  { provider: 'groq', model: DEFAULT_GROQ_MODEL },
  { provider: 'openai', model: DEFAULT_OPENAI_MODEL },
  { provider: 'mistral', model: DEFAULT_MISTRAL_MODEL }
];

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
  let sanitized = text
    .replace(/AIza[0-9A-Za-z_-]{30,}/g, '[REDACTED_GEMINI_KEY]')
    .replace(/gsk_[0-9A-Za-z_-]{20,}/g, '[REDACTED_GROQ_KEY]')
    .replace(/sk-[0-9A-Za-z_-]{20,}/g, '[REDACTED_OPENAI_KEY]')
    .replace(/Bearer\s+[0-9A-Za-z_.\-]+/gi, 'Bearer [REDACTED]')
    .replace(/([?&]key=)[^&\s]+/gi, '$1[REDACTED]');

  // Scrub any active environment keys if present as literal substrings
  const activeKeys = [
    process.env.GEMINI_API_KEY,
    process.env.GROQ_API_KEY,
    process.env.OPENAI_API_KEY,
    process.env.MISTRAL_API_KEY
  ].filter((k) => typeof k === 'string' && k.trim().length >= 8);

  for (const key of activeKeys) {
    if (sanitized.includes(key.trim())) {
      sanitized = sanitized.replaceAll(key.trim(), '[REDACTED_KEY]');
    }
  }

  return sanitized;
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
 * Parses the Retry-After HTTP header value (seconds or HTTP-date) to milliseconds
 * @param {string|null} retryAfterHeader
 * @returns {number|null} delay in milliseconds or null if not present/invalid
 */
export const parseRetryAfter = (retryAfterHeader) => {
  if (!retryAfterHeader || typeof retryAfterHeader !== 'string') return null;
  const trimmed = retryAfterHeader.trim();
  const seconds = parseInt(trimmed, 10);
  if (!isNaN(seconds) && seconds >= 0) {
    return seconds * 1000;
  }
  const dateMs = Date.parse(trimmed);
  if (!isNaN(dateMs)) {
    const diff = dateMs - Date.now();
    return diff > 0 ? diff : 0;
  }
  return null;
};

/**
 * Calculates exponential backoff with randomized jitter and Retry-After respect
 * @param {number} attempt - 0-indexed retry attempt (0 = first retry)
 * @param {number|null} [retryAfterMs] - optional Retry-After parsed value
 * @returns {number} delay in milliseconds
 */
export const calculateBackoffWithJitter = (attempt, retryAfterMs = null) => {
  if (typeof retryAfterMs === 'number' && retryAfterMs > 0) {
    return Math.min(retryAfterMs, MAX_RETRY_DELAY_MS);
  }
  const base = INITIAL_RETRY_DELAY_MS * Math.pow(BACKOFF_MULTIPLIER, attempt);
  const capped = Math.min(base, MAX_RETRY_DELAY_MS);
  const jitter = Math.floor(Math.random() * (capped * MAX_JITTER_RATIO));
  return capped + jitter;
};

/**
 * Checks whether an HTTP status or network error is retryable
 * @param {number|null} status
 * @param {Error|null} [err]
 * @returns {boolean}
 */
export const isRetryableError = (status, err = null) => {
  if (typeof status === 'number' && RETRYABLE_HTTP_STATUSES.has(status)) {
    return true;
  }
  if (err && (err.name === 'TypeError' || err.code === 'ECONNRESET' || err.code === 'ETIMEDOUT')) {
    return true;
  }
  return false;
};

/**
 * Sanitizes and extracts provider error message without leaking secrets
 * @param {number} status
 * @param {string} responseText
 * @param {string} providerName
 * @returns {string}
 */
export const formatProviderError = (status, responseText, providerName) => {
  if (status === 401 || status === 403) {
    return `AI provider authentication failed (HTTP ${status}). Verify that your server API key is configured correctly.`;
  }
  if (status === 429) {
    let extractedMsg = '';
    if (responseText) {
      try {
        const parsed = JSON.parse(responseText);
        extractedMsg =
          parsed.error?.message ||
          parsed.message ||
          (typeof parsed.error === 'string' ? parsed.error : '');
      } catch {
        extractedMsg = responseText.slice(0, 200);
      }
    }
    const safeMsg = sanitizeSecretsInString(extractedMsg);
    return safeMsg
      ? `AI provider rate limit reached (HTTP 429): ${safeMsg}. Please retry after cooldown.`
      : `AI provider rate limit reached (HTTP 429). Please retry after cooldown.`;
  }
  if (status === 404) {
    let extractedMsg = '';
    if (responseText) {
      try {
        const parsed = JSON.parse(responseText);
        extractedMsg =
          parsed.error?.message ||
          parsed.message ||
          (typeof parsed.error === 'string' ? parsed.error : '');
      } catch {
        extractedMsg = responseText.slice(0, 200);
      }
    }
    const safeMsg = sanitizeSecretsInString(extractedMsg);
    return `AI model not found or unsupported by provider (HTTP 404). ${safeMsg || 'Verify that the configured model name is valid and supported by your API key tier.'}`;
  }
  if (status >= 500) {
    let extractedMsg = '';
    let extractedStatus = '';
    if (responseText) {
      try {
        const parsed = JSON.parse(responseText);
        extractedMsg =
          parsed.error?.message ||
          parsed.message ||
          (typeof parsed.error === 'string' ? parsed.error : '');
        if (parsed.error?.status) {
          extractedStatus = ` - ${parsed.error.status}`;
        }
      } catch {
        extractedMsg = responseText.slice(0, 200);
      }
    }
    const safeMsg = sanitizeSecretsInString(extractedMsg);
    return safeMsg
      ? `AI provider upstream service error (HTTP ${status}${extractedStatus}): ${safeMsg}`
      : `AI provider upstream service error (HTTP ${status}). The service may be temporarily unavailable.`;
  }

  let extractedMsg = '';
  if (responseText) {
    try {
      const parsed = JSON.parse(responseText);
      extractedMsg =
        parsed.error?.message ||
        parsed.message ||
        (typeof parsed.error === 'string' ? parsed.error : '');
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

  const maxRetries = typeof options.maxRetries === 'number' ? options.maxRetries : MAX_AI_RETRIES;
  const sleepFn = options._sleepFn || ((ms) => new Promise((resolve) => setTimeout(resolve, ms)));
  const fetchFn = options._fetchFn || globalThis.fetch;

  const overallStartTime = Date.now();
  let lastErrorResult = null;
  let attemptCount = 0;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    attemptCount++;
    const elapsedTimeMs = Date.now() - overallStartTime;
    const remainingBudgetMs = config.timeoutMs - elapsedTimeMs;

    if (remainingBudgetMs <= 0) {
      return {
        success: false,
        error: `AI request timed out after ${config.timeoutMs}ms.`,
        durationMs: Date.now() - overallStartTime,
        isTimeout: true,
        attempts: attemptCount
      };
    }

    const controller = new AbortController();
    const attemptTimeoutMs = remainingBudgetMs;
    const timer = setTimeout(() => {
      controller.abort(new Error('AI_REQUEST_TIMEOUT'));
    }, attemptTimeoutMs);

    const attemptStartTime = Date.now();

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

      const { text, sizeBytes, isOversized } = await readStreamWithLimit(
        response,
        MAX_RESPONSE_BYTES
      );

      if (isOversized) {
        return {
          success: false,
          error: `AI response body exceeded maximum limit of 512 KB.`,
          durationMs: Date.now() - overallStartTime,
          attempts: attemptCount
        };
      }

      if (!response.ok) {
        const errorMsg = formatProviderError(response.status, text, 'Gemini');
        lastErrorResult = {
          success: false,
          error: errorMsg,
          durationMs: Date.now() - overallStartTime,
          status: response.status,
          attempts: attemptCount,
          telemetry: {
            endpoint: sanitizedEndpoint,
            status: response.status,
            model,
            durationMs: Date.now() - overallStartTime,
            attempts: attemptCount
          }
        };

        // Retry only if transient/retryable and retries remain
        if (isRetryableError(response.status) && attempt < maxRetries) {
          const retryAfterHeader = response.headers?.get ? response.headers.get('retry-after') : null;
          const retryAfterMs = parseRetryAfter(retryAfterHeader);
          const delayMs = calculateBackoffWithJitter(attempt, retryAfterMs);

          if (Date.now() - overallStartTime + delayMs >= config.timeoutMs) {
            return {
              ...lastErrorResult,
              durationMs: Date.now() - overallStartTime
            };
          }

          await sleepFn(delayMs);
          continue;
        }

        return lastErrorResult;
      }

      let parsedResponse;
      try {
        parsedResponse = JSON.parse(text);
      } catch {
        return {
          success: false,
          error: 'AI provider returned an unparseable response envelope.',
          durationMs: Date.now() - overallStartTime,
          attempts: attemptCount
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
          durationMs: Date.now() - overallStartTime,
          attempts: attemptCount
        };
      }

      if (candidate.finishReason === 'SAFETY') {
        return {
          success: false,
          error: 'AI response generation was blocked by provider safety filter.',
          durationMs: Date.now() - overallStartTime,
          attempts: attemptCount
        };
      }

      const generatedText = candidate.content?.parts?.[0]?.text || '';
      const structuredOutput = parseStructuredOutput(generatedText, config.outputFormat);

      const usage = {
        promptTokens: parsedResponse.usageMetadata?.promptTokenCount || 0,
        completionTokens: parsedResponse.usageMetadata?.candidatesTokenCount || 0,
        totalTokens: parsedResponse.usageMetadata?.totalTokenCount || 0
      };

      const totalDurationMs = Date.now() - overallStartTime;

      return {
        success: true,
        text: generatedText,
        structured: structuredOutput,
        model,
        provider: 'gemini',
        usage,
        durationMs: totalDurationMs,
        attempts: attemptCount,
        telemetry: {
          endpoint: sanitizedEndpoint,
          status: response.status,
          model,
          durationMs: totalDurationMs,
          attempts: attemptCount
        }
      };
    } catch (err) {
      clearTimeout(timer);
      const isAbort = controller.signal.aborted || err.name === 'AbortError' || err.message === 'AI_REQUEST_TIMEOUT';
      const isBudgetExhausted = Date.now() - overallStartTime >= config.timeoutMs;

      if (isAbort && isBudgetExhausted) {
        return {
          success: false,
          error: `AI request timed out after ${config.timeoutMs}ms.`,
          durationMs: Date.now() - overallStartTime,
          isTimeout: true,
          attempts: attemptCount
        };
      }

      if (attempt < maxRetries && isRetryableError(null, err)) {
        const delayMs = calculateBackoffWithJitter(attempt);
        if (Date.now() - overallStartTime + delayMs < config.timeoutMs) {
          await sleepFn(delayMs);
          continue;
        }
      }

      return {
        success: false,
        error: `AI provider connection error: ${sanitizeSecretsInString(err.message || 'Unknown network error')}`,
        durationMs: Date.now() - overallStartTime,
        attempts: attemptCount
      };
    }
  }

  return lastErrorResult || {
    success: false,
    error: 'AI request failed after exhausting all retry attempts.',
    durationMs: Date.now() - overallStartTime,
    attempts: attemptCount
  };
};

/**
 * Executes OpenAI-compatible chat completions REST request
 */
const executeOpenAiRequest = async (config, options) => {
  let apiKey;
  let baseUrl;
  let providerLabel;
  let defaultModel;

  if (config.provider === 'groq') {
    apiKey = process.env.GROQ_API_KEY;
    baseUrl = (process.env.GROQ_BASE_URL || options.baseUrl || 'https://api.groq.com/openai/v1').replace(/\/+$/, '');
    providerLabel = 'Groq';
    defaultModel = DEFAULT_GROQ_MODEL;
  } else if (config.provider === 'mistral') {
    apiKey = process.env.MISTRAL_API_KEY;
    baseUrl = (process.env.MISTRAL_BASE_URL || options.baseUrl || 'https://api.mistral.ai/v1').replace(/\/+$/, '');
    providerLabel = 'Mistral AI';
    defaultModel = DEFAULT_MISTRAL_MODEL;
  } else if (config.provider === 'openai-compatible') {
    apiKey = process.env.OPENAI_API_KEY;
    baseUrl = (options.baseUrl || process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1').replace(/\/+$/, '');
    providerLabel = 'OpenAI-Compatible';
    defaultModel = DEFAULT_OPENAI_MODEL;
  } else {
    apiKey = process.env.OPENAI_API_KEY;
    baseUrl = (process.env.OPENAI_BASE_URL || options.baseUrl || 'https://api.openai.com/v1').replace(/\/+$/, '');
    providerLabel = 'OpenAI';
    defaultModel = DEFAULT_OPENAI_MODEL;
  }

  if (!apiKey || !apiKey.trim()) {
    const envVarName = config.provider === 'groq'
      ? 'GROQ_API_KEY'
      : config.provider === 'mistral'
        ? 'MISTRAL_API_KEY'
        : 'OPENAI_API_KEY';
    return {
      success: false,
      error: `AI execution failed: ${envVarName} is not configured in server environment variables.`,
      durationMs: 0
    };
  }

  const model = config.model || defaultModel;
  const endpointUrl = `${baseUrl}/chat/completions`;
  const sanitizedEndpoint = sanitizeUrl(endpointUrl);

  const endpointValidation = await validateProviderEndpoint(endpointUrl);
  if (!endpointValidation.isValid) {
    return {
      success: false,
      error: `${providerLabel} endpoint blocked: ${endpointValidation.error}`,
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
    // OpenAI and Groq APIs mandate that the word 'json' appear in messages when response_format is json_object
    const hasJsonDirective = messages.some((m) => /\bjson\b/i.test(m.content));
    if (!hasJsonDirective) {
      if (messages.length > 0 && messages[0].role === 'system') {
        messages[0].content += '\nRespond strictly with a valid JSON object.';
      } else {
        messages.unshift({
          role: 'system',
          content: 'You must respond strictly with a valid JSON object.'
        });
      }
    }
    payload.response_format = { type: 'json_object' };
  }

  const maxRetries = typeof options.maxRetries === 'number' ? options.maxRetries : MAX_AI_RETRIES;
  const sleepFn = options._sleepFn || ((ms) => new Promise((resolve) => setTimeout(resolve, ms)));
  const fetchFn = options._fetchFn || globalThis.fetch;

  const overallStartTime = Date.now();
  let lastErrorResult = null;
  let attemptCount = 0;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    attemptCount++;
    const elapsedTimeMs = Date.now() - overallStartTime;
    const remainingBudgetMs = config.timeoutMs - elapsedTimeMs;

    if (remainingBudgetMs <= 0) {
      return {
        success: false,
        error: `AI request timed out after ${config.timeoutMs}ms.`,
        durationMs: Date.now() - overallStartTime,
        isTimeout: true,
        attempts: attemptCount
      };
    }

    const controller = new AbortController();
    const attemptTimeoutMs = remainingBudgetMs;
    const timer = setTimeout(() => {
      controller.abort(new Error('AI_REQUEST_TIMEOUT'));
    }, attemptTimeoutMs);

    const attemptStartTime = Date.now();

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

      const { text, sizeBytes, isOversized } = await readStreamWithLimit(
        response,
        MAX_RESPONSE_BYTES
      );

      if (isOversized) {
        return {
          success: false,
          error: `AI response body exceeded maximum limit of 512 KB.`,
          durationMs: Date.now() - overallStartTime,
          attempts: attemptCount
        };
      }

      if (!response.ok) {
        const errorMsg = formatProviderError(response.status, text, providerLabel);
        lastErrorResult = {
          success: false,
          error: errorMsg,
          durationMs: Date.now() - overallStartTime,
          status: response.status,
          attempts: attemptCount,
          telemetry: {
            endpoint: sanitizedEndpoint,
            status: response.status,
            model,
            durationMs: Date.now() - overallStartTime,
            attempts: attemptCount
          }
        };

        if (isRetryableError(response.status) && attempt < maxRetries) {
          const retryAfterHeader = response.headers?.get ? response.headers.get('retry-after') : null;
          const retryAfterMs = parseRetryAfter(retryAfterHeader);
          const delayMs = calculateBackoffWithJitter(attempt, retryAfterMs);

          if (Date.now() - overallStartTime + delayMs >= config.timeoutMs) {
            return {
              ...lastErrorResult,
              durationMs: Date.now() - overallStartTime
            };
          }

          await sleepFn(delayMs);
          continue;
        }

        return lastErrorResult;
      }

      let parsedResponse;
      try {
        parsedResponse = JSON.parse(text);
      } catch {
        return {
          success: false,
          error: 'AI provider returned an unparseable response envelope.',
          durationMs: Date.now() - overallStartTime,
          attempts: attemptCount
        };
      }

      const choice = parsedResponse.choices?.[0];
      if (!choice || !choice.message) {
        return {
          success: false,
          error: 'AI provider returned empty choices in response.',
          durationMs: Date.now() - overallStartTime,
          attempts: attemptCount
        };
      }

      const generatedText = choice.message.content || '';
      const structuredOutput = parseStructuredOutput(generatedText, config.outputFormat);

      const usage = {
        promptTokens: parsedResponse.usage?.prompt_tokens || 0,
        completionTokens: parsedResponse.usage?.completion_tokens || 0,
        totalTokens: parsedResponse.usage?.total_tokens || 0
      };

      const totalDurationMs = Date.now() - overallStartTime;

      return {
        success: true,
        text: generatedText,
        structured: structuredOutput,
        model,
        provider: config.provider,
        usage,
        durationMs: totalDurationMs,
        attempts: attemptCount,
        telemetry: {
          endpoint: sanitizedEndpoint,
          status: response.status,
          model,
          durationMs: totalDurationMs,
          attempts: attemptCount
        }
      };
    } catch (err) {
      clearTimeout(timer);
      const isAbort = controller.signal.aborted || err.name === 'AbortError' || err.message === 'AI_REQUEST_TIMEOUT';
      const isBudgetExhausted = Date.now() - overallStartTime >= config.timeoutMs;

      if (isAbort && isBudgetExhausted) {
        return {
          success: false,
          error: `AI request timed out after ${config.timeoutMs}ms.`,
          durationMs: Date.now() - overallStartTime,
          isTimeout: true,
          attempts: attemptCount
        };
      }

      if (attempt < maxRetries && isRetryableError(null, err)) {
        const delayMs = calculateBackoffWithJitter(attempt);
        if (Date.now() - overallStartTime + delayMs < config.timeoutMs) {
          await sleepFn(delayMs);
          continue;
        }
      }

      return {
        success: false,
        error: `AI provider connection error: ${sanitizeSecretsInString(err.message || 'Unknown network error')}`,
        durationMs: Date.now() - overallStartTime,
        attempts: attemptCount
      };
    }
  }

  return lastErrorResult || {
    success: false,
    error: 'AI request failed after exhausting all retry attempts.',
    durationMs: Date.now() - overallStartTime,
    attempts: attemptCount
  };
};

/**
 * Resolves single provider execution without failover
 * @param {Object} config
 * @param {Object} options
 * @returns {Promise<Object>}
 */
export const executeSingleProvider = async (config, options) => {
  if (config.provider === 'gemini') {
    return await executeGeminiRequest(config, options);
  }
  return await executeOpenAiRequest(config, options);
};

/**
 * Resolves the ordered failover cascade based on primary selection
 * @param {string} primaryProvider
 * @param {string} [primaryModel]
 * @param {Array<{provider: string, model: string}>} [customChain]
 * @returns {Array<{provider: string, model: string}>}
 */
export const buildFailoverChain = (primaryProvider = 'gemini', primaryModel = null, customChain = null) => {
  if (Array.isArray(customChain) && customChain.length > 0) {
    return customChain.map((item) => ({
      provider: (item.provider || 'gemini').toLowerCase(),
      model: item.model || PROVIDER_CONFIGS[item.provider?.toLowerCase()]?.defaultModel || DEFAULT_OPENAI_MODEL
    }));
  }

  const normalizedPrimary = (primaryProvider || 'gemini').toLowerCase();
  const primaryConfig = PROVIDER_CONFIGS[normalizedPrimary] || PROVIDER_CONFIGS.gemini;
  const resolvedPrimaryModel = primaryModel?.trim() || primaryConfig.defaultModel;

  const chain = [{ provider: normalizedPrimary, model: resolvedPrimaryModel }];

  // Append remaining default providers in designated failover order
  for (const item of DEFAULT_FAILOVER_CHAIN) {
    if (item.provider !== normalizedPrimary) {
      chain.push({
        provider: item.provider,
        model: item.model
      });
    }
  }

  return chain;
};

/**
 * Executes AI request with automatic multi-provider failover
 * Cascades across providers on transient errors (429, 5xx, timeouts, network disconnects)
 * and provider-specific model unavailability (404).
 * Enforces one overall node timeout budget across all attempts.
 * Skips unconfigured fallback API keys gracefully.
 * Permanent client errors (400, 401, 403, safety filter blocks) fail immediately without failover.
 */
export const executeWithFailover = async (config, options) => {
  const overallStartTime = Date.now();
  const overallDeadline = overallStartTime + config.timeoutMs;
  const failoverChain = buildFailoverChain(config.provider, config.model, options.failoverChain);
  const failoverLog = [];
  let lastTransientResult = null;

  for (let idx = 0; idx < failoverChain.length; idx++) {
    const candidate = failoverChain[idx];
    const isPrimary = idx === 0;
    const providerMeta = PROVIDER_CONFIGS[candidate.provider] || { envKey: 'API_KEY', name: candidate.provider };

    // 1. Check remaining global timeout budget
    const remainingBudgetMs = overallDeadline - Date.now();
    if (remainingBudgetMs < 500) {
      failoverLog.push({
        provider: candidate.provider,
        model: candidate.model,
        status: 'timeout',
        error: `Overall timeout budget (${config.timeoutMs}ms) exhausted before attempting provider.`,
        durationMs: 0
      });
      return {
        success: false,
        error: `AI execution timed out across provider cascade after ${config.timeoutMs}ms.`,
        durationMs: Date.now() - overallStartTime,
        isTimeout: true,
        failoverLog,
        telemetry: {
          failoverLog,
          totalAttempts: failoverLog.length,
          failoverTriggered: idx > 0,
          durationMs: Date.now() - overallStartTime
        }
      };
    }

    // 2. Check credentials
    let hasKey = false;
    if (candidate.provider === 'gemini') {
      hasKey = !!(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim());
    } else if (candidate.provider === 'groq') {
      hasKey = !!(process.env.GROQ_API_KEY && process.env.GROQ_API_KEY.trim());
    } else if (candidate.provider === 'mistral') {
      hasKey = !!(process.env.MISTRAL_API_KEY && process.env.MISTRAL_API_KEY.trim());
    } else {
      hasKey = !!(process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.trim());
    }

    if (!hasKey) {
      if (isPrimary) {
        // Primary provider explicitly selected with missing credentials must fail immediately
        return {
          success: false,
          error: `AI execution failed: ${providerMeta.envKey} is not configured in server environment variables.`,
          durationMs: Date.now() - overallStartTime,
          failoverLog: [
            {
              provider: candidate.provider,
              model: candidate.model,
              status: 'missing_credentials',
              error: `${providerMeta.envKey} not configured`,
              durationMs: 0
            }
          ]
        };
      }

      // Fallback candidate without configured credentials is safely skipped
      failoverLog.push({
        provider: candidate.provider,
        model: candidate.model,
        status: 'skipped',
        reason: `${providerMeta.envKey} is not configured in server environment`,
        durationMs: 0
      });
      continue;
    }

    // 3. Prepare candidate execution config & options
    const candidateConfig = {
      ...config,
      provider: candidate.provider,
      model: candidate.model,
      timeoutMs: remainingBudgetMs
    };

    // When cascading across multiple providers, default each provider to 0 retries
    // so transient failures immediately fail over to the next healthy provider
    const candidateOptions = {
      ...options,
      maxRetries: typeof options.maxRetriesPerProvider === 'number' ? options.maxRetriesPerProvider : 0
    };

    const attemptStartTime = Date.now();
    const result = await executeSingleProvider(candidateConfig, candidateOptions);
    const attemptDurationMs = Date.now() - attemptStartTime;

    // 4. Handle Result
    if (result.success) {
      failoverLog.push({
        provider: candidate.provider,
        model: candidate.model,
        status: 200,
        success: true,
        durationMs: attemptDurationMs,
        attempts: result.attempts || 1
      });

      return {
        ...result,
        failoverLog,
        telemetry: {
          ...(result.telemetry || {}),
          failoverLog,
          failoverTriggered: idx > 0,
          totalAttempts: failoverLog.length,
          primaryProvider: config.provider,
          finalProvider: candidate.provider,
          finalModel: candidate.model
        }
      };
    }

    // Provider failed — classify error category
    const isTransient =
      result.isTimeout ||
      isRetryableError(result.status) ||
      (typeof result.error === 'string' && (
        result.error.includes('AI provider connection error') ||
        result.error.includes('fetch failed') ||
        result.error.includes('ECONNRESET') ||
        result.error.includes('ETIMEDOUT')
      ));

    // Provider-specific model availability error (HTTP 404)
    // When failover is enabled, an unavailable or retired model on one provider
    // can safely fail over to subsequent providers in the chain (which use their own distinct models).
    const isModelUnavailable = result.status === 404;

    // Fatal errors that must NEVER cascade to subsequent providers:
    // 1. Auth/credential invalidity (401 Unauthorized, 403 Forbidden)
    // 2. Client request format error (400 Bad Request)
    // 3. Provider safety filter block
    const isAuthError = result.status === 401 || result.status === 403;
    const isBadRequest = result.status === 400;
    const isSafetyBlock = typeof result.error === 'string' && (
      result.error.includes('safety policy') ||
      result.error.includes('safety filter') ||
      result.error.includes('blocked by safety')
    );
    const isFatalCascadeError = isAuthError || isBadRequest || isSafetyBlock;

    if (isFatalCascadeError) {
      failoverLog.push({
        provider: candidate.provider,
        model: candidate.model,
        status: result.status || 'permanent_error',
        error: result.error,
        durationMs: attemptDurationMs,
        success: false,
        retryable: false,
        permanent: true
      });

      return {
        ...result,
        failoverLog,
        telemetry: {
          ...(result.telemetry || {}),
          failoverLog,
          failoverTriggered: idx > 0,
          totalAttempts: failoverLog.length,
          durationMs: Date.now() - overallStartTime
        }
      };
    }

    if (isTransient || isModelUnavailable) {
      lastTransientResult = result;
      failoverLog.push({
        provider: candidate.provider,
        model: candidate.model,
        status: result.status || (result.isTimeout ? 'timeout' : 'network_error'),
        error: result.error,
        durationMs: attemptDurationMs,
        success: false,
        retryable: isTransient,
        modelUnavailable: isModelUnavailable
      });

      // If overall deadline is now reached, stop cascade and return timeout
      if (Date.now() >= overallDeadline) {
        return {
          success: false,
          error: `AI execution timed out across provider cascade after ${config.timeoutMs}ms.`,
          durationMs: Date.now() - overallStartTime,
          isTimeout: true,
          failoverLog,
          telemetry: {
            failoverLog,
            failoverTriggered: idx > 0,
            totalAttempts: failoverLog.length,
            durationMs: Date.now() - overallStartTime
          }
        };
      }

      // Continue to next provider in failover cascade
      continue;
    }

    // Unrecognized permanent error
    // Abort failover cascade immediately without calling next provider
    failoverLog.push({
      provider: candidate.provider,
      model: candidate.model,
      status: result.status || 'permanent_error',
      error: result.error,
      durationMs: attemptDurationMs,
      success: false,
      retryable: false,
      permanent: true
    });

    return {
      ...result,
      failoverLog,
      telemetry: {
        ...(result.telemetry || {}),
        failoverLog,
        failoverTriggered: idx > 0,
        totalAttempts: failoverLog.length,
        durationMs: Date.now() - overallStartTime
      }
    };
  }

  // All providers in cascade were attempted or skipped without success
  return {
    success: false,
    error: lastTransientResult?.error || 'All AI providers in automatic failover cascade failed.',
    durationMs: Date.now() - overallStartTime,
    failoverLog,
    telemetry: {
      failoverLog,
      failoverTriggered: true,
      totalAttempts: failoverLog.length,
      durationMs: Date.now() - overallStartTime
    }
  };
};

/**
 * Main Standalone AI Request Executor Service
 *
 * @param {Object} options
 * @param {string} [options.provider] - 'gemini' | 'openai' | 'openai-compatible' | 'groq' | 'mistral' (default: process.env.AI_PROVIDER || 'gemini')
 * @param {string} [options.model] - Model name
 * @param {string} options.prompt - Task instruction / prompt
 * @param {string} [options.systemPrompt] - System directive
 * @param {any} [options.input] - Upstream workflow input context
 * @param {number} [options.temperature] - 0.0 to 2.0 (default 0.2)
 * @param {number} [options.maxTokens] - Max tokens to generate (default 1024, max 4096)
 * @param {'text'|'json'} [options.outputFormat] - Expected output format (default 'text')
 * @param {number} [options.timeoutMs] - Request timeout in ms (default 15000, min 1000, max 60000)
 * @param {boolean} [options.enableFailover] - Opt-in multi-provider failover (Gemini -> Groq -> OpenAI -> Mistral)
 * @param {Array<{provider: string, model: string}>} [options.failoverChain] - Custom failover priority cascade
 * @param {string} [options.baseUrl] - Custom base URL override for openai-compatible endpoints
 * @param {Function} [options._fetchFn] - Internal dependency injection for tests
 * @returns {Promise<{ success: boolean, text?: string, structured?: any, model?: string, provider?: string, usage?: object, durationMs: number, error?: string, failoverLog?: Array }>}
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

  const resolvedDefaultModel = PROVIDER_CONFIGS[provider]?.defaultModel || (provider === 'gemini' ? DEFAULT_GEMINI_MODEL : DEFAULT_OPENAI_MODEL);

  const config = {
    provider,
    model: options.model?.trim?.() || resolvedDefaultModel,
    fullPrompt,
    systemPrompt: options.systemPrompt,
    temperature,
    maxTokens,
    outputFormat,
    timeoutMs
  };

  // 6. Automatic Failover vs Single Provider Dispatch
  if (options.enableFailover === true) {
    return await executeWithFailover(config, options);
  }

  return await executeSingleProvider(config, options);
};
