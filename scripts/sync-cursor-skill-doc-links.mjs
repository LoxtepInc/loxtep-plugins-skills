#!/usr/bin/env node
/**
 * Ensures each Cursor plugin skill has metadata.documentation pointing at its
 * GitHub blob URL. Cursor uses this (and plugin homepage) to link skills from
 * the marketplace UI instead of falling back to repo issue search.
 *
 * Usage:
 *   node scripts/sync-cursor-skill-doc-links.mjs
 *   node scripts/sync-cursor-skill-doc-links.mjs --check
 */

import { readFileSync, readdirSync, statSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = dirname(__dirname);
const SKILLS_DIR = join(REPO_ROOT, 'cursor', 'skills');
const DOC_BASE =
  'https://github.com/LoxtepInc/loxtep-plugins-skills/blob/main/cursor/skills';
const CHECK_ONLY = process.argv.includes('--check');

function listSkillFiles() {
  const entries = readdirSync(SKILLS_DIR);
  const files = [];
  for (const entry of entries) {
    const skillDir = join(SKILLS_DIR, entry);
    if (!statSync(skillDir).isDirectory()) continue;
    const skillFile = join(skillDir, 'SKILL.md');
    if (existsSync(skillFile)) {
      files.push({ slug: entry, path: skillFile });
    }
  }
  return files.sort((a, b) => a.slug.localeCompare(b.slug));
}

function expectedDocumentationUrl(slug) {
  return `${DOC_BASE}/${slug}/SKILL.md`;
}

function upsertDocumentationFrontmatter(content, slug) {
  const expectedUrl = expectedDocumentationUrl(slug);
  const normalized = content.replace(/\r\n/g, '\n');

  if (!normalized.startsWith('---\n')) {
    throw new Error(`Missing YAML frontmatter: ${slug}`);
  }

  const closingIndex = normalized.indexOf('\n---\n', 4);
  if (closingIndex === -1) {
    throw new Error(`Unclosed YAML frontmatter: ${slug}`);
  }

  const frontmatter = normalized.slice(4, closingIndex);
  const body = normalized.slice(closingIndex + 5);
  const docLine = `  documentation: ${expectedUrl}`;

  if (/^metadata:\s*$/m.test(frontmatter)) {
    if (/^\s+documentation:\s+/m.test(frontmatter)) {
      const updatedFrontmatter = frontmatter.replace(
        /^\s+documentation:\s+.*$/m,
        docLine,
      );
      if (updatedFrontmatter === frontmatter) {
        return { changed: false, content };
      }
      return {
        changed: true,
        content: `---\n${updatedFrontmatter}\n---\n${body}`,
      };
    }

    const metadataIndex = frontmatter.indexOf('metadata:');
    const before = frontmatter.slice(0, metadataIndex + 'metadata:'.length);
    const after = frontmatter.slice(metadataIndex + 'metadata:'.length);
    const updatedFrontmatter = `${before}\n${docLine}${after}`;
    return {
      changed: true,
      content: `---\n${updatedFrontmatter}\n---\n${body}`,
    };
  }

  const updatedFrontmatter = `${frontmatter}\nmetadata:\n${docLine}`;
  return {
    changed: true,
    content: `---\n${updatedFrontmatter}\n---\n${body}`,
  };
}

function main() {
  const skillFiles = listSkillFiles();
  const errors = [];
  let changedCount = 0;

  for (const { slug, path } of skillFiles) {
    const original = readFileSync(path, 'utf8');
    const expectedUrl = expectedDocumentationUrl(slug);

    try {
      const { changed, content } = upsertDocumentationFrontmatter(original, slug);

      if (original.includes('metadata:') && !content.includes(expectedUrl)) {
        errors.push(`${slug}: failed to set metadata.documentation`);
        continue;
      }

      if (changed) {
        changedCount += 1;
        if (!CHECK_ONLY) {
          writeFileSync(path, content, 'utf8');
        }
      }
    } catch (error) {
      errors.push(`${slug}: ${error.message}`);
    }
  }

  if (errors.length > 0) {
    console.error('Cursor skill documentation link sync failed:\n');
    for (const err of errors) console.error(`  - ${err}`);
    process.exit(1);
  }

  if (CHECK_ONLY && changedCount > 0) {
    console.error(
      `Cursor skill documentation links are out of date (${changedCount} skill(s)). Run: node scripts/sync-cursor-skill-doc-links.mjs`,
    );
    process.exit(1);
  }

  if (changedCount === 0) {
    console.log(`Cursor skill documentation links OK (${skillFiles.length} skills).`);
    process.exit(0);
  }

  console.log(`Updated metadata.documentation on ${changedCount} Cursor skill(s).`);
}

main();
