#!/usr/bin/env node
/**
 * Fails if any plugin MCP config still references the legacy stdio package
 * `@loxtep/customer-mcp-server`. Hosted URL or mcp-remote bridge only.
 *
 * Usage: node scripts/check-mcp-config.mjs
 */

import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = dirname(__dirname);

const CONFIG_FILES = [
  'cursor/.mcp.json',
  'cursor/.cursor-plugin/plugin.json',
  'claude/.mcp.json',
  'claude/.claude-plugin/plugin.json',
  'kiro/mcp.json',
  'kiro/power/mcp.json',
  'opencode/opencode.json',
  'antigravity/mcp_config.json',
  'codex/config.snippet.toml',
  '.claude-plugin/marketplace.json',
  '.cursor-plugin/marketplace.json',
];

const LEGACY = '@loxtep/customer-mcp-server';
const HOSTED = 'mcp.loxtep.io/ai/mcp/stream';

const errors = [];

for (const rel of CONFIG_FILES) {
  const path = join(REPO_ROOT, rel);
  if (!existsSync(path)) {
    errors.push(`Missing expected config: ${rel}`);
    continue;
  }
  const text = readFileSync(path, 'utf8');
  if (text.includes(LEGACY)) {
    errors.push(`${rel}: references deprecated ${LEGACY}`);
  }
}

const marketplacePath = join(REPO_ROOT, '.claude-plugin/marketplace.json');
const cursorMarketplacePath = join(REPO_ROOT, '.cursor-plugin/marketplace.json');
if (existsSync(marketplacePath)) {
  const marketplace = JSON.parse(readFileSync(marketplacePath, 'utf8'));
  const cursorPlugin = marketplace.plugins?.find((p) => p.name === 'loxtep');
  const claudePlugin = marketplace.plugins?.find((p) => p.name === 'loxtep-claude');
  if (!cursorPlugin || cursorPlugin.source !== './cursor') {
    errors.push('marketplace.json: plugin "loxtep" must use source "./cursor"');
  }
  if (!claudePlugin || claudePlugin.source !== './claude') {
    errors.push('marketplace.json: plugin "loxtep-claude" must use source "./claude"');
  }
}

if (!existsSync(cursorMarketplacePath)) {
  errors.push('Missing Cursor marketplace manifest: .cursor-plugin/marketplace.json');
} else {
  const cursorMarketplace = JSON.parse(readFileSync(cursorMarketplacePath, 'utf8'));
  const cursorPlugin = cursorMarketplace.plugins?.find((p) => p.name === 'loxtep');
  if (!cursorPlugin || cursorPlugin.source !== './cursor') {
    errors.push('.cursor-plugin/marketplace.json: plugin "loxtep" must use source "./cursor"');
  }
  if (!cursorPlugin?.homepage?.includes('/tree/main/cursor')) {
    errors.push('.cursor-plugin/marketplace.json: plugin "loxtep" must set homepage to the cursor/ subpath');
  }
}

for (const rel of CONFIG_FILES.filter((f) => f.endsWith('.json') || f.endsWith('.toml'))) {
  if (rel.includes('marketplace')) continue;
  const path = join(REPO_ROOT, rel);
  if (!existsSync(path)) continue;
  const text = readFileSync(path, 'utf8');

  let hostedText = text;
  const mcpRef = text.match(/"mcpServers"\s*:\s*"\.\/([^"]+)"/);
  if (mcpRef) {
    const clientMatch = rel.match(/^(cursor|claude|kiro|opencode|antigravity|codex)\//);
    const baseDir = clientMatch
      ? join(REPO_ROOT, clientMatch[1])
      : join(REPO_ROOT, dirname(rel));
    const refPath = join(baseDir, mcpRef[1].replace(/^\.\//, ''));
    if (existsSync(refPath)) {
      hostedText = readFileSync(refPath, 'utf8');
    }
  }

  if (!hostedText.includes(HOSTED) && !hostedText.includes('mcpdev.loxtep.io')) {
    errors.push(`${rel}: must reference hosted MCP (${HOSTED}) or mcp-remote bridge`);
  }
}

if (errors.length > 0) {
  console.error('MCP config check failed:\n');
  for (const err of errors) console.error(`  - ${err}`);
  process.exit(1);
}

console.log('MCP config check passed (hosted MCP only, marketplace routes correct).');
