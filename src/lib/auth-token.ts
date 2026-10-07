/**
 * Web Crypto-based JWT / Session Token signing and verification.
 * Runs seamlessly in Edge runtime (Next.js middleware) and Node.js runtime.
 */

export interface AuthPayload {
  userId: string;
  email: string;
  role: string;
  iat?: number;
  exp?: number;
}

export const SESSION_COOKIE_NAME = 'ura_session';
const DEFAULT_SECRET = 'university-analyzer-super-secret-key-3001-jwt';
const TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days

function getSecretKey(): string {
  return process.env.APP_SECRET || DEFAULT_SECRET;
}

function base64UrlEncodeBuffer(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function base64UrlDecodeBuffer(str: string): Uint8Array {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function base64UrlEncode(str: string): string {
  const bytes = new TextEncoder().encode(str);
  return base64UrlEncodeBuffer(bytes.buffer);
}

function base64UrlDecode(str: string): string {
  const bytes = base64UrlDecodeBuffer(str);
  return new TextDecoder().decode(bytes);
}

export async function signAuthToken(payload: Omit<AuthPayload, 'iat' | 'exp'>): Promise<string> {
  const secret = getSecretKey();
  const enc = new TextEncoder();
  const now = Math.floor(Date.now() / 1000);

  const fullPayload: AuthPayload = {
    ...payload,
    iat: now,
    exp: now + TOKEN_TTL_SECONDS,
  };

  const header = { alg: 'HS256', typ: 'JWT' };
  const b64Header = base64UrlEncode(JSON.stringify(header));
  const b64Payload = base64UrlEncode(JSON.stringify(fullPayload));
  const data = `${b64Header}.${b64Payload}`;

  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign('HMAC', key, enc.encode(data));
  const b64Signature = base64UrlEncodeBuffer(signature);

  return `${data}.${b64Signature}`;
}

export async function verifyAuthToken(token: string): Promise<AuthPayload | null> {
  try {
    if (!token) return null;
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const [b64Header, b64Payload, b64Signature] = parts;
    const secret = getSecretKey();
    const enc = new TextEncoder();
    const data = `${b64Header}.${b64Payload}`;

    const key = await crypto.subtle.importKey(
      'raw',
      enc.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );

    const signature = base64UrlDecodeBuffer(b64Signature);
    const isValid = await crypto.subtle.verify('HMAC', key, signature as unknown as BufferSource, enc.encode(data));
    if (!isValid) return null;

    const payload: AuthPayload = JSON.parse(base64UrlDecode(b64Payload));
    const now = Math.floor(Date.now() / 1000);

    if (payload.exp && now > payload.exp) {
      return null; // Expired
    }

    return payload;
  } catch (err) {
    console.error('Error verifying auth token:', err);
    return null;
  }
}

export const PENDING_OTP_COOKIE_NAME = 'ura_pending_otp';

export interface PendingOtpPayload {
  email: string;
  otp: string;
  exp: number;
}

/**
 * Creates a cryptographically signed HMAC-SHA256 pending OTP token.
 * This guarantees serverless resilience even if live hosting databases are transient or read-only.
 */
export async function signPendingOtp(email: string, otp: string, ttlSeconds: number = 600): Promise<string> {
  const secret = getSecretKey();
  const enc = new TextEncoder();
  const now = Math.floor(Date.now() / 1000);

  const payload: PendingOtpPayload = {
    email: email.toLowerCase().trim(),
    otp: otp.trim(),
    exp: now + ttlSeconds,
  };

  const b64Payload = base64UrlEncode(JSON.stringify(payload));
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign('HMAC', key, enc.encode(b64Payload));
  const b64Signature = base64UrlEncodeBuffer(signature);

  return `${b64Payload}.${b64Signature}`;
}

/**
 * Validates the cryptographic HMAC-SHA256 pending OTP token.
 */
export async function verifyPendingOtp(token: string, email: string, inputOtp: string): Promise<boolean> {
  try {
    if (!token) return false;
    const parts = token.split('.');
    if (parts.length !== 2) return false;

    const [b64Payload, b64Signature] = parts;
    const secret = getSecretKey();
    const enc = new TextEncoder();

    const key = await crypto.subtle.importKey(
      'raw',
      enc.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );

    const signature = base64UrlDecodeBuffer(b64Signature);
    const isValid = await crypto.subtle.verify('HMAC', key, signature as unknown as BufferSource, enc.encode(b64Payload));
    if (!isValid) return false;

    const payload: PendingOtpPayload = JSON.parse(base64UrlDecode(b64Payload));
    const now = Math.floor(Date.now() / 1000);

    if (now > payload.exp) {
      return false; // Expired
    }

    if (payload.email !== email.toLowerCase().trim()) {
      return false; // Mismatched email
    }

    if (payload.otp !== inputOtp.trim()) {
      return false; // Mismatched OTP
    }

    return true;
  } catch (err) {
    console.error('Error verifying pending OTP token:', err);
    return false;
  }
}

