# Loxtep for OpenCode

**Governed, real-time data products with a semantic layer and AI context — operable from OpenCode over hosted MCP.**

[Loxtep](https://loxtep.io) is not another pipeline tool. Most stacks give you pipes: connect A to B, schedule a job, move on. Loxtep gives you **data products** — versioned, governed, discoverable datasets with schemas, lineage, quality rules, and consumption interfaces — backed by **real-time event streaming**, not batch glue code.

Because AI agents need more than API access, Loxtep maintains a **semantic layer, ontology, and runtime context** (entity knowledge, decision traces, process graphs) that your OpenCode agent can query and extend. "Customer revenue" means *your* definition, with *your* lineage, under *your* access policies.

This directory connects OpenCode to that platform: hosted MCP, OAuth, and scoped skills so the agent works inside governance boundaries instead of around them.

This directory lives in the [loxtep-plugins-skills](https://github.com/LoxtepInc/loxtep-plugins-skills) repo under `opencode/`.

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

- **Data product** — A governed, discoverable dataset your org owns. Has schema, lineage, quality, and consumption — not a one-off script output.
- **Streaming** — Data moves as events through the platform in real time; workflows are how you implement the flow.
- **Semantic layer** — Searchable business meaning: metrics, definitions, artifacts — what agents should use instead of guessing column names.
- **AI context** — Structured org knowledge (entities, decisions, processes) the platform stores and the MCP exposes.
- **Governance** — Permissions, PII, quality, and lineage are enforced when you build and access data, not buried in a wiki.

## Prerequisites

- **OpenCode** installed ([opencode.ai/docs](https://opencode.ai/docs))
- **Loxtep account** with `owner`, `org_admin`, or `developer` role (for MCP tool access)
- Project-scoped operations require `project_id` in the payload (call `get_current_user` first)

## Install

### 1. Add the Loxtep MCP server

In your project's `opencode.json` (or global config):

```json
{
  "mcp": {
    "loxtep": {
      "type": "http",
      "url": "https://mcp.loxtep.io/ai/mcp/stream"
    }
  }
}
```

### 2. Install skills

```bash
# Project-local (recommended)
cp -r opencode/skills/ .opencode/skills/

# Or global (available in all projects)
cp -r opencode/skills/ ~/.config/opencode/skills/
```

OpenCode also discovers skills from `.claude/skills/` and `.agents/skills/` paths.

### 3. Connect

On first use, OpenCode opens a browser window for OAuth login. Tokens refresh automatically.

### 4. Use the tools

OpenCode discovers `loxtep_*` tools and skills automatically. Skills load on-demand via the native `skill` tool.

> **Dev environment:** Replace the URL with `https://mcpdev.loxtep.io/ai/mcp/stream`.

## Developer workflows

1. **Orient** — `get_current_user` → RBAC; search catalog or semantic layer first.
2. **Ingest (streaming)** — connector → connection → workflow graph → events on the bus.
3. **Productize** — governed **data product** with schema, domain, lineage.
4. **Govern** — quality rules, PII, semantics, ontology.
5. **Consume** — SQL, webhooks, SDK readers.
6. **Context for AI** — entity context, decision traces, vocabulary sync.
7. **Ship & debug** — deploy → runtime mapping → queue tracing.

## Example prompts

- "Search the semantic layer for how we define churn and which data products implement it"
- "Create a source data product for Shopify orders and tag email as PII"
- "Show lineage impact if we deprecate the unified_orders product"
- "Deploy the workflow to our dev instance and trace deployment errors on the queue"

## What you get

### Loxtep Customer MCP

Hosted at `https://mcp.loxtep.io/ai/mcp/stream` — **19 grouped `loxtep_*` tools** covering projects, workflows, connectors, **data products**, schemas, quality, catalog, **semantic layer**, ontology, analytics, deployments, workspace/queue ops, process intelligence, and agent orchestration.

### Skills (19 bundles)

See [docs/skills-user-stories.md](../docs/skills-user-stories.md). Skills live under `opencode/skills/<slug>/SKILL.md`.

| Skill slug | Focus |
| --- | --- |
| `loxtep-mcp-session` | Session, RBAC, recommended order |
| `loxtep-auth` | Auth recovery |
| `loxtep-instances` | Runtime instances |
| `create-connector` | External system connectors |
| `data-workflows` | Streaming workflows and graphs |
| `data-product-modeling` | Source/consumer data products |
| `discover-govern-lineage` | Catalog, governance, lineage |
| `org-semantics-quality` | Schemas, PII, quality rules |
| `loxtep-analytics` | SQL |
| `loxtep-workspace` | Snapshots, versions, queues |
| `loxtep-deployments` | Deploy; runtime mapping |
| `loxtep-queue-tracing` | Queue event debugging |
| `loxtep-process-intel` | Entity context, decision traces |
| `loxtep-ontology` | Ontology, vocabulary, namespaces |
| `loxtep-procedures` | Process graph procedures |
| `loxtep-agent-workspace` | Agent orchestration |
| `loxtep-sdk` | `@loxtep/sdk` runtime + CLI |
| `loxtep-semantic-layer` | Semantic layer search |
| `semantic-ontology-mapping` | External vocabulary mapping |

## Skill permissions (optional)

```json
{
  "permission": {
    "skill": {
      "loxtep-*": "allow",
      "create-connector": "allow",
      "data-workflows": "allow",
      "discover-govern-lineage": "allow",
      "org-semantics-quality": "allow"
    }
  }
}
```

## License

MIT
