# Loxtep for Codex

Use the [Loxtep](https://loxtep.io) Customer MCP from [OpenAI Codex](https://codex.openai.com) (CLI and IDE): **16 grouped tools** (`loxtep_*`) with **`operation`** per invocation.

This directory lives in the [loxtep-plugins-skills](https://github.com/symmatiq/loxtep-plugins-skills) repo under `codex/`.

## Prerequisites

- **Node.js** 18+
- **Loxtep account** with `owner`, `org_admin`, or `developer` role (for MCP tool access)

## Install

**Preferred — CLI:**

```bash
codex mcp add loxtep -- npx @loxtep/customer-mcp-server
```

**Alternative — manual config:**  
Edit `~/.codex/config.toml` and add the snippet from `config.snippet.toml` in this repo (or the block below). Codex uses TOML; see [Codex MCP](https://developers.openai.com/codex/mcp) and [config reference](https://developers.openai.com/codex/config-reference).

```toml
[mcp_servers.loxtep]
command = "npx"
args = ["@loxtep/customer-mcp-server"]
```

1. **Log in once** to save your Loxtep tokens:
   ```bash
   npx @loxtep/customer-mcp-server login
   ```
   Open the printed URL in your browser, sign in to Loxtep, and complete the OAuth flow.

2. **Use the tools** — Codex exposes `loxtep_*` tools; use **`operation`** plus each action’s parameters (see Customer MCP README).

## What you get

- **Loxtep Customer MCP** — `npx @loxtep/customer-mcp-server` (grouped tools + `operation`; projects, workflows, data products, connectors, templates, catalog, schemas, and more).
- **Skills** — Story-first playbooks (see [docs/skills-user-stories.md](../docs/skills-user-stories.md)): `loxtep-auth`, `loxtep-instances`, `create-connector`, `data-workflows`, `discover-govern-lineage`, `org-semantics-quality`, `loxtep-analytics`, `loxtep-workspace`, `loxtep-process-intel`, `loxtep-procedures`, `loxtep-agent-workspace`, `loxtep-mcp-session`, `loxtep-sdk`. Each lives under `codex/skills/<slug>/SKILL.md` with MCP mapping tables where applicable.

## Environment variables (optional)

- `LOXTEP_ENV` or `NODE_ENV` — Set to `dev` / `development` for dev app/API (`appdev.loxtep.io`, `apidev.loxtep.io`). Default is production.
- `LOXTEP_APP_URL` — Override app base URL for login.
- `LOXTEP_API_BASE_URL` — Override API endpoint.
- `LOXTEP_TOKEN_FILE` — Custom path to token file (default `~/.loxtep/customer-mcp.json`).

Configure these in the `[mcp_servers.loxtep]` section via `env` if your Codex version supports it, or set them in your shell. See the [Customer MCP Server README](https://github.com/symmatiq/loxtep/blob/main/platform-backend/_customer-mcp-server/README.md) for full details.

## License

MIT
