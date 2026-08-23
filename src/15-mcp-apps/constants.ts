export const PORT = 8099;
export const MCP_URL = `http://localhost:${PORT}/mcp`;

/** The optional host page, so you can watch the View render. */
export const HOST_PORT = 8100;

/** UI resources live under their own scheme, so a host can spot them. */
export const VIEW_URI = 'ui://sales/dashboard.html';

/** Reserved for HTML views. Anything else is a different extension's problem. */
export const UI_MIME_TYPE = 'text/html;profile=mcp-app';

/** Reverse-DNS, like every extension identifier under SEP-2133. */
export const UI_EXTENSION_ID = 'io.modelcontextprotocol/ui';
