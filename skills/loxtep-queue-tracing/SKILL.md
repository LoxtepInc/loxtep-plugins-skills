---
name: loxtep-queue-tracing
description:
  Trace rstreams bots and queues for deployment or data-flow failures. Use when
  debugging stuck workflows, missing events, bot checkpoints, or Observe/botmon
  empty results. Read queue events from the live runtime. Trace actions through
  the platform event queues to see what actually happened. Combines
  loxtep_observe (read_queue_events) with knowledge of queue naming conventions.
  User story S7 extension. See docs/skills-user-stories.md.
---

# Queue tracing for debugging (Customer MCP)

**Pattern:** Trigger an action → read the output/error queues → understand what
happened at the system level.

## When to use

- After a **deployment** fails or behaves unexpectedly
- When a **workflow execution** produces no output or errors silently
- When **data flow** stops at a node (connection, transform, validation,
  delivery)
- When you need to verify an **event was emitted** correctly
- Debugging **"nothing happened"** scenarios where logs are insufficient

## Prerequisites

- MCP auth (`loxtep-auth`)
- Access to `read_queue_events` on **`loxtep_observe`**
- Knowledge of the instance **namespace** — ask the user, or derive from CLI
  `loxtep instances stream-config` / REST stream-config / SDK
  `client.workspace.instances.get_stream_config`, not from MCP `list_instances`

## Queue naming conventions

The platform uses predictable queue names. Given an instance namespace and
microservice:

### Deployment queues

| Queue pattern                                  | Contains                                                     |
| ---------------------------------------------- | ------------------------------------------------------------ |
| `{ns}-workflows-workflow-deployment-requested` | Deployment trigger events (workflow_id, instance_id, org_id) |
| `{ns}-workflows-workflow-deployment-errors`    | Deployment failures (error messages, stack traces)           |
| `{ns}-workflows-project-deploy-requested`      | Project-level deploy triggers (fans out to per-workflow)     |

### Workflow execution queues (per deployed workflow)

Queue names include a **microservice_id** (`w-{org4}-{inst4}-{proj8}-{wf8}`) and
container_id:

| Suffix pattern                           | Node type          | Contains                               |
| ---------------------------------------- | ------------------ | -------------------------------------- |
| `{msId}-queue-{containerId}-source`      | Connection input   | Raw ingested data from external system |
| `{msId}-queue-{containerId}-ingested`    | Connection output  | Parsed/normalized data                 |
| `{msId}-queue-{containerId}-transformed` | Transform output   | Transformed records                    |
| `{msId}-queue-{containerId}-validated`   | Validation output  | Records that passed validation         |
| `{msId}-queue-{containerId}-delivered`   | Consumption output | Records delivered to target            |
| `{msId}-queue-{containerId}-err`         | Any node error     | Failed records with error details      |

### System queues

| Queue pattern                              | Contains                                    |
| ------------------------------------------ | ------------------------------------------- |
| `{ns}-workflows-customer-workspace-events` | Workspace mutations (project/workflow CRUD) |
| `{ns}-workflows-github-sync-requested`     | GitHub sync events                          |
| `{ns}-workflows-notifications`             | User notifications                          |

## `read_queue_events` response (do this first)

`loxtep_observe` `read_queue_events` calls `GET /app/observe/search` and returns
the botmon search body under **`events`**, with paging fields added
(`next_cursor`, `has_more`, `limit`). The tool also repeats `next_cursor`,
`has_more` and `limit` at the top level. The scan walks the stream **forward**
from `eid` (default: about 60 minutes before now). Matching events are appended
in that scan order — not reverse chronological, and not "most recent first."

On success the tool data looks like:

```json
{
  "queue_name": "lxappdev-workflows-workflow-deployment-errors",
  "search_eid": "z/2026/10/19/05/56/1792389360123-0000000",
  "instance_id": "9c5a188a-8e71-4bf7-b83c-362cc0e6d9bd",
  "events": {
    "results": [],
    "resumptionToken": null,
    "resumption_token": null,
    "next_cursor": null,
    "has_more": false,
    "limit": 10,
    "last_time": null,
    "count": 0,
    "scanned_count": 0,
    "agg": {},
    "scan_incomplete": false
  },
  "next_cursor": null,
  "has_more": false,
  "limit": 10
}
```

Unverified example of the response shape (not captured from a live instance).

| `events` field    | Meaning                                                                                                                                                                                                                                        |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `results`         | Matching events from this page, in forward scan order. At most `limit` events                                                                                                                                                                  |
| `next_cursor`     | Pass as the next request's `eid` to continue. `null` only when `has_more` is `false`                                                                                                                                                           |
| `has_more`        | `true`: more events may remain, so request the next page. `false`: this window is done                                                                                                                                                         |
| `limit`           | Effective page size after the server cap (at most 100)                                                                                                                                                                                         |
| `resumptionToken` | Resume eid (also `resumption_token`). On a 200 0-scan incomplete page whose botmon token is later than the request eid, this is the request eid. Botmon's later token is not published. Otherwise it is botmon's token. Page on `next_cursor`. |
| `scan_incomplete` | `true`: the time budget cut the scan short. `false`: the scan stopped on its own                                                                                                                                                               |
| `count`           | Events **scanned on this call**, not `results.length` (same as `scanned_count`; not summable)                                                                                                                                                  |
| `scanned_count`   | Explicit per-call scanned tally (same integer as `count`; resume may re-count boundary eid)                                                                                                                                                    |
| `last_time`       | Timestamp of the last scanned event, or `null`                                                                                                                                                                                                 |

**Empty `results` does not mean "no events".** Read the status with the page:

- **200**, `has_more: true`, `next_cursor` equal to the request `eid`: a 0-scan
  budget cut (#3481, #3368). Nothing was read, and botmon's token was later than
  the start, so the page resumes at the request eid. Pass that `next_cursor`
  back as `eid`. If you omitted `eid`, the server used the default anchor (now,
  minus 60 minutes, minus 1 second, terminal `-0000000`). `next_cursor` is that
  anchor. MCP also echoes it as `search_eid`. Pass that value back as `eid`.
  Omitting `eid` again computes a new, later anchor. If botmon's token is not
  later than the start, that token is kept.
- **503** `scan_incomplete`, and no `next_cursor`: events were scanned and none
  matched (#3547, #3485). That is not an empty queue. Botmon's token is not
  published.
- **200**, `has_more: false`, `next_cursor: null` is the only "no matching
  events" signal.

`has_more` is `true` on every `scan_incomplete` page that returns 200. It is
also `true` when the page is full (`results.length` equals `limit`), or when
botmon reports more (for example, its 4 MB per-call response budget cut a short
page). A short page is not the end of the window unless `has_more` is `false`.

There is no separate cursor input. Continue with:

```json
{
  "operation": "read_queue_events",
  "queue_name": "lxappdev-workflows-workflow-deployment-errors",
  "eid": "z/2026/10/17/19/02/1792263751456-0000000",
  "count": 10
}
```

Use the previous page's `next_cursor` as `eid`, and repeat until `has_more` is
`false`. Unverified example of the input shape (not captured from a live
instance).

### `count`

- Default 10.
- Values above 100 are accepted and capped at 100 per call. `limit` in the
  response shows the size that was used. Page with `next_cursor` for more.
- Fractions (`1.5`), `Infinity`, `NaN` and values below 1 are rejected with a
  validation error. They are never rounded or defaulted.

### `eid`

Since #3451 (#3436). The check is `queueEidPathTimestampMismatch`. The check
does not rewrite the path, replace the timestamp, or fall back to another read.

After the check passes, `ReadQueueEventsTool` calls `resolveObserveSearchEid`
(`platform-backend/_core/src/observe/search-eid.ts`). That normalization is the
same as before #3451. `normalizeTimelineEidForBotmonSearch` trims the eid and
appends `-0000000` when the last segment is a bare millisecond of 10 or more
digits. An omitted or blank eid becomes the default anchor.

Accepted: omitted or blank; `z/` and a path prefix through the minute, trailing
slash optional (`z/2026/10/17/19/02/`); a full
`z/YYYY/MM/DD/HH/mm/<n>[-<ordinal>]` whose numeric terminal `n` is `<= 10000` (a
seconds checkpoint); a millisecond terminal only when the UTC minute of that
millisecond equals the path.

Anything else is refused, including a path/timestamp mismatch and a malformed
value (`not-an-eid`, `z/foo`, `z/2026/10/25/00/00/nope`). The message is
`eid <eid> path and timestamp disagree` (`<eid>` is the trimmed value).

Through `loxtep_observe` the refusal is input validation, before HTTP: 400
`invalid_tool_input`. The composed message is not asserted end to end. From
`validateInput` it is
`Validation failed: eid: eid <eid> path and timestamp disagree`, with `details`
`{ "tool_name": "read_queue_events", "mcp_facade": "loxtep_observe", "code": "invalid_tool_input" }`.

Pass the previous page's `next_cursor` unchanged, or build the eid from one
timestamp (the path is the UTC minute of the millisecond), or use a path prefix
such as `z/2026/10/17/19/02/`.

Known issues, not fixed here:
[#3454](https://github.com/LoxtepInc/loxtep/issues/3454) (botmon `searchQueue`
builds `slice_end` from the eid milliseconds and orders the cursor by the date
path; an eid that reaches botmon another way can still 500 `slice_bounds_error`)
and [#3455](https://github.com/LoxtepInc/loxtep/issues/3455)
(`loadQueueSampleWindow` in `_core/src/observe/load-queue-samples.ts` forwards a
caller eid to the Observe proxy without this check).

### Errors (non-2xx)

Non-2xx Observe search responses are MCP failures. `error` is
`Observe search returned HTTP <status>`. `message` comes from
`formatObserveSearchError` (`platform-backend/ai/lib/tools/streaming.ts`): when
`error.details.downstream_response` is present, `message` is that value as JSON;
otherwise `message` is `error.message`.

The only window control is the start `eid`. The scan walks forward from `eid`
toward now. There is no end-of-window input on `McpReadQueueEventsInputSchema`
or on `GET /app/observe/search`. A later `eid` is how you narrow the window.

| HTTP | `code`                            | What to do                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| ---- | --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 503  | `scan_incomplete` (Loxtep, #3547) | Events were scanned and none matched. Message: `scan_incomplete page scanned events but returned 0 matches; refusing to publish the resumptionToken`. No `next_cursor`. The same request will likely 503 again. Use a later `eid`, or drop or broaden `search_text` and filter the events yourself. Paging a sparse filter to the end is a known limitation ([#3485](https://github.com/LoxtepInc/loxtep/issues/3485), open; botmon `searchQueue` half). Do not treat this as fixed. |
| 503  | `scan_incomplete` (botmon)        | The budget ran out before any slice completed, or before any event was read. Retry, or pass a later `eid`.                                                                                                                                                                                                                                                                                                                                                                           |
| 502  | `stream_read_failed`              | Stream read failed (e.g. DynamoDB capacity). Retry later; do not treat as an empty queue                                                                                                                                                                                                                                                                                                                                                                                             |
| 502  | `observe_search_shape_error`      | Botmon page broke the paging contract (e.g. `has_more` missing). Report it; do not treat as an empty queue                                                                                                                                                                                                                                                                                                                                                                           |
| 400  | `invalid_filter_expression`       | `search_text` was treated as a bad filter expression. Drop or simplify `search_text`                                                                                                                                                                                                                                                                                                                                                                                                 |

For the #3547 503, the MCP `message` is
`scan_incomplete page scanned events but returned 0 matches; refusing to publish the resumptionToken`
and nothing else. It starts with `scan_incomplete`. There is no separate `code`
field. If this tool re-shapes an older proxy page and throws, `error` is the
class name `ReadQueueEventsScanIncompleteError`, the message is that same
sentence, and there is no HTTP status.

For botmon's 503, the MCP `message` is the JSON of `downstream_response`, so it
contains `"code":"scan_incomplete"` and one of the two `error` strings below.

An eid refusal is not in this table: it fails input validation before HTTP (400
`invalid_tool_input`). Direct `GET /app/observe/search` callers get 400
`eid_path_timestamp_mismatch`.

For `observe_search_shape_error`, the MCP `message` is the contract error text
(for example `Missing required field: has_more`), not the code. If the MCP
tool's own check of the page fails, the error is `ReadQueueEventsContractError`
with that text and no HTTP status.

Unverified example of a 503 downstream body (not captured from a live instance).
Read at submodule pin `259d44d8` (`lambda/botmon/searchQueue/index.js`); the
submodule was not checked out here. `jsonError` sets `success: false` on the
thrown object. Queue and start below are placeholders.

```json
{
  "success": false,
  "code": "scan_incomplete",
  "error": "Search time budget expired before any slice completed; no safe resume position. Retry the request.",
  "queue": "ops-alert-requested",
  "start": "z/2026/10/17/19/00/",
  "slice_ms": 60000
}
```

```json
{
  "success": false,
  "code": "scan_incomplete",
  "error": "Search time budget expired before any event was read; no safe resume position. Retry the request.",
  "queue": "ops-alert-requested",
  "start": "z/2026/10/17/19/00/"
}
```

Unverified example of the #3547 HTTP 503 body (derived from `defaultErrorFilter`
and `errorResponse`; no test asserts this body):

```json
{
  "success": false,
  "error": {
    "message": "scan_incomplete page scanned events but returned 0 matches; refusing to publish the resumptionToken",
    "details": {
      "code": "scan_incomplete"
    }
  }
}
```

## Happy-path flows

JSON call shapes below are unverified templates (placeholders such as `{ns}`),
not live captures.

### Flow — Debug a failed deployment

1. Trigger or identify the deployment that failed.
2. Check the error queue:
   ```json
   {
     "operation": "read_queue_events",
     "queue_name": "{ns}-workflows-workflow-deployment-errors",
     "count": 5
   }
   ```
3. If `has_more` is `true`, call again with `eid` set to `next_cursor` until
   `has_more` is `false` or you have the event you need. Do not stop on empty
   `results`. A 503 after a scan that read events and matched none has no cursor
   — use a later `eid`, or drop `search_text` (the same request will likely 503
   again). A botmon 503 (no slice completed, or no event read) — retry, or pass
   a later `eid`. Handle 502 as in the table above.
4. Read the event payload — it contains the error message, workflow_id, and
   context.
5. Cross-reference with the deployment-requested queue to see the triggering
   event:
   ```json
   {
     "operation": "read_queue_events",
     "queue_name": "{ns}-workflows-workflow-deployment-requested",
     "count": 5
   }
   ```

### Flow — Verify data flow through a workflow

1. Identify the microservice_id from `get_runtime_mapping` or deployment logs.
2. Read the connection's output queue to confirm data is being ingested:
   ```json
   {
     "operation": "read_queue_events",
     "queue_name": "{msId}-queue-{containerId}-ingested",
     "count": 3
   }
   ```
3. Check downstream: transform output, then validation output.
4. If data stops at a node, check that node's error queue (`*-err`).

### Flow — Trace "nothing happened"

1. Start at the trigger queue (e.g., `*-deployment-requested` or `*-source`).
2. Call `read_queue_events`. **Do not conclude the queue is empty** from
   `events.results: []` alone:
   - `has_more: true` → continue with `eid` = `next_cursor`. On a 0-scan budget
     cut that cursor is the request eid. If you omitted `eid`, pass the returned
     default anchor back explicitly.
   - MCP error `Observe search returned HTTP 503` whose `message` is
     `scan_incomplete page scanned events but returned 0 matches; refusing to publish the resumptionToken`
     → not an empty queue and not transient. Use a later `eid`, or drop
     `search_text`. There is no cursor.
   - MCP error `Observe search returned HTTP 503` whose `message` is botmon JSON
     (`"code":"scan_incomplete"`, budget expired before any slice completed or
     before any event was read) → retry, or pass a later `eid`.
   - MCP error `Observe search returned HTTP 502` with
     `code: stream_read_failed` → retry later; the stream was not proven empty.
   - `has_more: false` → this window really has no matching events.
3. Once a complete page says the trigger event exists (or truly does not), walk
   downstream queue by queue until you find where events stop.
4. Check the error queue for the last node that received events.

### Flow — Verify event emission after code change

1. Make your change and trigger the action.
2. Read the expected output queue:
   ```json
   {
     "operation": "read_queue_events",
     "queue_name": "{ns}-workflows-{expected-queue}",
     "count": 1
   }
   ```
3. Continue from `next_cursor` while `has_more` is `true`. Then verify the event
   payload matches expectations.

## Tracing tips

- **Forward from `eid`:** omitted `eid` anchors about 60 minutes before now.
  Results are in scan order (older → newer in that window), not reverse
  chronological and not "most recent first."
- **Continue with `eid`:** pass `next_cursor` as `eid`. The input schema has
  `eid` only — no separate cursor field. Each call returns at most 100 events.
- **Use `search_text`** to filter for specific workflow_id, organization_id, or
  error messages. A `search_text` that looks like a `$.…` filter expression can
  400 with `invalid_filter_expression`.
- **Error queues are gold:** When something fails silently, the error queue
  (`*-err`) almost always has the real error with stack trace.
- **Queue names from deployment:** Use `get_runtime_mapping` (loxtep_build) to
  get exact queue names for a deployed workflow.
- **Do not scrape instance infra from `list_instances`.** That operation returns
  id/name/region/status/type/plan only. Queue prefixes come from
  `get_runtime_mapping`. Bus physical names: `loxtep instances stream-config`,
  not MCP.

## MCP operations used

| Operation             | Facade             | Purpose                                   |
| --------------------- | ------------------ | ----------------------------------------- |
| `read_queue_events`   | `loxtep_observe`   | Read actual event payloads from any queue |
| `get_queue_info`      | `loxtep_observe`   | Get queue metadata for a data product     |
| `get_runtime_mapping` | `loxtep_build`     | Resolve deployed queue/bot names          |
| `list_instances`      | `loxtep_workspace` | Confirm instance_id / status / type       |

## Pitfalls

- **Do not hand-build a mismatched `eid`.** A path and a millisecond from
  different instants, or a truncated token, is refused and not rewritten. Pass
  `next_cursor` unchanged, build both parts from one timestamp, or use a path
  prefix. See `eid` above.
- **Empty `results` is not "nothing happened":** only `has_more: false` means
  this window has no matching events. A 503 `scan_incomplete` on a filtered
  search is not an empty queue and not transient; narrow with a later `eid` or
  drop `search_text`. A 502 `stream_read_failed` or 502
  `observe_search_shape_error` is not an empty queue. Known issue
  [#3518](https://github.com/LoxtepInc/loxtep/issues/3518): a long run of empty
  hour slices also reports scanned 0, so following `next_cursor` can return the
  same eid repeatedly and not advance.
- **Namespace matters:** Queue names are namespace-prefixed. Using the wrong
  namespace can look empty — still apply the completeness check above before
  concluding that.
- **Queue observability required:** `read_queue_events` needs your instance to
  support queue inspection. If unavailable, use the Loxtep UI or contact
  support.
- **Queue may not exist:** If a workflow was never deployed or a node was
  removed, its queues won't exist in the runtime.
- **Event retention:** Queues retain events based on the instance's retention
  policy. Very old events may be unavailable.

## Skill attribution (required)

MCP tool calls need a resolvable skill name. Prefer
`_metadata: { "skill_name": "loxtep-queue-tracing" }`; otherwise the server
infers from the operation map or `X-Skill-Name`. Unresolvable calls are denied
(`MISSING_SKILL_ATTRIBUTION`). The skill name also drives scope checks.

## Auth

`loxtep-auth` / login.

## References

- [loxtep-workspace Agent-Scope Skill](../loxtep-workspace/SKILL.md)
- [loxtep-deployments Agent-Scope Skill](../loxtep-deployments/SKILL.md)
- [User story catalog](../../../docs/skills-user-stories.md)
