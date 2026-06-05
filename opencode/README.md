# Loxtep for OpenCode

Use the [Loxtep](https://loxtep.io) Customer MCP from [OpenCode](https://opencode.ai): **19 grouped tools** (`loxtep_*`) with per-call **`operation`**, covering projects, workflows, data products, connectors, and more.

This directory lives in the [loxtep-plugins-skills](https://github.com/loxtepinc/loxtep-plugins-skills) repo under `opencode/`.

## Prerequisites

- **OpenCode** installed ([opencode.ai/docs](https://opencode.ai/docs))
- **Loxtep account** with `owner`, `org_admin`, or `developer` role (for MCP tool access)

## Install

### 1. Add the Loxtep MCP server

Add the Loxtep server to your OpenCode MCP configuration. In your project's `opencode.json` (or global config):

```json
{
  "mcp": {
    "loxtep": {
      "type": "http",
      "url": "https://mcp.loxtep.io/ai/mcp/stream"
    }
  }
}
```

### 2. Install skills

Copy the `skills/` directory into your project:

```bash
# Project-local (recommended)
cp -r opencode/skills/ .opencode/skills/

# Or global (available in all projects)
cp -r opencode/skills/ ~/.config/opencode/skills/
```

OpenCode also discovers skills from `.claude/skills/` and `.agents/skills/` paths, so the Claude or agents versions in this repo work too.

### 3. Connect

On first use, OpenCode will open a browser window for OAuth login. Sign in to Loxtep and you're connected. Tokens refresh automatically.

### 4. Use the tools

OpenCode's agent will discover the `loxtep_*` tools and the skills automatically. Skills are loaded on-demand via the native `skill` tool — the agent sees available skills and loads the full content when needed.

> **Dev environment:** Replace the URL with `https://mcpdev.loxtep.io/ai/mcp/stream` to connect to the Loxtep dev instance.

## What you get

- **Loxtep Customer MCP** — hosted at `https://mcp.loxtep.io/ai/mcp/stream` (grouped `loxtep_*` + `operation`; projects, workflows, data products, connectors, templates, catalog, schemas, and more).
- **Skills** — Story-first playbooks (see [docs/skills-user-stories.md](../docs/skills-user-stories.md)):

| Skill | Description |
|-------|-------------|
| `create-connector` | Connect SaaS/APIs (OAuth, API key, SDK connectors) |
| `data-product-modeling` | Model source/consumer data products |
| `data-workflows` | Projects, workflows, connections, data products, consumptions |
| `discover-govern-lineage` | Catalog search, lineage, evidence, governance |
| `loxtep-agent-workspace` | Agent orchestration (issues, goals, agents) |
| `loxtep-analytics` | SQL analytics via DuckDB |
| `loxtep-auth` | Authentication recovery for MCP token errors |
| `loxtep-instances` | Runtime instance provisioning (shared/managed/self-hosted) |
| `loxtep-mcp-session` | Session, capabilities, and permission checks |
| `loxtep-ontology` | Ontology, vocabulary, namespaces |
| `loxtep-procedures` | Business procedures and process graph |
| `loxtep-process-intel` | Entity context, decision traces |
| `loxtep-sdk` | Node SDK bootstrap, stream bus, queue/bot resolution |
| `loxtep-workspace` | Versions, snapshots, restore, reindex, queue info |
| `org-semantics-quality` | Schemas, PII tagging, quality rules |
| `semantic-ontology-mapping` | Mapping external vocabularies to the ontology |

## Skill permissions (optional)

Control which skills agents can access in `opencode.json`:

```json
{
  "permission": {
    "skill": {
      "loxtep-*": "allow",
      "create-connector": "allow",
      "data-workflows": "allow",
      "discover-govern-lineage": "allow",
      "org-semantics-quality": "allow"
    }
  }
}
```

## License

MIT
