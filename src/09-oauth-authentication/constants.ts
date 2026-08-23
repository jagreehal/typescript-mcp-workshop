export const PORT = 8089;
export const BASE_URL = `http://localhost:${PORT}`;
export const MCP_URL = `${BASE_URL}/mcp`;

/** The RFC 8707 resource indicator: what a token is minted *for*. */
export const RESOURCE = BASE_URL;

export const SCOPES = ['read', 'write'] as const;
export const TOKEN_TTL_SECONDS = 3600;

/**
 * Which scope each tool needs.
 *
 * This lives at the HTTP edge, not inside the handlers, because the spec wants
 * an insufficient-scope refusal to be a `403` carrying a `WWW-Authenticate`
 * challenge — and a tool handler cannot produce one of those. 2026-07-28 makes
 * that practical: `Mcp-Name` (SEP-2243) names the tool on every `tools/call`,
 * so the gate knows what is being asked for without reading the body.
 */
export const TOOL_SCOPES: Record<string, string> = {
  search_docs: 'read',
  update_doc: 'write',
};

/** The scope the server challenges for before it knows which tool you want. */
export const BASELINE_SCOPE = 'read';
