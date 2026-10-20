<!-- GENERATED FILE -- edit skills/<slug>/SKILL.md (or rule.mdc.src.md) and run `node scripts/generate-skills.mjs` -- do not edit directly -->
---
name: loxtep-analytics
description:
  Use when the user wants SQL analytics over the mesh, SQL queries, list tables,
  table schema, execute query, or poll query results. Customer MCP loxtep_query.
  User story S6. See docs/skills-user-stories.md.
metadata:
  documentation: https://github.com/LoxtepInc/loxtep-plugins-skills/blob/main/antigravity/skills/loxtep-analytics/SKILL.md
---

# Analytics and SQL (Customer MCP)

**Story S6:** Explore curated mesh data with **SQL** — discover tables, inspect
schema, run queries, fetch results.

## When to use

- “Run **SQL**”, “**list tables**”, “**schema** for table”, “**execute_query**”,
  “get **query results**”

## Prerequisites

- MCP auth. Operations are **organization**-scoped in MCP map.

## Happy-path flow

1. `loxtep_query` → `list_tables`.
2. `get_table_schema` for chosen table(s).
3. `execute_query` with the required `query` parameter (the SQL text). The
   required parameter is named `query`, not `sql`.
4. `get_query_results` if execution is asynchronous or paginated.

## MCP mapping

| Step    | Tool           | `operation`         | Scope        |
| ------- | -------------- | ------------------- | ------------ |
| List    | `loxtep_query` | `list_tables`       | organization |
| Schema  | `loxtep_query` | `get_table_schema`  | organization |
| Run     | `loxtep_query` | `execute_query`     | organization |
| Results | `loxtep_query` | `get_query_results` | organization |

## Reading `execute_query` results

A successful `loxtep_query` → `execute_query` call (`success: true`) is not
always a complete answer. The tool returns the full warehouse result in `data`
(`WarehouseQueryResult`). Check `data.status` before trusting rows.

- `completed` — rows are the query result. Still honor `sampled` and
  `applied_caps` when present; a bounded sample is not a full scan even when
  `status` is `completed`.
- `partial` — incomplete. Tell the user the result is truncated or sampled. Cite
  `files_read` of `files_expected` when those fields are present, and whether
  `sampled` is true. Never present counts or aggregates as complete. `error` may
  carry the warehouse reason (for example an Iceberg parquet fallback truncation
  message). `engine` and `applied_caps` may also be set.
- `failed` — failed tool response (`error`: `Query execution failed`). The
  warehouse `error` string is passed through as `message` as-is (no
  `'Unknown error'` default).
- any other status — failed tool response
  `Unhandled warehouse query status: <status>`.

If `recovery.action` is `rebuild_iceberg`, or `iceberg_health_status` /
`iceberg_health_reason` are set, follow the Iceberg rebuild guidance in Pitfalls
(`get_iceberg_health`, then `rebuild_iceberg_table` with `dry_run: true` first;
never rebuild without explicit confirmation).

`get_query_results` is the async/paginated poll. Today it does **not** surface
`status: "partial"` the way `execute_query` does: any status other than
`completed` or `failed` is returned as success with message
`Query is still pending`. On `failed`, the tool message falls back to
`'Unknown error'` when `result.error` is missing. Prefer `execute_query`'s
`data.status` when you already have it.

Fields that may appear on the result (only these exist on
`WarehouseQueryResult`): `query_id`, `status`, `results`, `columns`,
`row_count`, `total_count`, `execution_time_ms`, `error`, `policy_info`,
`tables_referenced`, `recovery`
(`{ action: 'rebuild_iceberg', data_product_id }`), `iceberg_health_status`,
`iceberg_health_reason`, `files_read`, `files_expected`, `engine` (`duckdb` |
`snowflake` | `databricks`), `sampled`, `applied_caps` (`row_limit`,
`byte_limit`).

### Maintainer notes

- `get_query_results` reports a warehouse `partial` as pending and uses
  `'Unknown error'` when `failed` has no `error`. A fix is planned to report
  `partial` the same way `execute_query` does. Update this when the fix lands.
- Partial Iceberg reads use two shapes today: context `iceberg_partial_read`
  (`data_product_id`, `files_read`, `files_expected`, `reason`) and thrown
  `IcebergPartialReadError` (`files_read`, `files_expected`, `data_product_id`,
  message/reason). One shared shape is planned. Update this when the fix lands.
- Whether `sampled: true` with `status: "completed"` is intended is still
  undecided. Honor `sampled` today. Update this when the fix lands.

## Pitfalls

- **Partial `execute_query` results** — `success: true` can still mean
  `data.status: "partial"`. Honor `sampled` even when `status` is `completed`.
  See **Reading `execute_query` results**.
- **`get_query_results` vs `partial`** — today a `partial` poll looks pending.
  Trust `execute_query`'s `data.status` until they match.
- Large result sets — use limits / pagination per platform.
- Wrong **org** or missing permissions show as auth or empty results.
- **Execution environment** — Analytics runs against governed mesh tables via
  `loxtep_query`, not an arbitrary external database URL.
- **Iceberg is deliberate opt-in** — workflow deploy does not enable Iceberg.
  Enable with `loxtep_observe` → `enable_iceberg_table` after the product has a
  storage identity: `schema.key`, or the same fields marked `is_primary_key`.
  The journey step is `procedure#materialize-iceberg-table`. The engine does not
  call enable. Omit `backfill_from` and do not send `identifier_fields`.
  Applying a shape writes `schema.key`. A semantic binding does not. The writer
  concatenates those source values with `|` into `lx__id`. Do not pick `lx__id`
  as a key field, and do not default the key to it. Omit `backfill_from` to skip
  history replay. The partition field must be on the schema. Empty or “unknown
  table” warehouse errors usually mean Iceberg was never enabled.
- **Iceberg rebuild** — requires that enablement and the same storage identity.
  Iceberg stores are Amazon S3 Tables (compaction and snapshot cleanup are
  AWS-managed; there is no compact tool). If queries fail with missing data or a
  stub schema, use `loxtep_observe` → `get_iceberg_health`, then
  `rebuild_iceberg_table` with `confirm: true` and `backfill_from`. Health
  passes the catalog body through. `not_enabled` means Iceberg is off — enable
  it first; do not rebuild (rebuild POST returns HTTP 400). `unknown` means
  metadata or provision identity could not be resolved (including enabled
  without `table_bucket_arn`); it is a warning, not a rebuild signal. Do not
  rebuild on `not_enabled` or `unknown`. `managed_s3_tables` is a provisioned
  Amazon S3 Tables product (AWS-managed maintenance). Warehouse `empty_ok`
  (`No Iceberg snapshots yet`) is only a complete empty `metadata/` LIST, not
  these catalog states. Rebuild permanently deletes the table and recreates it
  from the queue. Always `dry_run: true` first. Never rebuild without explicit
  confirmation. Do not treat rebuild or backfill status as a lock — a second
  request while one is running is accepted. An unexpected upstream 409 is an
  error, not "already running".

<!-- BEGIN loxtep skill-scope (skill-package-v1) -->

## Agent-Scope Skill scope (`.loxtep/skills/loxtep-analytics.yaml`)

Resource scope and operation permissions for this Agent-Scope Skill, conformant
with the [`skill-package-v1`](https://loxtep.io/schemas/skill-package-v1.json)
schema. Any resource type or operation not listed is **denied (fail-closed)**.
Identifier lists are empty placeholders — fill them with the specific resources
in your workspace. This declaration does not change the hosted MCP config
(`mcp.loxtep.io`).

```yaml
# .loxtep/skills/loxtep-analytics.yaml
# Conforms to https://loxtep.io/schemas/skill-package-v1.json
# Scoped to ONLY the identifiers listed; least-privilege per operation. Fail-closed.
name: loxtep-analytics
description: Read-only SQL analytics over data products.
scope:
  data_products: []
  connectors: []
  workflows: []
  domains: []
  queues: []
permissions:
  data_products: [read]
```

<!-- END loxtep skill-scope (skill-package-v1) -->

## Skill attribution (required)

MCP tool calls need a resolvable skill name. Prefer
`_metadata: { "skill_name": "loxtep-analytics" }`; otherwise the server infers
from the operation map or `X-Skill-Name`. Unresolvable calls are denied
(`MISSING_SKILL_ATTRIBUTION`). The skill name also drives scope checks.

## Auth

`loxtep-auth` / login.

## References

- [User story catalog](../../../docs/skills-user-stories.md)
