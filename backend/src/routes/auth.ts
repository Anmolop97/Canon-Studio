import { Router, Request, Response, NextFunction } from 'express';
import crypto from 'node:crypto';
import { storageService } from '../services/storage.js';
import { User } from '../types/canonStudio.js';

export const authRouter = Router();

export interface AuthenticatedRequest extends Request {
  user?: User;
}

export interface AuthTokenPayload {
  userId: string;
  iat: number;
  exp: number;
  [key: string]: any;
}

/**
 * Secret key resolution with fallback
 */
export function getAuthSecret(): string {
  const secret = process.env.AUTH_SECRET || process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('Authentication secret not configured. Set AUTH_SECRET or JWT_SECRET environment variable.');
  }
  return secret;
}

/**
 * Sanitizes a User object to exclude any internal or sensitive properties.
 */
export function safeUser(user: User): User {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    createdAt: user.createdAt,
  };
}

/**
 * Generates an HMAC-SHA256 compact signed token:
 * base64url(header).base64url(payload).base64url(signature)
 */
export function createAuthToken(userId: string, expiresInSeconds: number = 7 * 24 * 60 * 60): string {
  const header = {
    alg: 'HS256',
    typ: 'JWT',
  };
  const now = Math.floor(Date.now() / 1000);
  const payload: AuthTokenPayload = {
    userId,
    iat: now,
    exp: now + expiresInSeconds,
  };

  const headerB64 = Buffer.from(JSON.stringify(header), 'utf8').toString('base64url');
  const payloadB64 = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  const secret = getAuthSecret();
  const signature = crypto
    .createHmac('sha256', secret)
    .update(`${headerB64}.${payloadB64}`)
    .digest('base64url');

  return `${headerB64}.${payloadB64}.${signature}`;
}

/**
 * Cryptographically verifies an HMAC-SHA256 compact signed token.
 * Validates format, signature (timing-safe), expiration, and payload contents.
 */
export function verifyToken(token: string): AuthTokenPayload | null {
  if (typeof token !== 'string') {
    return null;
  }

  const parts = token.split('.');
  if (parts.length !== 3) {
    return null;
  }

  const [headerB64, payloadB64, signature] = parts;
  if (!headerB64 || !payloadB64 || !signature) {
    return null;
  }

  // Verify header
  try {
    const headerJson = Buffer.from(headerB64, 'base64url').toString('utf8');
    const header = JSON.parse(headerJson);
    if (!header || typeof header !== 'object' || header.alg !== 'HS256') {
      return null;
    }
  } catch {
    return null;
  }

  // Verify signature with timing-safe comparison and length check
  const secret = getAuthSecret();
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(`${headerB64}.${payloadB64}`)
    .digest('base64url');

  const sigBuf = Buffer.from(signature, 'utf8');
  const expBuf = Buffer.from(expectedSignature, 'utf8');

  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    return null;
  }

  // Parse and validate payload
  let payload: any;
  try {
    const payloadJson = Buffer.from(payloadB64, 'base64url').toString('utf8');
    payload = JSON.parse(payloadJson);
  } catch {
    return null;
  }

  if (!payload || typeof payload !== 'object') {
    return null;
  }

  if (typeof payload.userId !== 'string' || payload.userId.trim() === '') {
    return null;
  }

  const nowSec = Math.floor(Date.now() / 1000);
  if (typeof payload.exp !== 'number' || payload.exp <= nowSec) {
    return null;
  }

  return payload as AuthTokenPayload;
}

// Simple authentication middleware
export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || typeof authHeader !== 'string') {
    res.status(401).json({ error: 'Unauthorized: Invalid or expired token' });
    return;
  }

  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  if (!match) {
    res.status(401).json({ error: 'Unauthorized: Invalid or expired token' });
    return;
  }

  const token = match[1].trim();
  const payload = verifyToken(token);
  if (!payload) {
    res.status(401).json({ error: 'Unauthorized: Invalid or expired token' });
    return;
  }

  const user = storageService.findUserById(payload.userId);
  if (!user) {
    res.status(401).json({ error: 'Unauthorized: Invalid or expired token' });
    return;
  }

  req.user = user;
  next();
}

// Optional auth helper (for likes/read status if user is logged in)
export function optionalAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (authHeader && typeof authHeader === 'string') {
    const match = authHeader.match(/^Bearer\s+(.+)$/i);
    if (match) {
      const token = match[1].trim();
      const payload = verifyToken(token);
      if (payload) {
        const user = storageService.findUserById(payload.userId);
        if (user) {
          req.user = user;
          next();
          return;
        }
      }
    }
  }

  req.user = undefined;
  next();
}

/**
 * POST /api/auth/register
 */
authRouter.post('/register', (req: Request, res: Response) => {
  try {
    const { email, password, displayName } = req.body;
    if (!email || !password || !displayName) {
      res.status(400).json({ error: 'Email, password, and display name are all required.' });
      return;
    }

    if (password.length < 4) {
      res.status(400).json({ error: 'Password must be at least 4 characters long.' });
      return;
    }

    const existing = storageService.findUserByEmail(email);
    if (existing) {
      res.status(409).json({ error: 'An account with this email already exists.' });
      return;
    }

    const user = storageService.createUser(email, password, displayName);
    const token = createAuthToken(user.id);
    res.status(201).json({
      token,
      user: safeUser(user)
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Registration failed' });
  }
});

/**
 * POST /api/auth/login
 */
authRouter.post('/login', (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required.' });
      return;
    }

    const user = storageService.findUserByEmail(email);
    if (!user || !storageService.verifyPassword(user.id, password)) {
      res.status(401).json({ error: 'Invalid email or password.' });
      return;
    }

    const token = createAuthToken(user.id);
    res.json({
      token,
      user: safeUser(user)
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Login failed' });
  }
});

/**
 * GET /api/auth/me
 */
authRouter.get('/me', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  res.json({ user: req.user });
});

/**
 * GET /api/auth/demo-accounts
 */
// Demo accounts endpoint removed for security.

