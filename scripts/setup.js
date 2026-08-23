#!/usr/bin/env node

/**
 * MCP Basics Workshop Setup Script
 *
 * This script ensures your environment is properly configured for the workshop.
 * It checks prerequisites, and verifies everything works.
 */

import { execSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';

// ANSI color codes for beautiful output
const colors = {
  reset: '\u001B[0m',
  bright: '\u001B[1m',
  red: '\u001B[31m',
  green: '\u001B[32m',
  yellow: '\u001B[33m',
  blue: '\u001B[34m',
  magenta: '\u001B[35m',
  cyan: '\u001B[36m',
};

// Helper functions for pretty output
const log = (message, color = colors.reset) =>
  globalThis.console.log(`${color}${message}${colors.reset}`);
const success = (message) => log(`✅ ${message}`, colors.green);
const error = (message) => log(`❌ ${message}`, colors.red);
const warning = (message) => log(`⚠️  ${message}`, colors.yellow);
const info = (message) => log(`ℹ️  ${message}`, colors.blue);
const step = (message) => log(`🔧 ${message}`, colors.cyan);

// Check if a command exists
function commandExists(command) {
  try {
    execSync(`which ${command}`, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

// Get version of a command
function getVersion(command, versionFlag = '--version') {
  try {
    const output = execSync(`${command} ${versionFlag}`, {
      encoding: 'utf8',
      stdio: 'pipe',
    });
    return output.trim();
  } catch {
    return;
  }
}

// Check Node.js version
function checkNodeVersion() {
  step('Checking Node.js version...');

  const nodeVersion = globalThis.process.version;
  const majorVersion = Number.parseInt(nodeVersion.slice(1).split('.')[0], 10);

  if (majorVersion >= 22) {
    success(`Node.js ${nodeVersion} ✓`);
    return true;
  } else {
    error(`Node.js ${nodeVersion} is too old. Need version 22 or higher.`);
    info('Download the latest version from: https://nodejs.org/');
    return false;
  }
}

// Check package manager
function checkPackageManager() {
  step('Checking package manager...');

  const managers = [
    { name: 'npm', command: 'npm' },
    { name: 'pnpm', command: 'pnpm' },
    { name: 'bun', command: 'bun' },
  ];

  for (const manager of managers) {
    if (commandExists(manager.command)) {
      const version = getVersion(manager.command);
      success(`${manager.name} ${version} ✓`);
      return manager.command;
    }
  }

  error('No package manager found. Please install npm, pnpm, or bun.');
  return;
}

// Check a model is reachable: an API key, or a local Ollama. Either is enough.
function checkModelAccess() {
  step('Checking model access...');

  const keys = ['MISTRAL_API_KEY', 'GROQ_API_KEY', 'OPENAI_API_KEY'];
  let env = '';
  if (existsSync('.env')) env = readFileSync('.env', 'utf8');
  const configured = keys.filter(
    (key) => globalThis.process.env[key] || new RegExp(`^${key}=.+`, 'm').test(env),
  );

  if (configured.length > 0) {
    success(`API key(s) found: ${configured.join(', ')} \u2713`);
  }

  let ollama = false;
  if (commandExists('ollama')) {
    try {
      const models = execSync('ollama list', { encoding: 'utf8' });
      const installed = ['qwen3:latest', 'llama3.2:latest'].filter((m) => models.includes(m));
      if (installed.length > 0) {
        success(`Ollama models available: ${installed.join(', ')} \u2713`);
      } else {
        warning('Ollama is running but none of the workshop models are pulled.');
        info('  Try: ollama pull llama3.2:latest');
      }
      ollama = true;
    } catch {
      warning('Ollama is installed but not responding. Try: ollama serve');
    }
  }

  if (configured.length === 0 && !ollama) {
    warning('No model configured — set an API key in .env, or install Ollama.');
    info('  Modules 02, 06, 08, 09, 11 and 12 need no model and will still run.');
    // Not fatal: most of the workshop exercises the protocol, not a model.
  }

  info('  Pick your provider in src/model.ts');
  return true;
}

// Check the workshop's ports are free. A busy port is worth catching here:
// on macOS a dual-stack bind can half-succeed and the failure then shows up
// as a baffling protocol error instead of EADDRINUSE.
function checkPorts() {
  step('Checking workshop ports (8082-8096)...');

  const busy = [];
  for (let port = 8082; port <= 8096; port++) {
    try {
      const out = execSync(`lsof -nP -iTCP:${port} -sTCP:LISTEN 2>/dev/null || true`, {
        encoding: 'utf8',
      });
      if (out.trim()) busy.push(port);
    } catch {
      // lsof missing (or Windows) — skip the check rather than fail setup.
      warning('Could not check ports (lsof unavailable) — skipping.');
      return true;
    }
  }

  if (busy.length === 0) {
    success('All workshop ports are free \u2713');
  } else {
    warning(`Ports already in use: ${busy.join(', ')}`);
    info('  Stop whatever owns them, or change the PORT in that module\'s constants.ts');
  }
  return true;
}

// Check TypeScript configuration
function checkTypeScript() {
  step('Checking TypeScript configuration...');

  if (!existsSync('tsconfig.json')) {
    error('tsconfig.json not found');
    return false;
  }

  try {
    // tsconfig.json is JSONC — comments are legal there but not in JSON.parse.
    const raw = readFileSync('tsconfig.json', 'utf8')
      .split('\n')
      .filter((line) => !line.trim().startsWith('//'))
      .join('\n');
    JSON.parse(raw);
    success('TypeScript configuration valid ✓');
    return true;
  } catch {
    error('Invalid tsconfig.json');
    return false;
  }
}

// Main setup function
async function main() {
  log('\n🚀 MCP Workshop Setup', colors.bright + colors.magenta);
  log('═'.repeat(50), colors.magenta);
  log('Setting up your environment for building AI applications...\n');

  let allGood = true;

  // Check prerequisites
  info('📋 Checking Prerequisites');
  allGood &= checkNodeVersion();
  const packageManager = checkPackageManager();
  allGood &= packageManager !== undefined;
  allGood &= checkTypeScript();

  info('\n\ud83d\udd0d Environment');
  checkModelAccess();
  checkPorts();

  if (!allGood) {
    error(
      '\n❌ Prerequisites check failed. Please fix the issues above and try again.',
    );
    globalThis.process.exit(1);
  }

  log('\n🧪 Testing Environment');

  if (allGood) {
    log('\n🎉 Setup Complete!', colors.bright + colors.green);
    log('═'.repeat(50), colors.green);
    success('Your environment is ready for the MCP Workshop!');
    log('\n📚 Now follow the learning path in the README');
  } else {
    error('\n❌ Setup failed. Please check the errors above.');
    globalThis.process.exit(1);
  }
}

// Run the setup
try {
  await main();
} catch (error_) {
  error('Setup script failed:');
  globalThis.console.error(error_);
  globalThis.process.exit(1);
}
