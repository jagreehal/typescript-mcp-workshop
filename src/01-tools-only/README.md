# MCP Demo: Tools-Only Mode

## Introduction

The Model Context Protocol (MCP) is transforming how artificial intelligence (AI) assistants interact with the world. But what does it _really_ mean for an AI to use "tools"? This demo is your hands-on guide to the "tools-only" mode of MCP—a scenario where the AI doesn't just chat, but takes real, concrete actions by invoking predefined tools. Whether you're building a calculator, a database interface, or a workflow orchestrator, this demo shows you how to make your AI assistant reliably execute actions, not just generate text.

This approach is ideal when you want:

- **Predictable, structured outcomes** (no surprises from generative text)
- **Direct integration with external systems** (APIs, databases, services)
- **Deterministic behaviour** (the AI can only do what the tools allow)

## Why Tools-Only?

Imagine asking an AI to "add 2 and 2". In tools-only mode, the AI doesn't just reply "4"—it actually calls a calculator tool, ensuring the answer is always correct and traceable. This is invaluable for applications where accuracy, auditability, and integration matter.

## How It Works: Step by Step

1. **User Request:** The user sends a request to the MCP-enabled application (e.g., "What is 7 times 8?").
2. **AI Analysis:** The AI assistant analyses the request and determines which tool(s) can fulfil it.
3. **Tool Selection:** The AI selects the appropriate tool (e.g., a calculator) and provides the necessary parameters.
4. **Tool Execution:** The MCP framework executes the tool.
5. **Result Handling:** The tool returns its result (e.g., 56), which is presented directly to the user. No extra generative text is added by the AI in this mode.

## Running the Demo

To try out this demo:

1. Start the server:
   ```sh
   pnpm example:server:01
   ```
2. In a separate terminal, after a few seconds, run the client:
   ```sh
   pnpm example:client:01
   ```

You should see the client output showing the available calculator tools and their results.

## Key MCP Features Demonstrated

- **Tool Definition:** How to define tools and make them available to the assistant.
- **Tool Invocation:** How the AI (or MCP system) calls a tool.
- **Result Handling:** How tool outputs are processed and returned.
- **Constrained Responses:** The AI's output is strictly limited to tool results—no free-form text.

## Best Practices & Guidance

- **Clear Tool Design:** Give each tool a clear name, description, and well-defined input/output. This helps both the AI and developers understand when and how to use them.
- **Keep Tools Focused:** Prefer small, focused tools (e.g., `add`, `multiply`) over large, catch-all ones. This makes the system more flexible and easier to maintain.
- **Robust Error Handling:** Ensure your tools handle errors gracefully (e.g., invalid input) and that the MCP framework communicates these clearly to the user.
- **User Feedback:** Even in tools-only mode, provide clear feedback about what actions were taken (e.g., which tool was called).

## Troubleshooting & Tips

- If the AI doesn't seem to use a tool, check that the tool is correctly registered and described.
- For more complex scenarios, consider combining tools or adding orchestration logic.
- Tools-only mode is perfect for compliance-sensitive or safety-critical applications, as it prevents the AI from "going off script".

## Further Reading

- [Model Context Protocol Documentation](https://modelcontextprotocol.org/)
- [MCP Blog Series](https://yourcompany.com/blog/mcp)

---

This demo provides a solid foundation for building AI assistants that act with precision and reliability. By constraining the AI to tools, you gain control, safety, and the ability to integrate with the real world—without sacrificing the power of conversational interfaces.
