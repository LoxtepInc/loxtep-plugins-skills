#!/usr/bin/env node
/**
 * check-docs-consistency.mjs
 *
 * Cross-bundle documentation consistency checker for loxtep-plugins-skills.
 *
 * Reads all SKILL.md files across the client bundles (cursor, claude, codex,
 * antigravity, opencode, kiro) and asserts that the same operation is documented
 * identically (param names + required/optional designations) in every bundle
 * that documents it. Reports any client-specific drift as a failure.
 *
 * Validates: Requirement 9.7 — no client-specific drift remains.
 *
 * Usage:
 *   node scripts/check-docs-consistency.mjs
 *
 * Exit code 0 = all consistent, 1 = drift detected.
 */

import { readFileSync, readdirSync, statSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPO_ROOT = dirname(__dirname);

const CLIENT_BUNDLES = ['cursor', 'claude', 'codex', 'antigravity', 'opencode', 'kiro'];
const SKILLS_SUBDIR = 'skills';

// ─── Normalization helpers ───────────────────────────────────────────────────

/**
 * Normalize unicode dashes and whitespace for stable comparison.
 */
function normalizeDashes(str) {
  return str.replace(/[\u2014\u2013\u2012\u2015]/g, '-').trim();
}

/**
 * Strip markdown formatting from a cell value (backticks, bold, etc.)
 */
function stripFormatting(cell) {
  return cell
    .replace(/`/g, '')
    .replace(/\*\*/g, '')
    .replace(/\*/g, '')
    .trim();
}

/**
 * Parse a comma-separated parameter list from a table cell.
 * Handles backtick-wrapped params, em-dash for empty, etc.
 */
function parseParamList(cell) {
  const cleaned = stripFormatting(normalizeDashes(cell));
  if (!cleaned || cleaned === '-' || cleaned === '—' || cleaned === '') return [];

  return cleaned
    .split(',')
    .map(p => p.trim().replace(/`/g, ''))
    .filter(p => p && p !== '-' && p !== '—' && p !== '…' && p.length > 0);
}

// ─── Markdown table parsing ──────────────────────────────────────────────────

/**
 * Extract operation documentation from a SKILL.md file.
 *
 * Focuses on tables that have an explicit operation column AND explicit
 * Required/Optional columns (the primary documentation format). Tables with
 * only Notes columns are extracted for scope comparison but not for param
 * comparison.
 *
 * Returns a Map<operationName, { scope, required: string[], optional: string[], raw: string }>
 */
function extractOperations(content) {
  const operations = new Map();
  const lines = content.split('\n');
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim().startsWith('|') || !line.includes('|')) {
      i++;
      continue;
    }

    // Collect consecutive table lines
    const tableLines = [];
    while (i < lines.length && lines[i].trim().startsWith('|')) {
      tableLines.push(lines[i]);
      i++;
    }

    if (tableLines.length < 3) continue; // Need header + separator + at least 1 row

    // Parse the header to determine table format
    const headerCells = tableLines[0].trim()
      .replace(/^\|/, '')
      .replace(/\|$/, '')
      .split('|')
      .map(c => stripFormatting(c).toLowerCase());

    // Find column indices — the operation column can be named various things
    const opIdx = headerCells.findIndex(h =>
      h === 'operation' || h === '`operation`' || h === 'op'
    );
    const scopeIdx = headerCells.findIndex(h => h === 'scope');
    const requiredIdx = headerCells.findIndex(h => h === 'required');
    const optionalIdx = headerCells.findIndex(h => h === 'optional');
    const notesIdx = headerCells.findIndex(h => h === 'notes');

    // We need an operation column at minimum
    if (opIdx === -1) continue;

    // Skip flow/step tables — they describe usage patterns, not param signatures.
    // These have columns like "Step", "Action", "#", "User intent", "Tool"
    const isFlowTable = headerCells.some(h =>
      h === 'step' || h === '#' || h === 'action' || h === 'user intent'
    );
    if (isFlowTable) continue;

    // Parse data rows (skip header and separator)
    for (let r = 2; r < tableLines.length; r++) {
      const rowLine = tableLines[r].trim();
      if (!rowLine.startsWith('|')) continue;
      if (/^\|[\s\-:|]+\|$/.test(rowLine)) continue;

      const cells = rowLine
        .replace(/^\|/, '')
        .replace(/\|$/, '')
        .split('|')
        .map(c => c.trim());

      const rawOp = stripFormatting(cells[opIdx] || '');
      if (!rawOp || rawOp === '-' || rawOp === '—') continue;

      // Handle multi-operation cells (e.g., "list_versions, create_snapshot")
      const opNames = rawOp.includes(',')
        ? rawOp.split(',').map(o => o.trim()).filter(Boolean)
        : [rawOp];

      for (const opName of opNames) {
        // Skip non-operation text (e.g., "—", prose descriptions)
        if (!opName.match(/^[a-z_]+$/)) continue;

        const entry = {
          scope: scopeIdx !== -1 ? normalizeDashes(stripFormatting(cells[scopeIdx] || '')) : '',
          required: [],
          optional: [],
          notes: notesIdx !== -1 ? (cells[notesIdx] || '').trim() : '',
        };

        // Parse explicit Required/Optional columns
        if (requiredIdx !== -1) {
          entry.required = parseParamList(cells[requiredIdx] || '');
        }
        if (optionalIdx !== -1) {
          entry.optional = parseParamList(cells[optionalIdx] || '');
        }

        // Parse from Notes column if it contains structured "Required: ...; optional: ..." text
        if (notesIdx !== -1 && entry.required.length === 0) {
          const notes = cells[notesIdx] || '';
          const reqMatch = notes.match(/\bRequired:\s*`([^`]+(?:`,\s*`[^`]+)*)`/i);
          const optMatch = notes.match(/\b[Oo]ptional:\s*`([^`]+(?:`,\s*`[^`]+)*)`/i);
          if (reqMatch) {
            entry.required = reqMatch[1].split('`,').map(p => p.replace(/`/g, '').trim()).filter(Boolean);
          }
          if (optMatch) {
            entry.optional = optMatch[1].split('`,').map(p => p.replace(/`/g, '').trim()).filter(Boolean);
          }
        }

        // Only store operations that have at least scope or param data
        // (skip flow-step rows that just mention an operation name in passing)
        const hasData = entry.scope || entry.required.length > 0 || entry.optional.length > 0;
        if (!hasData && requiredIdx === -1 && optionalIdx === -1 && scopeIdx === -1) continue;

        // Merge if already exists (some skills document same op in multiple tables)
        if (operations.has(opName)) {
          const existing = operations.get(opName);
          if (entry.required.length > existing.required.length) existing.required = entry.required;
          if (entry.optional.length > existing.optional.length) existing.optional = entry.optional;
          if (entry.scope && !existing.scope) existing.scope = entry.scope;
          if (entry.notes && !existing.notes) existing.notes = entry.notes;
        } else {
          operations.set(opName, entry);
        }
      }
    }
  }

  return operations;
}

// ─── File discovery ──────────────────────────────────────────────────────────

/**
 * Find all SKILL.md files for a given client bundle.
 * Returns Map<skillSlug, filePath>
 */
function findSkillFiles(client) {
  const skillsDir = join(REPO_ROOT, client, SKILLS_SUBDIR);
  if (!existsSync(skillsDir)) return new Map();

  const result = new Map();
  const entries = readdirSync(skillsDir);
  for (const entry of entries) {
    const skillDir = join(skillsDir, entry);
    if (!statSync(skillDir).isDirectory()) continue;
    const skillFile = join(skillDir, 'SKILL.md');
    if (existsSync(skillFile)) {
      result.set(entry, skillFile);
    }
  }
  return result;
}

// ─── Comparison logic ────────────────────────────────────────────────────────

/**
 * Normalize an operation entry for comparison.
 * Sorts parameter lists alphabetically for stable comparison.
 */
function normalizeEntry(entry) {
  return {
    scope: normalizeDashes(entry.scope).toLowerCase().replace(/[()]/g, '').trim(),
    required: [...entry.required].sort(),
    optional: [...entry.optional].sort(),
  };
}

/**
 * Compare two normalized entries for equality.
 * Only compares fields that are populated in both entries.
 */
function entriesMatch(a, b) {
  // Compare required params (only if both have them populated)
  const aHasParams = a.required.length > 0 || a.optional.length > 0;
  const bHasParams = b.required.length > 0 || b.optional.length > 0;

  if (aHasParams && bHasParams) {
    if (a.required.length !== b.required.length) return false;
    if (a.optional.length !== b.optional.length) return false;
    for (let i = 0; i < a.required.length; i++) {
      if (a.required[i] !== b.required[i]) return false;
    }
    for (let i = 0; i < a.optional.length; i++) {
      if (a.optional[i] !== b.optional[i]) return false;
    }
  }

  // Compare scope (only if both are non-empty and non-trivial)
  if (a.scope && b.scope) {
    // Normalize common scope patterns for comparison:
    // - Remove "— see ..." references (e.g., "project — see data-workflows")
    // - Remove parenthetical refs (e.g., "project (project_id)")
    const normalizeScope = (s) => s
      .replace(/\s*-+\s*see\s+.*/i, '')
      .replace(/\s*\([^)]*\)\s*/g, '')
      .replace(/`/g, '')
      .trim();
    const scopeA = normalizeScope(a.scope);
    const scopeB = normalizeScope(b.scope);
    if (scopeA && scopeB && scopeA !== scopeB) return false;
  }

  return true;
}

/**
 * Format a diff between two entries for display.
 */
function formatDiff(a, b) {
  const normalizeScope = (s) => s
    .replace(/\s*-+\s*see\s+.*/i, '')
    .replace(/\s*\([^)]*\)\s*/g, '')
    .replace(/`/g, '')
    .trim();
  const diffs = [];
  if (a.required.join(',') !== b.required.join(',')) {
    diffs.push(`required: [${a.required.join(', ')}] vs [${b.required.join(', ')}]`);
  }
  if (a.optional.join(',') !== b.optional.join(',')) {
    diffs.push(`optional: [${a.optional.join(', ')}] vs [${b.optional.join(', ')}]`);
  }
  const scopeA = normalizeScope(a.scope);
  const scopeB = normalizeScope(b.scope);
  if (scopeA && scopeB && scopeA !== scopeB) {
    diffs.push(`scope: "${scopeA}" vs "${scopeB}"`);
  }
  return diffs;
}

// ─── Main ────────────────────────────────────────────────────────────────────

function main() {
  console.log('Cross-bundle docs-consistency check');
  console.log('====================================\n');
  console.log(`Checking bundles: ${CLIENT_BUNDLES.join(', ')}\n`);

  // Collect all skills across all clients
  // Structure: Map<skillSlug, Map<client, Map<operation, entry>>>
  const allSkills = new Map();
  let totalFiles = 0;

  for (const client of CLIENT_BUNDLES) {
    const skillFiles = findSkillFiles(client);
    for (const [slug, filePath] of skillFiles) {
      totalFiles++;
      const content = readFileSync(filePath, 'utf-8');
      const operations = extractOperations(content);

      if (!allSkills.has(slug)) {
        allSkills.set(slug, new Map());
      }
      allSkills.get(slug).set(client, operations);
    }
  }

  let totalOpsChecked = 0;
  let driftCount = 0;
  const driftDetails = [];

  // For each skill, compare operations across all clients that document it
  for (const [slug, clientOps] of allSkills) {
    // Collect all unique operation names across all clients for this skill
    const allOps = new Set();
    for (const [_client, ops] of clientOps) {
      for (const opName of ops.keys()) {
        allOps.add(opName);
      }
    }

    // For each operation, compare across clients
    for (const opName of allOps) {
      // Collect all client entries that have this operation with real param data
      const clientEntries = [];
      for (const client of CLIENT_BUNDLES) {
        const ops = clientOps.get(client);
        if (!ops) continue;
        const entry = ops.get(opName);
        if (!entry) continue;
        clientEntries.push({ client, entry: normalizeEntry(entry), raw: entry });
      }

      if (clientEntries.length <= 1) continue; // Only in one bundle, nothing to compare
      totalOpsChecked++;

      // Use the first entry as the reference and compare all others
      const reference = clientEntries[0];
      for (let i = 1; i < clientEntries.length; i++) {
        const other = clientEntries[i];
        if (!entriesMatch(reference.entry, other.entry)) {
          driftCount++;
          const diffs = formatDiff(reference.entry, other.entry);
          driftDetails.push({
            skill: slug,
            operation: opName,
            referenceClient: reference.client,
            driftedClient: other.client,
            diffs,
            reference: reference.entry,
            drifted: other.entry,
          });
        }
      }
    }
  }

  // Also check AGENTS.md against the first bundle that has each operation
  const agentsMdPath = join(REPO_ROOT, 'AGENTS.md');
  let agentsDriftCount = 0;
  if (existsSync(agentsMdPath)) {
    const agentsContent = readFileSync(agentsMdPath, 'utf-8');
    const agentsOps = extractOperations(agentsContent);

    for (const [opName, agentsEntry] of agentsOps) {
      const normalizedAgents = normalizeEntry(agentsEntry);

      // Only compare operations that have explicit param data in AGENTS.md
      if (normalizedAgents.required.length === 0 && normalizedAgents.optional.length === 0) {
        continue;
      }

      // Find this operation in any skill bundle (use cursor as reference)
      let found = false;
      for (const [slug, clientOps] of allSkills) {
        if (found) break;
        for (const [client, ops] of clientOps) {
          const bundleEntry = ops.get(opName);
          if (!bundleEntry) continue;
          const normalizedBundle = normalizeEntry(bundleEntry);

          // Only compare if the bundle entry also has explicit param data
          if (normalizedBundle.required.length === 0 && normalizedBundle.optional.length === 0) {
            continue;
          }

          if (!entriesMatch(normalizedAgents, normalizedBundle)) {
            agentsDriftCount++;
            const diffs = formatDiff(normalizedAgents, normalizedBundle);
            driftDetails.push({
              skill: slug,
              operation: opName,
              referenceClient: 'AGENTS.md',
              driftedClient: `${client}/skills/${slug}`,
              diffs,
              reference: normalizedAgents,
              drifted: normalizedBundle,
            });
          }
          found = true;
          break;
        }
      }
    }
  }

  // Report results
  console.log(`SKILL.md files checked: ${totalFiles}`);
  console.log(`Skills (unique): ${allSkills.size}`);
  console.log(`Operations compared across bundles: ${totalOpsChecked}`);
  console.log(`Bundles: ${CLIENT_BUNDLES.length}`);
  console.log('');

  const totalDrift = driftCount + agentsDriftCount;
  if (totalDrift === 0) {
    console.log('✅ All operation documentation is consistent across bundles.');
    console.log('   No client-specific drift detected.');
    process.exit(0);
  } else {
    console.log(`❌ DRIFT DETECTED: ${totalDrift} inconsistency(ies) found.\n`);
    for (const detail of driftDetails) {
      console.log(`  Skill: ${detail.skill}`);
      console.log(`  Operation: ${detail.operation}`);
      console.log(`  ${detail.referenceClient} vs ${detail.driftedClient}`);
      for (const diff of detail.diffs) {
        console.log(`    ${diff}`);
      }
      console.log('');
    }
    process.exit(1);
  }
}

main();
