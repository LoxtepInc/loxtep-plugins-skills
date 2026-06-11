# Loxtep for Antigravity IDE

Use the [Loxtep](https://loxtep.io) Customer MCP from [Google Antigravity IDE](https://antigravity.chat): **19 grouped tools** (`loxtep_*`) with **`operation`** per call—projects, workflows, data products, connectors, and more.

This directory lives in the [loxtep-plugins-skills](https://github.com/LoxtepInc/loxtep-plugins-skills) repo under `antigravity/`.

## Prerequisites

- **Node.js** 18+
- **Loxtep account** with `owner`, `org_admin`, or `developer` role (for MCP tool access)

## Install

### 1. Add the Loxtep MCP server

Antigravity does not yet support the MCP OAuth specification natively, so we use `mcp-remote` as a local bridge to handle the OAuth flow.

- Open the "..." dropdown at the top of the Agent panel.
- Select **Manage MCP Servers** (or open the MCP Store).
- Click **View raw config** to open your `mcp_config.json`.
- Add the `loxtep` entry from `mcp_config.json` in this repo into your `mcpServers` object:

```json
{
  "mcpServers": {
    "loxtep": {
      "command": "npx",
      "args": ["-y", "mcp-remote", "https://mcp.loxtep.io/ai/mcp/stream"]
    }
  }
}
```

Save and refresh so the server loads.

> **Dev environment:** To connect to the Loxtep dev instance instead of production, replace the URL with `https://mcpdev.loxtep.io/ai/mcp/stream`.

### 2. Authenticate

On first connection, `mcp-remote` will open a browser window for OAuth login. Sign in to Loxtep and authorize the connection. Tokens are cached locally and refresh automatically — you only need to do this once.

### 3. Use the tools

The agent sees `loxtep_*` tools; each call sets **`operation`** (e.g. `list_projects`) plus arguments. Trigger via "@" or the MCP tools list in the IDE.

## How it works

`mcp-remote` runs a local OAuth proxy that:

1. Starts a local `http://localhost` callback server
2. Opens your browser for Loxtep OAuth login (first time only)
3. Bridges the authenticated remote MCP connection to Antigravity via stdio

This is required because Antigravity's native `serverUrl` config does not yet handle the MCP OAuth 2.1 handshake. The `mcp-remote` package handles it transparently.

## What you get

- **Loxtep Customer MCP** — hosted at `https://mcp.loxtep.io/ai/mcp/stream` (grouped tools + `operation`; projects, workflows, data products, connectors, templates, catalog, schemas, and more).
- **Skills** — Story-first playbooks (see [docs/skills-user-stories.md](../docs/skills-user-stories.md)): `create-connector`, `data-product-modeling`, `data-workflows`, `discover-govern-lineage`, `loxtep-agent-workspace`, `loxtep-analytics`, `loxtep-auth`, `loxtep-instances`, `loxtep-mcp-session`, `loxtep-ontology`, `loxtep-procedures`, `loxtep-process-intel`, `loxtep-sdk`, `loxtep-workspace`, `org-semantics-quality`, `semantic-ontology-mapping`. Each lives under `antigravity/skills/<slug>/SKILL.md` with MCP mapping tables where applicable.

## Environment variables (optional)

These can be added to the `env` object in the MCP config if needed:

- `LOXTEP_ENV` or `NODE_ENV` — Set to `dev` / `development` for dev app/API (`appdev.loxtep.io`, `apidev.loxtep.io`). Default is production.

See the [Customer MCP Server README](https://github.com/LoxtepInc/loxtep/blob/main/platform-backend/_customer-mcp-server/README.md) for full details.

## Troubleshooting

| Issue | Fix |
|-------|-----|
| "Unauthorized" error on connect | Antigravity's native `serverUrl` OAuth is not supported. Use `mcp-remote` as shown above. |
| Browser doesn't open for login | Run `npx mcp-remote https://mcp.loxtep.io/ai/mcp/stream` manually in a terminal first to complete the initial auth. |
| `npx` not found | Ensure Node.js 18+ is installed and `npx` is on your PATH. |

## License

MIT
