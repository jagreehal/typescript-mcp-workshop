export const SERVER_PORT = 8095;
export const GATEWAY_PORT = 8094;

/** The client talks to the gateway; the gateway routes to the server. */
export const MCP_URL = `http://localhost:${GATEWAY_PORT}/mcp`;
export const SERVER_URL = `http://localhost:${SERVER_PORT}/mcp`;

/** Tools the gateway refuses outright, by name, without reading a body. */
export const BLOCKED_TOOLS = new Set(['drop_database']);

/** Per-method budgets the gateway meters. */
export const RATE_LIMITS: Record<string, number> = {
  'tools/call': 9,
  'tools/list': 20,
};

/**
 * A per-tenant budget, metered off `Mcp-Param-Tenant-Id` (SEP-2243). The
 * tenant is a *tool argument*, and the gateway still never reads the body.
 */
export const PER_TENANT_LIMIT = 2;
