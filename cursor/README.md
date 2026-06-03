# Loxtep Cursor Plugin

Cursor plugin for the [Loxtep](https://loxtep.io) data mesh platform. The Customer MCP exposes **16 grouped tools** (`loxtep_projects`, `loxtep_workflows`, …); each call uses **`operation`** plus arguments (many actions total across those groups). Use it from Cursor to manage projects, workflows, data products, connections, templates, and more.

This plugin lives in the [loxtep-plugins-skills](https://github.com/loxtepinc/loxtep-plugins-skills) repo under `cursor/`. For Cursor Marketplace or "install from Git", use the repo URL and select the `cursor/` path if your client supports subpaths.

## Prerequisites

- **Loxtep account** with `owner`, `org_admin`, or `developer` role (for MCP tool access)

## Quick start

1. **Install the plugin** in Cursor (Settings → Plugins → Install from Git; use `https://github.com/loxtepinc/loxtep-plugins-skills` and `cursor/` as the plugin path if supported).

2. **Or add manually** — merge the following into your `.cursor/mcp.json` or project `.mcp.json`:

   ```json
   {
     "mcpServers": {
       "loxtep": {
         "url": "https://mcp.loxtep.io/ai/mcp/stream"
       }
     }
   }
   ```

3. **Connect** — On first use, Cursor will open a browser window for OAuth login. Sign in to Loxtep and you're connected. Tokens refresh automatically.

4. **Use the tools** — In the MCP palette you'll see names like `loxtep_projects` and `loxtep_connectors`. Pass **`operation`** (e.g. `list_projects`, `create_connector`) and the fields that action needs.

> **Dev environment:** Replace the URL with `https://mcpdev.loxtep.io/ai/mcp/stream` to connect to the Loxtep dev instance.

## What's included

- **Loxtep Customer MCP** — hosted at `https://mcp.loxtep.io/ai/mcp/stream` (grouped `loxtep_*` tools + `operation`; projects, workflows, data products, connectors, templates, catalog, schemas, and more).
- **Auth rule** — If a tool fails with "No valid authentication token", the agent is guided to re-authenticate.
- **Skills** — Same set as Claude (parity): [docs/skills-user-stories.md](../docs/skills-user-stories.md). Slugs: `loxtep-auth`, `loxtep-instances`, `create-connector`, `data-workflows`, `discover-govern-lineage`, `org-semantics-quality`, `loxtep-analytics`, `loxtep-workspace`, `loxtep-process-intel`, `loxtep-procedures`, `loxtep-agent-workspace` under `cursor/skills/<slug>/SKILL.md`.

## Submission (Cursor Marketplace)

Before submitting at [cursor.com/marketplace/publish](https://cursor.com/marketplace/publish): ensure valid manifest, relative paths, README, logo, and frontmatter on rules/skills. Submit the repository URL; if the marketplace supports a plugin subpath, specify `cursor/`. Plugins are manually reviewed.

## License

MIT
