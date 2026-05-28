# Loxtep Cursor Plugin

Cursor plugin for the [Loxtep](https://loxtep.io) data mesh platform. The Customer MCP exposes **16 grouped tools** (`loxtep_projects`, `loxtep_workflows`, …); each call uses **`operation`** plus arguments (many actions total across those groups). Use it from Cursor to manage projects, workflows, data products, connections, templates, and more.

This plugin lives in the [loxtep-plugins-skills](https://github.com/loxtepinc/loxtep-plugins-skills) repo under `cursor/`. For Cursor Marketplace or “install from Git”, use the repo URL and select the `cursor/` path if your client supports subpaths.

## Prerequisites

- **Node.js** 18+
- **Loxtep account** with `owner`, `org_admin`, or `developer` role (for MCP tool access)

## Quick start

1. **Install the plugin** in Cursor (Settings → Plugins → Install from Git; use `https://github.com/loxtepinc/loxtep-plugins-skills` and `cursor/` as the plugin path if supported).
2. **Log in once** to save your Loxtep tokens:
   ```bash
   npx @loxtep/customer-mcp-server login
   ```
   Open the printed URL in your browser, sign in to Loxtep, and complete the OAuth flow.
3. **Use the tools** — In the MCP palette you’ll see names like `loxtep_projects` and `loxtep_connectors`. Pass **`operation`** (e.g. `list_projects`, `create_connector`) and the fields that action needs.

## What's included

- **Loxtep Customer MCP** — `npx @loxtep/customer-mcp-server` (grouped `loxtep_*` tools + `operation`; projects, workflows, data products, connectors, templates, catalog, schemas, and more).
- **Auth rule** — If a tool fails with "No valid authentication token", the agent is guided to run the login command.
- **Skills** — Same set as Claude (parity): [docs/skills-user-stories.md](../docs/skills-user-stories.md). Slugs: `loxtep-auth`, `loxtep-instances`, `create-connector`, `data-workflows`, `discover-govern-lineage`, `org-semantics-quality`, `loxtep-analytics`, `loxtep-workspace`, `loxtep-process-intel`, `loxtep-procedures`, `loxtep-agent-workspace` under `cursor/skills/<slug>/SKILL.md`.

## Environment variables (optional)

- `LOXTEP_ENV` or `NODE_ENV` — Set to `dev` / `development` for dev app/API (`appdev.loxtep.io`, `apidev.loxtep.io`). Default is production.
- `LOXTEP_APP_URL` — Override app base URL for login.
- `LOXTEP_API_BASE_URL` — Override API endpoint.
- `LOXTEP_TOKEN_FILE` — Custom path to token file (default `~/.loxtep/customer-mcp.json`).

See the [Customer MCP Server README](https://github.com/loxtepinc/loxtep/blob/main/platform-backend/_customer-mcp-server/README.md) for full details.

## Submission (Cursor Marketplace)

Before submitting at [cursor.com/marketplace/publish](https://cursor.com/marketplace/publish): ensure valid manifest, relative paths, README, logo, and frontmatter on rules/skills. Submit the repository URL; if the marketplace supports a plugin subpath, specify `cursor/`. Plugins are manually reviewed.

## License

MIT
