#!/usr/bin/env node

import { FastMCP } from 'fastmcp';

/**
 * Prompts Mastery Example Server
 *
 * This focused example demonstrates ONLY MCP prompt patterns:
 * - Basic prompt templates and variables
 * - Dynamic prompt generation
 * - Conditional prompt construction
 * - Multi-role conversation templates
 * - Context-aware prompt building
 * - AI model integration patterns
 */

const server = new FastMCP({
  name: 'prompts-mastery-server',
  version: '1.0.0',
  instructions: `
This server focuses exclusively on MCP prompt patterns.

Learn fundamental prompt concepts:
- Template creation and variable substitution
- Dynamic prompt generation and customization
- Conditional logic in prompt construction
- Multi-role conversation templates
- Context-aware prompt building
- AI model integration and optimization

Complete your MCP mastery after tools and resources.
  `.trim(),
});

// Example 1: Basic prompt template with simple variables
server.addPrompt({
  name: 'greeting',
  description: 'Generate personalized greeting messages',
  arguments: [
    {
      name: 'name',
      description: "The person's name to greet",
      required: true,
    },
    {
      name: 'time_of_day',
      description: 'Time of day (morning, afternoon, evening)',
      required: false,
    },
  ],
  load: async (args) => {
    const { name, time_of_day } = args;
    const timeGreeting = time_of_day ? `Good ${time_of_day}` : 'Hello';

    return `${timeGreeting}, ${name}! How are you doing today?`;
  },
});

// Example 2: Complex prompt with conditional logic and multiple arguments
server.addPrompt({
  name: 'code_review',
  description: 'Generate comprehensive code review prompts',
  arguments: [
    {
      name: 'language',
      description:
        'Programming language (javascript, python, typescript, etc.)',
      required: true,
    },
    {
      name: 'code',
      description: 'The code to review',
      required: true,
    },
    {
      name: 'focus_areas',
      description:
        'Specific areas to focus on (security, performance, readability, etc.)',
      required: false,
    },
    {
      name: 'experience_level',
      description:
        'Developer experience level (beginner, intermediate, advanced)',
      required: false,
    },
  ],
  load: async (args) => {
    const { language, code, focus_areas, experience_level } = args;

    // Build dynamic instructions based on parameters
    let instructions = `Please review this ${language} code for quality, best practices, and potential improvements.`;

    if (focus_areas) {
      const areas = focus_areas.split(',').map((area: string) => area.trim());
      instructions += `\n\nPay special attention to: ${areas.join(', ')}.`;
    }

    if (experience_level) {
      switch (experience_level.toLowerCase()) {
        case 'beginner':
          instructions +=
            '\n\nProvide detailed explanations and educational context for suggestions.';
          break;
        case 'advanced':
          instructions +=
            '\n\nFocus on advanced optimizations and architectural considerations.';
          break;
        default:
          instructions +=
            '\n\nProvide clear, actionable feedback with examples.';
      }
    }

    instructions +=
      '\n\nStructure your review with:\n1. Overall assessment\n2. Specific issues and suggestions\n3. Positive aspects\n4. Recommendations for improvement';

    return `You are an expert ${language} developer and code reviewer. ${instructions}\n\nPlease review this ${language} code:\n\n\`\`\`${language}\n${code}\n\`\`\``;
  },
});

// Example 3: Multi-role conversation template
server.addPrompt({
  name: 'team_discussion',
  description: 'Simulate multi-perspective team discussions',
  arguments: [
    {
      name: 'topic',
      description: 'Discussion topic or problem to solve',
      required: true,
    },
    {
      name: 'roles',
      description:
        'Comma-separated list of team roles (developer, designer, pm, qa)',
      required: true,
    },
    {
      name: 'context',
      description: 'Additional context or constraints',
      required: false,
    },
  ],
  load: async (args) => {
    const { topic, roles, context } = args;
    const roleList = (roles || '')
      .split(',')
      .map((role: string) => role.trim())
      .filter((role) => role.length > 0);

    const roleDescriptions: Record<string, string> = {
      developer:
        'a senior software developer focused on technical implementation',
      designer:
        'a UX/UI designer concerned with user experience and interface design',
      pm: 'a product manager focused on business value and user needs',
      qa: 'a quality assurance engineer focused on testing and reliability',
      architect: 'a system architect focused on scalability and system design',
      security: 'a security specialist focused on security implications',
    };

    const systemPrompt = `You will simulate a team discussion about "${topic}".

Take turns speaking as each of these team members:
${roleList.map((role: string) => `- ${role.toUpperCase()}: ${roleDescriptions[role] || 'a team member with their perspective'}`).join('\n')}

Each team member should provide their unique perspective on the topic. Make the discussion realistic and constructive.
${context ? `\nAdditional context: ${context}` : ''}

Start the discussion and have each team member contribute their viewpoint.

Let's discuss: ${topic}

Please start the team discussion with each member sharing their initial thoughts.`;

    return systemPrompt;
  },
});

// Example 4: Educational content generation with learning levels
server.addPrompt({
  name: 'explain_concept',
  description: 'Generate educational explanations tailored to learning level',
  arguments: [
    {
      name: 'concept',
      description: 'The concept to explain',
      required: true,
    },
    {
      name: 'subject',
      description: 'Subject area (programming, math, science, etc.)',
      required: true,
    },
    {
      name: 'level',
      description:
        'Learning level (elementary, middle, high, college, professional)',
      required: true,
    },
    {
      name: 'examples',
      description: 'Include practical examples (true/false)',
      required: false,
    },
  ],
  load: async (args) => {
    const { concept, subject, level, examples } = args;

    // Explicit input validation example
    if (
      !level ||
      !['elementary', 'middle', 'high', 'college', 'professional'].includes(
        level.toLowerCase(),
      )
    ) {
      // You could throw an error, or default to a specific level
      console.warn(
        `Invalid or missing level: "${level}". Defaulting to college.`,
      );
      args.level = 'college'; // Correcting the level for subsequent logic
    }

    const levelGuidance: Record<string, string> = {
      elementary:
        'Use simple language, basic analogies, and avoid jargon. Focus on fundamental understanding.',
      middle:
        'Use clear explanations with some technical terms defined. Include relatable examples.',
      high: 'Use appropriate terminology with explanations. Include applications and connections.',
      college:
        'Use academic language and detailed explanations. Include theoretical foundations.',
      professional:
        'Use technical language and focus on practical applications and implications.',
    };

    const guidance = (level && levelGuidance[level]) || levelGuidance.college;
    const includeExamples = examples === 'true';

    const systemPrompt = `You are an expert educator in ${subject}. Explain concepts clearly and appropriately for the target audience.

Target Level: ${(level || 'college').toUpperCase()}
Guidance: ${guidance}
${includeExamples ? 'Include practical examples and applications.' : 'Focus on conceptual understanding.'}

Structure your explanation with:
1. Clear definition
2. Key components or aspects
3. Why it matters
${includeExamples ? '4. Practical examples' : ''}
${level === 'professional' ? '4. Implementation considerations' : ''}

Please explain "${concept}" in ${subject} for a ${level || 'college'}-level audience.`;

    return systemPrompt;
  },
});

// Example 5: Creative writing with style and constraints
server.addPrompt({
  name: 'creative_writing',
  description: 'Generate creative writing prompts with style specifications',
  arguments: [
    {
      name: 'genre',
      description: 'Writing genre (fantasy, sci-fi, mystery, romance, etc.)',
      required: true,
    },
    {
      name: 'style',
      description: 'Writing style (formal, casual, poetic, technical, etc.)',
      required: true,
    },
    {
      name: 'length',
      description: 'Target length (short, medium, long)',
      required: false,
    },
    {
      name: 'theme',
      description: 'Central theme or message',
      required: false,
    },
    {
      name: 'constraints',
      description: 'Special constraints or requirements',
      required: false,
    },
  ],
  load: async (args) => {
    const { genre, style, length, theme, constraints } = args;

    const lengthGuidance: Record<string, string> = {
      short: '500-800 words, focus on a single scene or moment',
      medium: '1000-1500 words, develop a complete short story arc',
      long: '2000+ words, allow for character development and complex plot',
    };

    const targetLength =
      lengthGuidance[length || 'medium'] || lengthGuidance.medium;

    let prompt = `You are a skilled creative writer specializing in ${genre}. Write in a ${style} style that engages readers and maintains consistent tone throughout.\n\nWrite a ${genre} piece in a ${style} style.`;

    if (theme) {
      prompt += `\n\nCentral theme: ${theme}`;
    }

    prompt += `\n\nLength guidance: ${targetLength}`;

    if (constraints) {
      prompt += `\n\nSpecial requirements: ${constraints}`;
    }

    prompt += `\n\nFocus on creating engaging characters, vivid descriptions, and ${genre === 'mystery' ? 'compelling plot twists' : genre === 'romance' ? 'emotional depth' : 'immersive world-building'}.`;

    return prompt;
  },
});

// Example 6: Data analysis prompt with customizable focus
server.addPrompt({
  name: 'data_analysis',
  description: 'Generate data analysis prompts with specific methodologies',
  arguments: [
    {
      name: 'data_type',
      description:
        'Type of data (sales, user behavior, performance metrics, etc.)',
      required: true,
    },
    {
      name: 'analysis_type',
      description:
        'Analysis type (descriptive, predictive, prescriptive, diagnostic)',
      required: true,
    },
    {
      name: 'tools',
      description: 'Preferred analysis tools (excel, python, r, sql, etc.)',
      required: false,
    },
    {
      name: 'business_context',
      description: 'Business context or objectives',
      required: false,
    },
  ],
  load: async (args) => {
    const { data_type, analysis_type, tools, business_context } = args;

    const analysisApproaches: Record<string, string> = {
      descriptive: 'Focus on summarizing historical data patterns and trends',
      predictive: 'Build models to forecast future outcomes and trends',
      prescriptive: 'Recommend actions based on data-driven insights',
      diagnostic:
        'Investigate root causes and explain why certain patterns occurred',
    };

    const approach =
      (analysis_type && analysisApproaches[analysis_type]) ||
      analysisApproaches.descriptive;

    const systemPrompt = `You are a data analyst specializing in ${data_type} analysis.

Analysis Type: ${(analysis_type || 'descriptive').toUpperCase()}
Approach: ${approach}
${tools ? `Preferred tools: ${tools}` : 'Use appropriate analytical methods'}
${business_context ? `Business context: ${business_context}` : ''}

Provide a structured analysis including:
1. Data understanding and exploration approach
2. Methodology and techniques
3. Key metrics and KPIs to examine
4. Expected insights and deliverables
5. Recommendations for action

Please provide a comprehensive ${analysis_type || 'descriptive'} analysis plan for ${data_type} data.`;

    return systemPrompt;
  },
});

// Example 7: Problem-solving framework with methodology
server.addPrompt({
  name: 'problem_solving',
  description: 'Generate structured problem-solving approaches',
  arguments: [
    {
      name: 'problem',
      description: 'The problem to solve',
      required: true,
    },
    {
      name: 'domain',
      description: 'Problem domain (technical, business, personal, etc.)',
      required: true,
    },
    {
      name: 'methodology',
      description:
        'Problem-solving methodology (scientific, design thinking, lean, etc.)',
      required: false,
    },
    {
      name: 'constraints',
      description: 'Known constraints or limitations',
      required: false,
    },
  ],
  load: async (args) => {
    const { problem, domain, methodology, constraints } = args;

    const methodologies: Record<string, string> = {
      scientific:
        'observation → hypothesis → experimentation → analysis → conclusion',
      'design thinking': 'empathize → define → ideate → prototype → test',
      lean: 'identify value → map value stream → create flow → establish pull → seek perfection',
      'root cause':
        'define problem → collect data → identify causes → develop solutions → implement',
    };

    const selectedMethod = methodology
      ? methodologies[methodology] || 'systematic analysis'
      : 'structured approach';

    const systemPrompt = `You are an expert problem solver in the ${domain} domain.

Problem: ${problem}
${methodology ? `Methodology: ${methodology} (${selectedMethod})` : 'Use a systematic approach'}
${constraints ? `Constraints: ${constraints}` : ''}

Structure your problem-solving approach with:
1. Problem definition and scope
2. Root cause analysis
3. Solution generation and evaluation
4. Implementation planning
5. Success metrics and validation

Be thorough, practical, and consider multiple perspectives.

Help me solve this ${domain} problem: ${problem}`;

    return systemPrompt;
  },
});

// Example 8: Context-aware conversation continuation
server.addPrompt({
  name: 'conversation_context',
  description: 'Continue conversations with context awareness',
  arguments: [
    {
      name: 'conversation_history',
      description: 'Previous conversation messages',
      required: true,
    },
    {
      name: 'user_intent',
      description: 'What the user is trying to achieve',
      required: false,
    },
    {
      name: 'tone',
      description:
        'Desired conversation tone (professional, friendly, formal, etc.)',
      required: false,
    },
    {
      name: 'knowledge_base',
      description: 'Relevant background knowledge or context',
      required: false,
    },
  ],
  load: async (args) => {
    const { conversation_history, user_intent, tone, knowledge_base } = args;

    const toneGuidance: Record<string, string> = {
      professional:
        'Maintain professional language and focus on business objectives',
      friendly: 'Use warm, conversational language while being helpful',
      formal: 'Use formal language and structured responses',
      casual:
        'Use relaxed, informal language appropriate for friendly discussion',
      technical: 'Use precise technical language and detailed explanations',
    };

    const selectedTone = tone
      ? toneGuidance[tone] || 'balanced and appropriate'
      : 'natural and appropriate';

    const systemPrompt = `You are continuing an ongoing conversation.

Conversation context: ${conversation_history}
${user_intent ? `User's goal: ${user_intent}` : ''}
${tone ? `Tone: ${selectedTone}` : 'Maintain natural conversation flow'}
${knowledge_base ? `Relevant context: ${knowledge_base}` : ''}

Guidelines:
1. Reference previous conversation points appropriately
2. Build on established context
3. Maintain consistency with previous responses
4. Progress toward the user's objectives
5. Ask clarifying questions when needed

Please continue our conversation based on the provided context.`;

    return systemPrompt;
  },
});

// Event handlers to demonstrate server lifecycle
server.on('connect', (event) => {
  console.log('📝 Client connected to prompts mastery server');
  console.log(`   Session: ${event.session}`);
});

server.on('disconnect', (event) => {
  console.log('❌ Client disconnected from prompts mastery server');
  console.log(`   Session: ${event.session}`);
});

// Start the server
const port = 8089;

server.start({
  transportType: 'httpStream',
  httpStream: { port },
});

console.log(`📝 Prompts Mastery MCP Server running on port ${port}`);
console.log(`📡 Connect via: http://localhost:${port}/stream`);
console.log(`🎯 This server focuses exclusively on MCP prompt patterns:`);
console.log(`   • Template creation and variable substitution`);
console.log(`   • Dynamic prompt generation and customization`);
console.log(`   • Conditional logic in prompt construction`);
console.log(`   • Multi-role conversation templates`);
console.log(`   • Context-aware prompt building`);
console.log(`   • AI model integration and optimization`);
