# Typescript MCP Workshop

Model Context Protocol (MCP) is an open protocol that enables language models and AI systems to dynamically discover, describe, and interact with external tools, APIs, and services in a standardised way. MCP allows for flexible, real-time tool integration, making it possible for AI to adapt to new capabilities without redeployment.

This workshop uses the FastMCP library—a TypeScript implementation of MCP that makes it easy to build, serve, and consume dynamic tools in your applications.

This workshop demonstrates the Model Context Protocol (MCP) using TypeScript through a series of progressive examples.

## Prerequisites

The workshop requires the following tools to be installed:

- Node.js v22 or higher
- pnpm (Package manager)
- Ollama - Install from [ollama.ai](https://ollama.ai)
  - The workshop uses the `llama3.2:latest` model
- TypeScript configuration (provided in the repo)

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

If any issues are found, the script will provide helpful instructions to resolve them.

## Examples Overview

### [01 - Tools Only](./src/01-tools-only/post.md)

A basic example demonstrating MCP tools integration.

```bash
# Run server
pnpm example:server:01

# Run client
pnpm example:client:01
```

### [02 - Standard I/O and Filesystem](./src/02-stdio-filesystem/post.md)

Example showing how to work with standard I/O operations and filesystem access through MCP.

```bash
# Run server
pnpm example:server:02

# Run client
pnpm example:client:02
```

### [03 - Multi-Server Architecture](./src/03-multi-server/post.md)

Demonstrates a multi-server setup with user and payment services communicating through MCP.

```bash
# Run both user and payment servers
pnpm example:server:03

# Or run them individually
pnpm example:user:03
pnpm example:payment:03

# Run client
pnpm example:client:03
```

### [04 - Authentication with API Keys](./src/04-auth-api-key/post.md)

Shows how to implement API key authentication in an MCP-enabled application.

```bash
# Run server
pnpm example:server:04

# Run client
pnpm example:client:04
```

### [05 - Playwright Demo](./src/05-playwright-demo/post.md)

Demonstrates browser automation and testing capabilities using Playwright with MCP.

```bash
# Run client
pnpm example:client:05
```
