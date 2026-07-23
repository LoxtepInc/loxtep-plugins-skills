# Loxtep for Kiro

**Loxtep is the AI-first, governed data layer for your business. Build agents in Kiro; Loxtep ingests your data, gives them trustworthy context, and governs every access over hosted MCP.**

[Loxtep](https://loxtep.io) handles the data underneath your agents. Connect a source — Postgres, Shopify, Stripe, a webhook — and Loxtep ingests it into **governed data products** (versioned, with schema, lineage, and quality) that your agents query over MCP, with **audit and field masking on by default**. No pipelines to hand-roll, no field names to invent.

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

### Option A — Kiro Power (recommended)

Full MCP + steering guides + onboarding:

1. **Powers** panel (ghost + lightning icon) → **Add Custom Power**
2. **Import power from a folder** → select `kiro/power/` from this repo
3. Complete Power onboarding; MCP registers under `~/.kiro/settings/mcp.json`

Or **Import power from GitHub** → this repo URL (folder must contain `POWER.md` at the power root — use the `kiro/power/` path when installing from a local clone).

### Option B — MCP only

1. Command palette → **Kiro: Open workspace MCP config** (project) or **Kiro: Open user MCP config** (global)
2. Merge the `loxtep` entry from `kiro/mcp.json`:

   ```json
   {
     "mcpServers": {
       "loxtep": {
         "url": "https://mcp.loxtep.io/ai/mcp/stream"
       }
     }
   }
   ```

3. **Connect** — OAuth opens in the browser on first use.

### Skills reference

Skill bundles live under `kiro/skills/<slug>/SKILL.md`. When using the Power, **`steering/`** files are the primary workflow context. For other setups, copy skills into your project docs or reference them from agent instructions.

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

**10 MCP job facades** (`loxtep_session`, `loxtep_connect`, `loxtep_workspace`, `loxtep_build`, …) — projects, workflows, connectors, data products, schemas, quality, catalog, semantic layer, ontology, analytics, deployments, workspace/queue ops, process intelligence, agent orchestration.

### Skills (23 bundles)

Under `kiro/skills/<slug>/SKILL.md`. See [docs/skills-user-stories.md](../docs/skills-user-stories.md).

Includes: `loxtep-mcp-session`, `loxtep-auth`, `loxtep-instances`, `connect-external-system`, `loxtep-journey-orchestrator`, `data-workflows`, `data-product-modeling`, `promote-data-product`, `discover-govern-lineage`, `governance-policies`, `org-semantics-quality`, `loxtep-analytics`, `loxtep-workspace`, `loxtep-deployments`, `loxtep-queue-tracing`, `loxtep-process-intel`, `loxtep-ontology`, `loxtep-procedures`, `loxtep-agent-workspace`, `loxtep-sdk`, `loxtep-semantic-layer`, `semantic-ontology-mapping`, `mcp-integration`.

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
