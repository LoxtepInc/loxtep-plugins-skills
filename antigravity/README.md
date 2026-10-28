# Loxtep for Antigravity IDE

**Loxtep is the AI-first, governed data layer for your business. Build agents in Antigravity; Loxtep ingests your data, gives them trustworthy context, and governs every access over hosted MCP.**

[Loxtep](https://loxtep.io) handles the data underneath your agents. Connect a source — Postgres, Shopify, Stripe, a webhook — and Loxtep ingests it into **governed data products** (versioned, with schema, lineage, and quality) that your agents query over MCP, with **audit and field masking on by default**. No pipelines to hand-roll, no field names to invent.

Because AI agents need more than API access, Loxtep maintains a **semantic layer, ontology, and runtime context** (entity knowledge, decision traces, process graphs) that your Antigravity agent can query and extend.

This directory connects Antigravity to that platform via hosted MCP (`serverUrl` in `mcp_config.json`) and scoped skills.

This directory lives in the [loxtep-plugins-skills](https://github.com/LoxtepInc/loxtep-plugins-skills) repo under `antigravity/`.

## What makes Loxtep different

| Generic workflow tool | Loxtep |
| --- | --- |
| Pipelines as the unit of work | **Data products** — owned, versioned, cataloged assets with contracts and SLAs |
| Batch ETL / cron jobs | **Event streaming** — real-time data movement |
| Docs about data definitions | **Semantic layer + ontology** — canonical terms agents can resolve |
| "The AI read our wiki" | **AI context** — entity context, decision traces, process intelligence |
| Security as an afterthought | **Data governance by design** — RBAC, PII, quality, lineage |
| Opaque data sprawl | **Discovery** — catalog, evidence, lineage impact, governance flags |

## Key concepts

- **Data product** — Governed, discoverable dataset with schema, lineage, quality, and delivery.
- **Streaming** — Events in real time; workflows implement the flow.
- **Semantic layer** — Business meaning agents query instead of inventing field names.
- **AI context** — Entity knowledge, decisions, processes exposed over MCP.
- **Governance** — Permissions, PII, quality, and lineage enforced at build and access time.

## Prerequisites

- **Antigravity** with remote MCP. The config field is `serverUrl`. Do not install `mcp-remote`.
- **Loxtep account** with `owner`, `org_admin`, or `developer` role (for MCP tool access)
- Project-scoped operations require `project_id` (call `get_current_user` first)

## Install

### 1. Add the Loxtep MCP server

Write a `serverUrl` entry in `mcp_config.json`. Do not use `mcp-remote`, a `command`/`args` stdio bridge, or `@loxtep/customer-mcp-server`. Official page checked 2026-10-27: [Antigravity MCP](https://antigravity.google/docs/mcp).

**IDE:** Agent panel → **⋯ → MCP Servers → Manage MCP Servers → View raw config**

This edits `~/.gemini/config/mcp_config.json` (global). Workspace-local config can live at `.agents/mcp_config.json`.

Add the `loxtep` entry from `mcp_config.json` in this repo:

```json
{
  "mcpServers": {
    "loxtep": {
      "serverUrl": "https://mcp.loxtep.io/ai/mcp/stream"
    }
  }
}
```

Save and **Refresh** under **Settings → Customizations → Installed MCP Servers**. For dev: use `https://mcpdev.loxtep.io/ai/mcp/stream`.

Remote servers use Streamable HTTP. The remote field is `serverUrl` (`url` also works). Do not set `httpUrl`, and do not put a bearer token in the file.

Antigravity runs OAuth for servers that support dynamic client registration. Loxtep uses that flow, so no `oauth` client id is required.

### 2. Install skills

Skills for Antigravity IDE + CLI (shared):

```bash
mkdir -p ~/.gemini/skills
cp -r antigravity/skills/* ~/.gemini/skills/
```

Verify with `/skills` in Antigravity CLI if installed.

### 3. Authenticate

On first connection, Antigravity opens the browser for OAuth. If it does not start, open Agent settings → Customizations and click **Authenticate** next to `loxtep`. Finish the browser flow and paste the authorization code if asked. Tokens are stored in `~/.gemini/antigravity/mcp_oauth_tokens.json`.

### 4. Use the tools

The agent sees `loxtep_*` tools; each call sets **`operation`** plus arguments.

## How it works

Antigravity calls the hosted MCP server at `serverUrl` over Streamable HTTP and runs OAuth itself. Do not put a local `mcp-remote` process in front of it.

## Developer workflows

1. **Orient** — session + RBAC; catalog/semantic layer search.
2. **Ingest** — connector → connection → workflow graph (streaming).
3. **Productize** — governed data products with schema and lineage.
4. **Govern** — PII, quality, semantics, ontology.
5. **Consume** — webhooks, SDK.
6. **Context for AI** — entity context, decision traces.
7. **Ship & debug** — deploy, runtime mapping, queue tracing.

## What you get

### Loxtep Customer MCP

**11 hosted MCP tools:** ten job facades (`loxtep_session`, `loxtep_connect`, `loxtep_workspace`, `loxtep_build`, …) plus the MCP Apps-only `loxtep_package_review` review card. Together they cover Connect → Products ↔ Meaning → Use, with Inbox, Observe, and Organization supporting the journey.

### Skills (26 bundles)

Under `antigravity/skills/<slug>/SKILL.md`. See [docs/skills-user-stories.md](../docs/skills-user-stories.md).

Includes: `loxtep-mcp-session`, `loxtep-auth`, `loxtep-instances`, `connect-external-system`, `loxtep-journey-orchestrator`, `data-workflows`, `data-product-modeling`, `promote-data-product`, `discover-govern-lineage`, `governance-policies`, `org-semantics-quality`, `loxtep-analytics`, `loxtep-workspace`, `loxtep-deployments`, `loxtep-queue-tracing`, `loxtep-process-intel`, `loxtep-ontology`, `loxtep-procedures`, `loxtep-agent-workspace`, `loxtep-sdk`, `loxtep-semantic-layer`, `semantic-ontology-mapping`, `mcp-integration`.

## Environment variables (optional)

- `LOXTEP_ENV` or `NODE_ENV` — `dev` / `development` for dev app/API. Default is production.

See [AGENTS.md](../AGENTS.md) for the full tool map.

## Troubleshooting

| Issue | Fix |
| --- | --- |
| "Unauthorized" on connect | Confirm `serverUrl` is `https://mcp.loxtep.io/ai/mcp/stream`. Do not use `mcp-remote`. In Agent settings → Customizations, click **Authenticate** and finish the browser flow. |
| Config not picked up | Confirm `~/.gemini/config/mcp_config.json` (global) or `.agents/mcp_config.json` (workspace); refresh MCP in Settings → Customizations. |
| OAuth does not start | Open Agent settings → Customizations and click **Authenticate** next to `loxtep`. Tokens are stored in `~/.gemini/antigravity/mcp_oauth_tokens.json`. |

## License

MIT
