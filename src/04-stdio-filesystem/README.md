# MCP Demo: Stdio & Filesystem Tools

## Introduction

What if your AI assistant could interact with your computer—reading files, writing data, or even asking you questions via the console? The Model Context Protocol (MCP) makes this possible by exposing standard input/output (stdio) and filesystem operations as tools the AI can use. This demo shows how to safely and effectively empower your AI with these capabilities, while keeping security and control firmly in your hands.

## Why Give AI Access to Stdio and Files?

By allowing the AI to interact with files and the console, you unlock a world of practical applications:

- Automate repetitive file tasks (reading, writing, organising)
- Build interactive scripts that ask users for input
- Enable the AI to process or generate reports, logs, or data files

However, with great power comes great responsibility—so security and careful design are paramount.

## How It Works: Step by Step

1. **Tool Definition:** Define tools for specific stdio and filesystem operations (e.g., `readFile`, `writeFile`, `listDirectory`, `getUserInput`). Each tool should have clear parameters and outputs.
2. **User Request or AI Decision:** The user asks the AI to perform an action (e.g., "Show me all files in Documents"), or the AI decides it needs to read or write data.
3. **Tool Invocation:** The AI selects and calls the appropriate tool with the necessary arguments.
4. **MCP Execution:** The MCP framework executes the tool, interacting with the underlying operating system.
5. **Result or Feedback:**
   - For read operations, the tool returns data to the AI, which can use or present it.
   - For write operations, the tool returns a success/failure status, and the AI can inform the user.

## Running the Demo

To try out this demo:

1. Start the server:
   ```sh
   pnpm example:server:04
   ```
2. In a separate terminal, after a few seconds, run the client:
   ```sh
   pnpm example:client:04
   ```

Try various filesystem and stdio operations as described above.

## Key MCP Features Demonstrated

- **Bridging to OS Capabilities:** MCP tools can act as a bridge between the AI and your computer's capabilities.
- **Action-Oriented Tools:** Demonstrates tools that perform real actions, not just return data.
- **Structured Access:** Provides a controlled way for AI to interact with complex environments like the filesystem.

## Best Practices & Security Guidance

- **Strict Permissions:** Only allow the AI access to specific directories or files. Never grant unrestricted access.
- **Input Sanitisation:** Always validate and sanitise file paths and user input to prevent security risks (e.g., path traversal).
- **User Confirmation:** For potentially destructive actions (like deleting files), require explicit user approval.
- **Error Handling:** Handle errors (file not found, permission denied, etc.) gracefully and informatively.
- **Resource Limits:** Impose limits on file sizes, number of files, or stdio interactions to prevent abuse or accidental overload.
- **Sandboxing:** Where possible, run AI operations in a sandboxed environment to contain any risks.

## Troubleshooting & Tips

- If a tool fails, check permissions and input validation first.
- For interactive scripts, ensure the AI clearly communicates what input it needs from the user.
- Always log actions taken by the AI for auditability and debugging.

## Further Reading

- [Model Context Protocol Documentation](https://modelcontextprotocol.org/)
- [Securing AI File Access](https://yourcompany.com/blog/ai-filesystem-security)

---

Giving your AI access to stdio and the filesystem opens up powerful new possibilities—but only if done with care. This demo shows how to balance capability with safety, so your AI can be both useful and trustworthy.
