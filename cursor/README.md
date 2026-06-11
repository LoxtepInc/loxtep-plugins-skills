# Loxtep Cursor Plugin

**Governed, real-time data products with a semantic layer and AI context — operable from Cursor over hosted MCP.**

[Loxtep](https://loxtep.io) is not another pipeline tool. Most stacks give you pipes: connect A to B, schedule a job, move on. Loxtep gives you **data products** — versioned, governed, discoverable datasets with schemas, lineage, quality rules, and consumption interfaces — backed by **real-time event streaming**, not batch glue code.

Because AI agents need more than API access, Loxtep maintains a **semantic layer, ontology, and runtime context** (entity knowledge, decision traces, process graphs) that your Cursor agent can query and extend. "Customer revenue" means *your* definition, with *your* lineage, under *your* access policies.

This plugin is the developer surface for that platform: hosted MCP, OAuth, scoped skills, and an auth-recovery rule so the agent works inside governance boundaries instead of around them.

This plugin lives in the [loxtep-plugins-skills](https://github.com/LoxtepInc/loxtep-plugins-skills) repo under `cursor/`. For Cursor Marketplace or install from Git, use the repo URL and select the `cursor/` path if your client supports subpaths.

## What makes Loxtep different

| Generic workflow tool | Loxtep |
| --- | --- |
| Pipelines as the unit of work | **Data products** — owned, versioned, cataloged assets with contracts and SLAs |
| Batch ETL / cron jobs | **Event streaming** (rstreams) — flows built for continuous, real-time data movement |
| Docs about data definitions | **Semantic layer + ontology** — canonical terms, namespaces, mappings agents can resolve |
| "The AI read our wiki" | **AI context** — entity context, decision traces, process intelligence wired to the platform |
| Security as an afterthought | **Data governance by design** — RBAC, PII tagging, quality rules, access requests, audit-friendly lineage |
| Opaque data sprawl | **Discovery** — catalog search, evidence, lineage impact, governance flags |

You are not duct-taping integrations. You are **publishing governed data products** on a streaming backbone, with business meaning and AI context attached.

## Key concepts

- **Data product** — A governed, discoverable dataset your org owns. Has schema, lineage, quality, and consumption — not a one-off script output.
- **Streaming** — Data moves as events through the platform in real time; workflows are how you implement the flow.
- **Semantic layer** — Searchable business meaning: metrics, definitions, artifacts — what agents should use instead of guessing column names.
- **AI context** — Structured org knowledge (entities, decisions, processes) the platform stores and the MCP exposes.
- **Governance** — Permissions, PII, quality, and lineage are enforced when you build and access data, not buried in a wiki.

## Prerequisites

- **Loxtep account** with `owner`, `org_admin`, or `developer` role (for MCP tool access)
- Project-scoped operations require `project_id` in the payload (call `get_current_user` first to confirm RBAC grants)

## Quick start

1. **Install the plugin** in Cursor (marketplace, or Settings → Plugins → Install from Git with `https://github.com/LoxtepInc/loxtep-plugins-skills` and `cursor/` as the plugin path if supported).

2. **Or add manually** — merge the following into your `.cursor/mcp.json` or project `.mcp.json`:

   ```json
   {
     "mcpServers": {
       "loxtep": {
         "url": "https://mcp.loxtep.io/ai/mcp/stream"
       }
     }
   }
   ```

3. **Connect** — On first use, Cursor opens a browser window for OAuth login. Sign in to Loxtep; tokens refresh automatically. No `npx`, no token files.

4. **Use the tools** — In the MCP palette you will see grouped tools like `loxtep_projects` and `loxtep_data_products`. Pass **`operation`** (e.g. `list_projects`, `create_data_product`) and the fields that action needs.

> **Dev environment:** Replace the URL with `https://mcpdev.loxtep.io/ai/mcp/stream` to connect to the Loxtep dev instance.

## Developer workflows

1. **Orient** — `loxtep_session` → `get_current_user` → RBAC grants; search catalog or semantic layer before inventing field names.
2. **Ingest (streaming)** — connector → connection node → workflow graph → events on the bus.
3. **Productize** — create a **data product** with schema, domain, lineage — not just a destination table.
4. **Govern** — quality rules, PII fields, semantic definitions, ontology concepts.
5. **Consume** — SQL analytics (DuckDB), webhooks, SDK readers against governed products.
6. **Context for AI** — entity context, decision traces, vocabulary sync so the next agent session starts smarter.
7. **Ship & debug** — deploy to instance → runtime mapping → queue tracing on failure.

## Example prompts

- "Search the semantic layer for how we define churn and which data products implement it"
- "Create a **source** data product for Shopify orders with schema v1 and tag email as PII"
- "Show lineage impact if we deprecate the `unified_orders` product"
- "Patch the ingestion workflow graph to add a validation node before the data product sink"
- "Record entity context for this customer-360 decision trace"
- "Deploy the workflow to our dev instance and trace deployment errors on the queue"
- "Run SQL against the orders product and compare to catalog metadata"

## What's included

### Loxtep Customer MCP

Hosted at `https://mcp.loxtep.io/ai/mcp/stream` — **19 grouped `loxtep_*` tools** with `operation`-based dispatch covering projects, workflows, connectors, **data products**, schemas, quality rules, catalog, **semantic layer**, ontology, analytics, deployments, workspace/queue ops, process intelligence, and agent orchestration.

### Auth recovery rule

`rules/loxtep-mcp-auth.mdc` — guides the agent to re-authenticate when a tool call fails with "No valid authentication token". Triggers the OAuth browser flow recovery.

### Logo

`assets/logo.svg` — Loxtep logo for Cursor Marketplace display.

### Skills (19 bundles)

Scoped skill bundles under `cursor/skills/<slug>/SKILL.md` teach the agent platform concepts and safe operation order. See [docs/skills-user-stories.md](../docs/skills-user-stories.md) for the full user-story catalog.

| Skill slug | Focus |
| --- | --- |
| `loxtep-mcp-session` | Orient: capabilities, RBAC grants, recommended session order |
| `loxtep-auth` | Authentication flows and token management |
| `loxtep-instances` | Provision/manage runtime instances |
| `create-connector` | Connect external systems |
| `data-workflows` | Author streaming workflows and graph operations |
| `data-product-modeling` | Model source/consumer data products |
| `discover-govern-lineage` | Catalog discovery, governance, lineage |
| `org-semantics-quality` | Schemas, semantics, PII, quality rules |
| `loxtep-analytics` | DuckDB SQL analytics |
| `loxtep-workspace` | Snapshots, versions, workspace index |
| `loxtep-deployments` | Deploy projects/workflows; runtime mapping |
| `loxtep-queue-tracing` | Debug flows via queue event tracing |
| `loxtep-process-intel` | Entity context + decision traces |
| `loxtep-ontology` | Ontology, vocabulary, namespaces |
| `loxtep-procedures` | Process graph procedures |
| `loxtep-agent-workspace` | Agent orchestration (issues/goals/agents) |
| `loxtep-sdk` | `@loxtep/sdk` runtime + CLI |
| `loxtep-semantic-layer` | Semantic layer search, artifacts, completeness |
| `semantic-ontology-mapping` | Map external vocabularies to the ontology |

## Cursor Marketplace submission

Before submitting at [cursor.com/marketplace/publish](https://cursor.com/marketplace/publish): ensure valid manifest, relative paths, README, logo, and frontmatter on rules/skills. Submit the repository URL; if the marketplace supports a plugin subpath, specify `cursor/`. Plugins are manually reviewed.

## License

MIT
