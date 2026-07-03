# User stories → Customer MCP (living catalog)

Hosted endpoint: `https://mcp.loxtep.io/ai/mcp/stream`.

Each story lists **primary skill** (where the narrative lives) and **supporting skills**.

---

## Story index

| ID | Story | Primary skill |
|----|--------|----------------|
| S0 | Know who I am and which org I am in | `loxtep-mcp-session` (capabilities / denials); `data-workflows` (session ops in flows) |
| S1 | Connect a SaaS store or API (e.g. Shopify) and bring data into a project | `create-connector` |
| S2 | Build a **data product** that unifies data across channels (omnichannel) | `data-workflows` |
| S3 | Send data product updates to an **external webhook** | `data-workflows` |
| S4 | Configure **org-level** schemas, semantics, PII, and quality rules | `org-semantics-quality` |
| S5 | **Discover** assets, lineage, evidence, governance; run discovery | `discover-govern-lineage` |
| S6 | **Query** mesh data with SQL / analytics | `loxtep-analytics` |
| S7 | **Snapshots**, compare versions, reindex workspace, inspect queues | `loxtep-workspace` |
| S8 | **Entity / decision** intelligence — runtime context, decision traces, and unified context retrieval | `loxtep-process-intel` |
| S9 | **Procedures** (process graph) — CRUD, import/export, dependencies | `loxtep-procedures` |
| S10 | **Agent** issues/goals/projects (not data-mesh workflow projects) | `loxtep-agent-workspace` |
| S11 | **Provision** or list runtime instances (shared playground vs managed paid) | `loxtep-instances` |
| S12 | Recover from **auth** failures on MCP | `loxtep-auth` |
| S13 | Manage **ontology**, vocabulary, and namespace mappings | `loxtep-ontology` |
| S14 | **Deploy** projects/workflows to runtime instances, check status | `loxtep-deployments` |
| S15 | **Search** semantic layer, retrieve artifacts, check completeness | `loxtep-semantic-layer` |

---

## S0 — Session and organization context

| Field | Detail |
|-------|--------|
| **Persona** | Any user or agent before other calls |
| **Preconditions** | Valid MCP login |
| **Happy path** | `loxtep_session` + `get_current_user` → `get_current_organization` |
| **Capabilities** | `get_current_user` returns **`permissions`** (effective `resource` / `action` grants) and **`roles`**. Use with your client’s **ListTools** for `loxtep_*` parameters — there is no extra “what can I do” MCP operation. |
| **MCP** | Tool `loxtep_session`, operations `get_current_user`, `get_current_organization` (organization scope) |
| **Out of scope** | RBAC role editing |

---

## S1 — Connect Shopify (or similar) and ingest

| Field | Detail |
|-------|--------|
| **Persona** | Data engineer, integrator |
| **Preconditions** | Org role allows connectors; optional `project_id` for connection node |
| **Happy path** | `list_connector_types` → `get_connector_oauth_url` (Shopify: include `connection_config.shop`) or `create_connector` → `create_connection` in project → wire graph via `patch_workflow_graph` (see S2) |
| **MCP** | `loxtep_connectors` (global/org), `loxtep_connections` (project), `loxtep_workflows` for graph |
| **Primary skill** | `create-connector` |
| **Edge cases** | OAuth timeout; connector type not in catalog — request new types from Loxtep |

---

## S2 — Omnichannel data product (unify sales across channels)

| Field | Detail |
|-------|--------|
| **Persona** | Data product owner |
| **Preconditions** | Project exists; connections per channel (S1) |
| **Happy path** | `create_project` or `get_project` → multiple `create_connection` / graph → `create_data_product` with definitions linking sources → `get_data_product` / `update_data_product` |
| **MCP** | `loxtep_projects`, `loxtep_connections`, `loxtep_workflows`, `loxtep_data_products`, `loxtep_templates` optional |
| **Primary skill** | `data-workflows` |
| **Out of scope** | Billing for managed infra (see `loxtep-instances`) |

---

## S3 — Webhook delivery for data product updates

| Field | Detail |
|-------|--------|
| **Persona** | Integrator exposing mesh events to sales stack |
| **Preconditions** | `data_product_id` known |
| **Happy path** | `list_delivery_interfaces` (optional) → `create_delivery_interface` with `data_product_id`, `endpoint_url`, optional `headers`, `secret_token`, `filters` |
| **MCP** | `loxtep_data_products`: `create_delivery_interface`, `list_delivery_interfaces` (organization-scoped; requires `data_product_id`) |
| **Primary skill** | `data-workflows` |
| **Product note** | Tool descriptions reference webhook subscriptions (delivery interfaces). If your deployment restricts delivery interfaces, treat as **partial** until API confirms. |

---

## S4 — Org semantics, schemas, ontology-adjacent definitions, quality

| Field | Detail |
|-------|--------|
| **Persona** | Governance lead, semantic modeler |
| **Preconditions** | Org permissions for schemas/quality |
| **Happy path** | `create_schema` / `update_schema` / `get_schema` / `list_schema_versions` / `tag_pii_fields` → `create_quality_rule` / `test_quality_rule` / `list_quality_rules` |
| **MCP** | `loxtep_schemas`, `loxtep_quality` |
| **Primary skill** | `org-semantics-quality` |
| **Related** | S5 (catalog), S13 (ontology/vocabulary management) |

---

## S5 — Discover, lineage, evidence, governance flags

| Field | Detail |
|-------|--------|
| **Persona** | Analyst, data steward |
| **Happy path** | `search_catalog` → `get_catalog_entry` / `get_evidence` / `get_lineage_impact` / `get_governance_flags`; `list_domains`, `list_tags` |
| **MCP** | `loxtep_catalog` (catalog-scoped ops: `search_catalog`, `get_catalog_entry`, … per facade list) |
| **Primary skill** | `discover-govern-lineage` |

---

## S6 — Analytics / SQL over mesh

| Field | Detail |
|-------|--------|
| **Persona** | Analyst |
| **Happy path** | `list_tables` → `get_table_schema` → `execute_query` → `get_query_results` (poll if async) |
| **MCP** | `loxtep_analytics` |
| **Primary skill** | `loxtep-analytics` |

---

## S7 — Workspace versions and recovery

| Field | Detail |
|-------|--------|
| **Persona** | Engineer fixing drift or auditing |
| **Happy path** | `list_versions` → `create_snapshot` / `compare_versions` / `restore_version` → `reindex_workspace`; ops health: `get_queue_info` (uses `data_product_id`), `read_queue_events` (optional `instance_id` for Observe routing), `replay_events` |
| **MCP** | `loxtep_workspace` (mix of project-scoped and org — see skill) |
| **Primary skill** | `loxtep-workspace` |
| **Related skill** | `loxtep-queue-tracing` — debug deployments and data flow by tracing events through queues |

---

## S8 — Process intelligence

| Field | Detail |
|-------|--------|
| **Persona** | Ops / analytics investigating entities |
| **Happy path** | `get_entity_context` / `query_entity_context` → `create_entity_context` → `list_decision_traces` → `record_decision_trace`; unified retrieval: `query_context` with natural language question |
| **MCP** | `loxtep_process_intel` (6 ops) |
| **Primary skill** | `loxtep-process-intel` |
| **Related** | S13 (ontology/vocabulary/namespace management) |

---

## S9 — Procedures

| Field | Detail |
|-------|--------|
| **Persona** | Process owner |
| **Happy path** | `list_procedures` → `get_procedure` → `create_procedure` / `update_procedure` / `delete_procedure` → `import_process_graph` / `export_process_graph` → `get_procedure_dependencies` |
| **MCP** | `loxtep_procedures` (8 ops) |
| **Primary skill** | `loxtep-procedures` |
| **Related** | S13 (ontology/namespace for imported graphs) |

---

## S10 — Agent orchestration workspace

| Field | Detail |
|-------|--------|
| **Persona** | User of agent / issue tracker features |
| **Happy path** | `agent_orchestration_list_projects` / `create_issue` / `list_issues` / goals / agents (flat tool names on facade `loxtep_agent_workspace`) |
| **MCP** | `loxtep_agent_workspace` — **not** `loxtep_projects` / `loxtep_workflows` |
| **Primary skill** | `loxtep-agent-workspace` |

---

## S11 — Instances

| Field | Detail |
|-------|--------|
| **Happy path** | `list_instances`; `create_instance` with correct `instance_type` + `plan_id` |
| **Primary skill** | `loxtep-instances` |

---

## S12 — Auth recovery

| Field | Detail |
|-------|--------|
| **Primary skill** | `loxtep-auth` |

---

## S13 — Ontology, vocabulary, and namespace management

| Field | Detail |
|-------|--------|
| **Persona** | Data architect, process documentation pipeline |
| **Preconditions** | Org permissions for ontology/vocabulary management |
| **Happy path** | `sync_vocabulary` → `create_ontology_concept` → `register_namespace_mapping` → `import_process_graph` |
| **MCP** | `loxtep_ontology` (15 ops) |
| **Primary skill** | `loxtep-ontology` |
| **Related** | S8 (runtime intelligence), S9 (procedures) |

---

## S14 — Deploy projects/workflows to runtime instances

| Field | Detail |
|-------|--------|
| **Persona** | Data engineer, platform operator |
| **Preconditions** | Project exists with authored workflows; target instance provisioned (S11) |
| **Happy path** | `list_deployments` (check current state) → `deploy_project` or `deploy_workflow` → poll `get_deployment` for status → `get_runtime_mapping` to verify |
| **MCP** | `loxtep_deployments` (5 ops: `deploy_project`, `deploy_workflow`, `list_deployments`, `get_deployment`, `get_runtime_mapping`) |
| **Primary skill** | `loxtep-deployments` |
| **Related** | S11 (instance provisioning), S2 (workflow authoring) |

---

## S15 — Search semantic layer, retrieve artifacts, check completeness

| Field | Detail |
|-------|--------|
| **Persona** | Analyst, data steward, governance lead |
| **Preconditions** | Org permissions; semantic layer populated (thesaurus, ontology, metrics) |
| **Happy path** | `search_semantic_layer` (query term) → `get_semantic_artifact` (specific item by type + id) → `get_semantic_completeness` (coverage assessment) |
| **MCP** | `loxtep_semantic_layer` (3 ops: `search_semantic_layer`, `get_semantic_artifact`, `get_semantic_completeness`) |
| **Primary skill** | `loxtep-semantic-layer` |
| **Related** | S4 (schema/quality authoring), S13 (ontology management), S5 (catalog discovery) |

---

## Skill clusters (maintenance view)

| Skill `name` | Stories | Facades (MCP tools) |
|--------------|---------|---------------------|
| `loxtep-auth` | S12 | — |
| `loxtep-instances` | S11 | `loxtep_instances` |
| `create-connector` | S1 | `loxtep_connectors`, `loxtep_connections`, `loxtep_templates` (connector flows) |
| `data-workflows` | S0, S2, S3 (+ orchestrates S1 with create-connector) | `loxtep_session`, `loxtep_projects`, `loxtep_templates`, `loxtep_workflows`, `loxtep_connections`, `loxtep_data_products` |
| `discover-govern-lineage` | S5 | `loxtep_catalog` |
| `org-semantics-quality` | S4 | `loxtep_schemas`, `loxtep_quality` |
| `loxtep-analytics` | S6 | `loxtep_analytics` |
| `loxtep-workspace` | S7 | `loxtep_workspace` |
| `loxtep-process-intel` | S8 | `loxtep_process_intel` (6 ops: entity context, decision traces, unified context query) |
| `loxtep-procedures` | S9 | `loxtep_procedures` (8 ops: CRUD + import/export/dependencies) |
| `loxtep-ontology` | S13 | `loxtep_ontology` (15 ops: vocabulary + ontology + namespace mappings) |
| `loxtep-agent-workspace` | S10 | `loxtep_agent_workspace` |
| `loxtep-deployments` | S14 | `loxtep_deployments` (5 ops: deploy + status + runtime mapping) |
| `loxtep-semantic-layer` | S15 | `loxtep_semantic_layer` (3 ops: search + artifact + completeness) |

---

## MCP operation → skill index

| `operation` | Primary skill |
|-------------|----------------|
| `get_current_user`, `get_current_organization` | `data-workflows` |
| `list_connector_types`, `list_connectors`, `create_connector`, `get_connector_oauth_url` | `create-connector` |
| `list_projects`, `get_project`, `create_project`, `update_project`, `delete_project` | `data-workflows` |
| `list_templates`, `get_template`, `apply_template` | `data-workflows` (templates); `create-connector` when applying **connector** templates only |
| `create_workflow`, `update_workflow`, `delete_workflow`, `list_workflows`, `get_workflow`, `get_workflow_graph`, `patch_workflow_graph`, `preview_transform`, `create_transformation`, `create_validation` | `data-workflows` |
| `create_connection`, `update_connection`, `delete_connection`, `list_connections`, `get_connection`, `test_connection` | `create-connector` **and** `data-workflows` |
| `create_data_product`, `update_data_product`, `delete_data_product`, `list_data_products`, `get_data_product`, `get_data_product_lexicon`, `list_delivery_interfaces`, `create_delivery_interface` | `data-workflows` |
| All `loxtep_catalog` ops | `discover-govern-lineage` |
| All `loxtep_schemas` / `loxtep_quality` ops | `org-semantics-quality` |
| All `loxtep_analytics` ops | `loxtep-analytics` |
| All `loxtep_workspace` ops | `loxtep-workspace` |
| `get_entity_context`, `query_entity_context`, `create_entity_context`, `list_decision_traces`, `record_decision_trace`, `query_context` | `loxtep-process-intel` |
| `list_procedures`, `get_procedure`, `create_procedure`, `update_procedure`, `delete_procedure`, `import_process_graph`, `export_process_graph`, `get_procedure_dependencies` | `loxtep-procedures` |
| `list_thesaurus_terms`, `get_thesaurus_term`, `create_thesaurus_term`, `update_thesaurus_term`, `delete_thesaurus_term`, `sync_vocabulary`, `resolve_canonical_key`, `get_ontology_relationships`, `create_ontology_concept`, `create_ontology_relationship`, `update_ontology_concept`, `delete_ontology_concept`, `register_namespace_mapping`, `list_namespace_mappings`, `get_namespace_mapping` | `loxtep-ontology` |
| All `agent_orchestration_*` | `loxtep-agent-workspace` |
| `list_instances`, `create_instance` | `loxtep-instances` |
| `deploy_project`, `deploy_workflow`, `list_deployments`, `get_deployment`, `get_runtime_mapping` | `loxtep-deployments` |
| `search_semantic_layer`, `get_semantic_artifact`, `get_semantic_completeness` | `loxtep-semantic-layer` |
