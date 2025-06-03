#!/usr/bin/env node

import { experimental_createMCPClient as createMCPClient } from 'ai';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp';

// TypeScript interfaces for MCP prompts
interface MCPPrompt {
  name: string;
  description?: string;
  arguments?: unknown;
}

/**
 * Prompts Mastery Example Client
 *
 * Demonstrates focused interaction with MCP prompts without the distraction
 * of tools and resources. Perfect for learning core prompt template concepts.
 */

async function runPromptsMaxtery() {
  console.log('📝 Starting MCP Prompts Mastery Demo...\n');

  try {
    // Connect to the prompts mastery server
    const mcpClient = await createMCPClient({
      transport: new StreamableHTTPClientTransport(
        new URL('http://localhost:8089/stream'),
      ),
    });

    console.log('📡 Connected to prompts mastery server');

    // Get available prompts
    try {
      const prompts = await (
        mcpClient as unknown as {
          listPrompts(): Promise<{ prompts?: MCPPrompt[] }>;
        }
      ).listPrompts();
      console.log(
        `📝 Available prompts: ${Array.isArray(prompts?.prompts) ? prompts.prompts.map((p: MCPPrompt) => p.name).join(', ') : 'none'}\n`,
      );
    } catch (error) {
      console.log(
        `📝 Available prompts: Unable to list (${error instanceof Error ? error.message : 'Unknown error'})\n`,
      );
    }

    // Demo 1: Understanding Prompt Fundamentals
    console.log('🎯 Demo 1: Understanding Prompt Fundamentals');
    console.log('='.repeat(50));

    console.log('📝 What Are MCP Prompts?');
    console.log(
      '   Prompts are TEMPLATE generators that create customized AI instructions.',
    );
    console.log('   Key characteristics:');
    console.log('   • Accept arguments to customize output');
    console.log('   • Generate dynamic content based on parameters');
    console.log('   • Support conditional logic and complex constructions');
    console.log('   • Enable consistent AI interactions across applications');
    console.log('   • Provide reusable patterns for common scenarios\n');

    // Demo 2: Prompt Template Patterns
    console.log('🎯 Demo 2: Prompt Template Patterns');
    console.log('='.repeat(50));

    console.log('🔧 Template Construction Approaches:');
    console.log('   This server demonstrates various template patterns:');
    console.log('   • Simple variable substitution (greeting prompt)');
    console.log('   • Conditional logic branches (code_review prompt)');
    console.log('   • Multi-role conversation setup (team_discussion prompt)');
    console.log('   • Educational level adaptation (explain_concept prompt)');
    console.log('   • Style and constraint handling (creative_writing prompt)');
    console.log('   • Methodology-driven construction (data_analysis prompt)');
    console.log('   • Framework-based approaches (problem_solving prompt)');
    console.log(
      '   • Context-aware continuation (conversation_context prompt)\n',
    );

    console.log('   Template Design Best Practices:');
    console.log('   • Use descriptive argument names and descriptions');
    console.log(
      '   • Implement proper conditional logic for optional parameters',
    );
    console.log('   • Provide clear, structured instructions');
    console.log('   • Include role context and specific objectives');
    console.log('   • Handle edge cases and missing arguments gracefully\n');

    // Demo 3: Argument Patterns and Validation
    console.log('🎯 Demo 3: Argument Patterns and Validation');
    console.log('='.repeat(50));

    console.log('📋 Argument Design Patterns:');
    console.log('   Required Arguments:');
    console.log('   • Core content (concept, problem, topic)');
    console.log('   • Context specification (language, subject, domain)');
    console.log('   • Primary directives (genre, analysis_type)\n');

    console.log('   Optional Arguments:');
    console.log('   • Style modifiers (experience_level, tone, style)');
    console.log(
      '   • Constraint parameters (focus_areas, constraints, methodology)',
    );
    console.log('   • Enhancement flags (examples, context, tools)\n');

    console.log('   Argument Processing Techniques:');
    console.log('   • String parsing and splitting (focus_areas → array)');
    console.log('   • Conditional branching (experience_level → instructions)');
    console.log('   • Default value handling (level || "college")');
    console.log('   • Type coercion (examples === "true")');
    console.log(
      '   • Lookup table mapping (roleDescriptions, levelGuidance)\n',
    );

    // Demo 4: Dynamic Content Generation
    console.log('🎯 Demo 4: Dynamic Content Generation');
    console.log('='.repeat(50));

    console.log('🎨 Content Generation Strategies:');
    console.log('   Static Templates:');
    console.log('   • Fixed structure with variable insertion');
    console.log('   • Consistent formatting and organization');
    console.log('   • Reliable output patterns\n');

    console.log('   Dynamic Templates:');
    console.log('   • Conditional content inclusion based on parameters');
    console.log('   • Variable instruction sets (beginner vs advanced)');
    console.log('   • Adaptive role assignments (team_discussion)');
    console.log('   • Context-aware modifications (conversation_context)\n');

    console.log('   Generation Benefits:');
    console.log('   • Customized instructions for specific scenarios');
    console.log('   • Consistent quality across different contexts');
    console.log('   • Reusable patterns for common use cases');
    console.log('   • Scalable prompt management and maintenance\n');

    // Demo 5: Conditional Logic and Branching
    console.log('🎯 Demo 5: Conditional Logic and Branching');
    console.log('='.repeat(50));

    console.log('🔀 Conditional Patterns:');
    console.log('   Simple Conditionals:');
    console.log('   • Presence checks (if focus_areas exists)');
    console.log('   • Value-based branching (experience_level === "beginner")');
    console.log('   • Default fallbacks (level || "college")\n');

    console.log('   Complex Logic:');
    console.log('   • Multi-condition evaluations');
    console.log('   • Nested conditional structures');
    console.log('   • Lookup table implementations');
    console.log('   • Switch-like constructions\n');

    console.log('   Best Practices:');
    console.log('   • Always provide default values for optional parameters');
    console.log('   • Use meaningful conditional expressions');
    console.log('   • Handle edge cases and unexpected values');
    console.log('   • Maintain readability with clear logic flow\n');

    // Demo 6: Role-Based and Multi-Perspective Prompts
    console.log('🎯 Demo 6: Role-Based and Multi-Perspective Prompts');
    console.log('='.repeat(50));

    console.log('🎭 Role Pattern Applications:');
    console.log('   Single Role Prompts:');
    console.log('   • Expert positioning (code reviewer, data analyst)');
    console.log('   • Skill specialization (creative writer, educator)');
    console.log('   • Authority establishment (problem solver)\n');

    console.log('   Multi-Role Prompts:');
    console.log('   • Team simulation (developer, designer, PM, QA)');
    console.log(
      '   • Perspective diversity (different viewpoints on same topic)',
    );
    console.log('   • Collaborative problem-solving approaches\n');

    console.log('   Role Implementation Strategies:');
    console.log('   • Role description mapping (roleDescriptions object)');
    console.log('   • Dynamic role assignment based on input');
    console.log('   • Role-specific instruction customization');
    console.log('   • Interaction orchestration between roles\n');

    // Demo 7: Educational and Adaptive Prompts
    console.log('🎯 Demo 7: Educational and Adaptive Prompts');
    console.log('='.repeat(50));

    console.log('🎓 Adaptive Prompt Patterns:');
    console.log('   Level-Based Adaptation:');
    console.log(
      '   • Language complexity adjustment (elementary → professional)',
    );
    console.log(
      '   • Content depth modification (basic concepts → implementation)',
    );
    console.log('   • Example inclusion based on learning needs\n');

    console.log('   Context-Aware Adaptation:');
    console.log('   • Domain-specific terminology and approaches');
    console.log('   • Tool and methodology preferences');
    console.log('   • Business context integration\n');

    console.log('   Adaptive Benefits:');
    console.log('   • Personalized AI interactions');
    console.log('   • Appropriate complexity for audience');
    console.log('   • Improved learning outcomes');
    console.log('   • Scalable educational content\n');

    // Demo 8: Prompt vs Tools vs Resources
    console.log('🎯 Demo 8: Prompt vs Tools vs Resources');
    console.log('='.repeat(50));

    console.log('🔍 MCP Component Comparison:');
    console.log('   Prompts (This Example):');
    console.log('   • TEMPLATE generators for AI instructions');
    console.log('   • Parameterized content creation');
    console.log('   • Dynamic instruction customization');
    console.log('   • Context-aware prompt construction');
    console.log(
      '   • Generate instructions for AI models that then execute and interact with data; they do not directly execute or serve data themselves.\n',
    );

    console.log('   Tools (see 01a-tools-only):');
    console.log('   • EXECUTABLE functions with parameters');
    console.log('   • Action-oriented operations');
    console.log('   • State modification capabilities');
    console.log('   • Return computed results or content');
    console.log('   • Interactive and stateful operations\n');

    console.log('   Resources (see 01b-resources-deep-dive):');
    console.log('   • READ-ONLY data sources');
    console.log('   • Static or dynamic content serving');
    console.log('   • URI-based resource identification');
    console.log('   • MIME type specification');
    console.log('   • No parameters or customization\n');

    console.log('✨ Prompts mastery demo overview completed!');
    console.log('\n🎓 Key Prompt Concepts Learned:');
    console.log(
      '• Prompts are template generators that create customized AI instructions',
    );
    console.log('• Arguments enable dynamic content and conditional logic');
    console.log(
      '• Role-based prompts provide specialized and multi-perspective interactions',
    );
    console.log(
      '• Adaptive prompts adjust complexity and style based on context',
    );
    console.log(
      '• Template patterns enable reusable and scalable AI interactions',
    );
    console.log(
      '• Prompts complement tools and resources in the MCP ecosystem',
    );

    console.log('\n🚀 To interact with these prompts:');
    console.log('1. Start the server: npm run example:01c:server');
    console.log('2. Use prompts through MCP clients or AI model integrations');
    console.log(
      '3. Study the server.ts code to understand template implementation patterns',
    );

    console.log('\n🔬 Next Steps in Learning Path:');
    console.log(
      '• Move to comprehensive examples (02-07) for combined MCP concepts',
    );
    console.log(
      '• Integrate prompts with tools and resources for full applications',
    );
    console.log(
      '• Build custom prompt libraries for your specific AI workflows',
    );
  } catch (error) {
    console.error('❌ Demo connection failed:', error);
    console.log('\n💡 Make sure the prompts mastery server is running:');
    console.log('   npm run example:01c:server');
    console.log(
      '\n📚 This demo showcases prompt patterns even without live connection.',
    );
  }
}

// Prompt Learning Exercises
function printPromptExercises() {
  console.log('\n📋 Recommended Prompt Exercises:');

  console.log('\n1. **Template Construction Practice**:');
  console.log('   • Design prompts for different AI interaction scenarios');
  console.log('   • Practice argument design and validation');
  console.log('   • Experiment with conditional logic patterns');

  console.log('\n2. **Role-Based Prompt Design**:');
  console.log('   • Create prompts for different expert roles');
  console.log('   • Design multi-perspective discussion templates');
  console.log('   • Practice role description and interaction patterns');

  console.log('\n3. **Adaptive Content Generation**:');
  console.log('   • Build prompts that adapt to user experience levels');
  console.log('   • Create domain-specific instruction variations');
  console.log('   • Implement context-aware content customization');

  console.log('\n4. **Conditional Logic Mastery**:');
  console.log('   • Practice complex conditional branching');
  console.log('   • Implement lookup table patterns');
  console.log('   • Handle edge cases and default value scenarios');

  console.log('\n5. **Real-World Prompt Libraries**:');
  console.log('   • Create prompt collections for your application domain');
  console.log('   • Build reusable template patterns');
  console.log('   • Implement consistent argument naming conventions');

  console.log('\n🔍 Understanding Prompt Components:');
  console.log('• Name: Unique identifier for the prompt template');
  console.log('• Description: Purpose and usage explanation');
  console.log('• Arguments: Input parameters with types and requirements');
  console.log(
    '• Load Function: Template generation logic and content creation',
  );
  console.log('• Conditional Logic: Dynamic content based on parameter values');
}

// Run the demo
runPromptsMaxtery().then(() => {
  printPromptExercises();
});
