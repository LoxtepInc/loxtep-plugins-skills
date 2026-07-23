#!/usr/bin/env node
/**
 * Splice generated MCP tool tables into AGENTS.md from loxtep/docs/mcp/mcp_tool_list.md.
 *
 * Usage: node scripts/generate-agents-mcp-section.mjs [--check]
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const AGENTS = path.join(REPO_ROOT, 'AGENTS.md');
const MCP_LIST = path.resolve(
  REPO_ROOT,
  '../loxtep/docs/mcp/mcp_tool_list.md'
);

const START = '## MCP tool surface';
const END = '## Skills (scoped agent access)';

function buildSection(mcpListContent) {
  const facadesStart = mcpListContent.indexOf('## MCP tools');
  if (facadesStart === -1) {
    throw new Error('Could not find ## MCP tools in mcp_tool_list.md');
  }
  const facadesBody = mcpListContent.slice(facadesStart).replace(/^## MCP tools\n\n/, '');

  return `${START}

All tools require OAuth auth. The hosted server registers **10 \`loxtep_*\` MCP tools**.
Each call sets \`operation\` to the flat action name plus that action's arguments.

\`\`\`json
{ "operation": "get_current_user" }
\`\`\`

Tables below are generated from \`platform-backend/ai/lib/tools/mcp-facades.ts\` in the loxtep monorepo.
Regenerate: \`node scripts/generate-agents-mcp-section.mjs\` (after \`node platform-backend/ai/scripts/generate-mcp-tool-list.mjs\` in loxtep).

## MCP tools

${facadesBody}`;
}

function spliceAgents(newSection) {
  const agents = fs.readFileSync(AGENTS, 'utf8');
  const startIdx = agents.indexOf(START);
  const endIdx = agents.indexOf(END);
  if (startIdx === -1 || endIdx === -1 || endIdx <= startIdx) {
    throw new Error('AGENTS.md markers not found');
  }
  return agents.slice(0, startIdx) + newSection + '\n\n---\n\n' + agents.slice(endIdx);
}

const check = process.argv.includes('--check');
if (!fs.existsSync(MCP_LIST)) {
  console.error(`✗ Missing ${MCP_LIST} — run generate-mcp-tool-list.mjs in loxtep first.`);
  process.exit(check ? 1 : 0);
}

const mcpList = fs.readFileSync(MCP_LIST, 'utf8');
const section = buildSection(mcpList);
const next = spliceAgents(section);

if (check) {
  const existing = fs.readFileSync(AGENTS, 'utf8');
  if (existing !== next) {
    console.error('✗ AGENTS.md MCP section out of date. Run: node scripts/generate-agents-mcp-section.mjs');
    process.exit(1);
  }
  console.error('✓ AGENTS.md MCP section is current.');
} else {
  fs.writeFileSync(AGENTS, next);
  console.error('✓ Updated AGENTS.md MCP section from mcp_tool_list.md');
}
