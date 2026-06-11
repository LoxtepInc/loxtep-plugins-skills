# Loxtep Plugins & Skills

Plugins and skills for using [Loxtep](https://loxtep.io) from AI coding and productivity tools.

Loxtep is not another pipeline tool. It publishes **governed data products** on a **real-time streaming** backbone — with **data governance**, **catalog and lineage**, a **semantic layer**, and **AI context** (entity knowledge, decision traces, ontology) that agents can query instead of inventing. These plugins connect your MCP client to that platform over hosted OAuth.

The hosted MCP registers **19 grouped tools** named `loxtep_projects`, `loxtep_workflows`, `loxtep_data_products`, and so on. Each call sets **`operation`** to the flat action name (e.g. `list_projects`, `create_data_product`) plus that action's arguments. Tool definitions and scopes live in the Loxtep monorepo [`mcp-facades.ts`](https://github.com/LoxtepInc/loxtep/blob/main/platform-backend/ai/lib/tools/mcp-facades.ts).

Scoped **skills** (19 per client) teach agents the platform model — data products, governance, semantic layer, streaming workflows, deployments, queue tracing — so they work inside boundaries instead of inventing field names and bypassing access rules.

## What makes Loxtep different

| Generic workflow tool | Loxtep |
| --- | --- |
| Pipelines as the unit of work | **Data products** — owned, versioned, cataloged assets with contracts and SLAs |
| Batch ETL / cron jobs | **Event streaming** (rstreams) — flows built for continuous, real-time data movement |
| Docs about data definitions | **Semantic layer + ontology** — canonical terms, namespaces, mappings agents can resolve |
| "The AI read our wiki" | **AI context** — entity context, decision traces, process intelligence wired to the platform |
| Security as an afterthought | **Data governance by design** — RBAC, PII tagging, quality rules, access requests, audit-friendly lineage |
| Opaque data sprawl | **Discovery** — catalog search, evidence, lineage impact, governance flags |

## Key concepts

- **Data product** — A governed, discoverable dataset your org owns. Has schema, lineage, quality, and consumption — not a one-off script output.
- **Streaming** — Data moves as events through the platform in real time; workflows are how you implement the flow.
- **Semantic layer** — Searchable business meaning: metrics, definitions, artifacts — what agents should use instead of guessing column names.
- **AI context** — Structured org knowledge (entities, decisions, processes) the platform stores and the MCP exposes.
- **Governance** — Permissions, PII, quality, and lineage are enforced when you build and access data, not buried in a wiki.

## Quick Start

Add the Loxtep hosted MCP server to your client config:

```json
{
  "mcpServers": {
    "loxtep": {
      "url": "https://mcp.loxtep.io/ai/mcp/stream"
    }
  }
}
```

That's it. On first connection your MCP client will open a browser window for OAuth login — sign in to Loxtep and you're connected. Authentication is handled automatically via OAuth 2.1 with PKCE; tokens refresh in the background.

No installation, no Node.js, no `npx`, no token files to manage.

> **Migrating from `npx @loxtep/customer-mcp-server`:** Remove the stdio MCP entry from your client config. Uninstall/reinstall the Loxtep plugin so it picks up the hosted URL (`cursor/` for Cursor, `claude/` for Claude Code). Delete `~/.loxtep/customer-mcp.json` if you no longer use the legacy CLI. Reconnect MCP — OAuth runs in the browser.

> **Dev environment:** Replace the URL with `https://mcpdev.loxtep.io/ai/mcp/stream` to connect to the Loxtep dev instance.

## Clients without native MCP OAuth

Some MCP clients (e.g. Google Antigravity) don't yet support the OAuth 2.1 handshake natively. For those, use `mcp-remote` as a local bridge:

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

`mcp-remote` handles the OAuth flow locally (opens your browser, runs a localhost callback server) and bridges the authenticated connection via stdio.

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

**User story catalog** (S0–S15, intent → skill → MCP): [docs/skills-user-stories.md](docs/skills-user-stories.md).

**Skills roadmap** (indexes by story and by facade, `_metadata` slugs, drift notes): [docs/skills-roadmap.md](docs/skills-roadmap.md).

**MCP vs skills drift** (manual process; no CI parser): [docs/mcp-operation-skills-drift.md](docs/mcp-operation-skills-drift.md).

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

## License

MIT
