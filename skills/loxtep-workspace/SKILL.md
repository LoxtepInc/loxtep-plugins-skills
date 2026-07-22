---
name: loxtep-workspace
description:
  Use when the user wants workspace versions, snapshots, restore or compare versions,
  reindex workspace, queue info, read queue events, or replay events. Customer MCP loxtep_workspace. User story S7.
  See docs/skills-user-stories.md.
---

# Workspace versions and operations (Customer MCP)

**Story S7:** **Versioning**, **snapshots**, **restore/compare**, **reindex**, **queue visibility**, **event reading**, **event replay**.

## When to use

- "**Snapshot** workspace", "**restore** version", "**compare** versions", "**reindex**", "**queue** depth", "**read queue** events", "**replay** events"

## Prerequisites

- MCP auth (`loxtep-auth` on JWT errors).
- **Project-scoped:** `list_versions`, `create_snapshot`, `restore_version`, `compare_versions`, `reindex_workspace` — pass **`project_id`** per tool contract.
- **Queue / replay:** pass **`data_product_id`** (UUID) when you need real queue metadata. Pass `data_product_id` when you need queue metadata bound to a data product; with only `queue_name` you may get a name-only hint.
- **Read queue events:** pass the full **`queue_name`** (fully qualified queue name, e.g. `{namespace}-workflows-workflow-deployment-errors`). Requires queue observability for your instance.

## Limitations

- **`get_queue_info`** — Loads data product detail when `data_product_id` is set and the platform API is reachable; response includes the stream queue binding in `storage` / ingestion hints when present.
- **`read_queue_events`** — Reads recent events from a queue. Pass `queue_name` (required), optional `eid` (start position), optional `search_text` (payload filter), and `count` (default 10, max 100). Returns event payloads.
- **`replay_events`** — Does not replay historical events over MCP. The tool records your request and returns guidance in the response; use the Loxtep UI for full replay workflows.

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
- **`get_queue_info` / `replay_events`** — If the data product could not be loaded, verify your instance connection and permissions, not just MCP login.
- **`read_queue_events`** — Requires queue observability for your instance. The `queue_name` must be the full namespace-prefixed queue name.

<!-- SCOPE_BLOCK -->

## Optional attribution

`_metadata: { "skill_name": "loxtep-workspace" }`

## Auth

`loxtep-auth` / login.

## References

- [User story catalog](../../../docs/skills-user-stories.md)
