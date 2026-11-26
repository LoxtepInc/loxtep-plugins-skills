---
name: loxtep-workspace
version: 1.0.1
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

## Set / clear environment_key

`metadata.environment_key` is an open string segregation key (franchise,
location, `stage`, `prod`, `dev`, or any other lowercase slug), not a closed
set. Same `logical_key` + a different key are sibling products. Unset or blank
shows **env missing**. Do not invent `prod` or invent peers. Aliases only:
`staging`→`stage`, `production`→`prod`. Set or clear it with the REST PUT in
**`loxtep-instances`**. Hosted MCP `update_instance` on this tree rejects
`metadata` and `environment_key`. CLI `--environment-key` (empty clears) and SDK
`instances.update` `environment_key` are
[loxtep-sdk#127](https://github.com/LoxtepInc/loxtep-sdk/pull/127) (open;
published npm not checked — unverified). Configure Instance has a free-text
Environment key field. Blank clears (stores `""`). The dialog lowercases and
applies the two aliases before the PUT. HTTP create stores `dev` when the key is
omitted. That default is a convenience, not a closed vocabulary.

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
   not a supported user path. Hosted MCP `restore_version` requires `version_id`
   and `instance_id` (UUID of the target instance). It forwards both to Pull
   (`commit_sha` + `instance_id`) and restores into that instance's workspace
   bucket. A missing, blank, or non-UUID `instance_id` fails validation. Pull
   `PostInputSchema` requires `instance_id`; a missing, blank, or non-UUID value
   on Pull is HTTP 400 from validation. CLI/SDK Pull require `instance_id`
   (loxtep-sdk#125). A failed workflows response from `list_versions`,
   `create_snapshot`, `restore_version`, or `compare_versions` sets
   `error_class` from the REST status. REST 404 is tools/call HTTP 404
   `tool_failed` with `error.details.error_class` `not_found`. REST 409 is
   tools/call HTTP 400 `tool_failed` with `error.details.error_class`
   `validation`. `error.details.code` stays `tool_failed`. REST
   `error.details.code` (`target_instance_missing`, `ambiguous_instance`,
   `instance_id_mismatch`, `project_metadata_unavailable`) is forwarded in
   `details.code` and is not copied onto `error.details.code`. A REST 500 leaves
   `error_class` unset and resolves to `execution` (tools/call HTTP 500) when
   the message does not match the classifier.

### Flow — Reindex after bulk import

1. `reindex_workspace` with `project_id` and optional `instance_id` (recommended
   for multi-instance orgs — same fail-closed resolve as Studio). Omitting
   `instance_id` resolves from pin/binding or a sole live dedicated instance
   before emit. On success the event includes that resolved dedicated
   `instance_id`. The indexer bot opens that instance's bucket only. It does not
   copy a project prefix from the platform bucket. When `.loxtep/project.json`
   is missing on the opened bucket, the index fails (`Indexing failed`) with the
   reader's message. On an unbound project in an org with two or more live
   dedicated instances and no `instance_id`, the tool call fails before enqueue.
   The error text is
   `Organization has N dedicated instances and the project workspace bucket is ambiguous. Refusing to fall back to the platform bucket.`
   The tools/call response is HTTP 400 `tool_failed` with
   `error.details.error_class` `validation`. `error.details.code` stays
   `tool_failed`. The domain code `ambiguous_instance` is not copied. Nothing is
   emitted.

### Resource — `loxtep_workspace_context`

`resources/list` includes `loxtep://workspace_context`. Read with:

`loxtep://workspace_context?project_id=<uuid>&instance_id=<uuid>`

Both query params are required. The JSON projection lists design-time entity
ids/names (from `customer_workspace_entity_index`), org connectors, and instance
`environment_key`. Project tools still require explicit `project_id`.
`instance_id` is not required on every project `tools/call`. Most project
operations do not take it. Project operations that require `instance_id`:
`deploy_project`, `deploy_workflow`, `restore_version`,
`set_connection_instance_binding`. Project operations that take an optional
`instance_id`: `archive_workflow`, `list_connection_instance_bindings`,
`reindex_workspace`, `reset_backfill`, `save_delivery_grant`,
`update_delivery_grant`. `create_project` takes an optional `instance_id`.
`get_project_workspace_status` accepts an optional `instance_id` only inside
`local_hint`. Hosted MCP does not auto-inject scope from the resource.

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
  `instance_id` is not a supported user path. Hosted MCP `restore_version`
  requires `version_id` and `instance_id` (UUID of the target instance). It
  forwards both to Pull (`commit_sha` + `instance_id`) and restores into that
  instance's workspace bucket. A missing, blank, or non-UUID `instance_id` fails
  validation. Pull `PostInputSchema` requires `instance_id`; a missing, blank,
  or non-UUID value on Pull is HTTP 400 from validation. CLI/SDK Pull require
  `instance_id` (loxtep-sdk#125).
- **Studio Pull** requires a selected instance. Pull is disabled when none is
  selected (tooltip `Select an instance before pulling from GitHub`; the project
  page command menu uses subtitle `Select an instance first`). The Pull confirm
  button is also disabled. If Pull runs anyway, Studio throws
  `Select an instance before pulling from GitHub. Pull writes into that instance's workspace.`
  and does not POST. Callers must send `instance_id`. Studio never omits it.
  Pull `PostInputSchema` requires `instance_id`; a missing, blank, or non-UUID
  value is HTTP 400 from validation. CLI `loxtep projects pull` and SDK
  `github_pull` require `instance_id` (fail closed; loxtep-sdk#125). Hosted MCP
  `restore_version` requires `version_id` and `instance_id` (UUID of the target
  instance), forwards both to Pull, and restores into that instance's workspace
  bucket. A missing, blank, or non-UUID `instance_id` fails validation.
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
  conflict). Workspace open uses neither another instance bucket nor the
  platform bucket on mismatch. Reindex POST runs the full selection (pin or
  binding, then live dedicated instances) before enqueue and does not open S3.
- Workspace storage is always the selected instance's bucket. Open never copies
  from the platform bucket onto a dedicated `code_bucket`. When
  `.loxtep/project.json` is missing on the opened instance bucket, readers fail
  closed with HTTP 409 `project_metadata_unavailable`, including when the
  platform bucket still has the file. Materialize with pull from git / Studio on
  that instance. Pull and restore must send that instance's `instance_id`.
  Studio Pull never omits it. Pull `PostInputSchema` requires `instance_id`; a
  missing, blank, or non-UUID value is HTTP 400 from validation. CLI/SDK Pull
  require `instance_id` (loxtep-sdk#125). MCP `restore_version` requires
  `version_id` and `instance_id` (UUID of the target instance), forwards both to
  Pull, and restores into that instance's workspace bucket. A missing, blank, or
  non-UUID `instance_id` fails validation. The entities GET message is
  `Project metadata is unavailable at <key>`.
- Reindex POST runs the full workspace instance selection before enqueue and
  does not open S3. A pin or binding conflict is HTTP 409 `instance_id_mismatch`
  and nothing is enqueued. An explicit `instance_id` that is not a live instance
  of the organization is HTTP 404 `target_instance_missing`
  (`Instance <id> is not a live instance for this organization. Refusing to fall back to the platform bucket.`)
  and nothing is enqueued. An omitted `instance_id` on an unbound project in an
  org with two or more live dedicated instances is HTTP 409 `ambiguous_instance`
  (`Organization has N dedicated instances and the project workspace bucket is ambiguous. Refusing to fall back to the platform bucket.`)
  and nothing is enqueued. `error.details` has `code`, `name`
  `InstanceWorkspaceBucketError`, and `project_id`. Success returns
  `{ project_id, enqueued, correlation_id }`. The event includes the resolved
  dedicated `instance_id` even when the caller omitted it. When `instance_id` is
  present on the event, the indexer bot opens that instance's bucket only. A
  missing `.loxtep/project.json` there is `RuntimeError` `Indexing failed`, with
  the reader's message on the error payload. The bot does not copy from the
  platform bucket.
- Hosted MCP `reindex_workspace` accepts optional `instance_id`. Omitting it
  uses the same resolve and fails the tool call before enqueue on an unbound
  multi-dedicated case. The tool error text is the `ambiguous_instance` message.
  The tools/call response is HTTP 400 `tool_failed` with
  `error.details.error_class` `validation`. `error.details.code` stays
  `tool_failed`; the domain code is not copied. When that omitted call selects a
  stored `projects.instance_id` that is no longer live, the tool error text is
  the `target_instance_missing` message and the tools/call response is HTTP 404
  `tool_failed` with `error.details.error_class` `not_found`. On success the
  event includes the resolved dedicated `instance_id`. CLI `loxtep push` (saves
  the workflow bundle, then `projects.reindex`) and SDK `projects.reindex` POST
  reindex with `{}` (no `instance_id`; SDK source read, call not sent). On that
  unbound project the POST returns HTTP 409 `ambiguous_instance` and nothing is
  enqueued. Do not guess the oldest instance or the platform bucket.
  `POST /workflows/deployments` passes the resolved target instance id into the
  same open, including when the body omitted `instance_id` and the organization
  has one dedicated instance. That open reads that instance bucket only. See
  **`loxtep-deployments`**.

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
