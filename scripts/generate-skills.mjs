#!/usr/bin/env node
// Generates every tool-specific skill file (SKILL.md per tool, kiro steering
// docs, and claude/cursor .mdc rules) from the canonical source under
// skills/<slug>/. See CONTRIBUTING.md for the authoring model.
//
// Usage:
//   node scripts/generate-skills.mjs          # write generated files
//   node scripts/generate-skills.mjs --check  # verify no drift, exit 1 on mismatch

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TOOLS = ['claude', 'cursor', 'codex', 'kiro', 'opencode', 'antigravity'];
const REPO_URL_BASE =
  'https://github.com/LoxtepInc/loxtep-plugins-skills/blob/main';
const GENERATED_HEADER =
  '<!-- GENERATED FILE -- edit skills/<slug>/SKILL.md (or rule.mdc.src.md) and run `node scripts/generate-skills.mjs` -- do not edit directly -->';

const CHECK = process.argv.includes('--check');

const SKILLS_DIR = path.join(ROOT, 'skills');
const LOXTEP_SKILLS_DIR = path.join(ROOT, '.loxtep', 'skills');
const RULE_TARGETS_PATH = path.join(SKILLS_DIR, 'rule-targets.json');

const errors = [];
const plannedWrites = new Map(); // absPath -> content
const problems = [];

function fail(msg) {
  problems.push(msg);
}

// ---------------------------------------------------------------------------
// Minimal frontmatter parser/serializer for this repo's bounded YAML dialect:
// flat scalars, folded multi-line plain scalars (no block indicators), and
// one/two-level nested objects with string/boolean leaves. Not a general
// YAML parser -- canonical sources are hand-authored to this exact shape.
// ---------------------------------------------------------------------------

function splitFrontmatter(raw) {
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!m) throw new Error('missing frontmatter block (--- ... ---)');
  return { fmText: m[1], body: m[2] };
}

function indentOf(line) {
  return line.match(/^ */)[0].length;
}

function coerceScalar(s) {
  if (s === 'true') return true;
  if (s === 'false') return false;
  return s;
}

function parseFrontmatter(fmText) {
  const lines = fmText.split(/\r?\n/);
  let i = 0;

  function parseBlock(minIndent) {
    const obj = {};
    while (i < lines.length) {
      const line = lines[i];
      if (line.trim() === '') {
        i++;
        continue;
      }
      const ind = indentOf(line);
      if (ind < minIndent) break;
      const m = line.match(/^ *([A-Za-z_][A-Za-z0-9_]*):[ \t]?(.*)$/);
      if (!m) throw new Error(`unparseable frontmatter line: ${JSON.stringify(line)}`);
      const [, key, rest] = m;
      i++;
      if (/^[|>][-+]?$/.test(rest.trim())) {
        // YAML block scalar (literal `|` or folded `>`) -- preserve newlines
        const blockLines = [];
        while (i < lines.length && (lines[i].trim() === '' || indentOf(lines[i]) > ind)) {
          blockLines.push(lines[i].trim() === '' ? '' : lines[i].slice(ind + 2));
          i++;
        }
        while (blockLines.length && blockLines[blockLines.length - 1] === '') blockLines.pop();
        obj[key] = { __blockStyle: rest.trim()[0], text: blockLines.join('\n') };
        continue;
      }
      if (rest.trim() !== '') {
        obj[key] = coerceScalar(rest.trim());
        continue;
      }
      if (i >= lines.length || lines[i].trim() === '') {
        obj[key] = '';
        continue;
      }
      const nextIndent = indentOf(lines[i]);
      const isNested =
        /^ *[A-Za-z_][A-Za-z0-9_]*:[ \t]?/.test(lines[i]) && nextIndent > ind;
      if (isNested) {
        obj[key] = parseBlock(nextIndent);
      } else {
        const parts = [];
        while (i < lines.length && lines[i].trim() !== '' && indentOf(lines[i]) > ind) {
          parts.push(lines[i].trim());
          i++;
        }
        obj[key] = parts.join(' ');
      }
    }
    return obj;
  }

  return parseBlock(0);
}

// Renders `key: value` on one line if short enough, else `key:` followed by
// 2-space-indented word-wrapped continuation lines (matches existing style).
// A block-scalar value ({ __blockStyle, text }) is re-emitted as `key: |`
// with its original line breaks preserved verbatim.
function wrapScalarBlock(key, value, indent = 0) {
  const prefix = ' '.repeat(indent);
  if (value && typeof value === 'object' && value.__blockStyle) {
    const contIndent = ' '.repeat(indent + 2);
    const lines = [`${prefix}${key}: ${value.__blockStyle}`];
    for (const l of value.text.split('\n')) lines.push(l === '' ? '' : `${contIndent}${l}`);
    return lines;
  }
  const text = value;
  const singleLine = `${prefix}${key}: ${text}`;
  if (singleLine.length <= 100) return [singleLine];

  const words = String(text).split(/\s+/);
  const lines = [`${prefix}${key}:`];
  const contIndent = ' '.repeat(indent + 2);
  let cur = contIndent;
  for (const w of words) {
    const candidate = cur.trim() ? `${cur} ${w}` : `${cur}${w}`;
    if (candidate.length > 80 && cur.trim()) {
      lines.push(cur);
      cur = `${contIndent}${w}`;
    } else {
      cur = candidate;
    }
  }
  if (cur.trim()) lines.push(cur);
  return lines;
}

function mergePerTool(fm, tool) {
  const perTool = fm.perTool || {};
  const override = perTool[tool] || {};
  const merged = { ...fm, ...override };
  delete merged.perTool;
  return merged;
}

function emitSkillFrontmatter(fm, tool, slug) {
  const merged = mergePerTool(fm, tool);
  const lines = ['---', `name: ${merged.name}`];
  lines.push(...wrapScalarBlock('description', merged.description));
  if (merged.license) lines.push(`license: ${merged.license}`);
  if (merged.compatibility) lines.push(`compatibility: ${merged.compatibility}`);
  if (merged.trigger) lines.push(...wrapScalarBlock('trigger', merged.trigger));

  const meta = { ...(merged.metadata || {}) };
  meta.documentation = `${REPO_URL_BASE}/${tool}/skills/${slug}/SKILL.md`;
  lines.push('metadata:');
  for (const [k, v] of Object.entries(meta)) lines.push(`  ${k}: ${v}`);

  lines.push('---');
  return lines.join('\n');
}

function emitRuleFrontmatter(fm, tool) {
  const merged = mergePerTool(fm, tool);
  const lines = ['---'];
  lines.push(...wrapScalarBlock('description', merged.description));
  if (merged.globs) lines.push(`globs: ${merged.globs}`);
  if ('alwaysApply' in merged) lines.push(`alwaysApply: ${merged.alwaysApply}`);
  lines.push('---');
  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Conditional block rendering: <!-- tool:X,Y --> ... <!-- /tool --> and
// <!-- tool:!X --> ... <!-- /tool -->, plus <!-- steering:omit --> ... <!-- /steering -->
// (only stripped when rendering the kiro steering variant). Flat, no nesting.
// ---------------------------------------------------------------------------

function renderBody(body, tool, { forSteering = false } = {}) {
  const lines = body.split(/\r?\n/);
  const out = [];
  let skipping = false;
  let steeringSkipping = false;

  for (const line of lines) {
    const toolOpen = line.match(/^<!--\s*tool:([^-]+?)\s*-->\s*$/);
    const toolClose = line.match(/^<!--\s*\/tool\s*-->\s*$/);
    const steeringOpen = /^<!--\s*steering:omit\s*-->\s*$/.test(line);
    const steeringClose = /^<!--\s*\/steering\s*-->\s*$/.test(line);

    if (toolOpen) {
      const spec = toolOpen[1].split(',').map((s) => s.trim());
      for (const s of spec) {
        const name = s.startsWith('!') ? s.slice(1) : s;
        if (!TOOLS.includes(name)) fail(`unknown tool name in conditional block: "${s}"`);
      }
      const matches = spec.some((s) =>
        s.startsWith('!') ? s.slice(1) !== tool : s === tool
      );
      skipping = !matches;
      continue;
    }
    if (toolClose) {
      skipping = false;
      continue;
    }
    if (forSteering && steeringOpen) {
      steeringSkipping = true;
      continue;
    }
    if (forSteering && steeringClose) {
      steeringSkipping = false;
      continue;
    }
    if (!forSteering && (steeringOpen || steeringClose)) {
      // markers are steering-only; drop them from non-steering output
      continue;
    }
    if (skipping || steeringSkipping) continue;
    out.push(line);
  }
  return out.join('\n');
}

// ---------------------------------------------------------------------------
// Scope-block injection: <!-- SCOPE_BLOCK --> placeholder is replaced with a
// rendering of .loxtep/skills/<slug>.yaml (sole source), or removed with an
// error in --check mode if the placeholder exists without a matching yaml.
// ---------------------------------------------------------------------------

function renderScopeBlock(slug) {
  const yamlPath = path.join(LOXTEP_SKILLS_DIR, `${slug}.yaml`);
  if (!fs.existsSync(yamlPath)) return null;
  const yamlContent = fs.readFileSync(yamlPath, 'utf8').trimEnd();
  return [
    '<!-- BEGIN loxtep skill-scope (skill-package-v1) -->',
    '',
    `## Agent-Scope Skill scope (\`.loxtep/skills/${slug}.yaml\`)`,
    '',
    'Resource scope and operation permissions for this Agent-Scope Skill, conformant',
    'with the [`skill-package-v1`](https://loxtep.io/schemas/skill-package-v1.json)',
    'schema. Any resource type or operation not listed is **denied (fail-closed)**.',
    'Identifier lists are empty placeholders — fill them with the specific resources',
    'in your workspace. This declaration does not change the hosted MCP config',
    '(`mcp.loxtep.io`).',
    '',
    '```yaml',
    yamlContent,
    '```',
    '',
    '<!-- END loxtep skill-scope (skill-package-v1) -->',
  ].join('\n');
}

function injectScopeBlock(body, slug) {
  const hasPlaceholder = body.includes('<!-- SCOPE_BLOCK -->');
  const block = renderScopeBlock(slug);
  if (!hasPlaceholder) {
    if (block) {
      fail(
        `${slug}: .loxtep/skills/${slug}.yaml exists but skills/${slug}/SKILL.md has no <!-- SCOPE_BLOCK --> placeholder`
      );
    }
    return body;
  }
  if (!block) {
    fail(
      `${slug}: skills/${slug}/SKILL.md has a <!-- SCOPE_BLOCK --> placeholder but .loxtep/skills/${slug}.yaml does not exist`
    );
    return body.replaceAll('<!-- SCOPE_BLOCK -->', '');
  }
  return body.replaceAll('<!-- SCOPE_BLOCK -->', block);
}

// ---------------------------------------------------------------------------
// Discover canonical skills
// ---------------------------------------------------------------------------

function listSlugs() {
  if (!fs.existsSync(SKILLS_DIR)) return [];
  return fs
    .readdirSync(SKILLS_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort();
}

function loadRuleTargets() {
  if (!fs.existsSync(RULE_TARGETS_PATH)) return {};
  return JSON.parse(fs.readFileSync(RULE_TARGETS_PATH, 'utf8'));
}

// ---------------------------------------------------------------------------
// Generate
// ---------------------------------------------------------------------------

const slugs = listSlugs();
const ruleTargets = loadRuleTargets();

for (const slug of slugs) {
  const skillPath = path.join(SKILLS_DIR, slug, 'SKILL.md');
  if (!fs.existsSync(skillPath)) {
    fail(`skills/${slug}/ has no SKILL.md`);
    continue;
  }
  const raw = fs.readFileSync(skillPath, 'utf8');
  let fm, body;
  try {
    const split = splitFrontmatter(raw);
    fm = parseFrontmatter(split.fmText);
    body = split.body.replace(/^\n+/, '').replace(/\n+$/, '') + '\n';
  } catch (e) {
    fail(`skills/${slug}/SKILL.md: ${e.message}`);
    continue;
  }

  for (const tool of TOOLS) {
    const frontmatter = emitSkillFrontmatter(fm, tool, slug);
    let renderedBody = renderBody(body, tool);
    renderedBody = injectScopeBlock(renderedBody, slug);
    const out = `${GENERATED_HEADER}\n${frontmatter}\n\n${renderedBody}`;
    plannedWrites.set(path.join(ROOT, tool, 'skills', slug, 'SKILL.md'), out);
  }

  // kiro steering doc (all slugs, per confirmed decision -- no allowlist)
  {
    let steeringBody = renderBody(body, 'kiro', { forSteering: true });
    steeringBody = injectScopeBlock(steeringBody, slug);
    const out = `${GENERATED_HEADER}\n\n${steeringBody}`;
    plannedWrites.set(path.join(ROOT, 'kiro', 'power', 'steering', `${slug}.md`), out);
  }

  // optional .mdc rule rendition
  const rulePath = path.join(SKILLS_DIR, slug, 'rule.mdc.src.md');
  if (fs.existsSync(rulePath)) {
    const ruleFileName = ruleTargets[slug];
    if (!ruleFileName) {
      fail(`skills/${slug}/rule.mdc.src.md exists but skills/rule-targets.json has no entry for "${slug}"`);
    } else {
      const ruleRaw = fs.readFileSync(rulePath, 'utf8');
      const { fmText, body: ruleBodyRaw } = splitFrontmatter(ruleRaw);
      const ruleFm = parseFrontmatter(fmText);
      const ruleBody = ruleBodyRaw.replace(/^\n+/, '').replace(/\n+$/, '') + '\n';
      for (const tool of TOOLS) {
        const rulesDir = path.join(ROOT, tool, 'rules');
        if (!fs.existsSync(rulesDir)) continue; // only tools with a rules/ dir today
        const frontmatter = emitRuleFrontmatter(ruleFm, tool);
        const renderedBody = renderBody(ruleBody, tool);
        const out = `${GENERATED_HEADER}\n${frontmatter}\n\n${renderedBody}`;
        plannedWrites.set(path.join(rulesDir, ruleFileName), out);
      }
    }
  }
}

// orphan detection: generated-output SKILL.md dirs with no canonical source
for (const tool of TOOLS) {
  const dir = path.join(ROOT, tool, 'skills');
  if (!fs.existsSync(dir)) continue;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    if (!slugs.includes(entry.name)) {
      fail(`${tool}/skills/${entry.name}/ has no corresponding skills/${entry.name}/ canonical source`);
    }
  }
}

if (problems.length > 0) {
  console.error('generate-skills: found problems:\n');
  for (const p of problems) console.error(`  - ${p}`);
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Write or check
// ---------------------------------------------------------------------------

let drift = false;
for (const [absPath, content] of plannedWrites) {
  const existing = fs.existsSync(absPath) ? fs.readFileSync(absPath, 'utf8') : null;
  if (existing === content) continue;
  drift = true;
  if (CHECK) {
    console.error(`DRIFT: ${path.relative(ROOT, absPath)}`);
  } else {
    fs.mkdirSync(path.dirname(absPath), { recursive: true });
    fs.writeFileSync(absPath, content, 'utf8');
    console.log(`wrote ${path.relative(ROOT, absPath)}`);
  }
}

if (CHECK) {
  if (drift) {
    console.error('\ngenerate-skills --check: drift detected. Run `node scripts/generate-skills.mjs` and commit the result.');
    process.exit(1);
  }
  console.log('generate-skills --check: no drift.');
} else if (!drift) {
  console.log('generate-skills: nothing to do (already up to date).');
}
