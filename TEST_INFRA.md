# E2E Test Infra: Story-Ai Backend Hardening

## Test Philosophy
- Opaque-box, requirement-driven. Derived from `ORIGINAL_REQUEST.md` and user-facing HTTP specifications.
- Methodology: Category-Partition + BVA + Pairwise + Workload Testing (Tiers 1-4).

## Feature Inventory
| # | Feature | Source (requirement) | Tier 1 | Tier 2 | Tier 3 |
|---|---------|---------------------|:------:|:------:|:------:|
| 1 | Cryptographically Signed Auth Tokens (R1) | ORIGINAL_REQUEST §R1 | 5 | 5 | ✓ |
| 2 | Atomic JSON DB Persistence (R2) | ORIGINAL_REQUEST §R2 | 5 | 5 | ✓ |
| 3 | Salted Password Hashing (R3) | ORIGINAL_REQUEST §R3 | 5 | 5 | ✓ |
| 4 | AI Endpoint Rate Limiting (R4) | ORIGINAL_REQUEST §R4 | 5 | 5 | ✓ |
| 5 | Restrictive CORS & Security Headers (R5) | ORIGINAL_REQUEST §R5 | 5 | 5 | ✓ |

## Test Architecture
- **Runner**: Node.js built-in test runner via `node --import tsx --test backend/tests/security_hardening.test.ts` (or standalone execution via `node --import tsx backend/tests/security_hardening.test.ts`).
- **Framework**: `node:test` and `node:assert/strict` (zero external test runner dependencies).
- **Test File Location**: `backend/tests/security_hardening.test.ts`.
- **Target Server**: Can start the Express application on an ephemeral port or reuse `app` directly via standard HTTP request utilities.
- **Pass/Fail Semantics**: All test suites must exit with code 0; any failed assertion or HTTP code mismatch fails the process with non-zero exit code.

## Test Tiers & Scenarios

### Tier 1: Feature Coverage (≥5 tests per feature, happy path)
- **R1**: Register user -> receive signed token; Login with correct credentials -> receive signed token; Access `/api/auth/me` with valid signed token -> 200 with user profile; Access `/api/books` with valid token -> 200; Verify token contains header.payload.signature structure.
- **R2**: Save database normal flow -> verify `db.json` is valid JSON containing new records; Save multiple records -> verify all records persist; Verify temporary file `.db.tmp.*` is cleaned up after save; Load database on clean start -> verify loaded data matches saved data; Verify storage data directory auto-creation.
- **R3**: Register user -> verify password hash in storage contains salt (`:`); Login with newly registered user -> 200 success; Login with seeded legacy user -> 200 success; Verify seeded user is upgraded to salted format; Verify two users with identical passwords produce different hashes.
- **R4**: Request `/api/wizard/generate-story` under limit -> 200/valid response; Request `/api/drafts/:id/ai-draft` with auth under limit -> 200/valid response; Request `/api/branching/next` under limit -> 200/valid response; Check response contains rate limit headers; Verify requests within window update remaining count.
- **R5**: Request with allowed origin `http://localhost:5173` -> returns `Access-Control-Allow-Origin: http://localhost:5173`; Request without origin (CLI/curl) -> 200 success; Inspect headers for `X-Content-Type-Options: nosniff`; Inspect headers for `X-Frame-Options: DENY`; Inspect headers for `Content-Security-Policy`.

### Tier 2: Boundary & Corner Cases (≥5 tests per feature)
- **R1**: Forged token `token-user-anya` -> 401; Spoofed JWT with fake signature -> 401; Expired JWT token -> 401; Corrupted base64 JWT string -> 401; Missing Bearer prefix or empty token -> 401; Tampered payload with valid original signature -> 401.
- **R3**: Empty password attempt -> rejected or safely handled; Very long password (1024 chars) -> correctly hashed and verified; Wrong password for existing user -> 401/error; Case-sensitive password check -> 401 for wrong case; Timing consistency check.
- **R4**: Exactly 10 requests -> all 200; 11th request -> HTTP 429 Too Many Requests; Check `Retry-After` header is positive integer; Rapid burst of 20 requests -> requests 11-20 all return 429; Independent limits for different IPs / user accounts.
- **R5**: Disallowed origin `http://evil.com` -> no `Access-Control-Allow-Origin` or CORS rejection; Subdomain attack `http://localhost.evil.com` -> rejected; Protocol attack `ftp://localhost:5173` -> rejected; Port attack `http://localhost:9999` -> rejected; OPTIONS preflight check for disallowed origin.

### Tier 3: Cross-Feature Interactions
- Auth + Rate Limiting: Rate limits apply correctly to authenticated user identity regardless of IP changes.
- Auth + Storage: User registration creates salted password and writes atomically to `db.json`, then immediately issues valid signed token that authenticates successfully.
- Storage Persistence + Password Upgrade: Legacy seed user logins trigger atomic rewrite of `db.json` with upgraded salted hash without corrupting other database collections.

### Tier 4: Real-World Scenarios
- Scenario 1: Full user journey — register, login, create draft, trigger AI generation until rate limit hit, wait or inspect 429 response, view published books with security headers.
- Scenario 2: Simulated crash resilience — verify corrupted partial writes trigger backup preservation and never erase legitimate user accounts.
