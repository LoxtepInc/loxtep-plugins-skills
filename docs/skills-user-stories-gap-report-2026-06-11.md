# Skills User Stories — MCP Gap Report

**Date:** 2026-06-11  
**Environment:** Loxtep dev (`appdev.loxtep.io` / `apidev.loxtep.io`)  
**MCP server:** `plugin-loxtep-loxtep` (hosted OAuth 2.1 + PKCE)  
**Methodology:** Full happy-path execution per [`skills-user-stories.md`](./skills-user-stories.md); **no REST bypasses or workarounds**.

---

## 1. Executive summary

| Metric | Value |
|--------|-------|
| Stories attempted | 16 (S0–S15) |
| **PASS** | 2 (S0, S12) |
| **PARTIAL** | 10 (S1, S2, S4, S5, S6, S7, S9, S11, S13, S14) |
| **FAIL** | 3 (S3, S8, S10) |
| **BLOCKED** | 1 (S15 — facade missing on hosted MCP) |
| Happy-path step pass rate | ~52% (estimated 45/87 invoked steps PASS) |

### Top 5 systemic issues

1. **Hosted MCP facade drift** — Codebase defines `read_queue_events` on `loxtep_workspace` and entire `loxtep_semantic_layer` facade; hosted MCP exposes neither (`mcp-facades.ts` vs deployed tool descriptors).
2. **Analytics Lambda missing DuckDB** — `execute_query` and `get_table_schema` fail: `Cannot find module 'duckdb'` in `/var/task/index.js`.
3. **Org-scoped CustomerWorkspaceService bug** — `list_quality_rules`, `list_tags`, `get_catalog_entry` error: *"CustomerWorkspaceService requires project_id; org-scoped tools should not access it"*.
4. **Create-then-read inconsistency** — Schemas, quality rules, and catalog data products return "not found" on immediate GET/update/delete despite successful create.
5. **RBAC gaps for test user** — Missing `connections:execute`, `consumptions:create`, `process_intelligence:create` blocks S1 test_connection, S3 consumption, S8 mutations.

---

## 2. Environment

| Field | Value |
|-------|-------|
| Organization | `pictureitlikethis` (`a28f7e9c-428d-4113-9b7d-1eb71ef08332`) |
| User | `testecomm@pictureitlikethis.com` (`bc5759c3-f962-49b1-9ccf-721ceaeba4dc`) |
| Role | `owner` (org-scoped) |
| Primary instance | `9c5a188a-a73b-4a8c-9143-98bd11b01776` (Shopify Import, managed) |
| Sandbox instance | `7f1639b1-b01a-4dc4-801e-4de9187d6bf8` |
| Test project | `mcp-story-test-2026-06-11` (`2ef3771f-e9a6-49a7-8929-ed99138345a7`) — **deleted at cleanup** |

---

## 3. Story matrix

| Story | Skill | Status | Primary blocker |
|-------|-------|--------|-----------------|
| S0 | loxtep-mcp-session | **PASS** | — |
| S1 | create-connector | **PARTIAL** | OAuth track BLOCKED; `test_connection` RBAC |
| S2 | data-workflows | **PARTIAL** | `get_data_product` not found after create; graph param docs drift |
| S3 | data-workflows | **FAIL** | `consumptions:create` permission denied |
| S4 | org-semantics-quality | **PARTIAL** | Create/read split; org-scoped list broken |
| S5 | discover-govern-lineage | **PARTIAL** | CWS project_id errors; lineage client not configured |
| S6 | loxtep-analytics | **PARTIAL** | DuckDB module missing; param `query` not `sql` |
| S7 | loxtep-workspace | **PARTIAL** | `read_queue_events` not on hosted MCP; queue 404 |
| S8 | loxtep-process-intel | **FAIL** | `process_intelligence:create` denied |
| S9 | loxtep-procedures | **PARTIAL** | Create works with `organization_id`; import/export not fully exercised |
| S10 | loxtep-agent-workspace | **FAIL** | `agent_orchestration_create_issue` fails |
| S11 | loxtep-instances | **PARTIAL** | List + create succeed; async provision not verified |
| S12 | loxtep-auth | **PASS** | Hosted OAuth works; recovery flow not re-tested |
| S13 | loxtep-ontology | **PARTIAL** | Skills under-document required fields; delete_ontology_concept body bug |
| S14 | loxtep-deployments | **PARTIAL** | Core deploy path PASS; deploy_project also triggered |
| S15 | loxtep-semantic-layer | **BLOCKED** | `loxtep_semantic_layer` tool absent from hosted MCP |

---

## 4. Detailed findings (by story)

### S0 — Session ✅ PASS

| Step | Tool / op | Status | Notes |
|------|-----------|--------|-------|
| Get user + permissions | `loxtep_session` / `get_current_user` | PASS | Returns `permissions`, `roles`, org context |
| Get organization | `loxtep_session` / `get_current_organization` | PASS | |

### S12 — Auth ✅ PASS

| Step | Status | Notes |
|------|--------|-------|
| Hosted MCP OAuth | PASS | No manual `npx login` required |
| Token recovery procedure | SKIPPED | Not sabotaged; implicit pass via successful session |

### S1 — Connectors ⚠️ PARTIAL

**Track A (Shopify OAuth — story narrative)**

| Step | Status | Error / gap |
|------|--------|-------------|
| `list_connector_types` | PASS | |
| `get_connector_oauth_url` (shopify) | FAIL | Requires `connection_config.shop`; browser OAuth not completed → **BLOCKED** |

**Track B (SDK — automatable)**

| Step | Status | Error / gap |
|------|--------|-------------|
| `create_connector` (sdk) | PARTIAL | First fail: multi-instance org needs `metadata.instance_id` |
| `create_connector` + instance_id | PASS | `sdk_config` returned |
| `create_connection` | PASS | |
| `update_connection` | PASS | |
| `list_connections` / `get_connection` | PASS | |
| `test_connection` | FAIL | `Permission denied: connections:execute` |
| `delete_connection` | PASS | Standalone connection deleted |

**Gap type:** `rbac`, `manual_step`, `docs_drift` (instance_id, shop config)

### S2 — Omnichannel workflow ⚠️ PARTIAL

| Step | Status | Error / gap |
|------|--------|-------------|
| `create_project` | PASS | |
| `create_workflow` | PASS | |
| `patch_workflow_graph` add_node | PASS | |
| `patch_workflow_graph` connect_nodes | PARTIAL | First attempt used `source_id`/`target_id`; skill expects `from_entity_id`/`to_entity_id` |
| `create_data_product` | PARTIAL | Requires `workflow_id`, `owner_user_id` not in skill minimal example |
| `get_data_product` | FAIL | "Data product not found" after successful create |
| `get_data_product_lexicon` | FAIL | Requires `project_id`; existing DP also "not found" |
| `preview_transform` | FAIL | Requires `workflow_id` + `transformation_id` |

### S3 — Webhook consumption ❌ FAIL

| Step | Status | Error / gap |
|------|--------|-------------|
| `list_consumptions` | PASS | Empty list |
| `create_consumption` | FAIL | `Permission denied: consumptions:create` |

### S4 — Schemas & quality ⚠️ PARTIAL

| Step | Status | Error / gap |
|------|--------|-------------|
| `create_schema` (minimal) | FAIL | Validation — needs full definition per `schemas-cws-mcp-inputs.ts` |
| `create_schema` (full) | PASS | `3afbf941-d642-43c1-a4fb-29d081190ec3` |
| `list_schema_versions` | PASS | |
| `get_schema` | FAIL | "Schema not found" immediately after create |
| `update_schema` | FAIL | Same not-found |
| `tag_pii_fields` | FAIL | Same not-found |
| `delete_schema` | FAIL | Same not-found |
| `create_quality_rule` | PASS | `ea2ee1dc-7871-4f22-820b-3bc739899df9` |
| `list_quality_rules` | FAIL | CWS requires `project_id` on org-scoped tool |
| `test_quality_rule` | FAIL | "Quality rule not found" |

### S5 — Catalog & discovery ⚠️ PARTIAL

| Step | Status | Error / gap |
|------|--------|-------------|
| `search_catalog` | PASS | 20 results |
| `get_catalog_entry` | FAIL | CWS `project_id` required |
| `get_evidence` | PASS | |
| `get_governance_flags` | PASS | |
| `get_lineage_impact` | PARTIAL | Success but `downstream_count: null`, "Lineage impact client not configured" |
| `run_discovery` | PASS | Returns guidance (not async job) |
| `list_domains` | PASS | |
| `list_tags` | FAIL | CWS `project_id` required |

### S6 — Analytics ⚠️ PARTIAL

| Step | Status | Error / gap |
|------|--------|-------------|
| `list_tables` | PARTIAL | Requires `project_id` (undocumented in AGENTS.md examples using `sql`) |
| `get_table_schema` | FAIL | DuckDB module not installed |
| `execute_query` (`sql`) | FAIL | Wrong param name |
| `execute_query` (`query`) | FAIL | DuckDB module not installed |
| `get_query_results` | SKIPPED | No successful query |

### S7 — Workspace ⚠️ PARTIAL

| Step | Status | Error / gap |
|------|--------|-------------|
| `list_versions` | PASS | |
| `create_snapshot` | PASS | |
| `compare_versions` | PASS | Needs `version_a`/`version_b` not `from`/`to` |
| `reindex_workspace` | PASS | |
| `restore_version` | SKIPPED | Not invoked (risk to fixture) |
| `get_queue_info` | FAIL | HTTP 404 for test data product |
| `read_queue_events` | FAIL | **Invalid operation** on hosted `loxtep_workspace` enum |
| `replay_events` | PARTIAL | Returns params only; `historical_replay_via_mcp: false` |

### S8 — Process intelligence ❌ FAIL

| Step | Status | Error / gap |
|------|--------|-------------|
| `create_entity_context` | FAIL | Forbidden: `process_intelligence:create` |
| `get_entity_context` | PASS | With `entity_type` + `entity_id` |
| `query_entity_context` | SKIPPED | Validation needs entity fields |
| `record_decision_trace` | FAIL | Forbidden: `process_intelligence:create` |
| `list_decision_traces` | PASS | Empty |

### S9 — Procedures ⚠️ PARTIAL

| Step | Status | Error / gap |
|------|--------|-------------|
| `list_procedures` | PASS | |
| `get_procedure` | PASS | |
| `create_procedure` | PASS | Requires top-level `organization_id` |
| `delete_procedure` | PASS | Cleanup |
| `import_process_graph` / `export_process_graph` | SKIPPED | Timeboxed; create path validated |

### S10 — Agent workspace ❌ FAIL

| Step | Status | Error / gap |
|------|--------|-------------|
| `agent_orchestration_list_issues` | PASS | Empty |
| `agent_orchestration_create_issue` | FAIL | "Create issue failed" (no detail) |
| `agent_orchestration_list_goals` | PASS | |
| `agent_orchestration_list_projects` | PASS | |
| `agent_orchestration_list_agents` | PASS | |

### S11 — Instances ⚠️ PARTIAL

| Step | Status | Error / gap |
|------|--------|-------------|
| `list_instances` | PASS | 2 instances |
| `create_instance` | PASS | Async queue `90bd6e87-15b7-46f5-9e58-0fdca065e9a9` |

### S13 — Ontology ⚠️ PARTIAL

| Step | Status | Error / gap |
|------|--------|-------------|
| `list_thesaurus_terms` | PASS | |
| `create_thesaurus_term` | PASS | Needs `canonical_key`, aliases as `{path, system?}` |
| `delete_thesaurus_term` | PASS | Cleanup |
| `create_ontology_concept` | PASS | Needs `namespace`, `node_type` |
| `delete_ontology_concept` | FAIL | "Request body is required" — MCP wiring bug |
| Other ops (sync, namespace, relationships) | SKIPPED | Partial coverage |

### S14 — Deployments ⚠️ PARTIAL (core path strong)

| Step | Status | Error / gap |
|------|--------|-------------|
| `list_deployments` | PASS | |
| `deploy_workflow` | PASS | Status → **deployed** |
| `get_deployment` | PASS | |
| `get_runtime_mapping` | PASS | Bots/queues mapped |
| `deploy_project` | PASS | Status requested |

### S15 — Semantic layer ❌ BLOCKED

| Step | Status | Error / gap |
|------|--------|-------------|
| `loxtep_semantic_layer` facade | BLOCKED | Tool not registered on hosted MCP (18 facades deployed, not 19) |
| `search_semantic_layer` | BLOCKED | |
| `user-loxtep_local` fallback | BLOCKED | Same — tool not found |

---

## 5. Operation rollup (failed ops → fix layer)

| Layer | Operations | Fix direction |
|-------|------------|---------------|
| **MCP deploy / facade** | `read_queue_events`, entire `loxtep_semantic_layer` | Redeploy `ai` MCP handler; sync tool enums with `mcp-facades.ts` |
| **Backend runtime** | `execute_query`, `get_table_schema` | Bundle `duckdb` in analytics Lambda or disable MCP ops until fixed |
| **API / CWS routing** | `list_quality_rules`, `list_tags`, `get_catalog_entry` | Route org-scoped catalog ops without CWS `project_id` |
| **Data consistency** | `get_schema`, `get_data_product`, `delete_schema`, `test_quality_rule` | Fix create→read path (wrong store or ID mapping) |
| **RBAC** | `test_connection`, `create_consumption`, `create_entity_context` | Grant owner role missing permissions or document required role |
| **Agent orchestration** | `agent_orchestration_create_issue` | Debug graph/agent-orchestration API 500 |
| **Docs / skills** | Graph connect params, analytics `query` vs `sql`, ontology alias shape | Update SKILL.md + AGENTS.md tables |
| **Cleanup** | `delete_connector` (missing op), ontology concept delete | Add connector delete to facade; fix delete body forwarding |

---

## 6. Docs / skill drift

| Doc claims | Actual behavior |
|------------|-----------------|
| AGENTS.md: `execute_query` uses `sql` | Backend expects `query` |
| AGENTS.md / matrix: `read_queue_events` on `loxtep_workspace` | Not in hosted MCP enum |
| Roadmap: "Semantic layer search (MCP) 🟢 GA" | Facade not deployed |
| `data-workflows` Flow E | Must use `from_entity_id`/`to_entity_id` for connect |
| `create-connector` minimal metadata | Multi-instance orgs need `metadata.instance_id` |
| S1 Shopify happy path | Needs `connection_config.shop` + browser OAuth |

---

## 7. Cleanup log

| Resource | ID | Delete op | Result |
|----------|-----|-----------|--------|
| Procedure | `681745e4-...` | `delete_procedure` | ✅ PASS |
| Thesaurus term | `bf0ecafc-...` | `delete_thesaurus_term` | ✅ PASS |
| Ontology concept | `3bfee20c-...` | `delete_ontology_concept` | ❌ FAIL (missing body) |
| Workflow | `6acafc2b-...` | `delete_workflow` | ✅ PASS |
| Project | `2ef3771f-...` | `delete_project` | ✅ PASS |
| Data product | `a853cadc-...` | `delete_data_product` | ❌ FAIL (not found) |
| Schema | `3afbf941-...` | `delete_schema` | ❌ FAIL (not found) |
| Quality rule | `ea2ee1dc-...` | `delete_quality_rule` | ❌ FAIL (not found) |
| Connector (SDK) | `49dfee85-...` | `delete_connector` | ❌ FAIL (op does not exist) |
| Instance (async) | `90bd6e87-...` | — | **Orphan** — no MCP delete op |

---

## 8. Engineering fix backlog (priority)

| P | Item | Stories |
|---|------|---------|
| P0 | Deploy `loxtep_semantic_layer` + `read_queue_events` to hosted MCP | S7, S15, GTM |
| P0 | Install/bundle DuckDB for analytics Lambda | S6, GTM §7 |
| P0 | Fix org-scoped catalog/quality CWS `project_id` bug | S4, S5 |
| P1 | Fix create→read for schemas, quality rules, data products | S2, S4 |
| P1 | Add `connections:execute`, `consumptions:create`, `process_intelligence:create` to owner role (or document) | S1, S3, S8 |
| P1 | Fix `agent_orchestration_create_issue` | S10 |
| P2 | Add `delete_connector` MCP operation | Cleanup, S1 |
| P2 | Fix `delete_ontology_concept` MCP body forwarding | S13 |
| P2 | Update skills/docs for graph connect, analytics params, ontology shapes | All |
| P3 | Configure lineage impact client on dev | S5 |

---

## Appendix A — Test fixture IDs (historical)

```
project_id:     2ef3771f-e9a6-49a7-8929-ed99138345a7  (deleted)
workflow_id:    6acafc2b-fa9e-43bc-9b91-936b0d5e602b  (deleted)
connector_id:   49dfee85-3781-4815-9d57-8416bb44c235  (orphan)
deployment_id:  29a08596-1f0d-459d-b341-9da30113bf08
instance_id:    90bd6e87-15b7-46f5-9e58-0fdca065e9a9  (orphan)
```

Machine-readable step log: [`skills-user-stories-gap-report-2026-06-11.json`](./skills-user-stories-gap-report-2026-06-11.json)  
GTM reconciliation: [`loxtep/docs/gtm/feature-truth-reconciliation-2026-06-11.md`](../../loxtep/docs/gtm/feature-truth-reconciliation-2026-06-11.md)

---

## Appendix B — Rerun notes (same day, later sessions)

### Live MCP execution in agent chat (blocked)

Subsequent agent sessions could **not** invoke `plugin-loxtep-loxtep` — the Loxtep MCP server was connected in Cursor logs (`Successfully connected to streamableHttp`) but **not registered** in the symmatiq multi-root workspace agent tool registry. `CallMcpTool` returns `MCP server does not exist`.

**To rerun from an agent:** start a **new chat** after MCP shows green in Settings → Tools & MCP (reload window if needed).

### Automated rerun script

[`../scripts/run-skills-user-stories-mcp-test.mjs`](../scripts/run-skills-user-stories-mcp-test.mjs) — same `/ai/mcp/tools/call` path as hosted MCP. Requires:

```bash
export LOXTEP_AUTH_TOKEN='<jwt from appdev OAuth>'
export LOXTEP_API_BASE_URL='https://apidev.loxtep.io'
node scripts/run-skills-user-stories-mcp-test.mjs
```

`.env.test` credentials returned **401 Invalid email or password** at time of check — update before CI use.

### Code-level remediation status (main branch)

Property/unit tests for gap remediation **pass locally** (e.g. `org-scoped-success`, `facade-completeness`, `create-then-read`). Fixes are merged in code for:

- `delete_connector`, `read_queue_events`, `loxtep_semantic_layer` in `mcp-facades.ts`
- Org-scoped CWS routing (Req 3)
- DuckDB bundling guards (Req 2)
- Create-then-read ID contract (Req 4)

**Deploy verification still required:** unauthenticated `ListTools` on mcpdev returns **401** (OAuth required). Post-deploy verifier needs `MCP_VERIFY_TOKEN` / Bearer token. Tool descriptors in a connected Cursor window showed **19 facades** including `read_queue_events` and `loxtep_semantic_layer` — suggests deploy may have caught up since the morning run; **re-run S7/S15 after auth** to confirm.
