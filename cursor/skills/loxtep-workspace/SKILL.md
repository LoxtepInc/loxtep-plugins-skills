---
name: loxtep-workspace
description:
  Use when the user wants workspace versions, snapshots, restore or compare versions,
  reindex workspace, queue info, read queue events, or replay events. Customer MCP loxtep_workspace. User story S7.
  See docs/skills-user-stories.md.
metadata:
  documentation: https://github.com/LoxtepInc/loxtep-plugins-skills/blob/main/cursor/skills/loxtep-workspace/SKILL.md
---

# Workspace versions and operations (Customer MCP)

**Story S7:** **Versioning**, **snapshots**, **restore/compare**, **reindex**, **queue visibility**, **event reading**, **event replay**.

## When to use

- "**Snapshot** workspace", "**restore** version", "**compare** versions", "**reindex**", "**queue** depth", "**read queue** events", "**replay** events"

## Prerequisites

- MCP auth (`loxtep-auth` on JWT errors).
- **Project-scoped:** `list_versions`, `create_snapshot`, `restore_version`, `compare_versions`, `reindex_workspace` — pass **`project_id`** per tool contract.
- **Queue / replay:** pass **`data_product_id`** (UUID) when you need real queue metadata. Full hints require the AI runtime to call the platform **`GET /dataproducts/{id}`** (i.e. `platformApiBaseUrl` + auth on the server); with only `queue_name` you get a name-only hint.
- **Read queue events:** pass the full **`queue_name`** (RStreams queue ID, e.g. `lxappdev-workflows-workflow-deployment-errors`). Requires the Observe proxy to be configured on the AI runtime (`platformApiBaseUrl` + auth).

## Platform honesty (limits)

- **`get_queue_info`** — Loads data product detail when `data_product_id` is set and the platform API is reachable; response includes the stream queue binding in `storage` / ingestion hints when present.
- **`read_queue_events`** — Reads actual events from a queue via the Observe proxy search endpoint (same backend used by the UI). Pass `queue_name` (required), optional `eid` (start position), optional `search_text` (payload filter), and `count` (default 10, max 100). Returns event payloads.
- **`replay_events`** — **Does not** run historical stream replay over MCP. The tool records parameters and sets **`historical_replay_via_mcp: false`**; use Observe / consumer offset tools or **`POST /dataproducts/{id}/deliver-event`** for synthetic exercise — see tool response `message`.

## Happy-path flows

### Flow — Safe rollback

1. `list_versions` with `project_id`.
2. `compare_versions` (optional) between current and target — pass `version_a` (required, UUID) and `version_b` (optional, UUID or the literal `"current"`; defaults to `"current"`).
3. `create_snapshot` before destructive change.
4. `restore_version` when approved.

### Flow — Reindex after bulk import

1. `reindex_workspace` with `project_id` (and params per API).
2. `get_queue_info` to confirm backlog draining.

### Flow — Inspect queue events (debugging)

1. `read_queue_events` with `queue_name` and optional `count` (e.g. 5).
2. Optionally filter with `search_text` for specific payload content.
3. Use `eid` to paginate from a specific position in the stream.

## MCP mapping

| `operation` | Scope |
|-------------|-------|
| `list_versions`, `create_snapshot`, `restore_version`, `compare_versions`, `reindex_workspace` | **project** (`project_id`) |
| `get_queue_info`, `replay_events`, `read_queue_events` | **organization** |

## Pitfalls

- **`restore_version`** is destructive relative to current state — snapshot first.
- **`get_queue_info` / `replay_events`** — If the MCP response says the data product could not be loaded, verify deployment wiring for the AI service (platform base URL + auth), not just the client login.
- **`read_queue_events`** — Requires the Observe proxy to be configured. If you get "Observe proxy not configured", the AI runtime's `platformApiBaseUrl` is not set. The queue_name must be the full RStreams queue ID (namespace-prefixed).

<!-- BEGIN loxtep skill-scope (skill-package-v1) -->
## Skill scope (`.loxtep/skills/loxtep-workspace.yaml`)

Resource scope and operation permissions for this skill, conformant with the [`skill-package-v1`](https://loxtep.io/schemas/skill-package-v1.json) schema. Any resource type or operation not listed is **denied (fail-closed)**. Identifier lists are empty placeholders — fill them with the specific resources in your workspace. This declaration does not change the hosted MCP config (`mcp.loxtep.io`).

```yaml
# .loxtep/skills/loxtep-workspace.yaml
# Conforms to https://loxtep.io/schemas/skill-package-v1.json
# Scoped to ONLY the identifiers listed; least-privilege per operation. Fail-closed.
name: loxtep-workspace
description: Workspace versioning plus queue inspection and event reading (replay is not performed over MCP).
scope:
  data_products: []
  connectors: []
  workflows: []
  domains: []
  queues: []
  instances: []
permissions:
  data_products: [read]
  queues: [read]
  instances: [read]
```
<!-- END loxtep skill-scope (skill-package-v1) -->

## Optional attribution

`_metadata: { "skill_name": "loxtep-workspace" }`

## Auth

`loxtep-auth` / login.

## References

- [User story catalog](../../../docs/skills-user-stories.md)
