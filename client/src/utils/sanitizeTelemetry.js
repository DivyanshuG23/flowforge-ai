/**
 * Sanitizes telemetry error messages and payload data
 * Strips internal stack traces, system paths, environment secrets, and credentials
 */

export const sanitizeTelemetryError = (error) => {
  if (!error) return null;

  let raw = typeof error === 'string' ? error : (error.message || String(error));

  // Extract the first meaningful error sentence/line
  const lines = raw.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  let primary = lines.find((l) => !l.startsWith('at ') && !l.startsWith('node:internal')) || lines[0] || 'Execution halted';

  // Strip system file paths
  primary = primary.replace(/(?:[A-Za-z]:\\[^:\s]+|(?:\/[a-zA-Z0-9_.-]+)+)/g, '[system path]');

  // Redact authorization tokens, API keys, and vendor prefixes
  primary = primary
    .replace(/AIza[0-9A-Za-z_-]{30,}/g, '[REDACTED_GEMINI_KEY]')
    .replace(/gsk_[0-9A-Za-z_-]{20,}/g, '[REDACTED_GROQ_KEY]')
    .replace(/sk-[0-9A-Za-z_-]{20,}/g, '[REDACTED_OPENAI_KEY]')
    .replace(/(?:Bearer\s+)[A-Za-z0-9\-._~+/]+=*/gi, 'Bearer [REDACTED]')
    .replace(/(?:key|secret|apiKey|api_key|password|token|jwt|auth)[=:]\s*['"]?[A-Za-z0-9\-._~+/]{6,}['"]?/gi, (match) => {
      const prefix = match.split(/[=:]/)[0];
      return `${prefix}=[REDACTED]`;
    })
    .replace(/([?&](?:key|apiKey|api_key)=)[^&\s]+/gi, '$1[REDACTED]');

  return primary.trim();
};

/**
 * Sanitizes input/output objects for safe UI display
 */
export const sanitizeTelemetryData = (data) => {
  if (data === null || data === undefined) return null;
  if (typeof data !== 'object') return data;

  try {
    const seen = new WeakSet();
    const clean = (obj) => {
      if (obj === null || typeof obj !== 'object') return obj;
      if (seen.has(obj)) return '[Circular]';
      seen.add(obj);

      if (Array.isArray(obj)) {
        return obj.map(clean);
      }

      const res = {};
      for (const key of Object.keys(obj)) {
        const lowerKey = key.toLowerCase();
        if (
          lowerKey.includes('password') ||
          lowerKey.includes('secret') ||
          lowerKey.includes('token') ||
          lowerKey.includes('key') ||
          lowerKey.includes('auth')
        ) {
          res[key] = '[REDACTED]';
        } else {
          res[key] = clean(obj[key]);
        }
      }
      return res;
    };

    return clean(data);
  } catch {
    return '[Sanitized Data]';
  }
};

/**
 * Strict client-side redaction of secrets, API keys, and bearer tokens
 */
export const sanitizeErrorText = (text) => {
  if (!text || typeof text !== 'string') return '';
  return text
    .replace(/AIza[0-9A-Za-z_-]{30,}/g, '[REDACTED_GEMINI_KEY]')
    .replace(/gsk_[0-9A-Za-z_-]{20,}/g, '[REDACTED_GROQ_KEY]')
    .replace(/sk-[0-9A-Za-z_-]{20,}/g, '[REDACTED_OPENAI_KEY]')
    .replace(/(?:key|secret|apiKey|api_key|token)[=:]\s*['"]?[A-Za-z0-9\-._~+/]{8,}['"]?/gi, (m) => {
      const prefix = m.split(/[=:]/)[0];
      return `${prefix}=[REDACTED]`;
    })
    .replace(/Bearer\s+[0-9A-Za-z_.\-]+/gi, 'Bearer [REDACTED]')
    .replace(/([?&](?:key|apiKey|api_key)=)[^&\s]+/gi, '$1[REDACTED]');
};

/**
 * Recursively scrubs all sensitive secrets, credentials, tokens, and API keys from an export payload
 */
export const deepSanitizeExportObject = (obj) => {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === 'string') {
    return sanitizeErrorText(obj);
  }
  if (typeof obj === 'number' || typeof obj === 'boolean') {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(deepSanitizeExportObject);
  }
  if (typeof obj === 'object') {
    const sanitized = {};
    for (const [key, val] of Object.entries(obj)) {
      const lower = key.toLowerCase();
      if (
        lower.includes('secret') || 
        lower.includes('apikey') || 
        lower.includes('api_key') || 
        lower.includes('authorization') || 
        lower.includes('password') ||
        lower.includes('token')
      ) {
        sanitized[key] = '[REDACTED]';
      } else {
        sanitized[key] = deepSanitizeExportObject(val);
      }
    }
    return sanitized;
  }
  return obj;
};
