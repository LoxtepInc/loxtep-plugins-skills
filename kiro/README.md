# Loxtep for Kiro

**Governed, real-time data products with a semantic layer and AI context — operable from Kiro over hosted MCP.**

[Loxtep](https://loxtep.io) is not another pipeline tool. Most stacks give you pipes: connect A to B, schedule a job, move on. Loxtep gives you **data products** — versioned, governed, discoverable datasets with schemas, lineage, quality rules, and delivery interfaces — backed by **real-time event streaming**, not batch glue code.

Because AI agents need more than API access, Loxtep maintains a **semantic layer, ontology, and runtime context** (entity knowledge, decision traces, process graphs) that your Kiro agent can query and extend.

This directory connects Kiro to that platform: hosted MCP, OAuth, scoped skills, and optional **Kiro Power** steering guides.

This directory lives in the [loxtep-plugins-skills](https://github.com/LoxtepInc/loxtep-plugins-skills) repo under `kiro/`.

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

- **Loxtep account** with `owner`, `org_admin`, or `developer` role (for MCP tool access)
- Project-scoped operations require `project_id` (call `get_current_user` first)

## Install

1. **Add the Loxtep MCP server** to Kiro:
   - **Workspace:** Copy `mcp.json` into `.kiro/settings/mcp.json`, or merge the `loxtep` entry.
   - **User (global):** Copy into `~/.kiro/settings/mcp.json`.

   ```json
   {
     "mcpServers": {
       "loxtep": {
         "url": "https://mcp.loxtep.io/ai/mcp/stream"
       }
     }
   }
   ```

2. **Connect** — On first use, Kiro opens OAuth in the browser. Tokens refresh automatically.

3. **Use the tools** — MCP panel lists `loxtep_*` tools. Pass **`operation`** plus action arguments.

> **Dev environment:** `https://mcpdev.loxtep.io/ai/mcp/stream`

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

Under `kiro/skills/<slug>/SKILL.md`. See [docs/skills-user-stories.md](../docs/skills-user-stories.md).

Includes: `loxtep-mcp-session`, `loxtep-auth`, `loxtep-instances`, `create-connector`, `data-workflows`, `data-product-modeling`, `discover-govern-lineage`, `org-semantics-quality`, `loxtep-analytics`, `loxtep-workspace`, `loxtep-deployments`, `loxtep-queue-tracing`, `loxtep-process-intel`, `loxtep-ontology`, `loxtep-procedures`, `loxtep-agent-workspace`, `loxtep-sdk`, `loxtep-semantic-layer`, `semantic-ontology-mapping`.

## `power/` subdirectory (Kiro Power)

The `kiro/power/` directory packages Loxtep as a **Kiro Power** — discoverable plugin with steering workflows.

```
kiro/power/
├── POWER.md        # Manifest, MCP tools reference, steering index
├── mcp.json        # MCP server connection config
└── steering/       # Step-by-step workflow guides per functional area
```

- **POWER.md** — Overview, onboarding, session patterns, MCP reference, troubleshooting.
- **mcp.json** — Hosted Loxtep MCP server registration.
- **steering/** — Workflow guides (connectors, workflows, analytics, governance, etc.).

## License

MIT
