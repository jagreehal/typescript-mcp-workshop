# MCP Demo: Multi-Server Orchestration

## Introduction

Modern applications rarely live in isolation. In the real world, data and actions are spread across multiple systems—user databases, payment processors, analytics services, and more. The Model Context Protocol (MCP) makes it possible for AI assistants to orchestrate actions across several specialised servers, enabling seamless, intelligent workflows. This demo shows how MCP can connect the dots between different services, allowing the AI to answer complex questions by combining information from multiple sources.

## Why Multi-Server Orchestration?

Imagine asking, "What are the recent transactions for bob@example.com?" The answer might require looking up a user ID in one system and fetching transactions from another. With MCP, the AI can coordinate these steps automatically, without manual intervention or step-by-step instructions from the user.

## How It Works: Step by Step

1. **User Query:** The user asks a question that spans multiple systems (e.g., "Show me all purchases for alice@example.com").
2. **AI/Orchestrator:**
   - Calls a tool on the user server to get the user ID for the given email.
   - Uses the user ID to call a tool on the payment server to fetch transactions.
3. **Response:** The AI combines the results and presents a clear answer to the user.

This pattern can be extended to any number of services, enabling rich, cross-system intelligence.

## Running the Demo

1. Start the user server:
   ```sh
   pnpm run example:user:05
   ```
2. Start the payment server:
   ```sh
   pnpm run example:payment:05
   ```
3. Run the client:
   ```sh
   pnpm run example:client:05
   ```

## Example Query

> What are the recent transactions for bob@example.com?

**Expected Output:**

- Coffee: £50 on 16 January 2023
- Groceries: £100 on 15 January 2023
- Dinner: £75 on 14 January 2023
- Online Course: £120 on 12 January 2023

## Key Points & Best Practices

- **Minimal Tooling:** Each server exposes only the tools it needs—no unnecessary complexity.
- **Loose Coupling:** Servers remain independent, making the system easier to maintain and scale.
- **Extensibility:** This pattern can be expanded to more complex, real-world architectures involving many services.
- **Security:** Ensure that only authorised requests can access sensitive data across servers.
- **Clear Documentation:** Document the flow of data and dependencies between services for future maintainers.

## Troubleshooting & Tips

- If a query fails, check that each server is running and accessible.
- Ensure that tool names and parameters are consistent across services.
- For more advanced scenarios, consider adding error handling and retries for network issues.

## Further Reading

- [Model Context Protocol Documentation](https://modelcontextprotocol.org/)
- [Designing Distributed AI Systems](https://yourcompany.com/blog/distributed-ai)

---

By orchestrating multiple servers with MCP, you can build AI assistants that are not only knowledgeable, but also capable of real-world action across your entire digital ecosystem.
