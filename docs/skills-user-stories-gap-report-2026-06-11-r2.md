# Skills User Stories — MCP Gap Report (Run 2)

**Date:** 2026-06-11 (executed 2026-06-12T01:00Z UTC)  
**Environment:** Loxtep **prod** (`mcp.loxtep.io` / `api.loxtep.io`)  
**Org:** Ask Bruce (`2563e219-721e-4a24-9029-e2c6dfc5d315`)  
**User:** `bruce@loxtep.io` (Steve Rosenbeck)  
**Methodology:** Full happy-path per [`skills-user-stories.md`](./skills-user-stories.md) via hosted MCP. **No REST bypasses or workarounds.**

Machine-readable log: [`skills-user-stories-gap-report-2026-06-11-r2.json`](./skills-user-stories-gap-report-2026-06-11-r2.json)

---

## Executive summary

| Metric | Value |
|--------|-------|
| Stories attempted | 16 (S0–S15) |
| **PASS** | 2 (S0, S12) |
| **PARTIAL** | 10 |
| **FAIL** | 4 (S3, S4, S8, S10) |
| **BLOCKED** | 0 |
| Step pass rate | ~58% (52/90 invoked steps) |
| Workarounds used | **0** |

### What got better since the morning dev run

- **S15** `loxtep_semantic_layer` is now on hosted MCP — `search_semantic_layer` and `get_semantic_completeness` **PASS**
- **S7** `read_queue_events` is registered (no longer "Invalid operation") — but fails at **Observe STS 401**

### Top systemic issues (fix these first)

1. **Create→read split for data products** — `create_data_product` returns ID; `get_data_product`, `list_data_products`, `delete_data_product`, schema/quality create all say "not found"
2. **Org-scoped CWS routing bug** — `list_quality_rules`, `list_tags`, `get_catalog_entry` require `project_id` incorrectly
3. **DuckDB unavailable** — analytics `get_table_schema` fails; `execute_query` blocked by RBAC anyway
4. **RBAC holes** — missing `connections:execute`, `consumptions:create`, `process_intelligence:create`, `analytics:execute`
5. **Agent orchestration mutations broken** — `create_issue`, `create_project` fail with no actionable error

---

## Story matrix

| Story | Skill | Status | Primary blocker |
|-------|-------|--------|-----------------|
| S0 | loxtep-mcp-session | **PASS** | — |
| S1 | create-connector | **PARTIAL** | OAuth redirect allowlist; `test_connection` RBAC; no `delete_connector` |
| S2 | data-workflows | **PARTIAL** | Create DP OK; read/list/delete not found |
| S3 | data-workflows | **FAIL** | `consumptions:create` denied |
| S4 | org-semantics-quality | **FAIL** | CWS requires DP that read path can't find; `list_quality_rules` CWS bug |
| S5 | discover-govern-lineage | **PARTIAL** | CWS on catalog entry/tags; lineage 403 |
| S6 | loxtep-analytics | **PARTIAL** | DuckDB + `analytics:execute` RBAC |
| S7 | loxtep-workspace | **PARTIAL** | Snapshots OK; queue read STS 401; replay params-only |
| S8 | loxtep-process-intel | **FAIL** | Mutations need `process_intelligence:create` |
| S9 | loxtep-procedures | **PARTIAL** | CRUD/export OK; import needs `organization_id` |
| S10 | loxtep-agent-workspace | **FAIL** | Create issue/project fail |
| S11 | loxtep-instances | **PARTIAL** | List + create OK; async provision not verified |
| S12 | loxtep-auth | **PASS** | Hosted OAuth works |
| S13 | loxtep-ontology | **PARTIAL** | Thesaurus/concept create OK; delete concept body bug; sync/mapping validation |
| S14 | loxtep-deployments | **PARTIAL** | Deploy requests OK; mapping empty until async completes |
| S15 | loxtep-semantic-layer | **PARTIAL** | Search/completeness OK; `get_semantic_artifact` route missing |

---

## Detailed findings

### S0 — Session ✅ PASS

Both `get_current_user` (permissions + roles) and `get_current_organization` succeed.

### S12 — Auth ✅ PASS

Hosted MCP OAuth session active; no manual recovery tested.

### S1 — Connectors ⚠️ PARTIAL

| Step | Status | Error |
|------|--------|-------|
| `list_connector_types` | PASS | 32 types |
| `list_connectors` | PASS | Empty org |
| `get_connector_oauth_url` (shopify) | FAIL | `redirect_uri origin api.loxtep.io not allowlisted` |
| `create_connector` (sdk + instance_id) | PASS | |
| `create_connection` | PASS | Requires top-level `type` field (first attempt failed validation) |
| `get_connection` / `list_connections` | PASS | |
| `test_connection` | FAIL | `connections:execute` denied |
| `delete_connector` | FAIL | Tool not in hosted registry |

### S2 — Data workflows ⚠️ PARTIAL

| Step | Status | Error |
|------|--------|-------|
| `create_project` | PASS | |
| `create_workflow` | PASS | |
| `patch_workflow_graph` (add + connect) | PASS | `from_entity_id`/`to_entity_id` work |
| `create_data_product` | PASS | `dd262eff-eb34-4575-95c2-8dd767742edb` |
| `get_data_product` | FAIL | Not found immediately after create |
| `list_data_products` | FAIL | Returns 0 |
| `get_workflow_graph` | PASS | Shows DP in graph (CWS path works here) |
| `update_workflow` | PASS | |
| `delete_data_product` | FAIL | Not found |

**Root cause hypothesis:** Org-scoped data product API reads a different store than project-scoped create.

### S3 — Webhook consumption ❌ FAIL

| Step | Status | Error |
|------|--------|-------|
| `list_consumptions` | PASS | Empty |
| `create_consumption` | FAIL | `consumptions:create` permission denied |

### S4 — Schemas & quality ❌ FAIL

| Step | Status | Error |
|------|--------|-------|
| `create_schema` | FAIL | Backend requires `data_product_id`, `version`, `format`, `fields[]` (not `name` per AGENTS.md); DP not found anyway |
| `create_quality_rule` | FAIL | DP not found |
| `list_quality_rules` | FAIL | CWS `project_id` required on org-scoped tool |

### S5 — Catalog ⚠️ PARTIAL

| Step | Status | Error |
|------|--------|-------|
| `search_catalog` | PASS | |
| `list_domains` | PASS | |
| `list_tags` | FAIL | CWS `project_id` |
| `get_catalog_entry` | FAIL | CWS `project_id` |
| `get_evidence` | PASS | Use `data_product_ids[]` not `entry_id` |
| `get_governance_flags` | PASS | With `data_product_id` |
| `get_lineage_impact` | FAIL | Graph impact API 403 |
| `run_discovery` | PASS | Returns tool guidance |

### S6 — Analytics ⚠️ PARTIAL

| Step | Status | Error |
|------|--------|-------|
| `list_tables` | PASS | Empty (needs `project_id`) |
| `execute_query` | FAIL | `analytics:execute` RBAC |
| `get_table_schema` | FAIL | DuckDB module unavailable (param is `table_name`) |

### S7 — Workspace ⚠️ PARTIAL

| Step | Status | Error |
|------|--------|-------|
| `list_versions` / `create_snapshot` / `compare_versions` / `reindex_workspace` | PASS | |
| `restore_version` | SKIPPED | Destructive |
| `get_queue_info` | FAIL | HTTP 404 (DP not loadable) |
| `read_queue_events` | FAIL | Observe STS AssumeRole 401 |
| `replay_events` | PARTIAL | Params recorded; `historical_replay_via_mcp: false` |

### S8 — Process intelligence ❌ FAIL

| Step | Status | Error |
|------|--------|-------|
| `get_entity_context` | PASS | |
| `list_decision_traces` | PASS | Empty |
| `create_entity_context` | FAIL | `process_intelligence:create` |
| `record_decision_trace` | FAIL | Same |
| `query_entity_context` | FAIL | Generic failure |

### S9 — Procedures ⚠️ PARTIAL

| Step | Status | Error |
|------|--------|-------|
| `list/get/create/export/dependencies/delete` | PASS | |
| `import_process_graph` | FAIL | Missing `organization_id` |

### S10 — Agent workspace ❌ FAIL

| Step | Status | Error |
|------|--------|-------|
| All list ops | PASS | |
| `agent_orchestration_create_issue` | FAIL | "Create issue failed" |
| `agent_orchestration_create_project` | FAIL | "Create agent project failed" |

### S11 — Instances ⚠️ PARTIAL

| Step | Status | Error |
|------|--------|-------|
| `list_instances` | PASS | 1 sandbox instance |
| `create_instance` (shared) | PASS | Async queue `724af7e4-...` |

### S13 — Ontology ⚠️ PARTIAL

| Step | Status | Error |
|------|--------|-------|
| `create/delete_thesaurus_term` | PASS | Needs `canonical_key`, alias `{path, system?}` |
| `create_ontology_concept` | PASS | Needs `namespace`, `node_type` |
| `delete_ontology_concept` | FAIL | MCP body not forwarded |
| `sync_vocabulary` | FAIL | Needs `domain`, `mode`, `terms[].scheme` |
| `register_namespace_mapping` | FAIL | Needs `mappings[].external_term`, `internal_concept_id` |
| `resolve_canonical_key` | PASS | Param is `key_or_alias` |

### S14 — Deployments ⚠️ PARTIAL

| Step | Status | Error |
|------|--------|-------|
| `deploy_workflow` / `deploy_project` | PASS | Status `requested` |
| `list_deployments` | PASS | Empty at poll time (async) |
| `get_runtime_mapping` | FAIL | Not deployed yet |

### S15 — Semantic layer ⚠️ PARTIAL (was BLOCKED on dev this morning)

| Step | Status | Error |
|------|--------|-------|
| `search_semantic_layer` | PASS | 18 results for "customer" |
| `get_semantic_completeness` | PASS | |
| `get_semantic_artifact` (entity) | FAIL | No GET route for `entity/{id}` |

---

## Engineering fix backlog

| P | Item | Stories |
|---|------|---------|
| P0 | Fix data product create→read/list/delete ID store mismatch | S2, S3, S4, S7 |
| P0 | Fix org-scoped CWS routing (`list_quality_rules`, `list_tags`, `get_catalog_entry`) | S4, S5 |
| P0 | Bundle/fix DuckDB for analytics Lambda | S6 |
| P1 | Grant or document RBAC: `connections:execute`, `consumptions:create`, `process_intelligence:create`, `analytics:execute` | S1, S3, S6, S8 |
| P1 | Fix Shopify OAuth redirect allowlist for MCP-initiated flow | S1 |
| P1 | Fix Observe proxy STS for `read_queue_events` | S7 |
| P1 | Fix `agent_orchestration_create_issue` / `create_project` | S10 |
| P1 | Implement GET route for semantic layer entity artifacts | S15 |
| P2 | Register `delete_connector` on hosted MCP | S1 |
| P2 | Fix `delete_ontology_concept` MCP body forwarding | S13 |
| P2 | Align AGENTS.md + skills with actual validation (schemas, ontology, catalog, analytics params) | All |
| P2 | Fix lineage Graph impact API 403 | S5 |
| P3 | MCP instance delete op (orphan cleanup) | S11 |

---

## Docs / skill drift

| Document claims | Actual behavior |
|---------------|-----------------|
| AGENTS.md `create_schema`: `name`, `definition` | Backend requires `data_product_id`, `version`, `format`, `fields[]` |
| AGENTS.md `get_table_schema`: param `table` | Backend expects `table_name` |
| AGENTS.md `resolve_canonical_key`: param `key` | Backend expects `key_or_alias` |
| S5 happy path uses `entry_id` for evidence | Works with `data_product_ids[]` |
| S1 Shopify OAuth | Needs `project_id` + allowlisted redirect origin |
| `create_connection` examples | Must include top-level `type` |

---

## Test fixture & orphans

```
project_id:      86b4d065-4d15-4673-adbf-37527d730f56  (delete attempted)
workflow_id:     83c54624-a84d-4d7b-a6ba-af80a6a4912a  (deleted)
connector_id:    cbeb7c64-d338-4777-8a34-9d270e4faa3a  (orphan — delete_connector missing)
instance_id:     724af7e4-c957-4104-bb5d-990a38589404  (orphan — no delete op)
ontology_concept: 15549c46-4857-42b2-ae37-5794f7e5002d (orphan — delete fails)
data_product_id: dd262eff-eb34-4575-95c2-8dd767742edb  (orphan — delete fails)
```

---

## Comparison to morning run ([`skills-user-stories-gap-report-2026-06-11.md`](./skills-user-stories-gap-report-2026-06-11.md))

| Area | Morning (apidev / pictureitlikethis) | This run (prod / Ask Bruce) |
|------|--------------------------------------|-----------------------------|
| S15 semantic layer | BLOCKED (facade missing) | PARTIAL (search works) |
| S7 read_queue_events | Invalid operation | Registered; Observe 401 |
| S14 deploy | Strong (deployed status seen) | Deploy requested; async not polled to completion |
| Core bugs | Same create-read, CWS, RBAC, DuckDB, agent | **Confirmed on prod** |

**Bottom line:** The platform's happy paths are ~60% green. The data product read path is the single highest-leverage fix — it blocks S2, S3, S4, and S7 queue ops in one shot.
