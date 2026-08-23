import { createHash, randomBytes } from 'node:crypto';
import { renderContent } from '../shared/ai-tools';
import { connectWhenReady } from '../shared/connect';
import { BASE_URL, MCP_URL, RESOURCE } from './constants';

/**
 * The client half, in the order it actually does things — an agent meeting a
 * remote MCP server it has never seen before.
 *
 * Three things 2026-07-28 asks of a client that a 2025 one could skip:
 *
 *  - **Validate `iss` on the callback** before redeeming the code (RFC 9207 /
 *    SEP-2468), or a client talking to several authorization servers can be
 *    induced to redeem a code at the wrong one.
 *  - **Try both metadata endpoints**, RFC 8414 then OIDC Discovery, in
 *    priority order — and reject a document whose `issuer` is not the issuer
 *    you built the URL from.
 *  - **Step up on `insufficient_scope`** instead of surfacing an error: take
 *    the scopes from the `WWW-Authenticate` challenge, union them with what
 *    you already have, re-authorize, retry.
 */

const REDIRECT_URI = 'http://127.0.0.1:33418/callback';

/** What we currently hold. Both change when we step up. */
let accessToken: string | undefined;
let grantedScopes: string[] = [];

// ---------------------------------------------------------------------------
// 1. The unauthenticated call, and the challenge that starts everything
// ---------------------------------------------------------------------------

console.log('\n1️⃣  Call the server with no token');
await waitForServer();
const unauthorised = await callTool('search_docs', { query: '' });
const challenge = parseChallenge(unauthorised.headers.get('www-authenticate'));
console.log(`   ${unauthorised.status} ${unauthorised.headers.get('www-authenticate') ?? ''}`);

// The challenge is the discovery mechanism, not a fallback. Only if it carries
// no `resource_metadata` do you construct the well-known URIs yourself.
const resourceMetadataUrl =
  challenge.resource_metadata ?? `${BASE_URL}/.well-known/oauth-protected-resource`;

// ---------------------------------------------------------------------------
// 2. Protected-resource metadata (RFC 9728): what is the resource, who guards it
// ---------------------------------------------------------------------------

console.log('\n2️⃣  Discover the resource and its authorization server');
const resourceMetadata = await getJson(resourceMetadataUrl);
const issuer = (resourceMetadata.authorization_servers as string[])[0]!;
console.log(`   from:     ${resourceMetadataUrl}`);
console.log(`   resource: ${resourceMetadata.resource}`);
console.log(`   AS:       ${issuer}`);

/**
 * Scope selection strategy, in the spec's priority order:
 *   1. the `scope` from the WWW-Authenticate challenge, if there is one;
 *   2. otherwise `scopes_supported` from the protected-resource metadata;
 *   3. otherwise omit `scope` entirely.
 *
 * Note what a client must NOT do: ask for everything in `scopes_supported`
 * when the server told it what this operation needs. That is how consent
 * screens end up demanding write access to read a file.
 */
const initialScopes = challenge.scope
  ? challenge.scope.split(' ')
  : ((resourceMetadata.scopes_supported as string[] | undefined) ?? []);
console.log(`   scope to request: ${initialScopes.join(' ') || '(none)'} — from the challenge`);

// ---------------------------------------------------------------------------
// 3. Authorization-server metadata: both endpoints, in order, then validate
// ---------------------------------------------------------------------------

console.log('\n3️⃣  Discover the AS metadata (MUST try both, in priority order)');
const asMetadata = await discoverAuthorizationServer(issuer);
console.log(`   iss parameter supported: ${asMetadata.authorization_response_iss_parameter_supported}`);
console.log(`   CIMD supported:          ${asMetadata.client_id_metadata_document_supported}`);

// ---------------------------------------------------------------------------
// 4. Register
// ---------------------------------------------------------------------------

console.log('\n4️⃣  Register (DCR — deprecated, still supported for 12+ months)');
const registration = await postJson(`${asMetadata.registration_endpoint}`, {
  client_name: 'Workshop CLI',
  redirect_uris: [REDIRECT_URI],
  // SEP-837: this is what makes the loopback redirect acceptable. A CLI that
  // omits it gets a redirect_uri error from a conforming AS.
  application_type: 'native',
});
const clientId = registration.client_id as string;
console.log(`   client_id: ${clientId}`);

// ---------------------------------------------------------------------------
// 5. Authorize for the scopes the challenge named, and nothing more
// ---------------------------------------------------------------------------

console.log(`\n5️⃣  Authorize for "${initialScopes.join(' ')}" (PKCE S256 + RFC 8707 resource)`);
grantedScopes = await authorize(initialScopes);
console.log(`   granted scope: ${grantedScopes.join(' ')}`);

// ---------------------------------------------------------------------------
// 6. A read tool: fine. A write tool: 403, and the challenge says why
// ---------------------------------------------------------------------------

console.log('\n6️⃣  Call a read tool — the token covers it');
console.log(`   ${await callToolAsAgent('search_docs', { query: '' })}`);

console.log('\n7️⃣  Call a write tool with a read-only token');
console.log(`   ${await callToolAsAgent('update_doc', { name: 'runbook', body: 'Drain first.' })}`);

console.log('\n   That 403 is the point. An `isError` tool result would have said');
console.log('   "not allowed" and stopped there. A challenge says which scope to ask');
console.log('   for, so the client can fix it without a human reading a log.\n');

// ---------------------------------------------------------------------------
// 7. Step-up: union the scopes, re-authorize, retry
// ---------------------------------------------------------------------------

console.log('8️⃣  Step-up authorization');
const retried = await withStepUp('update_doc', { name: 'runbook', body: 'Drain the queue first.' });
console.log(`   ${retried}`);

console.log('\n   Scope accumulation is the client\'s job: re-authorizing for only the');
console.log('   challenged scope would have thrown away `read`. Union, always.\n');

// ---------------------------------------------------------------------------
// 8. The same token, through the SDK client
// ---------------------------------------------------------------------------

// This module drops to raw HTTP only so the 401/403 headers stay visible.
// Once a token is in hand the ordinary client works unchanged.
console.log('9️⃣  The same token through the SDK client');
const sdkClient = await connectWhenReady(MCP_URL, {
  headers: { Authorization: `Bearer ${accessToken}` },
});
const viaSdk = await sdkClient.callTool({ name: 'search_docs', arguments: { query: '' } });
console.log(`   ✅ ${renderContent(viaSdk.content)}\n`);
await sdkClient.close();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Try RFC 8414 first, then OIDC Discovery — the spec's order for an issuer
 * with no path component. Then the check that matters: the document's own
 * `issuer` MUST equal the issuer the URL was built from, or a metadata
 * document served from anywhere can claim to speak for anyone.
 */
async function discoverAuthorizationServer(as: string): Promise<Record<string, unknown>> {
  const candidates = [
    `${as}/.well-known/oauth-authorization-server`,
    `${as}/.well-known/openid-configuration`,
  ];

  for (const url of candidates) {
    const response = await fetch(url);
    if (!response.ok) {
      console.log(`   ${response.status} ${url}`);
      continue;
    }
    const metadata = (await response.json()) as Record<string, unknown>;
    if (metadata.issuer !== as) {
      throw new Error(`metadata from ${url} claims issuer ${String(metadata.issuer)} — rejected`);
    }
    console.log(`   200 ${url} — issuer matches, using it`);
    return metadata;
  }

  throw new Error(`no authorization server metadata at ${as}`);
}

/** The whole authorization-code leg, for a given scope set. Returns what was granted. */
async function authorize(scopes: string[]): Promise<string[]> {
  const verifier = randomBytes(32).toString('base64url');
  const codeChallenge = createHash('sha256').update(verifier).digest('base64url');
  const state = randomBytes(16).toString('base64url');

  const authorizeUrl = new URL(asMetadata.authorization_endpoint as string);
  authorizeUrl.search = new URLSearchParams({
    client_id: clientId,
    redirect_uri: REDIRECT_URI,
    response_type: 'code',
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
    state,
    // RFC 8707: which resource this token is for. It becomes the audience.
    resource: RESOURCE,
    scope: scopes.join(' '),
  }).toString();

  const consentPage = await getJson(authorizeUrl.toString());
  console.log(`   consent screen for "${consentPage.client_name}", asked for "${consentPage.requested_scope}"`);

  // The human ticks exactly what was asked for here. They are free not to —
  // the client's `scope` is a suggestion, the consent screen is the decision.
  const consented = await postJson(`${issuer}/consent`, {
    consent_id: consentPage.consent_id,
    approved: true,
    granted_scope: scopes.join(' '),
  });
  const callback = new URL(consented.redirect_to as string);

  // RFC 9207 — before the code goes anywhere near a token endpoint.
  const returnedIss = callback.searchParams.get('iss');
  if (returnedIss !== issuer) throw new Error(`iss mismatch: expected ${issuer}, got ${returnedIss}`);
  if (callback.searchParams.get('state') !== state) throw new Error('state mismatch');
  console.log('   ✅ iss and state match — safe to redeem');

  const tokenResponse = await fetch(asMetadata.token_endpoint as string, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code: callback.searchParams.get('code') ?? '',
      redirect_uri: REDIRECT_URI,
      client_id: clientId,
      code_verifier: verifier,
      resource: RESOURCE,
    }),
  });
  const token = (await tokenResponse.json()) as { access_token: string; scope: string };
  accessToken = token.access_token;
  return token.scope.split(' ').filter(Boolean);
}

/**
 * Call a tool, and on `insufficient_scope` run the step-up flow once: union
 * the challenged scopes with what we already hold, re-authorize, retry.
 *
 * The retry budget is deliberate. A server that keeps challenging for a scope
 * it will not grant is a permanent authorization failure, not something to
 * spin on.
 */
async function withStepUp(name: string, args: Record<string, unknown>, attempts = 2): Promise<string> {
  for (let attempt = 1; attempt <= attempts; attempt++) {
    const response = await callTool(name, args, accessToken);
    if (response.ok) return `✅ ${renderContent(((await response.json()) as { result?: { content?: unknown } }).result?.content)}`;

    const refusal = parseChallenge(response.headers.get('www-authenticate'));
    if (response.status !== 403 || refusal.error !== 'insufficient_scope') {
      return `⛔ ${response.status} — not a scope problem, giving up`;
    }

    // The union is the whole trick. Re-authorizing for only `write` would drop
    // `read`, and the next search would 403 in the other direction.
    const needed = (refusal.scope ?? '').split(' ').filter(Boolean);
    const union = [...new Set([...grantedScopes, ...needed])];
    console.log(`   challenge wants "${needed.join(' ')}", we hold "${grantedScopes.join(' ')}"`);
    console.log(`   → re-authorizing for the union: "${union.join(' ')}" (attempt ${attempt})`);
    grantedScopes = await authorize(union);
  }
  return '⛔ still refused after the step-up budget — treat as permanent';
}

/** One tool call, as raw HTTP, so the status and headers stay visible. */
async function callTool(
  name: string,
  args: Record<string, unknown>,
  token?: string,
): Promise<Response> {
  return fetch(MCP_URL, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'MCP-Protocol-Version': '2026-07-28',
      // SEP-2243. The server's auth gate reads these to know which scope this
      // request needs, without parsing the body.
      'Mcp-Method': 'tools/call',
      'Mcp-Name': name,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/call',
      params: {
        name,
        arguments: args,
        // The envelope every 2026-07-28 request carries in place of the
        // handshake that used to establish it once per session.
        _meta: {
          'io.modelcontextprotocol/protocolVersion': '2026-07-28',
          'io.modelcontextprotocol/clientInfo': { name: 'workshop-oauth-client', version: '2.0.0' },
          'io.modelcontextprotocol/clientCapabilities': {},
        },
      },
    }),
  });
}

async function callToolAsAgent(name: string, args: Record<string, unknown>): Promise<string> {
  const response = await callTool(name, args, accessToken);
  if (response.ok) {
    const body = (await response.json()) as { result?: { content?: unknown } };
    return `✅ ${renderContent(body.result?.content)}`;
  }
  return `⛔ ${response.status} ${response.headers.get('www-authenticate') ?? ''}`;
}

/** `Bearer error="insufficient_scope", scope="write", resource_metadata="…"` → an object. */
function parseChallenge(header: string | null): Record<string, string> {
  const parsed: Record<string, string> = {};
  for (const [, key, value] of (header ?? '').matchAll(/(\w+)="([^"]*)"/g)) {
    parsed[key!] = value!;
  }
  return parsed;
}

async function getJson(url: string): Promise<Record<string, unknown>> {
  const response = await fetch(url);
  return (await response.json()) as Record<string, unknown>;
}

async function postJson(url: string, body: unknown): Promise<Record<string, unknown>> {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  return (await response.json()) as Record<string, unknown>;
}

async function waitForServer(): Promise<void> {
  for (let attempt = 0; attempt < 40; attempt++) {
    try {
      await fetch(`${BASE_URL}/.well-known/oauth-protected-resource`);
      return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
  }
  throw new Error('server never came up');
}
