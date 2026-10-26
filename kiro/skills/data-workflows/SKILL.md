<!-- GENERATED FILE -- edit skills/<slug>/SKILL.md (or rule.mdc.src.md) and run `node scripts/generate-skills.mjs` -- do not edit directly -->
---
name: data-workflows
description:
  Use when the user wants to build, deploy, or operate data workflows and data
  products. Covers the Connect step (wiring sources into workflows) and Organize
  step (deploying and verifying). Always use save_workflow_bundle for new flows.
trigger: |
  TRIGGER when: User asks about creating/listing/updating data products, workflows,
  ingestion pipelines, or delivery workflows in Loxtep. Patterns: "create data product",
  "build workflow", "ingest data", "setup ingestion", "unify data",
  "delivery workflow", "target connection", "webhook destination". Always invoke before making direct
  loxtep_build MCP calls. Use save_workflow_bundle for new
  flows. Embed data-products/{id}.json in the bundle — do not call create_data_product.
metadata:
  documentation: https://github.com/LoxtepInc/loxtep-plugins-skills/blob/main/kiro/skills/data-workflows/SKILL.md
---

# Data mesh studio (Customer MCP)

> **Customer install surface:** shipped via
> [loxtep-plugins-skills](https://github.com/LoxtepInc/loxtep-plugins-skills)
> (`<client>/skills/data-workflows/`). Cross-tool authoring contract:
> [agent-workflow-authoring.md](https://github.com/LoxtepInc/loxtep-plugins-skills/blob/main/docs/agent-workflow-authoring.md).

End-to-end playbooks for **projects**, **workflow graphs**, **connections**
(**Triggers** at ingest head, **Targets** at delivery tail), **data products**,
and **delivery workflows** (`workflow_type: "delivery"`), plus **session**
context. Pair with **`connect-external-system`** for SaaS/API ingest (Shopify,
etc.) or **SDK connector** for programmatic ingestion, and
**`loxtep-workspace`** for runtime provisioning.

## Methodology (CRITICAL — two surfaces, one model)

| Surface              | Happy path                                                                                                  |
| -------------------- | ----------------------------------------------------------------------------------------------------------- |
| **CLI / code-first** | `loxtep ingest create` → `transform create` → `delivery create` → `lint` → `push` → `deploy`                |
| **MCP (primitives)** | `get_entity_schemas` → compose `files` → `save_workflow_bundle` (`dry_run: true` first) → `deploy_workflow` |

Do **not** teach `create_delivery` / `list_deliveries` as the happy path — those
hit the legacy consumptions table. Prefer a **Target** connection
(`connections/{id}.json` + `connector_id`) on a delivery workflow bundle.

### Trigger vs Target

| Role        | Where                              | Bundle entity                               |
| ----------- | ---------------------------------- | ------------------------------------------- |
| **Trigger** | Connector at the **ingest head**   | `connections/{id}.json` with `connector_id` |
| **Target**  | Connector at the **delivery tail** | `connections/{id}.json` with `connector_id` |

`workflow_type` for outbound flows is **`delivery`** — never `consumption`.

## Agent authoring decision tree (CRITICAL — read first)

```
New flow / ingestion setup / "connect and ingest"?
  → get_entity_schemas (pattern: ingestion|enrichment|delivery)
  → Compose full files map (workflow.json + connections/ + transformations/ + data-products/)
  → save_workflow_bundle dry_run=true → fix errors → save_workflow_bundle dry_run=false
  → NEVER: patch_workflow_graph node-by-node for new flows

User editing open flow in Studio UI (tiny incremental change)?
  → patch_workflow_graph only

After connect-external-system (Connect)?
  → Require a passing `test_connector` and **user authorization** before ingest.
    `test_connector` is not ingest. `capture_samples` retrieves source rows.
  → list_connector_entities after Test: rest-api, file-transfer, mongodb-source,
    postgres (`postgresql` / `postgres-source`), mysql-source (`mysql`).
  → rest-api / file-transfer: apply_template (workflow / connector-ingestion) →
    set entities + schedule + how → save_workflow_bundle → deploy_workflow.
    Or `confirm_connector_entity_selection` (PKO fan-out per entity).
    Assessor fires the trigger. Do not add a scheduler. Do not pull without a workflow.
  → mongodb-source / postgres: `confirm_connector_entity_selection` (PKO fan-out).
    Postgres: prefer this over the database-cdc template.
  → mysql-source / mysql: confirm is not a MySQL path — start at
    get_entity_schemas, compose bundle
  → Other types: connector_id + samples — start at get_entity_schemas, compose bundle
  → Put the connector on a Trigger connection at the ingest head
  → Private-network connections keep `network_binding` on the org connector;
    deploy registers them on `connectors-private-512` (**`loxtep-deployments`**)

User asks to "create a source/consumer data product"?
  → Design schema first (data-product-modeling) — NO create_data_product MCP call
  → Embed data-products/{id}.json in save_workflow_bundle files → deploy_workflow
  → Verify get_data_product shows workflow_id + deployment_bindings after deploy

User asks to deliver / push data out?
  → Delivery workflow: workflow_type "delivery" + Target connection at the tail
  → Prefer save_workflow_bundle (not create_delivery / list_deliveries)

Starting any new flow?
  → create_project (or list_projects + reuse) FIRST — all workflow ops need project_id
  → Write workflows/{workflow_id}/... JSON files to disk in the repo
  → THEN save_workflow_bundle (reads files map built from local paths — not inline-only)
  → If GitHub-attached: local repo is source of truth; sync local → Loxtep project
```

**Data products are created by workflow design + deploy — not by
`create_data_product`.** Standalone MCP `create_data_product` produces orphan
design-time records without `workflow_id`, queues, or `deployment_bindings`.
Correct DPs carry `managed_by: "design-time"` and
`deployed_by: "workflow-deployment"` after deploy.

**Connection nodes** reference org **connectors** via `connector_id` inside the
bundle (`connections/{connection_id}.json`) — Trigger at ingest head, Target at
delivery tail.

## Project and local bundle files (CRITICAL — before Organize)

**Every flow starts with a Loxtep project.** Workflows, connections, and data
products are **project-scoped** — you need `project_id` on all workflow MCP
calls.

| Step                  | Action                                                                                                                                       |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| 0a                    | `list_projects` / `get_project` — reuse an existing project when appropriate                                                                 |
| 0b                    | `create_project` when none exists — `{ "operation": "create_project", "name": "..." }`                                                       |
| 0c (optional)         | **Attach GitHub** — `update_project` with `github_*` fields (or `github_action` on `create_project`) so the Loxtep project links to the repo |
| 0d (code-first repos) | CLI bootstrap: `loxtep init` → `loxtep attach` — see **`loxtep-sdk`**                                                                        |

### Write bundles to disk — do not author inline-only

`save_workflow_bundle` persists to Loxtep's org workspace store (S3 under
`organizations/.../workflows/{workflow_id}/`). That is **server-side state** —
not a substitute for files in the user's repo.

| Correct                                                                                                               | Wrong                                                                                         |
| --------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Write JSON under `workflows/{workflow_id}/` locally → build the `files` map from those paths → `save_workflow_bundle` | Compose the entire `files` map only inside the MCP tool-call argument with **no local files** |

**Local layout** (repo root or code-first project root):

```
workflows/{workflow_id}/
  workflow.json
  connections/{connection_id}.json
  transformations/{transformation_id}.json
  validations/{validation_id}.json
  data-products/{data_product_id}.json
```

When the project is **GitHub-attached**, the **repo is source of truth**: edit
locally, commit, then sync to the Loxtep project (`save_workflow_bundle` and/or
`loxtep` CLI — not API-only authoring). GitHub sync events use the
`workflows-github-sync-requested` queue (see **`loxtep-queue-tracing`**).

**Agent sequence:** project → write local files → dry-run save → fix → persist →
deploy.

## When to use

- **S0:** Confirm user and org (`get_current_user`, `get_current_organization`).
- **S2:** Create an **omnichannel** or unified **data product** across multiple
  sources in a project.
- **S3:** Author a **delivery workflow** (`workflow_type: "delivery"`) with a
  **`data-product-trigger` head**, a **Target** connection at the tail, and a
  **delivery grant** (Flow D) — not `create_delivery`.
- User asks for **projects**, **flows**, **templates**, **data products**,
  **Triggers** / **Targets**, or composing/saving workflow bundles.
- **SDK / programmatic ingestion:** If the user wants to write events from their
  own code (not a SaaS connector), use the **`connect-external-system`** skill's
  **SDK Connector flow** (`connector_type: "sdk"`) to create the connector, then
  **`loxtep-sdk`** for SDK client usage. This Agent-Scope Skill handles the
  workflow graph and data products that receive those events.

## Prerequisites

- MCP login (`loxtep-auth` if JWT errors). For **permissions / 403** questions,
  use the **`loxtep-mcp-session`** Agent-Scope Skill (`get_current_user` →
  `permissions`).
- **Project-scoped** calls require `project_id` in the same payload as
  `operation`.
- **Org-scoped** data products: use `data_product_id` as required by each
  operation.

## How MCP calls work

1. **Tool name** — one of `loxtep_session`, `loxtep_connect`,
   `loxtep_workspace`, `loxtep_build` (primary for this skill), or
   `loxtep_observe` for deployment status.
2. **`operation`** — flat tool id (e.g. `list_workflows`).
3. **Other fields** — API args at top level next to `operation`.

## Happy-path flows

### Flow A — Session before work (S0)

1. `loxtep_session` → `{ "operation": "get_current_user" }`
2. `loxtep_session` → `{ "operation": "get_current_organization" }`

### Flow B — Project bootstrap (mandatory before any flow)

**Do this before connect, bundle authoring, or deploy.** Skip only when
`project_id` is already known and the project exists.

1. `loxtep_session` → `get_current_user` (confirm RBAC + org).
2. `loxtep_workspace` → `list_projects` — reuse when the user names an existing
   mesh project. Rows include `github_state` / `next_action` (hosted MCP cannot
   see local disk — `local_present` stays false).
3. If none exists: `create_project` with `name` (optional `description`,
   `domain_id`).
4. **Layer status before deep work:** `get_project_workspace_status` (or CLI
   `loxtep projects list` + `loxtep status`). If `next_action` is `clone` /
   `link`, run `plan_project_materialization` / plan `cli_commands` on the agent
   FS — hosted MCP never writes local paths.
5. **Optional — GitHub attach:** `update_project` with `project_id` and
   `github_*` fields (or pass `github_action` on `create_project`) to link the
   Loxtep project to the customer's GitHub repo. Required for repo ↔ platform
   sync workflows.
6. **Code-first repos:** run `loxtep init` and `loxtep attach` in the repo root
   (see **`loxtep-sdk`**) instead of hand-rolling paths when the CLI is
   available. After attach: **`projects list` + `status`**, then clone/link
   before ingest/deploy.
7. Record `project_id` — every subsequent workflow MCP call in this session uses
   it.

Optional template bootstrap (after project exists):

1. `loxtep_connect` → `list_templates` / `get_template`.
2. `apply_template` with `project_id`, `template_type`, `template_slug` — writes
   a starter bundle (still materialize/sync locally when GitHub-attached). After
   rest-api or file-transfer Test, use `template_type: workflow` and
   `template_slug: connector-ingestion`, then set entities / schedule / how,
   `save_workflow_bundle`, and `deploy_workflow`. Assessor decides fire time.

### Flow B2 — GitHub-attached repo (local → Loxtep sync)

When the project is linked to GitHub (step 4 above):

1. **Author locally** under `workflows/{workflow_id}/` — never inline-only MCP
   payloads.
2. **Commit** to Git when the user expects version control.
3. **Sync to Loxtep** — `loxtep lint` then
   `loxtep push --workflow-id <workflow_id>` (or `save_workflow_bundle` built
   from those files, dry-run first). This uploads local state to the org
   workspace store.
4. **Scoped deploy** — `deploy_workflow` for that `workflow_id` only. See
   **Display names** below. Do not use `deploy_project` or `loxtep deploy` for a
   one-workflow change.

The platform store and the repo are two copies; **GitHub-attached projects
expect the repo to lead** and sync pushes local → Loxtep.

### Display names (GitHub-backed projects)

The checked-in workflow package is the source of truth for every deployable
display name. Change a label only by editing those files, then lint, push,
scoped deploy, and read the names back.

| Label        | Declared in the package                                                                                                                                                                                                                                                                  |
| ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Workflow     | `name` on `workflow.json`                                                                                                                                                                                                                                                                |
| Bot          | `name` on `connections/{id}.json`, `transformations/{id}.json`, or `validations/{id}.json`                                                                                                                                                                                               |
| Product      | `name` on `data-products/{id}.json`                                                                                                                                                                                                                                                      |
| Output queue | `output_queue_display_name` on the node that owns the queue (`connections`, `transformations`, `validations`, `quality-rules`, `agents`, `approvals`). A data product may set it for its upstream writer's output queue when that writer leaves the field unset. The writer's value wins |
| Error queue  | `error_queue_display_name` on the same owning node. Approvals use it for the rejected queue. Agents keep `error_queue_name` as the queue id                                                                                                                                              |

Required path:

1. Edit the package files.
2. `loxtep lint --workflow <workflow_id>`
3. `loxtep push --workflow-id <workflow_id>`
4. `loxtep_build` → `deploy_workflow` with that `project_id`, `workflow_id`, and
   `instance_id`. `loxtep deploy` and `deploy_project` redeploy every workflow
   in the project. Do not use them to rename one flow.
5. Read back design-time names from the files (`get_workflow`,
   `get_data_product`) and runtime ids from `get_runtime_mapping` (`bot_ids`,
   `queue_ids`, `deployment_bindings`). A runtime label that is not in the
   package is not done.

Do not rename with `update_workflow`, `update_data_product` (`name`), or Observe
event-settings save. Those leave the runtime label out of source control.

When `output_queue_display_name` or `error_queue_display_name` is set, scoped
deploy writes that label onto the existing queue id (`overwrite_name`) and
leaves bindings, checkpoints, and bot pause state unchanged. When the field is
unset, deploy keeps the generated label (`{entity name} (output)`,
`(transformed)`, `(ingested)`, `(validated)`, `(approved)`, or `(error)`) and
does not replace a label already stored.

A data-product-trigger entry does not register a relay bot. A LeoCron row left
from an earlier relay is not part of the workflow. Scoped deploy does not rename
or remove it.

If the running platform rejects these fields or a scoped deploy does not apply a
declared label, stop and report that gap. Do not rename the queue through an
API.

**Regression.** After a scoped redeploy, the declared bot, product, and queue
labels are still the names in the package, queue ids and `deployment_bindings`
are unchanged, checkpoints are unchanged, and no other workflow has a new
deployment or an unpaused bot. `list_deployments` filtered to other
`workflow_id`s must not show a deployment started by this change. The unit check
is `scoped redeploy preserves declared labels` in
`platform-backend/_core/src/observe/registration-metadata.test.ts`.

### Flow C — Omnichannel data product (S2)

1. Ensure **project** exists (**Flow B**); ensure **connectors** exist per
   channel (see **`connect-external-system`**).
2. **Write** workflow bundle files locally under `workflows/{workflow_id}/`.
3. **`get_entity_schemas`** with `pattern: "ingestion"` (or enrichment/export as
   needed).
4. Compose / validate the **`files`** map from on-disk JSON and
   **`save_workflow_bundle`** (`dry_run: true` first, then persist).
5. `get_data_product` / `get_lexicon` to verify; `update_data_product` as
   needed.

### Flow D — Delivery workflow with Target connection (S3)

Outbound flows use **`workflow_type: "delivery"`** (never `consumption`). Prefer
a **Target** connection in `save_workflow_bundle` — do **not** call
`create_delivery` / `list_deliveries` (legacy consumptions-table path).

**CLI methodology (code-first):**

```bash
loxtep ingest create …        # Trigger at ingest head
loxtep transform create …     # optional reshape
loxtep delivery create …      # Target at delivery tail (writes local package)
loxtep lint
loxtep push                   # sync local → workspace (or save_workflow_bundle)
loxtep deploy
```

**MCP methodology (primitives):**

1. Ensure source data product exists and is deployed (`get_data_product` /
   `list_data_products`).
2. Ensure destination **connector** exists (`connect-external-system` →
   `connector_id`).
3. `get_entity_schemas` with `pattern: "delivery"`.
4. Compose delivery bundle locally under `workflows/{workflow_id}/`:
   - `workflow.json` with `"workflow_type": "delivery"`
   - Head: a **`data-product-trigger`** connection that references the published
     product (`source_data_product_id` / name). Do **not** put a `data-products`
     entity at the head — that would take ownership of the publisher's product
     node.
   - Tail: **Target** `connections/{id}.json` with `connector_id`,
     `connector_mode: "outbound"`, and write policy on **`delivery_config`**
     (`table`, `write_mode`, upsert `primary_key`, `batch_size` /
     `insert_batch_size`, `conflict_update`). Auth/transport stay on the org
     connector — do **not** put write-policy keys under `configuration`.
   - Optional transforms between head and Target. When present, the Target’s
     `upstream_entity_id` / `upstream_entity_type` must point at the last
     transform (not the trigger). Deploy registers source connections, then
     mid-graph producers by upstream order, then the Target (and any other
     consumer connection) reading that producer’s output queue. Delivery grant
     embedding walks that chain back to the trigger’s `source_data_product_id` —
     do not expect the transform id itself to be the grant key.
5. `save_workflow_bundle` (`dry_run: true` → fix → persist).
6. **Delivery grants (required for outbound writers):** declare
   `grants/{grant_id}.json` (or `project_files` / `save_delivery_grant`) with
   `data_product_id`, consumer (`party_subject_type` + party id — e.g. domain),
   `access_method` (e.g. `export`), and destination `connection_id`. Save
   materializes into `data_product_subscribers`. Prefer MCP
   `list_delivery_grants` / `get_delivery_grant` / `save_delivery_grant` /
   `update_delivery_grant` over direct REST grant calls.
7. `deploy_workflow` (Flow H) — embeds the active grant into outbound Target
   writers (D6). Grant changes need a redeploy to refresh the writer snapshot.

**Copy-paste MCP (`dry_run: true` first).** Paths are relative to
`workflows/{workflow_id}/`. Do not prefix `files` keys with `workflows/{id}/`.
Do not set top-level `role: "Target"`.

```json
{
  "operation": "save_workflow_bundle",
  "project_id": "44444444-4444-4444-8444-444444444444",
  "dry_run": true,
  "files": {
    "workflow.json": {
      "workflow_id": "11111111-1111-4111-8111-111111111111",
      "organization_id": "33333333-3333-4333-8333-333333333333",
      "project_id": "44444444-4444-4444-8444-444444444444",
      "name": "Customer webhook delivery",
      "template_id": "990e8400-e29b-41d4-a716-446655440000",
      "workflow_type": "delivery",
      "domain_id": "55555555-5555-4555-8555-555555555555",
      "status": "active",
      "created_at": "2026-10-26T00:00:00.000Z",
      "updated_at": "2026-10-26T00:00:00.000Z"
    },
    "connections/11111111-1111-4111-8111-111111111201.json": {
      "connection_id": "11111111-1111-4111-8111-111111111201",
      "organization_id": "33333333-3333-4333-8333-333333333333",
      "project_id": "44444444-4444-4444-8444-444444444444",
      "workflow_id": "11111111-1111-4111-8111-111111111111",
      "key": "from-customer-360",
      "name": "From customer_360",
      "type": "data-product-trigger",
      "status": "active",
      "upstream_entity_id": null,
      "configuration": {
        "source_data_product_id": "66666666-6666-4666-8666-666666666666"
      },
      "created_at": "2026-10-26T00:00:00.000Z",
      "updated_at": "2026-10-26T00:00:00.000Z"
    },
    "connections/11111111-1111-4111-8111-111111111202.json": {
      "connection_id": "11111111-1111-4111-8111-111111111202",
      "organization_id": "33333333-3333-4333-8333-333333333333",
      "project_id": "44444444-4444-4444-8444-444444444444",
      "workflow_id": "11111111-1111-4111-8111-111111111111",
      "key": "customer-webhook-target",
      "name": "Customer webhook target",
      "type": "webhook",
      "status": "active",
      "connector_id": "77777777-7777-4777-8777-777777777777",
      "connector_mode": "outbound",
      "upstream_entity_id": "11111111-1111-4111-8111-111111111201",
      "upstream_entity_type": "connections",
      "configuration": {
        "method": "POST",
        "headers": { "X-Source": "loxtep" }
      },
      "delivery_config": {
        "endpoint_url": "https://app.example.com/hooks/customer-update"
      },
      "created_at": "2026-10-26T00:00:00.000Z",
      "updated_at": "2026-10-26T00:00:00.000Z"
    }
  }
}
```

Then grant (`data_products:manage`) and deploy:

```json
{
  "operation": "save_delivery_grant",
  "project_id": "44444444-4444-4444-8444-444444444444",
  "grant_id": "11111111-1111-4111-8111-111111111203",
  "data_product_id": "66666666-6666-4666-8666-666666666666",
  "party_subject_type": "domain",
  "domain_id": "55555555-5555-4555-8555-555555555555",
  "access_method": "webhook",
  "connection_id": "11111111-1111-4111-8111-111111111202",
  "status": "active"
}
```

```json
{
  "operation": "deploy_workflow",
  "project_id": "44444444-4444-4444-8444-444444444444",
  "workflow_id": "11111111-1111-4111-8111-111111111111"
}
```

### Flow F — Enrich/stage from an existing data product (enrichment workflow)

To build a **derived/staging** data product whose source is **another data
product** (e.g. dbt-style staging over an ingested product), the workflow is
`workflow_type: "enrichment"` and its **head node must be a
`data-product-trigger` connection**.

Canonical reference:
[`docs/workflows/cross-workflow-enrichment.md`](../../docs/workflows/cross-workflow-enrichment.md).

**Required configuration (trigger connection only):**

| Field                                  | Required | Notes                                 |
| -------------------------------------- | -------- | ------------------------------------- |
| `type` / `connector_type`              | yes      | `data-product-trigger`                |
| `configuration.source_data_product_id` | yes      | UUID or name of upstream data product |

**Anti-patterns (do not use):**

- **`configuration.source_queue`** — ignored at deploy; validation rejects it.
- **Plain `data-products` head node** — logical only; no runtime queue feeds
  transforms.
- **`sdk` connection as source** — producer only; does not read another
  product's stream.
- **Deploy enrichment before source DP** — bound queue comes from the producing
  workflow's deploy.
- **Inline multi-supplier fan-in inside ingestion** — ingestion allows one tail;
  use Flow I instead.

1. **Deploy the producing (ingestion) workflow first** and confirm the source
   data product has `deployment_bindings.queue_name` (`get_data_product` or
   `get_runtime_mapping` on the ingestion workflow).
2. **`get_entity_schemas`** with `pattern: "enrichment"`.
3. Compose enrichment bundle: `data-product-trigger` connection + transforms +
   sink `data-products` node; wire `upstream_entity_id` chain.
4. **`save_workflow_bundle`** (`dry_run: true` then persist).
5. **Deploy enrichment** (`deploy_workflow`).

The **`data-product-enrichment`** workflow template scaffolds this exact shape:
https://github.com/LoxtepInc/loxtep-project-template
(`templates/workflows/data-product-enrichment/`) (default transform: built-in
`derived_columns`).

**`zip_arrays`** — use when a source (e.g. Open-Meteo) returns parallel arrays
under one object (`daily.time`, `daily.temperature_2m_max`, …) and the product
needs one event per index. Config: `source_path`, `index_field`, optional
`index_as`, `include_fields`, `carry_fields`, and optional `primary_key` (a
non-empty list of unique field names). `source_path` may be dotted
(`hourly.data`); runtime and schema inference both walk that path. Schema
inference refuses instead of inventing `{type:'string'}` columns when the path
is missing or not an object, a carry field is missing, or a listed field is
missing, not an array, or an array without an `items` schema
(`SOURCE_PATH_MISSING`, `SOURCE_PATH_NOT_OBJECT`, `CARRY_FIELD_MISSING`,
`FIELD_MISSING`, `FIELD_NOT_ARRAY`, `SCHEMA_ITEMS_MISSING`). A deployed
transformer whose stored `input_schema` is stale fails on those codes (event
goes to the error path) instead of passing a bogus schema. `primary_key` names
output fields (`carry_fields`, `index_as`, or a zipped array) whose values, in
list order, are joined with `|` into `lx__id` on each emitted event (latitude +
longitude + `obs_date` → `40.71|-74.01|2026-01-01`). Key parts may be any
scalar: string, finite number, boolean or bigint. Objects and arrays are
refused, and so are missing, blank, non-finite and `|`-containing parts. A null
carry field is refused as `CARRY_FIELD_NULL` before key stamping — even when
that field is listed in `primary_key` (not `PRIMARY_KEY_PART_MISSING`). A null
on a zipped array used as a key part is still `PRIMARY_KEY_PART_MISSING`. If an
upstream event already carries `lx__id`, you must declare `primary_key` —
without it the split is refused (`LX_ID_WITHOUT_PRIMARY_KEY`). Carrying or
zipping `lx__id` itself is refused (`LX_ID_CARRIED`). With `primary_key` it also
refuses a listed field that is not an output field, and duplicate stamped keys
across emitted events. An incoming `lx__id` is accepted when it equals the
stamped key. It is refused only when it disagrees. All of those refusals, plus
mismatched lengths, missing/non-array fields, an empty index, null or duplicate
index values, mixed-type index values (`INDEX_MIXED_TYPES`), and a
present-but-null carry field (`CARRY_FIELD_NULL`), go to the error queue — no
silent drop. Preview (`loxtep_build` `preview_transform` and
`POST /workflows/projects/{project_id}/preview/transformation`) returns those
labelled refusals as `transformed_event: null` and
`errors: [{ message, code, field }]` (REST HTTP 200) instead of a generic
failure or 500. `explode_array` cannot zip parallel arrays: it splits one array
field and copies the others whole.

**`explode_array`** — one event per element of a single array field. Set
`operation_config.on_empty` (`drop` | `keep_original` | `error`); it is required
and has no default. Missing or unknown `on_empty` is refused at validation
(`INVALID_CONFIG` from `validateTransformConfig`, `save_workflow_bundle`,
`TransformService.execute`) and at runtime (`ON_EMPTY_REQUIRED` from
`explodeArray`). `drop`: empty array emits no events (`dropped: 1`,
`drop_reason: 'empty_array'`; transformer logs `Transformer dropped events`).
`keep_original`: the source event passes through unchanged. `error`: refused
with `EMPTY_ARRAY` (event goes to the error path). A non-array `field` fails the
event (`INVALID_TYPE`); it does not pass through with `errors[]`.
`preview_transform` (same REST preview route): `drop` on empty →
`transformed_events: []`, `event_count: 0`; `keep_original` → the source event
as the one `transformed_events` item; `error`, `INVALID_TYPE`, and missing
`on_empty` throw (`success: false`; REST 422). `TransformService` wraps those
runtime `ExplodeArrayError` codes as `EXECUTION_ERROR`. Minimal config:

```json
{
  "transform_type": "explode_array",
  "operation_config": { "field": "items", "on_empty": "drop" }
}
```

See `get_entity_schemas` → transformation `transform_type` enum and GET
`/workflows/transforms/types`.

Scenario 2 runbook (transform derivation → queryable sink):
[`docs/runbooks/transform-enrichment-scenario-2.md`](../../docs/runbooks/transform-enrichment-scenario-2.md).

#### Flow F+ — SQL derivation (`query_trigger`, D14)

For **on-demand / scheduled SELECT** over warehouse catalog views (not per-event
transforms, not Store projections):

**Shape:** enrichment workflow with `trigger.query_trigger` (no
`data-product-trigger`, no `sql_materialize` transform — that type was removed).
Deploy registers the instance producer; rows land on the first-hop / sink queue
and follow the normal rstreams → transform-to-iceberg path.

**Unique identifier (refuse the call):** `preview_query_trigger` and
`run_query_trigger` concatenate the source values named by `primary_key` with
`|` into `lx__id` (city + obs_date → `Austin|2024-06-15`). They refuse when any
of those values is missing, empty, `null`, or an object. Do not concatenate
blanks into a fake `lx__id` (`Austin|`). `query_trigger.primary_key` is that
source-field list for the SQL trigger. It does not set the product storage key.

The product storage key is one identity. Fields marked `is_primary_key`,
`schema.key` (that same list, in field order), and the primary entity
`natural_key` (those names joined with commas) name the same fields. Applying a
shape writes `schema.key`. A semantic binding or a contract does not. The
Iceberg writer joins those source values with `|` and stores the row under
`lx__id`. `lx__id` is not a field to pick. When `schema.key` is absent, the
`is_primary_key` flags are the key. A fielded schema with neither fails PUT,
Iceberg enable, sync, and rebuild. A `schema.key` that disagrees with those
flags is rejected. Do not invent a uniqueness column, fill in a missing value,
or coerce an empty date to `1970-01-01` / unix 0.

1. Author an enrichment workflow with
   `trigger.query_trigger: { data_product_id, query: "SELECT city, obs_date, temp_max FROM ...", primary_key: ["city","obs_date"], schedule?: "rate(1 hour)" }`.
   `primary_key` names source values concatenated into `lx__id`. Do not SELECT
   an `id` column as the key. `_eid` is only the queue event id — never the
   business key.
2. Template: https://github.com/LoxtepInc/loxtep-project-template
   (`templates/workflows/sql-query-enrichment/`).
3. Sink is a normal queue-backed data product. Deploy binds the queue only.
   Iceberg is a separate enable: `loxtep_observe` → `enable_iceberg_table` after
   the storage identity is set (`schema.key` / `is_primary_key`). Omit
   `backfill_from` to skip history replay. Do not `POST …/iceberg`. Writers skip
   until config sync succeeds.
4. **`save_workflow_bundle`** → **`deploy_workflow`** (registers query_trigger
   producer, not shared `transformers-*`). Enable Iceberg on each source you
   will scan before running the query.
5. **`preview_query_trigger`** (dry SELECT sample) then **`run_query_trigger`**
   (emit rows to the sink queue) or wait for the cron schedule. Both refuse
   unless every source value that would go into `lx__id` is already a non-empty
   scalar on each row. Both also refuse a warehouse read whose `status` is not
   `completed`: a parquet-fallback **partial** Iceberg read is
   `SQL preview refused a partial Iceberg read` (preview) or
   `Query trigger inspect refused a partial Iceberg read` (run) — the bot is not
   triggered. Other non-completed statuses (failed timeout, DuckDB
   `memory limit exceeded` as `query_error`, cancelled) return
   `SQL preview failed` / `Query trigger inspect failed` with the warehouse
   `error` string as `message`.
6. Verify with **`execute_query`** on the sink data product.

Glossary: **Projection** (entity Store) ≠ **SQL derivation** (`query_trigger`) ≠
**per-event transform** (`filter` / `map` / …).

Runbook:
[`docs/runbooks/sql-materialize-scenario-3.md`](../../docs/runbooks/sql-materialize-scenario-3.md).

### Flow I — Multi-supplier fan-in (one enrich workflow per supplier)

When multiple external suppliers feed a shared consumer data product:

1. **One ingestion workflow per supplier** (connector → … → raw/source DP).
2. **One enrichment workflow per supplier** with its own `data-product-trigger`
   reading that supplier's source DP (`source_data_product_id` only).
3. **Separate projection/merge workflow or consumer DP** for the unified view —
   do not add multiple tails or inline fan-in inside a single ingestion graph.

See
[`docs/workflows/cross-workflow-enrichment.md`](../../docs/workflows/cross-workflow-enrichment.md)
for bound-queue semantics and deploy order.

### Flow E — Compose and save a workflow JSON bundle (CRITICAL — preferred agent path)

Agents **must not** build new flows with sequential `patch_workflow_graph`
calls. The studio is **S3-first composable JSON**: write the full flow, validate
on save.

**Step 1 — Read types:**

```json
{
  "operation": "get_entity_schemas",
  "project_id": "<project_id>",
  "pattern": "ingestion"
}
```

**Step 2 — Write local files, then build `files` map:**

Create JSON on disk under `workflows/{workflow_id}/` (see layout above). Read
those files into the `files` argument — **do not** skip writing to disk.

**Step 3 — Validate then save** (`dry_run: true` first):

```json
{
  "operation": "save_workflow_bundle",
  "project_id": "<project_id>",
  "dry_run": true,
  "files": {
    "workflow.json": {
      "workflow_id": "<uuid>",
      "organization_id": "<org_id>",
      "project_id": "<project_id>",
      "name": "SDK Orders Ingestion",
      "template_id": "990e8400-e29b-41d4-a716-446655440000",
      "workflow_type": "ingestion",
      "domain_id": "<domain_id>",
      "status": "active",
      "configuration": {},
      "metadata": {},
      "created_at": "2026-01-15T00:00:00.000Z",
      "updated_at": "2026-01-15T00:00:00.000Z"
    },
    "connections/<connection_id>.json": {
      "connection_id": "<uuid>",
      "organization_id": "<org_id>",
      "project_id": "<project_id>",
      "workflow_id": "<workflow_uuid>",
      "connector_id": "<connector_uuid>",
      "key": "sdk-input",
      "name": "SDK Input",
      "type": "sdk",
      "status": "active",
      "configuration": { "sdk_type": "nodejs", "event_type": "orders" },
      "created_at": "2026-01-15T00:00:00.000Z",
      "updated_at": "2026-01-15T00:00:00.000Z"
    },
    "data-products/<data_product_id>.json": {
      "data_product_id": "<uuid>",
      "organization_id": "<org_id>",
      "project_id": "<project_id>",
      "workflow_id": "<workflow_uuid>",
      "upstream_entity_id": "<connection_uuid>",
      "upstream_entity_type": "connections",
      "domain_id": "<domain_id>",
      "name": "orders",
      "status": "draft",
      "owner": {},
      "governance": {
        "classification": "internal",
        "pii_fields": [],
        "compliance_requirements": [],
        "tags": []
      },
      "metadata": {},
      "created_at": "2026-01-15T00:00:00.000Z",
      "updated_at": "2026-01-15T00:00:00.000Z"
    }
  }
}
```

**Step 4 — Validate then save:** run with `dry_run: true`; fix
`validation_errors`, `relationship_errors`, or `topology_errors`; then
`dry_run: false`.

**Rules:**

- Pre-assign all UUIDs; wire nodes with **`upstream_entity_id`** (not separate
  connect steps).
- File keys use workflow-scoped paths: `connections/{id}.json`,
  `transformations/{id}.json`, etc.
- **`patch_workflow_graph`** is for **Studio UI incremental edits only**.
- **`apply_template`** remains valid for catalog starter templates (also writes
  a bundle internally).

### Flow H — Deploy before SDK ingestion (CRITICAL for runtime)

Design-time configuration (Flows A–E above) creates the **graph definition**
only. **Queues and bots do not exist until the project is deployed to an
instance.** If the user wants to write events via the SDK, they must deploy
first.

**Deploy via MCP (`loxtep_build` facade):**

| Step | Action                           | Tool               | `operation`           | Key args                                                     |
| ---- | -------------------------------- | ------------------ | --------------------- | ------------------------------------------------------------ |
| 1    | Ensure instance exists           | `loxtep_workspace` | `list_instances`      | —                                                            |
| 2a   | Deploy full project              | `loxtep_build`     | `deploy_project`      | `project_id`, `instance_id`                                  |
| 2b   | Deploy single workflow           | `loxtep_build`     | `deploy_workflow`     | `project_id`, `workflow_id`, `instance_id`                   |
| 3    | Poll status                      | `loxtep_observe`   | `get_deployment`      | `deployment_id` (from step 2)                                |
| 4    | Resolve queues                   | `loxtep_build`     | `get_runtime_mapping` | `workflow_id`, `project_id`                                  |
| 5    | Archive (decommission) when done | `loxtep_build`     | `archive_workflow`    | `project_id`, `workflow_id`, optional `instance_id`, `force` |

**Choosing `deploy_project` vs `deploy_workflow`:**

| Use case                          | Operation         | Why                                                                                                                      |
| --------------------------------- | ----------------- | ------------------------------------------------------------------------------------------------------------------------ |
| First deploy / production release | `deploy_project`  | Snapshots entire workspace (all workflows, connections, schemas) and deploys atomically. Creates a version for rollback. |
| Iterating on a single workflow    | `deploy_workflow` | Faster — targets one workflow without snapshotting the full project. Ideal during development.                           |
| After changing multiple workflows | `deploy_project`  | Ensures all changes deploy together with a consistent snapshot.                                                          |
| Redeploying after a graph change  | `deploy_workflow` | Quick redeploy of just the affected workflow.                                                                            |

**Example — deploy_project (full project):**

```json
{
  "operation": "deploy_project",
  "project_id": "<project_id>",
  "instance_id": "<instance_id>",
  "force_redeploy": false
}
```

**Example — deploy_workflow (single workflow):**

```json
{
  "operation": "deploy_workflow",
  "project_id": "<project_id>",
  "workflow_id": "<workflow_id>",
  "instance_id": "<instance_id>",
  "force_redeploy": false,
  "skip_validation": false
}
```

**`deploy_workflow` parameters:**

- `project_id` (required) — UUID of the project containing the workflow.
- `workflow_id` (required) — UUID of the specific workflow to deploy.
- `instance_id` (required) — UUID of the target runtime instance.
- `force_redeploy` (optional, default `false`) — Override an existing
  in-progress deployment for this workflow.
- `skip_validation` (optional, default `false`) — Skip code bundle validation
  (use during development only).

**What deployment does:**

1. Creates a **microservice identifier** (namespace):
   `{instance_id_8}-{project_id_8}-{workflow_id_8}` (first 8 chars of each UUID,
   hyphens stripped)
2. For each connection/transformation/data product in the graph, derives a
   **container_id**: `{prefix}-{entity_uuid_8}` (prefixes: `conn`, `xfm`, `val`,
   `dp`, `exp`, `pipe`)
3. Registers **bots**: `{msId}-bot-{container_id}-{role}` (e.g.
   `a1b2c3d4-e5f6g7h8-i9j0k1l2-bot-conn-e5f6g7h8-handler`)
4. Registers **queues**: `{msId}-queue-{container_id}-{direction}` where
   direction = `in`|`out`|`err`
5. Stores a **`runtime_mapping`** on the deployment record (containers →
   entity_id, bot_ids, queue_ids)

**Versioning behavior:**

- `deploy_project` — When `version_id` is omitted (default via MCP),
  automatically creates a project snapshot before deploying. This snapshot is
  immutable and can be used for rollback via `restore_version`. Each deployment
  also creates a `deployment_version` record tracking validation, approval, and
  deployment history per workflow.
- `deploy_workflow` — Creates a `deployment_version` record for the targeted
  workflow (version_number auto-increments per workflow+instance). Does **not**
  create a full project snapshot — use `create_snapshot` manually if you need a
  restore point.

**After deployment**, use the SDK to write events — **not** HTTP directly. The
agent must resolve the runtime configuration so the SDK client knows which bot
and queue to target:

1. `loxtep_build` → `get_runtime_mapping` with `workflow_id` + `project_id`
2. From the response, identify the **connection entity's container** (match by
   `entity_id`)
3. Extract the `bot_ids[0]` (the deployed bot) and `queue_ids` (input queue) for
   that container
4. Configure the `@loxtep/sdk` client with `instance_id`, `bot_id`, and the
   resolved queue — then write events via the SDK's stream bus

**Recommended agent sequence for SDK ingestion:**

1. Complete Flows B/C/E (project + workflow + graph with connection + data
   product)
2. Ensure user has an instance (`loxtep_workspace` → `list_instances`)
3. Deploy:
   - **Quick iteration:** `loxtep_build` → `deploy_workflow` with `project_id` +
     `workflow_id` + `instance_id`
   - **Production release:** `loxtep_build` → `deploy_project` with
     `project_id` + `instance_id`
4. Poll `get_deployment` until status = `deployed`
5. `loxtep_build` → `get_runtime_mapping` with `workflow_id` + `project_id` —
   returns the deployed bot ID and queue names
6. Use the **`loxtep-sdk`** Agent-Scope Skill to bootstrap the SDK client with
   the resolved `bot_id` and queue, then write events via the stream bus

**Runtime naming convention reference:** See the **`loxtep-sdk`** Agent-Scope
Skill for the full naming hierarchy and how to resolve queue/bot names from the
runtime-mapping API.

### Flow J — Ingestion data product (workflow-first — mandatory)

When the user asks to **create**, **provision**, or **stand up** a source (or
consumer) data product — including demand-driven / output-first design — follow
this sequence. Do **not** call `create_data_product`.

| Step          | Action                                         | Skill / tool                                                                                  |
| ------------- | ---------------------------------------------- | --------------------------------------------------------------------------------------------- |
| 0             | Create or select project                       | **Flow B** — `create_project` / `list_projects`                                               |
| 0b (optional) | Attach GitHub + local layout                   | **Flow B2** — `update_project` `github_*`; write `workflows/{id}/` locally                    |
| 1             | Connect external system (if needed)            | `connect-external-system` → `connector_id` + samples                                          |
| 2             | Design desired output schema + provenance      | `data-product-modeling` (design only — no MCP create)                                         |
| 3             | Read entity types                              | `get_entity_schemas` (`pattern`: `ingestion` \| `enrichment` \| `delivery`)                   |
| 4             | Compose full `files` map **from on-disk JSON** | `workflow.json`, Trigger `connections/`, `transformations/`, `data-products/{id}.json`        |
| 5             | Validate + persist bundle                      | `save_workflow_bundle` (`dry_run: true` → fix → `dry_run: false`)                             |
| 6             | Deploy to instance                             | `deploy_workflow` or `deploy_project` (Flow H)                                                |
| 7             | Verify runtime DP                              | `get_data_product` — expect `workflow_id`, `deployment_bindings`, `managed_by: "design-time"` |

For **outbound** consumer/delivery products, use Flow D
(`workflow_type: "delivery"` + Target connection) instead of a separate
delivery-interface API.

Put the designed schema on the **`data-products/{id}.json`** node (governance,
metadata, or schema fields per `get_entity_schemas`). Use `update_data_product`
**after deploy** for medallion, lineage, or schema revisions — not for initial
provisioning.

### Flow G — Build your own SDK-ingestion data product (end to end)

When a customer wants to write events from their own code into a new data
product, this is the complete happy path. The data product is fed by an **SDK
connection** node; **deploy** provisions the queue + bot and the data product's
runtime bindings; then the SDK resolves everything from the data product
**name**.

1. **Read schemas** — `get_entity_schemas` with `pattern: "ingestion"`.
2. **Compose bundle** — SDK connection + data product in `files` (Flow E).
3. **`save_workflow_bundle`** — dry run then persist.
4. **Deploy** — `deploy_workflow` (Flow H).
5. **Write / read via SDK** (see **`loxtep-sdk`**) — resolve by data product
   name.

   ```js
   const writer = await client.data_products.get_writer('<name>');
   writer.write({ id, timestamp, payload }); // payload = your event body
   await writer.close();

   const reader = await client.data_products.get_reader('<name>');
   for await (const event of reader) {
     /* ... */
   }
   ```

Notes:

- `get_writer` / `get_reader` resolve by **name** (or UUID) and only **after
  deploy** — they read the deployment bindings created at deploy time.
  Pre-deploy resolution fails by design.
- Authentication is handled automatically via OAuth when you connect the MCP
  server. If auth expires, reconnect the server to re-trigger the flow. See
  **`loxtep-auth`**.
- Simplest model: one workflow per event type, with the connection's
  `event_type` equal to the data product name.

## MCP mapping (operations and scope)

| Step | User intent                                 | Tool               | `operation`                                                                                                                                                                                                                       | Scope                                           | Key args                                                                                                                                               |
| ---- | ------------------------------------------- | ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1    | Who am I?                                   | `loxtep_session`   | `get_current_user`                                                                                                                                                                                                                | organization                                    | —                                                                                                                                                      |
| 2    | Which org?                                  | `loxtep_session`   | `get_current_organization`                                                                                                                                                                                                        | organization                                    | —                                                                                                                                                      |
| 3    | List/create/update/delete projects + status | `loxtep_workspace` | `list_projects`, `get_project`, `create_project`, `update_project`, `delete_project`, `get_project_workspace_status`, `list_project_changes`, `plan_project_materialization`                                                      | organization                                    | `name`, ids, materialization_plan                                                                                                                      |
| 4    | Templates                                   | `loxtep_connect`   | `list_templates`, `get_template`, `apply_template`                                                                                                                                                                                | organization / **project** for `apply_template` | `apply_template`: `project_id`, `template_type`, `template_slug`                                                                                       |
| 5    | Workflows                                   | `loxtep_build`     | `get_entity_schemas`, `save_workflow_bundle`, `list_workflows`, `get_workflow`, `get_workflow_graph`, `preview_transform`, `create_workflow`, `update_workflow`, `delete_workflow`, `patch_workflow_graph` (Studio UI edits only) | **project**                                     | `project_id`                                                                                                                                           |
| 6    | Existing Trigger/Target connections         | `loxtep_build`     | `list_triggers`/`list_targets`, `get_*`, `update_*`, `delete_*`, `test_*`                                                                                                                                                         | **project**                                     | `project_id` — new tails via bundle, not create\_\* ops                                                                                                |
| 7    | Data products (inspect/update after deploy) | `loxtep_build`     | `list_data_products`, `get_data_product`, `get_lexicon`, `update_data_product`, `delete_data_product`                                                                                                                             | **project** or org per op                       | **Do not** `create_data_product` — author via bundle `data-products/{id}.json`                                                                         |
| 8    | Delivery (outbound)                         | `loxtep_build`     | `get_entity_schemas` (`pattern: "delivery"`), `save_workflow_bundle`, `list_delivery_grants` / `get_delivery_grant` / `save_delivery_grant` / `update_delivery_grant`, `deploy_workflow`                                          | **project** (grants list/get are org-scoped)    | DPT head + Target `connections/{id}.json` + `connector_id` + `delivery_config`; grant before deploy. **`create_delivery` / `list_deliveries` removed** |
| 9    | Deploy project                              | `loxtep_build`     | `deploy_project`                                                                                                                                                                                                                  | **project**                                     | `project_id`, `instance_id`, optional `force_redeploy`                                                                                                 |
| 9b   | Deploy single workflow                      | `loxtep_build`     | `deploy_workflow`                                                                                                                                                                                                                 | **project**                                     | `project_id`, `workflow_id`, `instance_id`, optional `force_redeploy`, `skip_validation`                                                               |
| 10   | List/get deployments                        | `loxtep_observe`   | `list_deployments`, `get_deployment`                                                                                                                                                                                              | **organization**                                | `deployment_id`, optional filters                                                                                                                      |
| 11   | Runtime mapping                             | `loxtep_build`     | `get_runtime_mapping`                                                                                                                                                                                                             | **project**                                     | `workflow_id`, `project_id`                                                                                                                            |

## Tune node batch size and memory

Set these on the **entity JSON** (bundle file), then `save_workflow_bundle` →
`deploy_workflow`. `get_entity_schemas` lists the same fields. A set value that
deploy cannot honor **fails the deploy** — it does not warn and default.

| Field               | Valid values                            | What it controls                                 |
| ------------------- | --------------------------------------- | ------------------------------------------------ |
| `batch_size`        | integer **1–10000**                     | Events per handler call (rstreams offload batch) |
| `runtime_memory_mb` | **256**, **512**, **1024**, or **2048** | Shared runtimes Lambda memory tier               |

### Where to put the fields

| Entity         | Location                                                                                                                                                 | Unset `batch_size` | Unset `runtime_memory_mb`                                                             |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------ | ------------------------------------------------------------------------------------- |
| Transformation | Top-level on `transformations/{id}.json`                                                                                                                 | 300                | Derived from `transform_type` (see below). Registers on shared `transformers-{mb}`.   |
| Validation     | Top-level on `validations/{id}.json`                                                                                                                     | 300                | Shared runtimes segment resolvable: `connectors-256`. Otherwise `validation-handler`. |
| Quality rule   | Top-level on `quality-rules/{id}.json`                                                                                                                   | 300                | Same as validation, except the legacy Lambda is `quality-rule-handler`.               |
| Connection     | `ingestion_config.batch_size` / `ingestion_config.runtime_memory_mb` (same keys on `configuration` also work; `ingestion_config` wins when both are set) | 100                | Shared runtimes segment resolvable: `connectors-256`. Otherwise `connection-handler`. |

Unset transformation memory is 1024 for `execute_code_function`,
`derived_columns`, `concatenate_columns`, `explode_array`, `zip_arrays`,
`array_to_column`, and `route` with `prepare`; 512 for `parse_json`,
`xml_to_json`, `extract_json_path`, `regex_extractor`, `flatten`, and `filter`;
otherwise 256. Derived unset never selects 2048.

A **set** `runtime_memory_mb` (including explicit **256**) registers on
`connectors-{mb}` (connections, validations, quality rules) or
`transformers-{mb}` (transformations). Shared runtimes resolve when the instance
has `connection_details.runtimes_stack_identifier` **or** deploy can derive
`organization_id` + `instance_id`.

A connection that requires a customer VPC (`network_binding: customer_vpc` /
`private`, `require_private_network: true`, or `mongodb-source` / `mongodb`)
registers on `connectors-private` at **512 MB** regardless of the requested
`runtime_memory_mb`.

### Deploy errors

| Error                               | When                                                                                                       | Fix                                                                                                                                  |
| ----------------------------------- | ---------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `InvalidNodeRuntimeTuningError`     | A field is **set** but not a valid value (e.g. `batch_size` 0 / 10001 / `"lots"`, `runtime_memory_mb` 999) | Omit the field or set a value from the table above. Connection `batch_size` is the same 1–10000 rule.                                |
| `NodeRuntimeTuningUnavailableError` | `runtime_memory_mb` is **set** (including 256) and no shared runtimes segment resolves                     | Deploy to an instance that supplies `organization_id` + `instance_id` (or `runtimes_stack_identifier`), or omit `runtime_memory_mb`. |

Do not put `runtime_memory_mb` on the connection entity root — the connection
schema rejects unknown top-level properties. Use `ingestion_config`.

## Pitfalls

- **`create_delivery` / `list_deliveries`** — **Removed** (consumptions table
  dropped). Author a `data-product-trigger` head + Target connection +
  `workflow_type: "delivery"` in `save_workflow_bundle`, then a delivery grant
  (Flow D).
- **Target-only delivery bundle** — Save rejects a delivery graph whose head is
  not a `data-product-trigger` (`DELIVERY_FIRST_NODE_NOT_DATA_PRODUCT_TRIGGER`).
- **Write-policy keys under `configuration`** — refused; use `delivery_config`.
- **`workflow_type: "consumption"`** — Removed. Use **`delivery`**.
- **Inline-only bundle authoring** — Composing the `files` map solely inside a
  `save_workflow_bundle` tool call with no `workflows/{workflow_id}/` files on
  disk. Write locally first; MCP upload/sync is step two. See Flow B2.
- **Skipping project setup** — Calling `get_entity_schemas` or
  `save_workflow_bundle` without `project_id` from **Flow B**. Create or select
  the project before any Organize (bundle/deploy) work.
- **Product storage key** — one identity. `is_primary_key`, `schema.key` (same
  fields, field order), and the primary entity `natural_key` (those names joined
  with commas). Applying a shape writes `schema.key`. The Iceberg writer
  concatenates those source values with `|` into `lx__id`. `lx__id` is not a
  field to pick. When `schema.key` is absent, the primary-key flags are the key.
  A fielded schema with neither fails PUT, enable, sync, and rebuild. A stored
  `schema.key` that disagrees with the flags is rejected.
  `query_trigger.primary_key` only names values a SQL trigger concatenates into
  `lx__id`. A contract or semantic binding does not set `schema.key`. Enable
  with `loxtep_observe` → `enable_iceberg_table`. Read `get_definition_status`
  `stores` first.
- **`create_data_product` for new ingest flows** — Wrong path. Standalone create
  bypasses the workflow graph, queues, bots, and deployment bindings. Always
  embed `data-products/{id}.json` in `save_workflow_bundle`, then deploy. See
  Flow J. Use **`data-product-modeling`** for schema design only.
- Missing **`project_id`** on project-scoped workflow/connection ops.
- **Deployment required before SDK ingestion** — Creating workflows,
  connections, and data products via MCP only defines the graph. Queues and bots
  are **not provisioned** until the project is deployed to an instance. Do not
  attempt SDK event writes until deployment completes. See Flow H above.
- **`source_queue` on data-product-trigger** — not read at deploy; use
  `configuration.source_data_product_id` only. See
  [`docs/workflows/cross-workflow-enrichment.md`](../../docs/workflows/cross-workflow-enrichment.md).
- **Cross-workflow enrichment deploy order** — deploy the producing ingestion
  workflow and verify source DP `deployment_bindings` before deploying
  enrichment.
- **`deploy_project` is async** — returns `{ "status": "requested" }` with no
  single deployment row; poll `list_deployments` filtered by each `workflow_id`.
- **Credentials on workflow graph nodes** — runtime reads
  `credential_parameter_store_refs` (and file-transfer transport/fileSpecs) from
  connection `entity_config`. For **file-transfer / sftp / ftp / ftps**, deploy
  hydrates those fields from the org connector by `connector_id` (connection
  overrides still win). Prefer storing secrets on the org connector.
- **`deploy_workflow` vs `deploy_project`** — Use `deploy_workflow` for fast
  iteration on a single workflow during development. Use `deploy_project` for
  production releases or when multiple workflows changed (it creates a full
  project snapshot for rollback). `deploy_workflow` does **not** create a
  project snapshot — call `create_snapshot` first if you need a restore point.
- **`deploy_workflow` requires `workflow_id`** — Unlike `deploy_project` which
  deploys all workflows in the project, `deploy_workflow` targets exactly one.
  Pass all three: `project_id`, `workflow_id`, `instance_id`.
- **`save_workflow_bundle` is the preferred agent authoring path** — compose
  full JSON, `dry_run: true` first, then persist. Do not use sequential
  `patch_workflow_graph` for new flows.
- **`patch_workflow_graph`** — Studio UI incremental edits only; not for
  building flows from scratch.
- **`apply_template`** requires `project_id` — not the same as org-only template
  list.
- **Paid plans vs shared instance** — provisioning is **`loxtep-workspace`**,
  not this Agent-Scope Skill.
- **Agent issues/goals** — use **`loxtep-agent-workspace`** (`loxtep_context`
  tool), not `loxtep_workspace`.

<!-- BEGIN loxtep skill-scope (skill-package-v1) -->

## Agent-Scope Skill scope (`.loxtep/skills/data-workflows.yaml`)

Resource scope and operation permissions for this Agent-Scope Skill, conformant
with the [`skill-package-v1`](https://loxtep.io/schemas/skill-package-v1.json)
schema. Any resource type or operation not listed is **denied (fail-closed)**.
Identifier lists are empty placeholders — fill them with the specific resources
in your workspace. This declaration does not change the hosted MCP config
(`mcp.loxtep.io`).

```yaml
# .loxtep/skills/data-workflows.yaml
# Conforms to https://loxtep.io/schemas/skill-package-v1.json
# Scoped to ONLY the identifiers listed; least-privilege per operation. Fail-closed.
name: data-workflows
description: Author and operate data workflows, connections, and data products.
scope:
  data_products: []
  connectors: []
  workflows: []
  domains: []
  queues: []
permissions:
  data_products: [read, create, write, delete]
  connectors: [read, create, write, delete]
  workflows: [read, create, write, delete]
  queues: [read]
```

<!-- END loxtep skill-scope (skill-package-v1) -->

## Implementation notes

**Internal flow identifiers:** Flow A–J, Flow E (compose bundle), S0–S3 user
story refs, P1/P2 PKO handoffs — routing detail for agents; not user-facing
labels.

**PKO handoffs:** Connect (`connect-external-system`) ends with `connector_id` +
samples → Organize bundle authoring here (Trigger at ingest head). P2 = design +
deploy ingestion workflow. Delivery = Flow D (Target at tail).

## Skill attribution (required)

MCP tool calls need a resolvable skill name. Prefer `_metadata.skill_name`;
otherwise the server infers from the operation map or `X-Skill-Name`.
Unresolvable calls are denied (`MISSING_SKILL_ATTRIBUTION`). The skill name also
drives scope checks.

```json
{
  "operation": "save_workflow_bundle",
  "project_id": "...",
  "dry_run": true,
  "files": { "...": "..." },
  "_metadata": { "skill_name": "data-workflows" }
}
```

## Auth

Reconnect the Loxtep MCP server to re-trigger OAuth — see **`loxtep-auth`**.

## References

- [User story catalog](../../../docs/skills-user-stories.md) (this repo)
