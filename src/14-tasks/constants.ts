export const PORT = 8098;
export const MCP_URL = `http://localhost:${PORT}/mcp`;

/** How long a finished job stays readable before it is swept. */
export const JOB_TTL_MS = 300_000;

/** What the server asks the caller to wait between polls. */
export const POLL_INTERVAL_MS = 400;
