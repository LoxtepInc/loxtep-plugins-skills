# Loxtep Claude Plugin

**Loxtep is the AI-first, governed data layer for your business. Build agents in Claude Code and Cowork; Loxtep ingests your data, gives them trustworthy context, and governs every access over hosted MCP.**

[Loxtep](https://loxtep.io) handles the data underneath your agents. Connect a source — Postgres, Shopify, Stripe, a webhook — and Loxtep ingests it into **governed data products** (versioned, with schema, lineage, and quality) that your agents query over MCP, with **audit and field masking on by default**. No pipelines to hand-roll, no field names to invent.

Because AI agents need more than API access, Loxtep maintains a **semantic layer, ontology, and runtime context** (entity knowledge, decision traces, process graphs) that your Claude agent can query and extend. "Customer revenue" means *your* definition, with *your* lineage, under *your* access policies.

This plugin is the developer surface for that platform: hosted MCP, OAuth, and scoped skills so the agent works inside governance boundaries instead of around them.

This plugin lives in the [loxtep-plugins-skills](https://github.com/LoxtepInc/loxtep-plugins-skills) repo under `claude/`.

## What makes Loxtep different

| Generic workflow tool | Loxtep |
| --- | --- |
| Pipelines as the unit of work | **Data products** — owned, versioned, cataloged assets with contracts and SLAs |
| Batch ETL / cron jobs | **Event streaming** — flows built for continuous, real-time data movement |
| Docs about data definitions | **Semantic layer + ontology** — canonical terms, namespaces, mappings agents can resolve |
| "The AI read our wiki" | **AI context** — entity context, decision traces, process intelligence wired to the platform |
| Security as an afterthought | **Data governance by design** — RBAC, PII tagging, quality rules, access requests, audit-friendly lineage |
| Opaque data sprawl | **Discovery** — catalog search, evidence, lineage impact, governance flags |

You are not duct-taping integrations. You are **publishing governed data products** on a streaming backbone, with business meaning and AI context attached.

## Key concepts

- **Data product** — A governed, discoverable dataset your org owns. Has schema, lineage, quality, and delivery — not a one-off script output.
- **Streaming** — Data moves as events through the platform in real time; workflows are how you implement the flow.
- **Semantic layer** — Searchable business meaning: metrics, definitions, artifacts — what agents should use instead of guessing column names.
- **AI context** — Structured org knowledge (entities, decisions, processes) the platform stores and the MCP exposes.
- **Governance** — Permissions, PII, quality, and lineage are enforced when you build and access data, not buried in a wiki.

## Prerequisites

- **Loxtep account** with `owner`, `org_admin`, or `developer` role (for MCP tool access)
- Project-scoped operations require `project_id` in the payload (call `get_current_user` first to confirm RBAC grants)

## Quick start

1. **Install via marketplace** (recommended):

   ```bash
   claude plugin marketplace add LoxtepInc/loxtep-plugins-skills
   claude plugin install loxtep-claude@loxtep
   ```

   In Claude Code you can also run `/plugin install loxtep-claude@loxtep`.

   Or install from a local clone:

   ```bash
   claude plugin install /path/to/loxtep-plugins-skills/claude
   ```

2. **Or add MCP only** — merge into `~/.claude/mcp.json` or project `.mcp.json` (tools only; no bundled skills/rules):

   ```json
   {
     "mcpServers": {
       "loxtep": {
         "url": "https://mcp.loxtep.io/ai/mcp/stream"
       }
     }
   }
   ```

3. **Connect** — On first use, Claude opens a browser window for OAuth login. Sign in to Loxtep; tokens refresh automatically. No `npx`, no token files.

4. **Use the tools** — Grouped tools like `loxtep_projects` and `loxtep_data_products`. Pass **`operation`** (e.g. `list_projects`, `create_data_product`) and the fields that action needs.

> **Dev environment:** Replace the URL with `https://mcpdev.loxtep.io/ai/mcp/stream` to connect to the Loxtep dev instance.

## Developer workflows

1. **Orient** — `loxtep_session` → `get_current_user` → RBAC grants; search catalog or semantic layer before inventing field names.
2. **Ingest (streaming)** — connector → workflow bundle (connection + transforms + `data-products/{id}.json`) → deploy → events on the bus.
3. **Productize** — data product **emerges from workflow deploy** with schema, domain, lineage — not via standalone `create_data_product`.
4. **Govern** — quality rules, PII fields, semantic definitions, ontology concepts.
5. **Consume** — SQL analytics , webhooks, SDK readers against governed products.
6. **Context for AI** — entity context, decision traces, vocabulary sync so the next agent session starts smarter.
7. **Ship & debug** — deploy to instance → runtime mapping → queue tracing on failure.

## Example prompts

- "Search the semantic layer for how we define churn and which data products implement it"
- "Design a **source** data product for Shopify orders (schema v1, email as PII) and deploy the ingestion workflow"
- "Show lineage impact if we deprecate the `unified_orders` product"
- "Patch the ingestion workflow graph to add a validation node before the data product sink"
- "Record entity context for this customer-360 decision trace"
- "Deploy the workflow to our dev instance and trace deployment errors on the queue"
- "Run SQL against the orders product and compare to catalog metadata"

## What's included

### Loxtep Customer MCP

Hosted at `https://mcp.loxtep.io/ai/mcp/stream` — **19 grouped `loxtep_*` tools** with `operation`-based dispatch covering projects, workflows, connectors, **data products**, schemas, quality rules, catalog, **semantic layer**, ontology, analytics, deployments, workspace/queue ops, process intelligence, and agent orchestration.

### Auth recovery rule

`rules/loxtep-mcp-auth.mdc` — guides the agent to reconnect the hosted MCP server when auth fails (OAuth 2.1 recovery).

### Skills (23 bundles)

Scoped skill bundles under `claude/skills/<slug>/SKILL.md`. See [docs/skills-user-stories.md](../docs/skills-user-stories.md) for the full user-story catalog.

| Skill slug | Focus |
| --- | --- |
| `loxtep-mcp-session` | Orient: capabilities, RBAC grants, recommended session order |
| `loxtep-auth` | Authentication flows and token management |
| `loxtep-instances` | Provision/manage runtime instances |
| `connect-external-system` | Connect external systems (OAuth, API key, SDK) |
| `loxtep-journey-orchestrator` | Connect→AI-ready journey orchestration (P0–P7) |
| `data-workflows` | Author streaming workflows and graph operations |
| `data-product-modeling` | Model source/consumer data products |
| `promote-data-product` | Medallion promotion and readiness checks |
| `discover-govern-lineage` | Catalog discovery, governance, lineage |
| `governance-policies` | Deploy-time governance policy authoring |
| `org-semantics-quality` | Schemas, semantics, PII, quality rules |
| `loxtep-analytics` | SQL analytics |
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
| `mcp-integration` | Hosted MCP access setup and validation (P5) |

## Submission (Claude plugin discovery)

If you submit this plugin to Anthropic's plugin directory or marketplace, use the repository URL and the `claude/` path as the plugin root. Follow [Claude Code plugins](https://code.claude.com/docs/en/plugins-reference) and [Claude plugin discovery](https://code.claude.com/en/discover-plugins) for current requirements.

## License

MIT
