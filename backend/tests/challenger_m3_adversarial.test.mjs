// Challenger 1 - Milestone 3: Server Security, CORS & Rate Limiting Adversarial Test Harness
import http from 'node:http';
import assert from 'node:assert/strict';

// Set NODE_ENV=test so importing server.js does not auto-bind to port 5000
process.env.NODE_ENV = 'test';

const { default: app, getAllowedOrigins } = await import('../dist/server.js');
const {
  aiRateLimiterInstance,
  createRateLimiter,
  defaultKeyGenerator,
  getAiRateLimitMax
} = await import('../dist/middleware/rateLimit.js');
const { createAuthToken } = await import('../dist/routes/auth.js');
const { storageService } = await import('../dist/services/storage.js');
const { wizardService } = await import('../dist/services/wizardService.js');
const { canonCheckerService } = await import('../dist/services/canonChecker.js');
const { branchingService } = await import('../dist/services/branchingService.js');

let passedCount = 0;
let failedCount = 0;
const testResults = [];

function check(condition, message, details = {}) {
  if (condition) {
    passedCount++;
    testResults.push({ status: 'PASS', message, details });
    console.log(`  [PASS] ${message}`);
  } else {
    failedCount++;
    testResults.push({ status: 'FAIL', message, details });
    console.error(`  [FAIL] ${message}`, details);
  }
}

// Stub AI handlers to avoid external Gemini/Groq API calls and quotas during rate limit testing
wizardService.generateFullStory = async () => ({
  title: 'Challenger Story',
  genre: 'Cyberpunk',
  episodes: [{ episodeNumber: 1, title: 'Episode 1', content: 'Synthetic night.' }]
});

canonCheckerService.draftEpisode = async () => 'Synthetic drafted prose from challenger stub.';

branchingService.nextScene = async () => ({
  sceneNumber: 2,
  text: 'The digital neon flickers.',
  options: [{ label: 'Jack in', nextSceneId: 'scene-3' }]
});

async function main() {
  console.log('========================================================================');
  console.log('  CHALLENGER 1: ADVERSARIAL STRESS TEST & VERIFICATION HARNESS (M3)');
  console.log('========================================================================\n');

  // Start HTTP test server on an OS-assigned dynamic port (port 0)
  const server = http.createServer(app);
  await new Promise(resolve => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}`;
  console.log(`  [SETUP] Test server listening on ${baseUrl} (Port ${port})\n`);

  // Ensure test users exist in storage
  const userAnyaToken = createAuthToken('user-anya');
  const userDevToken = createAuthToken('user-dev');

  // Create a test draft for user-anya for testing /api/drafts/:id/ai-draft
  let draftAnya;
  try {
    draftAnya = storageService.createDraft('user-anya', {
      title: 'Challenger Neon Draft',
      genre: 'Cyberpunk',
      blurb: 'Adversarial testing story',
      episodes: [{ title: 'Ep 1', content: 'The dark alleyway...' }],
      canonFacts: [],
      voiceNotes: []
    });
  } catch {
    // If user-anya already has drafts, use existing
    draftAnya = storageService.getDraftsByUser('user-anya')[0];
  }

  try {
    // -------------------------------------------------------------------------
    // SUITE 1: RATE LIMITING ON ALL 3 AI ENDPOINTS
    // -------------------------------------------------------------------------
    console.log('--- SUITE 1: Rate Limiting on All 3 AI Generation Endpoints ---');

    // 1.1: POST /api/wizard/generate-story
    aiRateLimiterInstance.reset();
    console.log('\n  Testing: POST /api/wizard/generate-story');
    let wizardBlockedAt11 = false;
    let wizardHeadersValid = true;
    let wizard429BodyValid = false;
    let wizard429HeadersValid = false;

    for (let i = 1; i <= 11; i++) {
      const res = await fetch(`${baseUrl}/api/wizard/generate-story`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userAnyaToken}`
        },
        body: JSON.stringify({ genre: 'Cyberpunk', targetLength: '400' })
      });

      if (i <= 10) {
        if (res.status !== 200) {
          wizardHeadersValid = false;
        }
        const limitH = res.headers.get('ratelimit-limit');
        const remainingH = res.headers.get('ratelimit-remaining');
        const resetH = res.headers.get('ratelimit-reset');
        if (limitH !== '10' || remainingH !== (10 - i).toString() || !resetH) {
          wizardHeadersValid = false;
        }
      } else if (i === 11) {
        if (res.status === 429) {
          wizardBlockedAt11 = true;
          const retryAfter = res.headers.get('retry-after');
          const limitH = res.headers.get('ratelimit-limit');
          const remainingH = res.headers.get('ratelimit-remaining');
          const resetH = res.headers.get('ratelimit-reset');
          const body = await res.json();

          wizard429HeadersValid = (
            retryAfter !== null &&
            parseInt(retryAfter, 10) > 0 &&
            limitH === '10' &&
            remainingH === '0' &&
            resetH !== null &&
            parseInt(resetH, 10) > 0
          );

          wizard429BodyValid = (
            body.error === 'Too Many Requests' &&
            typeof body.retryAfter === 'number' &&
            body.retryAfter > 0
          );
        }
      }
    }

    check(wizardHeadersValid, 'POST /api/wizard/generate-story: requests 1-10 succeed with RateLimit-Limit=10, accurate RateLimit-Remaining, and RateLimit-Reset');
    check(wizardBlockedAt11, 'POST /api/wizard/generate-story: 11th request is blocked with HTTP 429 Too Many Requests');
    check(wizard429HeadersValid, 'POST /api/wizard/generate-story: HTTP 429 includes Retry-After, RateLimit-Limit: 10, RateLimit-Remaining: 0, RateLimit-Reset');
    check(wizard429BodyValid, 'POST /api/wizard/generate-story: HTTP 429 body matches { error: "Too Many Requests", retryAfter: <number> }');

    // 1.2: POST /api/drafts/:id/ai-draft
    aiRateLimiterInstance.reset();
    console.log('\n  Testing: POST /api/drafts/:id/ai-draft');
    let draftsBlockedAt11 = false;
    let draftsHeadersValid = true;
    let drafts429BodyValid = false;
    let drafts429HeadersValid = false;

    for (let i = 1; i <= 11; i++) {
      const res = await fetch(`${baseUrl}/api/drafts/${draftAnya.id}/ai-draft`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userAnyaToken}`
        },
        body: JSON.stringify({ episodeIndex: 0, userPrompt: 'Continue narrative' })
      });

      if (i <= 10) {
        if (res.status !== 200) {
          draftsHeadersValid = false;
        }
        const limitH = res.headers.get('ratelimit-limit');
        const remainingH = res.headers.get('ratelimit-remaining');
        if (limitH !== '10' || remainingH !== (10 - i).toString()) {
          draftsHeadersValid = false;
        }
      } else if (i === 11) {
        if (res.status === 429) {
          draftsBlockedAt11 = true;
          const retryAfter = res.headers.get('retry-after');
          const limitH = res.headers.get('ratelimit-limit');
          const remainingH = res.headers.get('ratelimit-remaining');
          const resetH = res.headers.get('ratelimit-reset');
          const body = await res.json();

          drafts429HeadersValid = (
            retryAfter !== null &&
            parseInt(retryAfter, 10) > 0 &&
            limitH === '10' &&
            remainingH === '0' &&
            resetH !== null
          );

          drafts429BodyValid = (
            body.error === 'Too Many Requests' &&
            typeof body.retryAfter === 'number'
          );
        }
      }
    }

    check(draftsHeadersValid, 'POST /api/drafts/:id/ai-draft: requests 1-10 succeed with valid RateLimit headers');
    check(draftsBlockedAt11, 'POST /api/drafts/:id/ai-draft: 11th request is blocked with HTTP 429 Too Many Requests');
    check(drafts429HeadersValid, 'POST /api/drafts/:id/ai-draft: HTTP 429 includes Retry-After, RateLimit-Limit, RateLimit-Remaining: 0, RateLimit-Reset');
    check(drafts429BodyValid, 'POST /api/drafts/:id/ai-draft: HTTP 429 body matches { error: "Too Many Requests", retryAfter: <number> }');

    // 1.3: POST /api/branching/next
    aiRateLimiterInstance.reset();
    console.log('\n  Testing: POST /api/branching/next');
    let branchingBlockedAt11 = false;
    let branchingHeadersValid = true;
    let branching429BodyValid = false;
    let branching429HeadersValid = false;

    for (let i = 1; i <= 11; i++) {
      const res = await fetch(`${baseUrl}/api/branching/next`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userAnyaToken}`
        },
        body: JSON.stringify({ currentSceneId: 'scene-1', chosenOptionIndex: 0 })
      });

      if (i <= 10) {
        if (res.status !== 200) {
          branchingHeadersValid = false;
        }
        const limitH = res.headers.get('ratelimit-limit');
        const remainingH = res.headers.get('ratelimit-remaining');
        if (limitH !== '10' || remainingH !== (10 - i).toString()) {
          branchingHeadersValid = false;
        }
      } else if (i === 11) {
        if (res.status === 429) {
          branchingBlockedAt11 = true;
          const retryAfter = res.headers.get('retry-after');
          const limitH = res.headers.get('ratelimit-limit');
          const remainingH = res.headers.get('ratelimit-remaining');
          const resetH = res.headers.get('ratelimit-reset');
          const body = await res.json();

          branching429HeadersValid = (
            retryAfter !== null &&
            parseInt(retryAfter, 10) > 0 &&
            limitH === '10' &&
            remainingH === '0' &&
            resetH !== null
          );

          branching429BodyValid = (
            body.error === 'Too Many Requests' &&
            typeof body.retryAfter === 'number'
          );
        }
      }
    }

    check(branchingHeadersValid, 'POST /api/branching/next: requests 1-10 succeed with valid RateLimit headers');
    check(branchingBlockedAt11, 'POST /api/branching/next: 11th request is blocked with HTTP 429 Too Many Requests');
    check(branching429HeadersValid, 'POST /api/branching/next: HTTP 429 includes Retry-After, RateLimit-Limit, RateLimit-Remaining: 0, RateLimit-Reset');
    check(branching429BodyValid, 'POST /api/branching/next: HTTP 429 body matches { error: "Too Many Requests", retryAfter: <number> }');

    // -------------------------------------------------------------------------
    // SUITE 2: USER ISOLATION & CLIENT IDENTITY DEFENSE
    // -------------------------------------------------------------------------
    console.log('\n--- SUITE 2: User Isolation & Client Identity Defense ---');

    aiRateLimiterInstance.reset();

    // User Anya exhausts quota (10 requests)
    for (let i = 1; i <= 10; i++) {
      await fetch(`${baseUrl}/api/wizard/generate-story`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${userAnyaToken}` },
        body: JSON.stringify({})
      });
    }

    // Anya 11th request -> 429
    const anya11 = await fetch(`${baseUrl}/api/wizard/generate-story`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${userAnyaToken}` },
      body: JSON.stringify({})
    });
    check(anya11.status === 429, 'User Anya quota is exhausted (receives HTTP 429 on 11th request)');

    // User Dev makes request -> must succeed with 200 (isolated from Anya)
    const devRes = await fetch(`${baseUrl}/api/wizard/generate-story`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${userDevToken}` },
      body: JSON.stringify({})
    });
    check(devRes.status === 200, 'User Isolation: User Dev is NOT blocked by exhausted User Anya quota (receives 200)');

    // Anonymous request (no token) -> must succeed with 200 (isolated from Anya)
    const anonRes = await fetch(`${baseUrl}/api/wizard/generate-story`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    check(anonRes.status === 200, 'Anonymous Isolation: Anonymous request without token is NOT blocked by User Anya quota');

    // Anya sends request with simulated IP change (X-Forwarded-For) -> Still 429 (keyed by authenticated user ID)
    const anyaNewIp = await fetch(`${baseUrl}/api/wizard/generate-story`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${userAnyaToken}`,
        'X-Forwarded-For': '198.51.100.99'
      },
      body: JSON.stringify({})
    });
    check(anyaNewIp.status === 429, 'Identity Persistence: Authenticated user cannot bypass rate limits by spoofing IP headers (still 429)');

    // -------------------------------------------------------------------------
    // SUITE 3: NON-AI ENDPOINT IMMUNITY (SELECTIVE APPLICATION)
    // -------------------------------------------------------------------------
    console.log('\n--- SUITE 3: Non-AI Endpoint Immunity ---');

    let healthImmune = true;
    for (let i = 1; i <= 20; i++) {
      const res = await fetch(`${baseUrl}/api/health`);
      if (res.status !== 200) {
        healthImmune = false;
        break;
      }
    }
    check(healthImmune, 'GET /api/health: 20 rapid requests succeed without being rate-limited (immune)');

    let authMeImmune = true;
    for (let i = 1; i <= 15; i++) {
      const res = await fetch(`${baseUrl}/api/auth/me`, {
        headers: { Authorization: `Bearer ${userAnyaToken}` }
      });
      if (res.status !== 200) {
        authMeImmune = false;
        break;
      }
    }
    check(authMeImmune, 'GET /api/auth/me: 15 rapid authenticated requests succeed without being rate-limited (immune)');

    let storyBibleImmune = true;
    for (let i = 1; i <= 15; i++) {
      const res = await fetch(`${baseUrl}/api/story-bible`);
      if (res.status !== 200) {
        storyBibleImmune = false;
        break;
      }
    }
    check(storyBibleImmune, 'GET /api/story-bible: 15 rapid requests succeed without rate limiting (immune)');

    // -------------------------------------------------------------------------
    // SUITE 4: CORS ALLOWLIST & HOSTILE ORIGIN REJECTION
    // -------------------------------------------------------------------------
    console.log('\n--- SUITE 4: CORS Allowlist & Hostile Origin Rejection ---');

    const allowedOrigins = [
      'http://localhost:5173',
      'http://127.0.0.1:5173',
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      'http://localhost:5000'
    ];

    for (const origin of allowedOrigins) {
      const res = await fetch(`${baseUrl}/api/health`, {
        headers: { Origin: origin }
      });
      const acao = res.headers.get('access-control-allow-origin');
      const creds = res.headers.get('access-control-allow-credentials');
      check(acao === origin, `CORS Allowlist: Permitted origin "${origin}" receives Access-Control-Allow-Origin: ${origin}`);
      check(creds === 'true', `CORS Credentials: Permitted origin "${origin}" receives Access-Control-Allow-Credentials: true`);
    }

    // Trailing slash origin normalization
    const trailingSlashRes = await fetch(`${baseUrl}/api/health`, {
      headers: { Origin: 'http://localhost:5173/' }
    });
    const acaoTrailing = trailingSlashRes.headers.get('access-control-allow-origin');
    check(acaoTrailing === 'http://localhost:5173/' || acaoTrailing === 'http://localhost:5173', 'CORS Normalization: Origin with trailing slash is correctly matched');

    // Hostile and unapproved origins
    const hostileOrigins = [
      'http://evil.com',
      'http://malicious.org',
      'http://localhost:5173.attacker.com',
      'http://attacker.com/localhost:5173',
      'http://localhost:9999',
      'https://localhost:5173', // Scheme mismatch
      'ftp://localhost:5173',   // Protocol mismatch
      'null'                    // Sandboxed iframe
    ];

    for (const origin of hostileOrigins) {
      const res = await fetch(`${baseUrl}/api/health`, {
        headers: { Origin: origin }
      });
      const acao = res.headers.get('access-control-allow-origin');
      check(acao === null || acao !== origin, `CORS Rejection: Disallowed origin "${origin}" does NOT receive Access-Control-Allow-Origin`);
    }

    // Non-browser request without Origin header
    const noOriginRes = await fetch(`${baseUrl}/api/health`);
    check(noOriginRes.status === 200, 'Non-browser Request: Requests without Origin header succeed normally (HTTP 200)');

    // Preflight OPTIONS request from allowed origin
    const preflightAllowed = await fetch(`${baseUrl}/api/wizard/generate-story`, {
      method: 'OPTIONS',
      headers: {
        'Origin': 'http://localhost:5173',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'Content-Type,Authorization'
      }
    });
    const acaoPreflight = preflightAllowed.headers.get('access-control-allow-origin');
    const acamPreflight = preflightAllowed.headers.get('access-control-allow-methods');
    check(acaoPreflight === 'http://localhost:5173', 'CORS Preflight: Allowed origin receives Access-Control-Allow-Origin on OPTIONS');
    check(acamPreflight !== null && acamPreflight.includes('POST'), 'CORS Preflight: Allowed origin receives Access-Control-Allow-Methods containing POST');

    // Preflight OPTIONS request from hostile origin
    const preflightHostile = await fetch(`${baseUrl}/api/wizard/generate-story`, {
      method: 'OPTIONS',
      headers: {
        'Origin': 'http://evil.com',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'Content-Type,Authorization'
      }
    });
    const acaoHostilePreflight = preflightHostile.headers.get('access-control-allow-origin');
    check(acaoHostilePreflight === null || acaoHostilePreflight !== 'http://evil.com', 'CORS Preflight: Disallowed origin evil.com receives NO Access-Control-Allow-Origin on OPTIONS');

    // -------------------------------------------------------------------------
    // SUITE 5: DEFENSIVE SECURITY HEADERS
    // -------------------------------------------------------------------------
    console.log('\n--- SUITE 5: Defensive Security Headers Verification ---');

    function verifySecurityHeaders(headers, routeName) {
      const nosniff = headers.get('x-content-type-options');
      const frameOptions = headers.get('x-frame-options');
      const csp = headers.get('content-security-policy');
      const xss = headers.get('x-xss-protection');
      const referrer = headers.get('referrer-policy');

      check(nosniff === 'nosniff', `${routeName}: X-Content-Type-Options is "nosniff"`);
      check(frameOptions === 'DENY', `${routeName}: X-Frame-Options is "DENY"`);
      check(csp === "default-src 'self'; frame-ancestors 'none'; object-src 'none'", `${routeName}: Content-Security-Policy is "default-src 'self'; frame-ancestors 'none'; object-src 'none'"`);
      check(xss === '0', `${routeName}: X-XSS-Protection is "0"`);
      check(referrer === 'strict-origin-when-cross-origin', `${routeName}: Referrer-Policy is "strict-origin-when-cross-origin"`);
    }

    const healthRes = await fetch(`${baseUrl}/api/health`);
    verifySecurityHeaders(healthRes.headers, 'GET /api/health');

    const bibleRes = await fetch(`${baseUrl}/api/story-bible`);
    verifySecurityHeaders(bibleRes.headers, 'GET /api/story-bible');

    const notFoundRes = await fetch(`${baseUrl}/api/nonexistent-route-404`);
    check(notFoundRes.headers.get('x-content-type-options') === 'nosniff', '404 response: X-Content-Type-Options is "nosniff"');
    check(notFoundRes.headers.get('x-frame-options') === 'DENY', '404 response: X-Frame-Options is "DENY"');
    check(notFoundRes.headers.get('content-security-policy') !== null, '404 response: Content-Security-Policy header is present');
    check(notFoundRes.headers.get('x-xss-protection') === '0', '404 response: X-XSS-Protection is "0"');
    check(notFoundRes.headers.get('referrer-policy') === 'strict-origin-when-cross-origin', '404 response: Referrer-Policy is "strict-origin-when-cross-origin"');

    const authFail401 = await fetch(`${baseUrl}/api/drafts`);
    check(authFail401.status === 401, 'Unauthenticated /api/drafts returns 401');
    verifySecurityHeaders(authFail401.headers, 'HTTP 401 Unauthorized response');

    // Verify security headers on 429 response
    aiRateLimiterInstance.reset();
    for (let i = 1; i <= 10; i++) {
      await fetch(`${baseUrl}/api/wizard/generate-story`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${userAnyaToken}` },
        body: JSON.stringify({})
      });
    }
    const rateLimited429 = await fetch(`${baseUrl}/api/wizard/generate-story`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${userAnyaToken}` },
      body: JSON.stringify({})
    });
    verifySecurityHeaders(rateLimited429.headers, 'HTTP 429 Rate Limited response');

    // -------------------------------------------------------------------------
    // SUITE 6: ADVERSARIAL STRESS & ENGINE MECHANICS
    // -------------------------------------------------------------------------
    console.log('\n--- SUITE 6: Adversarial Stress & Engine Mechanics ---');

    // 6.1: High Concurrency Burst (Race Condition Stress Test)
    aiRateLimiterInstance.reset();
    const burstPromises = Array.from({ length: 30 }, () =>
      fetch(`${baseUrl}/api/wizard/generate-story`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userAnyaToken}`
        },
        body: JSON.stringify({})
      })
    );
    const burstResponses = await Promise.all(burstPromises);
    const burstStatuses = burstResponses.map(r => r.status);
    const count200 = burstStatuses.filter(s => s === 200).length;
    const count429 = burstStatuses.filter(s => s === 429).length;

    check(count200 === 10, `Concurrency Stress: Exactly 10 concurrent requests succeed (got ${count200})`);
    check(count429 === 20, `Concurrency Stress: Exactly 20 concurrent requests return 429 (got ${count429})`);

    // 6.2: Sliding Window Expiration & Reset (Time-Travel Verification)
    aiRateLimiterInstance.reset();
    // Simulate 10 requests from 65 seconds ago (outside 60s window)
    const sixtyFiveSecAgo = Date.now() - 65_000;
    aiRateLimiterInstance.store.set('user:user-anya', Array(10).fill(sixtyFiveSecAgo));

    const expiredWindowRes = await fetch(`${baseUrl}/api/wizard/generate-story`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${userAnyaToken}` },
      body: JSON.stringify({})
    });
    check(expiredWindowRes.status === 200, 'Sliding Window: Expired requests outside the 60s window are pruned and allow new requests (status 200)');

    // 6.3: Garbage Collection & Memory Leak Defense
    const customLimiter = createRateLimiter({ windowMs: 1000 });
    // Inject 50 stale clients
    for (let i = 0; i < 50; i++) {
      customLimiter.store.set(`user:stale-${i}`, [Date.now() - 2000]);
    }
    check(customLimiter.getStoreSize() === 50, 'Garbage Collection: Populated 50 stale client keys');
    customLimiter.cleanup();
    check(customLimiter.getStoreSize() === 0, 'Garbage Collection: cleanup() completely prunes expired keys to prevent memory leak (store size: 0)');
    customLimiter.destroy();

    // 6.4: Forged/Tampered Token Fallback Resilience
    aiRateLimiterInstance.reset();
    const forgedTokenRes = await fetch(`${baseUrl}/api/wizard/generate-story`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer forged.tampered.token'
      },
      body: JSON.stringify({})
    });
    // Forged token should not crash server; optionalAuth falls back to IP key
    check(forgedTokenRes.status === 200, 'Forged Token Resilience: Forged Authorization header does not crash server (gracefully falls back to IP rate limiting)');

    // 6.5: getAiRateLimitMax Configuration Fallbacks
    check(getAiRateLimitMax(undefined) === 10, 'getAiRateLimitMax: Default limit is 10');
    check(getAiRateLimitMax(5) === 5, 'getAiRateLimitMax: Explicit configured max (5) overrides default');
    check(getAiRateLimitMax(-3) === 10, 'getAiRateLimitMax: Negative configured max safely falls back to 10');

    // 6.6: Dynamic CORS Environment Variables
    const originalAllowedOrigins = process.env.ALLOWED_ORIGINS;
    process.env.ALLOWED_ORIGINS = 'https://custom-app.example.com, https://preview.example.com/';
    const resolvedOrigins = getAllowedOrigins();
    check(resolvedOrigins.includes('https://custom-app.example.com'), 'getAllowedOrigins: Resolves custom origins from ALLOWED_ORIGINS env var');
    check(resolvedOrigins.includes('https://preview.example.com'), 'getAllowedOrigins: Strips trailing slashes from ALLOWED_ORIGINS');
    process.env.ALLOWED_ORIGINS = originalAllowedOrigins;

  } finally {
    await new Promise(resolve => server.close(resolve));
    console.log('\n  [TEARDOWN] Test server closed cleanly.');
  }

  // -------------------------------------------------------------------------
  // SUMMARY REPORT
  // -------------------------------------------------------------------------
  console.log('\n========================================================================');
  console.log(`  CHALLENGER 1 RESULTS: ${passedCount} PASSED, ${failedCount} FAILED (TOTAL: ${passedCount + failedCount})`);
  console.log('========================================================================\n');

  if (failedCount > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

main().catch(err => {
  console.error('[UNCAUGHT TEST RUNNER ERROR]:', err);
  process.exit(1);
});
