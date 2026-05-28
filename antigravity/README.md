# Loxtep for Antigravity IDE

Use the [Loxtep](https://loxtep.io) Customer MCP from [Google Antigravity IDE](https://antigravity.chat): **16 grouped tools** (`loxtep_*`) with **`operation`** per call—projects, workflows, data products, connectors, and more.

This directory lives in the [loxtep-plugins-skills](https://github.com/loxtepinc/loxtep-plugins-skills) repo under `antigravity/`.

## Prerequisites

- **Node.js** 18+
- **Loxtep account** with `owner`, `org_admin`, or `developer` role (for MCP tool access)

## Install

1. **Add the Loxtep MCP server** in Antigravity:
   - Open the "..." dropdown at the top of the Agent panel.
   - Select **Manage MCP Servers** (or open the MCP Store).
   - Click **View raw config** to open your `mcp_config.json`.
   - Add the `loxtep` entry from `mcp_config.json` in this repo into your `mcpServers` object (or merge the full contents if the file is empty).
   - Save and refresh so the server loads.
   - See [Appwrite’s Antigravity MCP doc](https://appwrite.io/docs/tooling/mcp/antigravity) for the same config pattern.

2. **Log in once** to save your Loxtep tokens:
   ```bash
   npx @loxtep/customer-mcp-server login
   ```
   Open the printed URL in your browser, sign in to Loxtep, and complete the OAuth flow.

3. **Use the tools** — The agent sees `loxtep_*` tools; each call sets **`operation`** (e.g. `list_projects`) plus arguments. Trigger via "@" or the MCP tools list in the IDE.

## What you get

- **Loxtep Customer MCP** — `npx @loxtep/customer-mcp-server` (grouped tools + `operation`; projects, workflows, data products, connectors, templates, catalog, schemas, and more).
- **Skills** — Story-first playbooks (see [docs/skills-user-stories.md](../docs/skills-user-stories.md)): `loxtep-auth`, `loxtep-instances`, `create-connector`, `data-workflows`, `discover-govern-lineage`, `org-semantics-quality`, `loxtep-analytics`, `loxtep-workspace`, `loxtep-process-intel`, `loxtep-procedures`, `loxtep-agent-workspace`, `loxtep-mcp-session`, `loxtep-sdk`. Each lives under `antigravity/skills/<slug>/SKILL.md` with MCP mapping tables where applicable.

## Environment variables (optional)

- `LOXTEP_ENV` or `NODE_ENV` — Set to `dev` / `development` for dev app/API (`appdev.loxtep.io`, `apidev.loxtep.io`). Default is production.
- `LOXTEP_APP_URL` — Override app base URL for login.
- `LOXTEP_API_BASE_URL` — Override API endpoint.
- `LOXTEP_TOKEN_FILE` — Custom path to token file (default `~/.loxtep/customer-mcp.json`).

Add these in the `loxtep` server’s `env` object in your raw MCP config if needed. See the [Customer MCP Server README](https://github.com/loxtepinc/loxtep/blob/main/platform-backend/_customer-mcp-server/README.md) for full details.

## License

MIT
