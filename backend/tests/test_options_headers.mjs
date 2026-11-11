import http from 'http';
import app from '../dist/server.js';

const server = http.createServer(app);
await new Promise(resolve => server.listen(0, resolve));
const port = server.address().port;
const base = `http://localhost:${port}`;

// 1. OPTIONS with disallowed origin
const resDisallowed = await fetch(`${base}/api/wizard/generate-story`, {
  method: 'OPTIONS',
  headers: {
    'Origin': 'https://evil-attacker.com',
    'Access-Control-Request-Method': 'POST'
  }
});

console.log('--- Disallowed Origin OPTIONS ---');
console.log('Status:', resDisallowed.status);
console.log('Headers:');
for (const [k, v] of resDisallowed.headers.entries()) {
  console.log(`  ${k}: ${v}`);
}

// 2. GET /api/health
const resGet = await fetch(`${base}/api/health`);
console.log('\n--- GET /api/health ---');
console.log('Status:', resGet.status);
console.log('Headers:');
for (const [k, v] of resGet.headers.entries()) {
  console.log(`  ${k}: ${v}`);
}

// 3. POST /api/auth/login
const resPost = await fetch(`${base}/api/auth/login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'test@example.com', password: 'wrong' })
});
console.log('\n--- POST /api/auth/login ---');
console.log('Status:', resPost.status);
console.log('Headers:');
for (const [k, v] of resPost.headers.entries()) {
  console.log(`  ${k}: ${v}`);
}

server.close();
