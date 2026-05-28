# Loxtep for OpenCode

Use the [Loxtep](https://loxtep.io) Customer MCP from [OpenCode](https://opencode.ai): **16 grouped tools** (`loxtep_*`) with per-call **`operation`**, covering projects, workflows, data products, connectors, and more.

This directory lives in the [loxtep-plugins-skills](https://github.com/loxtepinc/loxtep-plugins-skills) repo under `opencode/`.

## Prerequisites

- **Node.js** 18+
- **OpenCode** installed ([opencode.ai/docs](https://opencode.ai/docs))
- **Loxtep account** with `owner`, `org_admin`, or `developer` role (for MCP tool access)

## Install

### 1. Add the Loxtep MCP server

Add the Loxtep server to your OpenCode MCP configuration. In your project's `opencode.json` (or global config):

```json
{
  "mcp": {
    "loxtep": {
      "type": "stdio",
      "command": "npx",
      "args": ["@loxtep/customer-mcp-server"]
    }
  }
}
```

Alternatively, use the CLI:

```bash
opencode mcp add loxtep -- npx @loxtep/customer-mcp-server
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

### 3. Log in once

Save your Loxtep tokens:

```bash
npx @loxtep/customer-mcp-server login
```

Open the printed URL in your browser, sign in to Loxtep, and complete the OAuth flow. Tokens are stored at `~/.loxtep/customer-mcp.json`.

### 4. Use the tools

OpenCode's agent will discover the `loxtep_*` tools and the skills automatically. Skills are loaded on-demand via the native `skill` tool — the agent sees available skills and loads the full content when needed.

## What you get

- **Loxtep Customer MCP** — `npx @loxtep/customer-mcp-server` (grouped `loxtep_*` + `operation`; projects, workflows, data products, connectors, templates, catalog, schemas, and more).
- **Skills** — Story-first playbooks (see [docs/skills-user-stories.md](../docs/skills-user-stories.md)):

| Skill | Description |
|-------|-------------|
| `loxtep-auth` | Authentication recovery for MCP token errors |
| `loxtep-mcp-session` | Session, capabilities, and permission checks |
| `loxtep-instances` | Runtime instance provisioning (shared/managed/self-hosted) |
| `create-connector` | Connect SaaS/APIs (OAuth, API key, SDK connectors) |
| `data-workflows` | Projects, workflows, connections, data products, consumptions |
| `discover-govern-lineage` | Catalog search, lineage, evidence, governance |
| `org-semantics-quality` | Schemas, PII tagging, quality rules |
| `loxtep-analytics` | SQL analytics via DuckDB |
| `loxtep-workspace` | Versions, snapshots, restore, reindex, queue info |
| `loxtep-process-intel` | Entity context, decision traces, ontology, thesaurus |
| `loxtep-procedures` | Business procedures and process graph |
| `loxtep-agent-workspace` | Agent orchestration (issues, goals, agents) |
| `loxtep-sdk` | Node SDK bootstrap, stream bus, queue/bot resolution |

## Skill permissions (optional)

Control which skills agents can access in `opencode.json`:

```json
{
  "permission": {
    "skill": {
      "*": "allow",
      "loxtep-*": "allow"
    }
  }
}
```

## Environment variables (optional)

- `LOXTEP_ENV` or `NODE_ENV` — Set to `dev` / `development` for dev app/API (`appdev.loxtep.io`, `apidev.loxtep.io`). Default is production.
- `LOXTEP_APP_URL` — Override app base URL for login.
- `LOXTEP_API_BASE_URL` — Override API endpoint.
- `LOXTEP_TOKEN_FILE` — Custom path to token file (default `~/.loxtep/customer-mcp.json`).

Add these under the `loxtep` server's `env` object in your MCP config if needed:

```json
{
  "mcp": {
    "loxtep": {
      "type": "stdio",
      "command": "npx",
      "args": ["@loxtep/customer-mcp-server"],
      "env": {
        "LOXTEP_ENV": "dev"
      }
    }
  }
}
```

See the [Customer MCP Server README](https://github.com/loxtepinc/loxtep/blob/main/platform-backend/_customer-mcp-server/README.md) for full details.

## License

MIT
