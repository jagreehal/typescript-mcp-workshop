# Typescript MCP Workshop

Model Context Protocol (MCP) is an open protocol that enables language models and AI systems to dynamically discover, describe, and interact with external tools, APIs, and services in a standardised way. MCP allows for flexible, real-time tool integration, making it possible for AI to adapt to new capabilities without redeployment.

This workshop uses the FastMCP library—a TypeScript implementation of MCP that makes it easy to build, serve, and consume dynamic tools in your applications.

This workshop demonstrates the Model Context Protocol (MCP) using TypeScript through a series of progressive, hands-on examples.

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

### [01 - Tools Only](./src/01-tools-only/README.md)

A dynamic calculator server that demonstrates how to add, remove, and discover tools at runtime using MCP. Learn how to build and test tools that can be updated live, with no server restart required.
Details: [src/01-tools-only/README.md](./src/01-tools-only/README.md)

```bash
# Run server
pnpm example:server:01

# Run client
pnpm example:client:01
```

### [02 - Resources: Give AI Access to Real Data](./src/02-resources/README.md)

Serve live data, files, and documentation to AI using MCP resources. This example shows how to expose system metrics, logs, configurations, and more, in multiple formats (JSON, CSV, HTML, images).
Details: [src/02-resources/README.md](./src/02-resources/README.md)

```bash
# Run server
pnpm example:server:02

# Run client
pnpm example:client:02
```

### [03 - Prompts: Consistent AI Results](./src/03-prompts/README.md)

Build a library of reusable prompt templates for consistent, high-quality AI results. See how to generate code reviews, team discussions, explanations, and more, using dynamic prompt construction.
Details: [src/03-prompts/README.md](./src/03-prompts/README.md)

```bash
# Run server
pnpm example:server:03

# Run client
pnpm example:client:03
```

### [04 - Standard I/O and Filesystem](./src/04-stdio-filesystem/README.md)

Use the stdio protocol to enable local MCP servers to access your filesystem. Expose tools for listing directories and reading files, and see how local AI tools can interact with your real environment.
Details: [src/04-stdio-filesystem/README.md](./src/04-stdio-filesystem/README.md)

```bash
# Run server
pnpm example:server:04

# Run client
pnpm example:client:04
```

### [05 - Multi-Server Architecture](./src/05-multi-server/README.md)

Compose multiple MCP servers (e.g., user and payment services) and combine their tools in a single client workflow. Demonstrates modular, scalable AI architectures.
Details: [src/05-multi-server/README.md](./src/05-multi-server/README.md)

```bash
# Run both user and payment servers
pnpm example:server:05

# Or run them individually
pnpm example:user:05
pnpm example:payment:05

# Run client
pnpm example:client:05
```

### [06 - Authentication with API Keys](./src/06-auth-api-key/README.md)

Implement API key authentication and session management in MCP servers. Learn how to restrict access, personalize responses, and audit user actions for secure, stateful AI workflows.
Details: [src/06-auth-api-key/README.md](./src/06-auth-api-key/README.md)

```bash
# Run server
pnpm example:server:06

# Run client
pnpm example:client:06
```

### [07 - Playwright Demo: Browser Automation](./src/07-playwright-demo/README.md)

Automate browsers using Playwright and MCP. This demo shows how to expose Playwright's browser automation capabilities as MCP tools, enabling an AI to navigate websites, fill forms, scrape data, and take screenshots.
Details: [src/07-playwright-demo/README.md](./src/07-playwright-demo/README.md)

```bash
# Run client (server setup might be separate or TBD)
pnpm example:client:07
```

---

## Debugging with MCP Inspector

The MCP Inspector is a powerful tool for interactively testing and debugging your MCP servers. It provides a graphical interface to:

- Discover and invoke tools exposed by your MCP server
- Inspect available resources and prompts
- View server metadata and capabilities
- Test tool inputs/outputs without writing client code

### Why Use MCP Inspector?

- **Rapid Prototyping:** Instantly test new tools or resources as you develop them
- **Debugging:** Identify issues with tool registration, input validation, or server responses
- **Learning:** Explore the full capabilities of your MCP server in a user-friendly way

### How to Run MCP Inspector

You can launch the MCP Inspector for any example server. For example, to inspect the Tools Only server:

```bash
pnpm inspect
```

This will start the Inspector and connect it to the server defined in `src/01-tools-only/server.ts`.

You can add similar scripts for other servers as needed (see `package.json`).

For more information, see the [official MCP Inspector documentation](https://modelcontextprotocol.io/introduction) and the FastMCP library docs.

For more details, see each example's README for in-depth guides, code samples, and advanced usage tips.
