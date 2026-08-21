<!-- GENERATED FILE -- edit skills/<slug>/SKILL.md (or rule.mdc.src.md) and run `node scripts/generate-skills.mjs` -- do not edit directly -->
---
name: bind-external-warehouse
description: >
  Bind an existing Snowflake or Databricks table as a Loxtep data product in
  place (warehouse bind — storage, not Meaning type bind).
metadata:
  documentation: https://github.com/LoxtepInc/loxtep-plugins-skills/blob/main/cursor/skills/bind-external-warehouse/SKILL.md
---

# Bind external warehouse

Bind an existing Snowflake or Databricks table as a Loxtep data product **in
place**.

## Supported

- Discover warehouse objects via Snowflake / Databricks connectors
- Register bound product (`POST /dataproducts/dataproducts/bind` or MCP
  `loxtep_build` / `bind_warehouse_table`)
- Warehouse-SQL reads (aggregates federated; samples into DuckDB) — Snowflake
  and Databricks SQL Warehouse dialects
- Warehouse quality rules (completeness, uniqueness, validity, range, freshness)
  with dialect-aware SQL pushdown
- Declared lineage via the existing lineage API

## Unsupported

- Outbound `database_sync` / copying Loxtep data into the warehouse
- Writing into customer warehouse tables
- Dual-write Unity Catalog ↔ Loxtep Glue
- BigQuery, Redshift
- Automatic observed lineage from `QUERY_HISTORY`
- Warehouse-SQL sample/federated reads against Iceberg catalog binds (metadata
  bind only — see `docs/architecture/unity-iceberg-uniform-bind.md`)
- Iceberg bootstrap / `rebuild_iceberg` for `external_warehouse` bindings
  (skipped; Observe returns `external_storage_not_applicable`)

## Optional: Unity / Iceberg REST catalog bind

`POST /dataproducts/dataproducts/bind` with `kind: "iceberg_catalog"` and
`catalog_type: "unity" | "rest"` (read-only). Does **not** replace the warehouse
overlay path. UniForm limits and no-Glue dual-write rules:
`docs/architecture/unity-iceberg-uniform-bind.md`.

## MCP

```json
{
  "tool": "loxtep_build",
  "operation": "list_warehouse_objects",
  "connector_id": "…"
}
```

```json
{
  "tool": "loxtep_build",
  "operation": "bind_warehouse_table",
  "connector_id": "…",
  "database": "ANALYTICS",
  "schema": "PUBLIC",
  "table": "ORDERS"
}
```

For Databricks, `database` is the Unity Catalog catalog name.

Every data product MCP response includes `storage.backend` (e.g.
`external_warehouse` vs `loxtep_iceberg` / `loxtep_queue`).
