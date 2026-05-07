---
name: data-workflows
description:
  Use when the user wants to build or operate the data mesh studio — projects, workflows,
  templates, connections, data products, omnichannel unified products, webhook consumptions,
  session context, or "ingest / unify / expose sales data". Customer MCP tools loxtep_session,
  loxtep_projects, loxtep_templates, loxtep_workflows, loxtep_connections, loxtep_data_products.
  Stories S0, S2, S3; orchestrates with create-connector for S1. See docs/skills-user-stories.md.
trigger: |
  TRIGGER when: User asks about or mentions creating/listing/updating data products, workflows,
  connections, connectors, ingestion pipelines, data mesh, omnichannel products, or consumptions
  in context of Loxtep. Includes patterns: "create data product", "build workflow", "ingest data",
  "setup connector", "unify data", "data mesh", "webhook consumption". Always invoke before making
  direct loxtep_data_products or loxtep_workflows MCP calls to ensure proper architecture
  (connectors → workflows → data products).
---

# Data mesh studio (Customer MCP)

End-to-end playbooks for **projects**, **workflow graphs**, **connections**, **data products**, and **webhook consumptions**, plus **session** context. Pair with **`create-connector`** for SaaS/API ingest (Shopify, etc.) or **SDK connector** for programmatic ingestion, and **`loxtep-instances`** for runtime provisioning.

## When to use

- **S0:** Confirm user and org (`get_current_user`, `get_current_organization`).
- **S2:** Create an **omnichannel** or unified **data product** across multiple sources in a project.
- **S3:** Register an **external webhook** for data product updates (`create_consumption`).
- User asks for **projects**, **flows**, **templates**, **connections** (project nodes), **data products**, **consumptions**, or **patch workflow graph**.
- **SDK / programmatic ingestion:** If the user wants to write events from their own code (not a SaaS connector), use the **`create-connector`** skill's **SDK Connector flow** (`connector_type: "sdk"`) to create the connector, then **`loxtep-sdk`** for SDK client usage. This skill handles the workflow graph and data products that receive those events.

## Prerequisites

- MCP login (`loxtep-auth` if JWT errors). For **permissions / 403**, see **`loxtep-mcp-session`** (`get_current_user` → `permissions`).
- **Project-scoped** calls require `project_id` in the same payload as `operation`.
- **Org-scoped** data products / consumptions: use `data_product_id` as required by each operation.

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

### Flow D — Webhook for data product updates (S3)

1. Obtain `data_product_id` (`list_data_products` / `get_data_product`).
2. `loxtep_data_products` → `create_consumption` with `data_product_id`, `endpoint_url`, optional `headers`, `secret_token`, `filters`, `delivery_method` (default webhook per platform).
3. Optional: `list_consumptions` to audit active subscriptions.

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
| 8 | Webhook consumptions | `loxtep_data_products` | `list_consumptions`, `create_consumption` | **organization** | `data_product_id`, `endpoint_url`, … |

## Pitfalls

- Missing **`project_id`** on project-scoped workflow/connection ops.
- **`patch_workflow_graph` requires two sequential calls** — you cannot add nodes and connect them in a single call because you need the returned entity IDs for `connect_nodes`. Attempting to guess or pre-generate IDs will fail validation.
- **`patch_workflow_graph` operations format** — The `operations` field is an **array of operation objects**, not a single operation. Each object must have an `op` field. Do NOT pass `type` instead of `op` (though the backend normalizes both, prefer `op`).
- **`entity_type` must use hyphens** — Use `data-products` (not `data_products`), `quality-rules` (not `quality_rules`).
- **`apply_template`** requires `project_id` — not the same as org-only template list.
- **`test_connection`** — Loads connection from workspace storage; runs an optional **HTTP GET** probe only when the saved configuration includes a URL-like field (`base_url`, `url`, `host`, …). Otherwise it confirms the entity exists without a live probe.
- **`create_transformation`** / **`create_validation`** — Require an **existing workflow graph** (`get_workflow_graph` / prior `patch_workflow_graph`). If the graph is missing, the tool fails with a not-found style error.
- **Paid plans vs shared instance** — provisioning is **`loxtep-instances`**, not this skill.
- **Agent issues/goals** — use **`loxtep-agent-workspace`**, not `loxtep_projects`.

## Optional attribution

```json
{
  "operation": "create_data_product",
  "project_id": "...",
  "_metadata": { "skill_name": "data-workflows" }
}
```

## Auth

`npx @loxtep/customer-mcp-server login` — see **`loxtep-auth`**.

## References

- [User story catalog](../../../docs/skills-user-stories.md) (this repo)
