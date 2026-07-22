<!-- GENERATED FILE -- edit skills/<slug>/SKILL.md (or rule.mdc.src.md) and run `node scripts/generate-skills.mjs` -- do not edit directly -->
---
name: data-workflows
description:
  Use when the user wants to build or operate the data mesh studio — projects,
  workflows, templates, connections, data products, omnichannel unified
  products, delivery interfaces (webhook subscriptions), session context, or
  "ingest / unify / expose sales data". Customer MCP tools loxtep_session,
  loxtep_projects, loxtep_templates, loxtep_workflows, loxtep_triggers,
  loxtep_data_products. Stories S0, S2, S3; orchestrates with
  connect-external-system for S1. See docs/skills-user-stories.md.
trigger: |
  TRIGGER when: User asks about or mentions creating/listing/updating data products, workflows,
  ingestion pipelines, data mesh, omnichannel products, delivery interfaces, or delivery
  workflows in context of Loxtep. Includes patterns: "create data product", "build workflow",
  "ingest data", "setup ingestion", "unify data", "data mesh", "delivery interface",
  "delivery workflow", "webhook subscription". Always invoke before making direct
  loxtep_data_products or loxtep_workflows MCP calls. AGENT AUTHORING: use save_workflow_bundle
  only — not piecemeal patch_workflow_graph for new flows. NEVER call create_data_product for
  new ingestion/enrichment/consumption — embed data-products/{id}.json in the bundle, save,
  then deploy.
metadata:
  documentation: https://github.com/LoxtepInc/loxtep-plugins-skills/blob/main/antigravity/skills/data-workflows/SKILL.md
---

# Data mesh studio (Customer MCP)

> **Customer install surface:** shipped via [loxtep-plugins-skills](https://github.com/LoxtepInc/loxtep-plugins-skills) (`<client>/skills/data-workflows/`). Cross-tool authoring contract: [agent-workflow-authoring.md](https://github.com/LoxtepInc/loxtep-plugins-skills/blob/main/docs/agent-workflow-authoring.md).

End-to-end playbooks for **projects**, **workflow graphs**, **connections**,
**data products**, and **delivery interfaces** (webhook subscriptions, API
endpoints, exports, database syncs, BI connections, event streams), plus
**session** context. Pair with **`connect-external-system`** for SaaS/API ingest
(Shopify, etc.) or **SDK connector** for programmatic ingestion, and
**`loxtep-instances`** for runtime provisioning.

## Agent authoring decision tree (CRITICAL — read first)

```
New flow / ingestion setup / "connect and ingest"?
  → get_entity_schemas (pattern: ingestion|enrichment|consumption)
  → Compose full files map (workflow.json + connections/ + transformations/ + data-products/)
  → save_workflow_bundle dry_run=true → fix errors → save_workflow_bundle dry_run=false
  → NEVER: patch_workflow_graph node-by-node for new flows

User editing open flow in Studio UI (tiny incremental change)?
  → patch_workflow_graph only

After connect-external-system (P1)?
  → You have connector_id + samples — start at get_entity_schemas, compose bundle

User asks to "create a source/consumer data product"?
  → Design schema first (data-product-modeling) — NO create_data_product MCP call
  → Embed data-products/{id}.json in save_workflow_bundle files → deploy_workflow
  → Verify get_data_product shows workflow_id + deployment_bindings after deploy

Starting any new flow?
  → create_project (or list_projects + reuse) FIRST — all workflow ops need project_id
  → Write workflows/{workflow_id}/... JSON files to disk in the repo
  → THEN save_workflow_bundle (reads files map built from local paths — not inline-only)
  → If GitHub-attached: local repo is source of truth; sync local → Loxtep project
```

**Data products are created by workflow design + deploy — not by `create_data_product`.**
Standalone MCP `create_data_product` produces orphan design-time records without
`workflow_id`, queues, or `deployment_bindings`. Correct DPs carry
`managed_by: "design-time"` and `deployed_by: "workflow-deployment"` after deploy.

**Connection nodes** reference org **connectors** via `connector_id` inside the
bundle (`connections/{connection_id}.json`).

## Project and local bundle files (CRITICAL — before P2)

**Every flow starts with a Loxtep project.** Workflows, connections, and data
products are **project-scoped** — you need `project_id` on all P2+ MCP calls.

| Step | Action |
| ---- | ------ |
| 0a | `list_projects` / `get_project` — reuse an existing project when appropriate |
| 0b | `create_project` when none exists — `{ "operation": "create_project", "name": "..." }` |
| 0c (optional) | **Attach GitHub** — `update_project` with `github_*` fields (or `github_action` on `create_project`) so the Loxtep project links to the repo |
| 0d (code-first repos) | CLI bootstrap: `loxtep init` → `loxtep attach` — see **`loxtep-sdk`** |

### Write bundles to disk — do not author inline-only

`save_workflow_bundle` persists to Loxtep's org workspace store (S3 under
`organizations/.../workflows/{workflow_id}/`). That is **server-side state** —
not a substitute for files in the user's repo.

| Correct | Wrong |
| ------- | ----- |
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

**Agent sequence:** project → write local files → dry-run save → fix → persist
→ deploy.

## When to use

- **S0:** Confirm user and org (`get_current_user`, `get_current_organization`).
- **S2:** Create an **omnichannel** or unified **data product** across multiple
  sources in a project.
- **S3:** Register a **delivery interface** (e.g., webhook subscription) for
  data product updates (`create_target`).
- User asks for **projects**, **flows**, **templates**, **data products**,
  **delivery interfaces**, or composing/saving workflow bundles.
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
- **Org-scoped** data products / delivery interfaces: use `data_product_id` as
  required by each operation.

## How MCP calls work

1. **Tool name** — one of `loxtep_session`, `loxtep_projects`,
   `loxtep_templates`, `loxtep_workflows`, `loxtep_triggers`,
   `loxtep_data_products`.
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
2. `loxtep_projects` → `list_projects` — reuse when the user names an existing
   mesh project.
3. If none exists: `create_project` with `name` (optional `description`,
   `domain_id`).
4. **Optional — GitHub attach:** `update_project` with `project_id` and
   `github_*` fields (or pass `github_action` on `create_project`) to link the
   Loxtep project to the customer's GitHub repo. Required for repo ↔ platform
   sync workflows.
5. **Code-first repos:** run `loxtep init` and `loxtep attach` in the repo root
   (see **`loxtep-sdk`**) instead of hand-rolling paths when the CLI is
   available.
6. Record `project_id` — every subsequent workflow MCP call in this session
   uses it.

Optional template bootstrap (after project exists):

1. `loxtep_templates` → `list_templates` / `get_template`.
2. `apply_template` with `project_id`, `template_type`, `template_slug` — writes
   a starter bundle (still materialize/sync locally when GitHub-attached).

### Flow B2 — GitHub-attached repo (local → Loxtep sync)

When the project is linked to GitHub (step 4 above):

1. **Author locally** under `workflows/{workflow_id}/` — never inline-only MCP
   payloads.
2. **Commit** to Git when the user expects version control.
3. **Sync to Loxtep** — build the `files` map from the on-disk JSON and call
   `save_workflow_bundle` (`dry_run: true` first, then persist). This uploads
   local state to the org workspace store.
4. **Deploy** — `deploy_workflow` / `deploy_project` (Flow H).

The platform store and the repo are two copies; **GitHub-attached projects
expect the repo to lead** and sync pushes local → Loxtep.

### Flow C — Omnichannel data product (S2)

1. Ensure **project** exists (**Flow B**); ensure **connectors** exist per channel (see
   **`connect-external-system`**).
2. **Write** workflow bundle files locally under `workflows/{workflow_id}/`.
3. **`get_entity_schemas`** with `pattern: "ingestion"` (or enrichment/export as
   needed).
4. Compose / validate the **`files`** map from on-disk JSON and
   **`save_workflow_bundle`** (`dry_run: true` first, then persist).
5. `get_data_product` / `get_data_product_lexicon` to verify;
   `update_data_product` as needed.

### Flow D — Delivery interface for data product updates (S3)

> **Note:** The `workflow_type` enum value `'consumption'` is unchanged in tool
> calls — the user-facing name is "delivery workflow."

1. Obtain `data_product_id` (`list_data_products` / `get_data_product`).
2. `loxtep_data_products` → `create_target` with `data_product_id`,
   `endpoint_url`, optional `headers`, `secret_token`, `filters`,
   `delivery_type` (e.g. `webhook`, `api_endpoint`, `export`, `database_sync`,
   `bi_connect`, `event_stream`).
3. Optional: `list_targets` to audit active delivery interfaces.

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

The **`data-product-enrichment`** workflow template scaffolds this exact shape.

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
calls. The studio is **S3-first composable JSON**: write the full flow, validate on save.

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

**Deploy via MCP (`loxtep_deployments` facade):**

| Step | Action                           | Tool                 | `operation`           | Key args                                                     |
| ---- | -------------------------------- | -------------------- | --------------------- | ------------------------------------------------------------ |
| 1    | Ensure instance exists           | `loxtep_instances`   | `list_instances`      | —                                                            |
| 2a   | Deploy full project              | `loxtep_deployments` | `deploy_project`      | `project_id`, `instance_id`                                  |
| 2b   | Deploy single workflow           | `loxtep_deployments` | `deploy_workflow`     | `project_id`, `workflow_id`, `instance_id`                   |
| 3    | Poll status                      | `loxtep_deployments` | `get_deployment`      | `deployment_id` (from step 2)                                |
| 4    | Resolve queues                   | `loxtep_deployments` | `get_runtime_mapping` | `workflow_id`, `project_id`                                  |
| 5    | Archive (decommission) when done | `loxtep_workflows`   | `archive_workflow`    | `project_id`, `workflow_id`, optional `instance_id`, `force` |

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

1. `loxtep_deployments` → `get_runtime_mapping` with `workflow_id` +
   `project_id`
2. From the response, identify the **connection entity's container** (match by
   `entity_id`)
3. Extract the `bot_ids[0]` (the deployed bot) and `queue_ids` (input queue) for
   that container
4. Configure the `@loxtep/sdk` client with `instance_id`, `bot_id`, and the
   resolved queue — then write events via the SDK's stream bus

**Recommended agent sequence for SDK ingestion:**

1. Complete Flows B/C/E (project + workflow + graph with connection + data
   product)
2. Ensure user has an instance (`loxtep_instances` → `list_instances`)
3. Deploy:
   - **Quick iteration:** `loxtep_deployments` → `deploy_workflow` with
     `project_id` + `workflow_id` + `instance_id`
   - **Production release:** `loxtep_deployments` → `deploy_project` with
     `project_id` + `instance_id`
4. Poll `get_deployment` until status = `deployed`
5. `loxtep_deployments` → `get_runtime_mapping` with `workflow_id` +
   `project_id` — returns the deployed bot ID and queue names
6. Use the **`loxtep-sdk`** Agent-Scope Skill to bootstrap the SDK client with
   the resolved `bot_id` and queue, then write events via the stream bus

**Runtime naming convention reference:** See the **`loxtep-sdk`** Agent-Scope
Skill for the full naming hierarchy and how to resolve queue/bot names from the
runtime-mapping API.

### Flow J — Ingestion data product (workflow-first — mandatory)

When the user asks to **create**, **provision**, or **stand up** a source (or
consumer) data product — including demand-driven / output-first design — follow
this sequence. Do **not** call `create_data_product`.

| Step | Action | Skill / tool |
| ---- | ------ | ------------ |
| 0 | Create or select project | **Flow B** — `create_project` / `list_projects` |
| 0b (optional) | Attach GitHub + local layout | **Flow B2** — `update_project` `github_*`; write `workflows/{id}/` locally |
| 1 | Connect external system (if needed) | `connect-external-system` → `connector_id` + samples |
| 2 | Design desired output schema + provenance | `data-product-modeling` (design only — no MCP create) |
| 3 | Read entity types | `get_entity_schemas` (`pattern`: `ingestion` \| `enrichment` \| `consumption`) |
| 4 | Compose full `files` map **from on-disk JSON** | `workflow.json`, `connections/`, `transformations/`, `data-products/{id}.json` |
| 5 | Validate + persist bundle | `save_workflow_bundle` (`dry_run: true` → fix → `dry_run: false`) |
| 6 | Deploy to instance | `deploy_workflow` or `deploy_project` (Flow H) |
| 7 | Verify runtime DP | `get_data_product` — expect `workflow_id`, `deployment_bindings`, `managed_by: "design-time"` |

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

| Step | User intent                        | Tool                   | `operation`                                                                                                                                                                                                                                                                                | Scope                                           | Key args                                                                                 |
| ---- | ---------------------------------- | ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------- | ---------------------------------------------------------------------------------------- |
| 1    | Who am I?                          | `loxtep_session`       | `get_current_user`                                                                                                                                                                                                                                                                         | organization                                    | —                                                                                        |
| 2    | Which org?                         | `loxtep_session`       | `get_current_organization`                                                                                                                                                                                                                                                                 | organization                                    | —                                                                                        |
| 3    | List/create/update/delete projects | `loxtep_projects`      | `list_projects`, `get_project`, `create_project`, `update_project`, `delete_project`                                                                                                                                                                                                       | organization                                    | `name`, ids                                                                              |
| 4    | Templates                          | `loxtep_templates`     | `list_templates`, `get_template`, `apply_template`                                                                                                                                                                                                                                         | organization / **project** for `apply_template` | `apply_template`: `project_id`, `template_type`, `template_slug`                         |
| 5    | Workflows                          | `loxtep_workflows`     | `get_entity_schemas`, `save_workflow_bundle`, `list_workflows`, `get_workflow`, `get_workflow_graph`, `preview_transform`, `create_workflow`, `update_workflow`, `delete_workflow`, `patch_workflow_graph` (Studio UI edits only) | **project**                                     | `project_id`                                                                             |
| 6    | Existing connection entities       | `loxtep_triggers`   | `update_trigger`, `delete_trigger`, `list_triggers`, `get_trigger`, `test_trigger` | **project**                                     | `project_id`                                                                             |
| 7    | Data products (inspect/update after deploy) | `loxtep_data_products` | `list_data_products`, `get_data_product`, `get_data_product_lexicon`, `update_data_product`, `delete_data_product`                                                                                                                                                           | **project** or org per op                       | **Do not** `create_data_product` — author via bundle `data-products/{id}.json` |
| 8    | Delivery interfaces                | `loxtep_data_products` | `list_targets`, `create_target`                                                                                                                                                                                                                                    | **organization**                                | `data_product_id`, `endpoint_url`, `delivery_type`, …                                    |
| 9    | Deploy project                     | `loxtep_deployments`   | `deploy_project`                                                                                                                                                                                                                                                                           | **project**                                     | `project_id`, `instance_id`, optional `force_redeploy`                                   |
| 9b   | Deploy single workflow             | `loxtep_deployments`   | `deploy_workflow`                                                                                                                                                                                                                                                                          | **project**                                     | `project_id`, `workflow_id`, `instance_id`, optional `force_redeploy`, `skip_validation` |
| 10   | List/get deployments               | `loxtep_deployments`   | `list_deployments`, `get_deployment`                                                                                                                                                                                                                                                       | **organization**                                | `deployment_id`, optional filters                                                        |
| 11   | Runtime mapping                    | `loxtep_deployments`   | `get_runtime_mapping`                                                                                                                                                                                                                                                                      | **project**                                     | `workflow_id`, `project_id`                                                              |

## Pitfalls

- **Inline-only bundle authoring** — Composing the `files` map solely inside a
  `save_workflow_bundle` tool call with no `workflows/{workflow_id}/` files on
  disk. Write locally first; MCP upload/sync is step two. See Flow B2.
- **Skipping project setup** — Calling `get_entity_schemas` or
  `save_workflow_bundle` without `project_id` from **Flow B**. Create or select
  the project before any P2 work.
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
  `credential_parameter_store_refs` on the **connection node** in the graph;
  org-level connector credentials are not auto-merged at deploy.
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
- **Paid plans vs shared instance** — provisioning is **`loxtep-instances`**,
  not this Agent-Scope Skill.
- **Agent issues/goals** — use **`loxtep-agent-workspace`**, not
  `loxtep_projects`.

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

## Optional attribution

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
