import { FastMCP } from 'fastmcp';
import { z } from 'zod';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

const PORT = 3009;
const JWT_SECRET = 'dev-secret-key-change-in-production';

// OAuth 2.1 with PKCE Implementation
interface OAuthClient {
  id: string;
  name: string;
  redirectUris: string[];
  scopes: string[];
  createdAt: Date;
}

interface AuthorizationCode {
  code: string;
  clientId: string;
  codeChallenge: string;
  codeChallengeMethod: string;
  redirectUri: string;
  scopes: string[];
  userId: string;
  expiresAt: Date;
}

interface AccessToken {
  token: string;
  clientId: string;
  userId: string;
  scopes: string[];
  expiresAt: Date;
  refreshToken?: string;
}

// In-memory storage (use database in production)
const clients = new Map<string, OAuthClient>();
const authCodes = new Map<string, AuthorizationCode>();
const accessTokens = new Map<string, AccessToken>();
const users = new Map<
  string,
  { id: string; username: string; password: string }
>();

// Initialize demo data
const demoClient: OAuthClient = {
  id: 'demo-client-123',
  name: 'Demo MCP Client',
  redirectUris: ['http://localhost:3000/callback', 'mcp://auth/callback'],
  scopes: ['read', 'write', 'admin'],
  createdAt: new Date(),
};
clients.set(demoClient.id, demoClient);

const demoUser = {
  id: 'user-123',
  username: 'demo',
  password: 'demo123', // In production, hash passwords!
};
users.set(demoUser.id, demoUser);

// Utility functions
function generateRandomString(length: number = 32): string {
  return crypto.randomBytes(length).toString('base64url');
}

function verifyCodeChallenge(
  codeVerifier: string,
  codeChallenge: string,
  method: string,
): boolean {
  if (method === 'S256') {
    const hash = crypto
      .createHash('sha256')
      .update(codeVerifier)
      .digest('base64url');
    return hash === codeChallenge;
  }
  return codeVerifier === codeChallenge; // plain method (not recommended)
}

function generateAccessToken(
  clientId: string,
  userId: string,
  scopes: string[],
): AccessToken {
  const token = jwt.sign(
    {
      sub: userId,
      client_id: clientId,
      scopes,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour
    },
    JWT_SECRET,
  );

  const accessToken: AccessToken = {
    token,
    clientId,
    userId,
    scopes,
    expiresAt: new Date(Date.now() + 3600 * 1000),
    refreshToken: generateRandomString(),
  };

  accessTokens.set(token, accessToken);
  return accessToken;
}

// Create the FastMCP server
const server = new FastMCP({
  name: 'oauth-mcp-server',
  version: '1.0.0',
  instructions: `
This is an OAuth 2.1 with PKCE demonstration server.

It provides secure authentication and authorization for MCP clients using:
- OAuth 2.1 with PKCE (RFC 7636)
- JWT access tokens
- Client registration
- Token introspection and revocation
- Discovery endpoints

Use the authentication flow to secure your MCP tools and resources.
  `.trim(),
});

// Protected tool that requires authentication
server.addTool({
  name: 'getProtectedData',
  description: 'Get protected user data (requires authentication)',
  parameters: z.object({
    accessToken: z.string().describe('OAuth access token'),
  }),
  annotations: {
    openWorldHint: false,
    readOnlyHint: true,
    title: 'Protected Data Access',
  },
  execute: async (args) => {
    try {
      const tokenData = accessTokens.get(args.accessToken);
      if (!tokenData || tokenData.expiresAt < new Date()) {
        return 'Error: Invalid or expired access token';
      }

      const decoded = jwt.verify(args.accessToken, JWT_SECRET) as {
        sub: string;
      };
      const user = users.get(decoded.sub);

      if (!user) {
        return 'Error: User not found';
      }

      return `Protected data for user: ${user.username}
Scopes: ${tokenData.scopes.join(', ')}
Token expires: ${tokenData.expiresAt.toISOString()}
User ID: ${user.id}
Client ID: ${tokenData.clientId}`;
    } catch (error) {
      return `Error: ${error instanceof Error ? error.message : 'Token verification failed'}`;
    }
  },
});

// OAuth discovery endpoint tool
server.addTool({
  name: 'getOAuthDiscovery',
  description: 'Get OAuth 2.1 discovery information',
  parameters: z.object({}),
  annotations: {
    openWorldHint: false,
    readOnlyHint: true,
    title: 'OAuth Discovery',
  },
  execute: async () => {
    const discovery = {
      issuer: `http://localhost:${PORT}`,
      authorization_endpoint: `http://localhost:${PORT}/oauth/authorize`,
      token_endpoint: `http://localhost:${PORT}/oauth/token`,
      registration_endpoint: `http://localhost:${PORT}/oauth/register`,
      introspection_endpoint: `http://localhost:${PORT}/oauth/introspect`,
      revocation_endpoint: `http://localhost:${PORT}/oauth/revoke`,
      scopes_supported: ['read', 'write', 'admin'],
      response_types_supported: ['code'],
      grant_types_supported: ['authorization_code', 'refresh_token'],
      code_challenge_methods_supported: ['S256', 'plain'],
      token_endpoint_auth_methods_supported: [
        'client_secret_basic',
        'client_secret_post',
      ],
    };

    return JSON.stringify(discovery, null, 2);
  },
});

// OAuth client registration tool
server.addTool({
  name: 'registerOAuthClient',
  description: 'Register a new OAuth client',
  parameters: z.object({
    clientName: z.string().describe('Name of the client application'),
    redirectUris: z.array(z.string()).describe('Allowed redirect URIs'),
    scopes: z
      .array(z.string())
      .optional()
      .default(['read'])
      .describe('Requested scopes'),
  }),
  annotations: {
    openWorldHint: false,
    readOnlyHint: false,
    title: 'Client Registration',
  },
  execute: async (args) => {
    const clientId = `client-${generateRandomString(16)}`;
    const clientSecret = generateRandomString(32);

    const client: OAuthClient = {
      id: clientId,
      name: args.clientName,
      redirectUris: args.redirectUris,
      scopes: args.scopes || ['read'],
      createdAt: new Date(),
    };

    clients.set(clientId, client);

    return `Client registered successfully!

Client ID: ${clientId}
Client Secret: ${clientSecret}
Client Name: ${args.clientName}
Redirect URIs: ${args.redirectUris.join(', ')}
Allowed Scopes: ${client.scopes.join(', ')}
Created: ${client.createdAt.toISOString()}

Store the client secret securely - it won't be shown again!`;
  },
});

// Start authorization flow
server.addTool({
  name: 'startOAuthFlow',
  description: 'Start OAuth 2.1 authorization flow with PKCE',
  parameters: z.object({
    clientId: z.string().describe('OAuth client ID'),
    redirectUri: z.string().describe('Redirect URI'),
    scopes: z
      .array(z.string())
      .optional()
      .default(['read'])
      .describe('Requested scopes'),
    codeChallenge: z.string().describe('PKCE code challenge (S256)'),
    codeChallengeMethod: z
      .string()
      .default('S256')
      .describe('PKCE code challenge method'),
  }),
  annotations: {
    openWorldHint: false,
    readOnlyHint: false,
    title: 'Start OAuth Flow',
  },
  execute: async (args) => {
    const client = clients.get(args.clientId);
    if (!client) {
      return 'Error: Invalid client ID';
    }

    if (!client.redirectUris.includes(args.redirectUri)) {
      return 'Error: Invalid redirect URI';
    }

    // In a real implementation, this would redirect to a login page
    // For demo purposes, we'll simulate user login
    const authCode = generateRandomString(32);
    const authCodeData: AuthorizationCode = {
      code: authCode,
      clientId: args.clientId,
      codeChallenge: args.codeChallenge,
      codeChallengeMethod: args.codeChallengeMethod,
      redirectUri: args.redirectUri,
      scopes: args.scopes || ['read'],
      userId: demoUser.id, // Demo: auto-login as demo user
      expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
    };

    authCodes.set(authCode, authCodeData);

    return `Authorization flow started!

Authorization Code: ${authCode}
Expires in: 10 minutes
User: ${demoUser.username} (auto-logged in for demo)

Next: Exchange this code for an access token using the 'exchangeAuthCode' tool.
`;
  },
});

// Exchange authorization code for access token
server.addTool({
  name: 'exchangeAuthCode',
  description: 'Exchange authorization code for access token',
  parameters: z.object({
    code: z.string().describe('Authorization code'),
    clientId: z.string().describe('OAuth client ID'),
    codeVerifier: z.string().describe('PKCE code verifier'),
    redirectUri: z.string().describe('Redirect URI (must match)'),
  }),
  annotations: {
    openWorldHint: false,
    readOnlyHint: false,
    title: 'Exchange Auth Code',
  },
  execute: async (args) => {
    const authCodeData = authCodes.get(args.code);
    if (!authCodeData || authCodeData.expiresAt < new Date()) {
      return 'Error: Invalid or expired authorization code';
    }

    if (authCodeData.clientId !== args.clientId) {
      return 'Error: Client ID mismatch';
    }

    if (authCodeData.redirectUri !== args.redirectUri) {
      return 'Error: Redirect URI mismatch';
    }

    if (
      !verifyCodeChallenge(
        args.codeVerifier,
        authCodeData.codeChallenge,
        authCodeData.codeChallengeMethod,
      )
    ) {
      return 'Error: PKCE verification failed';
    }

    // Generate access token
    const tokenData = generateAccessToken(
      args.clientId,
      authCodeData.userId,
      authCodeData.scopes,
    );

    // Clean up used authorization code
    authCodes.delete(args.code);

    return `Access token generated successfully!

Access Token: ${tokenData.token}
Token Type: Bearer
Expires In: 3600 seconds
Refresh Token: ${tokenData.refreshToken}
Scopes: ${tokenData.scopes.join(' ')}

Use this access token to access protected resources.`;
  },
});

// Token introspection
server.addTool({
  name: 'introspectToken',
  description: 'Introspect an access token (RFC 7662)',
  parameters: z.object({
    token: z.string().describe('Access token to introspect'),
  }),
  annotations: {
    openWorldHint: false,
    readOnlyHint: true,
    title: 'Token Introspection',
  },
  execute: async (args) => {
    const tokenData = accessTokens.get(args.token);
    if (!tokenData || tokenData.expiresAt < new Date()) {
      return JSON.stringify({ active: false });
    }

    try {
      const decoded = jwt.verify(args.token, JWT_SECRET) as {
        exp: number;
        iat: number;
      };
      return JSON.stringify(
        {
          active: true,
          client_id: tokenData.clientId,
          sub: tokenData.userId,
          scopes: tokenData.scopes,
          exp: decoded.exp,
          iat: decoded.iat,
          token_type: 'Bearer',
        },
        null,
        2,
      );
    } catch {
      return JSON.stringify({ active: false });
    }
  },
});

// Token revocation
server.addTool({
  name: 'revokeToken',
  description: 'Revoke an access or refresh token (RFC 7009)',
  parameters: z.object({
    token: z.string().describe('Token to revoke'),
  }),
  annotations: {
    openWorldHint: false,
    readOnlyHint: false,
    title: 'Token Revocation',
  },
  execute: async (args) => {
    const tokenData = accessTokens.get(args.token);
    if (tokenData) {
      accessTokens.delete(args.token);
      return 'Token revoked successfully';
    }

    // Check refresh tokens too
    for (const [accessToken, data] of accessTokens.entries()) {
      if (data.refreshToken === args.token) {
        accessTokens.delete(accessToken);
        return 'Refresh token revoked successfully';
      }
    }

    return 'Token not found or already revoked';
  },
});

// Demo PKCE helper
server.addTool({
  name: 'generatePKCE',
  description: 'Generate PKCE code verifier and challenge for testing',
  parameters: z.object({}),
  annotations: {
    openWorldHint: false,
    readOnlyHint: true,
    title: 'Generate PKCE',
  },
  execute: async () => {
    const codeVerifier = generateRandomString(32);
    const codeChallenge = crypto
      .createHash('sha256')
      .update(codeVerifier)
      .digest('base64url');

    return `PKCE Parameters Generated:

Code Verifier: ${codeVerifier}
Code Challenge: ${codeChallenge}
Code Challenge Method: S256

Use these values in your OAuth flow:
1. Use the code challenge in 'startOAuthFlow'
2. Use the code verifier in 'exchangeAuthCode'`;
  },
});

// Event handlers
server.on('connect', () => {
  console.log('🔗 Client connected to OAuth server');
});

server.on('disconnect', () => {
  console.log('❌ Client disconnected from OAuth server');
});

// Start the server
const startServer = async () => {
  try {
    console.log(`🚀 Starting OAuth 2.1 MCP Server...`);
    console.log(`   Port: ${PORT}`);
    console.log(`   Demo Client ID: ${demoClient.id}`);
    console.log(`   Demo User: ${demoUser.username} / ${demoUser.password}`);

    await server.start({
      transportType: 'httpStream',
      httpStream: {
        port: PORT,
      },
    });

    console.log(`✅ OAuth MCP Server running on port ${PORT}`);
    console.log(`📡 MCP Endpoint: http://localhost:${PORT}/mcp`);
    console.log(`🔍 Test with: pnpm inspect:09`);
    console.log(`\n🔐 OAuth 2.1 Features Available:`);
    console.log(`   • Client Registration`);
    console.log(`   • PKCE Authorization Flow`);
    console.log(`   • Token Exchange`);
    console.log(`   • Token Introspection`);
    console.log(`   • Token Revocation`);
    console.log(`   • Discovery Endpoint`);
  } catch (error) {
    console.error('❌ Failed to start OAuth server:', error);
    throw error;
  }
};

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('🛑 Received SIGTERM, shutting down gracefully...');
  await server.stop();
  console.log('✅ OAuth server shut down successfully');
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('🛑 Received SIGINT, shutting down gracefully...');
  await server.stop();
  console.log('✅ OAuth server shut down successfully');
  process.exit(0);
});

// Start the server
startServer().catch(console.error);
