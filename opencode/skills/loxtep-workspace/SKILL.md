<!-- GENERATED FILE -- edit skills/<slug>/SKILL.md (or rule.mdc.src.md) and run `node scripts/generate-skills.mjs` -- do not edit directly -->
---
name: loxtep-workspace
description:
  Use when the user wants workspace versions, snapshots, restore or compare
  versions, reindex workspace, or project layer status / materialization plans
  (get_project_workspace_status, list_project_changes,
  plan_project_materialization). Customer MCP loxtep_workspace. For queue
  inspection use loxtep_observe (loxtep-queue-tracing). User story S7. See
  docs/skills-user-stories.md.
metadata:
  documentation: https://github.com/LoxtepInc/loxtep-plugins-skills/blob/main/opencode/skills/loxtep-workspace/SKILL.md
---

# Workspace versions and operations (Customer MCP)

**Story S7:** **Versioning**, **snapshots**, **restore/compare**, **reindex**,
plus **project layer status** / **materialization plans** (LOX-1189). Queue
visibility and event reading moved to **`loxtep_observe`** — see
**`loxtep-queue-tracing`**.

## When to use

- "**Snapshot** workspace", "**restore** version", "**compare** versions",
  "**reindex**"
- "**Project status**", "**clone** project", "**unpublished** changes",
  materialize local checkout from MCP
- For **queue** depth, **read queue** events, or **replay** — use
  **`loxtep-queue-tracing`** (`loxtep_observe`)

## Prerequisites

- MCP auth (`loxtep-auth` on JWT errors).
- **Project-scoped:** `list_versions`, `create_snapshot`, `restore_version`,
  `compare_versions`, `reindex_workspace`, `get_project_workspace_status`,
  `list_project_changes`, `plan_project_materialization` — pass **`project_id`**
  per tool contract.

## Limitations

- Version restore is destructive relative to current state — snapshot first.
- **Hosted MCP never writes local paths.** Materialization returns a
  `materialization_plan` (`actuator: "cli"`). Run `cli_commands` (typically
  `loxtep projects clone|link`) on the agent filesystem.

## Happy-path flows

### Flow — After attach: list → status → clone/link

1. `loxtep_workspace` → `list_projects` (rows include `github_state`,
   `next_action`; `local_present` is false on hosted MCP).
2. `get_project_workspace_status` with `project_id` (optional `local_hint` /
   `fetch_export_urls`).
3. Execute `materialization_plan.cli_commands` via CLI — do **not** invent a
   local write from MCP.
4. Re-check with CLI `loxtep status` / `loxtep projects list` before deep ingest
   or deploy (`data-workflows`).

### Flow — Unpublished changes

1. Prefer CLI `loxtep projects changes` on a linked workspace.
2. Or MCP `list_project_changes` with optional `local_manifest` (without
   manifest, Local→Cloud inventory is unavailable on hosted MCP).

### Flow — Safe rollback

1. `list_versions` with `project_id`.
2. `compare_versions` (optional) between current and target — pass `version_a`
   (required, UUID) and `version_b` (optional, UUID or the literal `"current"`;
   defaults to `"current"`).
3. `create_snapshot` before destructive change.
4. `restore_version` when approved.

### Flow — Reindex after bulk import

1. `reindex_workspace` with `project_id` (and params per API).

## MCP mapping

| Tool               | `operation`                                                                                                            | Scope                      |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------- | -------------------------- |
| `loxtep_workspace` | `list_projects`, `get_project`, `get_project_workspace_status`, `list_project_changes`, `plan_project_materialization` | **organization** / project |
| `loxtep_workspace` | `list_versions`, `create_snapshot`, `restore_version`, `compare_versions`, `reindex_workspace`                         | **project** (`project_id`) |

## Pitfalls

- **`restore_version`** is destructive relative to current state — snapshot
  first.
- Do not treat hosted MCP as able to `clone` onto disk — use the plan + CLI.

<!-- BEGIN loxtep skill-scope (skill-package-v1) -->

## Agent-Scope Skill scope (`.loxtep/skills/loxtep-workspace.yaml`)

Resource scope and operation permissions for this Agent-Scope Skill, conformant
with the [`skill-package-v1`](https://loxtep.io/schemas/skill-package-v1.json)
schema. Any resource type or operation not listed is **denied (fail-closed)**.
Identifier lists are empty placeholders — fill them with the specific resources
in your workspace. This declaration does not change the hosted MCP config
(`mcp.loxtep.io`).

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

## Implementation notes

Queue operations (`get_queue_info`, `read_queue_events`, `replay_events`,
`trigger_bot`) now live on **`loxtep_observe`**. Legacy routing from
`loxtep_workspace` still works server-side. See **`loxtep-queue-tracing`**.

Materialization plan shape:
`platform-backend/ai/lib/tools/docs/project-materialization-plan.md`.

## Optional attribution

`_metadata: { "skill_name": "loxtep-workspace" }`

## Auth

`loxtep-auth` / login.

## References

- [User story catalog](../../../docs/skills-user-stories.md)
- [Materialization plan](../../../platform-backend/ai/lib/tools/docs/project-materialization-plan.md)
