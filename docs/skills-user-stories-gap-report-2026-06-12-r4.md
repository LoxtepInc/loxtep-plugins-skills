# Skills User Stories — MCP Gap Report (Run 4)

**Date:** 2026-06-12 (executed ~04:42Z UTC)  
**Environment:** Loxtep **prod** (`mcp.loxtep.io` / `api.loxtep.io`)  
**Org:** Ask Bruce (`2563e219-721e-4a24-9029-e2c6dfc5d315`)  
**User:** `bruce@loxtep.io`  
**Methodology:** Full S0–S15 via hosted MCP (`CallMcpTool`). No REST bypasses.

Machine-readable log: [`skills-user-stories-gap-report-2026-06-12-r4.json`](./skills-user-stories-gap-report-2026-06-12-r4.json)  
Prior baseline: [`skills-user-stories-gap-report-2026-06-11-r3.md`](./skills-user-stories-gap-report-2026-06-11-r3.md)

---

## Executive summary

| Metric | Run 4 | Run 3 |
|--------|-------|-------|
| **PASS** | **6** (S0, S2, S3, S10, S12, S15) | 2 (S0, S12) |
| **PARTIAL** | 10 | 10 |
| **FAIL** | **0** | 4 (S2, S3, S4, S10) |
| Workarounds | 0 | 0 |

Run 4 is the first pass with **zero story-level FAILs**. The big wins are the data product read path (S2/S3), agent orchestration mutations (S10), connector delete (S1), and semantic artifact retrieval (S15).

---

## Story matrix

| Story | Skill | Status | Primary blocker |
|-------|-------|--------|-----------------|
| S0 | loxtep-mcp-session | **PASS** | — |
| S1 | connect-external-system | **PARTIAL** | `create_connection` expects `type` not `connector_type` in MCP schema |
| S2 | data-workflows | **PASS** | — |
| S3 | data-workflows | **PASS** | — |
| S4 | org-semantics-quality | **PARTIAL** | `get_schema` not found after successful create |
| S5 | discover-govern-lineage | **PARTIAL** | `get_lineage_impact` 404; catalog entry needs `entry_id`+`entry_type` |
| S6 | loxtep-analytics | **PARTIAL** | DuckDB not in prod `ai` Lambda |
| S7 | loxtep-workspace | **PARTIAL** | Queue info 404; Observe STS AssumeRole 401 |
| S8 | loxtep-process-intel | **PARTIAL** | `query_entity_context` fails |
| S9 | loxtep-procedures | **PARTIAL** | List only (import/export not run) |
| S10 | loxtep-agent-workspace | **PASS** | — |
| S11 | loxtep-instances | **PARTIAL** | List only; create not run |
| S12 | loxtep-auth | **PASS** | Session healthy |
| S13 | loxtep-ontology | **PARTIAL** | `node_type` enum mismatch (`concept` invalid; use `entity`) |
| S14 | loxtep-deployments | **PARTIAL** | Deploy triggered; completion not polled |
| S15 | loxtep-semantic-layer | **PASS** | — |

---

## What improved since Run 3

1. **S2/S3 PASS** — `create_data_product` → `get_data_product` → `list_data_products` → `create_consumption` all work.
2. **S10 PASS** — `agent_orchestration_create_issue` / `create_project` fixed (combined-validator payload flatten in agent-orchestration).
3. **S1 `delete_connector`** — succeeds (connector_shares hard-delete).
4. **S5 `get_catalog_entry`** — works with `entry_id` + `entry_type: data_product`.
5. **S15 `get_semantic_artifact`** — works with `artifact_id` + `artifact_type` from search results.

---

## Still open (fix next)

1. **DuckDB on prod `ai` Lambda** — `execute_query` / `get_table_schema` (S6).
2. **Observe queue STS** — `read_queue_events` AssumeRole 401 (S7); `get_queue_info` 404 for data product.
3. **Graph lineage** — `get_lineage_impact` returns 404 (S5).
4. **Schema read path** — `create_schema` OK but `get_schema` not found (S4).
5. **Process intel query** — `query_entity_context` still fails (S8).
6. **MCP param docs** — `create_connection` uses `type`; `get_catalog_entry` uses `entry_id`/`entry_type`; ontology `node_type` enum.

---

## Fixture IDs (cleaned up)

Test project `59138bf7-791f-4111-9ce4-548a0299527d` deleted at end of run. Created data product `db0f572a-31b8-4e6d-ad3c-ee31b43ff61c` and consumption `0d88feac-3fbd-4929-9de9-b72854e09a35` remain on org (project deleted).
