import { createServer, request as httpRequest } from 'node:http';
import { randomUUID } from 'node:crypto';
import { McpServer } from '@modelcontextprotocol/server';
import { z } from 'zod';
import { serveHttp } from '../shared/serve';
import { createInMemoryStore } from '../shared/store';
import { isEntrypoint } from '../shared/entrypoint';
import { BALANCER_PORT, CART_TTL_MS, INSTANCE_PORTS } from './constants';

/**
 * THE headline change in 2026-07-28: the protocol core is stateless.
 *
 * Gone: `initialize` / `initialized`, and the `Mcp-Session-Id` header
 * (SEP-2575, SEP-2567). Every request carries its own protocol version, client
 * identity and capabilities in `_meta`. A client that wants capabilities up
 * front calls `server/discover` — optional, one round trip, cacheable.
 *
 * The consequence is the thing you actually wanted: **any request can land on
 * any instance**, behind a plain round-robin load balancer, with no sticky
 * sessions and no shared session store.
 *
 * This file starts two independent server processes' worth of instances plus a
 * dumb round-robin balancer in front. Each instance stamps its own ID into
 * every reply, so the client can watch a single conversation being served by
 * alternating backends.
 */

export function buildServer(instanceId: string) {
  const server = new McpServer(
    { name: 'stateless-demo', version: '2.0.0' },
    {
      capabilities: { tools: {} },
      // `server/discover` is a cacheable result too — a client that probes on
      // every connect should not re-fetch the catalog every time.
      cacheHints: {
        'server/discover': { ttlMs: 30_000, cacheScope: 'public' },
        'tools/list': { ttlMs: 30_000, cacheScope: 'public' },
      },
    },
  );

  server.registerTool(
    'whereAmI',
    {
      title: 'Which instance served this?',
      description: 'Report which backend instance handled this request',
      inputSchema: z.object({}),
      annotations: { readOnlyHint: true },
    },
    async () => ({
      content: [{ type: 'text', text: `served by instance ${instanceId}` }],
    }),
  );

  /**
   * State without sessions.
   *
   * The protocol no longer carries state for you, and that is deliberate: state
   * hidden in the transport is invisible to the model. Mint an explicit handle
   * from a tool and have the model pass it back as an argument. Now the state
   * is a visible part of the conversation — and it works no matter which
   * instance answers, as long as the store is shared.
   */
  server.registerTool(
    'startCart',
    {
      title: 'Start a cart',
      description: 'Create a cart and return its handle',
      inputSchema: z.object({}),
    },
    async () => {
      const cartId = `cart_${randomUUID().slice(0, 8)}`;
      // Durable before the handle goes out. Reverse these two lines and a
      // model that calls addItem immediately gets "unknown cart" for
      // something you just told it exists.
      await carts.set(cartId, []);
      return {
        content: [
          { type: 'text', text: `cart handle: ${cartId} (pass this back to addItem/viewCart)` },
        ],
      };
    },
  );

  server.registerTool(
    'addItem',
    {
      title: 'Add to cart',
      description: 'Add an item to a cart by its handle',
      inputSchema: z.object({
        cartId: z.string().describe('Handle returned by startCart'),
        item: z.string().describe('Item to add'),
      }),
    },
    async ({ cartId, item }) => {
      const cart = await carts.get(cartId);
      // An expired or forged handle is an `isError`, so the model can start a
      // new cart and carry on. A throw would take the conversation with it.
      if (!cart) return { isError: true, content: [{ type: 'text', text: `Unknown or expired cart: ${cartId}` }] };

      // Read, modify, write. Pushing onto the array you got back updates
      // nothing until you put it back — which is exactly how this behaves
      // against Redis, and why the demo behaves that way too.
      cart.push(item);
      await carts.set(cartId, cart);

      return { content: [{ type: 'text', text: `${cartId} now has ${cart.length} item(s) [instance ${instanceId}]` }] };
    },
  );

  server.registerTool(
    'viewCart',
    {
      title: 'View cart',
      description: 'List the contents of a cart by its handle',
      inputSchema: z.object({ cartId: z.string() }),
      annotations: { readOnlyHint: true },
    },
    async ({ cartId }) => {
      const cart = await carts.get(cartId);
      if (!cart) return { isError: true, content: [{ type: 'text', text: `Unknown or expired cart: ${cartId}` }] };
      return {
        content: [{ type: 'text', text: `${cartId}: ${cart.join(', ') || '(empty)'} [instance ${instanceId}]` }],
      };
    },
  );

  return server;
}

/**
 * One store, reached by both instances.
 *
 * The point being made is that the *protocol* holds no state, not that your
 * application has none. Application state lives in a store you chose, and it
 * does not live in the transport.
 *
 * [`shared/store.ts`](../shared/store.ts) is in-memory here, and its interface
 * is async and TTL'd so that becoming Redis later is a change to this line
 * alone. Module 14 mints job handles against the same thing.
 */
export const carts = createInMemoryStore<string[]>({ ttlMs: CART_TTL_MS });

if (isEntrypoint(import.meta.url)) {
  for (const port of INSTANCE_PORTS) {
    const instanceId = `#${INSTANCE_PORTS.indexOf(port) + 1}:${port}`;
    await serveHttp(() => buildServer(instanceId), port);
  }

  // A load balancer with no idea what MCP is: no session affinity, no body
  // parsing, alternate every request. That is all the routing 2026-07-28 needs.
  let next = 0;
  const balancer = createServer((incoming, outgoing) => {
    const target = INSTANCE_PORTS[next % INSTANCE_PORTS.length]!;
    next += 1;

    const proxied = httpRequest(
      {
        host: 'localhost',
        port: target,
        path: incoming.url,
        method: incoming.method,
        headers: { ...incoming.headers, host: `localhost:${target}` },
      },
      (response) => {
        outgoing.writeHead(response.statusCode ?? 502, response.headers);
        response.pipe(outgoing);
      },
    );

    proxied.on('error', (error) => {
      console.error('[lb]', error.message);
      if (!outgoing.headersSent) outgoing.writeHead(502);
      outgoing.end('Bad Gateway');
    });

    incoming.pipe(proxied);
  });

  balancer.on('error', (error) => {
    throw new Error(`[lb] could not listen on ${BALANCER_PORT}: ${error.message}`);
  });

  balancer.listen(BALANCER_PORT, '127.0.0.1', () => {
    console.log(`\n⚖️  Stateless core demo`);
    console.log(`   balancer  http://localhost:${BALANCER_PORT}/mcp  (round-robin, no affinity)`);
    console.log(`   backends  ${INSTANCE_PORTS.map((port) => `localhost:${port}`).join(', ')}`);
    console.log(`   protocol  2026-07-28 — no initialize, no Mcp-Session-Id\n`);
  });
}
