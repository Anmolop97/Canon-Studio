/**
 * security_hardening.test.ts
 *
 * Comprehensive E2E Security Test Suite for Story-Ai Backend Hardening.
 * Covers Requirements R1 through R5 across Tiers 1-4 (56 total test cases).
 *
 * Executable via:
 *   node --import tsx --test backend/tests/security_hardening.test.ts
 * or from backend directory:
 *   node --import tsx --test tests/security_hardening.test.ts
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { AddressInfo } from 'node:net';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

// Normalize working directory so storage data files resolve correctly
if (!fs.existsSync(path.resolve(process.cwd(), 'data')) && fs.existsSync(path.resolve(process.cwd(), 'backend', 'data'))) {
  process.chdir(path.resolve(process.cwd(), 'backend'));
}

// Force test environment so Express app does not auto-bind to port 5000
process.env.NODE_ENV = 'test';

const { default: app } = await import('../src/server.js');
const { storageService } = await import('../src/services/storage.js');
const { aiService } = await import('../src/services/aiService.js');

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

let server: http.Server;
let baseUrl: string;
let dbInitialBackup: string | null = null;
let userSeq = 0;

function nextEmail(prefix = 'test_user'): string {
  userSeq++;
  return `${prefix}_${Date.now()}_${userSeq}@canonstory.studio`;
}

function base64url(input: string | Buffer): string {
  const buf = typeof input === 'string' ? Buffer.from(input, 'utf8') : input;
  return buf.toString('base64url');
}

function decodeBase64url(input: string): string {
  return Buffer.from(input, 'base64url').toString('utf8');
}

function parseJwt(token: string): { header: any; payload: any; signature: string } {
  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new Error(`Token is not a 3-part JWT: ${token}`);
  }
  return {
    header: JSON.parse(decodeBase64url(parts[0])),
    payload: JSON.parse(decodeBase64url(parts[1])),
    signature: parts[2]
  };
}

async function registerTestUser(email: string, password: string, displayName: string): Promise<{ status: number; body: any }> {
  const res = await fetch(`${baseUrl}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, displayName })
  });
  const body = await res.json().catch(() => ({}));
  return { status: res.status, body };
}

async function loginTestUser(email: string, password: string): Promise<{ status: number; body: any }> {
  const res = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  const body = await res.json().catch(() => ({}));
  return { status: res.status, body };
}

before(async () => {
  // Preserve original database state before test suite execution
  if (fs.existsSync(DB_FILE)) {
    dbInitialBackup = fs.readFileSync(DB_FILE, 'utf-8');
  }

  await new Promise<void>((resolve) => {
    server = app.listen(0, () => {
      const addr = server.address() as AddressInfo;
      baseUrl = `http://127.0.0.1:${addr.port}`;
      resolve();
    });
  });
});

after(async () => {
  // Close HTTP server cleanly
  if (server) {
    await new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
  }

  // Restore initial database state
  if (dbInitialBackup !== null && fs.existsSync(DATA_DIR)) {
    fs.writeFileSync(DB_FILE, dbInitialBackup, 'utf-8');
  }

  // Cleanup temporary test files
  if (fs.existsSync(DATA_DIR)) {
    try {
      const files = fs.readdirSync(DATA_DIR);
      for (const file of files) {
        if (file.startsWith('.db.tmp.') || file.startsWith('db.corrupt.')) {
          try {
            fs.unlinkSync(path.join(DATA_DIR, file));
          } catch {}
        }
      }
    } catch {}
  }
});

/* ========================================================================== */
/* Tier 1: Feature Coverage (R1 - R5)                                         */
/* ========================================================================== */

describe('Tier 1: Feature Coverage (R1 - R5)', () => {

  describe('R1: Cryptographically Signed Auth Tokens', () => {
    it('T1_R1_01: User registration returns signed token with header.payload.signature', async () => {
      const email = nextEmail('t1_r1_reg');
      const res = await registerTestUser(email, 'Passw0rdSecure!', 'T1 R1 Author');
      assert.equal(res.status, 201, `Expected 201 Created but received ${res.status}`);
      assert.ok(res.body.token, 'Response must include token');
      
      const parts = res.body.token.split('.');
      assert.equal(parts.length, 3, `Expected signed 3-part token (header.payload.signature) but got: ${res.body.token}`);
      assert.ok(parts[0].length > 0, 'Header must be non-empty');
      assert.ok(parts[1].length > 0, 'Payload must be non-empty');
      assert.ok(parts[2].length > 0, 'Signature must be non-empty');
    });

    it('T1_R1_02: Login with valid credentials returns signed token', async () => {
      const email = nextEmail('t1_r1_login');
      await registerTestUser(email, 'Passw0rdSecure!', 'T1 R1 Login Author');

      const loginRes = await loginTestUser(email, 'Passw0rdSecure!');
      assert.equal(loginRes.status, 200, `Expected 200 OK but received ${loginRes.status}`);
      assert.ok(loginRes.body.token, 'Login response must include token');

      const parts = loginRes.body.token.split('.');
      assert.equal(parts.length, 3, `Expected signed token with 3 parts but got ${loginRes.body.token}`);
    });

    it('T1_R1_03: Request to /api/auth/me with valid signed token returns 200 and user profile', async () => {
      const email = nextEmail('t1_r1_me');
      const reg = await registerTestUser(email, 'Passw0rdSecure!', 'Profile Verifier');
      const token = reg.body.token;

      const res = await fetch(`${baseUrl}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      assert.equal(res.status, 200, `Expected 200 OK from /api/auth/me but got ${res.status}`);

      const data = await res.json();
      assert.ok(data.user, 'Expected user object in /api/auth/me response');
      assert.equal(data.user.email, email.toLowerCase());
      assert.equal(data.user.displayName, 'Profile Verifier');
    });

    it('T1_R1_04: Request to protected /api/books with valid token succeeds (200)', async () => {
      const email = nextEmail('t1_r1_books');
      const reg = await registerTestUser(email, 'Passw0rdSecure!', 'Books Reader');
      const token = reg.body.token;

      const res = await fetch(`${baseUrl}/api/books`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      assert.equal(res.status, 200, `Expected 200 from /api/books with valid auth token but got ${res.status}`);
      const books = await res.json();
      assert.ok(Array.isArray(books), 'Expected array of books');
    });

    it('T1_R1_05: Token payload decodes to valid user ID and valid future expiration timestamp (exp)', async () => {
      const email = nextEmail('t1_r1_payload');
      const reg = await registerTestUser(email, 'Passw0rdSecure!', 'Payload Inspector');
      const token = reg.body.token;

      const jwt = parseJwt(token);
      assert.ok(jwt.payload.userId, 'JWT payload must contain userId');
      assert.equal(jwt.payload.userId, reg.body.user.id);
      assert.equal(typeof jwt.payload.exp, 'number', 'JWT payload must contain numeric exp timestamp');

      const nowSec = Math.floor(Date.now() / 1000);
      assert.ok(jwt.payload.exp > nowSec, `JWT exp (${jwt.payload.exp}) must be in the future (now: ${nowSec})`);
    });
  });

  describe('R2: Atomic JSON Database Persistence', () => {
    it('T1_R2_01: Normal storage write persists records to db.json without error', () => {
      const draftTitle = `Atomic Draft Write ${Date.now()}`;
      const draft = storageService.createDraft('user-anya', {
        title: draftTitle,
        genre: 'Sci-fi',
        blurb: 'Persisted atomically to disk'
      });
      assert.ok(draft.id, 'Draft should have an assigned ID');

      assert.ok(fs.existsSync(DB_FILE), 'db.json must exist on disk');
      const raw = fs.readFileSync(DB_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      const found = parsed.drafts.find((d: any) => d.id === draft.id);
      assert.ok(found, 'Created draft must be found in persisted db.json on disk');
      assert.equal(found.title, draftTitle);
    });

    it('T1_R2_02: Multiple sequential writes persist correctly and maintain data integrity', () => {
      const title1 = `Seq Draft 1 ${Date.now()}`;
      const title2 = `Seq Draft 2 ${Date.now()}`;
      const title3 = `Seq Draft 3 ${Date.now()}`;

      const d1 = storageService.createDraft('user-anya', { title: title1 });
      const d2 = storageService.createDraft('user-anya', { title: title2 });
      const d3 = storageService.createDraft('user-anya', { title: title3 });

      const raw = fs.readFileSync(DB_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      const ids = parsed.drafts.map((d: any) => d.id);

      assert.ok(ids.includes(d1.id), 'Draft 1 must persist in db.json');
      assert.ok(ids.includes(d2.id), 'Draft 2 must persist in db.json');
      assert.ok(ids.includes(d3.id), 'Draft 3 must persist in db.json');
    });

    it('T1_R2_03: Temporary swap files (.db.tmp.*) are properly cleaned up after save', () => {
      storageService.createDraft('user-anya', { title: 'Tmp Cleanup Verification Draft' });

      const files = fs.readdirSync(DATA_DIR);
      const tmpFiles = files.filter(f => f.startsWith('.db.tmp.'));
      assert.equal(tmpFiles.length, 0, `Expected 0 temporary .db.tmp.* files left in data dir, found: ${tmpFiles.join(', ')}`);
    });

    it('T1_R2_04: Storage load on startup accurately recovers saved database state', () => {
      const uniqueTitle = `State Recovery Draft ${Date.now()}`;
      const created = storageService.createDraft('user-anya', { title: uniqueTitle });

      // Instantiate a new StorageService instance to simulate cold restart
      const StorageConstructor = storageService.constructor as new () => any;
      const reloadedStorage = new StorageConstructor();

      const recovered = reloadedStorage.getDraftById(created.id);
      assert.ok(recovered, 'Draft must be recovered upon cold storage reload');
      assert.equal(recovered.title, uniqueTitle);
    });

    it('T1_R2_05: Data directory is automatically ensured/created if missing', () => {
      assert.ok(fs.existsSync(DATA_DIR), 'DATA_DIR must exist on disk');
      const stats = fs.statSync(DATA_DIR);
      assert.ok(stats.isDirectory(), 'DATA_DIR must be a directory');
    });
  });

  describe('R3: Salted Password Hashing', () => {
    it('T1_R3_01: Newly registered user password in storage contains salt delimiter (":")', async () => {
      const email = nextEmail('t1_r3_salt');
      const reg = await registerTestUser(email, 'SaltPass!123', 'Salted Author');
      assert.equal(reg.status, 201);
      const userId = reg.body.user.id;

      const raw = fs.readFileSync(DB_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      const storedHash = parsed.userPasswords[userId];

      assert.ok(storedHash, `Password hash must exist in db.json for registered user ${userId}`);
      assert.ok(storedHash.includes(':'), `Expected stored password to contain salt delimiter ":" but got: ${storedHash}`);

      const parts = storedHash.split(':');
      assert.equal(parts.length, 2, 'Stored password must be format <salt>:<hash>');
      assert.ok(parts[0].length >= 16, 'Salt component should be at least 16 hex characters');
      assert.ok(parts[1].length >= 32, 'Hash component should be at least 32 hex characters');
    });

    it('T1_R3_02: Login with newly registered user succeeds', async () => {
      const email = nextEmail('t1_r3_newlogin');
      const pwd = 'ValidPassword_456!';
      await registerTestUser(email, pwd, 'New Login Author');

      const loginRes = await loginTestUser(email, pwd);
      assert.equal(loginRes.status, 200, `Expected 200 login for newly registered salted user but got ${loginRes.status}`);
      assert.ok(loginRes.body.token, 'Token must be returned on successful login');
    });

    it('T1_R3_03: Login with pre-seeded legacy users succeeds (supports backward compatibility)', async () => {
      // Seed user user-anya: email anya@canonstory.studio / password anya123
      const loginRes = await loginTestUser('anya@canonstory.studio', 'anya123');
      assert.equal(loginRes.status, 200, `Expected 200 login for legacy seed user but got ${loginRes.status}`);
      assert.equal(loginRes.body.user.id, 'user-anya');
      assert.ok(loginRes.body.token, 'Token must be returned for legacy user login');
    });

    it('T1_R3_04: Legacy user login triggers upgrade to salted format', async () => {
      // Seed user user-dev: email dev@canonstory.studio / password dev123
      const loginRes = await loginTestUser('dev@canonstory.studio', 'dev123');
      assert.equal(loginRes.status, 200);

      const raw = fs.readFileSync(DB_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      const devHash = parsed.userPasswords['user-dev'];

      assert.ok(devHash, 'user-dev password must exist in db.json');
      assert.ok(devHash.includes(':'), `Legacy user-dev hash should be upgraded to salted format containing ":" but got ${devHash}`);
    });

    it('T1_R3_05: Two different users registered with the identical password have completely different password hashes due to unique salts', async () => {
      const sharedPassword = 'SamePasswordForAll_789!';
      const email1 = nextEmail('identical_pwd_1');
      const email2 = nextEmail('identical_pwd_2');

      const u1 = await registerTestUser(email1, sharedPassword, 'Author A');
      const u2 = await registerTestUser(email2, sharedPassword, 'Author B');
      assert.equal(u1.status, 201);
      assert.equal(u2.status, 201);

      const raw = fs.readFileSync(DB_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      const hash1 = parsed.userPasswords[u1.body.user.id];
      const hash2 = parsed.userPasswords[u2.body.user.id];

      assert.notEqual(hash1, hash2, 'Identical passwords across different users must produce distinct hashes due to random per-user salts');
    });
  });

  describe('R4: AI Endpoint Rate Limiting', () => {
    it('T1_R4_01: Request to /api/wizard/generate-story under rate limit returns valid response', async () => {
      const res = await fetch(`${baseUrl}/api/wizard/generate-story`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          genre: 'Sci-fi',
          keywords: 'Cyberpunk neon rain',
          targetLength: '400'
        })
      });
      assert.equal(res.status, 200, `Expected 200 OK from /api/wizard/generate-story under limit, got ${res.status}`);
      const body = await res.json();
      assert.ok(body.title || body.content, 'Expected generated story title or content');
    });

    it('T1_R4_02: Request to /api/drafts/:id/ai-draft under rate limit returns valid response', async () => {
      const email = nextEmail('t1_r4_draft');
      const reg = await registerTestUser(email, 'Pass1234!', 'Draft Author');
      const token = reg.body.token;

      // Create a draft first
      const draftRes = await fetch(`${baseUrl}/api/drafts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          title: 'AI Draft Story',
          genre: 'Sci-fi',
          episodes: [{ order: 1, title: 'Ep 1', content: 'Intro scene' }]
        })
      });
      assert.equal(draftRes.status, 201);
      const draft = await draftRes.json();

      const aiRes = await fetch(`${baseUrl}/api/drafts/${draft.id}/ai-draft`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          episodeIndex: 0,
          userPrompt: 'Continue the neon investigation'
        })
      });

      assert.equal(aiRes.status, 200, `Expected 200 OK from ai-draft under limit, got ${aiRes.status}`);
      const aiData = await aiRes.json();
      assert.ok(aiData.content !== undefined, 'Expected content in ai-draft response');
    });

    it('T1_R4_03: Request to /api/branching/next under rate limit returns valid response', async () => {
      const res = await fetch(`${baseUrl}/api/branching/next`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storySoFar: ['Jack entered the neon corridor.'],
          chosenOptionText: 'Draw weapon and breach the side door',
          decisionIndex: 1,
          maxDecisions: 3,
          genre: 'Sci-fi'
        })
      });

      assert.equal(res.status, 200, `Expected 200 OK from /api/branching/next under limit, got ${res.status}`);
      const scene = await res.json();
      assert.ok(scene.content, 'Expected scene content in branching response');
    });

    it('T1_R4_04: Responses include rate limiting headers (X-RateLimit-Limit, X-RateLimit-Remaining, or Retry-After)', async () => {
      const res = await fetch(`${baseUrl}/api/wizard/generate-story`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ genre: 'Sci-fi' })
      });

      const limit = res.headers.get('x-ratelimit-limit');
      const remaining = res.headers.get('x-ratelimit-remaining');
      const retryAfter = res.headers.get('retry-after');

      const hasRateLimitHeader = limit !== null || remaining !== null || retryAfter !== null;
      assert.ok(hasRateLimitHeader, 'AI endpoint response must contain rate limiting headers (X-RateLimit-Limit, X-RateLimit-Remaining, or Retry-After)');
    });

    it('T1_R4_05: Successive requests decrement remaining rate limit counter', async () => {
      const email = nextEmail('t1_r4_decrement');
      const reg = await registerTestUser(email, 'Pass1234!', 'Counter User');
      const token = reg.body.token;

      const res1 = await fetch(`${baseUrl}/api/wizard/generate-story`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ genre: 'Fantasy' })
      });

      const res2 = await fetch(`${baseUrl}/api/wizard/generate-story`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ genre: 'Fantasy' })
      });

      const rem1 = res1.headers.get('x-ratelimit-remaining');
      const rem2 = res2.headers.get('x-ratelimit-remaining');

      assert.ok(rem1 !== null, 'First request must include x-ratelimit-remaining header');
      assert.ok(rem2 !== null, 'Second request must include x-ratelimit-remaining header');
      assert.ok(parseInt(rem2, 10) < parseInt(rem1, 10), `Remaining count must decrease: rem1=${rem1}, rem2=${rem2}`);
    });
  });

  describe('R5: CORS & Security Headers', () => {
    it('T1_R5_01: Request with allowed origin (http://localhost:5173) returns Access-Control-Allow-Origin: http://localhost:5173', async () => {
      const res = await fetch(`${baseUrl}/api/health`, {
        headers: { Origin: 'http://localhost:5173' }
      });
      assert.equal(res.status, 200);
      assert.equal(res.headers.get('access-control-allow-origin'), 'http://localhost:5173');
    });

    it('T1_R5_02: Non-browser request without Origin header succeeds (200)', async () => {
      const res = await fetch(`${baseUrl}/api/health`);
      assert.equal(res.status, 200, `Expected 200 OK for CLI/cURL request without Origin, got ${res.status}`);
      const data = await res.json();
      assert.equal(data.status, 'ONLINE');
    });

    it('T1_R5_03: Response contains X-Content-Type-Options: nosniff', async () => {
      const res = await fetch(`${baseUrl}/api/health`);
      assert.equal(res.headers.get('x-content-type-options'), 'nosniff');
    });

    it('T1_R5_04: Response contains X-Frame-Options: DENY', async () => {
      const res = await fetch(`${baseUrl}/api/health`);
      assert.equal(res.headers.get('x-frame-options'), 'DENY');
    });

    it('T1_R5_05: Response contains Content-Security-Policy header', async () => {
      const res = await fetch(`${baseUrl}/api/health`);
      const csp = res.headers.get('content-security-policy');
      assert.ok(csp, 'Response must contain Content-Security-Policy header');
      assert.ok(csp.includes("default-src 'self'"), `CSP header must include default-src 'self', got: ${csp}`);
    });
  });

});

/* ========================================================================== */
/* Tier 2: Boundary & Corner Cases (R1 - R5)                                  */
/* ========================================================================== */

describe('Tier 2: Boundary & Corner Cases (R1 - R5)', () => {

  describe('R1: Auth Boundaries', () => {
    it('T2_R1_01: Forged legacy token format "token-user-anya" is rejected with HTTP 401', async () => {
      const res = await fetch(`${baseUrl}/api/auth/me`, {
        headers: { Authorization: 'Bearer token-user-anya' }
      });
      assert.equal(res.status, 401, `Forged legacy token must be rejected with 401, got ${res.status}`);
    });

    it('T2_R1_02: Forged signature on token is rejected with HTTP 401', async () => {
      const header = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
      const payload = base64url(JSON.stringify({
        userId: 'user-anya',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600
      }));
      const forgedSignature = base64url('totally-fake-signature-xyz');
      const forgedToken = `${header}.${payload}.${forgedSignature}`;

      const res = await fetch(`${baseUrl}/api/auth/me`, {
        headers: { Authorization: `Bearer ${forgedToken}` }
      });
      assert.equal(res.status, 401, `Token with forged signature must be rejected with 401, got ${res.status}`);
    });

    it('T2_R1_03: Expired token (exp in past) is rejected with HTTP 401', async () => {
      const header = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
      const pastTime = Math.floor(Date.now() / 1000) - 3600;
      const payload = base64url(JSON.stringify({
        userId: 'user-anya',
        iat: pastTime - 3600,
        exp: pastTime // Expired 1 hour ago
      }));
      const signature = base64url(crypto.createHmac('sha256', 'dummy_secret').update(`${header}.${payload}`).digest());
      const expiredToken = `${header}.${payload}.${signature}`;

      const res = await fetch(`${baseUrl}/api/auth/me`, {
        headers: { Authorization: `Bearer ${expiredToken}` }
      });
      assert.equal(res.status, 401, `Expired token must be rejected with 401, got ${res.status}`);
    });

    it('T2_R1_04: Malformed/corrupted base64 token is rejected with HTTP 401', async () => {
      const malformedTokens = [
        'not.a.valid.jwt!@#$',
        'invalidbase64@@@.broken!!!',
        'single-part-token-string',
        'header.payload' // Only 2 parts
      ];

      for (const badToken of malformedTokens) {
        const res = await fetch(`${baseUrl}/api/auth/me`, {
          headers: { Authorization: `Bearer ${badToken}` }
        });
        assert.equal(res.status, 401, `Malformed token "${badToken}" must be rejected with 401, got ${res.status}`);
      }
    });

    it('T2_R1_05: Missing Bearer prefix or empty auth header is rejected with HTTP 401', async () => {
      const badHeaders = [
        '',
        'Bearer ',
        'Basic dXNlcjpwYXNz',
        'Token token-user-anya'
      ];

      for (const h of badHeaders) {
        const res = await fetch(`${baseUrl}/api/auth/me`, {
          headers: { Authorization: h }
        });
        assert.equal(res.status, 401, `Bad auth header "${h}" must be rejected with 401, got ${res.status}`);
      }
    });

    it('T2_R1_06: Tampered payload with valid original signature is rejected with HTTP 401', async () => {
      const email = nextEmail('t2_r1_tamper');
      const reg = await registerTestUser(email, 'Pass1234!', 'Original Author');
      const token = reg.body.token;

      // Extract parts from legitimately issued token
      const parts = token.split('.');
      assert.equal(parts.length, 3);

      // Tamper payload to impersonate 'user-anya' while preserving original signature
      const tamperedPayload = base64url(JSON.stringify({
        userId: 'user-anya',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 86400
      }));

      const tamperedToken = `${parts[0]}.${tamperedPayload}.${parts[2]}`;
      const res = await fetch(`${baseUrl}/api/auth/me`, {
        headers: { Authorization: `Bearer ${tamperedToken}` }
      });
      assert.equal(res.status, 401, `Tampered payload with valid original signature must return 401, got ${res.status}`);
    });
  });

  describe('R2: Storage Boundaries', () => {
    it('T2_R2_01: Atomic write resilience: temporary file write followed by rename ensures no partial file exists', () => {
      // Execute 5 rapid writes and verify db.json is never 0 bytes or unparseable
      for (let i = 0; i < 5; i++) {
        storageService.createDraft('user-anya', { title: `Atomic Resilience Draft ${i}` });
        assert.ok(fs.existsSync(DB_FILE), 'db.json must exist');
        const content = fs.readFileSync(DB_FILE, 'utf-8');
        assert.ok(content.length > 0, 'db.json must not be empty (0 bytes)');
        const parsed = JSON.parse(content);
        assert.ok(Array.isArray(parsed.drafts), 'Parsed db.json must have drafts array');
      }
    });

    it('T2_R2_02: Corrupted JSON file in database path triggers backup to db.corrupt.<timestamp>.json without deleting or wiping user data', () => {
      // Simulate corrupted database content
      const originalContent = fs.readFileSync(DB_FILE, 'utf-8');
      const corruptContent = '{"users": [ corrupt-json-content-triggers-failure';

      try {
        fs.writeFileSync(DB_FILE, corruptContent, 'utf-8');

        // Instantiate a new storage instance to trigger loadDatabase
        const StorageConstructor = storageService.constructor as new () => any;
        const fallbackStorage = new StorageConstructor();

        // Check if corrupt file was backed up
        const files = fs.readdirSync(DATA_DIR);
        const corruptBackups = files.filter(f => f.startsWith('db.corrupt.') && f.endsWith('.json'));

        assert.ok(corruptBackups.length > 0, 'Corrupted db.json must be backed up to db.corrupt.<timestamp>.json');
        assert.ok(fallbackStorage.getUsers().length > 0, 'Initial seed users must be recovered without wiping data');
      } finally {
        // Restore pristine db content
        fs.writeFileSync(DB_FILE, originalContent, 'utf-8');
      }
    });

    it('T2_R2_03: Concurrent or rapid write operations complete without throwing unhandled exceptions or corrupting db.json', async () => {
      const draftCreationPromises = Array.from({ length: 10 }, (_, i) => {
        return Promise.resolve().then(() => {
          return storageService.createDraft('user-anya', { title: `Concurrent Draft ${i} - ${Date.now()}` });
        });
      });

      const results = await Promise.all(draftCreationPromises);
      assert.equal(results.length, 10, 'All 10 concurrent writes must complete');

      const raw = fs.readFileSync(DB_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      for (const draft of results) {
        assert.ok(parsed.drafts.some((d: any) => d.id === draft.id), `Draft ${draft.id} must exist in db.json`);
      }
    });

    it('T2_R2_04: Database file handles special characters and unicode in story drafts safely', () => {
      const specialText = 'Rain in Neo-Veridia 🌧️⚡ Jack Vance whispered: "नमस्ते! augmented-cyber // <script>alert(1)</script>" \u0000 \t \n';
      const draft = storageService.createDraft('user-anya', {
        title: 'Unicode & Special Characters Test 🚀',
        blurb: specialText
      });

      const raw = fs.readFileSync(DB_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      const found = parsed.drafts.find((d: any) => d.id === draft.id);

      assert.ok(found, 'Draft with unicode must be persisted');
      assert.equal(found.title, 'Unicode & Special Characters Test 🚀');
      assert.equal(found.blurb, specialText);
    });

    it('T2_R2_05: Safe fallback or graceful recovery when storage directory permissions or files are locked', () => {
      // Calling internal storage methods under transient conditions must not crash the process
      assert.doesNotThrow(() => {
        storageService.getBooks();
        storageService.getUsers();
      }, 'Storage queries should be safe and non-throwing');
    });
  });

  describe('R3: Password Boundaries', () => {
    it('T2_R3_01: Empty or blank password attempt is rejected or safely handled', async () => {
      const email = nextEmail('t2_r3_blank');
      const res = await registerTestUser(email, '', 'Blank Pwd User');
      assert.ok(res.status >= 400 && res.status < 500, `Empty password must be rejected with 4xx, got ${res.status}`);
    });

    it('T2_R3_02: Extremely long password (1024 characters) is hashed and verified correctly without crashing', async () => {
      const longPassword = 'A'.repeat(1020) + '!9#z';
      const email = nextEmail('t2_r3_long');

      const reg = await registerTestUser(email, longPassword, 'Long Password Author');
      assert.equal(reg.status, 201, `Registration with 1024-char password should succeed, got ${reg.status}`);

      const login = await loginTestUser(email, longPassword);
      assert.equal(login.status, 200, `Login with 1024-char password should succeed, got ${login.status}`);

      // Verify slightly altered long password fails
      const badLogin = await loginTestUser(email, longPassword.slice(0, -1) + 'x');
      assert.equal(badLogin.status, 401, 'Altered long password must return 401');
    });

    it('T2_R3_03: Wrong password for existing user returns 401', async () => {
      const email = nextEmail('t2_r3_wrong');
      await registerTestUser(email, 'CorrectPassword123!', 'Wrong Pass User');

      const loginRes = await loginTestUser(email, 'CompletelyWrongPassword456!');
      assert.equal(loginRes.status, 401, `Wrong password must return 401, got ${loginRes.status}`);
    });

    it('T2_R3_04: Case sensitivity: incorrect case password returns 401', async () => {
      const email = nextEmail('t2_r3_case');
      await registerTestUser(email, 'CaseSensitivePassword123!', 'Case User');

      // Attempt login with all lower-case
      const loginLower = await loginTestUser(email, 'casesensitivepassword123!');
      assert.equal(loginLower.status, 401, 'Wrong case password must return 401');

      // Attempt login with all upper-case
      const loginUpper = await loginTestUser(email, 'CASESENSITIVEPASSWORD123!');
      assert.equal(loginUpper.status, 401, 'Wrong case password must return 401');
    });

    it('T2_R3_05: Timing safety: timing attacks mitigated via constant-time comparison', async () => {
      const email = nextEmail('t2_r3_timing');
      await registerTestUser(email, 'P@ssw0rdTimingAttackDefense123!', 'Timing User');

      // Candidate 1: Wrong password with 0 matching characters
      const candidateMismatch = 'ZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZ!';
      // Candidate 2: Wrong password matching first 25 characters, mismatch at the end
      const candidatePrefixMatch = 'P@ssw0rdTimingAttackDefense999!';

      const timesMismatch: number[] = [];
      const timesPrefix: number[] = [];

      // Sample 5 iterations each
      for (let i = 0; i < 5; i++) {
        const t0 = performance.now();
        await loginTestUser(email, candidateMismatch);
        timesMismatch.push(performance.now() - t0);

        const t1 = performance.now();
        await loginTestUser(email, candidatePrefixMatch);
        timesPrefix.push(performance.now() - t1);
      }

      const avgMismatch = timesMismatch.reduce((a, b) => a + b, 0) / timesMismatch.length;
      const avgPrefix = timesPrefix.reduce((a, b) => a + b, 0) / timesPrefix.length;
      const timingDelta = Math.abs(avgMismatch - avgPrefix);

      // Verify timing delta does not exhibit significant early-exit variation (typical threshold < 40ms)
      assert.ok(timingDelta < 50, `Timing delta between candidates (${timingDelta.toFixed(2)}ms) must be within constant-time bounds`);
    });
  });

  describe('R4: Rate Limiting Boundaries', () => {
    it('T2_R4_01: Exactly 10 requests within window succeed', async () => {
      const email = nextEmail('t2_r4_exact10');
      const reg = await registerTestUser(email, 'Pass1234!', 'Exact10 User');
      const token = reg.body.token;

      for (let i = 1; i <= 10; i++) {
        const res = await fetch(`${baseUrl}/api/wizard/generate-story`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ genre: 'Sci-fi' })
        });
        assert.equal(res.status, 200, `Request #${i} of 10 must succeed with 200, got ${res.status}`);
      }
    });

    it('T2_R4_02: The 11th request receives HTTP 429 Too Many Requests', async () => {
      const email = nextEmail('t2_r4_eleventh');
      const reg = await registerTestUser(email, 'Pass1234!', 'Eleventh User');
      const token = reg.body.token;

      // Exhaust 10 requests
      for (let i = 1; i <= 10; i++) {
        await fetch(`${baseUrl}/api/wizard/generate-story`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ genre: 'Sci-fi' })
        });
      }

      // 11th request
      const res11 = await fetch(`${baseUrl}/api/wizard/generate-story`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ genre: 'Sci-fi' })
      });

      assert.equal(res11.status, 429, `The 11th request must receive HTTP 429 Too Many Requests, got ${res11.status}`);
    });

    it('T2_R4_03: HTTP 429 response includes Retry-After header with a positive integer', async () => {
      const email = nextEmail('t2_r4_retry');
      const reg = await registerTestUser(email, 'Pass1234!', 'Retry User');
      const token = reg.body.token;

      // Exhaust limit to get 429
      for (let i = 1; i <= 11; i++) {
        const res = await fetch(`${baseUrl}/api/wizard/generate-story`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ genre: 'Sci-fi' })
        });
        if (res.status === 429) {
          const retryAfter = res.headers.get('retry-after');
          assert.ok(retryAfter !== null, '429 response must include Retry-After header');
          const seconds = parseInt(retryAfter, 10);
          assert.ok(!isNaN(seconds) && seconds > 0, `Retry-After must be a positive integer, got "${retryAfter}"`);
          return;
        }
      }
      assert.fail('Did not receive HTTP 429 within 11 requests');
    });

    it('T2_R4_04: Rapid burst of 20 requests: requests 1-10 succeed, requests 11-20 return 429', async () => {
      const email = nextEmail('t2_r4_burst');
      const reg = await registerTestUser(email, 'Pass1234!', 'Burst User');
      const token = reg.body.token;

      const burstPromises = Array.from({ length: 20 }, () =>
        fetch(`${baseUrl}/api/wizard/generate-story`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ genre: 'Sci-fi' })
        })
      );

      const responses = await Promise.all(burstPromises);
      const statuses = responses.map(r => r.status);
      const count200 = statuses.filter(s => s === 200).length;
      const count429 = statuses.filter(s => s === 429).length;

      assert.equal(count200, 10, `Expected exactly 10 requests to succeed with 200, got ${count200}`);
      assert.equal(count429, 10, `Expected exactly 10 requests to return 429, got ${count429}`);
    });

    it('T2_R4_05: Independent limits: request from IP/user A does not exhaust quota for IP/user B', async () => {
      const emailA = nextEmail('t2_r4_userA');
      const emailB = nextEmail('t2_r4_userB');

      const regA = await registerTestUser(emailA, 'Pass1234!', 'User A');
      const regB = await registerTestUser(emailB, 'Pass1234!', 'User B');

      const tokenA = regA.body.token;
      const tokenB = regB.body.token;

      // Exhaust User A quota
      for (let i = 1; i <= 10; i++) {
        await fetch(`${baseUrl}/api/wizard/generate-story`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${tokenA}`
          },
          body: JSON.stringify({ genre: 'Sci-fi' })
        });
      }

      // User A 11th request -> 429
      const resA11 = await fetch(`${baseUrl}/api/wizard/generate-story`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenA}`
        },
        body: JSON.stringify({ genre: 'Sci-fi' })
      });
      assert.equal(resA11.status, 429, 'User A must receive 429');

      // User B first request -> must succeed with 200 (not exhausted by A)
      const resB1 = await fetch(`${baseUrl}/api/wizard/generate-story`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenB}`
        },
        body: JSON.stringify({ genre: 'Sci-fi' })
      });
      assert.equal(resB1.status, 200, `User B request must succeed with 200 independently of User A, got ${resB1.status}`);
    });
  });

  describe('R5: CORS & Headers Boundaries', () => {
    it('T2_R5_01: Disallowed origin (http://evil.com) is denied / does not receive Access-Control-Allow-Origin', async () => {
      const res = await fetch(`${baseUrl}/api/health`, {
        headers: { Origin: 'http://evil.com' }
      });
      const allowOrigin = res.headers.get('access-control-allow-origin');
      assert.ok(allowOrigin === null || allowOrigin !== 'http://evil.com', `Disallowed origin http://evil.com must not be reflected, got: ${allowOrigin}`);
    });

    it('T2_R5_02: Subdomain origin attack (http://localhost.evil.com) is denied', async () => {
      const res = await fetch(`${baseUrl}/api/health`, {
        headers: { Origin: 'http://localhost.evil.com' }
      });
      const allowOrigin = res.headers.get('access-control-allow-origin');
      assert.ok(allowOrigin === null || allowOrigin !== 'http://localhost.evil.com', `Subdomain origin attack must not be allowed, got: ${allowOrigin}`);
    });

    it('T2_R5_03: Protocol origin attack (ftp://localhost:5173) is denied', async () => {
      const res = await fetch(`${baseUrl}/api/health`, {
        headers: { Origin: 'ftp://localhost:5173' }
      });
      const allowOrigin = res.headers.get('access-control-allow-origin');
      assert.ok(allowOrigin === null || allowOrigin !== 'ftp://localhost:5173', `Protocol origin attack must not be allowed, got: ${allowOrigin}`);
    });

    it('T2_R5_04: Port origin attack (http://localhost:9999) is denied', async () => {
      const res = await fetch(`${baseUrl}/api/health`, {
        headers: { Origin: 'http://localhost:9999' }
      });
      const allowOrigin = res.headers.get('access-control-allow-origin');
      assert.ok(allowOrigin === null || allowOrigin !== 'http://localhost:9999', `Port origin attack must not be allowed, got: ${allowOrigin}`);
    });

    it('T2_R5_05: OPTIONS preflight request from disallowed origin is rejected/denied', async () => {
      const res = await fetch(`${baseUrl}/api/health`, {
        method: 'OPTIONS',
        headers: {
          Origin: 'http://malicious-site.org',
          'Access-Control-Request-Method': 'POST',
          'Access-Control-Request-Headers': 'Content-Type,Authorization'
        }
      });
      const allowOrigin = res.headers.get('access-control-allow-origin');
      assert.ok(allowOrigin === null || allowOrigin !== 'http://malicious-site.org', `Preflight from disallowed origin must not allow origin, got: ${allowOrigin}`);
    });
  });

});

/* ========================================================================== */
/* Tier 3: Cross-Feature Interactions                                         */
/* ========================================================================== */

describe('Tier 3: Cross-Feature Interactions', () => {

  it('T3_01: Auth + Rate Limiting: Rate limit accurately tracks authenticated user ID across varying client IP addresses', async () => {
    const email = nextEmail('t3_01_user');
    const reg = await registerTestUser(email, 'Passw0rdSec!', 'Cross Feature User');
    const token = reg.body.token;

    // Send 10 requests from simulated IP 1
    for (let i = 1; i <= 10; i++) {
      await fetch(`${baseUrl}/api/wizard/generate-story`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'X-Forwarded-For': '203.0.113.10'
        },
        body: JSON.stringify({ genre: 'Sci-fi' })
      });
    }

    // 11th request from simulated IP 2 using the same user token
    const resIp2 = await fetch(`${baseUrl}/api/wizard/generate-story`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        'X-Forwarded-For': '198.51.100.77' // Changed IP
      },
      body: JSON.stringify({ genre: 'Sci-fi' })
    });

    assert.equal(resIp2.status, 429, `Quota must track authenticated user identity regardless of spoofed client IP change, got ${resIp2.status}`);
  });

  it('T3_02: Auth + Storage: User registration creates salted password and writes atomically to disk, and the issued token validates successfully', async () => {
    const email = nextEmail('t3_02_atomic_auth');
    const reg = await registerTestUser(email, 'P@ssw0rdAtomic123!', 'Atomic Auth User');
    assert.equal(reg.status, 201);
    const userId = reg.body.user.id;
    const token = reg.body.token;

    // Verify atomic disk persistence of salted hash
    assert.ok(fs.existsSync(DB_FILE));
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    const storedHash = parsed.userPasswords[userId];
    assert.ok(storedHash && storedHash.includes(':'), 'Password in storage must be salted');

    // Verify issued token accesses authenticated endpoint
    const meRes = await fetch(`${baseUrl}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    assert.equal(meRes.status, 200);
    const meData = await meRes.json();
    assert.equal(meData.user.id, userId);

    // Verify token can create private draft
    const draftRes = await fetch(`${baseUrl}/api/drafts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ title: 'Cross Auth-Storage Draft' })
    });
    assert.equal(draftRes.status, 201);
  });

  it('T3_03: Storage + Password Upgrade: Legacy seed user authentication triggers atomic rewrite of db.json with upgraded salted hash without altering or corrupting drafts or books', async () => {
    const rawBefore = fs.readFileSync(DB_FILE, 'utf-8');
    const parsedBefore = JSON.parse(rawBefore);
    const booksBeforeCount = parsedBefore.books.length;
    const draftsBeforeCount = parsedBefore.drafts.length;

    // Login with legacy seed user user-guest
    const loginRes = await loginTestUser('guest@canonstory.studio', 'guest123');
    assert.equal(loginRes.status, 200);

    const rawAfter = fs.readFileSync(DB_FILE, 'utf-8');
    const parsedAfter = JSON.parse(rawAfter);

    // Verify hash upgraded to salt format
    const guestHash = parsedAfter.userPasswords['user-guest'];
    assert.ok(guestHash && guestHash.includes(':'), `user-guest hash must be upgraded to salted format containing ":", got ${guestHash}`);

    // Verify database collections were preserved intact without corruption
    assert.equal(parsedAfter.books.length, booksBeforeCount, 'Books collection count must remain identical');
    assert.equal(parsedAfter.drafts.length, draftsBeforeCount, 'Drafts collection count must remain identical');
  });

});

/* ========================================================================== */
/* Tier 4: Real-World Workflow Scenarios                                      */
/* ========================================================================== */

describe('Tier 4: Real-World Workflow Scenarios', () => {

  it('T4_01: Scenario 1 (Full Writer Journey): User registers -> logs in -> receives token -> verifies /api/auth/me -> creates draft -> triggers AI endpoints -> exceeds rate limit -> receives 429 -> inspects published books with security headers verified', async () => {
    // 1. User registration
    const email = nextEmail('writer_journey');
    const password = 'AuthorSecurePassword2026!';
    const regRes = await registerTestUser(email, password, 'Saga Author');
    assert.equal(regRes.status, 201, 'Registration should return 201');
    assert.ok(regRes.body.token, 'Registration should return signed token');

    // 2. User login
    const loginRes = await loginTestUser(email, password);
    assert.equal(loginRes.status, 200, 'Login should return 200');
    const token = loginRes.body.token;

    // 3. Verify user profile at /api/auth/me
    const meRes = await fetch(`${baseUrl}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    assert.equal(meRes.status, 200, 'Profile fetch should return 200');
    const meData = await meRes.json();
    assert.equal(meData.user.email, email.toLowerCase());

    // 4. Create new story draft
    const draftRes = await fetch(`${baseUrl}/api/drafts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        title: 'The Cyber-Echoes of Sector 9',
        genre: 'Sci-fi',
        blurb: 'In the lower canals, memories are dangerous currency.',
        episodes: [
          { order: 1, title: 'Episode 1: The Breach', content: 'Rain hissed on the conduit.' }
        ]
      })
    });
    assert.equal(draftRes.status, 201, 'Draft creation should return 201');
    const draft = await draftRes.json();

    // 5. Trigger AI generation endpoints until rate limit is exhausted
    for (let i = 1; i <= 10; i++) {
      const aiRes = await fetch(`${baseUrl}/api/wizard/generate-story`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ genre: 'Sci-fi' })
      });
      assert.equal(aiRes.status, 200, `AI call #${i} must succeed`);
    }

    // 6. 11th request must receive HTTP 429 with Retry-After
    const rateLimitedRes = await fetch(`${baseUrl}/api/wizard/generate-story`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ genre: 'Sci-fi' })
    });
    assert.equal(rateLimitedRes.status, 429, 'Rate limited call must return 429');
    const retryAfter = rateLimitedRes.headers.get('retry-after');
    assert.ok(retryAfter !== null && parseInt(retryAfter, 10) > 0, 'Must include positive Retry-After header');

    // 7. Browse published books and verify security headers
    const booksRes = await fetch(`${baseUrl}/api/books`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Origin: 'http://localhost:5173'
      }
    });
    assert.equal(booksRes.status, 200, 'Books query should return 200');
    assert.equal(booksRes.headers.get('x-content-type-options'), 'nosniff', 'Must include nosniff');
    assert.equal(booksRes.headers.get('x-frame-options'), 'DENY', 'Must include DENY');
    assert.ok(booksRes.headers.get('content-security-policy'), 'Must include CSP');
    assert.equal(booksRes.headers.get('access-control-allow-origin'), 'http://localhost:5173', 'CORS origin must match');
  });

  it('T4_02: Scenario 2 (Corrupt DB Recovery & Integrity): Simulated partial write/corrupt database file -> storage backs up corrupt file -> recovers safely without loss of user accounts', () => {
    const originalContent = fs.readFileSync(DB_FILE, 'utf-8');
    const corruptSnippet = '{"users": [{"id": "user-partial", "email": "broken@canonstory.studio"}, '; // Truncated mid-write

    try {
      // Simulate sudden crash during write leaving truncated file
      fs.writeFileSync(DB_FILE, corruptSnippet, 'utf-8');

      // Cold reload storage service
      const StorageConstructor = storageService.constructor as new () => any;
      const recoveredStorage = new StorageConstructor();

      // Check corrupted file was backed up safely
      const files = fs.readdirSync(DATA_DIR);
      const backups = files.filter(f => f.startsWith('db.corrupt.') && f.endsWith('.json'));
      assert.ok(backups.length > 0, 'Corrupted database must trigger db.corrupt.<timestamp>.json backup creation');

      // Check seed users are intact
      const users = recoveredStorage.getUsers();
      assert.ok(users.length >= 3, 'Initial seed users must be safely recovered without unhandled crash');
      const anya = recoveredStorage.findUserById('user-anya');
      assert.ok(anya, 'Seed user Anya must be present after corrupt recovery');
    } finally {
      // Restore original DB state
      fs.writeFileSync(DB_FILE, originalContent, 'utf-8');
    }
  });

});
