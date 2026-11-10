import { Router, Request, Response, NextFunction } from 'express';
import { storageService } from '../services/storage.js';
import { User } from '../types/canonStudio.js';

export const authRouter = Router();

export interface AuthenticatedRequest extends Request {
  user?: User;
}

// Simple authentication middleware
export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    res.status(401).json({ error: 'Authentication required. Please sign in.' });
    return;
  }

  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  // Support format "user-<id>" or base64 user token
  let userId = token;
  if (token.startsWith('token-')) {
    userId = token.replace('token-', '');
  }

  const user = storageService.findUserById(userId);
  if (!user) {
    res.status(401).json({ error: 'Invalid or expired session. Please sign in again.' });
    return;
  }

  req.user = user;
  next();
}

// Optional auth helper (for likes/read status if user is logged in)
export function optionalAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (authHeader) {
    const token = authHeader.replace(/^Bearer\s+/i, '').trim();
    let userId = token;
    if (token.startsWith('token-')) {
      userId = token.replace('token-', '');
    }
    const user = storageService.findUserById(userId);
    if (user) {
      req.user = user;
    }
  }
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
    const token = `token-${user.id}`;
    res.status(201).json({
      token,
      user
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

    const token = `token-${user.id}`;
    res.json({
      token,
      user
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
authRouter.get('/demo-accounts', (req: Request, res: Response) => {
  const users = storageService.getUsers().map(u => ({
    id: u.id,
    email: u.email,
    displayName: u.displayName,
    demoPassword: u.id.replace('user-', '') + '123'
  }));
  res.json(users);
});
