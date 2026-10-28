---
name: loxtep-analytics
description:
  Use when the user wants SQL analytics over the mesh, SQL queries, list tables,
  table schema, execute query, poll query results, or row-embedding semantic
  search. Customer MCP loxtep_query. User story S6. See
  docs/skills-user-stories.md.
metadata:
  documentation: https://github.com/LoxtepInc/loxtep-plugins-skills/blob/main/codex/skills/loxtep-analytics/SKILL.md
---

<!-- GENERATED FILE -- single source: loxtep/scripts/plugins-skills-generate-skills.mjs. From the loxtep root run `PLUGINS_SKILLS_ROOT=<plugins-skills> node scripts/sync-skills-to-plugins-skills.mjs` (or that generator with PLUGINS_SKILLS_ROOT set). Do not edit client copies; do not run sibling scripts/generate-skills.mjs. -->

# Analytics and SQL (Customer MCP)

**Story S6:** Explore curated mesh data with **SQL** — discover tables, inspect
schema, run queries, fetch results. Row-embedding **semantic search** is the
same tool (`loxtep_query` → `semantic_search`) when the product has Iceberg row
embeddings enabled.

## When to use

- “Run **SQL**”, “**list tables**”, “**schema** for table”, “**execute_query**”,
  “get **query results**”, “**semantic_search**”, “find similar rows”, “row
  embeddings”

## Prerequisites

- MCP auth. Operations are **organization**-scoped in MCP map.

## Happy-path flow

1. `loxtep_query` → `list_tables`.
2. `get_table_schema` for chosen table(s).
3. `execute_query` with the required `query` parameter (the SQL text). The
   required parameter is named `query`, not `sql`.
4. `get_query_results` if execution is asynchronous or paginated.
5. Optional: `semantic_search` when the product has row embeddings enabled
   (`data_product_id` + `query`; optional `top_k`, `filters`).

## MCP mapping

| Step     | Tool           | `operation`         | Scope        |
| -------- | -------------- | ------------------- | ------------ |
| List     | `loxtep_query` | `list_tables`       | organization |
| Schema   | `loxtep_query` | `get_table_schema`  | organization |
| Run      | `loxtep_query` | `execute_query`     | organization |
| Results  | `loxtep_query` | `get_query_results` | organization |
| Semantic | `loxtep_query` | `semantic_search`   | organization |

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

Rebuild guidance in Pitfalls applies only when `recovery.action` is
`rebuild_iceberg`, or `iceberg_health_status` is a rebuild status (`empty_stub`,
`schema_mismatch`, `partition_mismatch`, `no_data_files`). Then use
`loxtep_observe` → `get_iceberg_health`, then `rebuild_iceberg_table` with
`dry_run: true` first; never rebuild without explicit confirmation.

`iceberg_health_status` / `iceberg_health_reason` being set is not itself a
rebuild signal. Treat these warehouse statuses as follows (none of them include
recovery, and none are a rebuild signal):

- `retryable` — transient metadata load (5xx / 408 / 429 / network). Retry the
  query. Do not rebuild.
- `unauthorized` — 401/403 on the S3 Tables metadata GET or `iceberg_scan`
  (`IcebergMetadataLoadAuthError`). The table itself was not checked. Do not
  rebuild.
- `metadata_config_error` — no transport / other 4xx / unclassified. Fix the
  proxy URL or metadata location. Do not rebuild.
- `unknown` — health could not identify or assess the Iceberg table. Do not
  rebuild on this status alone.
- `unreadable` without `recovery.action === 'rebuild_iceberg'` — not a rebuild
  signal. Do not rebuild.

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
(`{ action: 'rebuild_iceberg', data_product_id }` — the rebuild signal, not
`iceberg_health_status` alone), `iceberg_health_status`,
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

## Row embeddings and `semantic_search`

Opt-in per data product. Iceberg must already be enabled. Configure
`metadata.storage_indexing_preferences.row_embeddings` on
`PUT /dataproducts/dataproducts/{data_product_id}`:

- `fields` — existing string-typed, non-PII schema fields (required, min 1)
- `dimensions` — `256` | `512` | `1024` (default `256`)
- `mode` — `live` | `batch` | `hybrid` (default `hybrid`)
- `null` clears / disables. Omitted leaves the pref unchanged.

The Iceberg table stores JSON-string columns `lx__embedding` and
`lx__embedding_hash`. Default warehouse views `SELECT * EXCLUDE` those columns.
Search embeds the query with Bedrock Titan V2 at the product's dimensions, then
DuckDB `from_json` + `array_cosine_similarity` over a direct `iceberg_scan` (so
the hidden columns are visible). There is no SDK method and no CLI command
(`sdk-mcp-parity.json` marks `semantic_search` `mcp_only`).

Refused:

- Iceberg off → `409` `iceberg_required` / “semantic search requires an
  Iceberg-backed data product”
- Prefs absent → `409` `embeddings_disabled`
- `organizations.attributes.privacy.no_records_to_models` on → `409`
  `privacy_blocked`
- PII / missing / non-string `fields` → `400` `invalid_fields`

MCP `loxtep_query` → `semantic_search` proxies
`POST /dataproducts/dataproducts/{data_product_id}/semantic-search`. Permission:
`data_products:read` (REST authorizer also accepts `analytics:execute`).

| Field             | Required | Notes                                                              |
| ----------------- | -------- | ------------------------------------------------------------------ |
| `data_product_id` | yes      | UUID                                                               |
| `query`           | yes      | Non-empty. REST max 8000 characters.                               |
| `top_k`           | no       | Integer 1–100. REST default `10`.                                  |
| `filters`         | no       | Equality only (`col = value`). Values: string, number, or boolean. |

Success `data`:

```json
{
  "items": [{ "order_id": "…", "score": 0.87 }],
  "coverage": {
    "embedding_rows_embedded": 120,
    "embedding_rows_total": 200
  }
}
```

`items` are table rows plus `score`. `get_iceberg_health` may also return
`embedding_rows_total`, `embedding_rows_embedded`, and `embedding_job`.

**Known issue:** Empty `coverage` or a `partial` warehouse result can look like
full success. The handler logs a warning and still returns `success: true` with
empty coverage when the coverage query fails, and a `partial` warehouse result
returns plain success with no flag. See issue
[3325](https://github.com/LoxtepInc/loxtep/issues/3325).

**Known issue:** Frontend types and defaults differ from this backend shape
(`{ items, coverage }`, REST `top_k` default 10). See issue
[3324](https://github.com/LoxtepInc/loxtep/issues/3324).

**Known issue:** `semantic_search` fails with a knex
`Undefined binding data_product_id` error on some products. See issue
[3322](https://github.com/LoxtepInc/loxtep/issues/3322).

Example (MCP). **Unverified** as a live happy path (see issue
[3322](https://github.com/LoxtepInc/loxtep/issues/3322)). Do not treat the
following as a live transcript.

```json
{
  "operation": "semantic_search",
  "data_product_id": "2dbc4415-e3a6-427c-99fe-b3a5234ff175",
  "query": "late west-coast shipments",
  "top_k": 10,
  "filters": { "status": "open" }
}
```

## Pitfalls

- **Partial `execute_query` results** — `success: true` can still mean
  `data.status: "partial"`. Honor `sampled` even when `status` is `completed`.
  See **Reading `execute_query` results**.
- **S3 Tables metadata load failure is a failed query** — managed reads use
  `GET .../iceberg/metadata-location`, then that `metadata.json`. There is no
  `metadata/` LIST and no `?batch-metadata=true`. Server execute and MCP
  `execute_query` put the same text in `error` and in the health reason:
  `S3 Tables metadata GET failed: HTTP N for <location>` (or `via Observe`), or
  `S3 Tables metadata JSON is malformed at <location> (HTTP N)`. `data.status`
  is `failed`, not `completed` and not the file-cap `partial`. Do not present
  rows or counts as the current table. Rebuild only when `recovery.action` is
  `rebuild_iceberg` (scan recovery: missing or corrupt metadata). `retryable`,
  `unauthorized`, and `metadata_config_error` are not rebuild signals. A LeoS3
  product on the platform or browser warehouse fails with
  `LeoS3 Iceberg tables are readable only inside the instance runtime`. Studio
  Catalog SQL with no metadata location reports
  `Failed to register Iceberg view(s): <table>: LeoS3 Iceberg tables are readable only inside the instance runtime; run this query on the server warehouse`.
- **Timeout vs memory-limit** — a statement timeout and a DuckDB
  `memory limit exceeded` both come back as failed (`error`:
  `Query execution failed`). Distinguish them from `message`: timeout text is
  like `Query exceeded timeout of 60 seconds` (default 60s); OOM text contains
  `memory limit exceeded`. This tool does **not** return HTTP `error_code`
  values (`query_timeout` / `query_error` / `query_cancelled`). Those are on
  `POST /dataproducts/warehouse/execute`. Do not describe an OOM as a timeout.
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
- **`semantic_search` needs row embeddings** — SQL `execute_query` does not
  imply vectors. Enable Iceberg, then set `row_embeddings`. Hidden
  `lx__embedding*` columns are not in default views; do not `SELECT` them
  expecting search. `filters` are equality only.
- **Iceberg rebuild** — requires that enablement and the same storage identity.
  Iceberg stores are Amazon S3 Tables (compaction and snapshot cleanup are
  AWS-managed; there is no compact tool). If queries fail with missing data or a
  stub schema, use `loxtep_observe` → `get_iceberg_health`, then
  `rebuild_iceberg_table` with `confirm: true` and `backfill_from` as a `z/`
  queue eid (`z/` = start of the queue; a longer `z/…` eid starts there).
  Aliases (`start`, `start_of_queue`, `checkpoint`, `now`, `all`, durations) are
  refused. The hosted `rebuild_iceberg_table` advertisement uses that same `z/`
  schema. Enable windows stay on enable. That `z/` rule is rebuild-only — enable
  still uses `now`/`1h`/`6h`/`1d`/`7d`/`30d`/`all`, or omits `backfill_from` to
  skip history. Health passes the catalog body through. `not_enabled` means
  Iceberg is off — enable it first; do not rebuild (rebuild POST returns HTTP
  400). `unknown` means metadata or provision identity could not be resolved
  (including enabled without S3 Tables identity — `table_bucket_arn`, or stamped
  `s3_tables_namespace` + `s3_tables_table`); it is a warning, not a rebuild
  signal. Do not rebuild on `not_enabled` or `unknown`. Warehouse execute
  `retryable`, `unauthorized`, `metadata_config_error`, and `unreadable` without
  `recovery.action === 'rebuild_iceberg'` are also not rebuild signals — see
  **Reading `execute_query` results**. `managed_s3_tables` is a provisioned
  Amazon S3 Tables product (AWS-managed maintenance). Warehouse `empty_ok`
  (`No Iceberg snapshots yet`) is `metadata_load: not_found` (classified missing
  metadata JSON at a resolved location), not these catalog states. Rebuild
  permanently deletes the table and recreates it from the queue. Always
  `dry_run: true` first. Never rebuild without explicit confirmation. Do not
  treat rebuild or backfill status as a lock — a second request while one is
  running is accepted. An unexpected upstream 409 is an error, not "already
  running".

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
