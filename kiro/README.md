# Loxtep for Kiro

Use the [Loxtep](https://loxtep.io) Customer MCP from [Kiro](https://kiro.dev): **16 grouped tools** (`loxtep_*`) with per-call **`operation`**, covering projects, workflows, data products, connectors, and more.

This directory lives in the [loxtep-plugins-skills](https://github.com/loxtepinc/loxtep-plugins-skills) repo under `kiro/`.

## Prerequisites

- **Loxtep account** with `owner`, `org_admin`, or `developer` role (for MCP tool access)

## Install

1. **Add the Loxtep MCP server** to Kiro:
   - **Workspace:** Copy the contents of `mcp.json` into `.kiro/settings/mcp.json` in your project (create the file if needed), or merge the `loxtep` entry into your existing `mcpServers` object.
   - **User (global):** Copy into `~/.kiro/settings/mcp.json` so Loxtep is available in all workspaces.

   ```json
   {
     "mcpServers": {
       "loxtep": {
         "url": "https://mcp.loxtep.io/ai/mcp/stream"
       }
     }
   }
   ```

2. **Connect** — On first use, Kiro will open a browser window for OAuth login. Sign in to Loxtep and you're connected. Tokens refresh automatically.

3. **Use the tools** — Kiro's MCP panel lists `loxtep_projects`, `loxtep_workflows`, etc. Pass **`operation`** (flat action name) and the fields that action needs.

> **Dev environment:** Replace the URL with `https://mcpdev.loxtep.io/ai/mcp/stream` to connect to the Loxtep dev instance.

## What you get

- **Loxtep Customer MCP** — hosted at `https://mcp.loxtep.io/ai/mcp/stream` (grouped `loxtep_*` + `operation`; projects, workflows, data products, connectors, templates, catalog, schemas, and more).
- **Skills** — Story-first playbooks (see [docs/skills-user-stories.md](../docs/skills-user-stories.md)): `loxtep-auth`, `loxtep-instances`, `create-connector`, `data-workflows`, `discover-govern-lineage`, `org-semantics-quality`, `loxtep-analytics`, `loxtep-workspace`, `loxtep-process-intel`, `loxtep-procedures`, `loxtep-agent-workspace`, `loxtep-mcp-session`, `loxtep-sdk`. Each lives under `kiro/skills/<slug>/SKILL.md` with MCP mapping tables where applicable.

## License

MIT
