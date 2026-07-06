# Skills User Stories — MCP Gap Report (Run 3)

**Date:** 2026-06-11 (executed 2026-06-12T02:41Z UTC)  
**Environment:** Loxtep **prod** (`mcp.loxtep.io` / `api.loxtep.io`) — post-remediation deploy  
**Org:** Ask Bruce (`2563e219-721e-4a24-9029-e2c6dfc5d315`)  
**User:** `bruce@loxtep.io`  
**Methodology:** Full S0–S15 via hosted MCP (`CallMcpTool`). No REST bypasses.

Machine-readable log: [`skills-user-stories-gap-report-2026-06-11-r3.json`](./skills-user-stories-gap-report-2026-06-11-r3.json)  
Prior baseline: [`skills-user-stories-gap-report-2026-06-11-r2.md`](./skills-user-stories-gap-report-2026-06-11-r2.md)

---

## Executive summary

| Metric | Run 3 (prod) | Run 2 (prod) |
|--------|--------------|--------------|
| **PASS** | 2 (S0, S12) | 2 (S0, S12) |
| **PARTIAL** | 10 | 10 |
| **FAIL** | 4 (S2, S3, S4, S10) | 4 (S3, S4, S8, S10) |
| Workarounds | 0 | 0 |

Scorecard headline unchanged, but **several systemic blockers moved** — org-scoped reads, OAuth redirect, connection test, and process-intel mutations are better. The **data product create→read→list** split is still the elephant in the room.

---

## Story matrix

| Story | Skill | Status | Primary blocker |
|-------|-------|--------|-----------------|
| S0 | loxtep-mcp-session | **PASS** | — |
| S1 | connect-external-system | **PARTIAL** | `delete_connector` DB migration (`connector_shares.deleted_at`) |
| S2 | data-workflows | **FAIL** | `get_data_product` / `list_data_products` after successful create |
| S3 | data-workflows | **FAIL** | Consumption create blocked by DP read path |
| S4 | org-semantics-quality | **FAIL** | Schema/quality create need DP entity resolver |
| S5 | discover-govern-lineage | **PARTIAL** | Lineage 404; catalog entry not indexed |
| S6 | loxtep-analytics | **PARTIAL** | DuckDB not in prod `ai` Lambda |
| S7 | loxtep-workspace | **PARTIAL** | Queue read STS 401 |
| S8 | loxtep-process-intel | **PARTIAL** | `query_entity_context` fails; mutations now work |
| S9 | loxtep-procedures | **PARTIAL** | List only (import/export not re-run) |
| S10 | loxtep-agent-workspace | **FAIL** | Create issue/project still fail |
| S11 | loxtep-instances | **PARTIAL** | List OK; create not re-run |
| S12 | loxtep-auth | **PASS** | `mcp_auth` recovery works |
| S13 | loxtep-ontology | **PARTIAL** | Create OK with `namespace` + `node_type` |
| S14 | loxtep-deployments | **PARTIAL** | `deploy_project` OK; async completion not polled |
| S15 | loxtep-semantic-layer | **PARTIAL** | Search/completeness OK; `get_semantic_artifact` param contract |

---

## What improved since Run 2

1. **OAuth redirect** — `get_connector_oauth_url` (Shopify) returns URL with `app.loxtep.io` callback (was `api.loxtep.io not allowlisted`).
2. **Org-scoped catalog/quality reads** — `list_quality_rules`, `list_tags` work without `project_id`.
3. **`test_connection`** — passes (was `connections:execute` denied).
4. **`delete_connector`** — on hosted facade; delete fails on DB schema, not missing tool.
5. **`create_entity_context`** — mutation succeeds (was RBAC denied in r2).
6. **`get_catalog_entry`** — org Knex path (no CWS `project_id` error); entry missing because DP not in catalog index.

---

## Still broken (fix next)

1. **Data product create→read→list** — Created `f813503e-9767-49f0-aa48-303ab6f2f5d4` but `get_data_product` / `list_data_products` return not found / empty. Blocks S2, S3, S4, S5 catalog entry.
2. **`delete_connector`** — `connector_shares.deleted_at` column missing on prod DB.
3. **DuckDB on prod `ai` Lambda** — `bundleCopyModules: ["duckdb"]` not effective or not deployed to prod.
4. **Agent orchestration mutations** — `create_issue` / `create_project` opaque failures.
5. **Observe queue STS** — `read_queue_events` AssumeRole 401.

---

## Fixture IDs (cleaned up)

Test project `fc6c63f4-dab3-4a33-8ba4-5df99fb34d7c` deleted at end of run. Orphan connector `e71d619f-…` may remain (delete failed).
