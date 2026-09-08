import type { IncomingMessage, ServerResponse } from 'node:http';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { CallToolResultSchema } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { Store } from '../../../packages/storage/src/index.ts';
import { createMcpServer } from './mcp.ts';
import { browserSession, htmlPolicy, HttpError, privateHeaders, readJsonBody } from './browser-security.ts';

export type DashboardPages = { dashboard: string; about: string };
const callSchema = z.object({
  name: z.enum(['list_explorations', 'read_exploration', 'open_exploration', 'review_draft', 'request_branch', 'request_weave', 'dismiss_gesture_request', 'review_weave_result']),
  arguments: z.record(z.unknown()).default({}),
}).strict();

/** A local browser host for the SAME MCP implementation and Store; no second write API. */
export function dashboardRoutes(store: Store, widget: string, pages: DashboardPages) {
  const session = browserSession();
  const documents = new Map([
    ['/', { html: pages.dashboard, embedded: false }],
    ['/about', { html: pages.about, embedded: false }],
    ['/app/widget', { html: widget, embedded: true }],
  ]);
  return async (req: IncomingMessage, res: ServerResponse): Promise<boolean> => {
    const path = (req.url ?? '').split('?')[0]!;
    const document = documents.get(path);
    if (!document && path !== '/api/session' && path !== '/api/call') return false;
    privateHeaders(res);
    const json = (status: number, data: unknown) => {
      res.writeHead(status, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(data));
    };
    try {
      if (req.headers['sec-fetch-site'] && !['same-origin', 'none'].includes(String(req.headers['sec-fetch-site']))) {
        throw new HttpError(403, 'ORIGIN_REQUIRED', 'Cross-site dashboard access is disabled.');
      }
      if (document) {
        if (!['GET', 'HEAD'].includes(req.method ?? '')) { res.setHeader('Allow', 'GET, HEAD'); throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Use GET.'); }
        res.setHeader('Content-Security-Policy', htmlPolicy(document.html, document.embedded));
        res.setHeader('X-Frame-Options', document.embedded ? 'SAMEORIGIN' : 'DENY');
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(req.method === 'HEAD' ? undefined : document.html); return true;
      }
      if (path === '/api/session') {
        if (req.method !== 'GET') { res.setHeader('Allow', 'GET'); throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Use GET.'); }
        if (req.headers['x-shadow-walker-client'] !== 'dashboard' ||
            (req.headers.origin && req.headers.origin !== `http://${req.headers.host}`)) {
          throw new HttpError(403, 'ORIGIN_REQUIRED', 'Open the local dashboard to initialize its session.');
        }
        json(200, { sessionToken: session.token, mode: 'local-only' }); return true;
      }
      if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Use POST.'); }
      session.check(req);
      const parsed = callSchema.safeParse(await readJsonBody(req));
      if (!parsed.success) throw new HttpError(400, 'INVALID_CALL', 'Only exploration inspection, human cartographic requests, and human review are available here.');
      const server = createMcpServer(store, widget);
      const client = new Client({ name: 'shadow-walker-local-dashboard', version: '0.1.0' });
      const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
      try {
        await server.connect(serverTransport); await client.connect(clientTransport);
        const result = CallToolResultSchema.parse(await client.callTool(parsed.data));
        json(200, result);
      } finally { await client.close(); await server.close(); }
    } catch (error) {
      if (!res.headersSent) {
        const known = error instanceof HttpError;
        json(known ? error.status : 400, { error: { code: known ? error.code : 'CALL_FAILED',
          message: known ? error.message : 'The request failed. Reload the exploration before continuing.' } });
      } else if (!res.writableEnded) res.end();
    }
    return true;
  };
}
