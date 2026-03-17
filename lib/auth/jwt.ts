// eslint-disable-next-line @typescript-eslint/no-var-requires
const jwt: any = require('jsonwebtoken');

type JwtBase64Url = string;

type JwtHeader = {
  alg: 'HS256';
  typ: 'JWT';
};

export interface JWTPayload {
  userId: string;
  email: string;
  role: string;
  iat?: number;
  exp?: number;
}

function getJwtSecret(): string {
  return process.env.JWT_SECRET || 'development-secret-key';
}
const JWT_EXPIRY_SECONDS = 60 * 60 * 24 * 7; // 7d
const REFRESH_EXPIRY_SECONDS = 60 * 60 * 24 * 30; // 30d

function base64UrlEncode(input: Uint8Array | string): JwtBase64Url {
  const bytes = typeof input === 'string' ? new TextEncoder().encode(input) : input;
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  const b64 = btoa(binary);
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function base64UrlDecodeToBytes(input: JwtBase64Url): Uint8Array {
  const b64 = input.replace(/-/g, '+').replace(/_/g, '/');
  const pad = b64.length % 4 === 0 ? '' : '='.repeat(4 - (b64.length % 4));
  const bin = atob(b64 + pad);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

async function hmacSha256(message: string, secret: string): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );

  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message));
  return new Uint8Array(sig);
}

function nowSeconds(): number {
  return Math.floor(Date.now() / 1000);
}

function parseExpirySeconds(expiresIn: '7d' | '30d'): number {
  return expiresIn === '30d' ? REFRESH_EXPIRY_SECONDS : JWT_EXPIRY_SECONDS;
}

async function signHS256(payload: object, expiresIn: '7d' | '30d'): Promise<string> {
  const header: JwtHeader = { alg: 'HS256', typ: 'JWT' };
  const iat = nowSeconds();
  const exp = iat + parseExpirySeconds(expiresIn);

  const fullPayload = { ...payload, iat, exp };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(fullPayload));
  const signingInput = `${encodedHeader}.${encodedPayload}`;

  const signature = await hmacSha256(signingInput, getJwtSecret());
  const encodedSig = base64UrlEncode(signature);

  return `${signingInput}.${encodedSig}`;
}

function decodePayload<T>(token: string): T {
  const parts = token.split('.');
  if (parts.length !== 3) throw new Error('Invalid token');
  const payloadBytes = base64UrlDecodeToBytes(parts[1]);
  const payloadJson = new TextDecoder().decode(payloadBytes);
  return JSON.parse(payloadJson) as T;
}

async function verifyHS256(token: string): Promise<boolean> {
  const parts = token.split('.');
  if (parts.length !== 3) return false;

  const [h, p, s] = parts;
  const signingInput = `${h}.${p}`;
  const expected = await hmacSha256(signingInput, getJwtSecret());
  const expectedB64Url = base64UrlEncode(expected);

  if (expectedB64Url !== s) return false;

  try {
    const payload = decodePayload<{ exp?: number }>(token);
    if (typeof payload.exp === 'number' && payload.exp < nowSeconds()) return false;
    return true;
  } catch {
    return false;
  }
}

export async function generateToken(payload: JWTPayload): Promise<string> {
  return signHS256({ userId: payload.userId, email: payload.email, role: payload.role }, '7d');
}

export async function generateRefreshToken(payload: { userId: string; email: string }): Promise<string> {
  return signHS256({ userId: payload.userId, email: payload.email }, '30d');
}

export async function verifyToken(token: string): Promise<JWTPayload | null> {
  const ok = await verifyHS256(token);
  if (!ok) return null;
  return decodePayload<JWTPayload>(token);
}
