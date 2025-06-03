# MCP Demo: Tools Only

This demo showcases the basic "tools-only" capability of the Model Context Protocol (MCP).

## Overview

In an MCP interaction, an AI assistant can be equipped with a set of tools that it can invoke to perform actions or gather information. This "tools-only" demo illustrates a scenario where the assistant relies solely on these predefined tools to respond to a user's request, without generating free-form text responses itself.

This approach is particularly useful for:

- **Structured Interactions:** When you need the AI to perform specific, predictable actions.
- **Deterministic Outputs:** Ensuring that the AI's response is constrained to the outputs of the tools.
- **Integrating with External Systems:** Allowing the AI to interact with APIs, databases, or other services through dedicated tools.

## How it Works

1.  **User Request:** The user sends a request to the MCP-enabled application.
2.  **Assistant Analysis:** The AI assistant (or the orchestrating logic) determines that the request can be fulfilled by invoking one or more available tools.
3.  **Tool Invocation:** The assistant selects the appropriate tool(s) and provides the necessary parameters.
4.  **Tool Execution:** The MCP framework executes the chosen tool(s).
5.  **Tool Output:** The tool(s) return their results.
6.  **Response to User:** The application presents the tool output(s) directly to the user as the response. No additional generative text is added by the assistant in this specific mode.

## Running the Demo

_(TODO: Add specific commands to run this demo. This might involve a CLI command or steps to trigger the interaction, e.g., `npm run demo:tools-only` or similar. Refer to `package.json` or project scripts.)_

Upon running the demo, you should observe how a user query is processed and how the system responds by only presenting the output of an invoked tool.

## Key MCP Features Demonstrated

- **Tool Definition:** How tools are defined and made available to the assistant.
- **Tool Invocation:** The mechanism by which an assistant (or the MCP system) calls a tool.
- **Tool Output Handling:** How the results from tool execution are processed and returned.
- **Constrained Response:** Illustrates an interaction where the AI's output is strictly limited to tool results.

## Best Practices

- **Clear Tool Definitions:** Ensure each tool has a clear name, description, and well-defined input/output parameters. This helps the assistant (and developers) understand when and how to use them.
- **Granular Tools:** Prefer smaller, focused tools over large, monolithic ones. This provides more flexibility for the assistant.
- **Error Handling:** Implement robust error handling within your tools and in the MCP framework to manage situations where tools fail or return unexpected results.
- **User Feedback:** Even in a tools-only mode, provide clear feedback to the user about what actions were taken (i.e., which tools were called).

This demo provides a foundational understanding of how tools form a core part of the Model Context Protocol, enabling AI assistants to perform concrete actions and interact with the world beyond simple text generation.
