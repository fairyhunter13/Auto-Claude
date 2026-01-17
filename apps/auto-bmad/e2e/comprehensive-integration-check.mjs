#!/usr/bin/env node
/**
 * COMPREHENSIVE INTEGRATION DIAGNOSTIC
 * 
 * This script tests ALL integration points of Auto-BMAD:
 * 
 * 1. OpenCode CLI - BMAD workflow execution
 * 2. Claude CLI - Task and terminal execution  
 * 3. Python Environment - Runner scripts
 * 4. MCP Servers - Context servers
 * 5. Electron App - IPC and UI
 * 6. Feature Integration - Cross-feature functionality
 * 
 * Run: node e2e/comprehensive-integration-check.mjs
 */

import { spawn, execSync, exec } from 'child_process';
import { existsSync, writeFileSync, mkdirSync, readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { promisify } from 'util';

const execAsync = promisify(exec);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Results collection
const results = {
  timestamp: new Date().toISOString(),
  platform: process.platform,
  checks: {},
  summary: { passed: 0, failed: 0, warnings: 0 }
};

// ─────────────────────────────────────────────────────────────────────────────
// Utilities
// ─────────────────────────────────────────────────────────────────────────────

function log(emoji, message, details = null) {
  console.log(`${emoji} ${message}`);
  if (details) {
    console.log(`   ${JSON.stringify(details, null, 2).split('\n').join('\n   ')}`);
  }
}

function recordCheck(name, passed, message, details = null) {
  results.checks[name] = { passed, message, details, timestamp: new Date().toISOString() };
  if (passed === true) {
    results.summary.passed++;
    log('✅', `${name}: ${message}`);
  } else if (passed === false) {
    results.summary.failed++;
    log('❌', `${name}: ${message}`, details);
  } else {
    results.summary.warnings++;
    log('⚠️', `${name}: ${message}`, details);
  }
}

async function checkCommand(cmd, args = []) {
  try {
    const result = await execAsync(`${cmd} ${args.join(' ')}`);
    return { found: true, output: result.stdout.trim(), error: null };
  } catch (e) {
    return { found: false, output: null, error: e.message };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// CHECK 1: OpenCode CLI (BMAD Workflows)
// ─────────────────────────────────────────────────────────────────────────────

async function checkOpenCodeCLI() {
  console.log('\n' + '═'.repeat(60));
  console.log('CHECK 1: OpenCode CLI (BMAD Workflow Execution)');
  console.log('═'.repeat(60));

  const candidates = [
    'opencode',
    '/usr/local/bin/opencode',
    path.join(process.env.HOME || '', '.local', 'bin', 'opencode'),
    path.join(process.env.HOME || '', 'go', 'bin', 'opencode'),
  ];

  let opencodePath = null;
  let opencodeVersion = null;

  for (const candidate of candidates) {
    const result = await checkCommand(candidate, ['--version']);
    if (result.found) {
      opencodePath = candidate;
      opencodeVersion = result.output;
      break;
    }
  }

  if (opencodePath) {
    recordCheck('opencode-cli', true, `Found at ${opencodePath}`, { version: opencodeVersion });
    
    // Test if opencode can list agents
    const agentTest = await checkCommand(opencodePath, ['agents', 'list']);
    if (agentTest.found) {
      recordCheck('opencode-agents', true, 'Can list agents');
    } else {
      recordCheck('opencode-agents', 'warning', 'Cannot list agents', { error: agentTest.error });
    }
  } else {
    recordCheck('opencode-cli', false, 'OpenCode CLI not found', { searchedPaths: candidates });
  }

  return opencodePath;
}

// ─────────────────────────────────────────────────────────────────────────────
// CHECK 2: Claude CLI (Task/Terminal Execution)
// ─────────────────────────────────────────────────────────────────────────────

async function checkClaudeCLI() {
  console.log('\n' + '═'.repeat(60));
  console.log('CHECK 2: Claude CLI (Task/Terminal Execution)');
  console.log('═'.repeat(60));

  const candidates = [
    'claude',
    '/usr/local/bin/claude',
    path.join(process.env.HOME || '', '.local', 'bin', 'claude'),
    path.join(process.env.HOME || '', '.claude', 'bin', 'claude'),
  ];

  // Also check npm global
  try {
    const npmGlobal = execSync('npm root -g', { encoding: 'utf-8' }).trim();
    candidates.push(path.join(npmGlobal, '.bin', 'claude'));
    candidates.push(path.join(npmGlobal, '@anthropic-ai', 'claude-code', 'cli.js'));
  } catch {}

  let claudePath = null;
  let claudeVersion = null;

  for (const candidate of candidates) {
    const result = await checkCommand(candidate, ['--version']);
    if (result.found) {
      claudePath = candidate;
      claudeVersion = result.output;
      break;
    }
  }

  if (claudePath) {
    recordCheck('claude-cli', true, `Found at ${claudePath}`, { version: claudeVersion });
    
    // Check if claude has proper authentication
    // This is tricky - claude --version works without auth, but actual commands need auth
    recordCheck('claude-auth', 'warning', 'Authentication status requires manual verification');
  } else {
    recordCheck('claude-cli', false, 'Claude CLI not found', { searchedPaths: candidates });
  }

  return claudePath;
}

// ─────────────────────────────────────────────────────────────────────────────
// CHECK 3: Python Environment (Runners)
// ─────────────────────────────────────────────────────────────────────────────

async function checkPythonEnvironment() {
  console.log('\n' + '═'.repeat(60));
  console.log('CHECK 3: Python Environment (Runner Scripts)');
  console.log('═'.repeat(60));

  // Check Python
  const pythonCandidates = ['python3', 'python'];
  let pythonPath = null;
  let pythonVersion = null;

  for (const candidate of pythonCandidates) {
    const result = await checkCommand(candidate, ['--version']);
    if (result.found) {
      pythonPath = candidate;
      pythonVersion = result.output;
      break;
    }
  }

  if (pythonPath) {
    recordCheck('python', true, `Found: ${pythonVersion}`);

    // Check pip
    const pipResult = await checkCommand(pythonPath, ['-m', 'pip', '--version']);
    if (pipResult.found) {
      recordCheck('pip', true, 'pip available');
    } else {
      recordCheck('pip', false, 'pip not available');
    }

    // Check key Python packages
    const packages = ['anthropic', 'aiohttp', 'pydantic'];
    for (const pkg of packages) {
      const pkgResult = await checkCommand(pythonPath, ['-c', `import ${pkg}; print(${pkg}.__version__)`]);
      if (pkgResult.found) {
        recordCheck(`python-${pkg}`, true, `${pkg} installed: ${pkgResult.output}`);
      } else {
        recordCheck(`python-${pkg}`, 'warning', `${pkg} not found - may be required for tasks`);
      }
    }
  } else {
    recordCheck('python', false, 'Python not found');
  }

  return pythonPath;
}

// ─────────────────────────────────────────────────────────────────────────────
// CHECK 4: Auto-BMAD App Build
// ─────────────────────────────────────────────────────────────────────────────

async function checkAppBuild() {
  console.log('\n' + '═'.repeat(60));
  console.log('CHECK 4: Auto-BMAD Electron App');
  console.log('═'.repeat(60));

  const appDir = path.join(__dirname, '..');
  const distDir = path.join(appDir, 'out');
  const mainJs = path.join(distDir, 'main', 'index.js');
  const preloadJs = path.join(distDir, 'preload', 'index.mjs');
  const rendererDir = path.join(distDir, 'renderer');

  // Check build outputs
  const buildChecks = [
    { name: 'main-process', path: mainJs },
    { name: 'preload-script', path: preloadJs },
    { name: 'renderer', path: rendererDir },
  ];

  let allBuilt = true;
  for (const check of buildChecks) {
    if (existsSync(check.path)) {
      recordCheck(`build-${check.name}`, true, `${check.name} exists`);
    } else {
      recordCheck(`build-${check.name}`, false, `${check.name} not found at ${check.path}`);
      allBuilt = false;
    }
  }

  // Check package.json
  const pkgPath = path.join(appDir, 'package.json');
  if (existsSync(pkgPath)) {
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
    recordCheck('package-json', true, `App: ${pkg.name} v${pkg.version}`);
  }

  return allBuilt;
}

// ─────────────────────────────────────────────────────────────────────────────
// CHECK 5: IPC Handlers and API Wiring
// ─────────────────────────────────────────────────────────────────────────────

async function checkIPCWiring() {
  console.log('\n' + '═'.repeat(60));
  console.log('CHECK 5: IPC Handler Wiring');
  console.log('═'.repeat(60));

  const srcDir = path.join(__dirname, '..', 'src');
  
  // Check IPC handler files exist
  const handlerFiles = [
    'main/ipc-handlers/index.ts',
    'main/ipc-handlers/bmad-handlers.ts',
    'main/ipc-handlers/task/execution-handlers.ts',
    'main/ipc-handlers/terminal-handlers.ts',
    'main/ipc-handlers/opencode-handlers.ts',
    'main/ipc-handlers/mcp-handlers.ts',
    'main/ipc-handlers/debug-handlers.ts',
  ];

  for (const file of handlerFiles) {
    const fullPath = path.join(srcDir, file);
    if (existsSync(fullPath)) {
      recordCheck(`ipc-${path.basename(file, '.ts')}`, true, `Handler exists`);
    } else {
      recordCheck(`ipc-${path.basename(file, '.ts')}`, false, `Handler missing: ${file}`);
    }
  }

  // Check preload API files
  const preloadFiles = [
    'preload/api/index.ts',
    'preload/api/bmad-api.ts',
    'preload/api/task-api.ts',
    'preload/api/modules/debug-api.ts',
    'preload/api/modules/mcp-api.ts',
    'preload/api/modules/opencode-api.ts',
  ];

  for (const file of preloadFiles) {
    const fullPath = path.join(srcDir, file);
    if (existsSync(fullPath)) {
      recordCheck(`preload-${path.basename(file, '.ts')}`, true, `API exists`);
    } else {
      recordCheck(`preload-${path.basename(file, '.ts')}`, false, `API missing: ${file}`);
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// CHECK 6: BMAD Framework Integration
// ─────────────────────────────────────────────────────────────────────────────

async function checkBMADIntegration() {
  console.log('\n' + '═'.repeat(60));
  console.log('CHECK 6: BMAD Framework Integration');
  console.log('═'.repeat(60));

  const srcDir = path.join(__dirname, '..', 'src');
  
  // Check BMAD service files
  const bmadFiles = [
    'main/bmad/workflow-runner.ts',
    'main/bmad/config-loader.ts',
    'main/bmad/status-manager.ts',
    'main/bmad/artifact-manager.ts',
    'main/bmad/agent-loader.ts',
    'main/bmad/opencode-load-balancer.ts',
  ];

  for (const file of bmadFiles) {
    const fullPath = path.join(srcDir, file);
    if (existsSync(fullPath)) {
      recordCheck(`bmad-${path.basename(file, '.ts')}`, true, `Service exists`);
    } else {
      recordCheck(`bmad-${path.basename(file, '.ts')}`, 'warning', `Service missing: ${file}`);
    }
  }

  // Check _bmad directory in project root (BMAD methodology)
  const projectRoot = path.join(__dirname, '..', '..', '..');
  const bmadDir = path.join(projectRoot, '_bmad');
  
  if (existsSync(bmadDir)) {
    recordCheck('bmad-framework', true, `BMAD framework found at ${bmadDir}`);
    
    // Check for key BMAD directories
    const bmadSubdirs = ['bmm', 'core'];
    for (const subdir of bmadSubdirs) {
      if (existsSync(path.join(bmadDir, subdir))) {
        recordCheck(`bmad-${subdir}`, true, `${subdir} module exists`);
      } else {
        recordCheck(`bmad-${subdir}`, 'warning', `${subdir} module not found`);
      }
    }
  } else {
    recordCheck('bmad-framework', 'warning', 'BMAD framework not found in project root');
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// CHECK 7: MCP Server Connectivity
// ─────────────────────────────────────────────────────────────────────────────

async function checkMCPServers() {
  console.log('\n' + '═'.repeat(60));
  console.log('CHECK 7: MCP Server Connectivity');
  console.log('═'.repeat(60));

  // Check common MCP server endpoints
  const mcpEndpoints = [
    { name: 'graphiti', url: 'http://localhost:8000/mcp/', description: 'Graphiti knowledge graph' },
    { name: 'context7', url: 'http://localhost:3007/', description: 'Context7 server' },
  ];

  for (const endpoint of mcpEndpoints) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      
      const response = await fetch(endpoint.url, { 
        method: 'GET',
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      
      if (response.ok) {
        recordCheck(`mcp-${endpoint.name}`, true, `${endpoint.description} reachable`);
      } else {
        recordCheck(`mcp-${endpoint.name}`, 'warning', `${endpoint.description} returned ${response.status}`);
      }
    } catch (e) {
      recordCheck(`mcp-${endpoint.name}`, 'warning', `${endpoint.description} not reachable (optional)`);
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// CHECK 8: Cross-Feature Integration Test
// ─────────────────────────────────────────────────────────────────────────────

async function checkCrossFeatureIntegration() {
  console.log('\n' + '═'.repeat(60));
  console.log('CHECK 8: Cross-Feature Integration');
  console.log('═'.repeat(60));

  // This check verifies that features can work together
  
  // Check 1: Can we import and validate IPC channel constants?
  const constantsPath = path.join(__dirname, '..', 'src', 'shared', 'constants', 'ipc.ts');
  if (existsSync(constantsPath)) {
    const content = readFileSync(constantsPath, 'utf-8');
    
    const requiredChannels = [
      'TASK_CREATE',
      'TASK_START',
      'BMAD_CHECK_OPENCODE',
      'BMAD_START_WORKFLOW',
      'TERMINAL_CREATE',
      'DEBUG_LOGGER_SET_ENABLED',
      'MCP_CHECK_HEALTH',
      'OPENCODE_CHECK_VERSION',
    ];
    
    let missingChannels = [];
    for (const channel of requiredChannels) {
      if (!content.includes(channel)) {
        missingChannels.push(channel);
      }
    }
    
    if (missingChannels.length === 0) {
      recordCheck('ipc-channels', true, 'All required IPC channels defined');
    } else {
      recordCheck('ipc-channels', false, 'Missing IPC channels', { missing: missingChannels });
    }
  }

  // Check 2: Verify ElectronAPI type includes all APIs
  const apiIndexPath = path.join(__dirname, '..', 'src', 'preload', 'api', 'index.ts');
  if (existsSync(apiIndexPath)) {
    const content = readFileSync(apiIndexPath, 'utf-8');
    
    const requiredAPIs = [
      'TaskAPI',
      'TerminalAPI',
      'DebugAPI',
      'McpAPI',
      'BmadAPI',
    ];
    
    let missingAPIs = [];
    for (const api of requiredAPIs) {
      if (!content.includes(api)) {
        missingAPIs.push(api);
      }
    }
    
    if (missingAPIs.length === 0) {
      recordCheck('electron-api-types', true, 'All required APIs in ElectronAPI');
    } else {
      recordCheck('electron-api-types', false, 'Missing API types', { missing: missingAPIs });
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log('╔════════════════════════════════════════════════════════════════════╗');
  console.log('║       AUTO-BMAD COMPREHENSIVE INTEGRATION DIAGNOSTIC               ║');
  console.log('║                                                                    ║');
  console.log('║  This checks ALL integration points:                               ║');
  console.log('║  - OpenCode CLI (BMAD workflows)                                   ║');
  console.log('║  - Claude CLI (Tasks/Terminal)                                     ║');
  console.log('║  - Python Environment (Runners)                                    ║');
  console.log('║  - Electron App Build                                              ║');
  console.log('║  - IPC Handler Wiring                                              ║');
  console.log('║  - BMAD Framework                                                  ║');
  console.log('║  - MCP Servers                                                     ║');
  console.log('║  - Cross-Feature Integration                                       ║');
  console.log('╚════════════════════════════════════════════════════════════════════╝');
  console.log(`\nTimestamp: ${results.timestamp}`);
  console.log(`Platform: ${results.platform}`);

  // Run all checks
  await checkOpenCodeCLI();
  await checkClaudeCLI();
  await checkPythonEnvironment();
  await checkAppBuild();
  await checkIPCWiring();
  await checkBMADIntegration();
  await checkMCPServers();
  await checkCrossFeatureIntegration();

  // Summary
  console.log('\n' + '═'.repeat(60));
  console.log('SUMMARY');
  console.log('═'.repeat(60));
  console.log(`✅ Passed:   ${results.summary.passed}`);
  console.log(`❌ Failed:   ${results.summary.failed}`);
  console.log(`⚠️  Warnings: ${results.summary.warnings}`);
  console.log('═'.repeat(60));

  // Critical issues
  if (results.summary.failed > 0) {
    console.log('\n🚨 CRITICAL ISSUES FOUND:');
    for (const [name, check] of Object.entries(results.checks)) {
      if (check.passed === false) {
        console.log(`   - ${name}: ${check.message}`);
      }
    }
  }

  // Save results
  const outputDir = path.join(__dirname, 'diagnostic-output');
  mkdirSync(outputDir, { recursive: true });
  const outputPath = path.join(outputDir, `integration-check-${Date.now()}.json`);
  writeFileSync(outputPath, JSON.stringify(results, null, 2));
  console.log(`\n📝 Full results saved to: ${outputPath}`);

  // Recommendations
  console.log('\n' + '═'.repeat(60));
  console.log('RECOMMENDATIONS');
  console.log('═'.repeat(60));

  if (!results.checks['opencode-cli']?.passed) {
    console.log('1. Install OpenCode CLI: go install github.com/opencode-ai/opencode@latest');
  }
  
  if (!results.checks['claude-cli']?.passed) {
    console.log('2. Install Claude CLI: npm install -g @anthropic-ai/claude-code');
  }

  if (!results.checks['python']?.passed) {
    console.log('3. Install Python 3.10+ and required packages');
  }

  const buildFailed = ['build-main-process', 'build-preload-script', 'build-renderer']
    .some(k => results.checks[k]?.passed === false);
  if (buildFailed) {
    console.log('4. Build the app: cd apps/auto-bmad && npm run build');
  }

  console.log('\n✨ Diagnostic complete!');
  
  // Exit with appropriate code
  process.exit(results.summary.failed > 0 ? 1 : 0);
}

main().catch(e => {
  console.error('Diagnostic failed:', e);
  process.exit(1);
});
