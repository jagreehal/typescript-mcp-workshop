import { timingSafeEqual } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { McpServer, type AuthInfo } from '@modelcontextprotocol/server';
import { z } from 'zod';
import { isEntrypoint } from '../shared/entrypoint';
import { banner, serveHttp } from '../shared/serve';
import { API_KEYS, PORT } from './constants';

/**
 * The simplest auth that is still auth: a bearer key, checked at the edge,
 * turned into an identity the tools can see.
 *
 * Two things carry over unchanged to module 09's OAuth:
 *
 *   1. The SDK verifies nothing. `authenticate` runs *before* the handler and
 *      whatever it returns arrives at the factory as `ctx.authInfo`.
 *   2. Because there is no session on 2026-07-28, the identity is established
 *      per request. There is no "authenticated connection" to leak between
 *      callers — the factory closes over one verified caller and is discarded.
 */

/** Constant-time compare so the key can't be recovered a byte at a time. */
function lookupKey(presented: string): (typeof API_KEYS)[string] | undefined {
  const candidate = Buffer.from(presented);
  for (const [key, identity] of Object.entries(API_KEYS)) {
    const known = Buffer.from(key);
    if (known.length === candidate.length && timingSafeEqual(known, candidate)) return identity;
  }
  return undefined;
}

export async function authenticate(
  request: IncomingMessage,
  response: ServerResponse,
): Promise<AuthInfo | undefined> {
  const header = request.headers.authorization ?? '';
  const presented = header.startsWith('Bearer ') ? header.slice(7) : '';
  const identity = presented ? lookupKey(presented) : undefined;

  if (!identity) {
    response
      .writeHead(401, {
        'content-type': 'application/json',
        'www-authenticate': 'Bearer error="invalid_token"',
      })
      .end(JSON.stringify({ error: 'invalid_token' }));
    return undefined;
  }

  return {
    token: presented,
    clientId: identity.userId,
    scopes: identity.scopes,
    // API keys don't expire on their own; the SDK wants the field present.
    expiresAt: Math.floor(Date.now() / 1000) + 3600,
  };
}

/** Per-tool scope guard. The SDK has no idea what a scope is — this is yours. */
const requireScope = (auth: AuthInfo | undefined, scope: string) =>
  auth?.scopes.includes(scope)
    ? undefined
    : {
        isError: true as const,
        content: [{ type: 'text' as const, text: `missing scope: ${scope}` }],
      };

const notes = new Map<string, string[]>();

export function buildServer(authInfo: AuthInfo | undefined) {
  const who = authInfo?.clientId ?? 'anonymous';
  const server = new McpServer(
    { name: 'api-key-server', version: '2.0.0' },
    { capabilities: { tools: {} } },
  );

  server.registerTool(
    'whoami',
    {
      title: 'Who am I',
      description: 'Report the identity behind the presented API key',
      inputSchema: z.object({}),
      annotations: { readOnlyHint: true },
    },
    async () => ({
      content: [
        { type: 'text', text: `You are ${who} with scopes: ${authInfo?.scopes.join(', ') ?? 'none'}` },
      ],
    }),
  );

  server.registerTool(
    'listNotes',
    {
      title: 'List notes',
      description: 'List your own notes',
      inputSchema: z.object({}),
      annotations: { readOnlyHint: true },
    },
    async () => {
      const denied = requireScope(authInfo, 'read');
      if (denied) return denied;
      // Scoped to the caller: a tool can only ever see its own caller's data,
      // because the instance was built for this request only.
      const mine = notes.get(who) ?? [];
      return { content: [{ type: 'text', text: mine.length ? mine.join('\n') : '(no notes yet)' }] };
    },
  );

  server.registerTool(
    'addNote',
    {
      title: 'Add note',
      description: 'Append a note to your own list (requires the write scope)',
      inputSchema: z.object({ text: z.string().describe('Note body') }),
      annotations: { readOnlyHint: false },
    },
    async ({ text }) => {
      const denied = requireScope(authInfo, 'write');
      if (denied) return denied;
      const mine = notes.get(who) ?? [];
      mine.push(text);
      notes.set(who, mine);
      return { content: [{ type: 'text', text: `Saved. You now have ${mine.length} note(s).` }] };
    },
  );

  return server;
}

if (isEntrypoint(import.meta.url)) {
  await serveHttp((ctx) => buildServer(ctx.authInfo), PORT, { authenticate });

  banner('🔑 API-key MCP server', PORT, [
    'auth      Authorization: Bearer <key>',
    'identity  Bob = read+write, Alice = read only',
  ]);
}
