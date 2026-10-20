<!-- GENERATED FILE -- edit skills/<slug>/SKILL.md (or rule.mdc.src.md) and run `node scripts/generate-skills.mjs` -- do not edit directly -->
---
name: loxtep-queue-tracing
description:
  Trace rstreams bots and queues for deployment or data-flow failures. Use when
  debugging stuck workflows, missing events, bot checkpoints, or Observe/botmon
  empty results. Read queue events from the live runtime. Trace actions through
  the platform event queues to see what actually happened. Combines
  loxtep_observe (read_queue_events) with knowledge of queue naming conventions.
  User story S7 extension. See docs/skills-user-stories.md.
metadata:
  documentation: https://github.com/LoxtepInc/loxtep-plugins-skills/blob/main/opencode/skills/loxtep-queue-tracing/SKILL.md
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
the botmon search body unchanged under **`events`**. The scan walks the stream
**forward** from `eid` (default: about 60 minutes before now). Matching events
are appended in that scan order — not reverse chronological, and not "most
recent first."

On success the tool data looks like:

```json
{
  "queue_name": "lxappdev-workflows-workflow-deployment-errors",
  "search_eid": "z/2026/10/19/05/56/1760854560123-0000000",
  "instance_id": "9c5a188a-8e71-4bf7-b83c-362cc0e6d9bd",
  "events": {
    "results": [],
    "resumptionToken": null,
    "last_time": null,
    "count": 0,
    "agg": {},
    "scan_incomplete": false
  }
}
```

Unverified example of the response shape (not captured from a live instance).

| `events` field    | Meaning                                                                                        |
| ----------------- | ---------------------------------------------------------------------------------------------- |
| `results`         | Matching events from this scan, in forward scan order                                          |
| `resumptionToken` | Last **scanned** eid (whether or not it matched). Pass as the next request's `eid` to continue |
| `scan_incomplete` | `true`: the time budget cut the scan short. `false`: the scan stopped on its own               |
| `count`           | Events **scanned**, not `results.length`                                                       |
| `last_time`       | Timestamp of the last scanned event, or `null`                                                 |

**Empty `results` does not mean "no events"** unless `scan_incomplete` is
`false` **and** `resumptionToken` is `null`. A budget-cut scan that matched
nothing still has `scan_incomplete: true` and a `resumptionToken` when any event
was scanned — continue. A queue that is empty after `eid` is a 200 with
`results: []`, `resumptionToken: null`, `scan_incomplete: false`.

There is no separate resumption input. Continue with:

```json
{
  "operation": "read_queue_events",
  "queue_name": "lxappdev-workflows-workflow-deployment-errors",
  "eid": "z/2026/10/17/19/02/b",
  "count": 10
}
```

Use the previous page's `events.resumptionToken` as `eid`. Unverified example of
the input shape (not captured from a live instance).

`scan_incomplete: false` means this scan stopped on its own (end of stream, a
full page of matches, or the post-match time cap), so `results` /
`resumptionToken` are authoritative. If `resumptionToken` is still set, request
the next page — a full page is not the end of the stream.

### Errors (non-2xx)

Non-2xx Observe/botmon responses are MCP failures: `error` is
`Observe search returned HTTP <status>`; `message` carries the downstream body
(or a stringified `downstream_response`).

| HTTP | `code`                      | What to do                                                                                                              |
| ---- | --------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| 503  | `scan_incomplete`           | Budget expired **before any event was scanned** — no resume position. Retry; or pass a later `eid` to narrow the window |
| 502  | `stream_read_failed`        | Stream read failed (e.g. DynamoDB capacity). Retry later; do not treat as an empty queue                                |
| 400  | `invalid_filter_expression` | `search_text` was treated as a bad filter expression. Drop or simplify `search_text`                                    |

Unverified example of a 503 downstream body (not captured from a live instance):

```json
{
  "success": false,
  "code": "scan_incomplete",
  "error": "Search time budget expired before any event was scanned; no resume position. Retry the request.",
  "queue": "ops-alert-requested",
  "start": "z/2026/10/17/19/00/",
  "scanned": 0
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
3. If `events.resumptionToken` is set, call again with `eid` set to that token
   until the page is complete (`scan_incomplete` false and no token, or you have
   the event you need). Handle 503/502 as above — do not stop on empty
   `results`.
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
   - `scan_incomplete: true` and a `resumptionToken` → continue with `eid` =
     that token.
   - MCP error `Observe search returned HTTP 503` with `code: scan_incomplete` →
     retry, or retry with a later `eid`.
   - MCP error `Observe search returned HTTP 502` with
     `code: stream_read_failed` → retry later; the stream was not proven empty.
   - `scan_incomplete: false` and `resumptionToken` null → this window really
     has no matching events.
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
3. Continue from `resumptionToken` if the first page is incomplete. Then verify
   the event payload matches expectations.

## Tracing tips

- **Forward from `eid`:** omitted `eid` anchors about 60 minutes before now.
  Results are in scan order (older → newer in that window), not reverse
  chronological and not "most recent first."
- **Continue with `eid`:** pass `events.resumptionToken` as `eid`. The input
  schema has `eid` only — no separate resumption field.
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

- **Empty `results` is not "nothing happened":** only `scan_incomplete: false`
  **and** no `resumptionToken` means this window has no matching events. A 503
  `scan_incomplete` or 502 `stream_read_failed` is not an empty queue.
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
