import {
  InMemoryServerEventBus,
  McpServer,
  type ServerEventBus,
} from '@modelcontextprotocol/server';
import { z } from 'zod';
import { isEntrypoint } from '../shared/entrypoint';
import { banner, serveHttp } from '../shared/serve';
import { BUILD_LOG_URI, BUILD_STATUS_URI, PORT } from './constants';

/**
 * `subscriptions/listen` (SEP-2575) — the one stream that survived.
 *
 * 2025 had two ways for a server to push: the transport's HTTP GET endpoint
 * (an SSE stream held open for the life of the session, carrying anything the
 * server felt like sending) and `resources/subscribe`. Both are gone.
 *
 * What replaced them is a single long-lived POST whose response body is the
 * stream, opened by the CLIENT, carrying only what the client asked for:
 *
 *   POST /mcp   { method: "subscriptions/listen",
 *                 params: { notifications: { toolsListChanged: true,
 *                                            resourceSubscriptions: ["build://status"] } } }
 *
 * Three consequences worth the change:
 *
 *  1. **Opt-in, not firehose.** The server answers with
 *     `notifications/subscriptions/acknowledged` naming the subset of the
 *     filter it will actually honour, and sends nothing outside it.
 *  2. **It is still stateless.** Nothing about this stream affects any other
 *     request. Requests keep landing on any instance; only this one long POST
 *     is pinned to the instance serving it, and losing it costs you nothing
 *     but a re-listen.
 *  3. **Request-scoped notifications did not move here.**
 *     `notifications/progress` and `notifications/message` still flow on the
 *     response stream of the request they belong to. This stream carries
 *     change events only.
 *
 * A server publishes through `handler.notify.*` — the handler-level notifier,
 * not a per-request `McpServer`. That is the right seam: change events are a
 * property of the process, and the factory instance that ran `tools/call` is
 * closed before the next request arrives. Across a fleet, swap
 * `InMemoryServerEventBus` for a `ServerEventBus` over your own pub/sub and
 * every instance's open streams see every instance's events.
 */

/** The build the demo advances. Stands in for anything with a lifecycle. */
let stage = 0;
const STAGES = ['queued', 'compiling', 'testing', 'published'] as const;

/** `deploy` only exists once the build has published — hence a list change. */
const isPublished = () => STAGES[stage] === 'published';

export function buildServer() {
  const server = new McpServer(
    { name: 'subscriptions-demo', version: '2.0.0' },
    {
      capabilities: {
        // `listChanged` is what the client's filter is intersected against.
        // Ask for `promptsListChanged` here and you get it back in the ack;
        // this server does not advertise it, so that request is dropped.
        tools: { listChanged: true },
        resources: { listChanged: true, subscribe: true },
      },
      cacheHints: {
        // Short TTL: this catalog genuinely changes. The cache hint and the
        // subscription are complements — the hint bounds how stale a client
        // that is NOT listening can be, the subscription tells one that is.
        'tools/list': { ttlMs: 5_000, cacheScope: 'public' },
      },
    },
  );

  server.registerTool(
    'status',
    {
      title: 'Build status',
      description: 'Where the build has got to',
      inputSchema: z.object({}),
      annotations: { readOnlyHint: true },
    },
    async () => ({ content: [{ type: 'text', text: `build is ${STAGES[stage]}` }] }),
  );

  if (isPublished()) {
    server.registerTool(
      'deploy',
      {
        title: 'Deploy',
        description: 'Only exists once the build has published',
        inputSchema: z.object({}),
        annotations: { readOnlyHint: false },
      },
      async () => ({ content: [{ type: 'text', text: 'deployed' }] }),
    );
  }

  server.registerTool(
    'collect_logs',
    {
      title: 'Collect logs',
      description: 'Walks the build log, reporting progress as it goes',
      inputSchema: z.object({ lines: z.coerce.number().min(1).max(20).default(6) }),
      annotations: { readOnlyHint: true },
    },
    async ({ lines }, ctx) => {
      // The other kind of notification, and the reason this module insists on
      // the distinction. `notifications/progress` is REQUEST-scoped: it rides
      // the response stream of this call, and stops when the call does. It
      // has nothing to do with `subscriptions/listen`, and a client that
      // never opens a subscription still receives it.
      const progressToken = ctx.mcpReq._meta?.progressToken;
      const collected: string[] = [];

      for (let line = 1; line <= lines; line++) {
        // Cancellation is an AbortSignal, raised when the client sends
        // `notifications/cancelled`. Check it at each step you can safely
        // stop at; nothing checks it for you.
        if (ctx.mcpReq.signal.aborted) {
          console.log(`   ✂ collect_logs cancelled after ${line - 1} lines`);
          throw new Error('cancelled by client');
        }

        await new Promise((resolve) => setTimeout(resolve, 250));
        collected.push(`${STAGES[stage]}: line ${line}`);

        // Only sent when the client asked for it. No token, no notification —
        // which is how a caller that does not want the chatter avoids it.
        if (progressToken !== undefined) {
          await ctx.mcpReq.notify({
            method: 'notifications/progress',
            params: { progressToken, progress: line, total: lines, message: `line ${line}` },
          });
        }
      }

      return { content: [{ type: 'text', text: collected.join('\n') }] };
    },
  );

  server.registerResource(
    'build-status',
    BUILD_STATUS_URI,
    { title: 'Build status', description: 'The current stage', mimeType: 'text/plain' },
    async () => ({ contents: [{ uri: BUILD_STATUS_URI, text: STAGES[stage]! }] }),
  );

  server.registerResource(
    'build-log',
    BUILD_LOG_URI,
    { title: 'Build log', description: 'Noisy, and nobody subscribed', mimeType: 'text/plain' },
    async () => ({ contents: [{ uri: BUILD_LOG_URI, text: `... ${STAGES[stage]} ...` }] }),
  );

  return server;
}

/**
 * The change-event bus, passed explicitly rather than defaulted.
 *
 * `createMcpHandler` creates an `InMemoryServerEventBus` when you supply
 * none, and in-process is where most people stop. Across a fleet that is
 * wrong in a way nothing reports: each instance publishes to its own
 * listeners, so a client whose `subscriptions/listen` POST landed on instance
 * #2 never hears what instance #1 raised.
 *
 * The interface is two methods. That is the whole seam — swapping in Redis
 * pub/sub or NATS means implementing `publish` and `subscribe` over it and
 * changing the line below. Nothing else in this file moves.
 */
const inProcess = new InMemoryServerEventBus();

const bus: ServerEventBus = {
  publish(event) {
    console.log(`   ⇢ bus publish: ${event.kind}${'uri' in event ? ` ${event.uri}` : ''}`);
    // Over Redis: PUBLISH mcp:events JSON.stringify(event)
    inProcess.publish(event);
  },
  subscribe(listener) {
    // Over Redis: SUBSCRIBE mcp:events, and call listener on each message.
    // The returned function must unsubscribe, and must be safe to call twice.
    return inProcess.subscribe(listener);
  },
};

if (isEntrypoint(import.meta.url)) {
  const mcp = await serveHttp(buildServer, PORT, { bus });

  banner('📡 Subscriptions MCP server', PORT, [
    'stream    subscriptions/listen — client-opened, filtered, acknowledged',
    'events    tools/list_changed on publish, resources/updated each stage',
    'note      build://log also updates, and nobody subscribed to it',
  ]);

  // Advance the build, publishing a change event at each step. `notify` is the
  // handler's, not a server instance's — see the comment at the top.
  //
  // The head start gives the sibling client process time to open its stream, so
  // the demo shows every stage rather than whichever ones it was late for.
  await new Promise((resolve) => setTimeout(resolve, 4000));

  const timer = setInterval(() => {
    if (stage >= STAGES.length - 1) {
      clearInterval(timer);
      return;
    }
    stage += 1;
    console.log(`   ▶ build is now ${STAGES[stage]}`);

    mcp.handler.notify.resourceUpdated(BUILD_STATUS_URI);
    // Delivered to nobody: the client's filter named build://status only.
    mcp.handler.notify.resourceUpdated(BUILD_LOG_URI);

    // The catalog itself changed — `deploy` exists now.
    if (isPublished()) mcp.handler.notify.toolsChanged();
  }, 1500);
}
