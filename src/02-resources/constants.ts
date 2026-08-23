export const PORT = 8088;
export const MCP_URL = `http://localhost:${PORT}/mcp`;

export const URI_SCHEMES = {
  FILE: 'file:///',
  SYSTEM: 'system://',
  DOCS: 'docs://',
  DATA: 'data://',
  IMAGE: 'image://',
  VOLATILE: 'volatile://',
} as const;

export const MIME_TYPES = {
  PLAIN_TEXT: 'text/plain',
  JSON: 'application/json',
  MARKDOWN: 'text/markdown',
  CSV: 'text/csv',
  PNG: 'image/png',
} as const;

export const SERVER_CONFIG = {
  NAME: 'resources-deep-dive-server',
  VERSION: '2.0.0',
} as const;

export const RESOURCE_NAMES = {
  APP_LOGS: 'Application Logs',
  SYSTEM_STATUS: 'System Status',
  RESOURCES_GUIDE: 'Resources Guide',
  MCP_LOGO: 'MCP Logo',
  TEAM_METRICS: 'Team Metrics',
  VOLATILE_RESOURCE: 'Volatile Resource',
} as const;

export const RESOURCE_URIS = {
  APP_LOGS: `${URI_SCHEMES.FILE}logs/app.log`,
  SYSTEM_STATUS: `${URI_SCHEMES.SYSTEM}status`,
  RESOURCES_GUIDE: `${URI_SCHEMES.DOCS}resources-guide.md`,
  MCP_LOGO: `${URI_SCHEMES.IMAGE}mcp-logo.png`,
  VOLATILE_RESOURCE: `${URI_SCHEMES.VOLATILE}might-fail`,
} as const;
