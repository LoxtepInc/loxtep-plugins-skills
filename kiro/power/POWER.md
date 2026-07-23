---
name: "loxtep"
displayName: "Loxtep Enterprise Context Layer"
description: "Loxtep is the Enterprise Context Layer — turning organizational knowledge into machine-usable context for AI. Manage governed data products, semantic ontology, process graphs, entity context, and decision traces. 10 MCP job facades with per-call operation."
keywords: ["loxtep", "context-layer", "data-product", "workflow", "connector", "semantic-layer", "ontology", "governance", "process-intelligence", "streaming"]
author: "Loxtep"
---

# Loxtep Enterprise Context Layer

## Overview

Loxtep is the **Enterprise Context Layer** — the system that turns organizational knowledge, expertise, and norms into machine-usable context for AI. Built on **governed data products** over a **real-time streaming** backbone with a **semantic layer**, **ontology**, **process graph**, and **AI context** (entity knowledge, decision traces) that agents query instead of inventing.

Connect external systems (Shopify, Salesforce, APIs) via workflows, create versioned and governed data products, and expose organizational context through a semantic layer and process intelligence. The hosted MCP provides **10 job facades** (`loxtep_session`, `loxtep_connect`, `loxtep_workspace`, `loxtep_build`, …) — each call sets `operation` to a flat action name plus arguments.

This power covers the full platform lifecycle:
- **Authentication** and session management
- **Connectors** — OAuth, API key, and SDK-based integrations
- **Projects & Workflows** — real-time streaming pipelines
- **Data Products** — governed, discoverable assets with schema and lineage
- **Semantic Layer & Ontology** — canonical business terms, vocabulary, namespaces
- **Catalog & Governance** — discovery, lineage, evidence, quality rules, PII tagging
- **Analytics** — SQL queries over data products
- **Instances & Deployment** — runtime provisioning and deployment
- **Process Intelligence** — entity context, decision traces, organizational skills
- **Agent Workspace** — issues, goals, and agent orchestration

## Available Steering Files

Each steering file covers an independent workflow area. Load the one matching user intent:

- **data-workflows** — Projects, workflow graphs, connections, data products, delivery interfaces, deployment (Stories S0, S2, S3)
- **connect-external-system** — Connect Shopify, Salesforce, or any SaaS/API; OAuth, API key, and SDK connector flows (Story S1)
- **discover-govern-lineage** — Catalog search, lineage impact, evidence, governance flags, discovery (Story S5)
- **org-semantics-quality** — Org-level schemas, PII tagging, schema versions, quality rules (Story S4)
- **loxtep-analytics** — SQL analytics, list tables, table schema, execute queries (Story S6)
- **loxtep-workspace** — Snapshots, version compare/restore, reindex, queue info, read queue events, replay (Story S7)
- **loxtep-queue-tracing** — Debug deployments and data flow by reading output/error queues from the live runtime
- **loxtep-process-intel** — Entity context, decision traces (Story S8)
- **loxtep-procedures** — Business procedures in the process graph, import/export, dependencies (Story S9)
- **loxtep-ontology** — Ontology concepts, vocabulary/thesaurus CRUD, namespace mappings (Story S13)
- **loxtep-agent-workspace** — Agent orchestration: issues, goals, agent projects (Story S10)
- **loxtep-instances** — Runtime instance provisioning: shared, managed, self-hosted (Story S11)
- **loxtep-sdk** — @loxtep/sdk Node bootstrap, queue readers/writers, runtime naming conventions

## Onboarding

### Prerequisites

- **Loxtep account** with `owner`, `org_admin`, or `developer` role
- MCP configured with hosted URL: `https://mcp.loxtep.io/ai/mcp/stream`

### Authentication

Authentication is handled automatically via OAuth when you connect the Loxtep MCP server. A browser window will open for login — sign in and authorize the connection. Tokens refresh automatically.

### Authentication Recovery

When any `loxtep_*` tool call fails with:
- **"No valid authentication token found"**, or
- **"RBAC requires JWT token in Authorization header or x-jwt-token header"**

Disconnect and reconnect the Loxtep MCP server in your IDE's MCP settings to re-trigger the OAuth flow, then retry the failed call.

**Dev environment:** Use `https://mcpdev.loxtep.io/ai/mcp/stream` as the server URL to connect to the Loxtep dev instance.

### Environment Variables (optional)

- `LOXTEP_ENV` or `NODE_ENV` — Set to `dev` / `development` when your client or tooling targets dev endpoints. Default is production.

## Session Pattern (Start Here)

Before any project work, confirm identity and org context:

1. `loxtep_session` → `get_current_user` — returns `permissions` (effective resource/action grants), `roles`, and org context.
2. `loxtep_session` → `get_current_organization` — confirms organizational scope and governance settings.
3. For project-scoped operations on **`loxtep_build`** or **`loxtep_workspace`**, always include `project_id`.
4. Use the **semantic layer** and **ontology** to resolve canonical business terms instead of guessing field names.

### Permission Denials

- Match failure messages to `get_current_user.permissions`. Role changes are admin-only.
- **401 / missing token** → reconnect the Loxtep MCP server to re-trigger OAuth (see Authentication Recovery above).
- **403 / permission denied** → check `permissions` array for the required `resource:action` grant.

## How MCP Calls Work

All 10 tools follow the same pattern:

1. **Tool name** — e.g. `loxtep_connect`, `loxtep_build`, `loxtep_workspace`
2. **`operation`** — flat action name (e.g. `list_projects`, `save_workflow_bundle`)
3. **Other fields** — API arguments at top level next to `operation`

Example (call **`loxtep_workspace`**, not `loxtep_projects`):
```json
{
  "operation": "create_project",
  "name": "customer-orders"
}
```

## MCP Tools Reference

See [AGENTS.md](../../AGENTS.md) for the full 10-facade operation tables (`loxtep_session` through `loxtep_context`). Deprecated 22-facade names are not registered on the hosted server.

## Story Index

| ID | Story | Steering File |
|----|-------|---------------|
| S0 | Session and org context | data-workflows |
| S1 | Connect SaaS/API (Shopify, etc.) | connect-external-system |
| S2 | Omnichannel data product | data-workflows |
| S3 | Webhook delivery for data product updates | data-workflows |
| S4 | Org schemas, PII, quality rules | org-semantics-quality |
| S5 | Catalog, lineage, discovery | discover-govern-lineage |
| S6 | SQL analytics over data products | loxtep-analytics |
| S7 | Snapshots, versions, reindex | loxtep-workspace |
| S8 | Entity/ontology/thesaurus intelligence | loxtep-process-intel |
| S9 | Business procedures | loxtep-procedures |
| S10 | Agent issues/goals/projects | loxtep-agent-workspace |
| S11 | Runtime instances | loxtep-instances |
| S12 | Auth recovery | (this file — Onboarding section) |
| S13 | Ontology, vocabulary, and namespace management | loxtep-ontology |

## Troubleshooting

### MCP Server Won't Connect

- Verify the hosted endpoint is reachable: `curl -sI https://mcp.loxtep.io/ai/mcp/oauth/.well-known`
- Check for network/firewall issues blocking `mcp.loxtep.io`

### Authentication Errors

- **"No valid authentication token found"** → Disconnect and reconnect the Loxtep MCP server to re-trigger OAuth
- **Token expired** → Same fix; tokens auto-refresh but may expire after extended inactivity
- **Wrong environment** → Set `LOXTEP_ENV=dev` if targeting dev endpoints

### Permission Errors (403)

- Run `loxtep_session` → `get_current_user` to check your `permissions` array
- Required grants are `resource:action` style (e.g. `projects:create`, `workflows:update`)
- Contact an org admin to adjust your role if needed

### Project-Scoped Tool Errors

- Always include `project_id` for project-scoped ops on **`loxtep_build`** (workflows, triggers, data products, deploy writes) and **`loxtep_workspace`** (version ops)
- Get `project_id` from **`loxtep_workspace`** → `list_projects` or `create_project`

## Best Practices

- Always start with `get_current_user` → `get_current_organization` to confirm context and organizational governance
- Query the **semantic layer** first to resolve canonical field names and business meanings before building workflows
- Use `list_projects` to get `project_id` before project-scoped operations
- Query **ontology** and **thesaurus** to align with organizational vocabulary and namespace mappings
- Access **entity context** and **decision traces** to understand organizational knowledge about data and decisions
- For workflow graphs, always call `patch_workflow_graph` twice: first to add nodes, then to connect them (you need the returned entity IDs)
- Use `dry_run: true` on `patch_workflow_graph` to validate before persisting
- Deploy projects to an instance before attempting SDK event writes
- Use `entity_type` values with hyphens: `data-products`, `quality-rules` (not underscores)
- For ontology/vocabulary management, use `loxtep_ontology` (not `loxtep_process_intel`). Process intel is for runtime entity context and decision traces only
- Use `sync_vocabulary` with `dry_run: true` to preview vocabulary diffs before applying bulk changes
- Register namespace mappings via `register_namespace_mapping` before importing graphs that use external ontologies (W3C PKO is pre-registered)
- Leverage **process intelligence** to understand organizational processes and decision flows before building automated workflows
