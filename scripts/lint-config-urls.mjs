#!/usr/bin/env node
/**
 * URL-safety lint for loxtep-plugins-skills (Property 2 / Requirements 1.5, 3.4).
 *
 * Scans every shipped MCP config file for URLs and fails if any points at a
 * non-prod host. Only the production hosts are allowed in shipped configs; dev
 * hosts (mcpdev.*), staging, and localhost are rejected. Human-facing docs
 * (*.md) are intentionally NOT scanned — they may legitimately mention a dev
 * URL in a "Dev environment" note.
 *
 * Usage:
 *   node scripts/lint-config-urls.mjs
 *
 * Exit 0 = pass, 1 = a shipped config references a non-prod host.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

// Shipped config files a user actually installs / merges. These must only ever
// reference production hosts.
const SHIPPED_CONFIGS = [
  'claude/.mcp.json',
  'claude/.claude-plugin/plugin.json',
  'cursor/.mcp.json',
  'cursor/.cursor-plugin/plugin.json',
  'opencode/opencode.json',
  'kiro/mcp.json',
  'kiro/power/mcp.json',
  'antigravity/mcp_config.json',
  'codex/config.snippet.toml',
  '.claude-plugin/marketplace.json',
  '.cursor-plugin/marketplace.json',
  'server.json',
  'smithery.yaml',
];

// Hosts that are allowed to appear in a shipped config.
const ALLOWED_HOSTS = new Set([
  'mcp.loxtep.io',
  'app.loxtep.io',
  'docs.loxtep.io',
  'loxtep.io',
  'www.loxtep.io',
  'github.com',
  'opencode.ai',
  'static.modelcontextprotocol.io',
  'smithery.ai',
]);

const URL_RE = /https?:\/\/([a-z0-9.-]+)(?:[/:?#][^\s"'`)]*)?/gi;

/** @type {Array<{file:string, url:string, host:string}>} */
const findings = [];

for (const rel of SHIPPED_CONFIGS) {
  const abs = path.join(ROOT, rel);
  if (!fs.existsSync(abs)) continue;
  const text = fs.readFileSync(abs, 'utf8');
  let m;
  while ((m = URL_RE.exec(text)) !== null) {
    const url = m[0];
    const host = m[1].toLowerCase();
    if (!ALLOWED_HOSTS.has(host)) {
      findings.push({ file: rel, url, host });
    }
  }
}

const report = {
  checkedAt: new Date().toISOString(),
  scanned: SHIPPED_CONFIGS.filter((f) => fs.existsSync(path.join(ROOT, f))),
  allowedHosts: [...ALLOWED_HOSTS],
  findings,
  ok: findings.length === 0,
};

console.log(JSON.stringify(report, null, 2));

if (!report.ok) {
  console.error(
    `\n✗ ${findings.length} non-prod URL(s) in shipped configs. Shipped configs must point at mcp.loxtep.io, not dev/staging/localhost.`
  );
  process.exit(1);
}

console.error('✓ All shipped configs reference production hosts only.');
