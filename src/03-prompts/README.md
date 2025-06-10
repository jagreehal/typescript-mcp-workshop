# MCP Demo: Prompts

## Introduction

At the heart of every AI conversation is the prompt—the message that tells the assistant what you want. In the Model Context Protocol (MCP), prompts are more than just questions; they're carefully structured inputs that guide the AI's behaviour, context, and responses. This demo explores how prompts work in MCP, how to craft them effectively, and why good prompting is essential for getting the best from your AI assistant.

## Why Prompts Matter

A well-crafted prompt can mean the difference between a helpful answer and a confusing one. Prompts set the stage for the AI, providing not just the user's question, but also instructions, examples, and context. In MCP, prompts can include:

- System messages (instructions for the AI)
- User queries
- Example conversations (few-shot learning)
- Information about available tools and resources

## How It Works: Step by Step

1. **User Input or System Design:** The user provides a query, or the system constructs a prompt using user input and other context (like available tools or resources).
2. **Prompt Formulation:** The input is formatted into a structured prompt, which may include:
   - _System Message_: Instructions about the AI's role or constraints
   - _User Message_: The actual question or command
   - _Assistant Messages_: Example responses to guide the AI
   - _Tool/Resource Info_: Descriptions of what's available to the AI
3. **Sending to AI:** The complete prompt is sent to the language model via MCP.
4. **AI Processing:** The AI interprets the prompt, considering all context provided.
5. **Response Generation:** The AI generates a response—this could be a direct answer, a decision to call a tool, or a combination.

## Running the Demo

To try out this demo:

1. Start the server:
   ```sh
   pnpm example:server:03
   ```
2. In a separate terminal, after a few seconds, run the client:
   ```sh
   pnpm example:client:03
   ```

Observe how different prompts affect the AI's responses.

## Key MCP Features Demonstrated

- **User Intent Capture:** How prompts convey what the user wants.
- **Prompt Engineering:** The structure and content of a prompt can dramatically affect the AI's output.
- **Integration with Tools/Resources:** Prompts operate in an environment where tools and resources exist and can be referenced or triggered.

## Best Practices for Prompting

- **Be Clear and Specific:** The more precise your instructions, the better the AI's response.
- **Provide Context:** If the answer depends on certain facts, include them in the prompt.
- **Define Roles:** Use system messages to set the AI's persona or rules.
- **Use Examples:** For complex tasks, show the AI what a good answer looks like.
- **Iterate and Refine:** Prompting is often an iterative process—experiment and adjust for best results.

## Troubleshooting & Tips

- If the AI's answers are off-topic, check if the prompt is missing key context or instructions.
- For multi-step tasks, break down the prompt or provide step-by-step examples.
- Use prompts to guide the AI towards using tools or resources when appropriate.

## Further Reading

- [Model Context Protocol Documentation](https://modelcontextprotocol.org/)
- [Prompt Engineering Guide](https://yourcompany.com/blog/prompt-engineering)

---

Mastering prompts is the key to unlocking the full potential of your AI assistant. This demo shows how thoughtful prompt design leads to more accurate, relevant, and useful AI interactions.
