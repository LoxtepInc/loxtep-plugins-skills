---
name: connect-external-system
description:
  Use when the user wants to connect a data source — Shopify, Salesforce,
  QuickBooks, Slack, or any SaaS/API — into Loxtep. Covers OAuth, API keys,
  SDK connectors, and capturing sample data. This is the Connect step: stops
  at samples, does not wire workflows.
license: MIT
compatibility: opencode
metadata:
  platform: loxtep
  category: connectors
---

# Connect external system

## Step boundary (CRITICAL)

| Step | Ends with | Do NOT do in this step |
| ---- | --------- | ----------------------- |
| **Connect** | `connector_id`, tested credentials, captured samples | Any workflow writes |
| **Organize** (next step) | Full workflow saved and deployed | Piecemeal graph patches for new flows |

**Prerequisite:** A Loxtep **project** must exist before building the workflow
(`create_project` or reuse — see **`data-workflows`**). When GitHub-attached,
write bundle JSON under `workflows/{workflow_id}/` locally and sync to Loxtep.

**Connection nodes are workflow entities.** Include them in the workflow bundle
(`connections/{id}.json` with `connector_id`) during the next step — not here.

After Connect completes, hand off to **`data-workflows`** to build the workflow.

## When to use

- "Connect **Shopify** / **Salesforce** / …"
- "**OAuth** for a connector" or "**API key** connector"
- "**SDK connector**" or "programmatic ingestion"
- `list_connector_types`, `create_connector`, `get_oauth_url`,
  `capture_samples`
- Apply a **connector** catalog template (`apply_template` with connector
  template)

**Not this skill:** building or patching workflow graphs, creating data products,
or deploying — use **`data-workflows`** and **`loxtep-deployments`**.

## Prerequisites

- MCP auth (`loxtep-auth`).
- **`project_id`** only when applying project templates (not required for org
  connector creation).

## Happy-path flows

### Flow — OAuth (e.g. Shopify)

| Step | Action | Tool | `operation` |
| ---- | ------ | ---- | ----------- |
| 1 | Discover types | `loxtep_connect` | `list_connector_types` |
| 2 | Start OAuth | `loxtep_connect` | `get_oauth_url` |
| 3 | User completes browser OAuth | — | — |
| 4 | Test connector | `loxtep_connect` | (connector test via API after OAuth) |
| 5 | Capture samples | `loxtep_connect` | `capture_samples` |
| 6 | **Hand off to studio** | — | **`data-workflows`** with `connector_id` |

### Flow — API key connector

| Step | Action | Tool | `operation` |
| ---- | ------ | ---- | ----------- |
| 1 | `list_connector_types` | `loxtep_connect` | `list_connector_types` |
| 2 | `create_connector` with `connector_type` + credentials/metadata | `loxtep_connect` | `create_connector` |
| 3 | Capture samples | `loxtep_connect` | `capture_samples` |
| 4 | **Hand off to studio** | — | **`data-workflows`** with `connector_id` |

### Flow — SDK connector

| Step | Action | Tool | `operation` |
| ---- | ------ | ---- | ----------- |
| 1 | Confirm `"sdk"` in types | `loxtep_connect` | `list_connector_types` |
| 2 | Create SDK connector | `loxtep_connect` | `create_connector` |
| 3 | **Hand off to studio** | — | **`data-workflows`** — SDK connection goes in bundle |

SDK bootstrap (post-deploy) uses **`loxtep-sdk`**; see **`data-workflows`** Flow G.

### Flow — Connector template from catalog

1. `loxtep_connect` → `list_templates` / `get_template` (optional).
2. `loxtep_connect` → `apply_template` with `project_id`, `template_type`,
   `template_slug`. (Templates write bundles internally — still prefer reviewing
   via `get_workflow_graph` before deploy.)

## MCP mapping

| User intent | Tool | `operation` | Scope |
| ----------- | ---- | ----------- | ----- |
| List types | `loxtep_connect` | `list_connector_types` | global |
| Create connector | `loxtep_connect` | `create_connector` | organization |
| OAuth URL | `loxtep_connect` | `get_oauth_url` | organization |
| Capture samples | `loxtep_connect` | `capture_samples` | organization |
| Apply template | `loxtep_connect` | `apply_template` | **project** |

## Pitfalls

- **Workflow graph writes during connect** — Connect ends at samples; use **`data-workflows`** + **`save_workflow_bundle`** for Organize.
- **`file-transfer` / SFTP:** set `credential_parameter_store_refs` on the
  **connection entity inside the bundle**, not only on the org connector.
- Org-level connector credentials are **not** auto-merged onto graph nodes at
  deploy; copy refs onto the bundle connection node when needed.

## References

- Next step: **`data-workflows`** (build the workflow)
- Full journey: **`loxtep-journey-orchestrator`**

<!-- SCOPE_BLOCK -->

## Implementation notes

- PKO: `procedure#connect-external-system` (P1) → `procedure#capture-connector-samples` → `procedure#design-ingestion-workflow` (P2)
- PKO graph: `platform-backend/graph/platform-pko/connect-external-system.jsonld`

## Auth

Reconnect the Loxtep MCP server to re-trigger OAuth — see **`loxtep-auth`**.
