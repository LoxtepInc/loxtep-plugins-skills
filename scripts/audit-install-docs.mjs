#!/usr/bin/env node
/**
 * Deterministic install-doc drift checks for loxtep-plugins-skills.
 *
 * Usage:
 *   node scripts/audit-install-docs.mjs
 *
 * Exit 0 = pass, 1 = findings (prints JSON report to stdout).
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

/** @type {Array<{severity:'error'|'warn', file:string, message:string}>} */
const findings = [];

function read(file) {
  return fs.readFileSync(path.join(ROOT, file), 'utf8');
}

function exists(file) {
  return fs.existsSync(path.join(ROOT, file));
}

function add(severity, file, message) {
  findings.push({ severity, file, message });
}

function grepFiles(pattern, files) {
  const re = new RegExp(pattern, 'm');
  for (const file of files) {
    if (!exists(file)) continue;
    const text = read(file);
    if (re.test(text)) add('error', file, `matches stale pattern /${pattern.source}/`);
  }
}

// Skill file content/count parity across clients is covered by
// `node scripts/generate-skills.mjs --check` (see check-skills-sync.yml).
// This audit also asserts install docs claim the live canonical skill count.
const clients = ['cursor', 'claude', 'opencode', 'kiro', 'antigravity', 'codex'];

function listCanonicalSkillCount() {
  const skillsDir = path.join(ROOT, 'skills');
  if (!fs.existsSync(skillsDir)) return 0;
  return fs
    .readdirSync(skillsDir, { withFileTypes: true })
    .filter((d) => d.isDirectory() && fs.existsSync(path.join(skillsDir, d.name, 'SKILL.md')))
    .length;
}

const canonicalSkillCount = listCanonicalSkillCount();
if (canonicalSkillCount < 1) {
  add('error', 'skills/', 'no canonical SKILL.md directories found');
}

for (const client of clients) {
  const clientSkills = path.join(ROOT, client, 'skills');
  if (!fs.existsSync(clientSkills)) {
    add('error', `${client}/skills`, 'missing client skills directory');
    continue;
  }
  const clientCount = fs
    .readdirSync(clientSkills, { withFileTypes: true })
    .filter((d) => d.isDirectory() && fs.existsSync(path.join(clientSkills, d.name, 'SKILL.md')))
    .length;
  if (clientCount !== canonicalSkillCount) {
    add(
      'error',
      `${client}/skills`,
      `skill count ${clientCount} != canonical ${canonicalSkillCount}`
    );
  }
}

const countClaimFiles = [
  'README.md',
  'docs/starter-subset.md',
  ...clients.map((c) => `${c}/README.md`),
];
const countClaimRe = new RegExp(
  String.raw`\b(\d{1,3})\s+(?:scoped\s+)?skills?\b|\bSkills\s*\((\d{1,3})\s+bundles?\)`,
  'gi'
);
for (const file of countClaimFiles) {
  if (!exists(file)) continue;
  const text = read(file);
  let m;
  countClaimRe.lastIndex = 0;
  while ((m = countClaimRe.exec(text)) !== null) {
    const n = Number(m[1] ?? m[2]);
    if (n < 10 || n > 200) continue;
    if (n !== canonicalSkillCount) {
      add(
        'error',
        file,
        `claims ${n} skills/bundles but canonical count is ${canonicalSkillCount}`
      );
    }
  }
}

for (const client of clients) {
  if (exists(`${client}/skills/create-connector/SKILL.md`)) {
    add('error', `${client}/skills/create-connector/SKILL.md`, 'removed skill still present');
  }
}

if (exists('.loxtep/skills/create-connector.yaml')) {
  add('error', '.loxtep/skills/create-connector.yaml', 'removed scope file still present');
}

if (!exists('.loxtep/skills/connect-external-system.yaml')) {
  add('error', '.loxtep/skills/connect-external-system.yaml', 'missing connect-external-system scope file');
}

const docFiles = [
  'README.md',
  'AGENTS.md',
  '.cursor-plugin/marketplace.json',
  '.claude-plugin/marketplace.json',
  ...clients.map((c) => `${c}/README.md`),
];

grepFiles(/"type":\s*"http"/, ['opencode/opencode.json', ...docFiles]);
grepFiles(/\b20 skills\b|\b19 scoped\b|\b19 bundles\b/, docFiles);
grepFiles(/create-connector/, docFiles);
grepFiles(/Install from Git/i, ['README.md', 'cursor/README.md']);

try {
  const opencode = JSON.parse(read('opencode/opencode.json'));
  if (opencode?.mcp?.loxtep?.type !== 'remote') {
    add('error', 'opencode/opencode.json', 'loxtep MCP type must be "remote"');
  }
} catch (err) {
  add('error', 'opencode/opencode.json', `invalid JSON: ${err.message}`);
}

const requiredSnippets = [
  ['README.md', 'claude plugin install loxtep-claude@loxtep'],
  ['README.md', '~/.gemini/config/mcp_config.json'],
  ['README.md', '~/.agents/skills'],
  ['README.md', 'opencode mcp auth loxtep'],
  ['README.md', 'codex mcp login loxtep'],
  ['opencode/README.md', '"type": "remote"'],
  ['kiro/README.md', 'Import power from a folder'],
  ['antigravity/README.md', '~/.gemini/skills'],
];

for (const [file, snippet] of requiredSnippets) {
  if (!exists(file)) {
    add('error', file, 'missing file referenced by audit');
    continue;
  }
  if (!read(file).includes(snippet)) {
    add('warn', file, `missing expected install snippet: ${snippet}`);
  }
}

const report = {
  checkedAt: new Date().toISOString(),
  findings,
  ok: findings.every((f) => f.severity !== 'error'),
};

console.log(JSON.stringify(report, null, 2));

if (!report.ok) process.exit(1);
