import { randomBytes, scryptSync, timingSafeEqual, createHmac } from 'node:crypto';

const KEY_LEN = 64;
const DEFAULT_SECRET = process.env.ACCESS_CODE || process.env.AUTH_SECRET || 'openmaic-secret-key-salt-2026';

/**
 * Hash a password using scrypt with a unique random salt
 */
export function hashPassword(password: string): { hash: string; salt: string } {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, KEY_LEN).toString('hex');
  return { hash, salt };
}

/**
 * Verify a plain text password against a stored hash and salt
 */
export function verifyPassword(password: string, hash: string, salt: string): boolean {
  try {
    const hashBuffer = Buffer.from(hash, 'hex');
    const computedBuffer = scryptSync(password, salt, KEY_LEN);
    if (hashBuffer.length !== computedBuffer.length) {
      return false;
    }
    return timingSafeEqual(hashBuffer, computedBuffer);
  } catch {
    return false;
  }
}

/**
 * Generate a cryptographically secure random session token
 */
export function generateToken(): string {
  return randomBytes(32).toString('hex');
}

/**
 * Generate a user API key (om_live_...)
 */
export function generateApiKey(): string {
  return `om_live_${randomBytes(24).toString('hex')}`;
}

/**
 * Sign an arbitrary payload (e.g. userId.timestamp)
 */
export function signPayload(payload: string, secret = DEFAULT_SECRET): string {
  const signature = createHmac('sha256', secret).update(payload).digest('hex');
  return `${payload}.${signature}`;
}

/**
 * Verify a signed payload and return the original data if valid
 */
export function verifySignedPayload(signedData: string, secret = DEFAULT_SECRET): string | null {
  const dotIndex = signedData.lastIndexOf('.');
  if (dotIndex === -1) return null;

  const payload = signedData.substring(0, dotIndex);
  const signature = signedData.substring(dotIndex + 1);

  const expectedSignature = createHmac('sha256', secret).update(payload).digest('hex');
  if (signature.length !== expectedSignature.length) return null;

  const sigBuf = Buffer.from(signature, 'hex');
  const expBuf = Buffer.from(expectedSignature, 'hex');

  if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) {
    return null;
  }

  return payload;
}
