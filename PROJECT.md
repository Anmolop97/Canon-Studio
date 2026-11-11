# Project: Story-Ai Backend Hardening

## Architecture
- **Runtime & Framework**: Node.js `v22.23.3` (ESM, NodeNext module resolution), Express `^4.21.2`, TypeScript `^5.7.3`.
- **Database & Storage**: In-memory store backed by synchronous JSON persistence at `backend/data/db.json` via `backend/src/services/storage.ts`.
- **Authentication**: Token-based auth in `backend/src/routes/auth.ts`, protecting `/api/drafts` and `/api/books` routes via `requireAuth` / `optionalAuth`.
- **AI Services**: Router endpoints `/api/wizard/generate-story`, `/api/drafts/:id/ai-draft`, and `/api/branching/next` calling Gemini / Groq with heuristic fallbacks.
- **Entrypoint**: `backend/src/server.ts` exporting Express `app`.

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Cryptographically Signed Auth Tokens (R1) | Replace `token-${user.id}` with HMAC-SHA256 tokens carrying expiry timestamp; reject forged, tampered, or expired tokens with HTTP 401 | M1 | Survey / ORIGINAL_REQUEST §R1 |
| 2 | Atomic JSON Database Persistence (R2) | Write DB data to temp file in `backend/data/` then atomically rename to `db.json` with retry backoff and corrupt backup, preventing data wipe on crash | M2 | Survey / ORIGINAL_REQUEST §R2 |
| 3 | Salted Password Hashing (R3) | Replace unsalted SHA-256 with PBKDF2 (100,000 iterations, 16-byte random salt, SHA-512) stored as `salt:hash`; auto-migrate legacy seed users | M2 | Survey / ORIGINAL_REQUEST §R3 |
| 4 | AI Generation Rate Limiting (R4) | Sliding window rate limiting middleware returning HTTP 429 on `/api/wizard/generate-story`, `/api/drafts/:id/ai-draft`, and `/api/branching/next` | M3 | Survey / ORIGINAL_REQUEST §R4 |
| 5 | Restrictive CORS & Security Headers (R5) | Replace wildcard `origin: '*'` with allowlist validator; set `X-Content-Type-Options`, `X-Frame-Options`, `Content-Security-Policy` | M3 | Survey / ORIGINAL_REQUEST §R5 |
| 6 | E2E Security Test Suite | Comprehensive opaque-box and integration test suite verifying all 5 requirements with pass/fail exit code 0 | E2E Track | Survey / ORIGINAL_REQUEST Acceptance Criteria |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| E2E | E2E Security Testing Suite | Create automated E2E test suite in `backend/tests/security_hardening.test.ts` testing R1-R5 | None | IN_PROGRESS |
| M1 | Authentication Hardening (R1) | Implement HMAC-SHA256 signed tokens, expiry checks, and HTTP 401 rejections in `backend/src/routes/auth.ts` | None | PLANNED |
| M2 | Storage & Credential Hardening (R2 & R3) | Implement atomic JSON persistence (`fs.renameSync` + retry) and salted PBKDF2 password hashing with legacy migration in `backend/src/services/storage.ts` | None | PLANNED |
| M3 | Server Security, CORS & Rate Limiting (R4 & R5) | Implement rate limiting middleware and security headers + restricted CORS in `backend/src/server.ts` | None | PLANNED |
| M4 | Final Verification & Adversarial Hardening | Execute 100% of E2E test suite (Tiers 1-4), execute Tier 5 adversarial tests, conduct Forensic Integrity Audit | E2E, M1, M2, M3 | PLANNED |

## Interface Contracts

### Auth Tokens (`backend/src/routes/auth.ts`)
- **Token Format**: Standard HMAC-SHA256 token string: `base64url(header).base64url(payload).base64url(signature)`
- **Payload Schema**:
  ```typescript
  interface AuthTokenPayload {
    userId: string;
    iat: number; // Unix timestamp in seconds
    exp: number; // Unix timestamp in seconds (default: 7 days, configurable)
  }
  ```
- **Validation**:
  - `requireAuth`: Verify signature using `crypto.timingSafeEqual`. Check `exp >= Math.floor(Date.now() / 1000)`. If missing, forged, invalid signature, or expired -> HTTP 401 `{ error: 'Unauthorized: Invalid or expired token' }`.
  - `optionalAuth`: Verify signature and expiry if token header present; if invalid or expired, set `req.user = undefined` (or return 401 if malformed header).
  - Return `{ token, user }` from `/register` and `/login`.

### Storage & Persistence (`backend/src/services/storage.ts`)
- **Atomic Write Contract**:
  - Temp file pattern: `path.join(DATA_DIR, `.db.tmp.${Date.now()}_${crypto.randomBytes(4).toString('hex')}.json`)`
  - Flush to disk via `fs.fsyncSync` or atomic write.
  - Rename to `DB_FILE` via `fs.renameSync`.
  - Windows retry backoff (up to 5 retries with 25ms delay) to handle transient file lock conditions.
- **Corrupt File Protection**:
  - In `loadDatabase()`, if `JSON.parse` fails, backup the corrupted file to `db.corrupt.<timestamp>.json` before any seed fallback, logging error.
- **Salted Password Contract**:
  - Stored format in `userPasswords: Record<string, string>`: `<salt_hex>:<hash_hex>`
  - Algorithm: `crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex')`
  - Salt: `crypto.randomBytes(16).toString('hex')`
  - Verification: Split stored hash by `:`. If colon present, hash candidate with salt and compare using `crypto.timingSafeEqual`. If no colon (legacy 64-char SHA-256), compare with SHA-256; if matched, upgrade in-memory and trigger atomic save.

### Server Endpoints & Headers (`backend/src/server.ts`)
- **CORS Contract**:
  - Allowed origins: `['http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:3000', 'http://127.0.0.1:3000', 'http://localhost:5000']` plus origins specified in `process.env.FRONTEND_URL` and `process.env.ALLOWED_ORIGINS`.
  - Permissive for non-browser requests (missing `Origin` header).
  - Explicit rejection/omission of `Access-Control-Allow-Origin` for disallowed origins.
- **Security Headers Contract**:
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: DENY`
  - `Content-Security-Policy: default-src 'self'; frame-ancestors 'none'; object-src 'none'`
  - `X-XSS-Protection: 0`
  - `Referrer-Policy: strict-origin-when-cross-origin`
- **Rate Limiting Contract**:
  - Target routes: `/api/wizard/generate-story`, `/api/drafts/:id/ai-draft`, `/api/branching/next`
  - Window: 60 seconds (`windowMs = 60000`)
  - Max requests: 10 per window (`max = 10`, configurable via `RATE_LIMIT_AI_MAX`)
  - Key: `req.user?.id ? `user:${req.user.id}` : `ip:${req.ip || req.socket.remoteAddress}``
  - Limit exceeded: HTTP 429 Too Many Requests, `{ error: 'Too Many Requests', retryAfter: <seconds> }`, `Retry-After` header.

## Code Layout & Write Boundaries
- `backend/src/routes/auth.ts`: Owned exclusively by Milestone 1.
- `backend/src/services/storage.ts`: Owned exclusively by Milestone 2.
- `backend/src/server.ts`: Owned exclusively by Milestone 3.
- `backend/src/middleware/rateLimit.ts` & `backend/src/middleware/security.ts`: Owned exclusively by Milestone 3.
- `backend/tests/security_hardening.test.ts`: Owned exclusively by E2E Testing Track.
- Existing regression scripts: `backend/test_api.js`, `backend/test_canon_api.js` (Read-only reference).
