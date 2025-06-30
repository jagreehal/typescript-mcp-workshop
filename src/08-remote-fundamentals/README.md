# MCP Demo: Remote Server Fundamentals

## Introduction

The transition from local to remote MCP servers marks a crucial shift in how AI assistants can interact with the world. While local servers are perfect for development and personal workflows, remote servers enable AI tools to be shared across the internet, integrated into production applications, and used by multiple clients simultaneously.

This example teaches you everything you need to know about building HTTP-based MCP servers that work with Claude, ChatGPT, and other MCP clients over the internet. We'll cover the fundamental differences between local and remote protocols, proper session management, and the foundation for production-ready servers.

## Why Remote MCP Servers?

Remote MCP servers unlock powerful capabilities that local servers cannot provide:

- **Global Accessibility**: AI assistants can access your tools from anywhere
- **Multi-Client Support**: Multiple users can access the same server simultaneously
- **Production Integration**: Deploy to cloud platforms and integrate with existing services
- **API Gateway Pattern**: Centralize authentication, rate limiting, and monitoring
- **Scalability**: Handle thousands of concurrent sessions efficiently

However, with these benefits come new challenges that this example addresses comprehensively.

## Key Differences: Local vs Remote

| Aspect                 | Local Servers     | Remote Servers               |
| ---------------------- | ----------------- | ---------------------------- |
| **Transport**          | Stdio, local HTTP | HTTP/HTTPS only              |
| **Session Management** | Single session    | Multiple concurrent sessions |
| **Authentication**     | Usually none      | OAuth 2.1, API keys, etc.    |
| **Error Handling**     | Simple exceptions | HTTP status codes + JSON-RPC |
| **Deployment**         | Local process     | Cloud platforms, containers  |
| **Monitoring**         | Basic logging     | Comprehensive metrics        |

## How Remote MCP Works: Deep Dive

### 1. HTTP Transport Layer

Unlike local servers that use stdio or simple HTTP, remote MCP servers must implement proper HTTP transports:

```
Client Request:
POST /mcp HTTP/1.1
Content-Type: application/json
Mcp-Session-Id: session-123

{"jsonrpc": "2.0", "method": "tools/list", "id": 1}

Server Response:
HTTP/1.1 200 OK
Content-Type: application/json
Mcp-Session-Id: session-123

{"jsonrpc": "2.0", "result": {"tools": [...]}, "id": 1}
```

### 2. Session Management

Remote servers must track multiple client sessions simultaneously:

- **Session Creation**: Each client gets a unique session ID
- **State Isolation**: Each session maintains separate state
- **Cleanup**: Sessions are properly disposed when clients disconnect
- **Persistence**: Sessions can survive temporary network interruptions

### 3. Error Handling

Remote servers use HTTP status codes combined with JSON-RPC error responses:

```json
// 401 Unauthorized with JSON-RPC error
{
  "jsonrpc": "2.0",
  "error": {
    "code": -32001,
    "message": "Authentication required",
    "data": { "type": "auth_required" }
  },
  "id": 1
}
```

## Implementation Architecture

Our remote server implements a clean separation of concerns:

```
┌─────────────────┐
│   HTTP Server   │ ← Express.js handling HTTP requests
├─────────────────┤
│ Transport Layer │ ← MCP transport handling (FastMCP)
├─────────────────┤
│ Session Manager │ ← Track multiple client sessions
├─────────────────┤
│ Business Logic  │ ← Your actual MCP tools and resources
└─────────────────┘
```

## Running the Demo

To experience remote MCP in action:

1. **Start the remote server**:

   ```bash
   pnpm example:server:08
   ```

2. **Test with multiple methods**:

   **Option A: Use MCP Inspector**

   ```bash
   pnpm inspect:08
   ```

   **Option B: Use curl to test the HTTP API directly**

   ```bash
   # Test server capabilities
   curl -X POST http://localhost:3008/mcp \
     -H "Content-Type: application/json" \
     -H "Mcp-Session-Id: test-session" \
     -d '{"jsonrpc": "2.0", "method": "initialize", "params": {"protocolVersion": "2024-11-05", "capabilities": {}}, "id": 1}'
   ```

   **Option C: Use the test client**

   ```bash
   pnpm example:client:08
   ```

3. **Test with multiple concurrent sessions**:

   ```bash
   # Terminal 1
   pnpm example:client:08 -- --session-id session-1

   # Terminal 2
   pnpm example:client:08 -- --session-id session-2
   ```

## Key MCP Features Demonstrated

### Core Remote Server Concepts

- **HTTP Transport Implementation**: Proper HTTP handling for MCP requests
- **Session ID Management**: Creating and tracking unique client sessions
- **JSON-RPC over HTTP**: Implementing the MCP protocol over HTTP
- **Concurrent Client Handling**: Supporting multiple simultaneous connections
- **Proper Error Responses**: HTTP status codes with JSON-RPC error formatting

### Production-Ready Features

- **Health Check Endpoint**: `/health` for load balancer health checks
- **Graceful Shutdown**: Proper cleanup when server stops
- **Request Logging**: Detailed logging for debugging and monitoring
- **CORS Support**: Enable cross-origin requests when needed
- **Input Validation**: Robust validation of all incoming requests

## Best Practices for Remote Servers

### 1. Session Management

```typescript
// Always generate unique session IDs
const sessionId = req.headers['mcp-session-id'] || `session-${uuidv4()}`;

// Store session state safely
const sessionStore = new Map<string, SessionData>();

// Clean up abandoned sessions
setInterval(cleanupAbandonedSessions, 5 * 60 * 1000); // Every 5 minutes
```

### 2. Error Handling

```typescript
// Always return proper HTTP status codes
if (!authenticated) {
  return res.status(401).json({
    jsonrpc: '2.0',
    error: {
      code: -32001,
      message: 'Authentication required',
    },
    id: request.id,
  });
}
```

### 3. Resource Management

```typescript
// Implement proper cleanup
process.on('SIGTERM', async () => {
  console.log('Shutting down gracefully...');
  await server.close();
  process.exit(0);
});
```

## Advanced Features Covered

### 1. Session Isolation

Each client session is completely isolated:

- Separate tool state
- Independent authentication context
- Isolated resource access
- Independent rate limiting

### 2. Transport Negotiation

The server automatically detects and handles different transport types:

- Streamable HTTP (modern clients)
- HTTP+SSE (legacy clients - covered in example 10)
- Content-type negotiation
- Protocol version handling

### 3. Monitoring & Observability

Built-in monitoring capabilities:

- Request/response logging
- Session metrics
- Error tracking
- Performance monitoring

## Troubleshooting Guide

### Common Issues and Solutions

**Problem**: "Connection refused" errors
**Solution**: Ensure the server is running on the correct port and accessible

**Problem**: Session state not persisting
**Solution**: Check session ID handling in headers

**Problem**: Tool calls failing
**Solution**: Verify JSON-RPC request format and tool registration

**Problem**: Multiple clients interfering with each other
**Solution**: Confirm session isolation is working correctly

### Debug Mode

Enable debug logging to see detailed request/response flow:

```bash
DEBUG=mcp:* pnpm example:server:08
```

## Security Considerations

Even this basic remote server includes important security measures:

- **Input Validation**: All requests are validated against schemas
- **Session Isolation**: Clients cannot access each other's data
- **Error Information Leakage**: Error messages don't expose sensitive information
- **Resource Limits**: Basic protections against resource exhaustion

## What's Next?

This example provides the foundation for remote MCP servers. The following examples build on these concepts:

- **Example 09**: Add OAuth 2.1 authentication
- **Example 10**: Support multiple transport protocols
- **Example 11**: Integrate with real external APIs
- **Example 12**: Deploy to production with monitoring

## Further Reading

- [MCP Specification: Remote Servers](https://modelcontextprotocol.org/docs/concepts/remote)
- [JSON-RPC 2.0 Specification](https://www.jsonrpc.org/specification)
- [HTTP/1.1 Specification](https://tools.ietf.org/html/rfc7231)

---

This example transforms your understanding from local MCP development to production-ready remote servers. You'll learn not just how to make it work, but how to make it work reliably, securely, and at scale.
