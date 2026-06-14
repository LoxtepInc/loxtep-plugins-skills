# Skills User Stories Gap Report (Run 9)

**Date:** 2026-06-13  
**Environment:** Loxtep **dev** (`https://mcpdev.loxtep.io/ai/mcp/stream` / `https://apidev.loxtep.io`)  
**Org:** pictureitlikethis (`a28f7e9c-428d-4113-9b7d-1eb71ef08332`)  
**User:** `testecomm@pictureitlikethis.com`  
**Methodology:** Full S0–S15 happy-path via hosted MCP (`CallMcpTool`, server `project-0-loxtep-loxtep`). No REST bypasses. **Agent-driven — no runner script.**

Machine-readable log: [`skills-user-stories-gap-report-2026-06-13-r9.json`](./skills-user-stories-gap-report-2026-06-13-r9.json)

---

## Executive summary

| Metric | r8 (dev) | **r9 (dev)** | Δ |
|--------|----------|--------------|---|
| PASS | 10 | **10** | — |
| PARTIAL | 6 | **6** | — |
| FAIL | 0 | **0** | — |

**Headline:** Core mesh workflows (S2–S5, S10–S13, S15) are green on dev with ai + graph deployed. Remaining PARTIALs are the same fault lines as r8: warehouse `get_table_schema`, Observe queue reads, `query_entity_context`, Shopify OAuth infra, and shallow S9/S14 coverage. Some r8 failures **changed shape** (schema describe is now a DuckDB binder/quoting error, not `t is not iterable`; `get_queue_info` no longer 404s for draft DPs).

---

## Story scorecard

| ID | Story | Status | Notes |
|----|--------|--------|-------|
| S0 | Session / org | **PASS** | `get_current_user`, `get_current_organization` |
| S1 | Connectors | **PARTIAL** | SDK connector + connections OK; Shopify OAuth blocked — missing dev secret `loxtep-dev/connectors/shopify/client-id` |
| S2 | Omnichannel DP | **PASS** | create project/workflow/DP/graph round-trip |
| S3 | Webhook consumption | **PASS** | consumption create/get |
| S4 | Schemas / quality | **PASS** | `create_schema` + `get_schema` + quality list |
| S5 | Discover / lineage | **PASS** | catalog search + `get_catalog_entry` (`entry_id`, `entry_type`) |
| S6 | Analytics SQL | **PARTIAL** | `list_tables` (58), `execute_query` OK; **`get_table_schema` FAIL** — DuckDB binder: `table_name` double-quoted as column |
| S7 | Workspace / queues | **PARTIAL** | `create_snapshot` OK; `get_queue_info` OK (draft hints + deployed `rstreams_queue`); **`read_queue_events` FAIL** — Observe HTTP 500 on live queue |
| S8 | Process intel | **PARTIAL** | `create_entity_context` OK; `get_entity_context` OK (empty graph); **`query_entity_context` FAIL** |
| S9 | Procedures | **PARTIAL** | `list_procedures` only; `create_procedure` needs `organization_id` (MCP validation) |
| S10 | Agent workspace | **PASS** | `agent_orchestration_list_projects` |
| S11 | Instances | **PASS** | 3 instances |
| S12 | Auth | **PASS** | OAuth via mcpdev |
| S13 | Ontology | **PASS** | `create_ontology_concept` (`namespace`, `node_type`) |
| S14 | Deployments | **PARTIAL** | `deploy_project` triggered; `list_deployments` empty (no poll/`get_deployment`) |
| S15 | Semantic layer | **PASS** | search + completeness + `get_semantic_artifact` |

---

## Improvements since r8

1. **`get_queue_info`** — returns queue hints for draft DPs (no 404); deployed DP exposes `rstreams_queue`.
2. **S8 `create_entity_context`** — succeeds with graph service live.
3. **S6 `list_tables` / `execute_query`** — stable (58 tables, `SELECT 1` completes).

---

## Regressions / still open

| Gap | Stories | Priority | Detail |
|-----|---------|----------|--------|
| `get_table_schema` DuckDB describe SQL | S6 | **P1** | `WHERE table_name = "shopify_gql_order"` — identifier quoted as column, not string literal |
| `query_entity_context` after create | S8 | **P1** | "Entity context query failed" (GSI1 search path may need deploy or index lag) |
| Observe proxy 500 on `read_queue_events` | S7 | **P1** | Queue `w-a28f-9c5a-de8e71af-queue-conn-9cf1650e-ingested`, instance `9c5a188a-8e71-4bf7-b83c-362cc0e6d9bd` |
| Shopify OAuth client secret missing on dev | S1 | P2 | Infra/config, not MCP validation |
| Procedures CRUD not exercised | S9 | coverage | `create_procedure` requires explicit `organization_id` |
| Deployment poll not run | S14 | coverage | Async deploy requested; no deployment row yet |

---

## Fixture IDs (r9 session)

| Resource | ID |
|----------|-----|
| `project_id` | `67e91bb7-9f20-418c-b481-19185087b9e4` |
| `workflow_id` | `62b73f04-2829-4fef-8e51-4f6a275e07de` |
| `connector_id` | `e53c0300-aaad-4554-a2ce-e860ab93c3b2` |
| `connection_id` | `a0b98863-b927-4a2f-8e99-e3a1f91aeb6a` |
| `data_product_id` | `8d11763c-21a4-4ae5-90ec-0806dea5acff` |
| `consumption_id` | `3fe6eeaf-92ac-42e5-8403-c32a0522c71e` |
| `schema_version_id` | `5c5f647a-d366-4c08-b09e-57a3166f9a7f` |
| `instance_id` (test) | `90bd6e87-15b7-46f5-9e58-0fdca065e9a9` |
| Deployed Shopify DP (queue probe) | `b4ea7ba0-37d5-4bf7-b83c-362cc0e6d9bd` |
| Shopify instance (queue probe) | `9c5a188a-8e71-4bf7-b83c-362cc0e6d9bd` |

---

## Next step

1. Fix `get_table_schema` information_schema query — use single-quoted string literal for `table_name`.
2. Deploy/triage graph GSI1 path for `query_entity_context`; verify index on `source_system` + external id.
3. Triage Observe proxy for `read_queue_events` (instance secrets, API mapping, leo-auth).
4. Add Shopify OAuth secret on dev or document S1 as BLOCKED until secret exists.
