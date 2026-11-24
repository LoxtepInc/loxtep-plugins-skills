---
name: loxtep-workspace
version: 1.0.0
description:
  Workspace versions, snapshots, restore, and compare for Loxtep projects. Use
  when the user wants snapshot history, restore a version, or diff workspace
  state, reindex workspace, or project layer status / materialization plans
  (get_project_workspace_status, list_project_changes,
  plan_project_materialization). Customer MCP loxtep_workspace. For queue
  inspection use loxtep_observe (loxtep-queue-tracing). User story S7. See
  docs/skills-user-stories.md.
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
4. `restore_version` when approved. Restore uses the same `instance_id` gate as
   Pull. Callers must send the selected instance. Studio Restore version
   disables the Restore menu item and Restore confirm when no instance is
   selected. If restore runs anyway, Studio shows
   `Select an instance before pulling from GitHub. Pull writes into that instance's workspace.`
   and does not POST. With an instance selected, restore sends `instance_id` and
   `commit_sha` and writes that instance's workspace. Omitting `instance_id` is
   not a supported user path. `PostInputSchema` still marks `instance_id`
   optional, so a missing field is not HTTP 400 from validation. Hosted MCP
   `restore_version` still omits `instance_id` (`McpRestoreVersionInputSchema`
   has `version_id` only). That MCP path is not a supported way to choose an
   environment. CLI/SDK Pull require `instance_id` (loxtep-sdk#125).

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
  first. Callers must send `instance_id`. Studio Restore version disables the
  Restore menu item and Restore confirm when no instance is selected. If restore
  runs anyway, Studio shows
  `Select an instance before pulling from GitHub. Pull writes into that instance's workspace.`
  and does not POST. With an instance selected, restore sends `instance_id` and
  `commit_sha` and writes that instance's workspace. Checked against
  `restoreVersion-instance.test.ts` and `useProjectVersions.test.ts`. Omitting
  `instance_id` is not a supported user path. `PostInputSchema` still marks
  `instance_id` optional, so a missing field is not HTTP 400 from validation.
  Hosted MCP `restore_version` still omits `instance_id`. That MCP path is not a
  supported way to choose an environment. CLI/SDK Pull require `instance_id`
  (loxtep-sdk#125).
- **Studio Pull** requires a selected instance. Pull is disabled when none is
  selected (tooltip `Select an instance before pulling from GitHub`; the project
  page command menu uses subtitle `Select an instance first`). The Pull confirm
  button is also disabled. If Pull runs anyway, Studio throws
  `Select an instance before pulling from GitHub. Pull writes into that instance's workspace.`
  and does not POST. Callers must send `instance_id`. Studio never omits it. CLI
  `loxtep projects pull` and SDK `github_pull` require `instance_id` (fail
  closed; loxtep-sdk#125). Hosted MCP `restore_version` still omits it.
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
  that instance. Pull and restore must send that instance's `instance_id`.
  Studio Pull never omits it. Omitting `instance_id` on Pull is not a supported
  user path. CLI/SDK Pull require `instance_id` (loxtep-sdk#125). MCP
  `restore_version` still omits it. The entities GET message is
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

<!-- SCOPE_BLOCK -->

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
