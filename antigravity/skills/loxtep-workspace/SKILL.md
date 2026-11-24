---
name: loxtep-workspace
description:
  Workspace versions, snapshots, restore, and compare for Loxtep projects. Use
  when the user wants snapshot history, restore a version, or diff workspace
  state, reindex workspace, or project layer status / materialization plans
  (get_project_workspace_status, list_project_changes,
  plan_project_materialization). Customer MCP loxtep_workspace. For queue
  inspection use loxtep_observe (loxtep-queue-tracing). User story S7. See
  docs/skills-user-stories.md.
metadata:
  documentation: https://github.com/LoxtepInc/loxtep-plugins-skills/blob/main/antigravity/skills/loxtep-workspace/SKILL.md
---

<!-- GENERATED FILE -- single source: loxtep/scripts/plugins-skills-generate-skills.mjs. From the loxtep root run `PLUGINS_SKILLS_ROOT=<plugins-skills> node scripts/sync-skills-to-plugins-skills.mjs` (or that generator with PLUGINS_SKILLS_ROOT set). Do not edit client copies; do not run sibling scripts/generate-skills.mjs. -->

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

1. `reindex_workspace` with `project_id`. The hosted MCP operation does not take
   `instance_id`. Studio reindex sends the selected instance. The indexer bot
   opens that instance's bucket only. It does not copy a project prefix from the
   platform bucket. When `.loxtep/project.json` is missing on the opened bucket,
   the index fails (`Indexing failed`) with the reader's message. On an unbound
   project in an org with two or more live dedicated instances, MCP reindex
   still hits 409 `ambiguous_instance` in the indexer bot.

## MCP mapping

| Tool               | `operation`                                                                                                            | Scope                      |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------- | -------------------------- |
| `loxtep_workspace` | `list_projects`, `get_project`, `get_project_workspace_status`, `list_project_changes`, `plan_project_materialization` | **organization** / project |
| `loxtep_workspace` | `list_versions`, `create_snapshot`, `restore_version`, `compare_versions`, `reindex_workspace`                         | **project** (`project_id`) |

## Pitfalls

- **`restore_version`** is destructive relative to current state — snapshot
  first.
- Do not treat hosted MCP as able to `clone` onto disk — use the plan + CLI.
- `loxtep projects clone` of an unbound project fails (exit 1) when the opened
  workspace has no `.loxtep/project.json`. The export API returns 409
  `project_metadata_unavailable` and the message names the missing S3 key.
  Retrying will not help. Report the key rather than fabricating a
  `project.json` locally. Clone and export omit `instance_id`. When the open
  resolves one dedicated instance (one dedicated instance, a unique deploy pin,
  or stored `projects.instance_id`) and that bucket lacks the file, this 409
  still applies while another bucket has the file. Several live dedicated
  instances with no pin and no stored id return 409 `ambiguous_instance` before
  the missing-file check.
- A project in an organization with two or more live dedicated instances needs
  `instance_id` on `create_project`. The stored id is used when a later
  workspace open omits `instance_id` and deployment rows do not pin exactly one
  live dedicated instance. Studio workspace calls (entities GET, workspace PUT,
  single-entity GET/PUT/DELETE, workflow graph GET/PUT, reindex POST) accept
  optional `instance_id` (query; reindex also JSON body) and Studio sends the
  selected instance. An explicit id must match the project's unique deploy pin
  or stored binding when either is set (HTTP 409 `instance_id_mismatch` on
  conflict). The open uses neither another instance bucket nor the platform
  bucket on mismatch.
- Workspace storage is always the selected instance's bucket. Open never copies
  from the platform bucket onto a dedicated `code_bucket`. When
  `.loxtep/project.json` is missing on the opened instance bucket, readers fail
  closed with HTTP 409 `project_metadata_unavailable`, including when the
  platform bucket still has the file. Materialize with pull from git / Studio on
  that instance. The entities GET message is
  `Project metadata is unavailable at <key>`.
- Reindex POST returns `{ project_id, enqueued, correlation_id }`. When
  `instance_id` is present, the indexer bot opens that instance's bucket only. A
  missing `.loxtep/project.json` there is `RuntimeError` `Indexing failed`, with
  the reader's message on the error payload. The bot does not copy from the
  platform bucket.
- Hosted MCP `reindex_workspace`, CLI `loxtep push` (saves the workflow bundle,
  then `projects.reindex`), and SDK `projects.reindex` omit `instance_id`. On an
  unbound project in a multi-instance org, omitting `instance_id` is HTTP 409
  `ambiguous_instance` in the indexer bot for reindex. Do not guess the oldest
  instance or the platform bucket. `POST /workflows/deployments` passes the
  resolved target instance id into the same open, including when the body
  omitted `instance_id` and the organization has one dedicated instance. That
  open reads that instance bucket only. See **`loxtep-deployments`**.

## `eid` for `read_queue_events` (hard rules)

Legacy routing may still attribute `read_queue_events` to this skill. When you
call it (or when another skill routes through workspace), these rules are
mandatory — not tips:

- **Refuse invented eids.** Do not fabricate a cursor. Do not invent a
  millisecond. Do not pad with zeros.
- **Refuse zero-ms terminals** such as
  `z/2026/11/17/00/55/0000000000000-0000000`.
- **Refuse path-only prefixes** such as `z/2026/11/17/03/20/` (missing
  millisecond / ordinal).
- **Path UTC minute must match the millisecond.** A path and a terminal from
  different instants fail with `eid … path and timestamp disagree`. Do not retry
  a rewritten guess.
- **Prefer `next_cursor` unchanged** as the next `eid`. Do not rebuild or
  truncate it.
- Full paging contract, errors, and examples: **`loxtep-queue-tracing`**.

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

## Skill attribution (required)

MCP tool calls need a resolvable skill name. Prefer
`_metadata: { "skill_name": "loxtep-workspace" }`; otherwise the server infers
from the operation map or `X-Skill-Name`. Unresolvable calls are denied
(`MISSING_SKILL_ATTRIBUTION`). The skill name also drives scope checks.

## Auth

`loxtep-auth` / login.

## References

- [User story catalog](../../../docs/skills-user-stories.md)
- [Materialization plan](../../../platform-backend/ai/lib/tools/docs/project-materialization-plan.md)
