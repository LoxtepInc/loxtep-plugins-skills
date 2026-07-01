---
name: create-connector
description:
  Use when the user wants to connect Shopify, Salesforce, QuickBooks, Slack, or another SaaS/API
  into Loxtep — OAuth, API keys, SDK connectors, list connector types, create org connector,
  get OAuth URL, add connection nodes to a project, or apply connector templates. Customer MCP
  loxtep_connectors, loxtep_connections, loxtep_templates. User story S1; then use data-workflows
  for graph and data products. For SDK-based programmatic ingestion, use the SDK connector flow.
  See docs/skills-user-stories.md.
---

# Connect systems and ingest (Customer MCP)

**Story S1:** Bring external systems (e.g. **Shopify**) into the mesh: org-level **connector**, then **project connection** (and optionally **connector template**). After connections exist, use **`data-workflows`** for workflow graph and data products.

## When to use

- "Connect **Shopify** / **Salesforce** / \u2026"
- "**OAuth** for a connector" or "**API key** connector"
- "**SDK connector**" or "programmatic ingestion" or "write events from my app"
- `list_connector_types`, `create_connector`, `get_connector_oauth_url`
- Add a **connection** node to a **project** (`create_connection`)
- Apply a **connector** catalog template (`apply_template` with connector template)

## Prerequisites

- MCP auth (`loxtep-auth`).
- **`project_id`** for `loxtep_connections` and for `apply_template` on project templates.

## Happy-path flows

### Flow \u2014 OAuth (e.g. Shopify)

| Step | Action | Tool | `operation` | Scope |
|------|--------|------|-------------|-------|
| 1 | Discover types | `loxtep_connectors` | `list_connector_types` | **global** |
| 2 | Start OAuth | `loxtep_connectors` | `get_connector_oauth_url` | organization |
| 3 | User completes browser OAuth | \u2014 | \u2014 | \u2014 |
| 4 | Attach to project | `loxtep_connections` | `create_connection` | **project** (`project_id`) |
| 5 | Wire into flow | `loxtep_workflows` | `patch_workflow_graph` | **project** \u2014 see **data-workflows** |

### Flow \u2014 API key connector

| Step | Action | Tool | `operation` |
|------|--------|------|-------------|
| 1 | `list_connector_types` | `loxtep_connectors` | `list_connector_types` |
| 2 | `create_connector` with `connector_type` + credentials/metadata | `loxtep_connectors` | `create_connector` |
| 3 | `create_connection` with `connector_id` + `project_id` | `loxtep_connections` | `create_connection` |

### Flow \u2014 SDK Connector

SDK connectors use `auth_type: "jwt"` \u2014 no OAuth, no external credential testing. The connector provides `sdk_config` with everything needed to bootstrap the Loxtep SDK for programmatic event ingestion.

| Step | Action | Tool | `operation` | Notes |
|------|--------|------|-------------|-------|
| 1 | Discover available types (confirm `"sdk"` is listed) | `loxtep_connectors` | `list_connector_types` | **global** scope |
| 2 | Create SDK connector | `loxtep_connectors` | `create_connector` | `connector_type: "sdk"`, provide `metadata.name` (required) and optional `metadata.data_product_name`. If the organization has more than one instance, `metadata.instance_id` is **required** (single-instance orgs fall back automatically) |
| 3 | Extract `sdk_config` from response | \u2014 | \u2014 | Response includes `sdk_config: { api_url, organization_id, project_id, instance_id, region }` |
| 4 | Guide user through SDK bootstrap | \u2014 | \u2014 | See bootstrap steps below |

**SDK bootstrap steps** (from `sdk_config`):

1. **Install SDK**: `npm install @loxtep/sdk` (Node.js) or `pip install loxtep` (Python)
2. **Authenticate**: `loxtep login` or set `LOXTEP_AUTH_TOKEN` environment variable
3. **Export config** (optional): `loxtep config export --from-connector "<connector_id>" --format sh`
4. **Write events**: Use `await client.data_products.get_writer('data-product-name')` — the SDK resolves queue, bot_id, and stream bus config automatically from deployment metadata. No manual configuration needed.

> **Key difference from OAuth/API key flows:** SDK connectors skip the `create_connection` step \u2014 the SDK writes directly to the Stream Bus using the `sdk_config`. No project-scoped connection node is needed for the initial bootstrap.

### Flow \u2014 Connector template from catalog

1. `loxtep_templates` \u2192 `list_templates` / `get_template` (optional).
2. `loxtep_templates` \u2192 `apply_template` with `project_id`, `template_type`, `template_slug`.

## MCP mapping

| User intent | Tool | `operation` | Scope | Notes |
|-------------|------|-------------|-------|-------|
| List types | `loxtep_connectors` | `list_connector_types` | global | No org id in scope metadata; includes `"sdk"` type |
| List org connectors | `loxtep_connectors` | `list_connectors` | organization | |
| Create connector | `loxtep_connectors` | `create_connector` | organization | |
| Create SDK connector | `loxtep_connectors` | `create_connector` | organization | `connector_type: "sdk"`, returns `sdk_config` in response |
| OAuth URL | `loxtep_connectors` | `get_connector_oauth_url` | organization | Not used for SDK connectors |
| CRUD connection node | `loxtep_connections` | `create_connection`, `update_connection`, `delete_connection`, `list_connections`, `get_connection`, `test_connection` | **project** | Always `project_id` |
| Apply template | `loxtep_templates` | `apply_template` | **project** | `project_id`, `template_type`, `template_slug` |

## Org connector vs workflow connection node (CRITICAL distinction)

| Concept | Tool | Operation | Scope | Purpose |
|---------|------|-----------|-------|---------|
| **Org-level connector** | `loxtep_connectors` | `create_connector` | organization | Stores credentials and config. Reusable across projects and workflows. Created once per source system. |
| **Workflow graph connection node** | `loxtep_workflows` | `patch_workflow_graph add_node entity_type: "connections"` | project / workflow | Wires the connector into a specific workflow graph. References the org connector via `connector_id`. Created per workflow. |

**Both are required for a working ingestion workflow.** The connector alone does nothing
at runtime. The connection node alone has nothing to authenticate with. Typical sequence:

```
1. loxtep_connectors \u2192 create_connector          # org-level, stores credentials
2. loxtep_connectors \u2192 test_connection           # verify credentials work
3. loxtep_workflows \u2192 create_workflow            # workflow entity, pass connector_id
4. loxtep_workflows \u2192 patch_workflow_graph       # add_node entity_type: "connections"
                                                 #   with connector_id referencing step 1
```

Do NOT confuse `loxtep_connections` (project-scoped connection entity, used mainly for
OAuth flows) with `patch_workflow_graph add_node entity_type: "connections"` (graph node
inside a workflow). For scheduled REST/SFTP ingestion, use `patch_workflow_graph` directly
to add the connection node \u2014 you do not need to call `create_connection` first.

## Pitfalls

- **`list_connector_types`** is **global** \u2014 do not assume org context for discovery.
- **`create_connection`** without **`project_id`** fails for project-scoped tool.
- **`test_connection`** \u2014 Optional HTTP GET when the stored connection config includes a probe URL; otherwise config-only success (same as **data-workflows** pitfalls).
- **SDK connectors** do **not** use OAuth or API key auth \u2014 do not call `get_connector_oauth_url` for `connector_type: "sdk"`. Authentication is handled via JWT (`loxtep login` or `LOXTEP_AUTH_TOKEN` env var).
- **SDK connector test** always returns `{ passed: true }` \u2014 there are no external credentials to validate.
- **New connector types** are **not** creatable via MCP — use `list_connector_types` for supported types, or contact Loxtep support to request new ones.

## Requesting new connector types

Not available via Customer MCP — request new connector types through Loxtep support.

<!-- BEGIN loxtep skill-scope (skill-package-v1) -->
## Agent-Scope Skill scope (`.loxtep/skills/create-connector.yaml`)

Resource scope and operation permissions for this Agent-Scope Skill, conformant with the [`skill-package-v1`](https://loxtep.io/schemas/skill-package-v1.json) schema. Any resource type or operation not listed is **denied (fail-closed)**. Identifier lists are empty placeholders — fill them with the specific resources in your workspace. This declaration does not change the hosted MCP config (`mcp.loxtep.io`).

```yaml
# .loxtep/skills/create-connector.yaml
# Conforms to https://loxtep.io/schemas/skill-package-v1.json
# Scoped to ONLY the identifiers listed; least-privilege per operation. Fail-closed.
name: create-connector
description: Manage connectors and project connection nodes.
scope:
  data_products: []
  connectors: []
  workflows: []
  domains: []
  queues: []
permissions:
  connectors: [read, create, write, delete]
```
<!-- END loxtep skill-scope (skill-package-v1) -->

## Optional attribution

```json
{
  "operation": "create_connector",
  "connector_type": "shopify",
  "_metadata": { "skill_name": "create-connector" }
}
```

SDK connector example:

```json
{
  "operation": "create_connector",
  "connector_type": "sdk",
  "metadata": { "name": "My SDK Connector" },
  "_metadata": { "skill_name": "create-connector" }
}
```

## Auth

Reconnect the Loxtep MCP server to re-trigger OAuth — see **`loxtep-auth`**.

## References

- [User story catalog](../../../docs/skills-user-stories.md)
- For SDK usage after connector creation, see the **`loxtep-sdk`** Agent-Scope Skill
