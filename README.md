# Loxtep Plugins & Skills

Plugins and skills for using [Loxtep](https://loxtep.io) from AI coding and productivity tools.

Loxtep is the **Enterprise Context Layer**: the system that turns organizational
knowledge, expertise, and norms into machine-usable context for AI across
heterogeneous systems. Built on **governed data products** on a **real-time
streaming** backbone — with a **semantic layer**, **ontology**, **process graph**,
and **AI context** (entity knowledge, decision traces, Organizational Skills) that
agents query instead of inventing. One source of truth, many interfaces:
MCP, REST, SQL, SDK, streaming, and graph. These plugins connect your MCP client to
that platform over hosted OAuth.

The hosted MCP registers **19 grouped tools** named `loxtep_projects`, `loxtep_workflows`, `loxtep_data_products`, and so on. Each call sets **`operation`** to the flat action name (e.g. `list_projects`, `create_data_product`) plus that action's arguments. Tool definitions and scopes are published on the hosted MCP server.

Scoped **Agent-Scope Skills** (19 per client) teach agents the platform model — data products, governance, semantic layer, streaming workflows, deployments, queue tracing — so they work inside boundaries instead of inventing field names and bypassing access rules.

## What makes Loxtep different

| Generic workflow tool | Loxtep |
| --- | --- |
| Pipelines as the unit of work | **Data products** — owned, versioned, cataloged assets with contracts and SLAs |
| Batch ETL / cron jobs | **Event streaming** — flows built for continuous, real-time data movement |
| Docs about data definitions | **Semantic layer + ontology** — canonical terms, namespaces, mappings agents can resolve |
| "The AI read our wiki" | **AI context** — entity context, decision traces, process intelligence wired to the platform |
| Security as an afterthought | **Data governance by design** — RBAC, PII tagging, quality rules, access requests, audit-friendly lineage |
| Opaque data sprawl | **Discovery** — catalog search, evidence, lineage impact, governance flags |

## Key concepts

- **Data product** — A governed, discoverable dataset your org owns. Has schema, lineage, quality, and delivery — not a one-off script output.
- **Streaming** — Data moves as events through the platform in real time; workflows are how you implement the flow.
- **Semantic layer** — Searchable business meaning: metrics, definitions, artifacts — what agents should use instead of guessing column names.
- **AI context** — Structured org knowledge (entities, decisions, processes) the platform stores and the MCP exposes.
- **Governance** — Permissions, PII, quality, and lineage are enforced when you build and access data, not buried in a wiki.

## Quick Start

Each AI tool has a native way to install Loxtep — marketplace plugins, powers, or config files — that gives you MCP connectivity **plus** scoped skills and workflow guides out of the box. Pick your client below.

### Cursor

Install the **`loxtep`** plugin from the Cursor Marketplace, or from Git:

**Settings → Plugins → Install from Git** → `https://github.com/LoxtepInc/loxtep-plugins-skills` (path: `cursor/`)

This installs the hosted MCP server, 19 scoped skills, and an auth-recovery rule. On first use Cursor opens OAuth in the browser — sign in and you're connected.

See [`cursor/README.md`](cursor/README.md) for details.

### Claude Code & Cowork

Install the **`loxtep-claude`** plugin from the Claude plugin directory, or from Git:

```bash
claude plugin install https://github.com/LoxtepInc/loxtep-plugins-skills --path claude/
```

This gives you the hosted MCP, 19 skills, and auth recovery. OAuth runs on first tool call.

See [`claude/README.md`](claude/README.md) for details.

### Kiro

Install Loxtep as a **Kiro Power** — this gives you MCP, skills, and step-by-step steering guides for each workflow area:

1. Open the Powers panel in Kiro
2. Add the Loxtep power from `kiro/power/` in this repo (or copy `kiro/mcp.json` into `.kiro/settings/mcp.json`)

The Power includes 13 steering files (connectors, workflows, analytics, governance, etc.) that load contextually based on your task.

See [`kiro/README.md`](kiro/README.md) for details.

### OpenCode

Copy the config and skills into your project:

```bash
# MCP config
cp opencode/opencode.json ./opencode.json

# Skills (project-local)
cp -r opencode/skills/ .opencode/skills/
```

Or add to your existing `opencode.json`:

```json
{ "mcp": { "loxtep": { "type": "http", "url": "https://mcp.loxtep.io/ai/mcp/stream" } } }
```

See [`opencode/README.md`](opencode/README.md) for details.

### Codex

Add to `~/.codex/config.toml`:

```toml
[mcp_servers.loxtep]
url = "https://mcp.loxtep.io/ai/mcp/stream"
```

Copy skills from `codex/skills/` into your workspace. See [`codex/README.md`](codex/README.md) for details.

### Antigravity

Antigravity doesn't support MCP OAuth natively yet — use `mcp-remote` as a bridge:

Open **Agent panel → "..." → Manage MCP Servers → View raw config** and add:

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

Requires Node.js 18+. `mcp-remote` handles OAuth locally. See [`antigravity/README.md`](antigravity/README.md) for details.

### Manual / other clients

For any MCP client with native OAuth support, add this to its MCP config:

```json
{
  "mcpServers": {
    "loxtep": {
      "url": "https://mcp.loxtep.io/ai/mcp/stream"
    }
  }
}
```

For clients without OAuth support, wrap with `mcp-remote` (see Antigravity above).

### Common notes

- **Authentication:** OAuth 2.1 + PKCE. Browser opens on first connect; tokens refresh automatically. No API keys, no token files.
- **Dev environment:** Replace the URL with `https://mcpdev.loxtep.io/ai/mcp/stream` for the dev instance.
- **Migrating from `npx @loxtep/customer-mcp-server`:** Remove the stdio MCP entry. Uninstall/reinstall via your client's native method above. Delete `~/.loxtep/customer-mcp.json` if no longer needed.

## Plugins

| Plugin | Platform | Path | Description |
|--------|----------|------|-------------|
| **Cursor** | Cursor IDE | [cursor/](cursor/) | Marketplace plugin **`loxtep`** (path `cursor/`). Hosted MCP, 19 skills, auth rule. |
| **Claude** | Claude Code & Cowork | [claude/](claude/) | Marketplace plugin **`loxtep-claude`** (path `claude/`). Same surface — hosted MCP, 19 skills, auth rule. |
| **OpenCode** | OpenCode | [opencode/](opencode/) | MCP + 19 skills for terminal/desktop/IDE. Native OAuth; optional skill permissions. |
| **Kiro** | Kiro IDE | [kiro/](kiro/) | MCP, 19 skills, optional Kiro Power steering guides. Native OAuth. |
| **Antigravity** | Google Antigravity | [antigravity/](antigravity/) | MCP + 19 skills via `mcp-remote` OAuth bridge. |
| **Codex** | OpenAI Codex | [codex/](codex/) | MCP + 19 skills; TOML config snippet. Native OAuth. |

## Repository layout

- **cursor/** — Cursor plugin (`.cursor-plugin/`, rules, skills, assets).
- **claude/** — Claude Code / Cowork plugin (`.claude-plugin/`, skills).
- **opencode/** — OpenCode (terminal/desktop/IDE): `opencode.json`, skills.
- **kiro/** — Kiro IDE: MCP config and README.
- **antigravity/** — Antigravity IDE: MCP config and README.
- **codex/** — Codex CLI/IDE: TOML snippet and README.

See each directory's `README.md` for install and usage instructions.

## Skill attribution (optional)

When invoking Loxtep MCP tools, agents may pass `_metadata` in tool arguments for
attribution and eval scoring. This is **fully optional** and backward-compatible.

**Convention:** Include `_metadata: { skill_name: 'skill-slug' }` in the tool
arguments. The `skill_name` must match the skill's `name` from its YAML frontmatter.
The Loxtep platform uses this for per-skill eval and analytics when available.

| `skill_name` (use exactly) |
|----------------------------|
| `loxtep-mcp-session` |
| `loxtep-auth` |
| `loxtep-instances` |
| `create-connector` |
| `data-workflows` |
| `data-product-modeling` |
| `discover-govern-lineage` |
| `org-semantics-quality` |
| `loxtep-analytics` |
| `loxtep-workspace` |
| `loxtep-deployments` |
| `loxtep-queue-tracing` |
| `loxtep-process-intel` |
| `loxtep-procedures` |
| `loxtep-agent-workspace` |
| `loxtep-ontology` |
| `loxtep-sdk` |
| `loxtep-semantic-layer` |
| `semantic-ontology-mapping` |

```json
{
  "operation": "create_connector",
  "connector_type": "shopify",
  "metadata": { "api_key": "..." },
  "_metadata": { "skill_name": "create-connector" }
}
```

(Call the MCP tool **`loxtep_connectors`** with the JSON above as arguments.)

Tools ignore `_metadata` for tool logic; it is used only for request attribution.

## Other Ways to Get Started

MCP is the **agent-first** path. Loxtep also supports:

| Path | Use case | Where to learn more |
|------|----------|---------------------|
| **Code-first (CLI)** | Author workflows as TypeScript, test locally, deploy via CI: `loxtep init → attach → generate → test → deploy` | [`@loxtep/sdk` README](https://github.com/LoxtepInc/loxtep-sdk/tree/main/nodejs#quick-start--code-first-cli-init--deploy) |
| **Programmatic (SDK)** | Write/read events from application code (microservices, lambdas) | [`@loxtep/sdk` README](https://github.com/LoxtepInc/loxtep-sdk/tree/main/nodejs#quick-start--programmatic--5-min-to-first-stream) |
| **Web UI** | Visual project setup and management | [app.loxtep.io](https://app.loxtep.io) (limited preview) |

All paths are covered in the [Loxtep Quickstart](https://docs.loxtep.io/quickstart).

## License

MIT
