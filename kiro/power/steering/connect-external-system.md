<!-- GENERATED FILE -- edit skills/<slug>/SKILL.md (or rule.mdc.src.md) and run `node scripts/generate-skills.mjs` -- do not edit directly -->

# Connect external system (Customer MCP)

**PKO:** `procedure#connect-external-system` (P1) →
`procedure#capture-connector-samples` → **`procedure#design-ingestion-workflow`**
(P2, `data-workflows` skill).

## Phase boundary (CRITICAL)

| Phase | Ends with | Do NOT do in this phase |
| ----- | --------- | ------------------------ |
| **P1 Connect** | `connector_id`, tested credentials, captured samples | Any workflow graph writes (`save_workflow_bundle`, `patch_workflow_graph`, etc.) |
| **P2 Design** | Full workflow JSON saved via `save_workflow_bundle` (local files first) | Piecemeal graph patches for new flows |

**Prerequisite:** A Loxtep **project** must exist before P2 (`create_project` or
reuse — see **`data-workflows`** Flow B). When GitHub-attached, write bundle JSON
under `workflows/{workflow_id}/` locally and sync to Loxtep — do not author
inline-only MCP payloads.

**Connection nodes are workflow entities.** For agent-authored ingestion, include
them in the **`save_workflow_bundle`** `files` map (`connections/{id}.json` with
`connector_id`) during P2 — inside **`save_workflow_bundle`**, not during P1 connect.

After P1 completes, invoke **`data-workflows`** Flow E (compose bundle → dry run →
save).

## When to use

- "Connect **Shopify** / **Salesforce** / …"
- "**OAuth** for a connector" or "**API key** connector"
- "**SDK connector**" or "programmatic ingestion"
- `list_connector_types`, `create_connector`, `get_connector_oauth_url`,
  `capture_connector_samples`
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
| 1 | Discover types | `loxtep_connectors` | `list_connector_types` |
| 2 | Start OAuth | `loxtep_connectors` | `get_connector_oauth_url` |
| 3 | User completes browser OAuth | — | — |
| 4 | Test connector | `loxtep_connectors` | (connector test via API after OAuth) |
| 5 | Capture samples | `loxtep_connectors` | `capture_connector_samples` |
| 6 | **Hand off to studio** | — | **`data-workflows`** with `connector_id` |

### Flow — API key connector

| Step | Action | Tool | `operation` |
| ---- | ------ | ---- | ----------- |
| 1 | `list_connector_types` | `loxtep_connectors` | `list_connector_types` |
| 2 | `create_connector` with `connector_type` + credentials/metadata | `loxtep_connectors` | `create_connector` |
| 3 | Capture samples | `loxtep_connectors` | `capture_connector_samples` |
| 4 | **Hand off to studio** | — | **`data-workflows`** with `connector_id` |

### Flow — SDK connector

| Step | Action | Tool | `operation` |
| ---- | ------ | ---- | ----------- |
| 1 | Confirm `"sdk"` in types | `loxtep_connectors` | `list_connector_types` |
| 2 | Create SDK connector | `loxtep_connectors` | `create_connector` |
| 3 | **Hand off to studio** | — | **`data-workflows`** — SDK connection goes in bundle |

SDK bootstrap (post-deploy) uses **`loxtep-sdk`**; see **`data-workflows`** Flow G.

### Flow — Connector template from catalog

1. `loxtep_templates` → `list_templates` / `get_template` (optional).
2. `loxtep_templates` → `apply_template` with `project_id`, `template_type`,
   `template_slug`. (Templates write bundles internally — still prefer reviewing
   via `get_workflow_graph` before deploy.)

## MCP mapping (P1 only)

| User intent | Tool | `operation` | Scope |
| ----------- | ---- | ----------- | ----- |
| List types | `loxtep_connectors` | `list_connector_types` | global |
| Create connector | `loxtep_connectors` | `create_connector` | organization |
| OAuth URL | `loxtep_connectors` | `get_connector_oauth_url` | organization |
| Capture samples | `loxtep_connectors` | `capture_connector_samples` | organization |
| Apply template | `loxtep_templates` | `apply_template` | **project** |

## Pitfalls

- **Workflow graph writes during connect** — P1 ends at samples; use **`data-workflows`** + **`save_workflow_bundle`** for P2.
- **`file-transfer` / SFTP:** set `credential_parameter_store_refs` on the
  **connection entity inside the bundle**, not only on the org connector.
- Org-level connector credentials are **not** auto-merged onto graph nodes at
  deploy; copy refs onto the bundle connection node when needed.

## References

- PKO: `platform-backend/graph/platform-pko/connect-external-system.jsonld`
- Orchestration: **`loxtep-journey-orchestrator`**
- Studio design: **`data-workflows`** (Flow E — `save_workflow_bundle`)

## Auth

Reconnect the Loxtep MCP server to re-trigger OAuth — see **`loxtep-auth`**.

<!-- BEGIN loxtep skill-scope (skill-package-v1) -->

## Agent-Scope Skill scope (`.loxtep/skills/connect-external-system.yaml`)

Resource scope and operation permissions for this Agent-Scope Skill, conformant
with the [`skill-package-v1`](https://loxtep.io/schemas/skill-package-v1.json)
schema. Any resource type or operation not listed is **denied (fail-closed)**.
Identifier lists are empty placeholders — fill them with the specific resources
in your workspace. This declaration does not change the hosted MCP config
(`mcp.loxtep.io`).

```yaml
# .loxtep/skills/connect-external-system.yaml
# Conforms to https://loxtep.io/schemas/skill-package-v1.json
# Scoped to ONLY the identifiers listed; least-privilege per operation. Fail-closed.
name: connect-external-system
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
