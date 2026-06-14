---
name: data-workflows
description:
  Use when the user wants to build or operate the data mesh studio — projects, workflows,
  templates, connections, data products, omnichannel unified products, delivery interfaces
  (webhook subscriptions), session context, or "ingest / unify / expose sales data".
  Customer MCP tools loxtep_session, loxtep_projects, loxtep_templates, loxtep_workflows,
  loxtep_connections, loxtep_data_products. Stories S0, S2, S3; orchestrates with
  create-connector for S1. See docs/skills-user-stories.md.
trigger: |
  TRIGGER when: User asks about or mentions creating/listing/updating data products, workflows,
  connections, connectors, ingestion pipelines, data mesh, omnichannel products, delivery
  interfaces, or delivery workflows in context of Loxtep. Includes patterns: "create data
  product", "build workflow", "ingest data", "setup connector", "unify data", "data mesh",
  "delivery interface", "delivery workflow", "webhook subscription". Always invoke before
  making direct loxtep_data_products or loxtep_workflows MCP calls to ensure proper
  architecture (connectors → workflows → data products).
metadata:
  documentation: https://github.com/LoxtepInc/loxtep-plugins-skills/blob/main/codex/skills/data-workflows/SKILL.md
---

# Data mesh studio (Customer MCP)

End-to-end playbooks for **projects**, **workflow graphs**, **connections**, **data products**, and **delivery interfaces** (webhook subscriptions, API endpoints, exports, database syncs, BI connections, event streams), plus **session** context. Pair with **`create-connector`** for SaaS/API ingest (Shopify, etc.) or **SDK connector** for programmatic ingestion, and **`loxtep-instances`** for runtime provisioning.

## When to use

- **S0:** Confirm user and org (`get_current_user`, `get_current_organization`).
- **S2:** Create an **omnichannel** or unified **data product** across multiple sources in a project.
- **S3:** Register a **delivery interface** (e.g., webhook subscription) for data product updates (`create_delivery_interface`).
- User asks for **projects**, **flows**, **templates**, **connections** (project nodes), **data products**, **delivery interfaces**, or **patch workflow graph**.
- **SDK / programmatic ingestion:** If the user wants to write events from their own code (not a SaaS connector), use the **`create-connector`** skill's **SDK Connector flow** (`connector_type: "sdk"`) to create the connector, then **`loxtep-sdk`** for SDK client usage. This skill handles the workflow graph and data products that receive those events.

## Prerequisites

- MCP login (`loxtep-auth` if JWT errors). For **permissions / 403** questions, use skill **`loxtep-mcp-session`** (`get_current_user` → `permissions`).
- **Project-scoped** calls require `project_id` in the same payload as `operation`.
- **Org-scoped** data products / delivery interfaces: use `data_product_id` as required by each operation.

## How MCP calls work

1. **Tool name** — one of `loxtep_session`, `loxtep_projects`, `loxtep_templates`, `loxtep_workflows`, `loxtep_connections`, `loxtep_data_products`.
2. **`operation`** — flat tool id (e.g. `list_workflows`).
3. **Other fields** — API args at top level next to `operation`.

## Happy-path flows

### Flow A — Session before work (S0)

1. `loxtep_session` → `{ "operation": "get_current_user" }`
2. `loxtep_session` → `{ "operation": "get_current_organization" }`

### Flow B — New project then template (studio bootstrap)

1. `loxtep_projects` → `create_project` (`name`, optional `template_slug`, …).
2. `loxtep_templates` → `list_templates` / `get_template` (optional).
3. `loxtep_templates` → `apply_template` with `project_id`, `template_type`, `template_slug`.

### Flow C — Omnichannel data product (S2)

1. Ensure **project** exists; add **connections** per channel (see **`create-connector`** skill).
2. `loxtep_workflows` → `create_workflow` to create the workflow entity.
3. `loxtep_workflows` → `patch_workflow_graph` to add nodes (connection + data product) and wire edges. **See Flow E below for the exact format.**
4. `get_data_product` / `get_data_product_lexicon` to verify; `update_data_product` as needed.

### Flow D — Delivery interface for data product updates (S3)

> **Note:** The `workflow_type` enum value `'consumption'` is unchanged in tool
> calls — the user-facing name is "delivery workflow."

1. Obtain `data_product_id` (`list_data_products` / `get_data_product`).
2. `loxtep_data_products` → `create_delivery_interface` with `data_product_id`, `endpoint_url`, optional `headers`, `secret_token`, `filters`, `delivery_type` (e.g. `webhook`, `api_endpoint`, `export`, `database_sync`, `bi_connect`, `event_stream`).
3. Optional: `list_delivery_interfaces` to audit active delivery interfaces.

### Flow F — Enrich/stage from an existing data product (enrichment workflow)

To build a **derived/staging** data product whose source is **another data product** (e.g. dbt-style staging over an ingested product), the workflow is `workflow_type: "enrichment"` and its **source node must be a `data-product-trigger` connection**.

- **Do not** use a plain `data-products` source node — it is logical only (no runtime bot/queue), so nothing feeds the transforms.
- **Do not** use an `sdk` connection — it is a producer; it does not read another product's stream.

1. `create_workflow` with `workflow_type: "enrichment"`.
2. `create_connection` with `type: "data-product-trigger"` and `configuration.source_data_product_id` = the upstream data product's UUID or name. At deploy this reads the upstream product's bound queue and forwards events downstream.
3. Add transforms (`create_transformation`, e.g. `change_schema` → `filter` → `drop_fields`) and a sink `data-products` node.
4. `patch_workflow_graph` (see Flow E): `add_node` the trigger connection + sink, then `connect_nodes` trigger → first transform → … → sink. (`create_connection` / `create_data_product` do not add graph nodes by themselves.)
5. Deploy. Events replay from the upstream product's history. The **`data-product-enrichment`** workflow template scaffolds this exact shape.

### Flow E — Wiring a workflow graph with `patch_workflow_graph` (CRITICAL)

`patch_workflow_graph` is the **only** way to add connection nodes, data product nodes, and edges to a workflow. It requires a **two-step sequential process** because you need the entity IDs returned from step 1 to create edges in step 2.

**Step 1 — Add nodes (connection + data product):**

```json
{
  "operation": "patch_workflow_graph",
  "project_id": "<project_id>",
  "workflow_id": "<workflow_id>",
  "operations": [
    {
      "op": "add_node",
      "entity_type": "connections",
      "entity": {
        "name": "SDK Input",
        "connector_type": "sdk",
        "configuration": {
          "sdk_type": "nodejs",
          "event_type": "my_event_type"
        }
      }
    },
    {
      "op": "add_node",
      "entity_type": "data-products",
      "entity": {
        "name": "my_data_product",
        "description": "Data product for my_event_type",
        "status": "draft",
        "governance": {
          "classification": "internal",
          "pii_fields": [],
          "compliance_requirements": [],
          "tags": []
        }
      }
    }
  ]
}
```

The response returns `created` with the generated `entity_id` for each node:
```json
{
  "success": true,
  "created": [
    { "entity_type": "connections", "entity_id": "<connection_id>" },
    { "entity_type": "data-products", "entity_id": "<data_product_id>" }
  ]
}
```

**Step 2 — Connect nodes and mark workflow as wired:**

Use the entity IDs from step 1 to create the edge and update workflow metadata:

```json
{
  "operation": "patch_workflow_graph",
  "project_id": "<project_id>",
  "workflow_id": "<workflow_id>",
  "operations": [
    {
      "op": "connect_nodes",
      "from_entity_id": "<connection_id>",
      "to_entity_id": "<data_product_id>"
    },
    {
      "op": "update_workflow",
      "patch": { "metadata": { "graph_wired": true } }
    }
  ]
}
```

**Supported operations:**

| Op | Purpose | Required fields |
|----|---------|-----------------|
| `add_node` | Add a connection, data product, transformation, validation, schema, export, contract, or quality-rule | `entity_type`, `entity` (body; ID auto-generated if omitted) |
| `update_node` | Patch an existing node | `entity_id` (UUID), `patch` (partial body) |
| `remove_node` | Delete a node (no-op if missing) | `entity_id` (UUID) |
| `connect_nodes` | Create an edge (sets `upstream_entity_id` on target) | `from_entity_id`, `to_entity_id` (both UUIDs) |
| `disconnect_nodes` | Remove an edge (nulls `upstream_entity_id`) | `from_entity_id`, `to_entity_id` (both UUIDs) |
| `update_workflow` | Patch the root workflow entity | `patch` (partial body) |

**Valid `entity_type` values:** `connections`, `transformations`, `validations`, `data-products`, `schemas`, `contracts`, `quality-rules`, `exports`

**Key rules:**
- `add_node` with an existing entity_id is idempotent (becomes an update).
- `remove_node` on a missing entity is a no-op.
- Edges are directional: `from_entity_id` → `to_entity_id` (upstream → downstream).
- You **must** call `patch_workflow_graph` twice sequentially: first to add nodes (to get IDs), then to connect them.
- Always include `"op": "update_workflow"` with `{ "metadata": { "graph_wired": true } }` in the second patch so the UI shows the workflow as configured.
- Use `dry_run: true` to validate operations without persisting.

### Flow F — Deploy before SDK ingestion (CRITICAL for runtime)

Design-time configuration (Flows A–E above) creates the **graph definition** only. **Queues and bots do not exist until the project is deployed to an instance.** If the user wants to write events via the SDK, they must deploy first.

**Deploy via MCP (`loxtep_deployments` facade):**

| Step | Action | Tool | `operation` | Key args |
|------|--------|------|-------------|----------|
| 1 | Ensure instance exists | `loxtep_instances` | `list_instances` | — |
| 2a | Deploy full project | `loxtep_deployments` | `deploy_project` | `project_id`, `instance_id` |
| 2b | Deploy single workflow | `loxtep_deployments` | `deploy_workflow` | `project_id`, `workflow_id`, `instance_id` |
| 3 | Poll status | `loxtep_deployments` | `get_deployment` | `deployment_id` (from step 2) |
| 4 | Resolve queues | `loxtep_deployments` | `get_runtime_mapping` | `workflow_id`, `project_id` |

**Choosing `deploy_project` vs `deploy_workflow`:**

| Use case | Operation | Why |
|----------|-----------|-----|
| First deploy / production release | `deploy_project` | Snapshots entire workspace (all workflows, connections, schemas) and deploys atomically. Creates a version for rollback. |
| Iterating on a single workflow | `deploy_workflow` | Faster — targets one workflow without snapshotting the full project. Ideal during development. |
| After changing multiple workflows | `deploy_project` | Ensures all changes deploy together with a consistent snapshot. |
| Redeploying after a graph change | `deploy_workflow` | Quick redeploy of just the affected workflow. |

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
- `force_redeploy` (optional, default `false`) — Override an existing in-progress deployment for this workflow.
- `skip_validation` (optional, default `false`) — Skip code bundle validation (use during development only).

**What deployment does:**
1. Creates a **microservice identifier** (namespace): `{instance_id_8}-{project_id_8}-{workflow_id_8}` (first 8 chars of each UUID, hyphens stripped)
2. For each connection/transformation/data product in the graph, derives a **container_id**: `{prefix}-{entity_uuid_8}` (prefixes: `conn`, `xfm`, `val`, `dp`, `exp`, `pipe`)
3. Registers **bots**: `{msId}-bot-{container_id}-{role}` (e.g. `a1b2c3d4-e5f6g7h8-i9j0k1l2-bot-conn-e5f6g7h8-handler`)
4. Registers **queues**: `{msId}-queue-{container_id}-{direction}` where direction = `in`|`out`|`err`
5. Stores a **`runtime_mapping`** on the deployment record (containers → entity_id, bot_ids, queue_ids)

**Versioning behavior:**
- `deploy_project` — When `version_id` is omitted (default via MCP), automatically creates a project snapshot before deploying. This snapshot is immutable and can be used for rollback via `restore_version`. Each deployment also creates a `deployment_version` record tracking validation, approval, and deployment history per workflow.
- `deploy_workflow` — Creates a `deployment_version` record for the targeted workflow (version_number auto-increments per workflow+instance). Does **not** create a full project snapshot — use `create_snapshot` manually if you need a restore point.

**After deployment**, use the SDK to write events — **not** HTTP directly. The agent must resolve the runtime configuration so the SDK client knows which bot and queue to target:

1. `loxtep_deployments` → `get_runtime_mapping` with `workflow_id` + `project_id`
2. From the response, identify the **connection entity's container** (match by `entity_id`)
3. Extract the `bot_ids[0]` (the deployed bot) and `queue_ids` (input queue) for that container
4. Configure the `@loxtep/sdk` client with `instance_id`, `bot_id`, and the resolved queue — then write events via the SDK's stream bus

**Recommended agent sequence for SDK ingestion:**
1. Complete Flows B/C/E (project + workflow + graph with connection + data product)
2. Ensure user has an instance (`loxtep_instances` → `list_instances`)
3. Deploy:
   - **Quick iteration:** `loxtep_deployments` → `deploy_workflow` with `project_id` + `workflow_id` + `instance_id`
   - **Production release:** `loxtep_deployments` → `deploy_project` with `project_id` + `instance_id`
4. Poll `get_deployment` until status = `deployed`
5. `loxtep_deployments` → `get_runtime_mapping` with `workflow_id` + `project_id` — returns the deployed bot ID and queue names
6. Use **`loxtep-sdk`** skill to bootstrap the SDK client with the resolved `bot_id` and queue, then write events via the stream bus

**Runtime naming convention reference:** See the **`loxtep-sdk`** skill for the full naming hierarchy and how to resolve queue/bot names from the runtime-mapping API.

### Flow G — Build your own SDK-ingestion data product (end to end)

When a customer wants to write events from their own code into a new data product, this is the complete happy path. The data product is fed by an **SDK connection** node; **deploy** provisions the queue + bot and the data product's runtime bindings; then the SDK resolves everything from the data product **name**.

1. **Create the workflow** — `loxtep_workflows` → `create_workflow` with `workflow_type: "ingestion"`.
2. **Add nodes** — `patch_workflow_graph` (Flow E, step 1): an SDK connection node (`entity_type: "connections"`, `connector_type: "sdk"`, `configuration: { "sdk_type": "nodejs", "event_type": "<name>" }`) **and** a `data-products` node named `<name>`.
3. **Connect** — `patch_workflow_graph` (Flow E, step 2): `connect_nodes` connection → data product, plus `update_workflow` `{ "metadata": { "graph_wired": true } }`.
4. **Deploy** — `loxtep_deployments` → `deploy_workflow` with `project_id` + `workflow_id` + `instance_id`. **Required**: queues/bots and the data product's deployment bindings do not exist until deploy (see Flow F). Re-run after any graph change.
5. **Write / read via the SDK** (see **`loxtep-sdk`**) — resolve purely by data product name:
   ```js
   const writer = await client.data_products.get_writer('<name>');
   writer.write({ id, timestamp, payload });   // payload = your event body
   await writer.close();

   const reader = await client.data_products.get_reader('<name>');
   for await (const event of reader) { /* ... */ }
   ```

Notes:
- `get_writer` / `get_reader` resolve by **name** (or UUID) and only **after deploy** — they read the deployment bindings created at deploy time. Pre-deploy resolution fails by design.
- Authentication is handled automatically via OAuth when you connect the MCP server. If auth expires, reconnect the server to re-trigger the flow. See **`loxtep-auth`**.
- Simplest model: one workflow per event type, with the connection's `event_type` equal to the data product name.

## MCP mapping (operations and scope)

| Step | User intent | Tool | `operation` | Scope | Key args |
|------|-------------|------|---------------|-------|----------|
| 1 | Who am I? | `loxtep_session` | `get_current_user` | organization | — |
| 2 | Which org? | `loxtep_session` | `get_current_organization` | organization | — |
| 3 | List/create/update/delete projects | `loxtep_projects` | `list_projects`, `get_project`, `create_project`, `update_project`, `delete_project` | organization | `name`, ids |
| 4 | Templates | `loxtep_templates` | `list_templates`, `get_template`, `apply_template` | organization / **project** for `apply_template` | `apply_template`: `project_id`, `template_type`, `template_slug` |
| 5 | Workflows | `loxtep_workflows` | `create_workflow`, `update_workflow`, `delete_workflow`, `list_workflows`, `get_workflow`, `get_workflow_graph`, `patch_workflow_graph`, `preview_transform`, `create_transformation`, `create_validation` | **project** | `project_id` |
| 6 | Connection nodes | `loxtep_connections` | `create_connection`, `update_connection`, `delete_connection`, `list_connections`, `get_connection`, `test_connection` | **project** | `project_id` |
| 7 | Data products | `loxtep_data_products` | `create_data_product`, `update_data_product`, `delete_data_product`, `list_data_products`, `get_data_product`, `get_data_product_lexicon` | **project** or org per op | `project_id` where required |
| 8 | Delivery interfaces | `loxtep_data_products` | `list_delivery_interfaces`, `create_delivery_interface` | **organization** | `data_product_id`, `endpoint_url`, `delivery_type`, … |
| 9 | Deploy project | `loxtep_deployments` | `deploy_project` | **project** | `project_id`, `instance_id`, optional `force_redeploy` |
| 9b | Deploy single workflow | `loxtep_deployments` | `deploy_workflow` | **project** | `project_id`, `workflow_id`, `instance_id`, optional `force_redeploy`, `skip_validation` |
| 10 | List/get deployments | `loxtep_deployments` | `list_deployments`, `get_deployment` | **organization** | `deployment_id`, optional filters |
| 11 | Runtime mapping | `loxtep_deployments` | `get_runtime_mapping` | **project** | `workflow_id`, `project_id` |

## Pitfalls

- Missing **`project_id`** on project-scoped workflow/connection ops.
- **Deployment required before SDK ingestion** — Creating workflows, connections, and data products via MCP only defines the graph. Queues and bots are **not provisioned** until the project is deployed to an instance. Do not attempt SDK event writes until deployment completes. See Flow F above.
- **`deploy_workflow` vs `deploy_project`** — Use `deploy_workflow` for fast iteration on a single workflow during development. Use `deploy_project` for production releases or when multiple workflows changed (it creates a full project snapshot for rollback). `deploy_workflow` does **not** create a project snapshot — call `create_snapshot` first if you need a restore point.
- **`deploy_workflow` requires `workflow_id`** — Unlike `deploy_project` which deploys all workflows in the project, `deploy_workflow` targets exactly one. Pass all three: `project_id`, `workflow_id`, `instance_id`.
- **`patch_workflow_graph` requires two sequential calls** — you cannot add nodes and connect them in a single call because you need the returned entity IDs for `connect_nodes`. Attempting to guess or pre-generate IDs will fail validation.
- **`patch_workflow_graph` operations format** — The `operations` field is an **array of operation objects**, not a single operation. Each object must have an `op` field. Do NOT pass `type` instead of `op` (though the backend normalizes both, prefer `op`).
- **`entity_type` must use hyphens** — Use `data-products` (not `data_products`), `quality-rules` (not `quality_rules`).
- **`apply_template`** requires `project_id` — not the same as org-only template list.
- **`test_connection`** — Loads connection from workspace storage; runs an optional **HTTP GET** probe only when the saved configuration includes a URL-like field (`base_url`, `url`, `host`, …). Otherwise it confirms the entity exists without a live probe.
- **`create_transformation`** / **`create_validation`** — Require an **existing workflow graph** (`get_workflow_graph` / prior `patch_workflow_graph`). If the graph is missing, the tool fails with a not-found style error.
- **Paid plans vs shared instance** — provisioning is **`loxtep-instances`**, not this skill.
- **Agent issues/goals** — use **`loxtep-agent-workspace`**, not `loxtep_projects`.

<!-- BEGIN loxtep skill-scope (skill-package-v1) -->
## Skill scope (`.loxtep/skills/data-workflows.yaml`)

Resource scope and operation permissions for this skill, conformant with the [`skill-package-v1`](https://loxtep.io/schemas/skill-package-v1.json) schema. Any resource type or operation not listed is **denied (fail-closed)**. Identifier lists are empty placeholders — fill them with the specific resources in your workspace. This declaration does not change the hosted MCP config (`mcp.loxtep.io`).

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
  "operation": "create_data_product",
  "project_id": "...",
  "_metadata": { "skill_name": "data-workflows" }
}
```

## Auth

Reconnect the Loxtep MCP server to re-trigger OAuth — see **`loxtep-auth`**.

## References

- [User story catalog](../../../docs/skills-user-stories.md) (this repo)
