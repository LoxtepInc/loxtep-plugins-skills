# Loxtep for Codex

**Loxtep is the Enterprise Context Layer — turning organizational knowledge, expertise, and norms into machine-usable context for AI. Operable from OpenAI Codex over hosted MCP.**

[Loxtep](https://loxtep.io) is not another pipeline tool. Most stacks give you pipes: connect A to B, schedule a job, move on. Loxtep gives you **data products** — versioned, governed, discoverable datasets with schemas, lineage, quality rules, and delivery interfaces — backed by **real-time event streaming**, not batch glue code.

Because AI agents need more than API access, Loxtep maintains a **semantic layer, ontology, and runtime context** (entity knowledge, decision traces, process graphs) that your Codex agent can query and extend.

This directory connects Codex to that platform: hosted MCP, OAuth, and scoped skills.

This directory lives in the [loxtep-plugins-skills](https://github.com/LoxtepInc/loxtep-plugins-skills) repo under `codex/`.

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

Edit `~/.codex/config.toml` and add the snippet from `config.snippet.toml` (or below). See [Codex MCP](https://developers.openai.com/codex/mcp) and [config reference](https://developers.openai.com/codex/config-reference).

```toml
[mcp_servers.loxtep]
url = "https://mcp.loxtep.io/ai/mcp/stream"
```

On first use, Codex opens OAuth in the browser. Tokens refresh automatically.

## Developer workflows

1. **Orient** — session + RBAC; catalog/semantic layer search.
2. **Ingest** — connector → connection → workflow graph (streaming).
3. **Productize** — governed data products with schema and lineage.
4. **Govern** — PII, quality, semantics, ontology.
5. **Consume** — webhooks, SDK.
6. **Context for AI** — entity context, decision traces.
7. **Ship & debug** — deploy, runtime mapping, queue tracing.

## Example prompts

- "Search the semantic layer for how we define churn"
- "Create a source data product for Shopify orders and tag email as PII"
- "Show lineage impact if we deprecate unified_orders"
- "Trace deployment errors on the queue"

## What you get

### Loxtep Customer MCP

**19 grouped `loxtep_*` tools** — projects, workflows, connectors, data products, schemas, quality, catalog, semantic layer, ontology, analytics, deployments, workspace/queue ops, process intelligence, agent orchestration.

### Skills (23 bundles)

Under `codex/skills/<slug>/SKILL.md`. See [docs/skills-user-stories.md](../docs/skills-user-stories.md).

Includes: `loxtep-mcp-session`, `loxtep-auth`, `loxtep-instances`, `connect-external-system`, `loxtep-journey-orchestrator`, `data-workflows`, `data-product-modeling`, `promote-data-product`, `discover-govern-lineage`, `governance-policies`, `org-semantics-quality`, `loxtep-analytics`, `loxtep-workspace`, `loxtep-deployments`, `loxtep-queue-tracing`, `loxtep-process-intel`, `loxtep-ontology`, `loxtep-procedures`, `loxtep-agent-workspace`, `loxtep-sdk`, `loxtep-semantic-layer`, `semantic-ontology-mapping`, `mcp-integration`.

## License

MIT
