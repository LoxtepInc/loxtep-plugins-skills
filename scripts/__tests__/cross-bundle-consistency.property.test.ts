// Feature: mcp-story-gap-remediation, Property 17: Skill documentation cross-bundle consistency

/**
 * Property 17: Skill documentation cross-bundle consistency
 *
 * **Validates: Requirements 9.7**
 *
 * For any MCP operation documented in more than one client skill bundle,
 * the documented parameter set (names and required/optional designation) SHALL
 * be identical across all bundles that contain that operation, leaving no
 * client-specific drift.
 *
 * This test reads the actual SKILL.md files from all 6 client bundles, extracts
 * operation documentation, and asserts that for any permutation or subset of
 * the bundles, the consistency check finds zero drift. Since the source data is
 * static docs, the test runs the consistency check logic with arbitrary bundle
 * orderings and asserts no drift regardless of evaluation order.
 */

import { describe, test, expect } from 'vitest';
import * as fc from 'fast-check';
import { readFileSync, readdirSync, statSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

// ─── Repo paths ──────────────────────────────────────────────────────────────

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const CLIENT_BUNDLES = ['cursor', 'claude', 'codex', 'antigravity', 'opencode', 'kiro'] as const;
type ClientBundle = typeof CLIENT_BUNDLES[number];

// ─── Normalization helpers (mirrored from check-docs-consistency.mjs) ────────

function normalizeDashes(str: string): string {
  return str.replace(/[\u2014\u2013\u2012\u2015]/g, '-').trim();
}

function stripFormatting(cell: string): string {
  return cell
    .replace(/`/g, '')
    .replace(/\*\*/g, '')
    .replace(/\*/g, '')
    .trim();
}

function parseParamList(cell: string): string[] {
  const cleaned = stripFormatting(normalizeDashes(cell));
  if (!cleaned || cleaned === '-' || cleaned === '—' || cleaned === '') return [];

  return cleaned
    .split(',')
    .map(p => p.trim().replace(/`/g, ''))
    .filter(p => p && p !== '-' && p !== '—' && p !== '…' && p.length > 0);
}

// ─── Operation extraction ────────────────────────────────────────────────────

interface OperationEntry {
  scope: string;
  required: string[];
  optional: string[];
  notes: string;
}

function extractOperations(content: string): Map<string, OperationEntry> {
  const operations = new Map<string, OperationEntry>();
  const lines = content.split('\n');
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim().startsWith('|') || !line.includes('|')) {
      i++;
      continue;
    }

    const tableLines: string[] = [];
    while (i < lines.length && lines[i].trim().startsWith('|')) {
      tableLines.push(lines[i]);
      i++;
    }

    if (tableLines.length < 3) continue;

    const headerCells = tableLines[0].trim()
      .replace(/^\|/, '')
      .replace(/\|$/, '')
      .split('|')
      .map(c => stripFormatting(c).toLowerCase());

    const opIdx = headerCells.findIndex(h =>
      h === 'operation' || h === '`operation`' || h === 'op'
    );
    const scopeIdx = headerCells.findIndex(h => h === 'scope');
    const requiredIdx = headerCells.findIndex(h => h === 'required');
    const optionalIdx = headerCells.findIndex(h => h === 'optional');
    const notesIdx = headerCells.findIndex(h => h === 'notes');

    if (opIdx === -1) continue;

    const isFlowTable = headerCells.some(h =>
      h === 'step' || h === '#' || h === 'action' || h === 'user intent'
    );
    if (isFlowTable) continue;

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

      const opNames = rawOp.includes(',')
        ? rawOp.split(',').map(o => o.trim()).filter(Boolean)
        : [rawOp];

      for (const opName of opNames) {
        if (!opName.match(/^[a-z_]+$/)) continue;

        const entry: OperationEntry = {
          scope: scopeIdx !== -1 ? normalizeDashes(stripFormatting(cells[scopeIdx] || '')) : '',
          required: [],
          optional: [],
          notes: notesIdx !== -1 ? (cells[notesIdx] || '').trim() : '',
        };

        if (requiredIdx !== -1) {
          entry.required = parseParamList(cells[requiredIdx] || '');
        }
        if (optionalIdx !== -1) {
          entry.optional = parseParamList(cells[optionalIdx] || '');
        }

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

        const hasData = entry.scope || entry.required.length > 0 || entry.optional.length > 0;
        if (!hasData && requiredIdx === -1 && optionalIdx === -1 && scopeIdx === -1) continue;

        if (operations.has(opName)) {
          const existing = operations.get(opName)!;
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

function findSkillFiles(client: string): Map<string, string> {
  const skillsDir = join(REPO_ROOT, client, 'skills');
  if (!existsSync(skillsDir)) return new Map();

  const result = new Map<string, string>();
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

interface NormalizedEntry {
  scope: string;
  required: string[];
  optional: string[];
}

function normalizeEntry(entry: OperationEntry): NormalizedEntry {
  return {
    scope: normalizeDashes(entry.scope).toLowerCase().replace(/[()]/g, '').trim(),
    required: [...entry.required].sort(),
    optional: [...entry.optional].sort(),
  };
}

function entriesMatch(a: NormalizedEntry, b: NormalizedEntry): boolean {
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

  if (a.scope && b.scope) {
    const normalizeScope = (s: string) => s
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

// ─── Drift checker core ──────────────────────────────────────────────────────

interface DriftResult {
  driftCount: number;
  driftDetails: Array<{
    skill: string;
    operation: string;
    referenceClient: string;
    driftedClient: string;
  }>;
}

/**
 * Run the consistency check across a given ordered list of client bundles.
 * Returns drift count — should be 0 for consistent docs.
 */
function checkConsistency(bundleOrder: ClientBundle[]): DriftResult {
  // Collect all skills across the given clients (in the given order)
  const allSkills = new Map<string, Map<string, Map<string, OperationEntry>>>();

  for (const client of bundleOrder) {
    const skillFiles = findSkillFiles(client);
    for (const [slug, filePath] of skillFiles) {
      const content = readFileSync(filePath, 'utf-8');
      const operations = extractOperations(content);

      if (!allSkills.has(slug)) {
        allSkills.set(slug, new Map());
      }
      allSkills.get(slug)!.set(client, operations);
    }
  }

  let driftCount = 0;
  const driftDetails: DriftResult['driftDetails'] = [];

  for (const [slug, clientOps] of allSkills) {
    const allOps = new Set<string>();
    for (const [_client, ops] of clientOps) {
      for (const opName of ops.keys()) {
        allOps.add(opName);
      }
    }

    for (const opName of allOps) {
      const clientEntries: Array<{ client: string; entry: NormalizedEntry }> = [];
      for (const client of bundleOrder) {
        const ops = clientOps.get(client);
        if (!ops) continue;
        const entry = ops.get(opName);
        if (!entry) continue;
        clientEntries.push({ client, entry: normalizeEntry(entry) });
      }

      if (clientEntries.length <= 1) continue;

      const reference = clientEntries[0];
      for (let i = 1; i < clientEntries.length; i++) {
        const other = clientEntries[i];
        if (!entriesMatch(reference.entry, other.entry)) {
          driftCount++;
          driftDetails.push({
            skill: slug,
            operation: opName,
            referenceClient: reference.client,
            driftedClient: other.client,
          });
        }
      }
    }
  }

  return { driftCount, driftDetails };
}

// ─── Property Tests ──────────────────────────────────────────────────────────

describe('Property 17: Skill documentation cross-bundle consistency', () => {
  /**
   * **Validates: Requirements 9.7**
   *
   * For any permutation of the 6 client bundles, the consistency check
   * SHALL find zero drift — proving the documentation is order-independent
   * and identical across all bundles.
   */
  test('no drift for any permutation of client bundles', () => {
    // Generate arbitrary permutations of the 6 client bundles
    const bundleArrayArb = fc.shuffledSubarray([...CLIENT_BUNDLES], {
      minLength: CLIENT_BUNDLES.length,
      maxLength: CLIENT_BUNDLES.length,
    }) as fc.Arbitrary<ClientBundle[]>;

    fc.assert(
      fc.property(bundleArrayArb, (permutedBundles) => {
        const result = checkConsistency(permutedBundles);

        if (result.driftCount > 0) {
          const details = result.driftDetails.map(d =>
            `  ${d.skill}/${d.operation}: ${d.referenceClient} ≠ ${d.driftedClient}`
          ).join('\n');
          throw new Error(
            `Cross-bundle drift detected (${result.driftCount} inconsistencies) ` +
            `with bundle order [${permutedBundles.join(', ')}]:\n${details}`
          );
        }

        expect(result.driftCount).toBe(0);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * **Validates: Requirements 9.7**
   *
   * For any subset of at least 2 client bundles, the consistency check
   * SHALL find zero drift — proving no pair of bundles disagrees.
   */
  test('no drift for any subset of at least 2 client bundles', () => {
    // Generate arbitrary subsets of size >= 2 from the 6 client bundles
    const bundleSubsetArb = fc.shuffledSubarray([...CLIENT_BUNDLES], {
      minLength: 2,
      maxLength: CLIENT_BUNDLES.length,
    }) as fc.Arbitrary<ClientBundle[]>;

    fc.assert(
      fc.property(bundleSubsetArb, (bundleSubset) => {
        const result = checkConsistency(bundleSubset);

        if (result.driftCount > 0) {
          const details = result.driftDetails.map(d =>
            `  ${d.skill}/${d.operation}: ${d.referenceClient} ≠ ${d.driftedClient}`
          ).join('\n');
          throw new Error(
            `Cross-bundle drift detected (${result.driftCount} inconsistencies) ` +
            `with bundle subset [${bundleSubset.join(', ')}]:\n${details}`
          );
        }

        expect(result.driftCount).toBe(0);
      }),
      { numRuns: 100 }
    );
  });
});
