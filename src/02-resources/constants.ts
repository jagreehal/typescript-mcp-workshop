export const PORT = 8088;

// Resource URI Schemes
export const URI_SCHEMES = {
  FILE: 'file:///',
  SYSTEM: 'system://',
  CONFIG: 'config://',
  DOCS: 'docs://',
  WEB: 'web://',
  DATA: 'data://',
  IMAGE: 'image://',
  VOLATILE: 'volatile://',
} as const;

// MIME Types
export const MIME_TYPES = {
  PLAIN_TEXT: 'text/plain',
  JSON: 'application/json',
  MARKDOWN: 'text/markdown',
  HTML: 'text/html',
  CSV: 'text/csv',
  PNG: 'image/png',
} as const;

// Server Configuration
export const SERVER_CONFIG = {
  NAME: 'resources-deep-dive-server',
  VERSION: '1.0.0',
} as const;

// Resource Names
export const RESOURCE_NAMES = {
  APP_LOGS: 'Application Logs',
  SYSTEM_STATUS: 'System Status',
  SERVER_CONFIG: 'Server Configuration',
  RESOURCES_GUIDE: 'Resources Guide',
  RESOURCE_DASHBOARD: 'Resource Dashboard',
  SAMPLE_METRICS: 'Sample Metrics Data',
  MCP_LOGO: 'MCP Logo',
  VOLATILE_RESOURCE: 'Volatile Resource',
} as const;

// Resource URIs
export const RESOURCE_URIS = {
  APP_LOGS: `${URI_SCHEMES.FILE}logs/app.log`,
  SYSTEM_STATUS: `${URI_SCHEMES.SYSTEM}status`,
  SERVER_CONFIG: `${URI_SCHEMES.CONFIG}server.json`,
  RESOURCES_GUIDE: `${URI_SCHEMES.DOCS}resources-guide.md`,
  RESOURCE_DASHBOARD: `${URI_SCHEMES.WEB}dashboard.html`,
  SAMPLE_METRICS: `${URI_SCHEMES.DATA}sample-metrics.csv`,
  MCP_LOGO: `${URI_SCHEMES.IMAGE}mcp-logo.png`,
  VOLATILE_RESOURCE: `${URI_SCHEMES.VOLATILE}might-fail`,
} as const;