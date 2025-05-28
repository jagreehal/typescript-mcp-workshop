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

// Check Ollama installation
function checkOllama() {
  step('Checking Ollama installation...');

  if (!commandExists('ollama')) {
    error('Ollama not found. Please install it from: https://ollama.ai/');
    return false;
  }

  const version = getVersion('ollama', '--version');
  success(`Ollama ${version} ✓`);

  // Check if llama3.2:latest is available
  try {
    const models = execSync('ollama list', { encoding: 'utf8' });
    if (models.includes('qwen3:latest')) {
      success('llama3.2:latest model available ✓');
    } else {
      warning('llama3.2:latest model not found. Installing...');
      execSync('ollama pull llama3.2:latest', { stdio: 'inherit' });
      success('llama3.2:latestt model installed ✓');
    }
  } catch {
    error('Failed to check Ollama models. Make sure Ollama is running.');
    info('Try running: ollama serve');
    return false;
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
    JSON.parse(readFileSync('tsconfig.json', 'utf8'));
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
  allGood &= checkOllama();
  allGood &= checkTypeScript();

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
