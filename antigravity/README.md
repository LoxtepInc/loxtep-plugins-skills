# Loxtep for Antigravity IDE

**Loxtep is the Enterprise Context Layer — turning organizational knowledge, expertise, and norms into machine-usable context for AI. Operable from Antigravity over hosted MCP.**

[Loxtep](https://loxtep.io) is not another pipeline tool. Most stacks give you pipes: connect A to B, schedule a job, move on. Loxtep gives you **data products** — versioned, governed, discoverable datasets with schemas, lineage, quality rules, and delivery interfaces — backed by **real-time event streaming**, not batch glue code.

Because AI agents need more than API access, Loxtep maintains a **semantic layer, ontology, and runtime context** (entity knowledge, decision traces, process graphs) that your Antigravity agent can query and extend.

This directory connects Antigravity to that platform via hosted MCP (through `mcp-remote` for OAuth) and scoped skills.

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

- **Node.js** 18+ (for `mcp-remote` OAuth bridge)
- **Loxtep account** with `owner`, `org_admin`, or `developer` role (for MCP tool access)
- Project-scoped operations require `project_id` (call `get_current_user` first)

## Install

### 1. Add the Loxtep MCP server

Antigravity does not yet support MCP OAuth natively, so use `mcp-remote` as a local bridge.

- Open the "..." dropdown in the Agent panel → **Manage MCP Servers** → **View raw config**.
- Add the `loxtep` entry from `mcp_config.json` in this repo:

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

Save and refresh. For dev: use `https://mcpdev.loxtep.io/ai/mcp/stream`.

### 2. Authenticate

On first connection, `mcp-remote` opens the browser for OAuth. Tokens cache locally and refresh automatically.

### 3. Use the tools

The agent sees `loxtep_*` tools; each call sets **`operation`** plus arguments.

## How it works

`mcp-remote` runs a local OAuth proxy: localhost callback → browser login → stdio bridge to Antigravity. Required until Antigravity supports MCP OAuth 2.1 natively.

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

**19 grouped `loxtep_*` tools** — projects, workflows, connectors, data products, schemas, quality, catalog, semantic layer, ontology, analytics, deployments, workspace/queue ops, process intelligence, agent orchestration.

### Skills (19 bundles)

Under `antigravity/skills/<slug>/SKILL.md`. See [docs/skills-user-stories.md](../docs/skills-user-stories.md).

Includes: `loxtep-mcp-session`, `loxtep-auth`, `loxtep-instances`, `create-connector`, `data-workflows`, `data-product-modeling`, `discover-govern-lineage`, `org-semantics-quality`, `loxtep-analytics`, `loxtep-workspace`, `loxtep-deployments`, `loxtep-queue-tracing`, `loxtep-process-intel`, `loxtep-ontology`, `loxtep-procedures`, `loxtep-agent-workspace`, `loxtep-sdk`, `loxtep-semantic-layer`, `semantic-ontology-mapping`.

## Environment variables (optional)

- `LOXTEP_ENV` or `NODE_ENV` — `dev` / `development` for dev app/API. Default is production.

See [AGENTS.md](../AGENTS.md) for the full tool map.

## Troubleshooting

| Issue | Fix |
| --- | --- |
| "Unauthorized" on connect | Use `mcp-remote` as shown; native `serverUrl` OAuth is not supported. |
| Browser doesn't open | Run `npx mcp-remote https://mcp.loxtep.io/ai/mcp/stream` manually first. |
| `npx` not found | Install Node.js 18+ and ensure `npx` is on PATH. |

## License

MIT
