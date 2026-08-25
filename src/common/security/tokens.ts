import crypto from 'node:crypto';
import jwt, { type SignOptions } from 'jsonwebtoken';
import { env } from '../../config/env.js';
import { badRequest } from '../errors/http-error.js';
import type { RoleName } from '@prisma/client';

export type AccessTokenPayload = {
  sub: string;
  role: RoleName;
  permissions: string[];
  jti: string;
};

export type RefreshTokenPayload = {
  sub: string;
  jti: string;
  familyId: string;
};

export type ResetTokenPayload = {
  sub: string;
  jti: string;
  purpose: 'PASSWORD_RESET' | 'EMAIL_VERIFY';
};

export function randomToken(): string {
  return crypto.randomBytes(48).toString('hex');
}

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function createAccessToken(payload: Omit<AccessTokenPayload, 'jti'> & Partial<Pick<AccessTokenPayload, 'jti'>>): string {
  return jwt.sign(
    {
      sub: payload.sub,
      role: payload.role,
      permissions: payload.permissions
    },
    env.JWT_ACCESS_SECRET,
    {
      expiresIn: env.ACCESS_TOKEN_TTL as SignOptions['expiresIn'],
      jwtid: payload.jti ?? crypto.randomUUID()
    }
  );
}

export function createRefreshToken(payload: RefreshTokenPayload): string {
  return jwt.sign(
    {
      sub: payload.sub,
      familyId: payload.familyId
    },
    env.JWT_REFRESH_SECRET,
    {
      expiresIn: env.REFRESH_TOKEN_TTL as SignOptions['expiresIn'],
      jwtid: payload.jti
    }
  );
}

export function createResetToken(payload: ResetTokenPayload): string {
  return jwt.sign(
    {
      sub: payload.sub,
      purpose: payload.purpose
    },
    env.JWT_RESET_SECRET,
    {
      expiresIn: env.RESET_TOKEN_TTL as SignOptions['expiresIn'],
      jwtid: payload.jti
    }
  );
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  const payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as jwt.JwtPayload;
  return {
    sub: payload.sub ?? '',
    role: payload.role as RoleName,
    permissions: (payload.permissions as string[]) ?? [],
    jti: payload.jti ?? ''
  };
}

export function verifyRefreshToken(token: string): RefreshTokenPayload {
  const payload = jwt.verify(token, env.JWT_REFRESH_SECRET) as jwt.JwtPayload;

  if (!payload.sub || !payload.jti || !payload.familyId) {
    throw badRequest('Invalid refresh token');
  }

  return {
    sub: payload.sub,
    jti: payload.jti,
    familyId: payload.familyId
  };
}

export function verifyResetToken(token: string): ResetTokenPayload {
  const payload = jwt.verify(token, env.JWT_RESET_SECRET) as jwt.JwtPayload;

  if (!payload.sub || !payload.jti || !payload.purpose) {
    throw badRequest('Invalid reset token');
  }

  return {
    sub: payload.sub,
    jti: payload.jti,
    purpose: payload.purpose as ResetTokenPayload['purpose']
  };
}
