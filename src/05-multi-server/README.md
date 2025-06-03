# MCP Demo: Multi-Server Orchestration

This demo illustrates how the Model Context Protocol (MCP) can facilitate interactions involving multiple, specialized AI or tool servers.

## Overview

In this simplified example, the system is composed of two servers:

- **User Server:** Provides a single tool, `getUserIdByEmail`, which returns the user ID for a given email address.
- **Payment Server:** Provides a single tool, `getTransactionsByEmail`, which returns all transactions for a user, given their email address.

This setup demonstrates how an LLM or orchestrator can answer questions about user transactions using only an email address, without requiring step-by-step instructions or manual tool chaining.

## How it Works

1. **User Query:** The user asks a question such as "What are the recent transactions for bob@example.com?"
2. **LLM/Orchestrator:**
   - Calls `getTransactionsByEmail` on the payment server with the provided email.
   - The payment server internally resolves the user ID and returns the user's transactions.
3. **Response:** The orchestrator or LLM summarizes and presents the results to the user.

## Running the Demo

1. Start the user server:
   ```bash
   pnpm run example:user:05
   ```
2. Start the payment server:
   ```bash
   pnpm run example:payment:05
   ```
3. Run the client:
   ```bash
   pnpm run example:client:05
   ```

## Example Query

> What are the recent transactions for bob@example.com?

**Expected Output:**

- Coffee: $50 on January 16, 2023
- Groceries: $100 on January 15, 2023
- Dinner: $75 on January 14, 2023
- Online Course: $120 on January 12, 2023

## Key Points

- The demo now uses only the minimal required tools for multi-server orchestration.
- The LLM can answer user questions using only an email address, with no manual tool chaining required.
- This pattern is extensible to more complex, real-world multi-service architectures.
