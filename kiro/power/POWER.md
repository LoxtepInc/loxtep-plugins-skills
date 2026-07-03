---
name: "loxtep"
displayName: "Loxtep Enterprise Context Layer"
description: "Loxtep is the Enterprise Context Layer — turning organizational knowledge into machine-usable context for AI. Manage governed data products, semantic ontology, process graphs, entity context, and decision traces. 19 grouped MCP tools with per-call operation."
keywords: ["loxtep", "context-layer", "data-product", "workflow", "connector", "semantic-layer", "ontology", "governance", "process-intelligence", "streaming"]
author: "Loxtep"
---

# Loxtep Enterprise Context Layer

## Overview

Loxtep is the **Enterprise Context Layer** — the system that turns organizational knowledge, expertise, and norms into machine-usable context for AI. Built on **governed data products** over a **real-time streaming** backbone with a **semantic layer**, **ontology**, **process graph**, and **AI context** (entity knowledge, decision traces) that agents query instead of inventing.

Connect external systems (Shopify, Salesforce, APIs) via workflows, create versioned and governed data products, and expose organizational context through a semantic layer and process intelligence. The Customer MCP provides **19 grouped tools** (`loxtep_*`) — each call sets `operation` to a flat action name plus arguments.

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
- **create-connector** — Connect Shopify, Salesforce, or any SaaS/API; OAuth, API key, and SDK connector flows (Story S1)
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
3. For project-scoped tools (`loxtep_workflows`, `loxtep_connections`, `loxtep_data_products`), always include `project_id`.
4. Use the **semantic layer** and **ontology** to resolve canonical business terms instead of guessing field names.

### Permission Denials

- Match failure messages to `get_current_user.permissions`. Role changes are admin-only.
- **401 / missing token** → reconnect the Loxtep MCP server to re-trigger OAuth (see Authentication Recovery above).
- **403 / permission denied** → check `permissions` array for the required `resource:action` grant.

## How MCP Calls Work

All 19 tools follow the same pattern:

1. **Tool name** — e.g. `loxtep_projects`, `loxtep_workflows`, `loxtep_connectors`
2. **`operation`** — flat action name (e.g. `list_projects`, `create_workflow`)
3. **Other fields** — API arguments at top level next to `operation`

Example:
```json
{
  "operation": "create_project",
  "name": "customer-orders"
}
```

## MCP Tools Reference

| Tool | Operations | Scope |
|------|-----------|-------|
| `loxtep_session` | `get_current_user`, `get_current_organization` | organization |
| `loxtep_projects` | `list_projects`, `get_project`, `create_project`, `update_project`, `delete_project` | organization |
| `loxtep_instances` | `list_instances`, `create_instance` | organization |
| `loxtep_connectors` | `list_connector_types`, `list_connectors`, `create_connector`, `get_connector_oauth_url` | global / organization |
| `loxtep_connections` | `create_connection`, `update_connection`, `delete_connection`, `list_connections`, `get_connection`, `test_connection` | project |
| `loxtep_templates` | `list_templates`, `get_template`, `apply_template` | organization / project |
| `loxtep_workflows` | `create_workflow`, `update_workflow`, `delete_workflow`, `list_workflows`, `get_workflow`, `get_workflow_graph`, `patch_workflow_graph`, `preview_transform`, `create_transformation`, `create_validation` | project |
| `loxtep_data_products` | `create_data_product`, `update_data_product`, `delete_data_product`, `list_data_products`, `get_data_product`, `get_data_product_lexicon`, `get_data_product_sdk_config`, `list_delivery_interfaces`, `create_delivery_interface` | project / organization |
| `loxtep_schemas` | `create_schema`, `update_schema`, `delete_schema`, `get_schema`, `list_schema_versions`, `tag_pii_fields` | organization |
| `loxtep_quality` | `create_quality_rule`, `update_quality_rule`, `delete_quality_rule`, `list_quality_rules`, `get_quality_rule`, `test_quality_rule` | organization |
| `loxtep_catalog` | `search_catalog`, `get_catalog_entry`, `get_evidence`, `get_lineage_impact`, `get_governance_flags`, `list_domains`, `list_tags` | catalog |
| `loxtep_analytics` | `execute_query`, `list_tables`, `get_table_schema`, `get_query_results` | organization |
| `loxtep_workspace` | `list_versions`, `create_snapshot`, `restore_version`, `compare_versions`, `reindex_workspace`, `get_queue_info`, `replay_events`, `read_queue_events` | project / organization |
| `loxtep_process_intel` | `get_entity_context`, `query_entity_context`, `create_entity_context`, `list_decision_traces`, `record_decision_trace` | organization |
| `loxtep_procedures` | `list_procedures`, `get_procedure`, `create_procedure`, `update_procedure`, `delete_procedure`, `import_process_graph`, `export_process_graph`, `get_procedure_dependencies` | organization |
| `loxtep_ontology` | `list_thesaurus_terms`, `get_thesaurus_term`, `create_thesaurus_term`, `update_thesaurus_term`, `delete_thesaurus_term`, `sync_vocabulary`, `resolve_canonical_key`, `get_ontology_relationships`, `create_ontology_concept`, `create_ontology_relationship`, `update_ontology_concept`, `delete_ontology_concept`, `register_namespace_mapping`, `list_namespace_mappings`, `get_namespace_mapping` | organization |
| `loxtep_agent_workspace` | `agent_orchestration_create_issue`, `agent_orchestration_list_issues`, `agent_orchestration_get_issue`, `agent_orchestration_create_goal`, `agent_orchestration_list_goals`, `agent_orchestration_get_goal`, `agent_orchestration_list_projects`, `agent_orchestration_create_project`, `agent_orchestration_get_project`, `agent_orchestration_list_agents`, `agent_orchestration_get_agent` | organization |
| `loxtep_semantic_layer` | `search_semantic_layer`, `get_semantic_artifact`, `get_semantic_completeness` | organization |
| `loxtep_deployments` | `deploy_project`, `deploy_workflow`, `list_deployments`, `get_deployment`, `get_runtime_mapping` | project / organization |

## Story Index

| ID | Story | Steering File |
|----|-------|---------------|
| S0 | Session and org context | data-workflows |
| S1 | Connect SaaS/API (Shopify, etc.) | create-connector |
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

- Always include `project_id` for: `loxtep_workflows`, `loxtep_connections`, `loxtep_data_products` (CRUD ops), `loxtep_workspace` (version ops)
- Get `project_id` from `loxtep_projects` → `list_projects` or `create_project`

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
