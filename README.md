# Loxtep Plugins & Skills

Plugins and skills for connecting your AI coding tool to [Loxtep](https://loxtep.io).

**Loxtep is the AI-first, governed data layer for your business.** You build
agents in the tools you already use — Claude Code, Cursor, Codex, OpenCode, Kiro,
Antigravity — and Loxtep handles the hard part: **ingesting your data, giving
your agents trustworthy context, and governing every access** (audit + field
masking on by default). Connect a source (Postgres, Shopify, Stripe, a webhook),
and your agents query governed data over a hosted MCP server instead of
hand-rolling pipelines or inventing field names.

The hosted MCP registers **21 grouped tools** named `loxtep_projects`,
`loxtep_workflows`, `loxtep_data_products`, and so on. Each call sets
**`operation`** to the flat action name (e.g. `list_projects`,
`create_data_product`) plus that action's arguments. Tool definitions and scopes
are published on the hosted MCP server.

New here? Start with the **Starter set** — session/auth, connect one source, and
query — then opt into the full skill set when you need it. See
[docs/starter-subset.md](docs/starter-subset.md).

Scoped **Agent-Scope Skills** teach agents the platform model — connecting
sources, data products, governance, semantic layer, streaming workflows,
deployments — so they work inside boundaries instead of inventing field names and
bypassing access rules.

### Workflow authoring (read this before connect + ingest)

All MCP clients share one contract: **[docs/agent-workflow-authoring.md](docs/agent-workflow-authoring.md)**. New ingestion flows use **`save_workflow_bundle`** (full JSON, validate with `dry_run: true` first). P1 connect ends at **`connector_id` + samples**; P2 bundle design is **`data-workflows`** Flow E.

## What makes Loxtep different

| Generic workflow tool | Loxtep |
| --- | --- |
| Pipelines as the unit of work | **Data products** — owned, versioned, governed datasets your agents can trust |
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

**Recommended:** Cursor **Dashboard → Settings → Plugins → Import** → `https://github.com/LoxtepInc/loxtep-plugins-skills` (plugin path `cursor/`). Installs MCP + skills + auth rule.

> A one-click Cursor Marketplace listing is in review; until it is live, use the Import or local-clone paths below.

**Local clone:** **Settings → Plugins** → install from directory → select the cloned `cursor/` folder.

**MCP only (no skills):** **Settings → Tools & MCP** → add server, or merge into `~/.cursor/mcp.json` (global) or `.cursor/mcp.json` (project):

```json
{ "mcpServers": { "loxtep": { "url": "https://mcp.loxtep.io/ai/mcp/stream" } } }
```

OAuth runs in the browser on first connect; tokens refresh automatically.

See [`cursor/README.md`](cursor/README.md) for details.

### Claude Code & Cowork

**Recommended:** add this repo as a marketplace, then install the plugin by name:

```bash
claude plugin marketplace add LoxtepInc/loxtep-plugins-skills
claude plugin install loxtep-claude@loxtep
```

In an interactive Claude Code session you can also run `/plugin install loxtep-claude@loxtep`.

Or install from a local clone:

```bash
claude plugin install /path/to/loxtep-plugins-skills/claude
```

This gives you hosted MCP, 23 skills, and auth recovery. OAuth runs on first tool call.

See [`claude/README.md`](claude/README.md) for details.

### Kiro

**Recommended (full experience):** install the **Kiro Power** — MCP + 13 steering guides + skills context.

1. Open the **Powers** panel (ghost + lightning icon)
2. **Add Custom Power → Import power from a folder**
3. Select `kiro/power/` from this repo (contains `POWER.md`, `mcp.json`, `steering/`)

Kiro registers the Power’s MCP server in `~/.kiro/settings/mcp.json` automatically.

**MCP only:** command palette → **Kiro: Open workspace MCP config** (or user config) → merge `kiro/mcp.json`, or copy to `.kiro/settings/mcp.json` / `~/.kiro/settings/mcp.json`.

See [`kiro/README.md`](kiro/README.md) for details.

### OpenCode

Merge into your project `opencode.json` (or copy `opencode/opencode.json`):

```json
{
  "$schema": "https://opencode.ai/config.json",
  "mcp": {
    "loxtep": {
      "type": "remote",
      "url": "https://mcp.loxtep.io/ai/mcp/stream",
      "enabled": true
    }
  }
}
```

Install skills:

```bash
cp -r opencode/skills/ .opencode/skills/
# or global: cp -r opencode/skills/ ~/.config/opencode/skills/
```

If OAuth does not start automatically: `opencode mcp auth loxtep`

See [`opencode/README.md`](opencode/README.md) for details.

### Codex

Add to `~/.codex/config.toml` (see `codex/config.snippet.toml`):

```toml
[mcp_servers.loxtep]
url = "https://mcp.loxtep.io/ai/mcp/stream"
```

Authenticate on first use (or explicitly):

```bash
codex mcp login loxtep
```

Install skills (user-global):

```bash
mkdir -p ~/.agents/skills
cp -r codex/skills/* ~/.agents/skills/
```

See [`codex/README.md`](codex/README.md) for details.

### Antigravity

Antigravity does not support hosted MCP OAuth natively — use `mcp-remote` as a bridge.

**IDE:** Agent panel → **⋯ → MCP Servers → Manage MCP Servers → View raw config** (edits `~/.gemini/config/mcp_config.json`).

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

Install skills (shared across Antigravity IDE + CLI):

```bash
mkdir -p ~/.gemini/skills
cp -r antigravity/skills/* ~/.gemini/skills/
```

Requires Node.js 18+. See [`antigravity/README.md`](antigravity/README.md) for details.

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
| **Cursor** | Cursor IDE | [cursor/](cursor/) | Marketplace plugin **`loxtep`**. Hosted MCP, 23 skills, auth rule. |
| **Claude** | Claude Code & Cowork | [claude/](claude/) | Marketplace plugin **`loxtep-claude@loxtep`**. Hosted MCP, 23 skills, auth rule. |
| **OpenCode** | OpenCode | [opencode/](opencode/) | `opencode.json` (`type: remote`) + 23 skills. Native OAuth. |
| **Kiro** | Kiro IDE | [kiro/](kiro/) | Kiro Power (`kiro/power/`) or MCP config. 23 skills + 13 steering guides. |
| **Antigravity** | Google Antigravity | [antigravity/](antigravity/) | `~/.gemini/config/mcp_config.json` via `mcp-remote`. 23 skills in `~/.gemini/skills/`. |
| **Codex** | OpenAI Codex | [codex/](codex/) | `~/.codex/config.toml` + skills in `~/.agents/skills/`. Native OAuth. |

## Repository layout

- **cursor/** — Cursor plugin (`.cursor-plugin/`, rules, skills, assets).
- **claude/** — Claude Code / Cowork plugin (`.claude-plugin/`, skills).
- **opencode/** — OpenCode (terminal/desktop/IDE): `opencode.json`, skills.
- **kiro/** — Kiro IDE: MCP config and README.
- **antigravity/** — Antigravity IDE: MCP config and README.
- **codex/** — Codex CLI/IDE: TOML snippet and README.

See each directory's `README.md` for install and usage instructions.

Every skill under `claude/skills/`, `cursor/skills/`, `codex/skills/`,
`kiro/skills/`, `opencode/skills/`, `antigravity/skills/`, plus
`kiro/power/steering/` and the `claude`/`cursor` `rules/*.mdc` auth rule, is
**generated** from a single canonical source in `skills/`. See
[CONTRIBUTING.md](CONTRIBUTING.md) before editing a skill.

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
| `connect-external-system` |
| `loxtep-journey-orchestrator` |
| `data-workflows` |
| `data-product-modeling` |
| `promote-data-product` |
| `discover-govern-lineage` |
| `governance-policies` |
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
| `mcp-integration` |

```json
{
  "operation": "create_connector",
  "connector_type": "shopify",
  "metadata": { "api_key": "..." },
  "_metadata": { "skill_name": "connect-external-system" }
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
