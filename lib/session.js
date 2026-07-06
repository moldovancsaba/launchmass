/**
 * Signed session helper
 *
 * Functional: HMAC-signs the sso_session cookie payload and verifies the
 *   signature on every read, so a client cannot forge or tamper with the
 *   session (role, hasAccess, expiry) it carries.
 * Strategic: The session cookie was previously plain base64 JSON — trivially
 *   forgeable into an admin session. Signing makes it tamper-evident without
 *   any external round-trip. Authorization is still re-checked against the DB
 *   in validateSsoSession; this only guarantees the identity in the cookie is
 *   authentic.
 *
 * Key: SESSION_SECRET if set, else falls back to SSO_CLIENT_SECRET (already a
 *   server-only secret in this app) so signing works without new config.
 */

import crypto from 'crypto';

function signingKey() {
  const k = process.env.SESSION_SECRET || process.env.SSO_CLIENT_SECRET;
  if (!k) {
    throw new Error('SESSION_SECRET (or SSO_CLIENT_SECRET) must be set to sign sessions');
  }
  return k;
}

/**
 * Sign a session object → `${base64Payload}.${hexSignature}` cookie value.
 * @param {Object} dataObj - session payload (tokens, user, expires_at)
 * @returns {string} signed cookie value
 */
export function signSession(dataObj) {
  const payload = Buffer.from(JSON.stringify(dataObj)).toString('base64');
  const sig = crypto.createHmac('sha256', signingKey()).update(payload).digest('hex');
  return `${payload}.${sig}`;
}

/**
 * Verify a signed cookie value and return the decoded payload, or null if the
 * value is missing, malformed, or the signature does not match.
 * @param {string} cookieValue
 * @returns {Object|null}
 */
export function verifySession(cookieValue) {
  if (!cookieValue || typeof cookieValue !== 'string') return null;
  const dot = cookieValue.lastIndexOf('.');
  if (dot <= 0) return null;
  const payload = cookieValue.slice(0, dot);
  const sig = cookieValue.slice(dot + 1);
  const expected = crypto.createHmac('sha256', signingKey()).update(payload).digest('hex');
  // Constant-time comparison to avoid timing side channels
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    return JSON.parse(Buffer.from(payload, 'base64').toString());
  } catch {
    return null;
  }
}
