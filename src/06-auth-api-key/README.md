# MCP Demo: API Key Authentication

This demo demonstrates a common authentication mechanism for Model Context Protocol (MCP) servers: API Key Authentication.

## Overview

When exposing AI tools and resources via MCP, especially over a network, it's crucial to secure access. API Key Authentication is a straightforward method where clients must present a valid API key with their requests to be granted access.

This demo covers:

- How an MCP server can be configured to require API keys.
- How clients should include the API key in their requests.
- Basic principles of API key management (though not an exhaustive security guide).

## How it Works

1.  **API Key Generation & Distribution:**
    - The server administrator generates unique API keys.
    - These keys are securely distributed to authorized clients/users.
2.  **Server Configuration:**
    - The MCP server is configured with a list of valid API keys or a mechanism to validate them (e.g., checking against a database).
    - Middleware or a request handler is set up to inspect incoming requests for an API key.
3.  **Client Request:**
    - The MCP client includes its assigned API key in the request, typically in an HTTP header (e.g., `Authorization: Bearer <YOUR_API_KEY>` or a custom header like `X-API-Key: <YOUR_API_KEY>`).
4.  **Server-Side Validation:**
    - The server extracts the API key from the request.
    - It validates the key against its list of known, valid keys.
    - If the key is valid and authorized, the request is processed.
    - If the key is missing, invalid, or unauthorized, the server rejects the request, usually with an HTTP 401 (Unauthorized) or 403 (Forbidden) status code.

## Running the Demo

_(TODO: Add specific commands to run this demo. This will involve: 1. Starting the MCP server configured for API key auth. 2. Running a client that attempts to connect, first without an API key (should fail), then with a valid API key (should succeed), and perhaps with an invalid API key (should fail).
E.g., `npm run demo:auth-api-key:server`, `npm run demo:auth-api-key:client -- --api-key VALID_KEY`. Refer to `package.json` or project scripts.)_

When running the demo, observe the server's response when requests are made with and without a valid API key. Check server logs for authentication success/failure messages.

## Key MCP Features/Concepts Demonstrated

- **Securing MCP Endpoints:** A practical example of adding an authentication layer to an MCP server.
- **Client-Side Authentication:** How clients need to adapt to send authentication credentials.
- **Middleware/Request Handling:** Conceptual understanding of how incoming requests are intercepted and validated before reaching the core MCP logic.

## Best Practices for API Key Authentication

- **Strong Keys:** Generate long, random, and unique API keys.
- **Secure Storage & Transmission:**
  - Clients should store API keys securely (e.g., environment variables, secret management systems), not hardcoded in source code.
  - Always transmit API keys over HTTPS to prevent interception.
- **Principle of Least Privilege:** Grant API keys only the necessary permissions. If possible, have different keys for different levels of access.
- **Key Rotation:** Implement a policy for regularly rotating API keys.
- **Monitoring & Revocation:** Monitor API key usage for suspicious activity. Have a mechanism to revoke compromised keys quickly.
- **Rate Limiting:** Combine API key auth with rate limiting to prevent abuse by a single key.
- **Don't Expose Keys Client-Side (in Browsers):** API keys used for server-to-server communication or backend MCP servers should never be exposed directly in frontend JavaScript that runs in a user's browser.

While API Key Authentication is relatively simple to implement, it forms a fundamental layer of security for many MCP deployments. For more sensitive applications, consider combining it with other security measures or using more robust protocols like OAuth 2.0.
