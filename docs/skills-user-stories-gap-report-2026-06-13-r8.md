# Skills User Stories Gap Report (Run 8)

**Date:** 2026-06-13  
**Environment:** Loxtep **dev** (`mcpdev.loxtep.io` / `apidev.loxtep.io`)  
**Org:** pictureitlikethis (`a28f7e9c-428d-4113-9b7d-1eb71ef08332`)  
**User:** `testecomm@pictureitlikethis.com`  
**Methodology:** Full S0–S15 happy-path via hosted MCP (`CallMcpTool`, server `project-0-loxtep-loxtep`). No REST bypasses. **Agent-driven — no runner script.**

Machine-readable log: [`skills-user-stories-gap-report-2026-06-13-r8.json`](./skills-user-stories-gap-report-2026-06-13-r8.json)

---

## Executive summary

| Metric | r6 (prod) | **r8 (dev)** | Δ |
|--------|-----------|--------------|---|
| PASS | 8 | **10** | +2 |
| PARTIAL | 8 | **6** | −2 |
| FAIL | 0 | **0** | — |

**Headline:** Dev deploy fixed **S4 schemas** (create + get round-trip green). Warehouse analytics are live (58 tables). Remaining gaps are Observe/queue ops (S7), `get_table_schema` iterator bug (S6), and `query_entity_context` (S8).

---

## Story scorecard

| ID | Story | Status | Notes |
|----|--------|--------|-------|
| S0 | Session / org | **PASS** | |
| S1 | Connectors | **PARTIAL** | Shopify OAuth needs `connection_config.shop`; SDK path green |
| S2 | Omnichannel DP | **PASS** | create → get → list → graph; cleanup delete |
| S3 | Webhook consumption | **PASS** | |
| S4 | Schemas / quality | **PASS** | **`create_schema` fixed on dev** |
| S5 | Discover / lineage | **PASS** | `get_catalog_entry` needs `entry_id` + `entry_type` |
| S6 | Analytics SQL | **PARTIAL** | 58 tables; `get_table_schema` FAIL (`t is not iterable`) |
| S7 | Workspace / queues | **PARTIAL** | snapshot OK; queue ops fail |
| S8 | Process intel | **PARTIAL** | create/get OK; `query_entity_context` fails |
| S9 | Procedures | **PARTIAL** | `list_procedures` only |
| S10 | Agent workspace | **PASS** | |
| S11 | Instances | **PASS** | 3 instances |
| S12 | Auth | **PASS** | OAuth via mcpdev |
| S13 | Ontology | **PASS** | needs `namespace` + `node_type` |
| S14 | Deployments | **PARTIAL** | `deploy_project` triggered; no poll |
| S15 | Semantic layer | **PASS** | search + completeness + artifact |

---

## Improvements since r6 (prod)

1. **S4 `create_schema` + `get_schema`** — PASS on dev (prod r6: JSON insert failure).
2. **S6 `list_tables`** — 58 queryable tables (prod r6: 0).
3. **S5 `get_catalog_entry`** — documented correct params (`entry_id`, `entry_type`).

---

## Regressions / still open

| Gap | Stories | Priority |
|-----|---------|----------|
| `get_table_schema` — `t is not iterable` when describing warehouse table | S6 | **P1** |
| `query_entity_context` fails after create/get | S8 | P1 |
| Observe proxy 500 on `read_queue_events` | S7 | P1 |
| `get_queue_info` 404 for design-time DP | S7 | P2 |
| Shopify OAuth requires `connection_config.shop` | S1 | docs/validation |
| S9 procedures CRUD not exercised | S9 | coverage |
| S14 `get_deployment` poll not run | S14 | coverage |

---

## Next step

Fix `get_table_schema` iterator (`t is not iterable`) and re-run S6. Triage Observe proxy for S7 `read_queue_events`.
