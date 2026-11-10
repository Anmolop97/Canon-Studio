import { Request, Response, NextFunction } from 'express';

/**
 * Security Headers Middleware (R5)
 *
 * Enforces standard defensive HTTP security headers to protect against
 * MIME-type sniffing, clickjacking, cross-site scripting (XSS), and data injection.
 * Zero external dependencies.
 */
export function securityHeaders(req: Request, res: Response, next: NextFunction): void {
  // Prevent MIME-sniffing: forces browser to respect declared Content-Type
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // Prevent clickjacking: disallow rendering page in <frame>, <iframe>, <embed>, or <object>
  res.setHeader('X-Frame-Options', 'DENY');

  // Content Security Policy: restrict sources and block framing & plugins
  res.setHeader('Content-Security-Policy', "default-src 'self'; frame-ancestors 'none'; object-src 'none'");

  // Disable obsolete/buggy legacy XSS filter (standard recommendation)
  res.setHeader('X-XSS-Protection', '0');

  // Referrer policy: send full referrer within same origin, origin only across origins, no referrer on downgrade
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  next();
}

export { securityHeaders as securityHeadersMiddleware };
export default securityHeaders;
