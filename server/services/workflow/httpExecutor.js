import { validateUrlForSsrf } from './ssrfValidator.js';

const SUPPORTED_METHODS = new Set(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']);
const DEFAULT_TIMEOUT_MS = 5000;
const MIN_TIMEOUT_MS = 500;
const MAX_TIMEOUT_MS = 30000;
const MAX_RESPONSE_BYTES = 2 * 1024 * 1024; // 2 MB
const MAX_REDIRECTS = 5;

const SENSITIVE_HEADER_KEYS = new Set([
  'authorization',
  'proxy-authorization',
  'x-api-key',
  'api-key',
  'apikey',
  'cookie',
  'set-cookie',
  'x-auth-token',
  'x-access-token'
]);

/**
 * Sanitizes headers by redacting credential and secret values
 * @param {Object|Headers} headers
 * @returns {Object}
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
 * Reads response stream up to MAX_RESPONSE_BYTES to prevent memory exhaustion
 * @param {Response} response
 * @returns {Promise<{ text: string, sizeBytes: number, isOversized: boolean }>}
 */
const readResponseBodySafely = async (response) => {
  if (!response.body) {
    return { text: '', sizeBytes: 0, isOversized: false };
  }

  // Pre-check Content-Length header if present
  const contentLengthHeader = response.headers.get('content-length');
  if (contentLengthHeader) {
    const declaredLength = parseInt(contentLengthHeader, 10);
    if (!isNaN(declaredLength) && declaredLength > MAX_RESPONSE_BYTES) {
      return { text: '', sizeBytes: declaredLength, isOversized: true };
    }
  }

  const reader = response.body.getReader();
  const chunks = [];
  let totalBytes = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      totalBytes += value.length;
      if (totalBytes > MAX_RESPONSE_BYTES) {
        await reader.cancel();
        return { text: '', sizeBytes: totalBytes, isOversized: true };
      }
      chunks.push(value);
    }
  } catch (readErr) {
    // If stream was aborted/cancelled
    if (totalBytes > MAX_RESPONSE_BYTES) {
      return { text: '', sizeBytes: totalBytes, isOversized: true };
    }
    throw readErr;
  }

  const totalBuffer = Buffer.concat(chunks);
  const text = totalBuffer.toString('utf8');

  return { text, sizeBytes: totalBytes, isOversized: false };
};

/**
 * Executes an HTTP Request for an API Request node with full SSRF prevention,
 * redirect re-validation, timeout enforcement, and response size guards.
 *
 * @param {Object} node - React Flow node definition with data config
 * @param {any} incomingInput - Aggregated input from parent nodes
 * @returns {Promise<{ success: boolean, output?: any, error?: string, requestTelemetry?: any }>}
 */
export const executeApiRequestNode = async (node, incomingInput) => {
  const nodeData = node.data || {};

  // 1. Resolve and validate HTTP Method
  const rawMethod = (nodeData.method || 'GET').trim().toUpperCase();
  if (!SUPPORTED_METHODS.has(rawMethod)) {
    return {
      success: false,
      error: `Unsupported HTTP method: "${rawMethod}". Allowed methods: GET, POST, PUT, PATCH, DELETE.`
    };
  }
  const method = rawMethod;

  // 2. Resolve and validate target URL
  const rawUrl = nodeData.url || nodeData.endpoint || nodeData.endpointUrl || '';
  if (!rawUrl || typeof rawUrl !== 'string' || !rawUrl.trim()) {
    return {
      success: false,
      error: `API Request node "${node.id}" requires a valid destination URL.`
    };
  }

  // 3. Resolve request timeout (clamped to safe min/max)
  const configuredTimeout = Number(nodeData.timeoutMs ?? nodeData.timeout ?? DEFAULT_TIMEOUT_MS);
  const timeoutMs = Math.min(
    Math.max(isNaN(configuredTimeout) ? DEFAULT_TIMEOUT_MS : configuredTimeout, MIN_TIMEOUT_MS),
    MAX_TIMEOUT_MS
  );

  // 4. Resolve headers
  let requestHeaders = {
    Accept: 'application/json, text/plain, */*'
  };

  if (nodeData.headers) {
    if (typeof nodeData.headers === 'object' && !Array.isArray(nodeData.headers)) {
      requestHeaders = { ...requestHeaders, ...nodeData.headers };
    } else if (typeof nodeData.headers === 'string' && nodeData.headers.trim()) {
      try {
        const parsed = JSON.parse(nodeData.headers);
        if (typeof parsed === 'object' && parsed !== null) {
          requestHeaders = { ...requestHeaders, ...parsed };
        }
      } catch {
        return {
          success: false,
          error: `API Request node "${node.id}" has malformed JSON headers.`
        };
      }
    }
  }

  // 5. Resolve body for applicable methods (POST, PUT, PATCH, DELETE)
  let requestBody = undefined;
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    if (nodeData.body !== undefined && nodeData.body !== null && nodeData.body !== '') {
      if (typeof nodeData.body === 'object') {
        requestBody = JSON.stringify(nodeData.body);
        if (!requestHeaders['Content-Type'] && !requestHeaders['content-type']) {
          requestHeaders['Content-Type'] = 'application/json';
        }
      } else if (typeof nodeData.body === 'string') {
        requestBody = nodeData.body;
        if (!requestHeaders['Content-Type'] && !requestHeaders['content-type']) {
          // Attempt JSON detection
          try {
            JSON.parse(nodeData.body);
            requestHeaders['Content-Type'] = 'application/json';
          } catch {
            requestHeaders['Content-Type'] = 'text/plain';
          }
        }
      }
    } else if (incomingInput !== null && incomingInput !== undefined && nodeData.sendUpstreamInput !== false) {
      // Use incoming upstream data as payload if no explicit body is defined
      requestBody = JSON.stringify(incomingInput);
      if (!requestHeaders['Content-Type'] && !requestHeaders['content-type']) {
        requestHeaders['Content-Type'] = 'application/json';
      }
    }
  }

  // Prepared sanitized request telemetry for node input recording
  const sanitizedRequestTelemetry = {
    method,
    url: rawUrl,
    headers: sanitizeHeaders(requestHeaders),
    body: requestBody ? (requestBody.length > 500 ? `${requestBody.slice(0, 500)}... [truncated]` : requestBody) : null,
    timeoutMs
  };

  // 6. Manual redirect loop with SSRF validation at every hop
  let currentUrl = rawUrl.trim();
  let redirectCount = 0;
  let finalResponse = null;

  while (redirectCount <= MAX_REDIRECTS) {
    // SSRF Validation for current hop
    const ssrfCheck = await validateUrlForSsrf(currentUrl);
    if (!ssrfCheck.isAllowed) {
      return {
        success: false,
        error: `SSRF Policy Violation: ${ssrfCheck.reason}`,
        requestTelemetry: sanitizedRequestTelemetry
      };
    }

    // Abort controller for timeout
    const controller = new AbortController();
    const timer = setTimeout(() => {
      controller.abort();
    }, timeoutMs);

    try {
      finalResponse = await fetch(currentUrl, {
        method,
        headers: requestHeaders,
        body: requestBody,
        redirect: 'manual', // Strictly manual to intercept and re-validate every redirect
        signal: controller.signal
      });
    } catch (networkErr) {
      clearTimeout(timer);
      if (controller.signal.aborted) {
        return {
          success: false,
          error: `Request timed out after ${timeoutMs}ms`,
          requestTelemetry: sanitizedRequestTelemetry
        };
      }
      return {
        success: false,
        error: `Network request failed: ${networkErr.message || 'Connection error'}`,
        requestTelemetry: sanitizedRequestTelemetry
      };
    } finally {
      clearTimeout(timer);
    }

    // Check if response is a redirect (301, 302, 303, 307, 308)
    if ([301, 302, 303, 307, 308].includes(finalResponse.status)) {
      const location = finalResponse.headers.get('location');
      if (!location) {
        break; // No location header provided, proceed with current response
      }

      // Resolve relative or absolute URL against currentUrl
      try {
        const nextUrl = new URL(location, currentUrl).toString();
        currentUrl = nextUrl;
        redirectCount++;
        if (redirectCount > MAX_REDIRECTS) {
          return {
            success: false,
            error: `Exceeded maximum redirect limit of ${MAX_REDIRECTS} hops.`,
            requestTelemetry: sanitizedRequestTelemetry
          };
        }
        continue;
      } catch (urlErr) {
        return {
          success: false,
          error: `Invalid redirect location header: "${location}".`,
          requestTelemetry: sanitizedRequestTelemetry
        };
      }
    }

    // Final non-redirect response reached
    break;
  }

  if (!finalResponse) {
    return {
      success: false,
      error: 'Failed to receive a valid HTTP response.',
      requestTelemetry: sanitizedRequestTelemetry
    };
  }

  // 7. Read response body safely with size limit protection
  let bodyData;
  try {
    bodyData = await readResponseBodySafely(finalResponse);
  } catch (streamErr) {
    return {
      success: false,
      error: `Failed to read response body: ${streamErr.message}`,
      requestTelemetry: sanitizedRequestTelemetry
    };
  }

  if (bodyData.isOversized) {
    return {
      success: false,
      error: `Response size exceeds maximum allowed limit of 2MB (received ${bodyData.sizeBytes} bytes).`,
      requestTelemetry: sanitizedRequestTelemetry,
      output: {
        status: finalResponse.status,
        statusText: finalResponse.statusText,
        headers: sanitizeHeaders(finalResponse.headers),
        sizeBytes: bodyData.sizeBytes
      }
    };
  }

  // 8. Parse response payload (JSON or text)
  let parsedPayload = null;
  if (bodyData.text && bodyData.text.trim()) {
    try {
      parsedPayload = JSON.parse(bodyData.text);
    } catch {
      parsedPayload =
        bodyData.text.length > 2000
          ? `${bodyData.text.slice(0, 2000)}... [truncated]`
          : bodyData.text;
    }
  }

  const sanitizedResponseHeaders = sanitizeHeaders(finalResponse.headers);

  const outputPayload = {
    status: finalResponse.status,
    statusText: finalResponse.statusText || (finalResponse.ok ? 'OK' : 'Error'),
    headers: sanitizedResponseHeaders,
    data: parsedPayload,
    sizeBytes: bodyData.sizeBytes,
    url: currentUrl
  };

  // 9. Status evaluation: 2xx is succeeded; 4xx/5xx is failed
  if (finalResponse.ok) {
    return {
      success: true,
      output: outputPayload,
      requestTelemetry: sanitizedRequestTelemetry
    };
  } else {
    return {
      success: false,
      error: `HTTP ${finalResponse.status} (${finalResponse.statusText || 'Request Failed'})`,
      output: outputPayload,
      requestTelemetry: sanitizedRequestTelemetry
    };
  }
};
