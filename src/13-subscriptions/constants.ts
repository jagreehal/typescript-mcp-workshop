export const PORT = 8097;
export const MCP_URL = `http://localhost:${PORT}/mcp`;

/** The one resource the client subscribes to by URI. */
export const BUILD_STATUS_URI = 'build://status';

/** A second resource, deliberately NOT subscribed to, to show filtering work. */
export const BUILD_LOG_URI = 'build://log';
