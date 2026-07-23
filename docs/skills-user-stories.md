# User stories → Customer MCP (Loxtep monorepo index)

> **Canonical customer skill bundles live in `loxtep-plugins-skills`**
> (`cursor/skills/`, `claude/skills/`, etc.). Files under `.agents/skills/` in this repo are for
> internal dev only — sync to plugins-skills via `node scripts/sync-skills-to-plugins-skills.mjs`.
>
> **Cross-tool workflow authoring (all MCP clients):**
> [loxtep-plugins-skills/docs/agent-workflow-authoring.md](../loxtep-plugins-skills/docs/agent-workflow-authoring.md)

Hosted endpoint: `https://mcp.loxtep.io/ai/mcp/stream` (dev:
`https://mcpdev.loxtep.io/ai/mcp/stream`).

Each story lists **primary skill** (where the narrative lives) and **supporting
skills**. Full operation index and MCP test harness live in
**`loxtep-plugins-skills/docs/skills-user-stories.md`**.

Platform PKO procedures: `platform-backend/graph/platform-pko/` · architecture:
`docs/architecture/agent-first-process-catalog.md`.

---

## Story index

### Connect

| ID  | Story | Primary skill |
| --- | ----- | ------------- |
| S0  | Know who I am and which org I am in | `loxtep-mcp-session` |
| S1  | Connect a SaaS store or API and bring data into a project | **`connect-external-system`** |
| S11 | Provision or list runtime instances | `loxtep-instances` |
| S12 | Recover from auth failures on MCP | `loxtep-auth` |

### Organize

| ID  | Story | Primary skill |
| --- | ----- | ------------- |
| S2  | Build a **data product** that unifies data across channels | `data-workflows` |
| S4  | Define schemas, semantics, PII, and quality rules | `org-semantics-quality` |
| S5  | Discover assets, lineage, evidence, governance | `discover-govern-lineage` |
| S7  | Snapshots, compare versions, reindex workspace, inspect queues | `loxtep-workspace` |
| S8  | Entity and decision intelligence and unified context retrieval | `loxtep-process-intel` |
| S9  | Process graphs — CRUD, import/export, dependencies | `loxtep-procedures` |
| S13 | Manage ontology, vocabulary, and namespace mappings | `loxtep-ontology` |
| S14 | Deploy projects and workflows to runtime instances | `loxtep-deployments` |
| S15 | Search semantic layer, retrieve artifacts, check completeness | `loxtep-semantic-layer` |
| S17 | Publish a data product as trusted after readiness checks | **`promote-data-product`** |

### Use

| ID  | Story | Primary skill |
| --- | ----- | ------------- |
| S3  | Send data product updates to an external webhook | `data-workflows` |
| S6  | Query mesh data with SQL / analytics | `loxtep-analytics` |
| S10 | Agent issues/goals/workstreams | `loxtep-agent-workspace` |

### Cross-cutting

| ID  | Story | Primary skill |
| --- | ----- | ------------- |
| S16 | Orchestrate the full Connect → Organize → Use journey | **`loxtep-journey-orchestrator`** |

---

## S1 — Connect external system (PKO P1)

| Field                | Detail                                                                                                                                                            |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Persona**          | Data engineer, integrator                                                                                                                                         |
| **PKO**              | `procedure#connect-external-system` → `procedure#capture-connector-samples` → `procedure#design-ingestion-workflow`                                              |
| **Preconditions**    | MCP auth; optional `project_id` for templates only (not required for org connector)                                                                               |
| **Happy path**       | `list_connector_types` → OAuth or `create_connector` → test connector → `capture_connector_samples` → hand off to **`data-workflows`** (`save_workflow_bundle`) |
| **MCP**              | `loxtep_connectors`, `loxtep_triggers`, `loxtep_templates`                                                                                                     |
| **Primary skill**    | **`connect-external-system`**                                                                                                                                     |

---

## S2 — Design ingestion workflow (PKO P2 / Flow E)

| Field             | Detail                                                                                                                                                  |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Persona**       | Data engineer building an omnichannel data product                                                                                                      |
| **PKO**           | `procedure#design-ingestion-workflow` after P1 handoff (`connector_id` + samples)                                                                       |
| **Preconditions** | MCP auth; `project_id`; optional `connector_id` from S1 for SDK connection nodes in bundle                                                            |
| **Happy path**    | `get_entity_schemas` (`pattern: ingestion`) → compose `files` → `save_workflow_bundle` (`dry_run: true`) → fix errors → `save_workflow_bundle` persist |
| **MCP**           | `loxtep_workflows` (`get_entity_schemas`, `save_workflow_bundle`, `list_workflows`, `get_workflow`, `get_workflow_graph`), `loxtep_data_products`     |
| **Primary skill** | **`data-workflows`** (Flow E)                                                                                                                           |

---

## S16 — Journey orchestrator (Connect → Organize → Use)

| Field             | Detail                                                                                                                                        |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| **Persona**       | Agent or power user driving a data goal end-to-end                                                                                            |
| **PKO**           | Master graph `loxtep-data-to-ai-ready.jsonld`                                                                                                 |
| **Happy path**    | P0 session bootstrap → P1 connect + capture → P2 design + deploy → P3 semantics → P4 promote → P5 delivery/MCP → P6 govern → P7 maintain      |
| **Cross-track**   | P3 hands off to CDLC via `procedure#bridge-dp-semantics-to-cdlc` and `procedure#cdlc-memory-promotion-intake`                                 |
| **Primary skill** | **`loxtep-journey-orchestrator`**                                                                                                             |
| **Supporting**    | `connect-external-system`, `data-workflows`, `loxtep-deployments`, `semantic-ontology-mapping`, `promote-data-product`, `governance-policies` |

---

## S17 — Publish data product as trusted

| Field             | Detail                                                                                             |
| ----------------- | -------------------------------------------------------------------------------------------------- |
| **Persona**       | Data product owner, catalog steward                                                                |
| **PKO**           | `procedure#promote-data-product-medallion`                                                         |
| **Preconditions** | P3 semantics applied; domain owner available for HITL                                              |
| **Happy path**    | Readiness checklist → quality/glossary checks → domain-owner approval → MCP `promote_data_product` |
| **MCP**           | `loxtep_data_products`: `get_promotion_readiness`, `promote_data_product`                          |
| **Primary skill** | **`promote-data-product`**                                                                         |
| **Related**       | S4 (quality), S5 (lineage), **`loxtep-journey-orchestrator`**                                      |

---

## Skill clusters

| Skill `name` | Stories |
| --------------------------------- | ------- |
| **`connect-external-system`** | S1 |
| **`loxtep-journey-orchestrator`** | S16 |
| **`promote-data-product`** | S17 |

For the full S0–S15 narrative detail and MCP operation → skill index, see
**`loxtep-plugins-skills/docs/skills-user-stories.md`**.

---

## MCP operation → skill

| `operation` | Primary skill |
| ----------- | ------------- |
| `list_connector_types`, `create_connector`, `get_connector_oauth_url`, `capture_connector_samples` | **`connect-external-system`** |
| `list_triggers`, `get_trigger`, `test_trigger`, `update_trigger` | **`data-workflows`** |
| `get_entity_schemas`, `save_workflow_bundle`, `list_workflows`, `get_workflow`, `get_workflow_graph` | **`data-workflows`** |
| `deploy_project`, `deploy_workflow`, `list_deployments`, `get_deployment` | `loxtep-deployments` |
| `get_promotion_readiness`, `promote_data_product` | **`promote-data-product`** |
| `import_process_graph`, `export_process_graph` | `loxtep-procedures` |
