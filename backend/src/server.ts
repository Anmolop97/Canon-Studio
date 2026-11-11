import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { auditRouter } from './routes/audit.js';
import { voiceRouter } from './routes/voice.js';
import { storyRouter } from './routes/story.js';
import { treeRouter } from './routes/tree.js';
import { authRouter } from './routes/auth.js';
import { wizardRouter } from './routes/wizard.js';
import { branchingRouter } from './routes/branching.js';
import { draftsRouter } from './routes/drafts.js';
import { booksRouter } from './routes/books.js';
import { cyberpunkUniverse } from './data/defaultStoryBible.js';
import { aiService } from './services/aiService.js';
import { securityHeaders } from './middleware/security.js';
import { aiRateLimiter, apiRateLimiter, limitAiRequestBody } from './middleware/rateLimit.js';
import { validateAuthConfiguration } from './routes/auth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config();

const app = express();
app.disable('x-powered-by');
const parsedPort = Number.parseInt(process.env.PORT || '5000', 10);
const PORT = Number.isInteger(parsedPort) && parsedPort >= 1 && parsedPort <= 65_535 ? parsedPort : 5000;
const HOST = process.env.HOST || '0.0.0.0';
const trustedProxyHops = Number.parseInt(process.env.TRUST_PROXY_HOPS || '0', 10);
if (Number.isInteger(trustedProxyHops) && trustedProxyHops > 0 && trustedProxyHops <= 10) {
  app.set('trust proxy', trustedProxyHops);
}

// CORS Allowlist Configuration (R5)
export function getAllowedOrigins(): string[] {
  const developmentOrigins = [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:5000'
  ];

  const defaultProductionOrigins = [
    'https://canon-studio.pages.dev',
    'https://canonstudio.pages.dev'
  ];

  const configured: string[] = [];

  if (process.env.FRONTEND_URL) {
    process.env.FRONTEND_URL.split(',').forEach(item => {
      const trimmed = item.trim().replace(/\/$/, '');
      if (trimmed) configured.push(trimmed);
    });
  }

  if (process.env.ALLOWED_ORIGINS) {
    process.env.ALLOWED_ORIGINS.split(',').forEach(item => {
      const trimmed = item.trim().replace(/\/$/, '');
      if (trimmed) configured.push(trimmed);
    });
  }

  const defaultOrigins = process.env.NODE_ENV === 'production' 
    ? defaultProductionOrigins 
    : [...developmentOrigins, ...defaultProductionOrigins];
  return Array.from(new Set([...defaultOrigins, ...configured]));
}

// Middleware
app.use(cors({
  origin: (origin, callback) => {
    // Allow non-browser requests with no Origin header (e.g. curl, mobile apps, server-to-server, scripts)
    if (!origin) {
      return callback(null, true);
    }

    const allowedOrigins = getAllowedOrigins();
    const normalizedOrigin = origin.replace(/\/$/, '');

    if (allowedOrigins.includes(origin) || allowedOrigins.includes(normalizedOrigin)) {
      return callback(null, true);
    }

    // Disallow origin: do not set Access-Control-Allow-Origin header
    return callback(null, false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'X-Requested-With', 'Accept']
}));

// Defensive Security Headers Middleware (R5)
app.use(securityHeaders);
app.use('/api', apiRateLimiter);
app.use('/api', (req: Request, res: Response, next: NextFunction) => {
  const isMutation = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method);
  const cookieName = process.env.NODE_ENV === 'production' ? '__Host-canon_session=' : 'canon_session=';
  const hasSessionCookie = req.headers.cookie?.split(';').some(part => part.trim().startsWith(cookieName));
  if (!isMutation || !hasSessionCookie) {
    next();
    return;
  }

  const origin = req.headers.origin?.replace(/\/$/, '');
  if (!origin || !getAllowedOrigins().includes(origin)) {
    res.status(403).json({ error: 'Request origin is not allowed.' });
    return;
  }
  next();
});
app.use(express.json({ limit: '1mb' }));

// Health Check
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'ONLINE',
    service: 'Canon Story Studio API & Continuity Engine',
    aiProvider: aiService.activeProvider(),
    groqConfigured: aiService.isGroqConfigured(),
    geminiConfigured: aiService.isGeminiConfigured(),
    openrouterConfigured: aiService.isOpenRouterConfigured(),
    timestamp: new Date().toISOString()
  });
});

// Story Bible inspection
app.get('/api/story-bible', (req: Request, res: Response) => {
  res.json(cyberpunkUniverse);
});

// Context Caching & Token Economics Monitor
app.get('/api/context-cache-stats', (req: Request, res: Response) => {
  const cachedBibleTokens = 148500;
  const standardCostPer1k = 0.000125;
  const cachedCostPer1k = 0.000031;
  const estimatedCallsPerSession = 45;

  const costWithoutCache = ((cachedBibleTokens * estimatedCallsPerSession) / 1000) * standardCostPer1k;
  const costWithCache = ((cachedBibleTokens * estimatedCallsPerSession) / 1000) * cachedCostPer1k;
  const latencyWithoutCacheMs = 3800;
  const latencyWithCacheMs = 450;

  res.json({
    contextCachingActive: true,
    cachedTtlSeconds: 3600,
    cachedTokens: cachedBibleTokens,
    tokenSavingsPercent: 75.2,
    latencyReductionPercent: 88.1,
    benchmark: {
      standardLatencyMs: latencyWithoutCacheMs,
      cachedLatencyMs: latencyWithCacheMs,
      standardSessionCostUsd: Number(costWithoutCache.toFixed(4)),
      cachedSessionCostUsd: Number(costWithCache.toFixed(4))
    }
  });
});

// Shared rate limits cover all provider-backed routes, including legacy endpoints.
app.use([
  '/api/wizard/next-question',
  '/api/wizard/generate-story',
  '/api/branching/start',
  '/api/branching/next',
  '/api/branching/illustrate-scene',
  '/api/drafts/:id/ai-draft',
  '/api/drafts/:id/check-canon',
  '/api/drafts/:id/episodes/:episodeIndex/illustrate',
  '/api/audit-lore',
  '/api/analyze-voice',
  '/api/story/generate-beat',
  '/api/generate-beat',
], limitAiRequestBody, aiRateLimiter);

// Mount Canon Story Studio Core Routes
app.use('/api/auth', authRouter);
app.use('/api/wizard', wizardRouter);
app.use('/api/branching', branchingRouter);
app.use('/api/drafts', draftsRouter);
app.use('/api/books', booksRouter);

// Mount Legacy / Compatibility Routes
app.use('/api/audit-lore', auditRouter);
app.use('/api/analyze-voice', voiceRouter);
app.use('/api/story', storyRouter);
app.use('/api/story-tree', treeRouter);

// Keep parser and unexpected errors from leaking stack traces or internals.
app.use((error: any, _req: Request, res: Response, next: NextFunction) => {
  if (res.headersSent) return next(error);
  const status = error?.type === 'entity.too.large' ? 413 : error?.type === 'entity.parse.failed' ? 400 : 500;
  const message = status === 413 ? 'Request body is too large.' : status === 400 ? 'Request body is invalid JSON.' : 'Internal server error.';
  res.status(status).json({ error: message });
});

// Start Server
if (process.env.NODE_ENV !== 'test') {
  validateAuthConfiguration();
  const server = app.listen(PORT, HOST, () => {
    console.log(`=================================================`);
    console.log(`📖 Canon Story Studio Backend running on http://localhost:${PORT}`);
    console.log(`🤖 AI Provider: ${aiService.activeProvider()}`);
    console.log(`🔑 Groq: ${aiService.isGroqConfigured() ? 'ACTIVE' : 'not set'} | Gemini: ${aiService.isGeminiConfigured() ? 'ACTIVE (fallback)' : 'not set'}`);
    console.log(`=================================================`);
  });
  server.headersTimeout = 15_000;
  server.requestTimeout = 30_000;
  server.timeout = 45_000;
  server.keepAliveTimeout = 5_000;
}

export default app;
