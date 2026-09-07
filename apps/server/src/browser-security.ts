import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';

export class HttpError extends Error {
  readonly status: number;
  readonly code: string;
  constructor(status: number, code: string, message: string) { super(message); this.status=status; this.code=code; }
}

/** CSRF protection for a trusted local browser, NOT user authentication. */
export function browserSession() {
  const token = randomBytes(32).toString('base64url');
  return {
    token,
    check(req: IncomingMessage): void {
      if (req.headers.origin !== `http://${req.headers.host}` ||
          (req.headers['sec-fetch-site'] && req.headers['sec-fetch-site'] !== 'same-origin')) {
        throw new HttpError(403, 'ORIGIN_REQUIRED', 'Use the dashboard on this exact local origin.');
      }
      const supplied = req.headers['x-shadow-walker-session'];
      if (typeof supplied !== 'string' || Buffer.byteLength(supplied) !== Buffer.byteLength(token) ||
          !timingSafeEqual(Buffer.from(supplied), Buffer.from(token))) {
        throw new HttpError(403, 'SESSION_EXPIRED', 'Reload the local dashboard session.');
      }
    },
  };
}

export function privateHeaders(res: ServerResponse): void {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
}

/** Only our bundled inline scripts execute. No remote scripts, eval, forms or framing. */
export function htmlPolicy(html: string, embedded = false): string {
  const hashes = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)]
    .map(m => `'sha256-${createHash('sha256').update(m[1]!).digest('base64')}'`);
  return ["default-src 'none'", `script-src ${hashes.join(' ') || "'none'"}`,
    "style-src 'unsafe-inline'", "img-src 'self' data:",
    `connect-src ${embedded ? "'none'" : "'self'"}`, `frame-src ${embedded ? "'none'" : "'self'"}`,
    `frame-ancestors ${embedded ? "'self'" : "'none'"}`, "base-uri 'none'", "form-action 'none'"].join('; ');
}

export async function readJsonBody(req: IncomingMessage, limit = 1024 * 1024): Promise<unknown> {
  if (req.headers['content-type']?.split(';')[0]?.trim().toLowerCase() !== 'application/json') {
    throw new HttpError(415, 'JSON_REQUIRED', 'Expected application/json.');
  }
  if (Number(req.headers['content-length']) > limit) {
    req.resume();
    throw new HttpError(413, 'BODY_TOO_LARGE', 'Request exceeds the byte limit.');
  }
  const chunks: Buffer[] = []; let size = 0;
  // Do not destroy the socket on early iterator exit; still send the 413 response.
  for await (const chunk of req.iterator({ destroyOnReturn: false })) {
    const buffer = Buffer.from(chunk); size += buffer.byteLength;
    if (size > limit) { req.resume(); throw new HttpError(413, 'BODY_TOO_LARGE', 'Request exceeds the byte limit.'); }
    chunks.push(buffer);
  }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); }
  catch { throw new HttpError(400, 'INVALID_JSON', 'Invalid JSON.'); }
}
