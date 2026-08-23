import { createServer, type IncomingMessage, type Server as HttpServer, type ServerResponse } from 'node:http';
import {
  localhostHostValidation,
  localhostOriginValidation,
  toNodeHandler,
} from '@modelcontextprotocol/node';
import {
  createMcpHandler,
  type AuthInfo,
  type CreateMcpHandlerOptions,
  type McpHttpHandler,
  type McpServerFactory,
} from '@modelcontextprotocol/server';

/**
 * One HTTP endpoint serving the 2026-07-28 protocol revision.
 *
 * The whole of the 2026 wire lives behind `createMcpHandler(factory)`. The
 * factory runs **once per request** — there is no session to attach an
 * instance to, because 2026-07-28 removed `initialize`/`initialized` and the
 * `Mcp-Session-Id` header (SEP-2575, SEP-2567). Every request is
 * self-describing, so any request can land on any instance.
 *
 * `legacy` defaults to `'stateless'`, which means the SAME factory also
 * answers 2025-era clients through the established stateless idiom. One
 * definition of your tools, two eras, no drift.
 */
export type ServeOptions = CreateMcpHandlerOptions & {
  /**
   * Non-MCP routes (OAuth metadata, health checks). Return `true` if the
   * route answered the request.
   */
  routes?: (request: IncomingMessage, response: ServerResponse) => boolean | Promise<boolean>;
  /**
   * Turn a request into a verified identity, or answer it yourself (401) and
   * return `undefined`.
   *
   * The SDK deliberately performs no token verification of its own — what it
   * gives you is a pass-through: whatever this returns reaches the factory as
   * `ctx.authInfo`, and it is never derived from headers by the SDK.
   */
  authenticate?: (request: IncomingMessage, response: ServerResponse) => Promise<AuthInfo | undefined>;
};

export type McpHttpServer = {
  http: HttpServer;
  handler: McpHttpHandler;
  close: () => Promise<void>;
};

export async function serveHttp(
  factory: McpServerFactory,
  port: number,
  options: ServeOptions = {},
): Promise<McpHttpServer> {
  const { routes, authenticate, ...handlerOptions } = options;

  const handler = createMcpHandler(factory, {
    onerror: (error) => console.error('[mcp]', error.message),
    ...handlerOptions,
  });
  const nodeHandler = toNodeHandler(handler);

  // DNS-rebinding and cross-origin guards. The guards answer rejected
  // requests with 403 themselves and return false, so we must not touch the
  // request afterwards.
  const checkHost = localhostHostValidation();
  const checkOrigin = localhostOriginValidation();

  const http = createServer(async (request, response) => {
    try {
      if (!checkHost(request, response) || !checkOrigin(request, response)) return;
      if (await routes?.(request, response)) return;

      const { pathname } = new URL(request.url ?? '/', `http://localhost:${port}`);
      if (pathname !== '/mcp') {
        response.writeHead(404).end('Not Found');
        return;
      }

      if (authenticate) {
        const auth = await authenticate(request, response);
        if (!auth) return; // authenticate() already answered (401/403)
        // toNodeHandler forwards `req.auth` to the factory as ctx.authInfo.
        (request as IncomingMessage & { auth?: AuthInfo }).auth = auth;
      }

      await nodeHandler(request, response);
    } catch (error) {
      console.error('[http]', error);
      if (!response.headersSent) response.writeHead(500);
      response.end('Internal Server Error');
    }
  });

  // Bind loopback explicitly. Left to its own devices Node binds dual-stack,
  // and on macOS that can "succeed" while another process already holds the
  // IPv6 side of the same port — you then get a server nobody can reach
  // instead of the EADDRINUSE that would have told you why.
  //
  // A container has no loopback worth binding, so `MCP_BIND_HOST=0.0.0.0`
  // opens it up. Loopback stays the default: reachable-by-anything should be
  // something you asked for.
  const bindHost = process.env.MCP_BIND_HOST ?? '127.0.0.1';
  await new Promise<void>((resolve, reject) => {
    http.once('error', reject);
    http.listen(port, bindHost, () => {
      http.off('error', reject);
      resolve();
    });
  });

  return {
    http,
    handler,
    close: async () => {
      await handler.close();
      await new Promise<void>((resolve) => http.close(() => resolve()));
    },
  };
}

/** Consistent startup banner across every example. */
export function banner(title: string, port: number, lines: string[] = []): void {
  console.log(`\n${title}`);
  console.log(`   endpoint  http://localhost:${port}/mcp`);
  console.log(`   protocol  2026-07-28 (2025-era clients served via the stateless legacy fallback)`);
  for (const line of lines) console.log(`   ${line}`);
  console.log('');
}
