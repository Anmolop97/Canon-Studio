import { publicErrorMessage } from '../middleware/publicError.js';
import { Router, Request, Response, NextFunction } from 'express';
import crypto from 'node:crypto';
import { storageService } from '../services/storage.js';
import { User } from '../types/canonStudio.js';
import { loginRateLimiter, registerRateLimiter } from '../middleware/rateLimit.js';

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

const AUTH_TOKEN_TTL_SECONDS = 4 * 60 * 60;
function authCookieName(): string {
  return process.env.NODE_ENV === 'production' ? '__Host-canon_session' : 'canon_session';
}

/**
 * Secret key resolution with fallback
 */
const developmentAuthSecret = crypto.randomBytes(32).toString('base64url');
const DEMO_USER_IDS = new Set(['user-anya', 'user-dev', 'user-guest']);

export function getAuthSecret(): string {
  const configuredSecret = process.env.AUTH_SECRET;
  if (process.env.NODE_ENV === 'production') {
    if (!configuredSecret || Buffer.byteLength(configuredSecret, 'utf8') < 32) {
      throw new Error('Production requires AUTH_SECRET to contain at least 32 bytes of random data.');
    }
    return configuredSecret;
  }
  return configuredSecret || process.env.JWT_SECRET || developmentAuthSecret;
}

export function validateAuthConfiguration(): void {
  if (process.env.NODE_ENV === 'production') getAuthSecret();
}

function readSessionCookie(req: Request): string | null {
  const prefix = `${authCookieName()}=`;
  const cookie = req.headers.cookie?.split(';').map(part => part.trim()).find(part => part.startsWith(prefix));
  return cookie ? cookie.slice(prefix.length) : null;
}

function setSessionCookie(res: Response, token: string): void {
  const production = process.env.NODE_ENV === 'production';
  const secure = production ? '; Secure' : '';
  const path = production ? '/' : '/api';
  res.setHeader('Set-Cookie', `${authCookieName()}=${token}; HttpOnly; SameSite=Strict; Path=${path}; Max-Age=${AUTH_TOKEN_TTL_SECONDS}${secure}`);
}

function clearSessionCookie(res: Response): void {
  const production = process.env.NODE_ENV === 'production';
  const secure = production ? '; Secure' : '';
  const path = production ? '/' : '/api';
  res.setHeader('Set-Cookie', `${authCookieName()}=; HttpOnly; SameSite=Strict; Path=${path}; Max-Age=0${secure}`);
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
export function createAuthToken(userId: string, expiresInSeconds: number = AUTH_TOKEN_TTL_SECONDS): string {
  const header = {
    alg: 'HS256',
    typ: 'JWT',
  };
  const now = Math.floor(Date.now() / 1000);
  const payload: AuthTokenPayload = {
    userId,
    iat: now,
    exp: now + Math.max(1, Math.min(expiresInSeconds, AUTH_TOKEN_TTL_SECONDS)),
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

  if (typeof payload.userId !== 'string' || payload.userId.trim() === '' ||
      typeof payload.iat !== 'number' || !Number.isSafeInteger(payload.iat) ||
      payload.iat > Math.floor(Date.now() / 1000) + 60) {
    return null;
  }

  const nowSec = Math.floor(Date.now() / 1000);
  if (!Number.isSafeInteger(payload.exp) || payload.exp <= nowSec || payload.exp > payload.iat + AUTH_TOKEN_TTL_SECONDS) {
    return null;
  }

  return payload as AuthTokenPayload;
}

// Simple authentication middleware
export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const token = readSessionCookie(req);
  if (!token) {
    res.status(401).json({ error: 'Unauthorized: Invalid or expired session' });
    return;
  }
  const payload = verifyToken(token);
  if (!payload) {
    res.status(401).json({ error: 'Unauthorized: Invalid or expired token' });
    return;
  }

  const user = storageService.findUserById(payload.userId);
  if (!user || (process.env.NODE_ENV === 'production' && DEMO_USER_IDS.has(user.id))) {
    res.status(401).json({ error: 'Unauthorized: Invalid or expired token' });
    return;
  }

  req.user = user;
  next();
}

// Optional auth helper (for likes/read status if user is logged in)
export function optionalAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const token = readSessionCookie(req);
  if (token) {
    const payload = verifyToken(token);
    if (payload) {
      const user = storageService.findUserById(payload.userId);
      if (user && !(process.env.NODE_ENV === 'production' && DEMO_USER_IDS.has(user.id))) {
        req.user = user;
        next();
        return;
      }
    }
  }

  req.user = undefined;
  next();
}

/**
 * POST /api/auth/register
 */
authRouter.post('/register', registerRateLimiter, (req: Request, res: Response) => {
  try {
    const { email, password, displayName } = req.body;
    if (typeof email !== 'string' || typeof password !== 'string' || typeof displayName !== 'string') {
      res.status(400).json({ error: 'Email, password, and display name are all required.' });
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedName = displayName.trim();
    const passwordLength = Array.from(password).length;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail) || normalizedEmail.length > 254) {
      res.status(400).json({ error: 'Enter a valid email address.' });
      return;
    }

    if (passwordLength < 15 || passwordLength > 128 || Buffer.byteLength(password, 'utf8') > 1024) {
      res.status(400).json({ error: 'Password must be 15 to 128 characters long.' });
      return;
    }

    if (!normalizedName || normalizedName.length > 80) {
      res.status(400).json({ error: 'Display name must be 1 to 80 characters long.' });
      return;
    }

    const existing = storageService.findUserByEmail(normalizedEmail);
    if (existing) {
      res.status(409).json({ error: 'An account with this email already exists.' });
      return;
    }

    const user = storageService.createUser(normalizedEmail, password, normalizedName);
    const token = createAuthToken(user.id);
    setSessionCookie(res, token);
    res.status(201).json({
      user: safeUser(user)
    });
  } catch (error: any) {
    res.status(500).json({ error: publicErrorMessage(error, 'Registration failed') });
  }
});

/**
 * POST /api/auth/login
 */
authRouter.post('/login', loginRateLimiter, (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (typeof email !== 'string' || typeof password !== 'string' || !email.trim() || !password || Buffer.byteLength(password, 'utf8') > 1024) {
      res.status(400).json({ error: 'Email and password are required.' });
      return;
    }

    const user = storageService.findUserByEmail(email.trim().toLowerCase());
    if (process.env.NODE_ENV === 'production' && user && DEMO_USER_IDS.has(user.id)) {
      res.status(401).json({ error: 'Invalid email or password.' });
      return;
    }
    if (!user || !storageService.verifyPassword(user.id, password)) {
      res.status(401).json({ error: 'Invalid email or password.' });
      return;
    }

    const token = createAuthToken(user.id);
    setSessionCookie(res, token);
    res.json({
      user: safeUser(user)
    });
  } catch (error: any) {
    res.status(500).json({ error: publicErrorMessage(error, 'Login failed') });
  }
});

/**
 * GET /api/auth/me
 */
authRouter.get('/me', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  res.json({ user: req.user });
});

authRouter.post('/logout', (_req: Request, res: Response) => {
  clearSessionCookie(res);
  res.status(204).end();
});

/**
 * GET /api/auth/demo-accounts
 */
authRouter.get('/demo-accounts', (req: Request, res: Response) => {
  if (process.env.NODE_ENV === 'production') {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  const users = [
    { id: 'user-anya', email: 'anya@canonstory.studio', displayName: 'Anya Sharma', demoPassword: 'anya123' },
    { id: 'user-dev', email: 'dev@canonstory.studio', displayName: 'Devraj Sen', demoPassword: 'dev123' },
    { id: 'user-guest', email: 'guest@canonstory.studio', displayName: 'Guest Writer', demoPassword: 'guest123' },
    { id: 'user-anand', email: 'anand@canonstory.studio', displayName: 'Anand', demoPassword: 'anandanand' },
    { id: 'user-anmol', email: 'anmol@canonstory.studio', displayName: 'Anmol', demoPassword: 'kakashi_op_97' },
  ];
  res.setHeader('Cache-Control', 'no-store');
  res.json(users);
});
