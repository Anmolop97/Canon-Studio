// Challenger 2 - Milestone 1: Authentication Hardening (R1) Adversarial Test Suite
import crypto from 'node:crypto';
import http from 'node:http';

// Set NODE_ENV=test so server import doesn't auto-listen on port 5000
process.env.NODE_ENV = 'test';

const {
  createAuthToken,
  verifyToken,
  requireAuth,
  optionalAuth,
  getAuthSecret,
  safeUser
} = await import('../dist/routes/auth.js');
const { storageService } = await import('../dist/services/storage.js');
const { default: app } = await import('../dist/server.js');

let passed = 0;
let failed = 0;
const results = [];

function assert(condition, message, details = {}) {
  if (condition) {
    passed++;
    results.push({ status: 'PASS', message, details });
    console.log(`  [PASS] ${message}`);
  } else {
    failed++;
    results.push({ status: 'FAIL', message, details });
    console.error(`  [FAIL] ${message}`, details);
  }
}

// Helper to construct custom JWTs with arbitrary header and payload
function makeCustomToken(headerObj, payloadObj, secretOverride) {
  const h = Buffer.from(JSON.stringify(headerObj), 'utf8').toString('base64url');
  const p = Buffer.from(JSON.stringify(payloadObj), 'utf8').toString('base64url');
  const sec = secretOverride !== undefined ? secretOverride : getAuthSecret();
  const sig = crypto.createHmac('sha256', sec).update(`${h}.${p}`).digest('base64url');
  return `${h}.${p}.${sig}`;
}

async function runAdversarialTests() {
  console.log('===============================================================');
  console.log('  CHALLENGER 2: ADVERSARIAL & BOUNDARY TEST HARNESS (R1)');
  console.log('===============================================================\n');

  // -------------------------------------------------------------------------
  // 1. MALFORMED TOKEN TESTS
  // -------------------------------------------------------------------------
  console.log('--- Suite 1: Malformed Tokens ---');
  assert(verifyToken('') === null, 'Empty string rejected');
  assert(verifyToken('   ') === null, 'Whitespace-only string rejected');
  assert(verifyToken('single_segment_token') === null, 'Single segment rejected');
  assert(verifyToken('header.payload') === null, 'Two segments rejected');
  assert(verifyToken('header.payload.sig.extra') === null, 'Four segments rejected');
  assert(verifyToken('h.p.s.extra1.extra2') === null, 'Five segments rejected');
  assert(verifyToken('.payload.signature') === null, 'Leading empty segment rejected');
  assert(verifyToken('header..signature') === null, 'Middle empty segment rejected');
  assert(verifyToken('header.payload.') === null, 'Trailing empty segment rejected');
  assert(verifyToken('..') === null, 'Double dots only rejected');
  assert(verifyToken(null) === null, 'null input rejected');
  assert(verifyToken(undefined) === null, 'undefined input rejected');
  assert(verifyToken(12345) === null, 'number input rejected');
  assert(verifyToken({}) === null, 'object input rejected');
  assert(verifyToken([]) === null, 'array input rejected');
  assert(verifyToken(true) === null, 'boolean input rejected');

  // Legacy token formats
  assert(verifyToken('token-user-anya') === null, 'Legacy token-user-anya rejected');
  assert(verifyToken('user-anya') === null, 'Plain userId string rejected');

  // -------------------------------------------------------------------------
  // 2. ALGORITHM TAMPERING & HEADER ATTACKS
  // -------------------------------------------------------------------------
  console.log('\n--- Suite 2: Algorithm Tampering & Header Attacks ---');
  const now = Math.floor(Date.now() / 1000);
  const validPayload = { userId: 'user-anya', iat: now, exp: now + 3600 };

  // 2.1 alg: "none"
  const noneHeader = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' }), 'utf8').toString('base64url');
  const payB64 = Buffer.from(JSON.stringify(validPayload), 'utf8').toString('base64url');
  const tokenAlgNoneUnsigned = `${noneHeader}.${payB64}.`;
  assert(verifyToken(tokenAlgNoneUnsigned) === null, 'alg: "none" unsigned rejected');

  const tokenAlgNoneWithSig = `${noneHeader}.${payB64}.somesignature`;
  assert(verifyToken(tokenAlgNoneWithSig) === null, 'alg: "none" signed rejected');

  // 2.2 alg: "HS512"
  const hs512Token = makeCustomToken({ alg: 'HS512', typ: 'JWT' }, validPayload);
  assert(verifyToken(hs512Token) === null, 'alg: "HS512" rejected');

  // 2.3 alg: "RS256"
  const rs256Token = makeCustomToken({ alg: 'RS256', typ: 'JWT' }, validPayload);
  assert(verifyToken(rs256Token) === null, 'alg: "RS256" rejected');

  // 2.4 alg: "ES256"
  const es256Token = makeCustomToken({ alg: 'ES256', typ: 'JWT' }, validPayload);
  assert(verifyToken(es256Token) === null, 'alg: "ES256" rejected');

  // 2.5 alg: ""
  const emptyAlgToken = makeCustomToken({ alg: '', typ: 'JWT' }, validPayload);
  assert(verifyToken(emptyAlgToken) === null, 'Empty alg rejected');

  // 2.6 missing alg
  const missingAlgToken = makeCustomToken({ typ: 'JWT' }, validPayload);
  assert(verifyToken(missingAlgToken) === null, 'Missing alg header rejected');

  // 2.7 malformed header JSON
  const badHeaderB64 = Buffer.from('{ invalid-json', 'utf8').toString('base64url');
  const badHeaderToken = `${badHeaderB64}.${payB64}.somesignature`;
  assert(verifyToken(badHeaderToken) === null, 'Malformed header JSON rejected');

  // 2.8 header is JSON primitive (not object)
  const primitiveHeaderB64 = Buffer.from('"just-a-string"', 'utf8').toString('base64url');
  const primHeaderToken = `${primitiveHeaderB64}.${payB64}.somesignature`;
  assert(verifyToken(primHeaderToken) === null, 'Non-object header JSON rejected');

  // 2.9 Case-sensitivity: alg: "hs256" (lowercase) must be rejected
  const lowerAlgToken = makeCustomToken({ alg: 'hs256', typ: 'JWT' }, validPayload);
  assert(verifyToken(lowerAlgToken) === null, 'alg: "hs256" (lowercase) rejected');

  // -------------------------------------------------------------------------
  // 3. PAYLOAD MANIPULATION & TYPE CONFUSION
  // -------------------------------------------------------------------------
  console.log('\n--- Suite 3: Payload Manipulation & Type Confusion ---');
  const header = { alg: 'HS256', typ: 'JWT' };

  // 3.1 Missing userId
  const missingUserIdToken = makeCustomToken(header, { iat: now, exp: now + 3600 });
  assert(verifyToken(missingUserIdToken) === null, 'Payload with missing userId rejected');

  // 3.2 Empty string userId
  const emptyUserIdToken = makeCustomToken(header, { userId: '', iat: now, exp: now + 3600 });
  assert(verifyToken(emptyUserIdToken) === null, 'Payload with empty userId rejected');

  // 3.3 Whitespace userId
  const whitespaceUserIdToken = makeCustomToken(header, { userId: '   ', iat: now, exp: now + 3600 });
  assert(verifyToken(whitespaceUserIdToken) === null, 'Payload with whitespace-only userId rejected');

  // 3.4 Boolean userId (true/false)
  const boolTrueUserIdToken = makeCustomToken(header, { userId: true, iat: now, exp: now + 3600 });
  assert(verifyToken(boolTrueUserIdToken) === null, 'Payload with boolean true userId rejected');
  const boolFalseUserIdToken = makeCustomToken(header, { userId: false, iat: now, exp: now + 3600 });
  assert(verifyToken(boolFalseUserIdToken) === null, 'Payload with boolean false userId rejected');

  // 3.5 Object userId
  const objUserIdToken = makeCustomToken(header, { userId: { id: 'user-anya' }, iat: now, exp: now + 3600 });
  assert(verifyToken(objUserIdToken) === null, 'Payload with object userId rejected');

  // 3.6 Array userId
  const arrUserIdToken = makeCustomToken(header, { userId: ['user-anya'], iat: now, exp: now + 3600 });
  assert(verifyToken(arrUserIdToken) === null, 'Payload with array userId rejected');

  // 3.7 Number userId
  const numUserIdToken = makeCustomToken(header, { userId: 12345, iat: now, exp: now + 3600 });
  assert(verifyToken(numUserIdToken) === null, 'Payload with numeric userId rejected');

  // 3.8 Missing exp
  const missingExpToken = makeCustomToken(header, { userId: 'user-anya', iat: now });
  assert(verifyToken(missingExpToken) === null, 'Payload with missing exp rejected');

  // 3.9 Null exp
  const nullExpToken = makeCustomToken(header, { userId: 'user-anya', exp: null });
  assert(verifyToken(nullExpToken) === null, 'Payload with null exp rejected');

  // 3.10 Negative exp
  const negExpToken = makeCustomToken(header, { userId: 'user-anya', exp: -100 });
  assert(verifyToken(negExpToken) === null, 'Payload with negative exp rejected');

  // 3.11 String exp
  const strExpToken = makeCustomToken(header, { userId: 'user-anya', exp: '9999999999' });
  assert(verifyToken(strExpToken) === null, 'Payload with string exp rejected');

  // 3.12 Boolean exp
  const boolExpToken = makeCustomToken(header, { userId: 'user-anya', exp: true });
  assert(verifyToken(boolExpToken) === null, 'Payload with boolean exp rejected');

  // 3.13 Object exp
  const objExpToken = makeCustomToken(header, { userId: 'user-anya', exp: { timestamp: now + 3600 } });
  assert(verifyToken(objExpToken) === null, 'Payload with object exp rejected');

  // 3.14 Malformed payload JSON
  const badPayB64 = Buffer.from('{ malformed json', 'utf8').toString('base64url');
  const hB64 = Buffer.from(JSON.stringify(header), 'utf8').toString('base64url');
  const badPaySig = crypto.createHmac('sha256', getAuthSecret()).update(`${hB64}.${badPayB64}`).digest('base64url');
  assert(verifyToken(`${hB64}.${badPayB64}.${badPaySig}`) === null, 'Malformed payload JSON rejected');

  // 3.15 Primitive payload (string)
  const primPayB64 = Buffer.from('"simple string"', 'utf8').toString('base64url');
  const primPaySig = crypto.createHmac('sha256', getAuthSecret()).update(`${hB64}.${primPayB64}`).digest('base64url');
  assert(verifyToken(`${hB64}.${primPayB64}.${primPaySig}`) === null, 'JSON primitive payload rejected');

  // -------------------------------------------------------------------------
  // 4. EXPIRATION BOUNDARY TESTS
  // -------------------------------------------------------------------------
  console.log('\n--- Suite 4: Expiration Boundary Tests ---');
  const nowBoundary = Math.floor(Date.now() / 1000);

  // Expired 1 second ago
  const expiredMinus1 = makeCustomToken(header, { userId: 'user-anya', exp: nowBoundary - 1 });
  assert(verifyToken(expiredMinus1) === null, 'Token expired 1 second ago rejected');

  // Expired at current second (exp <= nowSec boundary)
  const expiredAtCurrentSec = makeCustomToken(header, { userId: 'user-anya', exp: nowBoundary });
  assert(verifyToken(expiredAtCurrentSec) === null, 'Token expiring at exact current second rejected (<= nowSec)');

  // Expired floating point exp (now - 0.5)
  const floatExpired = makeCustomToken(header, { userId: 'user-anya', exp: nowBoundary - 0.5 });
  assert(verifyToken(floatExpired) === null, 'Floating point expired exp (now - 0.5) rejected');

  // Valid floating point exp in future (now + 3600.5)
  const floatFuture = makeCustomToken(header, { userId: 'user-anya', exp: nowBoundary + 3600.5 });
  const verifiedFloat = verifyToken(floatFuture);
  assert(verifiedFloat !== null && verifiedFloat.userId === 'user-anya', 'Floating point future exp accepted as numeric timestamp');

  // Valid 2 seconds in future
  const validPlus2 = makeCustomToken(header, { userId: 'user-anya', exp: nowBoundary + 2 });
  const verifiedPlus2 = verifyToken(validPlus2);
  assert(verifiedPlus2 !== null && verifiedPlus2.userId === 'user-anya', 'Token expiring in +2s accepted');

  // Valid 10 seconds in future
  const validPlus10 = makeCustomToken(header, { userId: 'user-anya', exp: nowBoundary + 10 });
  const verifiedPlus10 = verifyToken(validPlus10);
  assert(verifiedPlus10 !== null && verifiedPlus10.userId === 'user-anya', 'Token expiring in +10s accepted');

  // Valid standard 7-day token
  const standardToken = createAuthToken('user-anya');
  const verifiedStandard = verifyToken(standardToken);
  assert(verifiedStandard !== null && verifiedStandard.userId === 'user-anya', 'Standard 7-day token verified successfully');

  // -------------------------------------------------------------------------
  // 5. CRYPTOGRAPHIC INTEGRITY & TIMING-SAFE EQUALITY RESILIENCE
  // -------------------------------------------------------------------------
  console.log('\n--- Suite 5: Signature Integrity & TimingSafeEqual Resilience ---');
  const validParts = standardToken.split('.');
  const [vH, vP, vSig] = validParts;

  // Single-character signature tamper
  const tamperedSig = vSig.slice(0, -1) + (vSig.slice(-1) === 'A' ? 'B' : 'A');
  assert(verifyToken(`${vH}.${vP}.${tamperedSig}`) === null, 'Single-character altered signature rejected');

  // Buffer length mismatch resilience (timingSafeEqual requires equal byte lengths)
  // Shorter signature (1 byte, 10 bytes, 20 bytes)
  assert(verifyToken(`${vH}.${vP}.a`) === null, 'Very short signature rejected without RangeError');
  assert(verifyToken(`${vH}.${vP}.${vSig.slice(0, 10)}`) === null, 'Truncated 10-char signature rejected without RangeError');
  assert(verifyToken(`${vH}.${vP}.${vSig.slice(0, 32)}`) === null, 'Truncated 32-char signature rejected without RangeError');

  // Longer signature (appended extra characters)
  assert(verifyToken(`${vH}.${vP}.${vSig}EXTRA`) === null, 'Longer signature rejected without RangeError');
  assert(verifyToken(`${vH}.${vP}.${vSig}${vSig}`) === null, 'Double-length signature rejected without RangeError');

  // Non-base64 characters in signature
  assert(verifyToken(`${vH}.${vP}.${vSig.slice(0, -2)}!@`) === null, 'Special characters in signature rejected without error');

  // Payload tampering with preserved valid signature
  const tamperedPayloadB64 = Buffer.from(JSON.stringify({ userId: 'user-marcus', exp: now + 3600 }), 'utf8').toString('base64url');
  assert(verifyToken(`${vH}.${tamperedPayloadB64}.${vSig}`) === null, 'Tampered payload with Anya signature rejected');

  // Header tampering with preserved valid signature
  const tamperedHeaderB64 = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT', evil: true }), 'utf8').toString('base64url');
  assert(verifyToken(`${tamperedHeaderB64}.${vP}.${vSig}`) === null, 'Tampered header with Anya signature rejected');

  // -------------------------------------------------------------------------
  // 6. SECRET RESOLUTION & CROSS-KEY VERIFICATION
  // -------------------------------------------------------------------------
  console.log('\n--- Suite 6: Secret Resolution & Cross-Key Isolation ---');
  const originalAuthSec = process.env.AUTH_SECRET;
  const originalJwtSec = process.env.JWT_SECRET;

  try {
    // 6.1 Default fallback secret
    delete process.env.AUTH_SECRET;
    delete process.env.JWT_SECRET;
    assert(getAuthSecret() === 'story-ai-hardened-session-secret-2026', 'Default fallback secret returned when env vars unset');

    const defaultToken = createAuthToken('user-anya');
    assert(verifyToken(defaultToken) !== null, 'Token created with fallback secret verifies with fallback secret');

    // 6.2 Custom AUTH_SECRET
    process.env.AUTH_SECRET = 'secret-production-key-9999';
    assert(getAuthSecret() === 'secret-production-key-9999', 'AUTH_SECRET takes precedence over default');
    const customAuthToken = createAuthToken('user-anya');
    assert(verifyToken(customAuthToken) !== null, 'Token created with custom AUTH_SECRET verifies');

    // Cross-key check: token created under fallback secret fails under custom AUTH_SECRET
    assert(verifyToken(defaultToken) === null, 'Token signed with fallback secret rejected under custom AUTH_SECRET');

    // 6.3 JWT_SECRET fallback
    delete process.env.AUTH_SECRET;
    process.env.JWT_SECRET = 'secret-jwt-backup-7777';
    assert(getAuthSecret() === 'secret-jwt-backup-7777', 'JWT_SECRET used when AUTH_SECRET is unset');
    const jwtSecretToken = createAuthToken('user-anya');
    assert(verifyToken(jwtSecretToken) !== null, 'Token created with JWT_SECRET verifies');
    assert(verifyToken(customAuthToken) === null, 'Token signed with AUTH_SECRET rejected under JWT_SECRET');
  } finally {
    // Restore environment
    if (originalAuthSec !== undefined) process.env.AUTH_SECRET = originalAuthSec;
    else delete process.env.AUTH_SECRET;
    if (originalJwtSec !== undefined) process.env.JWT_SECRET = originalJwtSec;
    else delete process.env.JWT_SECRET;
  }

  // -------------------------------------------------------------------------
  // 7. MIDDLEWARE CONTRACT TESTS (requireAuth & optionalAuth)
  // -------------------------------------------------------------------------
  console.log('\n--- Suite 7: Middleware Contract Tests ---');

  // Mock response helper
  function createMockRes() {
    return {
      statusCode: 200,
      body: null,
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(data) {
        this.body = data;
        return this;
      }
    };
  }

  // 7.1 requireAuth: Missing Authorization header
  {
    const req = { headers: {} };
    const res = createMockRes();
    let nextCalled = false;
    requireAuth(req, res, () => { nextCalled = true; });
    assert(!nextCalled && res.statusCode === 401, 'requireAuth: Missing auth header returns 401');
    assert(res.body?.error === 'Unauthorized: Invalid or expired token', 'requireAuth: Returns exact error message');
  }

  // 7.2 requireAuth: Non-Bearer scheme
  {
    const req = { headers: { authorization: 'Basic dXNlci1hbnlhOnBhc3M=' } };
    const res = createMockRes();
    let nextCalled = false;
    requireAuth(req, res, () => { nextCalled = true; });
    assert(!nextCalled && res.statusCode === 401, 'requireAuth: Basic auth returns 401');
  }

  // 7.3 requireAuth: Legacy token-user-anya format
  {
    const req = { headers: { authorization: 'Bearer token-user-anya' } };
    const res = createMockRes();
    let nextCalled = false;
    requireAuth(req, res, () => { nextCalled = true; });
    assert(!nextCalled && res.statusCode === 401, 'requireAuth: Bearer token-user-anya returns 401');
    assert(res.body?.error === 'Unauthorized: Invalid or expired token', 'requireAuth: Bearer token-user-anya returns standard error');
  }

  // 7.4 requireAuth: Expired token
  {
    const expiredTok = makeCustomToken(header, { userId: 'user-anya', exp: Math.floor(Date.now() / 1000) - 10 });
    const req = { headers: { authorization: `Bearer ${expiredTok}` } };
    const res = createMockRes();
    let nextCalled = false;
    requireAuth(req, res, () => { nextCalled = true; });
    assert(!nextCalled && res.statusCode === 401, 'requireAuth: Expired token returns 401');
  }

  // 7.5 requireAuth: Valid token signature but non-existent user
  {
    const ghostToken = makeCustomToken(header, { userId: 'user-non-existent-ghost-999', exp: Math.floor(Date.now() / 1000) + 3600 });
    const req = { headers: { authorization: `Bearer ${ghostToken}` } };
    const res = createMockRes();
    let nextCalled = false;
    requireAuth(req, res, () => { nextCalled = true; });
    assert(!nextCalled && res.statusCode === 401, 'requireAuth: Non-existent user in valid token returns 401');
  }

  // 7.6 requireAuth: Valid token and valid user
  {
    const validTok = createAuthToken('user-anya');
    const req = { headers: { authorization: `Bearer ${validTok}` } };
    const res = createMockRes();
    let nextCalled = false;
    requireAuth(req, res, () => { nextCalled = true; });
    assert(nextCalled, 'requireAuth: Valid token calls next()');
    assert(req.user && req.user.id === 'user-anya', 'requireAuth: Valid token attaches user to req.user');
  }

  // 7.7 optionalAuth: Missing header leaves user undefined and calls next()
  {
    const req = { headers: {} };
    const res = createMockRes();
    let nextCalled = false;
    optionalAuth(req, res, () => { nextCalled = true; });
    assert(nextCalled && req.user === undefined, 'optionalAuth: Missing header sets req.user=undefined and calls next()');
  }

  // 7.8 optionalAuth: Invalid token leaves user undefined and calls next() (never blocks with 401)
  {
    const req = { headers: { authorization: 'Bearer token-invalid-or-spoofed' } };
    const res = createMockRes();
    let nextCalled = false;
    optionalAuth(req, res, () => { nextCalled = true; });
    assert(nextCalled && req.user === undefined && res.statusCode === 200, 'optionalAuth: Invalid token sets req.user=undefined and proceeds');
  }

  // 7.9 optionalAuth: Valid token attaches user and calls next()
  {
    const validTok = createAuthToken('user-anya');
    const req = { headers: { authorization: `Bearer ${validTok}` } };
    const res = createMockRes();
    let nextCalled = false;
    optionalAuth(req, res, () => { nextCalled = true; });
    assert(nextCalled && req.user?.id === 'user-anya', 'optionalAuth: Valid token attaches user and calls next()');
  }

  // 7.10 requireAuth: Header format variations
  {
    // Bearer without token
    const reqEmpty = { headers: { authorization: 'Bearer ' } };
    const resEmpty = createMockRes();
    let nextCalled = false;
    requireAuth(reqEmpty, resEmpty, () => { nextCalled = true; });
    assert(!nextCalled && resEmpty.statusCode === 401, 'requireAuth: "Bearer " without token returns 401');

    // Just Bearer
    const reqJust = { headers: { authorization: 'Bearer' } };
    const resJust = createMockRes();
    nextCalled = false;
    requireAuth(reqJust, resJust, () => { nextCalled = true; });
    assert(!nextCalled && resJust.statusCode === 401, 'requireAuth: "Bearer" keyword only returns 401');

    // Lowercase bearer with valid token
    const validTok = createAuthToken('user-anya');
    const reqLower = { headers: { authorization: `bearer ${validTok}` } };
    const resLower = createMockRes();
    nextCalled = false;
    requireAuth(reqLower, resLower, () => { nextCalled = true; });
    assert(nextCalled && reqLower.user?.id === 'user-anya', 'requireAuth: case-insensitive "bearer <token>" succeeds');

    // Token with padding spaces
    const reqPadded = { headers: { authorization: `Bearer   ${validTok}   ` } };
    const resPadded = createMockRes();
    nextCalled = false;
    requireAuth(reqPadded, resPadded, () => { nextCalled = true; });
    assert(nextCalled && reqPadded.user?.id === 'user-anya', 'requireAuth: "Bearer   <token>   " with padding succeeds');
  }

  // -------------------------------------------------------------------------
  // 8. LIVE HTTP INTEGRATION TESTS
  // -------------------------------------------------------------------------
  console.log('\n--- Suite 8: Live HTTP Integration Server Tests ---');

  const TEST_PORT = 5888;
  const server = http.createServer(app);

  await new Promise((resolve) => server.listen(TEST_PORT, resolve));
  console.log(`  Live test server listening on http://127.0.0.1:${TEST_PORT}`);

  try {
    const baseUrl = `http://127.0.0.1:${TEST_PORT}`;

    // Helper for fetch calls
    async function apiRequest(endpoint, options = {}) {
      const res = await fetch(`${baseUrl}${endpoint}`, {
        headers: { 'Content-Type': 'application/json', ...options.headers },
        ...options
      });
      const data = await res.json().catch(() => null);
      return { status: res.status, data };
    }

    // 8.1 POST /api/auth/login with valid Anya credentials
    const loginRes = await apiRequest('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'anya@canonstory.studio', password: 'anya123' })
    });
    assert(loginRes.status === 200, 'POST /api/auth/login returned HTTP 200');
    assert(typeof loginRes.data?.token === 'string' && loginRes.data.token.split('.').length === 3, 'Login returned valid 3-part token');
    assert(loginRes.data?.user?.id === 'user-anya', 'Login returned correct safe user object');
    assert(loginRes.data?.user?.passwordHash === undefined, 'Login does NOT expose passwordHash');
    assert(loginRes.data?.user?.salt === undefined, 'Login does NOT expose salt');

    const anyaToken = loginRes.data.token;

    // 8.2 GET /api/auth/me with valid token
    const meRes = await apiRequest('/api/auth/me', {
      headers: { Authorization: `Bearer ${anyaToken}` }
    });
    assert(meRes.status === 200, 'GET /api/auth/me with valid token returned HTTP 200');
    assert(meRes.data?.user?.id === 'user-anya', 'GET /api/auth/me authenticated Anya Sharma');

    // 8.3 GET /api/auth/me with NO token
    const noAuthRes = await apiRequest('/api/auth/me');
    assert(noAuthRes.status === 401, 'GET /api/auth/me with missing auth header returned HTTP 401');
    assert(noAuthRes.data?.error === 'Unauthorized: Invalid or expired token', 'Correct error payload returned on missing auth');

    // 8.4 GET /api/auth/me with legacy token-user-anya
    const legacyRes = await apiRequest('/api/auth/me', {
      headers: { Authorization: 'Bearer token-user-anya' }
    });
    assert(legacyRes.status === 401, 'GET /api/auth/me with Bearer token-user-anya returned HTTP 401');
    assert(legacyRes.data?.error === 'Unauthorized: Invalid or expired token', 'Correct error payload on legacy token attack');

    // 8.5 GET /api/auth/me with tampered signature
    const tamperedParts = anyaToken.split('.');
    const tamperedAnya = `${tamperedParts[0]}.${tamperedParts[1]}.${tamperedParts[2].slice(0, -1)}Z`;
    const tamperedRes = await apiRequest('/api/auth/me', {
      headers: { Authorization: `Bearer ${tamperedAnya}` }
    });
    assert(tamperedRes.status === 401, 'GET /api/auth/me with tampered signature returned HTTP 401');

    // 8.6 GET /api/auth/me with alg "none" forged token
    const algNoneToken = `${noneHeader}.${payB64}.`;
    const algNoneRes = await apiRequest('/api/auth/me', {
      headers: { Authorization: `Bearer ${algNoneToken}` }
    });
    assert(algNoneRes.status === 401, 'GET /api/auth/me with alg none token returned HTTP 401');

    // 8.7 GET /api/auth/me with expired token
    const expToken = makeCustomToken(header, { userId: 'user-anya', exp: Math.floor(Date.now() / 1000) - 60 });
    const expiredRes = await apiRequest('/api/auth/me', {
      headers: { Authorization: `Bearer ${expToken}` }
    });
    assert(expiredRes.status === 401, 'GET /api/auth/me with expired token returned HTTP 401');

    // 8.8 POST /api/auth/register with unique email
    const regEmail = `challenger_test_${Date.now()}@example.com`;
    const regRes = await apiRequest('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email: regEmail, password: 'securePass123!', displayName: 'Challenger User' })
    });
    assert(regRes.status === 201, 'POST /api/auth/register returned HTTP 201');
    assert(typeof regRes.data?.token === 'string' && regRes.data.token.split('.').length === 3, 'Register returned signed 3-part token');
    assert(regRes.data?.user?.email === regEmail, 'Register returned correct user');
    assert(regRes.data?.user?.passwordHash === undefined, 'Register does NOT expose passwordHash');

    // Verify newly registered user can access /api/auth/me
    const regMeRes = await apiRequest('/api/auth/me', {
      headers: { Authorization: `Bearer ${regRes.data.token}` }
    });
    assert(regMeRes.status === 200 && regMeRes.data?.user?.email === regEmail, 'Registered user immediately authenticated on /api/auth/me');

  } finally {
    await new Promise((resolve) => server.close(resolve));
    console.log('  Live test server shut down cleanly.');
  }

  // -------------------------------------------------------------------------
  // SUMMARY
  // -------------------------------------------------------------------------
  console.log('\n===============================================================');
  console.log(`  RESULTS: ${passed} PASSED, ${failed} FAILED (TOTAL: ${passed + failed})`);
  console.log('===============================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runAdversarialTests().catch((err) => {
  console.error('Unexpected error in test harness:', err);
  process.exit(1);
});
