# MCP Demo: API Key Authentication

## Introduction

Security is a cornerstone of any system that exposes powerful tools or sensitive data. When building Model Context Protocol (MCP) servers, it's vital to ensure that only authorised users and applications can access your AI's capabilities. API key authentication is a simple yet effective way to secure your endpoints, and is widely used in both development and production environments. This demo shows how to implement and use API key authentication with MCP, so you can keep your services safe and under control.

## Why Use API Keys?

API keys act as digital passes—only those with a valid key can access your server's tools and resources. This approach is:

- **Straightforward to implement**
- **Easy to manage and rotate**
- **Suitable for server-to-server or trusted client scenarios**

While not as sophisticated as OAuth, API keys provide a solid baseline for many use cases.

## How It Works: Step by Step

1. **API Key Generation & Distribution:**
   - The server administrator generates unique API keys.
   - Keys are securely distributed to authorised users or systems.
2. **Server Configuration:**
   - The MCP server is set up to recognise and validate incoming API keys (e.g., via a list or database).
   - Middleware or request handlers check each request for a valid key.
3. **Client Request:**
   - The client includes its API key in the request, usually in an HTTP header (e.g., `Authorization: Bearer <YOUR_API_KEY>` or `X-API-Key: <YOUR_API_KEY>`).
4. **Server-Side Validation:**
   - The server extracts and checks the API key.
   - If valid, the request proceeds; if not, it's rejected with an appropriate error code (401 or 403).

## Running the Demo

To try out this demo:

1. Start the server:
   ```sh
   pnpm example:server:06
   ```
2. In a separate terminal, after a few seconds, run the client (replace `<YOUR_API_KEY>` with your actual key):
   ```sh
   pnpm example:client:06 -- --api-key <YOUR_API_KEY>
   ```

Try running the client with and without a valid API key to see how authentication is enforced.

## Key MCP Features Demonstrated

- **Securing Endpoints:** Adding an authentication layer to your MCP server.
- **Client-Side Authentication:** How clients must adapt to send credentials.
- **Middleware/Request Handling:** How requests are intercepted and validated before reaching core logic.

## Best Practices for API Key Authentication

- **Strong Keys:** Generate long, random, and unique keys.
- **Secure Storage:** Store keys in environment variables or secret managers, never in source code.
- **HTTPS Only:** Always transmit API keys over secure (HTTPS) connections.
- **Least Privilege:** Assign only the permissions needed for each key.
- **Key Rotation:** Regularly rotate keys and have a process for revocation.
- **Monitoring:** Track usage and watch for suspicious activity.
- **Rate Limiting:** Combine with rate limiting to prevent abuse.
- **Never Expose Keys in Browsers:** Only use API keys in trusted server environments, not in frontend code.

## Troubleshooting & Tips

- If authentication fails, check that the key is correct and included in the request header.
- For production, consider logging failed authentication attempts for security audits.
- For more sensitive applications, consider upgrading to OAuth or another robust protocol.

## Further Reading

- [Model Context Protocol Documentation](https://modelcontextprotocol.org/)
- [API Security Best Practices](https://yourcompany.com/blog/api-security)

---

API key authentication is a practical and effective way to secure your MCP servers. By following best practices, you can protect your tools and data while keeping integration simple and reliable.
