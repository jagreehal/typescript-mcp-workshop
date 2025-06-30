# MCP Demo: OAuth 2.1 Authentication with PKCE

## Introduction

OAuth 2.1 with PKCE (Proof Key for Code Exchange) is the gold standard for securing remote MCP servers. While the Simplescraper guide touches on OAuth implementation, this example provides a **complete, production-ready OAuth 2.1 server** that exceeds the specifications and best practices covered in most guides.

This implementation includes all required MCP OAuth endpoints, proper PKCE flow, client registration, security headers, and comprehensive error handling. You'll learn not just how to implement OAuth, but how to implement it **correctly and securely** for production use.

## Why OAuth 2.1 with PKCE?

OAuth 2.1 with PKCE provides several critical security advantages over simpler authentication methods:

- **Zero Shared Secrets**: No client secrets that can be compromised
- **Dynamic Code Challenges**: Each authorization request uses a unique challenge
- **Replay Attack Prevention**: Authorization codes can only be used once
- **Man-in-the-Middle Protection**: PKCE prevents code interception attacks
- **Standards Compliance**: Required by MCP specification for remote servers

## Complete OAuth 2.1 Flow Implementation

Our implementation includes **all required endpoints** that many guides omit:

### Core OAuth Endpoints

- `POST /oauth/authorize` - Authorization endpoint with PKCE
- `POST /oauth/token` - Token exchange endpoint
- `POST /oauth/register` - Dynamic client registration (RFC 7591)
- `POST /oauth/revoke` - Token revocation (RFC 7009)

### Discovery Endpoints (Required by MCP)

- `GET /.well-known/oauth-authorization-server` - Server metadata
- `GET /.well-known/oauth-protected-resource` - Resource metadata
- `GET /.well-known/openid_configuration` - OpenID Connect discovery

### Additional Security Endpoints

- `POST /oauth/introspect` - Token introspection (RFC 7662)
- `GET /oauth/userinfo` - User information endpoint
- `GET /oauth/keys` - JWK Set endpoint for token verification

## Key Security Features

### 1. PKCE Implementation

```
Client generates:
code_verifier = random 43-128 character string
code_challenge = base64url(sha256(code_verifier))

Authorization request includes:
- code_challenge
- code_challenge_method=S256

Token request must include:
- code_verifier (validated against stored challenge)
```

### 2. Secure Token Handling

- **JWT Access Tokens**: Self-contained, cryptographically signed
- **Refresh Token Rotation**: New refresh token issued with each refresh
- **Token Binding**: Tokens bound to client and session context
- **Expiration Policies**: Short-lived access tokens, longer refresh tokens

### 3. Client Registration & Validation

- **Dynamic Client Registration**: Clients can register themselves
- **Client Metadata Validation**: Strict validation of redirect URIs
- **Rate Limiting**: Prevent abuse of registration endpoints
- **Client Authentication**: Support for multiple authentication methods

## Advanced Features Beyond Standard Guides

### 1. Multi-Provider Authentication

Support for multiple identity providers:

- Firebase Authentication
- Auth0
- Clerk
- Supabase Auth
- Custom OIDC providers

### 2. Session Management Integration

- **Session Binding**: OAuth tokens bound to MCP sessions
- **Session Persistence**: OAuth context survives MCP reconnections
- **Session Isolation**: Each OAuth client gets isolated session state

### 3. Comprehensive Error Handling

Proper OAuth error responses with detailed debugging information:

```json
{
  "error": "invalid_request",
  "error_description": "Missing required parameter: code_challenge",
  "error_uri": "https://tools.ietf.org/html/rfc6749#section-4.1.2.1",
  "state": "client-provided-state"
}
```

## Implementation Architecture

```
┌─────────────────┐
│   MCP Client    │ ← Claude, ChatGPT, etc.
├─────────────────┤
│ OAuth 2.1 Layer │ ← Full PKCE flow implementation
├─────────────────┤
│ Token Validator │ ← JWT verification & session binding
├─────────────────┤
│   MCP Server    │ ← Your actual MCP tools/resources
├─────────────────┤
│ Identity Store  │ ← User management & authentication
└─────────────────┘
```

## Running the Demo

### 1. Environment Setup

Create a `.env` file in this directory:

```bash
# OAuth Configuration
OAUTH_ISSUER=http://localhost:3009
OAUTH_CLIENT_ID=demo-client
OAUTH_CLIENT_SECRET=demo-secret-not-used-with-pkce

# JWT Signing (generate with: openssl rand -base64 32)
JWT_SECRET=your-256-bit-secret-here

# Identity Provider (choose one)
FIREBASE_PROJECT_ID=your-firebase-project
# OR
AUTH0_DOMAIN=your-tenant.auth0.com
AUTH0_CLIENT_ID=your-auth0-client-id
# OR
CLERK_SECRET_KEY=sk_test_...
```

### 2. Start the OAuth-Enabled MCP Server

```bash
pnpm example:server:09
```

### 3. Test the OAuth Flow

**Option A: Use MCP Inspector with OAuth**

```bash
pnpm inspect:09
```

**Option B: Manual OAuth Flow Testing**

```bash
# 1. Test server discovery
curl http://localhost:3009/.well-known/oauth-authorization-server

# 2. Register a client
curl -X POST http://localhost:3009/oauth/register \
  -H "Content-Type: application/json" \
  -d '{"client_name": "test-client", "redirect_uris": ["http://localhost:8080/callback"]}'

# 3. Start authorization flow (get this URL from server logs)
open "http://localhost:3009/oauth/authorize?client_id=...&code_challenge=...&response_type=code"

# 4. Test token exchange
curl -X POST http://localhost:3009/oauth/token \
  -H "Content-Type: application/json" \
  -d '{"grant_type": "authorization_code", "code": "...", "code_verifier": "..."}'
```

**Option C: Use the test client**

```bash
pnpm example:client:09
```

## Key Features Demonstrated

### OAuth 2.1 Compliance

- ✅ **PKCE Required**: All authorization flows use PKCE
- ✅ **No Client Secrets**: Public clients don't need secrets
- ✅ **Refresh Token Rotation**: Refresh tokens are rotated on use
- ✅ **Discovery Endpoints**: All required metadata endpoints
- ✅ **Error Handling**: Proper OAuth error responses

### Security Best Practices

- ✅ **JWT Access Tokens**: Self-contained, verifiable tokens
- ✅ **HTTPS Enforcement**: Redirect URIs must use HTTPS (configurable)
- ✅ **CSRF Protection**: State parameter validation
- ✅ **Rate Limiting**: Prevent brute force attacks
- ✅ **Secure Headers**: HSTS, CSP, and other security headers

### Production Features

- ✅ **Client Registration**: Dynamic client registration
- ✅ **Token Introspection**: Validate tokens programmatically
- ✅ **User Information**: Standard userinfo endpoint
- ✅ **Token Revocation**: Revoke tokens when needed
- ✅ **Monitoring**: Comprehensive logging and metrics

## Comparison with Other Implementations

| Feature                 | Basic Guides      | Simplescraper Guide | This Implementation     |
| ----------------------- | ----------------- | ------------------- | ----------------------- |
| **PKCE Support**        | ❌ Often missing  | ✅ Basic            | ✅ Complete with S256   |
| **Client Registration** | ❌ Manual only    | ✅ Basic            | ✅ Full RFC 7591        |
| **Discovery Endpoints** | ❌ Limited        | ✅ Basic            | ✅ Complete metadata    |
| **JWT Tokens**          | ❌ Simple strings | ✅ Basic            | ✅ Full JWT with claims |
| **Refresh Tokens**      | ❌ Static         | ✅ Basic            | ✅ Rotation + binding   |
| **Error Handling**      | ❌ Basic          | ✅ Good             | ✅ Comprehensive        |
| **Multi-Provider**      | ❌ No             | ❌ Firebase only    | ✅ Multiple providers   |
| **Production Ready**    | ❌ No             | ⚠️ Partial          | ✅ Complete             |

## Security Considerations

### 1. Token Security

```typescript
// JWT tokens include security claims
const tokenPayload = {
  iss: process.env.OAUTH_ISSUER,
  sub: user.id,
  aud: client.client_id,
  exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour
  iat: Math.floor(Date.now() / 1000),
  scope: 'mcp:tools mcp:resources',
  session_id: mcpSessionId, // Bind to MCP session
};
```

### 2. PKCE Validation

```typescript
// Strict PKCE validation
if (storedChallenge.method === 'S256') {
  const hash = crypto
    .createHash('sha256')
    .update(codeVerifier)
    .digest('base64url');
  if (hash !== storedChallenge.challenge) {
    throw new OAuthError('invalid_grant', 'Invalid code_verifier');
  }
}
```

### 3. Secure Storage

```typescript
// Store sensitive data securely
const authorizationCode = {
  code: generateSecureCode(),
  clientId: client.client_id,
  userId: user.id,
  codeChallenge: challenge,
  codeChallengeMethod: challengeMethod,
  expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
  used: false,
};
```

## Integration with Identity Providers

### Firebase Authentication

```typescript
const firebaseUser = await admin.auth().verifyIdToken(idToken);
const mcpUser = {
  id: firebaseUser.uid,
  email: firebaseUser.email,
  name: firebaseUser.name,
  provider: 'firebase',
};
```

### Auth0 Integration

```typescript
const auth0User = await auth0.getUser(accessToken);
const mcpUser = {
  id: auth0User.sub,
  email: auth0User.email,
  name: auth0User.name,
  provider: 'auth0',
};
```

## Advanced Usage Patterns

### 1. Service Account Authentication

For server-to-server scenarios:

```bash
curl -X POST http://localhost:3009/oauth/token \
  -H "Content-Type: application/json" \
  -d '{"grant_type": "client_credentials", "scope": "mcp:admin"}'
```

### 2. Token Refresh Flow

```bash
curl -X POST http://localhost:3009/oauth/token \
  -H "Content-Type: application/json" \
  -d '{"grant_type": "refresh_token", "refresh_token": "..."}'
```

### 3. Token Introspection

```bash
curl -X POST http://localhost:3009/oauth/introspect \
  -H "Authorization: Bearer admin-token" \
  -d "token=access-token-to-validate"
```

## Troubleshooting Guide

### Common OAuth Issues

**Problem**: "invalid_client" error during token exchange
**Solution**: Verify client_id matches the one used in authorization

**Problem**: "invalid_grant" error with PKCE
**Solution**: Ensure code_verifier matches the original code_challenge

**Problem**: "unsupported_grant_type" error
**Solution**: Check that grant_type is one of: authorization_code, refresh_token, client_credentials

### Debug Mode

Enable OAuth debug logging:

```bash
DEBUG=oauth:* pnpm example:server:09
```

### Token Inspection

Use the introspection endpoint to debug token issues:

```bash
curl -X POST http://localhost:3009/oauth/introspect \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "token=YOUR_ACCESS_TOKEN"
```

## Testing & Validation

### OAuth Flow Testing

```bash
# Run the complete OAuth test suite
pnpm test:oauth:09

# Test specific grant types
pnpm test:oauth:authorization-code
pnpm test:oauth:refresh-token
pnpm test:oauth:client-credentials
```

### Security Testing

```bash
# Test PKCE validation
pnpm test:oauth:pkce

# Test token security
pnpm test:oauth:tokens

# Test rate limiting
pnpm test:oauth:rate-limits
```

## Production Deployment

### Environment Variables

```bash
# Production OAuth settings
OAUTH_ISSUER=https://your-mcp-server.com
OAUTH_ENFORCE_HTTPS=true
OAUTH_SESSION_TIMEOUT=3600

# Security settings
JWT_SECRET=your-production-secret
CSRF_SECRET=your-csrf-secret
RATE_LIMIT_WINDOW=900000
RATE_LIMIT_MAX=100

# Identity provider
FIREBASE_SERVICE_ACCOUNT_KEY=/path/to/service-account.json
```

### Security Headers

```typescript
app.use(
  helmet({
    hsts: { maxAge: 31536000, includeSubDomains: true },
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
      },
    },
  }),
);
```

## What's Next?

This OAuth implementation provides the foundation for secure MCP servers. Build on it with:

- **Example 10**: Dual transport support (HTTP+SSE and Streamable HTTP)
- **Example 11**: Real API integration with OAuth context
- **Example 12**: Production deployment with monitoring

## Further Reading

- [OAuth 2.1 Specification](https://datatracker.ietf.org/doc/html/draft-ietf-oauth-v2-1)
- [PKCE Specification (RFC 7636)](https://tools.ietf.org/html/rfc7636)
- [OAuth 2.0 Security Best Practices](https://datatracker.ietf.org/doc/html/draft-ietf-oauth-security-topics)
- [Dynamic Client Registration (RFC 7591)](https://tools.ietf.org/html/rfc7591)

---

This OAuth 2.1 implementation goes far beyond basic authentication, providing a production-ready foundation for secure MCP servers that meets enterprise security requirements.
