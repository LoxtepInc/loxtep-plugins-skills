---
name: connect-external-system
description:
  Use when the user wants to connect Shopify, Salesforce, QuickBooks, Slack, or
  another SaaS/API into Loxtep — OAuth, API keys, SDK connectors, list connector
  types, create org connector, get OAuth URL, add connection nodes to a project,
  or apply connector templates. Maps to PKO procedure procedure#connect-external-system.
  Customer MCP loxtep_connectors, loxtep_connections, loxtep_templates.
license: MIT
compatibility: opencode
metadata:
  platform: loxtep
  category: connectors
  pko_procedure: procedure#connect-external-system
---

# Connect external system (Customer MCP)

**PKO:** `procedure#connect-external-system` (P1) → `procedure#capture-connector-samples`.

**Story S1:** Bring external systems (e.g. **Shopify**) into the mesh: org-level
**connector**, then **project connection** (and optionally **connector
template**). After connections exist, use **`data-workflows`** for workflow
graph and data products.

## When to use

- "Connect **Shopify** / **Salesforce** / …"
- "**OAuth** for a connector" or "**API key** connector"
- "**SDK connector**" or "programmatic ingestion" or "write events from my app"
- `list_connector_types`, `create_connector`, `get_connector_oauth_url`
- Add a **connection** node to a **project** (`create_connection`)
- Apply a **connector** catalog template (`apply_template` with connector template)

## Prerequisites

- MCP auth (`loxtep-auth`).
- **`project_id`** for `loxtep_connections` and for `apply_template` on project templates.

## Happy-path flows

See the former **`create-connector`** skill for OAuth, API key, SDK, and template flows.
After `POST /connectors/{connector_id}/test` succeeds, route to **capture-connector-samples**
(standalone — never deploy to obtain samples).

## MCP mapping

| User intent          | Tool                 | `operation`               | Scope        |
| -------------------- | -------------------- | --------------------------- | ------------ |
| List types           | `loxtep_connectors`  | `list_connector_types`      | global       |
| Create connector     | `loxtep_connectors`  | `create_connector`          | organization |
| OAuth URL            | `loxtep_connectors`  | `get_connector_oauth_url`   | organization |
| CRUD connection node | `loxtep_connections` | `create_connection`, etc.   | **project**  |
| Test connection      | `loxtep_connections` | `test_connection`           | **project**  |

## References

- PKO: `platform-backend/graph/platform-pko/connect-external-system.jsonld`
- Orchestration: **`loxtep-journey-orchestrator`**
- Studio wiring: **`data-workflows`**
