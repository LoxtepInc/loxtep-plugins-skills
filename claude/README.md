# Loxtep Claude Plugin

Claude Code and Claude Cowork plugin for the [Loxtep](https://loxtep.io) data mesh platform. The Customer MCP lists **19 grouped tools** (`loxtep_*`); each invocation sets **`operation`** to the flat action name plus parameters—covering projects, workflows, data products, connectors, and more.

This plugin lives in the [loxtep-plugins-skills](https://github.com/loxtepinc/loxtep-plugins-skills) repo under `claude/`.

## Prerequisites

- **Loxtep account** with `owner`, `org_admin`, or `developer` role (for MCP tool access)

## Quick start

1. **Install the plugin** in Claude Code or Claude Cowork (e.g. from Git: clone or install from `https://github.com/loxtepinc/loxtep-plugins-skills` and select the `claude/` directory as the plugin path, per your client's instructions).

2. **Or add manually** — merge the following into your `.claude/mcp.json`:

   ```json
   {
     "mcpServers": {
       "loxtep": {
         "url": "https://mcp.loxtep.io/ai/mcp/stream"
       }
     }
   }
   ```

3. **Connect** — On first use, Claude will open a browser window for OAuth login. Sign in to Loxtep and you're connected. Tokens refresh automatically.

4. **Use the tools** — You'll see grouped tools like `loxtep_projects` and `loxtep_connectors`. Each call includes **`operation`** (e.g. `list_projects`) plus that action's arguments.

> **Dev environment:** Replace the URL with `https://mcpdev.loxtep.io/ai/mcp/stream` to connect to the Loxtep dev instance.

## What's included

- **Loxtep Customer MCP** — hosted at `https://mcp.loxtep.io/ai/mcp/stream` (19 `loxtep_*` grouped tools with per-call `operation`; projects, workflows, data products, connectors, templates, catalog, schemas, and more).
- **Skills** — Story-first playbooks (see [docs/skills-user-stories.md](../docs/skills-user-stories.md)): `create-connector`, `data-product-modeling`, `data-workflows`, `discover-govern-lineage`, `loxtep-agent-workspace`, `loxtep-analytics`, `loxtep-auth`, `loxtep-instances`, `loxtep-mcp-session`, `loxtep-ontology`, `loxtep-procedures`, `loxtep-process-intel`, `loxtep-sdk`, `loxtep-semantic-layer`, `loxtep-workspace`, `org-semantics-quality`, `semantic-ontology-mapping`. Each lives under `claude/skills/<slug>/SKILL.md` with MCP mapping tables where applicable.

## Submission (Claude plugin discovery)

If you submit this plugin to Anthropic's plugin directory or marketplace, use the repository URL and the `claude/` path as the plugin root. Follow [Claude Code plugins](https://code.claude.com/docs/en/plugins-reference) and [Claude plugin discovery](https://code.claude.com/en/discover-plugins) for current requirements.

## License

MIT
