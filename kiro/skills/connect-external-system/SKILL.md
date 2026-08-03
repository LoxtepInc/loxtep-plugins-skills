<!-- GENERATED FILE -- edit skills/<slug>/SKILL.md (or rule.mdc.src.md) and run `node scripts/generate-skills.mjs` -- do not edit directly -->
---
name: connect-external-system
description:
  Use when the user wants to connect a data source — Shopify, Salesforce,
  QuickBooks, Slack, or any SaaS/API — into Loxtep. Covers OAuth, API keys, SDK
  connectors, and capturing sample data. This is the Connect step: stops at
  samples, does not wire workflows.
license: MIT
compatibility: opencode
metadata:
  platform: loxtep
  category: connectors
  documentation: https://github.com/LoxtepInc/loxtep-plugins-skills/blob/main/kiro/skills/connect-external-system/SKILL.md
---

# Connect external system

## Step boundary (CRITICAL)

| Step                     | Ends with                                            | Do NOT do in this step                |
| ------------------------ | ---------------------------------------------------- | ------------------------------------- |
| **Connect**              | `connector_id`, tested credentials, captured samples | Any workflow writes                   |
| **Organize** (next step) | Full workflow saved and deployed                     | Piecemeal graph patches for new flows |

**Prerequisite:** A Loxtep **project** must exist before building the workflow
(`create_project` or reuse — see **`data-workflows`**). When GitHub-attached,
write bundle JSON under `workflows/{workflow_id}/` locally and sync to Loxtep.

**Connection nodes are workflow entities.** Include them in the workflow bundle
(`connections/{id}.json` with `connector_id`) during the next step — not here.

- **Trigger** — put this connector at the **ingest head** of an ingestion
  workflow.
- **Target** — put a (possibly different) connector at the **delivery tail** of
  a delivery workflow (`workflow_type: "delivery"`). See **`data-workflows`**
  Flow D.

After Connect completes, hand off to **`data-workflows`** to build the workflow
(`get_entity_schemas` → `save_workflow_bundle` → `deploy_workflow`). Code-first
CLI: `ingest create` → `transform create` → `delivery create` → `lint` → `push`
→ `deploy`.

## When to use

- "Connect **Shopify** / **Salesforce** / …"
- "**OAuth** for a connector" or "**API key** connector"
- "**SDK connector**" or "programmatic ingestion"
- `list_connector_types`, `create_connector`, `update_connector`,
  `get_oauth_url`, `test_connector`, `capture_samples`
- Apply a **connector** catalog template (`apply_template` with connector
  template)

**Not this skill:** building or patching workflow graphs, creating data
products, or deploying — use **`data-workflows`** and **`loxtep-deployments`**.

## Prerequisites

- MCP auth (`loxtep-auth`).
- **`project_id`** only when applying project templates (not required for org
  connector creation).

## Happy-path flows

### Flow — OAuth (e.g. Shopify)

| Step | Action                       | Tool             | `operation`                              |
| ---- | ---------------------------- | ---------------- | ---------------------------------------- |
| 1    | Discover types               | `loxtep_connect` | `list_connector_types`                   |
| 2    | Start OAuth                  | `loxtep_connect` | `get_oauth_url`                          |
| 3    | User completes browser OAuth | —                | —                                        |
| 4    | Connectivity probe           | `loxtep_connect` | `test_connector`                         |
| 5    | Capture samples              | `loxtep_connect` | `capture_samples` (`entity_type` required) |
| 6    | **Hand off to studio**       | —                | **`data-workflows`** with `connector_id` |

### Flow — API key / SFTP / file-transfer connector

| Step | Action                                                          | Tool             | `operation`                                |
| ---- | --------------------------------------------------------------- | ---------------- | ------------------------------------------ |
| 1    | `list_connector_types`                                          | `loxtep_connect` | `list_connector_types`                     |
| 2    | `create_connector` with `connector_type` + credentials/metadata | `loxtep_connect` | `create_connector`                         |
| 3    | Connectivity probe                                              | `loxtep_connect` | `test_connector`                           |
| 4    | Capture samples                                                 | `loxtep_connect` | `capture_samples` (`entity_type` required) |
| 5    | **Hand off to studio**                                          | —                | **`data-workflows`** with `connector_id`   |

### Flow — SDK connector

| Step | Action                   | Tool             | `operation`                                          |
| ---- | ------------------------ | ---------------- | ---------------------------------------------------- |
| 1    | Confirm `"sdk"` in types | `loxtep_connect` | `list_connector_types`                               |
| 2    | Create SDK connector     | `loxtep_connect` | `create_connector`                                   |
| 3    | Optional connectivity probe | `loxtep_connect` | `test_connector` (SDK probe is a no-op pass)      |
| 4    | **Hand off to studio**   | —                | **`data-workflows`** — SDK connection goes in bundle |

SDK bootstrap (post-deploy) uses **`loxtep-sdk`**; see **`data-workflows`** Flow
G.

### Flow — Connector template from catalog

1. `loxtep_connect` → `list_templates` / `get_template` (optional).
2. `loxtep_connect` → `apply_template` with `project_id`, `template_type`,
   `template_slug`. (Templates write bundles internally — still prefer reviewing
   via `get_workflow_graph` before deploy.)

## How to test / preview samples (use these — do not invent CLI)

| Goal | MCP | CLI | Studio |
| ---- | --- | --- | ------ |
| Connectivity / credentials | `loxtep_connect` → `test_connector` (`connector_id`) | `loxtep connectors test <connector_id>` | Connection test in Studio |
| Live sample rows + schema | `loxtep_connect` → `capture_samples` (`connector_id`, **`entity_type`**, optional `limit` 1–25) | `loxtep connectors capture-samples <id> --entity-type <name> [--limit N]` | Preview on connection entity |

**Forbidden / do not invent:**

- `loxtep connector test …` (singular `connector`) — **does not exist**
- `loxtep connectors test … --entity … --limit …` — `test` has no sample flags; use `capture-samples`
- `loxtep test <module>` — runs a **workflow module** locally, not a connector

Example (MCP):

```json
{ "operation": "test_connector", "connector_id": "<uuid>" }
```

```json
{
  "operation": "capture_samples",
  "connector_id": "<uuid>",
  "entity_type": "products",
  "limit": 10
}
```

## MCP mapping

| User intent      | Tool             | `operation`            | Scope        |
| ---------------- | ---------------- | ---------------------- | ------------ |
| List types       | `loxtep_connect` | `list_connector_types` | global       |
| Create connector | `loxtep_connect` | `create_connector`     | organization |
| Update connector | `loxtep_connect` | `update_connector`     | organization |
| OAuth URL        | `loxtep_connect` | `get_oauth_url`        | organization |
| Test connectivity | `loxtep_connect` | `test_connector`      | organization |
| Capture samples  | `loxtep_connect` | `capture_samples`      | organization |
| Apply template   | `loxtep_connect` | `apply_template`       | **project**  |

## Pitfalls

- **Workflow graph writes during connect** — Connect ends at samples; use
  **`data-workflows`** + **`save_workflow_bundle`** for Organize.
- **`file-transfer` / SFTP:** set `credential_parameter_store_refs` on the
  **connection entity inside the bundle**, not only on the org connector.
- Org-level connector credentials are **not** auto-merged onto graph nodes at
  deploy; copy refs onto the bundle connection node when needed.
- **`capture_samples` requires `entity_type`** — for file-transfer, use the
  entity key from connector metadata / fileSpecs (not a filesystem path unless
  that is how the provider names the entity).

## References

- Next step: **`data-workflows`** (build the workflow)
- Full journey: **`loxtep-journey-orchestrator`**

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

## Implementation notes

- PKO: `procedure#connect-external-system` (P1) →
  `procedure#capture-connector-samples` → `procedure#design-ingestion-workflow`
  (P2)
- PKO graph:
  `platform-backend/graph/platform-pko/connect-external-system.jsonld`

## Auth

Reconnect the Loxtep MCP server to re-trigger OAuth — see **`loxtep-auth`**.
