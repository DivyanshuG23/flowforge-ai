import cors from 'cors';

/**
 * Builds the allowlist of origins based on environment and defaults.
 * Supports comma-separated origins in CLIENT_ORIGIN.
 */
export const getAllowedOrigins = () => {
  const defaultDevOrigins = [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:4173',
    'http://127.0.0.1:4173',
    'http://localhost:3000',
    'http://127.0.0.1:3000'
  ];

  const envOrigins = (process.env.CLIENT_ORIGIN || '')
    .split(',')
    .map((o) => o.trim().replace(/\/+$/, ''))
    .filter(Boolean);

  if (process.env.NODE_ENV === 'production') {
    // In production, strictly restrict to explicitly configured origins
    return new Set(envOrigins);
  }

  // In development and testing, combine configured origins with standard local dev ports
  return new Set([...defaultDevOrigins, ...envOrigins]);
};

/**
 * CORS Middleware with strict origin validation
 */
export const createCorsMiddleware = () => {
  return cors({
    origin: (origin, callback) => {
      // Allow non-browser requests (server-to-server, curl, health probes) where origin is absent
      if (!origin) {
        return callback(null, true);
      }

      const normalizedOrigin = origin.trim().replace(/\/+$/, '');
      const allowedOrigins = getAllowedOrigins();

      if (allowedOrigins.has(normalizedOrigin)) {
        return callback(null, true);
      }

      return callback(new Error(`Origin "${origin}" is not permitted by CORS policy.`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
    exposedHeaders: [
      'RateLimit',
      'RateLimit-Policy',
      'RateLimit-Limit',
      'RateLimit-Remaining',
      'RateLimit-Reset',
      'X-RateLimit-Limit',
      'X-RateLimit-Remaining',
      'X-RateLimit-Reset'
    ],
    maxAge: 86400,
    optionsSuccessStatus: 204
  });
};

export default createCorsMiddleware;
