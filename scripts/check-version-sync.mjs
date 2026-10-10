#!/usr/bin/env node
/**
 * Fail if marketplace / plugin / server version fields disagree.
 *
 * Releases historically bumped only `.claude-plugin/marketplace.json` (and the
 * Cursor twin) while leaving `claude|cursor/.../plugin.json` and `server.json`
 * behind. Cursor/Grok catalog installs then look "updated" by marketplace
 * semver while the installed plugin.json stays on an old version — or worse,
 * the backend pin never moves and reinstalls keep serving a May SHA.
 *
 * Usage: node scripts/check-version-sync.mjs
 * Exit 0 = synced, 1 = drift (prints report to stdout).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** @type {{ path: string, versionPath: string[] }[]} */
const VERSION_SOURCES = [
  { path: '.claude-plugin/marketplace.json', versionPath: ['version'] },
  { path: '.cursor-plugin/marketplace.json', versionPath: ['version'] },
  { path: 'claude/.claude-plugin/plugin.json', versionPath: ['version'] },
  { path: 'cursor/.cursor-plugin/plugin.json', versionPath: ['version'] },
  { path: 'server.json', versionPath: ['version'] },
];

/** Nested plugin entries inside marketplace.json must match the root version. */
const MARKETPLACE_PLUGIN_ENTRIES = [
  '.claude-plugin/marketplace.json',
  '.cursor-plugin/marketplace.json',
];

function readJson(rel) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
}

function getAt(obj, keys) {
  let cur = obj;
  for (const k of keys) {
    if (cur == null || typeof cur !== 'object') return undefined;
    cur = cur[k];
  }
  return cur;
}

const findings = [];
const versions = {};

for (const src of VERSION_SOURCES) {
  const abs = path.join(ROOT, src.path);
  if (!fs.existsSync(abs)) {
    findings.push({ severity: 'error', file: src.path, message: 'missing required version file' });
    continue;
  }
  let json;
  try {
    json = readJson(src.path);
  } catch (err) {
    findings.push({
      severity: 'error',
      file: src.path,
      message: `invalid JSON: ${err instanceof Error ? err.message : String(err)}`,
    });
    continue;
  }
  const version = getAt(json, src.versionPath);
  if (typeof version !== 'string' || !/^\d+\.\d+\.\d+$/.test(version)) {
    findings.push({
      severity: 'error',
      file: src.path,
      message: `expected semver string at ${src.versionPath.join('.')}, got ${JSON.stringify(version)}`,
    });
    continue;
  }
  versions[src.path] = version;
}

for (const rel of MARKETPLACE_PLUGIN_ENTRIES) {
  if (!(rel in versions)) continue;
  const json = readJson(rel);
  const root = versions[rel];
  const plugins = Array.isArray(json.plugins) ? json.plugins : [];
  for (const plugin of plugins) {
    const name = typeof plugin?.name === 'string' ? plugin.name : '(unnamed)';
    const v = plugin?.version;
    if (v !== root) {
      findings.push({
        severity: 'error',
        file: rel,
        message: `plugins[] entry "${name}" version ${JSON.stringify(v)} != marketplace root ${root}`,
      });
    }
  }
}

const unique = [...new Set(Object.values(versions))];
if (unique.length > 1) {
  findings.push({
    severity: 'error',
    file: '(version sync)',
    message: `version drift across manifests: ${JSON.stringify(versions)}`,
  });
}

// Provider clients that ship skills but no plugin.json today — document, don't invent.
const skillOnlyClients = ['codex', 'kiro', 'antigravity', 'opencode'];
for (const client of skillOnlyClients) {
  const pluginJsonCandidates = [
    `${client}/.codex-plugin/plugin.json`,
    `${client}/.kiro-plugin/plugin.json`,
    `${client}/.agent-plugin/plugin.json`,
    `${client}/.opencode-plugin/plugin.json`,
    `${client}/plugin.json`,
  ];
  for (const candidate of pluginJsonCandidates) {
    if (fs.existsSync(path.join(ROOT, candidate))) {
      findings.push({
        severity: 'error',
        file: candidate,
        message:
          'unexpected plugin.json for skill-only client — add it to VERSION_SOURCES and keep it in sync',
      });
    }
  }
}

const report = {
  checkedAt: new Date().toISOString(),
  versions,
  canonical: unique.length === 1 ? unique[0] : null,
  findings,
  ok: findings.length === 0,
};

console.log(JSON.stringify(report, null, 2));
if (!report.ok) process.exit(1);
