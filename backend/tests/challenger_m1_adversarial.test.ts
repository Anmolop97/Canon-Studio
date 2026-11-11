/**
 * challenger_m1_adversarial.test.ts
 *
 * EMPIRICAL ADVERSARIAL CHALLENGE SUITE: Milestone 1 (Authentication Hardening - R1)
 *
 * Focus: Exhaustive stress-testing, boundary condition exploration,
 * cryptographic attack vectors, and edge cases against `backend/src/routes/auth.ts`.
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { AddressInfo } from 'node:net';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

// Set NODE_ENV = test to avoid port conflicts
process.env.NODE_ENV = 'test';

const { default: app } = await import('../src/server.js');
const {
  createAuthToken,
  verifyToken,
  requireAuth,
  optionalAuth,
  getAuthSecret,
  safeUser
} = await import('../src/routes/auth.js');
const { storageService } = await import('../src/services/storage.js');

let server: http.Server;
let baseUrl: string;

function toBase64Url(data: string | Buffer): string {
  const buf = typeof data === 'string' ? Buffer.from(data, 'utf8') : data;
  return buf.toString('base64url');
}

function parseBase64Url(b64url: string): string {
  return Buffer.from(b64url, 'base64url').toString('utf8');
}

before(async () => {
  await new Promise<void>((resolve) => {
    server = app.listen(0, () => {
      const addr = server.address() as AddressInfo;
      baseUrl = `http://127.0.0.1:${addr.port}`;
      resolve();
    });
  });
});

after(async () => {
  if (server) {
    await new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
  }
});

/* ========================================================================== */
/* Category A: Unsigned, Legacy, and Spoofed Token Attacks                    */
/* ========================================================================== */

describe('Category A: Unsigned, Legacy, and Spoofed Token Attacks', () => {
  it('A01: Forged legacy token format "token-user-anya" is rejected by verifyToken', () => {
    assert.equal(verifyToken('token-user-anya'), null);
  });

  it('A02: Plain userId "user-anya" is rejected by verifyToken', () => {
    assert.equal(verifyToken('user-anya'), null);
  });

  it('A03: Bearer token-user-anya sent to /api/auth/me is rejected with HTTP 401', async () => {
    const res = await fetch(`${baseUrl}/api/auth/me`, {
      headers: { Authorization: 'Bearer token-user-anya' }
    });
    assert.equal(res.status, 401);
    const body = await res.json();
    assert.equal(body.error, 'Unauthorized: Invalid or expired token');
  });

  it('A04: Legacy token without Bearer prefix sent to /api/auth/me is rejected with HTTP 401', async () => {
    const res = await fetch(`${baseUrl}/api/auth/me`, {
      headers: { Authorization: 'token-user-anya' }
    });
    assert.equal(res.status, 401);
  });

  it('A05: Non-Bearer schemes (Basic, Token, Digest) are rejected with HTTP 401', async () => {
    const schemes = [
      'Basic dXNlcjpwYXNz',
      'Token some-token-value',
      'Digest username="anya", realm="canon"',
      'CustomAuth token-user-anya'
    ];
    for (const header of schemes) {
      const res = await fetch(`${baseUrl}/api/auth/me`, {
        headers: { Authorization: header }
      });
      assert.equal(res.status, 401, `Scheme "${header}" should be rejected with 401`);
    }
  });

  it('A06: Empty, whitespace, or missing token strings return null', () => {
    assert.equal(verifyToken(''), null);
    assert.equal(verifyToken('   '), null);
    assert.equal(verifyToken('\t\n'), null);
    assert.equal((verifyToken as any)(null), null);
    assert.equal((verifyToken as any)(undefined), null);
    assert.equal((verifyToken as any)(12345), null);
    assert.equal((verifyToken as any)({}), null);
    assert.equal((verifyToken as any)([]), null);
  });
});

/* ========================================================================== */
/* Category B: Algorithm Confusion & Header Manipulation                      */
/* ========================================================================== */

describe('Category B: Algorithm Confusion & Header Manipulation', () => {
  it('B01: Alg: "none" with empty signature is rejected', () => {
    const header = toBase64Url(JSON.stringify({ alg: 'none', typ: 'JWT' }));
    const payload = toBase64Url(JSON.stringify({ userId: 'user-anya', exp: Math.floor(Date.now() / 1000) + 3600 }));
    const token = `${header}.${payload}.`;
    assert.equal(verifyToken(token), null);
  });

  it('B02: Alg: "none" with arbitrary signature is rejected', () => {
    const header = toBase64Url(JSON.stringify({ alg: 'none', typ: 'JWT' }));
    const payload = toBase64Url(JSON.stringify({ userId: 'user-anya', exp: Math.floor(Date.now() / 1000) + 3600 }));
    const token = `${header}.${payload}.${toBase64Url('unsigned')}`;
    assert.equal(verifyToken(token), null);
  });

  it('B03: Alg: "NONE", "None", "nOnE" case variations are rejected', () => {
    for (const alg of ['NONE', 'None', 'nOnE', 'noNe']) {
      const header = toBase64Url(JSON.stringify({ alg, typ: 'JWT' }));
      const payload = toBase64Url(JSON.stringify({ userId: 'user-anya', exp: Math.floor(Date.now() / 1000) + 3600 }));
      const token = `${header}.${payload}.${toBase64Url('sig')}`;
      assert.equal(verifyToken(token), null, `Alg "${alg}" should be rejected`);
    }
  });

  it('B04: Alg: "RS256", "ES256", "HS384", "HS512" are rejected (HS256 strictly enforced)', () => {
    for (const alg of ['RS256', 'ES256', 'HS384', 'HS512', 'none']) {
      const header = toBase64Url(JSON.stringify({ alg, typ: 'JWT' }));
      const payload = toBase64Url(JSON.stringify({ userId: 'user-anya', exp: Math.floor(Date.now() / 1000) + 3600 }));
      // Calculate HMAC with current secret
      const secret = getAuthSecret();
      const sig = crypto.createHmac('sha256', secret).update(`${header}.${payload}`).digest('base64url');
      const token = `${header}.${payload}.${sig}`;
      assert.equal(verifyToken(token), null, `Alg "${alg}" should be rejected even if HMAC matches`);
    }
  });

  it('B05: Missing alg property in header is rejected', () => {
    const header = toBase64Url(JSON.stringify({ typ: 'JWT' }));
    const payload = toBase64Url(JSON.stringify({ userId: 'user-anya', exp: Math.floor(Date.now() / 1000) + 3600 }));
    const secret = getAuthSecret();
    const sig = crypto.createHmac('sha256', secret).update(`${header}.${payload}`).digest('base64url');
    const token = `${header}.${payload}.${sig}`;
    assert.equal(verifyToken(token), null);
  });

  it('B06: Header containing malformed JSON is rejected', () => {
    const badHeader = toBase64Url('{ alg: HS256, typ: JWT '); // malformed json
    const payload = toBase64Url(JSON.stringify({ userId: 'user-anya', exp: Math.floor(Date.now() / 1000) + 3600 }));
    const token = `${badHeader}.${payload}.dummy_signature`;
    assert.equal(verifyToken(token), null);
  });

  it('B07: Header containing non-object JSON (number, array, boolean, string) is rejected', () => {
    for (const invalidHeaderVal of [123, [1, 2], true, 'HS256', null]) {
      const header = toBase64Url(JSON.stringify(invalidHeaderVal));
      const payload = toBase64Url(JSON.stringify({ userId: 'user-anya', exp: Math.floor(Date.now() / 1000) + 3600 }));
      const token = `${header}.${payload}.sig`;
      assert.equal(verifyToken(token), null);
    }
  });
});

/* ========================================================================== */
/* Category C: Signature Tampering & Timing-Safe Verification                */
/* ========================================================================== */

describe('Category C: Signature Tampering & Timing-Safe Verification', () => {
  it('C01: Valid token successfully verifies', () => {
    const token = createAuthToken('user-anya', 3600);
    const verified = verifyToken(token);
    assert.ok(verified);
    assert.equal(verified?.userId, 'user-anya');
  });

  it('C02: Tampering single character in signature is rejected', () => {
    const token = createAuthToken('user-anya', 3600);
    const parts = token.split('.');
    const sig = parts[2];
    const tamperedChar = sig[0] === 'a' ? 'b' : 'a';
    const tamperedSig = tamperedChar + sig.slice(1);
    const tamperedToken = `${parts[0]}.${parts[1]}.${tamperedSig}`;
    assert.equal(verifyToken(tamperedToken), null);
  });

  it('C03: Truncating signature buffer does NOT throw RangeError in crypto.timingSafeEqual', () => {
    const token = createAuthToken('user-anya', 3600);
    const parts = token.split('.');
    for (const len of [1, 5, 10, 20, parts[2].length - 1]) {
      const truncatedSig = parts[2].slice(0, len);
      const truncatedToken = `${parts[0]}.${parts[1]}.${truncatedSig}`;
      assert.doesNotThrow(() => {
        const result = verifyToken(truncatedToken);
        assert.equal(result, null);
      });
    }
  });

  it('C04: Elongating signature buffer does NOT throw RangeError in crypto.timingSafeEqual', () => {
    const token = createAuthToken('user-anya', 3600);
    const parts = token.split('.');
    for (const extra of ['a', 'abc', '====================']) {
      const elongatedSig = parts[2] + extra;
      const elongatedToken = `${parts[0]}.${parts[1]}.${elongatedSig}`;
      assert.doesNotThrow(() => {
        const result = verifyToken(elongatedToken);
        assert.equal(result, null);
      });
    }
  });

  it('C05: Empty signature segment (2 dots, 3 parts with empty 3rd part) is rejected', () => {
    const token = createAuthToken('user-anya', 3600);
    const parts = token.split('.');
    const emptySigToken = `${parts[0]}.${parts[1]}.`;
    assert.equal(verifyToken(emptySigToken), null);
  });

  it('C06: 2-part and 4-part tokens are rejected', () => {
    const token = createAuthToken('user-anya', 3600);
    const parts = token.split('.');
    const twoPartToken = `${parts[0]}.${parts[1]}`;
    const fourPartToken = `${parts[0]}.${parts[1]}.${parts[2]}.extra`;
    assert.equal(verifyToken(twoPartToken), null);
    assert.equal(verifyToken(fourPartToken), null);
  });

  it('C07: Token signed with foreign/attacker secret key is rejected', () => {
    const header = toBase64Url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const payload = toBase64Url(JSON.stringify({ userId: 'user-anya', exp: Math.floor(Date.now() / 1000) + 3600 }));
    const attackerSecret = 'attacker-evil-secret-12345';
    const attackerSig = crypto.createHmac('sha256', attackerSecret).update(`${header}.${payload}`).digest('base64url');
    const forgedToken = `${header}.${payload}.${attackerSig}`;
    assert.equal(verifyToken(forgedToken), null);
  });
});

/* ========================================================================== */
/* Category D: Payload Tampering & Privilege Escalation                      */
/* ========================================================================== */

describe('Category D: Payload Tampering & Privilege Escalation', () => {
  it('D01: Modifying payload userId from guest to anya while preserving signature is rejected', () => {
    const guestToken = createAuthToken('user-guest', 3600);
    const [h, p, s] = guestToken.split('.');
    
    // Modify userId to anya
    const decoded = JSON.parse(parseBase64Url(p));
    decoded.userId = 'user-anya';
    const tamperedPayload = toBase64Url(JSON.stringify(decoded));

    const tamperedToken = `${h}.${tamperedPayload}.${s}`;
    assert.equal(verifyToken(tamperedToken), null);
  });

  it('D02: Modifying payload exp to extend token lifetime while preserving signature is rejected', () => {
    const token = createAuthToken('user-anya', 60); // 60s
    const [h, p, s] = token.split('.');

    const decoded = JSON.parse(parseBase64Url(p));
    decoded.exp = decoded.exp + 1000000; // Extend by ~11 days
    const tamperedPayload = toBase64Url(JSON.stringify(decoded));

    const tamperedToken = `${h}.${tamperedPayload}.${s}`;
    assert.equal(verifyToken(tamperedToken), null);
  });

  it('D03: Payload with empty or whitespace userId is rejected', () => {
    for (const badId of ['', '   ', '\t', '\n']) {
      const header = toBase64Url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
      const payload = toBase64Url(JSON.stringify({ userId: badId, exp: Math.floor(Date.now() / 1000) + 3600 }));
      const secret = getAuthSecret();
      const sig = crypto.createHmac('sha256', secret).update(`${header}.${payload}`).digest('base64url');
      const token = `${header}.${payload}.${sig}`;
      assert.equal(verifyToken(token), null, `UserId "${badId}" should be rejected`);
    }
  });

  it('D04: Payload with non-string userId (number, boolean, object, array, null) is rejected', () => {
    for (const badId of [123, true, false, { id: 'user-anya' }, ['user-anya'], null]) {
      const header = toBase64Url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
      const payload = toBase64Url(JSON.stringify({ userId: badId, exp: Math.floor(Date.now() / 1000) + 3600 }));
      const secret = getAuthSecret();
      const sig = crypto.createHmac('sha256', secret).update(`${header}.${payload}`).digest('base64url');
      const token = `${header}.${payload}.${sig}`;
      assert.equal(verifyToken(token), null, `Type ${typeof badId} userId should be rejected`);
    }
  });

  it('D05: Payload with malformed JSON is rejected', () => {
    const header = toBase64Url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const badPayload = toBase64Url('{"userId": "user-anya", unclosed_json');
    const secret = getAuthSecret();
    const sig = crypto.createHmac('sha256', secret).update(`${header}.${badPayload}`).digest('base64url');
    const token = `${header}.${badPayload}.${sig}`;
    assert.equal(verifyToken(token), null);
  });

  it('D06: Payload containing non-object JSON is rejected', () => {
    for (const nonObj of ['user-anya', 12345, true, [1, 2, 3]]) {
      const header = toBase64Url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
      const payload = toBase64Url(JSON.stringify(nonObj));
      const secret = getAuthSecret();
      const sig = crypto.createHmac('sha256', secret).update(`${header}.${payload}`).digest('base64url');
      const token = `${header}.${payload}.${sig}`;
      assert.equal(verifyToken(token), null);
    }
  });
});

/* ========================================================================== */
/* Category E: Expiration (exp) Verification & Time Boundary Edge Cases      */
/* ========================================================================== */

describe('Category E: Expiration (exp) Verification & Time Boundary Edge Cases', () => {
  it('E01: Token with exp in the past is rejected', () => {
    const expiredToken = createAuthToken('user-anya', -10); // Expired 10s ago
    assert.equal(verifyToken(expiredToken), null);
  });

  it('E02: Token with exp equal to current second is rejected (must be strictly in future)', () => {
    const now = Math.floor(Date.now() / 1000);
    const header = toBase64Url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const payload = toBase64Url(JSON.stringify({ userId: 'user-anya', iat: now - 10, exp: now }));
    const secret = getAuthSecret();
    const sig = crypto.createHmac('sha256', secret).update(`${header}.${payload}`).digest('base64url');
    const token = `${header}.${payload}.${sig}`;
    assert.equal(verifyToken(token), null);
  });

  it('E03: Token with exp set to future is accepted', () => {
    const futureToken = createAuthToken('user-anya', 120); // 2 minutes future
    const verified = verifyToken(futureToken);
    assert.ok(verified);
    assert.equal(verified?.userId, 'user-anya');
    assert.ok(verified!.exp > Math.floor(Date.now() / 1000));
  });

  it('E04: Token with non-number exp (string, boolean, array, null) is rejected', () => {
    for (const badExp of ['2099-12-31', '3600', true, [9999999999], null]) {
      const header = toBase64Url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
      const payload = toBase64Url(JSON.stringify({ userId: 'user-anya', exp: badExp }));
      const secret = getAuthSecret();
      const sig = crypto.createHmac('sha256', secret).update(`${header}.${payload}`).digest('base64url');
      const token = `${header}.${payload}.${sig}`;
      assert.equal(verifyToken(token), null, `exp of type ${typeof badExp} should be rejected`);
    }
  });

  it('E05: Expired token sent to /api/auth/me receives HTTP 401', async () => {
    const expiredToken = createAuthToken('user-anya', -60);
    const res = await fetch(`${baseUrl}/api/auth/me`, {
      headers: { Authorization: `Bearer ${expiredToken}` }
    });
    assert.equal(res.status, 401);
    const body = await res.json();
    assert.equal(body.error, 'Unauthorized: Invalid or expired token');
  });
});

/* ========================================================================== */
/* Category F: Middleware & Endpoint Security Integration                     */
/* ========================================================================== */

describe('Category F: Middleware & Endpoint Security Integration', () => {
  it('F01: requireAuth rejects missing Authorization header with HTTP 401', async () => {
    const res = await fetch(`${baseUrl}/api/auth/me`);
    assert.equal(res.status, 401);
    const body = await res.json();
    assert.equal(body.error, 'Unauthorized: Invalid or expired token');
  });

  it('F02: requireAuth rejects valid token for non-existent userId with HTTP 401', async () => {
    const nonExistentToken = createAuthToken('user-nonexistent-99999', 3600);
    const res = await fetch(`${baseUrl}/api/auth/me`, {
      headers: { Authorization: `Bearer ${nonExistentToken}` }
    });
    assert.equal(res.status, 401);
    const body = await res.json();
    assert.equal(body.error, 'Unauthorized: Invalid or expired token');
  });

  it('F03: requireAuth attaches authenticated user and allows access to /api/auth/me', async () => {
    const validToken = createAuthToken('user-anya', 3600);
    const res = await fetch(`${baseUrl}/api/auth/me`, {
      headers: { Authorization: `Bearer ${validToken}` }
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.ok(body.user);
    assert.equal(body.user.id, 'user-anya');
    assert.equal(body.user.displayName, 'Anya Sharma');
  });

  it('F04: safeUser strips password and passwordHash from user object', () => {
    const rawUser: any = {
      id: 'user-test',
      email: 'test@canonstory.studio',
      displayName: 'Test User',
      createdAt: '2026-01-01',
      password: 'plain-text-pw',
      passwordHash: 'sha256:salted:hash',
      internalFlag: true
    };
    const sanitized = safeUser(rawUser);
    assert.equal(sanitized.id, 'user-test');
    assert.equal(sanitized.email, 'test@canonstory.studio');
    assert.equal(sanitized.displayName, 'Test User');
    assert.equal(sanitized.createdAt, '2026-01-01');
    assert.equal((sanitized as any).password, undefined);
    assert.equal((sanitized as any).passwordHash, undefined);
    assert.equal((sanitized as any).internalFlag, undefined);
  });

  it('F05: optionalAuth leaves req.user undefined when no Authorization header', () => {
    let capturedReq: any = { headers: {} };
    let nextCalled = false;
    optionalAuth(capturedReq, {} as any, () => {
      nextCalled = true;
    });
    assert.ok(nextCalled);
    assert.equal(capturedReq.user, undefined);
  });

  it('F06: optionalAuth leaves req.user undefined when invalid/expired/tampered token provided without erroring', () => {
    const invalidHeaders = [
      'Bearer token-user-anya',
      'Bearer bad.token.here',
      `Bearer ${createAuthToken('user-anya', -10)}`, // expired
      `Bearer ${createAuthToken('user-nonexistent', 3600)}` // non-existent
    ];

    for (const h of invalidHeaders) {
      let capturedReq: any = { headers: { authorization: h } };
      let nextCalled = false;
      optionalAuth(capturedReq, {} as any, () => {
        nextCalled = true;
      });
      assert.ok(nextCalled, `next() must be called for ${h}`);
      assert.equal(capturedReq.user, undefined, `req.user must be undefined for ${h}`);
    }
  });

  it('F07: optionalAuth attaches user when valid token provided', () => {
    const token = createAuthToken('user-anya', 3600);
    let capturedReq: any = { headers: { authorization: `Bearer ${token}` } };
    let nextCalled = false;
    optionalAuth(capturedReq, {} as any, () => {
      nextCalled = true;
    });
    assert.ok(nextCalled);
    assert.ok(capturedReq.user);
    assert.equal(capturedReq.user.id, 'user-anya');
  });

  it('F08: POST /api/auth/login returns valid 3-part HMAC signed token that authenticates', async () => {
    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'anya@canonstory.studio', password: 'anya123' })
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.ok(body.token);
    const parts = body.token.split('.');
    assert.equal(parts.length, 3);

    // Verify token authenticates
    const meRes = await fetch(`${baseUrl}/api/auth/me`, {
      headers: { Authorization: `Bearer ${body.token}` }
    });
    assert.equal(meRes.status, 200);
    const meBody = await meRes.json();
    assert.equal(meBody.user.id, 'user-anya');
  });

  it('F09: POST /api/auth/login with invalid password receives HTTP 401', async () => {
    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'anya@canonstory.studio', password: 'wrongpassword' })
    });
    assert.equal(res.status, 401);
  });

  it('F10: POST /api/auth/register generates signed token that authenticates immediately', async () => {
    const uniqueEmail = `challenger_test_${Date.now()}@canonstory.studio`;
    const res = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: uniqueEmail,
        password: 'securepassword123',
        displayName: 'Challenger Registrant'
      })
    });
    assert.equal(res.status, 201);
    const body = await res.json();
    assert.ok(body.token);

    const meRes = await fetch(`${baseUrl}/api/auth/me`, {
      headers: { Authorization: `Bearer ${body.token}` }
    });
    assert.equal(meRes.status, 200);
    const meBody = await meRes.json();
    assert.equal(meBody.user.email, uniqueEmail.toLowerCase());
  });
});

/* ========================================================================== */
/* Category G: Advanced Boundary, Prototype & Injection Vectors              */
/* ========================================================================== */

describe('Category G: Advanced Boundary, Prototype & Injection Vectors', () => {
  it('G01: Payload containing prototype pollution keys does not pollute Object.prototype', () => {
    const maliciousPayload = {
      __proto__: { polluted: true },
      constructor: { prototype: { polluted: true } },
      userId: 'user-anya',
      exp: Math.floor(Date.now() / 1000) + 3600
    };
    const headerB64 = toBase64Url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const payloadB64 = toBase64Url(JSON.stringify(maliciousPayload));
    const sig = crypto.createHmac('sha256', getAuthSecret()).update(`${headerB64}.${payloadB64}`).digest('base64url');
    const token = `${headerB64}.${payloadB64}.${sig}`;

    const verified = verifyToken(token);
    assert.ok(verified);
    assert.equal(verified?.userId, 'user-anya');
    assert.equal((Object.prototype as any).polluted, undefined, 'Object.prototype must not be polluted');
    delete (Object.prototype as any).polluted;
  });

  it('G02: Token with null byte injection is safely rejected or handled without crash', () => {
    const headerB64 = toBase64Url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const payloadB64 = toBase64Url(JSON.stringify({ userId: 'user-anya\0admin', exp: Math.floor(Date.now() / 1000) + 3600 }));
    const sig = crypto.createHmac('sha256', getAuthSecret()).update(`${headerB64}.${payloadB64}`).digest('base64url');
    const token = `${headerB64}.${payloadB64}.${sig}`;

    const verified = verifyToken(token);
    // Even if verified, user-anya\0admin does not match existing user-anya
    assert.ok(verified);
    const user = storageService.findUserById(verified!.userId);
    assert.equal(user, undefined, 'Null-byte injected user ID must not resolve to real user');
  });

  it('G03: Token with standard Base64 characters (+, /, =) rejected by timingSafeEqual comparison', () => {
    // Generate valid token and replace URL-safe chars with standard base64 if possible
    const token = createAuthToken('user-anya', 3600);
    const [h, p, s] = token.split('.');
    // If we append standard base64 padding '='
    const paddedToken = `${h}.${p}.${s}=`;
    assert.equal(verifyToken(paddedToken), null);
  });

  it('G04: Extremely long payload (100KB) does not cause server crash or unhandled error', () => {
    const largeData = 'A'.repeat(100 * 1024);
    const headerB64 = toBase64Url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const payloadB64 = toBase64Url(JSON.stringify({
      userId: 'user-anya',
      exp: Math.floor(Date.now() / 1000) + 3600,
      junk: largeData
    }));
    const sig = crypto.createHmac('sha256', getAuthSecret()).update(`${headerB64}.${payloadB64}`).digest('base64url');
    const largeToken = `${headerB64}.${payloadB64}.${sig}`;

    assert.doesNotThrow(() => {
      const verified = verifyToken(largeToken);
      assert.ok(verified);
      assert.equal(verified?.userId, 'user-anya');
    });
  });

  it('G05: Verify secret key isolation: token signed with different secret fails verification', () => {
    const headerB64 = toBase64Url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const payloadB64 = toBase64Url(JSON.stringify({ userId: 'user-anya', exp: Math.floor(Date.now() / 1000) + 3600 }));
    // Sign with slightly different secret
    const differentSecret = getAuthSecret() + '_suffix';
    const sig = crypto.createHmac('sha256', differentSecret).update(`${headerB64}.${payloadB64}`).digest('base64url');
    const token = `${headerB64}.${payloadB64}.${sig}`;

    assert.equal(verifyToken(token), null);
  });
});

