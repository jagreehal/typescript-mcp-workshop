# MCP Demo: Stdio & Filesystem Tools

This demo showcases how Model Context Protocol (MCP) can be used to provide an AI assistant with tools to interact with standard input/output (stdio) and the filesystem.

## Overview

Empowering AI assistants with the ability to read from and write to stdio (like the console) and interact with files and directories on a filesystem greatly expands their utility. This demo illustrates:

- **Filesystem Tools:** Defining tools for actions like listing directory contents (`ls`), reading files (`cat`), writing to files, creating directories (`mkdir`), etc.
- **Stdio Tools:** Defining tools for reading user input from stdin or printing output to stdout/stderr.
- **Safe Interaction:** Considerations for security and safety when granting AI access to these powerful capabilities.

## How it Works

1.  **Tool Definition:** Tools are defined for specific stdio and filesystem operations. Each tool has a clear purpose, parameters (e.g., file path, directory name, content to write), and expected output format.
    - Example Filesystem Tool: `readFile(path: string) -> string`
    - Example Stdio Tool: `getUserInput(prompt: string) -> string`
2.  **User Request/AI Decision:** A user might ask the AI to list files in a directory, read a specific file, or save some generated text.
3.  **Tool Invocation:** The AI assistant, based on the prompt, selects the appropriate stdio or filesystem tool and invokes it with the necessary arguments.
4.  **MCP Execution:** The MCP framework executes the tool, interacting with the underlying operating system's stdio streams or filesystem APIs.
5.  **Result/Feedback:**
    - For read operations (e.g., `ls`, `cat`, `getUserInput`), the tool returns the data to the AI, which can then present it to the user or use it in further processing.
    - For write operations (e.g., writing to a file, `mkdir`), the tool typically returns a success/failure status.

## Running the Demo

To run this demo:

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

- **Bridging to OS Capabilities:** How MCP tools can act as a bridge between the AI and system-level functionalities.
- **Action-Oriented Tools:** Demonstrates tools that perform tangible actions rather than just returning data.
- **Structured Access to Unstructured Environments:** Providing a controlled way for AI to interact with potentially complex environments like a filesystem.

## Best Practices & Security Considerations

- **Permissions and Sandboxing:** This is CRITICAL. Granting an AI direct, unrestricted filesystem or stdio access is a major security risk. Implement strict permission controls:
  - Limit the directories the AI can access.
  - Restrict the types of files it can read/write.
  - Sanitize all inputs (like paths) to prevent injection attacks (e.g., path traversal).
  - Consider running AI operations in a sandboxed environment.
- **Clear Tool Scopes:** Define tools with very specific actions (e.g., `readFile` is better than a generic `filesystemAccess` tool).
- **User Confirmation:** For potentially destructive actions (e.g., deleting files, overwriting content), always seek explicit user confirmation before the AI executes the tool.
- **Error Handling:** Robustly handle errors like file not found, permission denied, disk full, etc., and provide clear feedback.
- **Resource Limits:** Implement limits on file sizes, number of files to be read, or amount of stdio interaction to prevent abuse or accidental resource exhaustion.

This demo provides insight into extending an AI's capabilities to interact with its operating environment, but underscores the paramount importance of security and controlled access when doing so.
