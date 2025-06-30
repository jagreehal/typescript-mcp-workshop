# TypeScript MCP Workshop: Complete Guide to Local and Remote Servers

Model Context Protocol (MCP) is an open protocol that enables language models and AI systems to dynamically discover, describe, and interact with external tools, APIs, and services in a standardised way. MCP allows for flexible, real-time tool integration, making it possible for AI to adapt to new capabilities without redeployment.

This workshop demonstrates both **local** and **remote** MCP implementations using TypeScript, progressing from basic concepts to production-ready servers that work with Claude, ChatGPT, and other MCP clients.

## Workshop Philosophy

This workshop is structured to provide **more comprehensive coverage** than existing guides by:

- **Progressive Learning**: Start with local servers, then move to remote HTTP servers
- **Production-Ready Examples**: Full OAuth 2.1, session management, and deployment
- **Multiple Transport Protocols**: Support both legacy (HTTP+SSE) and modern (Streamable HTTP)
- **Real-World Integration**: Connect to actual APIs, not just toy examples
- **Spec Compliance**: Implement all required MCP endpoints and behaviors

## Prerequisites

The workshop requires the following tools to be installed:

- Node.js v22 or higher
- pnpm (Package manager)
- TypeScript configuration (provided in the repo)
- Docker (for deployment examples)

## LLM Configuration

You can use the examples with [ollama](https://ollama.ai) and models like `llama3.2:latest`, but for better results use frontier models from OpenAI, Anthropic, Google, Mistral, or Groq.

Update the `model` variable in `src/model.ts` to configure your preferred model.

## Setup and Environment Check

Run the setup script to verify your environment is properly configured:

```bash
pnpm setup
```

The setup script will:

1. Check Node.js version (v22+ required)
2. Verify package manager installation
3. Check Ollama installation and required models
4. Validate TypeScript configuration
5. Test network connectivity for remote examples

## Examples Overview

### Part I: Local MCP Servers

These examples demonstrate MCP servers running locally, perfect for learning core concepts and local AI workflows.

#### [01 - Tools Only](./src/01-tools-only/README.md)

A dynamic calculator server that demonstrates how to add, remove, and discover tools at runtime using MCP. Learn how to build and test tools that can be updated live, with no server restart required.

```bash
# Run server
pnpm example:server:01

# Run client
pnpm example:client:01
```

#### [02 - Resources: Give AI Access to Real Data](./src/02-resources/README.md)

Serve live data, files, and documentation to AI using MCP resources. This example shows how to expose system metrics, logs, configurations, and more, in multiple formats (JSON, CSV, HTML, images).

```bash
# Run server
pnpm example:server:02

# Run client
pnpm example:client:02
```

#### [03 - Prompts: Consistent AI Results](./src/03-prompts/README.md)

Build a library of reusable prompt templates for consistent, high-quality AI results. See how to generate code reviews, team discussions, explanations, and more, using dynamic prompt construction.

```bash
# Run server
pnpm example:server:03

# Run client
pnpm example:client:03
```

#### [04 - Standard I/O and Filesystem](./src/04-stdio-filesystem/README.md)

Use the stdio protocol to enable local MCP servers to access your filesystem. Expose tools for listing directories and reading files, and see how local AI tools can interact with your real environment.

```bash
# Run server
pnpm example:server:04

# Run client
pnpm example:client:04
```

#### [05 - Multi-Server Architecture](./src/05-multi-server/README.md)

Compose multiple MCP servers (e.g., user and payment services) and combine their tools in a single client workflow. Demonstrates modular, scalable AI architectures.

```bash
# Run both user and payment servers
pnpm example:server:05

# Run client
pnpm example:client:05
```

#### [06 - Authentication with API Keys](./src/06-auth-api-key/README.md)

Implement API key authentication and session management in MCP servers. Learn how to restrict access, personalize responses, and audit user actions for secure, stateful AI workflows.

```bash
# Run server
pnpm example:server:06

# Run client with API key
pnpm example:client:06 -- --api-key your-key-here
```

#### [07 - Playwright Demo: Browser Automation](./src/07-playwright-demo/README.md)

Automate browsers using Playwright and MCP. This demo shows how to expose Playwright's browser automation capabilities as MCP tools, enabling an AI to navigate websites, fill forms, scrape data, and take screenshots.

```bash
# Run client
pnpm example:client:07
```

### Part II: Remote MCP Servers (Production-Ready)

These examples demonstrate remote MCP servers that work with Claude, ChatGPT, and other MCP clients over HTTP, including all production requirements.

#### [08 - Remote Server Fundamentals](./src/08-remote-fundamentals/README.md)

Learn the fundamental differences between local and remote MCP servers. Implement your first HTTP-based MCP server with proper transport handling, session management, and basic error handling.

**Key Concepts**: HTTP transports, session IDs, JSON-RPC over HTTP, basic server setup

```bash
# Run remote server
pnpm example:server:08

# Test with MCP Inspector or curl
pnpm inspect:08
```

#### [09 - OAuth 2.1 Authentication](./src/09-oauth-authentication/README.md)

Implement complete OAuth 2.1 authentication with PKCE flow as required by the MCP specification. Includes all discovery endpoints, client registration, and secure token handling.

**Key Concepts**: OAuth 2.1, PKCE flow, `.well-known` endpoints, client registration, token validation

```bash
# Run OAuth-enabled server
pnpm example:server:09

# Test OAuth flow
pnpm example:client:09
```

## Debugging with MCP Inspector

The MCP Inspector is a powerful tool for interactively testing and debugging your MCP servers:

```bash
# Inspect any example server
pnpm inspect

# Inspect specific examples
pnpm inspect:01  # Local tools-only
pnpm inspect:08  # Remote fundamentals
pnpm inspect:09  # OAuth authentication
```

## Comparison with Other Guides

This workshop provides **more comprehensive coverage** than existing resources by:

- ✅ **Complete OAuth 2.1 Implementation** (not just basic API keys)
- ✅ **Both Local and Remote Servers** (most guides focus on only one)
- ✅ **Multiple Transport Protocols** (HTTP+SSE and Streamable HTTP)
- ✅ **Production Deployment Examples** (Docker, cloud platforms)
- ✅ **Real API Integration** (not just toy calculators)
- ✅ **Session Management** (across different transport types)
- ✅ **Comprehensive Testing** (unit, integration, load tests)
- ✅ **Troubleshooting Guides** (common issues and solutions)

## Next Steps

1. **Start with Local Examples** (01-07) if you're new to MCP
2. **Move to Remote Examples** (08-09) for production use cases

Each example builds on previous concepts while introducing new functionality, ensuring you understand both the fundamentals and advanced production requirements.

---

For detailed information about each example, see the individual README files in each directory.
