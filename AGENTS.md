<!--
  AGENTS.md — loxtep-plugins-skills
  Audience: AI coding agents and the developers configuring them.

  This repo ships MCP client configs, rules, and scoped skill bundles for using
  Loxtep from AI coding/productivity tools. This file is the machine-readable
  entry point: how to connect, the hosted MCP tool surface, the skills model, and
  the per-client plugin layout.
-->

# AGENTS.md — Loxtep Plugins & Skills

Loxtep is **the AI operating system for a company**: context management for AI,
data management, and integrations across every system. This repo connects your AI
tools to Loxtep over **MCP** and ships **scoped skills** that keep agents inside
governed boundaries.

The build-and-operate surface is **MCP + CLI + SDK + skills + docs**. Connect
once, then build and operate Loxtep entirely from your agent.

> You can't unify fragmented systems with a fragmented system.

## Connect (auth required — no unauthenticated access)

Add the hosted server to your MCP client. Authentication is **OAuth 2.1 + PKCE**;
the browser flow runs on first connect and tokens refresh in the background.

```json
{ "mcpServers": { "loxtep": { "url": "https://mcp.loxtep.io/ai/mcp/stream" } } }
```

Clients without native MCP OAuth (e.g. Antigravity) bridge via `mcp-remote`:

```json
{
  "mcpServers": {
    "loxtep": {
      "command": "npx",
      "args": ["-y", "mcp-remote", "https://mcp.loxtep.io/ai/mcp/stream"]
    }
  }
}
```

## How calls work

The server registers **19 grouped tools** (area facades, all named `loxtep_*`).
Each call sets **`operation`** to the flat action name, plus that action's
arguments. Example: call the tool **`loxtep_connectors`** with:

```json
{ "operation": "create_connector", "connector_type": "shopify", "metadata": { "api_key": "…" } }
```

**Scope rules:** `project`-scoped operations require `project_id` in the same
payload; `organization`-scoped operations may accept an optional `domain_id`;
`catalog`/`global` operations need no scoping params. Orient first with
`loxtep_session` → `get_current_user` (returns your RBAC grants) before passing a
`project_id`.

---

## MCP tool surface

All tools require OAuth auth. Tables below list each operation, its scope, and its
key parameters.

### `loxtep_session` — session & org context
| Operation | Scope | Required | Optional |
| --- | --- | --- | --- |
| `get_current_user` | organization | — | — |
| `get_current_organization` | organization | — | — |

```json
{ "operation": "get_current_user" }
```

### `loxtep_projects` — data-mesh projects
| Operation | Scope | Required | Optional |
| --- | --- | --- | --- |
| `list_projects` | organization | — | `domain_id` |
| `get_project` | organization | `project_id` | — |
| `create_project` | organization | `name` | `github_action`, `description` |
| `update_project` | organization | `project_id` | `name`, `description`, `target_domain_id`, `github_*` |
| `delete_project` | organization | `project_id` | — |

```json
{ "operation": "create_project", "name": "commerce-mesh" }
```

### `loxtep_instances` — runtime instances
| Operation | Scope | Required | Optional |
| --- | --- | --- | --- |
| `list_instances` | organization | — | — |
| `create_instance` | organization | `name`, `region`, `instance_type` | `plan_id`, `payment_method_id`, `connection_details` |

```json
{ "operation": "create_instance", "name": "sandbox", "region": "us-east-1", "instance_type": "shared" }
```

### `loxtep_templates` — template catalog
| Operation | Scope | Required | Optional |
| --- | --- | --- | --- |
| `list_templates` | organization | — | — |
| `get_template` | organization | `template_id` | — |
| `apply_template` | project | `project_id`, `template_id` | — |

```json
{ "operation": "list_templates" }
```

### `loxtep_connectors` — org-level connectors
| Operation | Scope | Required | Optional |
| --- | --- | --- | --- |
| `list_connectors` | organization | — | `domain_id` |
| `list_connector_types` | global | — | — |
| `create_connector` | organization | `connector_type`, `metadata` | `domain_id` |
| `get_connector_oauth_url` | organization | `connector_id` | — |

```json
{ "operation": "list_connector_types" }
```

### `loxtep_connections` — workflow connection nodes
| Operation | Scope | Required | Optional |
| --- | --- | --- | --- |
| `create_connection` | project | `project_id`, `name`, `type` | `configuration` |
| `update_connection` | project | `project_id`, `connection_id` | `configuration` |
| `delete_connection` | project | `project_id`, `connection_id` | — |
| `list_connections` | project | `project_id` | — |
| `get_connection` | project | `project_id`, `connection_id` | — |
| `test_connection` | project | `project_id`, `connection_id` | — |

```json
{ "operation": "list_connections", "project_id": "proj_…" }
```

### `loxtep_workflows` — workflows, graph, transforms
| Operation | Scope | Required | Optional |
| --- | --- | --- | --- |
| `create_workflow` | project | `project_id`, `name` | `description` |
| `update_workflow` | project | `project_id`, `workflow_id` | `name`, `description` |
| `delete_workflow` | project | `project_id`, `workflow_id` | — |
| `list_workflows` | project | `project_id` | — |
| `get_workflow` | project | `project_id`, `workflow_id` | — |
| `get_workflow_graph` | project | `project_id`, `workflow_id` | — |
| `patch_workflow_graph` | project | `project_id`, `workflow_id`, `ops` | — |
| `preview_transform` | project | `project_id`, `transform` | `sample` |
| `create_transformation` | project | `project_id`, `workflow_id`, `transformation` | — |
| `create_validation` | project | `project_id`, `workflow_id`, `validation` | — |

```json
{ "operation": "list_workflows", "project_id": "proj_…" }
```

### `loxtep_data_products` — data products & delivery interfaces
`kind` is `source` (atomic, domain-owned) or `consumer` (composed projection).

| Operation | Scope | Required | Optional |
| --- | --- | --- | --- |
| `create_data_product` | project | `project_id`, `name`, `kind` | `domain_id`, `description`, `schema` |
| `update_data_product` | project | `project_id`, `data_product_id` | `name`, `description`, `schema`, `domain_id` |
| `delete_data_product` | project | `project_id`, `data_product_id` | — |
| `list_data_products` | organization | — | `kind`, `domain_id` |
| `get_data_product` | organization | `data_product_id` | — |
| `get_data_product_lexicon` | organization | `data_product_id` | — |
| `get_data_product_sdk_config` | organization | `data_product_id` | — |
| `list_delivery_interfaces` | organization | — | `data_product_id` |
| `create_delivery_interface` | organization | `data_product_id`, `endpoint_url` | `delivery_type`, `headers`, `secret_token`, `filters`, `method` |
| `list_consumptions` (deprecated alias) | organization | — | `data_product_id` |
| `create_consumption` (deprecated alias) | organization | `data_product_id`, `endpoint_url` | `headers`, `secret_token`, `filters`, `method` |

> **Terminology note:** `list_consumptions` and `create_consumption` are
> deprecated aliases for `list_delivery_interfaces` and
> `create_delivery_interface`. The old names remain functional during the
> transition period. Prefer the new names in all new code.

```json
{ "operation": "create_delivery_interface", "data_product_id": "dp_…", "delivery_type": "webhook", "endpoint_url": "https://…", "method": "POST" }
```

```json
{ "operation": "create_data_product", "project_id": "proj_…", "name": "orders", "kind": "source" }
```

### `loxtep_schemas` — schema definitions
| Operation | Scope | Required | Optional |
| --- | --- | --- | --- |
| `create_schema` | organization | `data_product_id`, `name`, `version`, `format`, `fields[]`, `definition` | `metadata`, `preview` |
| `update_schema` | organization | `schema_id` | `version`, `format`, `fields`, `definition`, `preview` |
| `delete_schema` | organization | `schema_id` | `preview` |
| `get_schema` | organization | `schema_id` | — |
| `list_schema_versions` | organization | `data_product_id` | — |
| `tag_pii_fields` | organization | `schema_version_id`, `field_names` | — |

Create returns `schema_id` / `schema_version_id` for immediate get/update/delete. Use `schema_version_id` (not `schema_id`) for `tag_pii_fields`.

```json
{ "operation": "get_schema", "schema_id": "sch_…" }
```

### `loxtep_quality` — quality rules
| Operation | Scope | Required | Optional |
| --- | --- | --- | --- |
| `create_quality_rule` | organization | `data_product_id`, `name`, `rule_type`, `condition`, `threshold`, `severity` | `description`, `preview` |
| `update_quality_rule` | organization | `quality_rule_id` | `name`, `condition`, `threshold`, `severity`, `preview` |
| `delete_quality_rule` | organization | `quality_rule_id` | `preview` |
| `list_quality_rules` | organization | — | `data_product_id`, `domain_id` |
| `get_quality_rule` | organization | `quality_rule_id` | — |
| `test_quality_rule` | organization | `quality_rule_id` | — |
| `test_quality_rule` | organization | `quality_rule_id`, `sample` | — |

```json
{ "operation": "list_quality_rules" }
```

### `loxtep_catalog` — catalog, discovery, domains, tags
| Operation | Scope | Required | Optional |
| --- | --- | --- | --- |
| `search_catalog` | catalog | `query` | `filters` |
| `get_evidence` | catalog | `entry_id` | — |
| `get_lineage_impact` | catalog | `entry_id` | — |
| `get_governance_flags` | catalog | `entry_id` | — |
| `run_discovery` | catalog | `target` | — |
| `get_catalog_entry` | catalog | `entry_id` | — |
| `list_domains` | catalog | — | — |
| `list_tags` | catalog | — | — |

```json
{ "operation": "search_catalog", "query": "customer" }
```

### `loxtep_analytics` — SQL analytics
| Operation | Scope | Required | Optional |
| --- | --- | --- | --- |
| `execute_query` | organization | `query` | `data_product_id` |
| `list_tables` | organization | — | `data_product_id` |
| `get_table_schema` | organization | `table` | — |
| `get_query_results` | organization | `query_id` | — |

```json
{ "operation": "execute_query", "query": "SELECT count(*) FROM orders" }
```

### `loxtep_workspace` — snapshots, index, streaming hints
| Operation | Scope | Required | Optional |
| --- | --- | --- | --- |
| `list_versions` | project | `project_id` | — |
| `create_snapshot` | project | `project_id` | `label` |
| `restore_version` | project | `project_id`, `version_id` | — |
| `compare_versions` | project | `project_id`, `version_a` | `version_b` (UUID or `"current"`, default `"current"`) |
| `reindex_workspace` | project | `project_id` | — |
| `get_queue_info` | organization | `data_product_id` | — |
| `replay_events` | organization | `data_product_id` | `start`, `end` |
| `read_queue_events` | organization | — | `queue_name`, `data_product_id`, `eid`, `search_text`, `count` |

```json
{ "operation": "list_versions", "project_id": "proj_…" }
```

```json
{ "operation": "read_queue_events", "queue_name": "{namespace}-workflows-workflow-deployment-errors", "count": 5 }
```

### `loxtep_ontology` — ontology, vocabulary, namespaces
| Operation | Scope | Required | Optional |
| --- | --- | --- | --- |
| `list_thesaurus_terms` | organization | — | — |
| `get_thesaurus_term` | organization | `term_id` | — |
| `create_thesaurus_term` | organization | `canonical_key` | `aliases` (array of `{path: string}` objects) |
| `update_thesaurus_term` | organization | `term_id` | `aliases` |
| `delete_thesaurus_term` | organization | `term_id` | — |
| `sync_vocabulary` | organization | `vocabulary` | — |
| `resolve_canonical_key` | organization | `key_or_alias` | — |
| `get_ontology_relationships` | organization | `concept_id` | — |
| `create_ontology_concept` | organization | `name`, `namespace`, `node_type` | `description`, `uri`, `parent_concepts` |
| `create_ontology_relationship` | organization | `from`, `to`, `type` | — |
| `update_ontology_concept` | organization | `concept_id` | — |
| `delete_ontology_concept` | organization | `concept_id` | — |
| `register_namespace_mapping` | organization | `namespace`, `mapping` | — |
| `list_namespace_mappings` | organization | — | — |
| `get_namespace_mapping` | organization | `namespace` | — |

```json
{ "operation": "resolve_canonical_key", "key_or_alias": "customer_email" }
```

### `loxtep_process_intel` — process intelligence
| Operation | Scope | Required | Optional |
| --- | --- | --- | --- |
| `get_entity_context` | organization | `entity_id`, `entity_type` | — |
| `query_entity_context` | organization | `entity_id`, `entity_type` | — |
| `create_entity_context` | organization | `entity_id`, `context` | — |
| `list_decision_traces` | organization | — | `anchor` |
| `record_decision_trace` | organization | `decision_id`, `procedure_id`, `outcome`, `actor` | `rationale`, `inputs`, `override` |

```json
{ "operation": "list_decision_traces" }
```

### `loxtep_procedures` — process graph procedures
| Operation | Scope | Required | Optional |
| --- | --- | --- | --- |
| `list_procedures` | organization | — | — |
| `get_procedure` | organization | `procedure_id` | — |
| `create_procedure` | organization | `organization_id`, `name` | `description`, `status`, `domain_id`, `steps`, `decisions`, `triggers`, `dependencies`, `metadata` |
| `update_procedure` | organization | `procedure_id`, `graph` | — |
| `delete_procedure` | organization | `procedure_id` | — |
| `import_process_graph` | organization | `graph` | — |
| `export_process_graph` | organization | `procedure_id` | — |
| `get_procedure_dependencies` | organization | `procedure_id` | — |

```json
{ "operation": "list_procedures" }
```

### `loxtep_agent_workspace` — agent orchestration (issues/goals/agents)
| Operation | Scope | Required | Optional |
| --- | --- | --- | --- |
| `agent_orchestration_create_issue` | organization | `title` | `description` |
| `agent_orchestration_list_issues` | organization | — | — |
| `agent_orchestration_get_issue` | organization | `issue_id` | — |
| `agent_orchestration_create_goal` | organization | `title` | `description` |
| `agent_orchestration_list_goals` | organization | — | — |
| `agent_orchestration_get_goal` | organization | `goal_id` | — |
| `agent_orchestration_list_projects` | organization | — | — |
| `agent_orchestration_create_project` | organization | `name` | — |
| `agent_orchestration_get_project` | organization | `project_id` | — |
| `agent_orchestration_list_agents` | organization | — | — |
| `agent_orchestration_get_agent` | organization | `agent_id` | — |

```json
{ "operation": "agent_orchestration_list_issues" }
```

### `loxtep_semantic_layer` — org semantic layer
| Operation | Scope | Required | Optional |
| --- | --- | --- | --- |
| `search_semantic_layer` | organization | `query` | `artifact_type` |
| `get_semantic_artifact` | organization | `artifact_type`, `id` | — |
| `get_semantic_completeness` | organization | — | `domain_id` |

```json
{ "operation": "search_semantic_layer", "query": "revenue" }
```

### `loxtep_deployments` — deployment lifecycle
| Operation | Scope | Required | Optional |
| --- | --- | --- | --- |
| `deploy_project` | project | `project_id`, `instance_id` | `force_redeploy` |
| `deploy_workflow` | project | `project_id`, `instance_id`, `workflow_id` | `force_redeploy`, `skip_validation` |
| `list_deployments` | organization | — | `project_id`, `instance_id`, `workflow_id`, `status` |
| `get_deployment` | organization | `deployment_id` | — |
| `get_runtime_mapping` | project | `project_id` | `workflow_id` |

```json
{ "operation": "deploy_project", "project_id": "proj_…", "instance_id": "inst_…" }
```

---

## Skills (scoped agent access)

A **skill** is a scoped integration bundle: it declares which platform resources
and operations an agent may reach inside a workspace. Skills here ship as
`SKILL.md` bundles per client (`<client>/skills/<slug>/SKILL.md`) and, in a
code-first workspace, as `.loxtep/skills/<name>.yaml` scope files.

The platform enforces scope **fail-closed**: an out-of-scope resource returns
`SCOPE_VIOLATION`, a disallowed operation is denied, an unknown skill name is
rejected, and a check that cannot complete blocks the operation.

### Skill bundles (this repo)

| Skill slug | Focus |
| --- | --- |
| `loxtep-mcp-session` | Orient: capabilities, RBAC grants, recommended session order |
| `loxtep-instances` | Provision/manage runtime instances |
| `create-connector` | Connect external systems |
| `data-workflows` | Author and deploy data workflows |
| `data-product-modeling` | Model source/consumer data products |
| `discover-govern-lineage` | Discovery, governance, lineage |
| `org-semantics-quality` | Semantic layer + quality rules |
| `loxtep-analytics` | SQL analytics |
| `loxtep-workspace` | Snapshots, versions, workspace index, read queue events |
| `loxtep-queue-tracing` | Debug deployments and data flow by tracing events through queues |
| `loxtep-process-intel` | Entity context + decision traces |
| `loxtep-ontology` | Ontology, vocabulary, namespaces |
| `loxtep-procedures` | Process graph procedures |
| `loxtep-agent-workspace` | Agent orchestration (issues/goals/agents) |
| `loxtep-deployments` | Deployment lifecycle (deploy project/workflow, status, runtime mapping) |
| `loxtep-semantic-layer` | Semantic layer search, artifact retrieval, completeness |
| `loxtep-sdk` | Using the `@loxtep/sdk` runtime + CLI |
| `semantic-ontology-mapping` | Mapping external vocabularies to the ontology |

### Skill attribution (optional)

Pass `_metadata: { skill_name: '<slug>' }` in tool arguments for attribution and
eval scoring. It's optional, backward-compatible, and ignored for tool logic. The
`skill_name` must match the skill's `name` from its YAML frontmatter.

**Terminology note:** Operations formerly named `create_consumption` /
`list_consumptions` are now `create_delivery_interface` /
`list_delivery_interfaces`. The old names remain as functional aliases during
transition. Skills and agents should prefer the new names.

---

## Per-client plugin layout

| Plugin | Platform | Path | Notes |
| --- | --- | --- | --- |
| Cursor | Cursor IDE | `cursor/` | MCP config, rules, skills, assets — native OAuth via `url` |
| Claude | Claude Code & Cowork | `claude/` | MCP config, skills — native OAuth via `url` |
| OpenCode | OpenCode | `opencode/` | `opencode.json`, skills — native OAuth via `url` |
| Kiro | Kiro IDE | `kiro/` | MCP config + power + README — native OAuth via `url` |
| Antigravity | Antigravity IDE | `antigravity/` | MCP config — uses `mcp-remote` bridge |
| Codex | OpenAI Codex | `codex/` | TOML snippet + README — native OAuth via `url` |

See each directory's `README.md` for install instructions, and `docs/` for the
user-story catalog.
