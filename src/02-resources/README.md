# MCP Demo: Resources

## Introduction

Context is everything when it comes to intelligent assistants. The Model Context Protocol (MCP) allows you to provide AI with "resources"—structured pieces of information that help it make better decisions and give more relevant answers. This demo explores how to make contextual data available to your AI, so it can be more helpful, accurate, and aware of its environment.

Resources are not actions or tools—they are facts, data, or snippets of knowledge the AI can reference. Think of them as the assistant's memory or reference library.

## Why Use Resources?

Imagine an AI that knows your name, your preferences, or the current state of your application. By providing resources, you enable the AI to:

- Personalise its responses
- Reference up-to-date information
- Avoid asking unnecessary questions
- Make more informed decisions

## How It Works: Step by Step

1. **Resource Definition:** Define resources with clear names and data structures (e.g., user profile, app settings, knowledge base entries).
2. **Provisioning:** The MCP application makes these resources available—either by fetching from a database, an API, or providing static content.
3. **AI Access:**
   - _Implicit_: The resource is automatically included in the AI's context.
   - _Explicit_: The AI is told about available resources and can request or reference them as needed.
4. **Contextual Enhancement:** The AI uses the resource to generate more relevant, accurate, or personalised responses.

## Running the Demo

To try out this demo:

1. Start the server:
   ```sh
   pnpm example:server:02
   ```
2. In a separate terminal, after a few seconds, run the client:
   ```sh
   pnpm example:client:02
   ```

You should see how resources are made available and used by the AI.

## Key MCP Features Demonstrated

- **Resource Concept:** What counts as a resource in MCP.
- **Provisioning:** How to provide contextual data to the AI.
- **Contextual Influence:** How resources shape the AI's responses, even without direct tool invocation.

## Best Practices & Guidance

- **Relevance:** Only provide resources that are directly useful for the tasks at hand.
- **Conciseness:** Keep resources as brief as possible to avoid overwhelming the AI or exceeding context limits.
- **Freshness:** Ensure dynamic resources (like real-time data) are kept up to date.
- **Clarity:** Use clear names and descriptions so the AI (and developers) know what each resource is for.

## Troubleshooting & Tips

- If the AI seems unaware of a resource, check that it is correctly defined and included in the context.
- For sensitive data, ensure resources are only provided to authorised users or sessions.
- Use resources to reduce repetitive questions—e.g., provide user preferences up front.

## Further Reading

- [Model Context Protocol Documentation](https://modelcontextprotocol.org/)
- [Contextual AI Design](https://yourcompany.com/blog/contextual-ai)

---

By making resources available to your AI, you empower it to act with greater intelligence and relevance. This demo shows how a little context can go a long way in building smarter, more helpful assistants.
