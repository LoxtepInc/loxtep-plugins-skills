# Loxtep for Kiro

Use the [Loxtep](https://loxtep.io) Customer MCP from [Kiro](https://kiro.dev): **16 grouped tools** (`loxtep_*`) with per-call **`operation`**, covering projects, workflows, data products, connectors, and more.

This directory lives in the [loxtep-plugins-skills](https://github.com/loxtepinc/loxtep-plugins-skills) repo under `kiro/`.

## Prerequisites

- **Node.js** 18+
- **Loxtep account** with `owner`, `org_admin`, or `developer` role (for MCP tool access)

## Install

1. **Add the Loxtep MCP server** to Kiro:
   - **Workspace:** Copy the contents of `mcp.json` into `.kiro/settings/mcp.json` in your project (create the file if needed), or merge the `loxtep` entry into your existing `mcpServers` object.
   - **User (global):** Copy into `~/.kiro/settings/mcp.json` so Loxtep is available in all workspaces.
   - See [Kiro MCP configuration](https://kiro.dev/docs/mcp/configuration) for locations and full options (e.g. `env`, `autoApprove`, `disabledTools`).

2. **Log in once** to save your Loxtep tokens:
   ```bash
   npx @loxtep/customer-mcp-server login
   ```
   Open the printed URL in your browser, sign in to Loxtep, and complete the OAuth flow.

3. **Use the tools** — Kiro's MCP panel lists `loxtep_projects`, `loxtep_workflows`, etc. Pass **`operation`** (flat action name) and the fields that action needs.

## What you get

- **Loxtep Customer MCP** — `npx @loxtep/customer-mcp-server` (grouped `loxtep_*` + `operation`; projects, workflows, data products, connectors, templates, catalog, schemas, and more).
- **Skills** — Story-first playbooks (see [docs/skills-user-stories.md](../docs/skills-user-stories.md)): `loxtep-auth`, `loxtep-instances`, `create-connector`, `data-workflows`, `discover-govern-lineage`, `org-semantics-quality`, `loxtep-analytics`, `loxtep-workspace`, `loxtep-process-intel`, `loxtep-procedures`, `loxtep-agent-workspace`, `loxtep-mcp-session`, `loxtep-sdk`. Each lives under `kiro/skills/<slug>/SKILL.md` with MCP mapping tables where applicable.

## Environment variables (optional)

- `LOXTEP_ENV` or `NODE_ENV` — Set to `dev` / `development` for dev app/API (`appdev.loxtep.io`, `apidev.loxtep.io`). Default is production.
- `LOXTEP_APP_URL` — Override app base URL for login.
- `LOXTEP_API_BASE_URL` — Override API endpoint.
- `LOXTEP_TOKEN_FILE` — Custom path to token file (default `~/.loxtep/customer-mcp.json`).

Add these under the `loxtep` server's `env` object in your MCP config if needed. See the [Customer MCP Server README](https://github.com/loxtepinc/loxtep/blob/main/platform-backend/_customer-mcp-server/README.md) for full details.

## License

MIT
