# Skills User Stories Gap Report (Run 6)

**Date:** 2026-06-12  
**Environment:** Loxtep **prod** (`mcp.loxtep.io` / `api.loxtep.io`)  
**Org:** Ask Bruce (`2563e219-721e-4a24-9029-e2c6dfc5d315`)  
**User:** `bruce@loxtep.io`  
**Methodology:** Full S0–S15 happy-path via hosted MCP. No REST bypasses.

Machine-readable log: [`skills-user-stories-gap-report-2026-06-12-r6.json`](./skills-user-stories-gap-report-2026-06-12-r6.json)

---

## Executive summary

| Metric | r5 | **r6** | Δ |
|--------|----|--------|---|
| PASS | 7 | **8** | +1 |
| PARTIAL | 9 | **8** | −1 |
| FAIL | 0 | **0** | — |

**Headline:** Lineage impact is green. `connector_type` alias works. But S4 took a step backward — `create_schema` now blows up on JSON insert instead of the old create-OK/get-404 dance. Domain-schema commits are on `development` but clearly not deployed to prod `ai` yet (or prod has a JSON serialization bug).

---

## Story scorecard

| ID | Story | Status | Notes |
|----|--------|--------|-------|
| S0 | Session / org | **PASS** | |
| S1 | Connectors | **PARTIAL** | OAuth still needs `project_id`; `connector_type` alias now works |
| S2 | Omnichannel DP | **PASS** | create → get → list round-trip |
| S3 | Webhook consumption | **PASS** | |
| S4 | Schemas / quality | **PARTIAL** | **`create_schema` FAIL** — JSON insert error; quality OK |
| S5 | Discover / lineage | **PASS** | **`get_lineage_impact` fixed** (downstream_count: 0) |
| S6 | Analytics SQL | **PARTIAL** | `execute_query` OK; no warehouse tables |
| S7 | Workspace / queues | **PARTIAL** | snapshots OK; queue ops fail |
| S8 | Process intel | **PARTIAL** | create/get OK; `query_entity_context` fails |
| S9 | Procedures | **PARTIAL** | `list_procedures` only |
| S10 | Agent workspace | **PASS** | |
| S11 | Instances | **PARTIAL** | `list_instances` only |
| S12 | Auth | **PASS** | |
| S13 | Ontology | **PASS** | |
| S14 | Deployments | **PARTIAL** | `deploy_project` triggered; no poll |
| S15 | Semantic layer | **PASS** | |

---

## Improvements since r5

1. **S5 `get_lineage_impact`** — returns `downstream_count: 0` instead of Graph API 404.
2. **S1 `create_connection`** — accepts `connector_type` (r5 required `type`).
3. **S5 promoted to PASS** — full discover/lineage path green except empty search results.

---

## Regressions / still open

| Gap | Stories | Priority |
|-----|---------|----------|
| `create_schema` JSON insert failure on `domain_schema_versions` | S4 | **P0** — deploy domain-schema fix or fix JSON serialization |
| `query_entity_context` fails after create | S8 | P1 |
| Observe proxy 500 on `read_queue_events` | S7 | P1 |
| `get_queue_info` 404 for design-time DP | S7 | P2 |
| OAuth URL requires `project_id` | S1 | docs/validation |
| Warehouse empty until deploy+ingest | S6 | data_fixture |

---

## Next step

Deploy `ai` from `development` (domain-schema-service JSON fix) and re-run S4.
