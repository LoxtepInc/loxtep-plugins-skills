# Loxtep for OpenCode

**Loxtep is the AI-first, governed data layer for your business. Build agents in OpenCode; Loxtep ingests your data, gives them trustworthy context, and governs every access over hosted MCP.**

[Loxtep](https://loxtep.io) handles the data underneath your agents. Connect a source — Postgres, Shopify, Stripe, a webhook — and Loxtep ingests it into **governed data products** (versioned, with schema, lineage, and quality) that your agents query over MCP, with **audit and field masking on by default**. No pipelines to hand-roll, no field names to invent.

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

- **Data product** — A governed, discoverable dataset your org owns. Has schema, lineage, quality, and delivery — not a one-off script output.
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

In your project `opencode.json` or global OpenCode config:

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

Or copy the bundled config: `cp opencode/opencode.json ./opencode.json`

If OAuth does not start on first use: `opencode mcp auth loxtep`

### 2. Install skills

```bash
# Project-local (recommended)
cp -r opencode/skills/ .opencode/skills/

# Global (all projects)
cp -r opencode/skills/ ~/.config/opencode/skills/
```

OpenCode also discovers `.claude/skills/` and `.agents/skills/` paths.

### 3. Connect

OAuth runs in the browser on first tool use. Tokens refresh automatically.

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

Hosted at `https://mcp.loxtep.io/ai/mcp/stream` — **10 MCP job facades** (`loxtep_session`, `loxtep_connect`, `loxtep_workspace`, `loxtep_build`, …) covering projects, workflows, connectors, **data products**, schemas, quality, catalog, **semantic layer**, ontology, analytics, deployments, workspace/queue ops, process intelligence, and agent orchestration.

### Skills (23 bundles)

See [docs/skills-user-stories.md](../docs/skills-user-stories.md). Skills live under `opencode/skills/<slug>/SKILL.md`.

| Skill slug | Focus |
| --- | --- |
| `loxtep-mcp-session` | Session, RBAC, recommended order |
| `loxtep-auth` | Auth recovery |
| `loxtep-instances` | Runtime instances |
| `connect-external-system` | External system connectors |
| `loxtep-journey-orchestrator` | Connect→AI-ready journey (P0–P7) |
| `data-workflows` | Streaming workflows and graphs |
| `data-product-modeling` | Source/consumer data products |
| `promote-data-product` | Medallion promotion |
| `discover-govern-lineage` | Catalog, governance, lineage |
| `governance-policies` | Deploy-time governance policies |
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
| `mcp-integration` | Hosted MCP access (P5) |

## Skill permissions (optional)

```json
{
  "permission": {
    "skill": {
      "loxtep-*": "allow",
      "connect-external-system": "allow",
      "data-workflows": "allow",
      "data-product-modeling": "allow",
      "promote-data-product": "allow",
      "discover-govern-lineage": "allow",
      "governance-policies": "allow",
      "org-semantics-quality": "allow",
      "semantic-ontology-mapping": "allow",
      "mcp-integration": "allow"
    }
  }
}
```

## License

MIT
