# Skills User Stories Gap Report (Run 5)

**Date:** 2026-06-12  
**Environment:** Loxtep **prod** (`mcp.loxtep.io` / `api.loxtep.io`)  
**Org:** Ask Bruce (`2563e219-721e-4a24-9029-e2c6dfc5d315`)  
**User:** `bruce@loxtep.io`  
**Methodology:** Full S0–S15 happy-path via hosted MCP. No REST bypasses. Post-deploy of `ai`, `dataproducts`, `workflows` (warehouse-sql + cross-MS refactor).

Machine-readable log: [`skills-user-stories-gap-report-2026-06-12-r5.json`](./skills-user-stories-gap-report-2026-06-12-r5.json)

---

## Executive summary

| Metric | r4 | **r5** | Δ |
|--------|----|--------|---|
| PASS | 6 | **7** | +1 |
| PARTIAL | 10 | **9** | −1 |
| FAIL | 0 | **0** | — |
| BLOCKED | 0 | **0** | — |

**Headline:** DuckDB analytics is alive on prod (`execute_query` green). Ontology concept creation is fully green when you use the right `node_type`. The usual suspects remain: schema read-after-write, lineage impact 404, queue/observe plumbing, and entity context query.

---

## Story scorecard

| ID | Story | Status | Notes |
|----|--------|--------|-------|
| S0 | Session / org | **PASS** | |
| S1 | Connectors | **PARTIAL** | `type` not `connector_type`; OAuth needs `project_id` |
| S2 | Omnichannel DP | **PASS** | create → get → list round-trip |
| S3 | Webhook consumption | **PASS** | |
| S4 | Schemas / quality | **PARTIAL** | `get_schema` 404 after successful `create_schema` |
| S5 | Discover / lineage | **PARTIAL** | `get_lineage_impact` → Graph API 404 |
| S6 | Analytics SQL | **PARTIAL** | `execute_query` **fixed**; no materialized tables for schema probe |
| S7 | Workspace / queues | **PARTIAL** | snapshots OK; queue ops fail validation or Observe 500 |
| S8 | Process intel | **PARTIAL** | create/get OK; `query_entity_context` fails |
| S9 | Procedures | **PARTIAL** | `list_procedures` only |
| S10 | Agent workspace | **PASS** | |
| S11 | Instances | **PARTIAL** | `list_instances` only |
| S12 | Auth | **PASS** | |
| S13 | Ontology | **PASS** | `node_type=entity` + `namespace` |
| S14 | Deployments | **PARTIAL** | `deploy_project` triggered; no poll |
| S15 | Semantic layer | **PASS** | |

---

## Improvements since r4

1. **S6 `execute_query`** — DuckDB loads; `SELECT 1` completes in ~916ms (was `Cannot find module duckdb`).
2. **S13** — `create_ontology_concept` passes with `node_type: entity` and `namespace`.
3. **S1** — Shopify OAuth URL works when `project_id` is supplied (document the requirement).

---

## Still open (P1 backlog)

| Gap | Stories | Type |
|-----|---------|------|
| `get_schema` ID mismatch (create vs read resolver) | S4 | api_backend |
| Graph `get_lineage_impact` 404 | S5 | api_backend |
| `query_entity_context` fails after create | S8 | api_backend |
| Observe proxy 500 on `read_queue_events` | S7 | api_backend |
| `create_connection` expects `type`, skills say `connector_type` | S1 | validation/docs |
| Warehouse catalog empty until deploy+ingest (`deployment_bindings`) | S6 | data_fixture |
| `get_queue_info` needs `data_product_id` or `queue_name` | S7 | validation/docs |

---

## Test plan for next run

- [ ] Fix S4 schema read path; re-run create → get_schema
- [ ] Deploy + ingest one DP; re-run S6 `list_tables` / `get_table_schema` / `SELECT *`
- [ ] Wire lineage impact client or stub; re-run S5
- [ ] Align connection MCP schema (`type` vs `connector_type`) and skill docs
