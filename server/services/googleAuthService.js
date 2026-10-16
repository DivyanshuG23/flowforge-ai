import { OAuth2Client } from 'google-auth-library';

let customVerifier = null;

/**
 * Configure a custom mock verifier for offline unit testing without external Google network calls.
 * @param {(idToken: string, expectedAudience: string) => Promise<any>} mockFn
 */
export const setMockGoogleVerifier = (mockFn) => {
  customVerifier = mockFn;
};

/**
 * Reset custom verifier back to standard Google OAuth2Client.
 */
export const resetMockGoogleVerifier = () => {
  customVerifier = null;
};

/**
 * Verifies a Google ID token cryptographically, validating audience, issuer, expiration, and email_verified.
 * Never trusts client assertions; extracts claims directly from verified token payload.
 *
 * @param {string} idToken - The JWT ID token provided by Google Identity Services
 * @param {string} expectedAudience - Expected GOOGLE_CLIENT_ID
 * @returns {Promise<{ googleId: string, email: string, name: string, avatar: string|null, emailVerified: boolean }>}
 */
export const verifyGoogleIdToken = async (idToken, expectedAudience) => {
  // If mock verifier is configured for offline unit tests, delegate directly
  if (customVerifier) {
    return await customVerifier(idToken, expectedAudience);
  }

  if (!idToken || typeof idToken !== 'string' || !idToken.trim()) {
    const error = new Error('Google ID token is required');
    error.statusCode = 400;
    throw error;
  }

  if (!expectedAudience || typeof expectedAudience !== 'string' || !expectedAudience.trim()) {
    const error = new Error('Server configuration error: GOOGLE_CLIENT_ID is not configured');
    error.statusCode = 500;
    throw error;
  }

  const client = new OAuth2Client(expectedAudience);

  let ticket;
  try {
    ticket = await client.verifyIdToken({
      idToken: idToken.trim(),
      audience: expectedAudience.trim()
    });
  } catch (err) {
    const errorMessage = err.message || '';
    const error = new Error(
      errorMessage.includes('Token used too late') || errorMessage.includes('expired')
        ? 'Google token has expired'
        : errorMessage.includes('Wrong number of segments') || errorMessage.includes('signature')
        ? 'Invalid Google token signature or format'
        : 'Google token verification failed'
    );
    error.statusCode = 401;
    throw error;
  }

  const payload = ticket.getPayload();
  if (!payload || !payload.sub) {
    const error = new Error('Invalid token payload: missing subject identifier');
    error.statusCode = 401;
    throw error;
  }

  // Audience validation
  if (payload.aud !== expectedAudience.trim()) {
    const error = new Error('Token was not issued for this application (audience mismatch)');
    error.statusCode = 401;
    throw error;
  }

  // Issuer validation
  const validIssuers = ['accounts.google.com', 'https://accounts.google.com'];
  if (!validIssuers.includes(payload.iss)) {
    const error = new Error(`Invalid token issuer: ${payload.iss}`);
    error.statusCode = 401;
    throw error;
  }

  // Expiration validation
  if (payload.exp && payload.exp * 1000 < Date.now()) {
    const error = new Error('Google token has expired');
    error.statusCode = 401;
    throw error;
  }

  // Verified email validation: Never link or create accounts from unverified emails
  if (!payload.email || payload.email_verified !== true) {
    const error = new Error('Google account email is unverified or missing');
    error.statusCode = 400;
    throw error;
  }

  const normalizedEmail = payload.email.trim().toLowerCase();
  let sanitizedName = (payload.name && payload.name.trim()) || payload.given_name || normalizedEmail.split('@')[0] || 'Google User';
  if (sanitizedName.length < 2) {
    sanitizedName = `${sanitizedName} User`;
  }
  if (sanitizedName.length > 50) {
    sanitizedName = sanitizedName.substring(0, 50);
  }

  return {
    googleId: payload.sub,
    email: normalizedEmail,
    emailVerified: true,
    name: sanitizedName,
    avatar: payload.picture ? String(payload.picture).trim() : null
  };
};

export default {
  verifyGoogleIdToken,
  setMockGoogleVerifier,
  resetMockGoogleVerifier
};
