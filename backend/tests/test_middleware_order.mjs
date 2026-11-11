import express from 'express';
import cors from 'cors';
import { securityHeaders } from '../dist/middleware/security.js';

const app1 = express();
app1.use(securityHeaders);
app1.use(cors({
  origin: ['http://localhost:5173'],
  credentials: true
}));

const server = app1.listen(0);
const port = server.address().port;

const res = await fetch(`http://localhost:${port}/test`, {
  method: 'OPTIONS',
  headers: {
    'Origin': 'http://localhost:5173',
    'Access-Control-Request-Method': 'POST'
  }
});

console.log('When securityHeaders is BEFORE cors:');
console.log('Status:', res.status);
for (const [k, v] of res.headers.entries()) {
  console.log(`  ${k}: ${v}`);
}
server.close();
