import type { IncomingMessage, ServerResponse } from 'node:http';
import {
  getOAuthProtectedResourceMetadataUrl,
  McpServer,
  OAuthError,
  OAuthErrorCode,
  requireBearerAuth,
  type AuthInfo,
} from '@modelcontextprotocol/server';
import { createLocalJWKSet, jwtVerify } from 'jose';
import { z } from 'zod';
import { isEntrypoint } from '../shared/entrypoint';
import { serveHttp } from '../shared/serve';
import { BASELINE_SCOPE, BASE_URL, PORT, RESOURCE, TOOL_SCOPES } from './constants';
import { createProvider } from './provider';

/**
 * OAuth 2.1 in front of a 2026-07-28 MCP server.
 *
 * The division to copy into production: **transport from the library,
 * authorization from you.** The SDK gives you `requireBearerAuth`,
 * `getOAuthProtectedResourceMetadataUrl` and the wire protocol. It performs no
 * token verification of its own and has no idea what a scope is — you supply an
 * `OAuthTokenVerifier` that says what a valid token is and which resource it
 * was minted for, and a guard in each tool.
 */

const provider = await createProvider(BASE_URL);

/** The gap the SDK leaves you to fill: turn a token into an identity. */
const verifier = {
  async verifyAccessToken(token: string): Promise<AuthInfo> {
    try {
      const { payload } = await jwtVerify(token, createLocalJWKSet(provider.jwks), {
        issuer: BASE_URL,
        // Audience binding (RFC 8707): a token minted for another resource is
        // rejected here even if it is otherwise perfectly valid.
        audience: RESOURCE,
      });
      return {
        token,
        clientId: (payload.sub as string) ?? 'unknown',
        scopes: ((payload.scope as string) ?? '').split(' ').filter(Boolean),
        // The SDK rejects a token with no expiry, so carry the claim.
        expiresAt: payload.exp,
        resource: new URL(RESOURCE),
      };
    } catch {
      throw new OAuthError(OAuthErrorCode.InvalidToken, 'invalid token');
    }
  },
};

const RESOURCE_METADATA_URL = getOAuthProtectedResourceMetadataUrl(new URL(RESOURCE));

/**
 * What this request needs, decided before a body is read.
 *
 * SEP-2243 puts `Mcp-Method` and `Mcp-Name` on every Streamable HTTP POST, so
 * the auth gate can demand `write` for `update_doc` and `read` for
 * `search_docs` while staying at the HTTP layer. Anything else — `tools/list`,
 * `server/discover` — needs the baseline scope only.
 *
 * Doing it here rather than inside the handler is not a style preference. The
 * spec wants an insufficient-scope refusal to be `403` with a
 * `WWW-Authenticate: Bearer error="insufficient_scope", scope="…"` challenge,
 * because that challenge is what tells the client which scope to step up to. A
 * tool handler returning `isError` cannot say any of that, and a client cannot
 * recover from it.
 */
function requiredScopesFor(request: IncomingMessage): string[] {
  const method = request.headers['mcp-method'];
  const name = request.headers['mcp-name'];
  if (method === 'tools/call' && typeof name === 'string') {
    return [TOOL_SCOPES[name] ?? BASELINE_SCOPE];
  }
  return [BASELINE_SCOPE];
}

async function authenticate(
  request: IncomingMessage,
  response: ServerResponse,
): Promise<AuthInfo | undefined> {
  // Built per request because the required scopes are per request. The gate
  // answers 401 (no/invalid token) or 403 (insufficient_scope) itself, both
  // carrying `resource_metadata` so a client that arrives cold can discover
  // the authorization server from the refusal alone.
  const gate = requireBearerAuth({
    verifier,
    requiredScopes: requiredScopesFor(request),
    resourceMetadataUrl: RESOURCE_METADATA_URL,
  });

  const outcome = await gate(toWebRequest(request));
  if (outcome instanceof Response) {
    console.log(`   ⛔ ${outcome.status} ${outcome.headers.get('www-authenticate') ?? ''}`);
    response.writeHead(outcome.status, Object.fromEntries(outcome.headers));
    response.end(await outcome.text());
    return undefined;
  }
  return outcome;
}

/**
 * The gate above is the load-bearing check. This stays as a backstop: it costs
 * one line, and it still holds on paths the gate cannot reach — a 2025-era
 * client on the legacy fallback sends no `Mcp-Name`, so the gate can only
 * demand the baseline scope there.
 */
const requireScope = (auth: AuthInfo | undefined, scope: string) =>
  auth?.scopes.includes(scope)
    ? undefined
    : {
        isError: true as const,
        content: [{ type: 'text' as const, text: `insufficient_scope: ${scope} required` }],
      };

const docs = new Map<string, string>([
  ['runbook', 'Restart the ingest worker, then drain the queue.'],
  ['changelog', '2.0.0 — moved to MCP 2026-07-28.'],
]);

export function buildServer(auth: AuthInfo | undefined) {
  const server = new McpServer(
    { name: 'acme-docs', version: '2.0.0' },
    { capabilities: { tools: {} } },
  );

  server.registerTool(
    'search_docs',
    {
      title: 'Search docs',
      description: 'Search the document store',
      inputSchema: z.object({ query: z.string().default('') }),
      annotations: { readOnlyHint: true },
    },
    async ({ query }) => {
      const denied = requireScope(auth, 'read');
      if (denied) return denied;
      const hits = [...docs.entries()].filter(
        ([name, body]) => !query || name.includes(query) || body.includes(query),
      );
      return { content: [{ type: 'text', text: hits.map(([name]) => name).join(', ') || 'no matches' }] };
    },
  );

  server.registerTool(
    'update_doc',
    {
      title: 'Update doc',
      description: 'Replace the body of a document',
      inputSchema: z.object({ name: z.string(), body: z.string() }),
      annotations: { readOnlyHint: false, destructiveHint: true },
    },
    async ({ name, body }) => {
      const denied = requireScope(auth, 'write');
      if (denied) return denied;
      docs.set(name, body);
      return { content: [{ type: 'text', text: `updated ${name}` }] };
    },
  );

  return server;
}

/** OAuth endpoints, alongside /mcp on the same origin. */
async function routes(request: IncomingMessage, response: ServerResponse): Promise<boolean> {
  const url = new URL(request.url ?? '/', BASE_URL);

  const json = (status: number, body: unknown) => {
    response
      .writeHead(status, { 'content-type': 'application/json', 'cache-control': 'no-store' })
      .end(JSON.stringify(body));
    return true;
  };

  switch (`${request.method} ${url.pathname}`) {
    case 'GET /.well-known/oauth-protected-resource':
      return json(200, provider.protectedResourceMetadata(RESOURCE));

    // This AS publishes OIDC Discovery only. RFC 8414's
    // `/.well-known/oauth-authorization-server` deliberately 404s: a
    // conforming client MUST try both, in priority order, and most real
    // providers are OIDC-first. Serving one of the two is all the spec asks.
    case 'GET /.well-known/openid-configuration':
      return json(200, provider.metadata());

    case 'GET /.well-known/jwks.json':
      return json(200, provider.jwks);

    case 'POST /register': {
      const result = provider.register(await readJson(request));
      return json('error' in result ? 400 : 201, result);
    }

    case 'GET /authorize': {
      const result = await provider.authorize(Object.fromEntries(url.searchParams));
      return json('error' in result ? 400 : 200, result);
    }

    case 'POST /consent': {
      const result = provider.consent(await readJson(request));
      return json('error' in result ? 400 : 200, result);
    }

    case 'POST /token': {
      const raw = await readBody(request);
      const params = Object.fromEntries(new URLSearchParams(raw));
      const result = await provider.token(params);
      return json('error' in result ? 400 : 200, result);
    }

    default:
      return false;
  }
}

if (isEntrypoint(import.meta.url)) {
  await serveHttp((ctx) => buildServer(ctx.authInfo), PORT, { routes, authenticate });
  console.log('\n🔐 OAuth 2.1 MCP server');
  console.log(`   resource   ${RESOURCE}`);
  console.log(`   metadata   ${BASE_URL}/.well-known/oauth-protected-resource`);
  console.log(`   endpoint   ${BASE_URL}/mcp`);
  console.log(`   AS meta    ${BASE_URL}/.well-known/openid-configuration (OIDC only — 8414 404s)`);
  console.log('   scopes     search_docs=read, update_doc=write, enforced at the gate from Mcp-Name');
  console.log('   hardening  RFC 9207 iss, application_type, issuer-bound client_id, CIMD\n');
}

async function readBody(request: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of request) chunks.push(chunk as Buffer);
  return Buffer.concat(chunks).toString('utf8');
}

async function readJson(request: IncomingMessage): Promise<Record<string, unknown>> {
  try {
    return JSON.parse(await readBody(request)) as Record<string, unknown>;
  } catch {
    return {};
  }
}

/** requireBearerAuth takes a web-standard Request; it only reads headers. */
function toWebRequest(request: IncomingMessage): Request {
  const headers = new Headers();
  for (const [name, value] of Object.entries(request.headers)) {
    if (typeof value === 'string') headers.set(name, value);
  }
  return new Request(new URL(request.url ?? '/', BASE_URL), { method: 'GET', headers });
}
