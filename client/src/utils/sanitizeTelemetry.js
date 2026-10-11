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

  // Redact authorization tokens and API secrets
  primary = primary.replace(/(?:Bearer\s+)[A-Za-z0-9\-._~+/]+=*/gi, 'Bearer [REDACTED]');
  primary = primary.replace(/(?:key|secret|password|token|jwt|auth)[=:]\s*['"]?[A-Za-z0-9\-._~+/]{6,}['"]?/gi, (match) => {
    const prefix = match.split(/[=:]/)[0];
    return `${prefix}=[REDACTED]`;
  });

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
