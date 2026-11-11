import http from 'http';
import app, { getAllowedOrigins } from '../dist/server.js';
import { aiRateLimiterInstance, createRateLimiter } from '../dist/middleware/rateLimit.js';
import { createAuthToken } from '../dist/routes/auth.js';
import { wizardService } from '../dist/services/wizardService.js';
import { branchingService } from '../dist/services/branchingService.js';
import { storageService } from '../dist/services/storage.js';

// Stub slow external AI network calls for fast, deterministic unit/integration testing
wizardService.generateFullStory = async () => ({ id: 'mock-story', title: 'Mock Story' });
branchingService.nextScene = async () => ({ id: 'mock-scene', choices: [] });

let passed = 0;
let failed = 0;
const failures = [];

function assert(condition, message, details = {}) {
  if (condition) {
    passed++;
    console.log(`  ✅ PASS: ${message}`);
  } else {
    failed++;
    const err = `  ❌ FAIL: ${message} - ${JSON.stringify(details)}`;
    console.error(err);
    failures.push({ message, details });
  }
}

async function runAllTests() {
  console.log('====================================================');
  console.log('  CHALLENGER 2: EMPIRICAL STRESS TEST SUITE (M3)   ');
  console.log('====================================================\n');

  // Launch server on dynamic ephemeral port (0) to eliminate EADDRINUSE conflicts
  const server = http.createServer(app);
  await new Promise(resolve => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}`;
  console.log(`Test server running on ${baseUrl}\n`);

  try {
    // Ensure test user exists in storage
    const userA = 'user-anya'; // pre-existing
    const userB = 'user-dev';  // pre-existing
    const tokenA = createAuthToken(userA);
    const tokenB = createAuthToken(userB);

    // =========================================================================
    // SECTION 1: RATE LIMITING ENDPOINT SPECIFICITY & BOUNDARIES (R4)
    // =========================================================================
    console.log('--- SECTION 1: RATE LIMITING ENDPOINT SPECIFICITY ---');

    // 1.1 Non-AI Endpoints must NOT be rate limited by the 10-req limiter
    aiRateLimiterInstance.reset();

    console.log('\n[1.1] Testing Non-AI endpoints under rapid load (15 requests each)...');

    // GET /api/health (15 requests)
    let healthBlocked = false;
    for (let i = 0; i < 15; i++) {
      const res = await fetch(`${baseUrl}/api/health`, {
        headers: { 'Authorization': `Bearer ${tokenA}` }
      });
      if (res.status === 429) {
        healthBlocked = true;
        break;
      }
    }
    assert(!healthBlocked, 'GET /api/health is NOT blocked after 15 requests (unaffected by AI limiter)');

    // GET /api/story-bible (15 requests)
    let storyBibleBlocked = false;
    for (let i = 0; i < 15; i++) {
      const res = await fetch(`${baseUrl}/api/story-bible`, {
        headers: { 'Authorization': `Bearer ${tokenA}` }
      });
      if (res.status === 429) {
        storyBibleBlocked = true;
        break;
      }
    }
    assert(!storyBibleBlocked, 'GET /api/story-bible is NOT blocked after 15 requests');

    // GET /api/books (15 requests)
    let booksBlocked = false;
    for (let i = 0; i < 15; i++) {
      const res = await fetch(`${baseUrl}/api/books`, {
        headers: { 'Authorization': `Bearer ${tokenA}` }
      });
      if (res.status === 429) {
        booksBlocked = true;
        break;
      }
    }
    assert(!booksBlocked, 'GET /api/books is NOT blocked after 15 requests');

    // GET /api/context-cache-stats (15 requests)
    let statsBlocked = false;
    for (let i = 0; i < 15; i++) {
      const res = await fetch(`${baseUrl}/api/context-cache-stats`, {
        headers: { 'Authorization': `Bearer ${tokenA}` }
      });
      if (res.status === 429) {
        statsBlocked = true;
        break;
      }
    }
    assert(!statsBlocked, 'GET /api/context-cache-stats is NOT blocked after 15 requests');

    // 1.2 Rate Limiting strictly enforced on all 3 AI generation endpoints
    console.log('\n[1.2] Testing strict enforcement on all 3 AI endpoints...');

    // Endpoint 1: POST /api/wizard/generate-story
    aiRateLimiterInstance.reset();
    let wizardAllowedCount = 0;
    let wizard429Response = null;

    for (let i = 0; i < 12; i++) {
      const res = await fetch(`${baseUrl}/api/wizard/generate-story`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tokenA}`
        },
        body: JSON.stringify({ prompt: 'Test story' })
      });
      if (res.status !== 429) {
        wizardAllowedCount++;
      } else {
        wizard429Response = res;
      }
    }
    assert(wizardAllowedCount === 10, 'POST /api/wizard/generate-story allows exactly 10 requests', { allowed: wizardAllowedCount });
    assert(wizard429Response !== null && wizard429Response.status === 429, 'POST /api/wizard/generate-story blocks 11th request with HTTP 429');

    // Endpoint 2: POST /api/drafts/:id/ai-draft
    // Create a draft for userA to avoid 404
    aiRateLimiterInstance.reset();
    let draftId = 'draft-test-101';
    try {
      const draft = storageService.createDraft(userA, {
        title: 'Rate Limit Test Draft',
        genre: 'Sci-Fi',
        blurb: 'Test blurb'
      });
      draftId = draft.id;
    } catch {}

    let draftAllowedCount = 0;
    let draft429Response = null;

    for (let i = 0; i < 12; i++) {
      const res = await fetch(`${baseUrl}/api/drafts/${draftId}/ai-draft`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tokenA}`
        },
        body: JSON.stringify({ prompt: 'Draft scene generation' })
      });
      if (res.status !== 429) {
        draftAllowedCount++;
      } else {
        draft429Response = res;
      }
    }
    assert(draftAllowedCount === 10, 'POST /api/drafts/:id/ai-draft allows exactly 10 requests', { allowed: draftAllowedCount });
    assert(draft429Response !== null && draft429Response.status === 429, 'POST /api/drafts/:id/ai-draft blocks 11th request with HTTP 429');

    // Endpoint 3: POST /api/branching/next
    aiRateLimiterInstance.reset();
    let branchAllowedCount = 0;
    let branch429Response = null;

    for (let i = 0; i < 12; i++) {
      const res = await fetch(`${baseUrl}/api/branching/next`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tokenA}`
        },
        body: JSON.stringify({ nodeId: 'node-1' })
      });
      if (res.status !== 429) {
        branchAllowedCount++;
      } else {
        branch429Response = res;
      }
    }
    assert(branchAllowedCount === 10, 'POST /api/branching/next allows exactly 10 requests', { allowed: branchAllowedCount });
    assert(branch429Response !== null && branch429Response.status === 429, 'POST /api/branching/next blocks 11th request with HTTP 429');

    // =========================================================================
    // SECTION 2: 429 RESPONSE BODY, HEADERS & SLIDING RECOVERY (R4)
    // =========================================================================
    console.log('\n--- SECTION 2: 429 RESPONSE STRUCTURE & SLIDING RECOVERY ---');

    // Inspect the 429 response structure from wizard test
    const body429 = await wizard429Response.json();
    assert(body429.error === 'Too Many Requests', '429 body has error: "Too Many Requests"', { body: body429 });
    assert(typeof body429.retryAfter === 'number' && body429.retryAfter >= 1 && body429.retryAfter <= 60,
      '429 body has retryAfter numeric value between 1 and 60', { retryAfter: body429.retryAfter });

    const retryAfterHeader = wizard429Response.headers.get('retry-after');
    const parsedRetryAfter = parseInt(retryAfterHeader, 10);
    assert(!isNaN(parsedRetryAfter) && parsedRetryAfter >= 1 && parsedRetryAfter <= 60,
      'Retry-After header has valid numeric value >= 1', { header: retryAfterHeader });
    assert(parsedRetryAfter === body429.retryAfter,
      'Retry-After header matches body.retryAfter', { header: parsedRetryAfter, body: body429.retryAfter });

    assert(wizard429Response.headers.get('ratelimit-limit') === '10',
      'RateLimit-Limit header is 10', { limit: wizard429Response.headers.get('ratelimit-limit') });
    assert(wizard429Response.headers.get('ratelimit-remaining') === '0',
      'RateLimit-Remaining header is 0', { remaining: wizard429Response.headers.get('ratelimit-remaining') });
    assert(parseInt(wizard429Response.headers.get('ratelimit-reset'), 10) >= 1,
      'RateLimit-Reset header is >= 1', { reset: wizard429Response.headers.get('ratelimit-reset') });

    // 2.2 User Isolation: User A blocked does NOT block User B
    console.log('\n[2.2] Testing User Isolation under rate limiting...');
    aiRateLimiterInstance.reset();
    // Fill User A to 10
    aiRateLimiterInstance['store'].set(`user:${userA}`, Array(10).fill(Date.now()));

    const resA = await fetch(`${baseUrl}/api/wizard/generate-story`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokenA}` },
      body: JSON.stringify({})
    });
    assert(resA.status === 429, 'User A is rate limited (429)');

    const resB = await fetch(`${baseUrl}/api/wizard/generate-story`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokenB}` },
      body: JSON.stringify({})
    });
    assert(resB.status !== 429, 'User B is NOT rate limited when User A is blocked', { statusB: resB.status });

    // 2.3 Anonymous / IP-based Rate Limiting
    console.log('\n[2.3] Testing Anonymous / IP-based Rate Limiting...');
    aiRateLimiterInstance.reset();
    // Fire 10 unauthenticated requests
    for (let i = 0; i < 10; i++) {
      await fetch(`${baseUrl}/api/wizard/generate-story`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
    }
    const anon11 = await fetch(`${baseUrl}/api/wizard/generate-story`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    assert(anon11.status === 429, 'Anonymous unauthenticated client is rate limited on 11th request (429)');

    // 2.4 Window Expiration / Sliding Recovery
    console.log('\n[2.4] Testing Sliding Window Expiration / Recovery...');

    // Method A: In-memory timestamp shift on live app
    const timestampsA = aiRateLimiterInstance['store'].get(`user:${userA}`);
    assert(Array.isArray(timestampsA) && timestampsA.length === 10, 'Store holds 10 timestamps for User A');

    // Shift oldest timestamp back 61 seconds (61,000ms ago)
    timestampsA[0] = Date.now() - 61_000;
    aiRateLimiterInstance['store'].set(`user:${userA}`, timestampsA);

    // Now User A sends another request: the oldest timestamp should slide out, allowing the request
    const resAAfterShift = await fetch(`${baseUrl}/api/wizard/generate-story`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokenA}` },
      body: JSON.stringify({})
    });
    assert(resAAfterShift.status !== 429, 'User A recovers when oldest timestamp slides past 60s', { status: resAAfterShift.status });

    // Method B: Independent Real-Time Timer Test on SlidingWindowRateLimiter
    console.log('\n[2.5] Testing Wall-Clock Sliding Window Recovery on custom limiter instance...');
    const shortLimiter = createRateLimiter({ windowMs: 300, max: 3 });
    const mockReq = { ip: '192.168.1.1' };
    let mockNextCalled = 0;
    let mockStatus = 200;
    const mockRes = {
      setHeader: () => {},
      status: (s) => { mockStatus = s; return mockRes; },
      json: () => {}
    };
    const nextFn = () => { mockNextCalled++; };

    // Fire 3 requests: all should pass
    shortLimiter.middleware(mockReq, mockRes, nextFn);
    shortLimiter.middleware(mockReq, mockRes, nextFn);
    shortLimiter.middleware(mockReq, mockRes, nextFn);
    assert(mockNextCalled === 3, 'Short window limiter: 3 requests accepted');

    // 4th immediate request: should get 429
    shortLimiter.middleware(mockReq, mockRes, nextFn);
    assert(mockStatus === 429, 'Short window limiter: 4th request rejected with 429');

    // Wait 350ms for window to expire
    await new Promise(r => setTimeout(r, 350));
    mockStatus = 200;
    shortLimiter.middleware(mockReq, mockRes, nextFn);
    assert(mockNextCalled === 4 && mockStatus === 200, 'Short window limiter: recovers after windowMs passes');
    shortLimiter.destroy();

    // =========================================================================
    // SECTION 3: CORS EDGE CASES (R5)
    // =========================================================================
    console.log('\n--- SECTION 3: CORS EDGE CASES ---');

    // 3.1 Allowed Origins: Preflight OPTIONS
    console.log('\n[3.1] Testing Preflight OPTIONS for Allowed Origins...');
    const allowedOrigin = 'http://localhost:5173';
    const preflightAllowed = await fetch(`${baseUrl}/api/wizard/generate-story`, {
      method: 'OPTIONS',
      headers: {
        'Origin': allowedOrigin,
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'Content-Type, Authorization'
      }
    });
    assert(preflightAllowed.status === 204, 'Preflight OPTIONS returns HTTP 204', { status: preflightAllowed.status });
    assert(preflightAllowed.headers.get('access-control-allow-origin') === allowedOrigin,
      'Preflight returns Access-Control-Allow-Origin: http://localhost:5173');
    assert(preflightAllowed.headers.get('access-control-allow-credentials') === 'true',
      'Preflight returns Access-Control-Allow-Credentials: true');
    assert(preflightAllowed.headers.get('access-control-allow-methods')?.includes('POST'),
      'Preflight includes POST in Access-Control-Allow-Methods');

    // 3.2 Disallowed Origins: Must NOT receive Access-Control-Allow-Origin
    console.log('\n[3.2] Testing Preflight & Simple Requests for Disallowed Origins...');
    const disallowedOrigins = [
      'https://evil-attacker.com',
      'http://localhost:9999',
      'http://localhost:5173.malicious.com',
      'https://phishing-story.ai'
    ];

    for (const origin of disallowedOrigins) {
      // Preflight OPTIONS
      const resOpt = await fetch(`${baseUrl}/api/wizard/generate-story`, {
        method: 'OPTIONS',
        headers: {
          'Origin': origin,
          'Access-Control-Request-Method': 'POST'
        }
      });
      const acaoOpt = resOpt.headers.get('access-control-allow-origin');
      assert(acaoOpt === null, `Disallowed origin ${origin} on OPTIONS receives NO Access-Control-Allow-Origin`, { acao: acaoOpt });

      // GET request
      const resGet = await fetch(`${baseUrl}/api/health`, {
        headers: { 'Origin': origin }
      });
      const acaoGet = resGet.headers.get('access-control-allow-origin');
      assert(acaoGet === null, `Disallowed origin ${origin} on GET receives NO Access-Control-Allow-Origin`, { acao: acaoGet });
    }

    // 3.3 Non-browser requests without Origin header
    console.log('\n[3.3] Testing Non-browser requests without Origin header...');
    const noOriginRes = await fetch(`${baseUrl}/api/health`);
    assert(noOriginRes.status === 200, 'Requests without Origin header succeed (status 200)');
    assert(noOriginRes.headers.get('access-control-allow-origin') === null,
      'Requests without Origin header receive no Access-Control-Allow-Origin');

    // 3.4 Comma-separated ALLOWED_ORIGINS and FRONTEND_URL parsing
    console.log('\n[3.4] Testing Comma-separated ALLOWED_ORIGINS & FRONTEND_URL support...');
    process.env.ALLOWED_ORIGINS = 'https://story-ai.vercel.app, http://preview.local:8080/,  https://custom-domain.org  ';
    process.env.FRONTEND_URL = 'http://staging.story-ai.internal:3000/';

    const parsedOrigins = getAllowedOrigins();
    assert(parsedOrigins.includes('https://story-ai.vercel.app'), 'Parsed ALLOWED_ORIGINS includes https://story-ai.vercel.app');
    assert(parsedOrigins.includes('http://preview.local:8080'), 'Parsed ALLOWED_ORIGINS strips trailing slash: http://preview.local:8080');
    assert(parsedOrigins.includes('https://custom-domain.org'), 'Parsed ALLOWED_ORIGINS trims whitespace: https://custom-domain.org');
    assert(parsedOrigins.includes('http://staging.story-ai.internal:3000'), 'Parsed FRONTEND_URL strips trailing slash: http://staging.story-ai.internal:3000');

    // Test on live server with updated env origins
    const customOriginRes = await fetch(`${baseUrl}/api/health`, {
      headers: { 'Origin': 'https://story-ai.vercel.app' }
    });
    assert(customOriginRes.headers.get('access-control-allow-origin') === 'https://story-ai.vercel.app',
      'Live server allows dynamically configured origin from ALLOWED_ORIGINS');

    // =========================================================================
    // SECTION 4: SECURITY HEADERS ACROSS METHODS & ENDPOINTS (R5)
    // =========================================================================
    console.log('\n--- SECTION 4: SECURITY HEADERS ACROSS METHODS & ENDPOINTS ---');

    const expectedHeaders = {
      'x-content-type-options': 'nosniff',
      'x-frame-options': 'DENY',
      'content-security-policy': "default-src 'self'; frame-ancestors 'none'; object-src 'none'",
      'x-xss-protection': '0',
      'referrer-policy': 'strict-origin-when-cross-origin'
    };

    function verifyHeaders(headers, context) {
      for (const [key, expectedVal] of Object.entries(expectedHeaders)) {
        const actualVal = headers.get(key);
        assert(actualVal === expectedVal,
          `[${context}] Header ${key} matches exact value: "${expectedVal}"`,
          { expected: expectedVal, actual: actualVal }
        );
      }
    }

    // 4.1 GET /api/health
    console.log('\n[4.1] Verifying headers on GET /api/health...');
    const getRes = await fetch(`${baseUrl}/api/health`);
    verifyHeaders(getRes.headers, 'GET /api/health');

    // 4.2 GET /api/story-bible
    console.log('\n[4.2] Verifying headers on GET /api/story-bible...');
    const bibleRes = await fetch(`${baseUrl}/api/story-bible`);
    verifyHeaders(bibleRes.headers, 'GET /api/story-bible');

    // 4.3 POST /api/auth/login
    console.log('\n[4.3] Verifying headers on POST /api/auth/login...');
    const postRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test@example.com', password: 'bad' })
    });
    verifyHeaders(postRes.headers, 'POST /api/auth/login');

    // 4.4 429 Rate Limited Response
    console.log('\n[4.4] Verifying headers on HTTP 429 Too Many Requests response...');
    verifyHeaders(wizard429Response.headers, 'HTTP 429 Rate Limited Response');

    // 4.5 404 Not Found Response
    console.log('\n[4.5] Verifying headers on HTTP 404 response...');
    const notFoundRes = await fetch(`${baseUrl}/api/nonexistent-route-for-testing`);
    verifyHeaders(notFoundRes.headers, 'HTTP 404 Response');

    // 4.6 Preflight OPTIONS Request with Allowed Origin (CRITICAL MIDDLEWARE ORDER CHECK)
    console.log('\n[4.6] Verifying headers on Preflight OPTIONS for Allowed Origin...');
    console.log('  Inspecting headers returned on OPTIONS 204 response...');
    for (const [key, expectedVal] of Object.entries(expectedHeaders)) {
      const actualVal = preflightAllowed.headers.get(key);
      assert(actualVal === expectedVal,
        `[Preflight OPTIONS Allowed] Header ${key} matches exact value: "${expectedVal}"`,
        { expected: expectedVal, actual: actualVal }
      );
    }

  } finally {
    server.close();
  }

  // Summary
  console.log('\n====================================================');
  console.log(`TOTAL CHECKS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
  console.log('====================================================');

  if (failed > 0) {
    console.log('\nSUMMARY OF FAILURES:');
    failures.forEach((f, idx) => {
      console.log(`${idx + 1}. ${f.message}:`, f.details);
    });
  }
}

runAllTests().catch(err => {
  console.error('Fatal error running stress test:', err);
  process.exit(1);
});
