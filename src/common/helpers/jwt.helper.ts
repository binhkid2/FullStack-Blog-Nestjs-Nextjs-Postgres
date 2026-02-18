import * as crypto from 'crypto';
import * as jwt from 'jsonwebtoken';

export interface AccessTokenPayload {
  sub: string;
  email: string;
  role: string;
  type: 'access';
}

export interface RefreshTokenPayload {
  sub: string;
  type: 'refresh';
}

export function signAccessToken(
  payload: Omit<AccessTokenPayload, 'type'>,
  secret: string,
  expiresIn: string,
): string {
  return jwt.sign({ ...payload, type: 'access' }, secret, { expiresIn } as any);
}

export function signRefreshToken(
  payload: Omit<RefreshTokenPayload, 'type'>,
  secret: string,
  expiresIn: string,
): string {
  return jwt.sign({ ...payload, type: 'refresh' }, secret, { expiresIn } as any);
}

export function verifyAccessToken(token: string, secret: string): AccessTokenPayload {
  return jwt.verify(token, secret) as AccessTokenPayload;
}

export function verifyRefreshToken(token: string, secret: string): RefreshTokenPayload {
  return jwt.verify(token, secret) as RefreshTokenPayload;
}

export function hashToken(raw: string): string {
  return crypto.createHash('sha256').update(raw).digest('hex');
}

export function generateRawToken(): string {
  return crypto.randomBytes(48).toString('hex');
}
