import { createHash, randomUUID } from 'node:crypto';
import { exportJWK, generateKeyPair, SignJWT, type JSONWebKeySet } from 'jose';
import { SCOPES, TOKEN_TTL_SECONDS } from './constants';

/**
 * The authorization server an MCP client meets, updated for 2026-07-28.
 *
 * What changed in this revision (all of it hardening, none of it new flow):
 *
 * - **RFC 9207 `iss`** — the authorization response carries `iss`, and the
 *   client MUST validate it before redeeming the code (SEP-2468). This closes
 *   the authorization-server mix-up attack: without it, a client talking to
 *   several ASes can be tricked into redeeming a code at the wrong one.
 * - **`application_type` on registration** — CLI and desktop clients register
 *   as `native` so the AS stops rejecting their `http://127.0.0.1` redirects
 *   (SEP-837). If a CLI OAuth flow ever died on `redirect_uri`, this was why.
 * - **Issuer-bound credentials** — a `client_id` is bound to the issuer that
 *   minted it and is not reusable at another AS (SEP-2352).
 * - **DCR is deprecated** in favour of Client ID Metadata Documents (CIMD),
 *   where the `client_id` is an https URL the client controls and the AS
 *   fetches its metadata from. DCR still works, and will for at least twelve
 *   months under the new deprecation policy. Both paths are implemented below.
 */

const KID = 'workshop-oauth-1';
const CODE_TTL_MS = 60_000;

const LOOPBACK = new Set(['localhost', '127.0.0.1', '::1', '[::1]']);

/** https anywhere; http only on loopback — which is what `native` clients need. */
export function isAllowedRedirect(uri: string, applicationType: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(uri);
  } catch {
    return false;
  }
  if (parsed.protocol === 'https:') return true;
  // SEP-837: a `native` client gets loopback http. A `web` client does not.
  return applicationType === 'native' && parsed.protocol === 'http:' && LOOPBACK.has(parsed.hostname);
}

type ClientRecord = {
  client_id: string;
  client_name: string;
  redirect_uris: string[];
  application_type: 'native' | 'web';
  /** SEP-2352: which issuer minted this credential. Not valid anywhere else. */
  issuer: string;
};

type Pending = {
  client_id: string;
  redirect_uri: string;
  code_challenge: string;
  state?: string;
  resource: string;
  requested_scope: string;
};

type CodeRecord = Pending & { scope: string; expiresAt: number };

const sha256 = (value: string) => createHash('sha256').update(value).digest('base64url');

export type Provider = Awaited<ReturnType<typeof createProvider>>;

export async function createProvider(issuer: string) {
  const { privateKey, publicKey } = await generateKeyPair('RS256', { extractable: true });
  const publicJwk = await exportJWK(publicKey);
  Object.assign(publicJwk, { kid: KID, alg: 'RS256', use: 'sig' });
  const jwks: JSONWebKeySet = { keys: [publicJwk] };

  const clients = new Map<string, ClientRecord>();
  const consents = new Map<string, Pending>();
  const codes = new Map<string, CodeRecord>();

  return {
    jwks,
    clients,

    /**
     * Authorization-server metadata.
     *
     * An MCP AS MUST provide at least one of RFC 8414 or OpenID Connect
     * Discovery 1.0 — not both. This one is served at
     * `/.well-known/openid-configuration` only, which is what most real
     * providers do, so the client's priority-ordered probe has something to
     * fall through to. The document shape is the same either way.
     */
    metadata() {
      return {
        issuer,
        authorization_endpoint: `${issuer}/authorize`,
        token_endpoint: `${issuer}/token`,
        registration_endpoint: `${issuer}/register`,
        jwks_uri: `${issuer}/.well-known/jwks.json`,
        response_types_supported: ['code'],
        grant_types_supported: ['authorization_code'],
        code_challenge_methods_supported: ['S256'],
        token_endpoint_auth_methods_supported: ['none'],
        scopes_supported: [...SCOPES],
        subject_types_supported: ['public'],
        id_token_signing_alg_values_supported: ['RS256'],
        // RFC 9207. Clients check this before trusting an `iss` on a callback.
        authorization_response_iss_parameter_supported: true,
        // CIMD: this AS will accept an https URL as a client_id and fetch its
        // metadata document, instead of requiring registration first.
        client_id_metadata_document_supported: true,
      };
    },

    /** RFC 9728 protected-resource metadata: what the resource is, and who guards it. */
    protectedResourceMetadata(resource: string) {
      return {
        resource,
        authorization_servers: [issuer],
        scopes_supported: [...SCOPES],
        bearer_methods_supported: ['header'],
      };
    },

    /**
     * Dynamic client registration (RFC 7591) — deprecated in this revision but
     * still supported. The new part is `application_type`.
     */
    register(body: Record<string, unknown>) {
      const redirectUris = Array.isArray(body.redirect_uris) ? (body.redirect_uris as string[]) : [];
      if (redirectUris.length === 0) {
        return { error: 'invalid_redirect_uri', error_description: 'redirect_uris is required' } as const;
      }

      // SEP-837: default to `native`. Registering as `web` and then presenting a
      // loopback redirect is the failure this field exists to prevent.
      const applicationType = body.application_type === 'web' ? 'web' : 'native';

      const rejected = redirectUris.find((uri) => !isAllowedRedirect(uri, applicationType));
      if (rejected) {
        return {
          error: 'invalid_redirect_uri',
          error_description: `redirect_uri not allowed for application_type=${applicationType}: ${rejected}`,
        } as const;
      }

      const record: ClientRecord = {
        client_id: `mcp_${randomUUID()}`,
        // Self-asserted, and NOT an identity — a proxy registers under one
        // generic name no matter who is driving it. Key nothing off this.
        client_name: typeof body.client_name === 'string' ? body.client_name : 'unknown',
        redirect_uris: redirectUris,
        application_type: applicationType,
        issuer,
      };
      clients.set(record.client_id, record);
      return { ...record, client_id_issued_at: Math.floor(Date.now() / 1000) } as const;
    },

    /**
     * CIMD: the successor to DCR. The `client_id` IS an https URL the client
     * controls; the AS fetches the metadata document from it. No registration
     * call, no shared secret, and `client_name` stops being self-asserted
     * because the domain vouches for it.
     */
    async resolveCimdClient(clientId: string): Promise<ClientRecord | undefined> {
      if (!clientId.startsWith('https://')) return undefined;
      const existing = clients.get(clientId);
      if (existing) return existing;

      // A real AS fetches clientId here and validates that the document's own
      // `client_id` matches the URL it was fetched from. The workshop runs
      // offline, so the fetch is elided and the shape is what matters.
      const record: ClientRecord = {
        client_id: clientId,
        client_name: new URL(clientId).hostname,
        redirect_uris: [new URL('/callback', clientId).toString()],
        application_type: 'web',
        issuer,
      };
      clients.set(clientId, record);
      return record;
    },

    async authorize(query: Record<string, string | undefined>) {
      const clientId = query.client_id ?? '';
      const client = clients.get(clientId) ?? (await this.resolveCimdClient(clientId));
      if (!client) return { error: 'invalid_client' } as const;

      // SEP-2352: a credential minted by another issuer is not usable here.
      if (client.issuer !== issuer) {
        return { error: 'invalid_client', error_description: 'client_id was issued by another issuer' } as const;
      }
      if (!client.redirect_uris.includes(query.redirect_uri ?? '')) {
        return { error: 'invalid_request', error_description: 'redirect_uri mismatch' } as const;
      }
      if (!query.code_challenge || query.code_challenge_method !== 'S256') {
        return { error: 'invalid_request', error_description: 'PKCE S256 required' } as const;
      }
      if (!query.resource) {
        return { error: 'invalid_target', error_description: 'resource indicator required (RFC 8707)' } as const;
      }

      const consentId = randomUUID();
      consents.set(consentId, {
        client_id: client.client_id,
        redirect_uri: query.redirect_uri as string,
        code_challenge: query.code_challenge,
        state: query.state,
        resource: query.resource,
        requested_scope: query.scope ?? '',
      });

      // A real deployment renders HTML. What matters is that this page is one
      // step inside a single-use state machine: a back button or a double
      // submit lands on a consumed request.
      return {
        consent_id: consentId,
        client_name: client.client_name,
        requested_scope: query.scope ?? '',
        choices: ['read', 'read write'],
      } as const;
    },

    consent(body: Record<string, unknown>) {
      const pending = consents.get(String(body.consent_id ?? ''));
      if (!pending) {
        return { error: 'invalid_request', error_description: 'unknown or already-used authorization request' } as const;
      }
      consents.delete(String(body.consent_id));

      const redirect = new URL(pending.redirect_uri);
      if (pending.state) redirect.searchParams.set('state', pending.state);
      // RFC 9207 (SEP-2468). The client validates this before redeeming.
      redirect.searchParams.set('iss', issuer);

      if (body.approved === false) {
        redirect.searchParams.set('error', 'access_denied');
        return { redirect_to: redirect.toString() } as const;
      }

      // The client's `scope` parameter is a suggestion. What the human ticked
      // on this screen is what gets persisted onto the code.
      const granted = String(body.granted_scope ?? '');
      const code = randomUUID();
      codes.set(code, { ...pending, scope: granted, expiresAt: Date.now() + CODE_TTL_MS });
      redirect.searchParams.set('code', code);
      return { redirect_to: redirect.toString() } as const;
    },

    async token(params: Record<string, string>) {
      if (params.grant_type !== 'authorization_code') {
        return { error: 'unsupported_grant_type' } as const;
      }

      const record = codes.get(params.code ?? '');
      if (!record) return { error: 'invalid_grant' } as const;
      codes.delete(params.code!); // single use

      if (record.expiresAt < Date.now()) {
        return { error: 'invalid_grant', error_description: 'code expired' } as const;
      }
      if (record.client_id !== params.client_id || record.redirect_uri !== params.redirect_uri) {
        return { error: 'invalid_grant', error_description: 'code was issued to another client' } as const;
      }
      if (sha256(params.code_verifier ?? '') !== record.code_challenge) {
        return { error: 'invalid_grant', error_description: 'PKCE verification failed' } as const;
      }

      const issuedAt = Math.floor(Date.now() / 1000);
      const accessToken = await new SignJWT({ scope: record.scope })
        .setProtectedHeader({ alg: 'RS256', kid: KID })
        .setJti(randomUUID())
        .setIssuer(issuer)
        // The resource indicator becomes the audience: this token is usable at
        // exactly one resource, and a conforming client will not send it
        // anywhere else.
        .setAudience(record.resource)
        .setSubject('user_42')
        .setIssuedAt(issuedAt)
        .setExpirationTime(issuedAt + TOKEN_TTL_SECONDS)
        .sign(privateKey);

      return {
        access_token: accessToken,
        token_type: 'Bearer',
        expires_in: TOKEN_TTL_SECONDS,
        scope: record.scope,
      } as const;
    },
  };
}
