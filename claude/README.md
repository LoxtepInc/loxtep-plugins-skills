# Loxtep Claude Plugin

Claude Code and Claude Cowork plugin for the [Loxtep](https://loxtep.io) data mesh platform. The Customer MCP lists **16 grouped tools** (`loxtep_*`); each invocation sets **`operation`** to the flat action name plus parameters—covering projects, workflows, data products, connectors, and more.

This plugin lives in the [loxtep-plugins-skills](https://github.com/loxtepinc/loxtep-plugins-skills) repo under `claude/`.

## Prerequisites

- **Node.js** 18+
- **Loxtep account** with `owner`, `org_admin`, or `developer` role (for MCP tool access)

## Quick start

1. **Install the plugin** in Claude Code or Claude Cowork (e.g. from Git: clone or install from `https://github.com/loxtepinc/loxtep-plugins-skills` and select the `claude/` directory as the plugin path, per your client’s instructions).
2. **Log in once** to save your Loxtep tokens:
   ```bash
   npx @loxtep/customer-mcp-server login
   ```
   Open the printed URL in your browser, sign in to Loxtep, and complete the OAuth flow.
3. **Use the tools** — You’ll see grouped tools like `loxtep_projects` and `loxtep_connectors`. Each call includes **`operation`** (e.g. `list_projects`) plus that action’s arguments.

## What's included

- **Loxtep Customer MCP** — `npx @loxtep/customer-mcp-server` (16 `loxtep_*` tools with per-call `operation`; projects, workflows, data products, connectors, templates, catalog, schemas, and more).
- **Skills** — Story-first playbooks (see [docs/skills-user-stories.md](../docs/skills-user-stories.md)): `loxtep-auth`, `loxtep-instances`, `create-connector`, `data-workflows`, `discover-govern-lineage`, `org-semantics-quality`, `loxtep-analytics`, `loxtep-workspace`, `loxtep-process-intel`, `loxtep-procedures`, `loxtep-agent-workspace`. Each lives under `claude/skills/<slug>/SKILL.md` with MCP mapping tables where applicable.

## Environment variables (optional)

- `LOXTEP_ENV` or `NODE_ENV` — Set to `dev` / `development` for dev app/API (`appdev.loxtep.io`, `apidev.loxtep.io`). Default is production.
- `LOXTEP_APP_URL` — Override app base URL for login.
- `LOXTEP_API_BASE_URL` — Override API endpoint.
- `LOXTEP_TOKEN_FILE` — Custom path to token file (default `~/.loxtep/customer-mcp.json`).

See the [Customer MCP Server README](https://github.com/loxtepinc/loxtep/blob/main/platform-backend/_customer-mcp-server/README.md) for full details.

## Submission (Claude plugin discovery)

If you submit this plugin to Anthropic’s plugin directory or marketplace, use the repository URL and the `claude/` path as the plugin root. Follow [Claude Code plugins](https://code.claude.com/docs/en/plugins-reference) and [Claude plugin discovery](https://code.claude.com/en/discover-plugins) for current requirements.

## License

MIT
