import { createServer, request as httpRequest } from 'node:http';
import { isEntrypoint } from '../shared/entrypoint';
import { BLOCKED_TOOLS, GATEWAY_PORT, PER_TENANT_LIMIT, RATE_LIMITS, SERVER_PORT } from './constants';

/**
 * A gateway that routes, meters and blocks MCP traffic — without parsing a
 * single JSON-RPC body.
 *
 * SEP-2243 requires every Streamable HTTP request to carry:
 *
 *   Mcp-Method: tools/call
 *   Mcp-Name:   search
 *
 * and lets a tool promote one of its own arguments to a header alongside them:
 *
 *   Mcp-Param-Tenant-Id: acme
 *
 * That is the whole feature. Before it, a WAF or rate limiter in front of an
 * MCP server had to buffer the body, parse JSON, and understand JSON-RPC to
 * know whether a request was a cheap `tools/list` or an expensive
 * `tools/call`. Now it reads two headers, like it does for every other HTTP
 * API it already handles.
 *
 * Note what this file does NOT import: no MCP SDK, no JSON-RPC parsing. That is
 * the point — this could be nginx, Envoy, or a Cloudflare Worker.
 */

/**
 * A gateway instance, with its own counters.
 *
 * A factory rather than a module-level server so the stories can meter a fresh
 * one per scenario: shared counters would make the rate-limit assertions depend
 * on the order the tests happened to run in.
 */
export function createGateway(upstreamPort = SERVER_PORT) {
  const counters = new Map<string, number>();
  const tenantCounters = new Map<string, number>();

  return createServer((incoming, outgoing) => {
    const method = String(incoming.headers['mcp-method'] ?? '');
    const name = String(incoming.headers['mcp-name'] ?? '');
    // Declared by the tool as `x-mcp-header: Tenant-Id`, mirrored here by the
    // client. A tool ARGUMENT, readable without touching the body.
    const tenant = String(incoming.headers['mcp-param-tenant-id'] ?? '');

    const deny = (status: number, reason: string) => {
      console.log(`   ⛔ ${status} ${method}${name ? `/${name}` : ''} — ${reason}`);
      outgoing.writeHead(status, { 'content-type': 'application/json' }).end(
        JSON.stringify({ error: reason }),
      );
    };

    if (incoming.method === 'POST') {
      // 1. Block by tool name. No body was read to decide this.
      if (BLOCKED_TOOLS.has(name)) {
        deny(403, `tool "${name}" is blocked by policy`);
        return;
      }

      // 2. Meter per method — a budget for calls, a looser one for listing.
      const budget = RATE_LIMITS[method];
      if (budget !== undefined) {
        const used = (counters.get(method) ?? 0) + 1;
        counters.set(method, used);
        if (used > budget) {
          deny(429, `rate limit for ${method} exceeded (${budget} allowed)`);
          return;
        }
        console.log(`   ✅ ${method}${name ? `/${name}` : ''} (${used}/${budget})`);
      } else if (method) {
        console.log(`   ✅ ${method}${name ? `/${name}` : ''} (unmetered)`);
      }

      // 3. Meter per tenant, off a tool argument the client mirrored into a
      //    header. Still no body read. A real gateway would shard here instead:
      //    tenant → upstream pool.
      if (tenant) {
        const used = (tenantCounters.get(tenant) ?? 0) + 1;
        tenantCounters.set(tenant, used);
        if (used > PER_TENANT_LIMIT) {
          deny(429, `tenant "${tenant}" is over its quota (${PER_TENANT_LIMIT} allowed)`);
          return;
        }
        console.log(`   🏢 tenant ${tenant} (${used}/${PER_TENANT_LIMIT})`);
      }
    }

    // 4. Route. A real gateway would pick an upstream pool from `method` here —
    //    cheap list traffic to one fleet, expensive tool calls to another.
    const proxied = httpRequest(
      {
        host: 'localhost',
        port: upstreamPort,
        path: incoming.url,
        method: incoming.method,
        headers: { ...incoming.headers, host: `localhost:${upstreamPort}` },
      },
      (response) => {
        outgoing.writeHead(response.statusCode ?? 502, response.headers);
        response.pipe(outgoing);
      },
    );

    proxied.on('error', (error) => {
      if (!outgoing.headersSent) outgoing.writeHead(502);
      outgoing.end(`Bad Gateway: ${error.message}`);
    });

    incoming.pipe(proxied);
  });
}

const gateway = createGateway();

if (isEntrypoint(import.meta.url)) {
  gateway.on('error', (error) => {
    throw new Error(`[gateway] could not listen on ${GATEWAY_PORT}: ${error.message}`);
  });

  gateway.listen(GATEWAY_PORT, '127.0.0.1', () => {
    console.log(`\n🚦 Header-routing gateway on http://localhost:${GATEWAY_PORT}/mcp`);
    console.log(`   upstream    localhost:${SERVER_PORT}`);
    console.log(`   blocked     ${[...BLOCKED_TOOLS].join(', ')}`);
    console.log(
      `   metered     ${Object.entries(RATE_LIMITS)
        .map(([method, limit]) => `${method}=${limit}`)
        .join(', ')}`,
    );
    console.log(`   per tenant  ${PER_TENANT_LIMIT} (from Mcp-Param-Tenant-Id)`);
    console.log('   decisions made from Mcp-* headers only — never from the body\n');
  });
}
