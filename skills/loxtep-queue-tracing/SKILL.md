---
name: loxtep-queue-tracing
description:
  Use when debugging deployments, workflow execution, or data flow issues by reading
  queue events from the live runtime. Trace actions through the platform event queues to
  see what actually happened. Combines loxtep_observe (read_queue_events) with
  knowledge of queue naming conventions. User story S7 extension.
  See docs/skills-user-stories.md.
---

# Queue tracing for debugging (Customer MCP)

**Pattern:** Trigger an action → read the output/error queues → understand what happened at the system level.

## When to use

- After a **deployment** fails or behaves unexpectedly
- When a **workflow execution** produces no output or errors silently
- When **data flow** stops at a node (connection, transform, validation, delivery)
- When you need to verify an **event was emitted** correctly
- Debugging **"nothing happened"** scenarios where logs are insufficient

## Prerequisites

- MCP auth (`loxtep-auth`)
- Access to `read_queue_events` on **`loxtep_observe`**
- Knowledge of the instance **namespace** (from your instance record) — derive from the instance record or ask the user

## Queue naming conventions

The platform uses predictable queue names. Given an instance namespace and microservice:

### Deployment queues

| Queue pattern | Contains |
|---------------|----------|
| `{ns}-workflows-workflow-deployment-requested` | Deployment trigger events (workflow_id, instance_id, org_id) |
| `{ns}-workflows-workflow-deployment-errors` | Deployment failures (error messages, stack traces) |
| `{ns}-workflows-project-deploy-requested` | Project-level deploy triggers (fans out to per-workflow) |

### Workflow execution queues (per deployed workflow)

Queue names include a **microservice_id** (`w-{org4}-{inst4}-{proj8}-{wf8}`) and container_id:

| Suffix pattern | Node type | Contains |
|----------------|-----------|----------|
| `{msId}-queue-{containerId}-source` | Connection input | Raw ingested data from external system |
| `{msId}-queue-{containerId}-ingested` | Connection output | Parsed/normalized data |
| `{msId}-queue-{containerId}-transformed` | Transform output | Transformed records |
| `{msId}-queue-{containerId}-validated` | Validation output | Records that passed validation |
| `{msId}-queue-{containerId}-delivered` | Consumption output | Records delivered to target |
| `{msId}-queue-{containerId}-err` | Any node error | Failed records with error details |

### System queues

| Queue pattern | Contains |
|---------------|----------|
| `{ns}-workflows-customer-workspace-events` | Workspace mutations (project/workflow CRUD) |
| `{ns}-workflows-github-sync-requested` | GitHub sync events |
| `{ns}-workflows-notifications` | User notifications |

## Happy-path flows

### Flow — Debug a failed deployment

1. Trigger or identify the deployment that failed.
2. Check the error queue:
   ```json
   { "operation": "read_queue_events", "queue_name": "{ns}-workflows-workflow-deployment-errors", "count": 5 }
   ```
3. Read the event payload — it contains the error message, workflow_id, and context.
4. Cross-reference with the deployment-requested queue to see the triggering event:
   ```json
   { "operation": "read_queue_events", "queue_name": "{ns}-workflows-workflow-deployment-requested", "count": 5 }
   ```

### Flow — Verify data flow through a workflow

1. Identify the microservice_id from `get_runtime_mapping` or deployment logs.
2. Read the connection's output queue to confirm data is being ingested:
   ```json
   { "operation": "read_queue_events", "queue_name": "{msId}-queue-{containerId}-ingested", "count": 3 }
   ```
3. Check downstream: transform output, then validation output.
4. If data stops at a node, check that node's error queue (`*-err`).

### Flow — Trace "nothing happened"

1. Start at the trigger queue (e.g., `*-deployment-requested` or `*-source`).
2. Confirm the event exists and has correct payload.
3. Walk downstream queue by queue until you find where events stop.
4. Check the error queue for the last node that received events.

### Flow — Verify event emission after code change

1. Make your change and trigger the action.
2. Read the expected output queue:
   ```json
   { "operation": "read_queue_events", "queue_name": "{ns}-workflows-{expected-queue}", "count": 1 }
   ```
3. Verify the event payload matches expectations.

## Tracing tips

- **Most recent events first:** `read_queue_events` returns events in reverse chronological order by default.
- **Use `search_text`** to filter for specific workflow_id, organization_id, or error messages.
- **Error queues are gold:** When something fails silently, the error queue (`*-err`) almost always has the real error with stack trace.
- **Queue names from deployment:** Use `get_runtime_mapping` (loxtep_build) to get exact queue names for a deployed workflow.
- **Namespace from instance:** Get it from `list_instances` → instance record → `connection_details.observe_api.namespace`.

## MCP operations used

| Operation | Facade | Purpose |
|-----------|--------|---------|
| `read_queue_events` | `loxtep_observe` | Read actual event payloads from any queue |
| `get_queue_info` | `loxtep_observe` | Get queue metadata for a data product |
| `get_runtime_mapping` | `loxtep_build` | Resolve deployed queue/bot names |
| `list_instances` | `loxtep_workspace` | Get instance namespace |

## Pitfalls

- **Namespace matters:** Queue names are namespace-prefixed. Using the wrong namespace returns empty results.
- **Queue observability required:** `read_queue_events` needs your instance to support queue inspection. If unavailable, use the Loxtep UI or contact support.
- **Queue may not exist:** If a workflow was never deployed or a node was removed, its queues won't exist in the runtime.
- **Event retention:** Queues retain events based on the instance's retention policy. Very old events may be unavailable.

## Optional attribution

`_metadata: { "skill_name": "loxtep-queue-tracing" }`

## Auth

`loxtep-auth` / login.

## References

- [loxtep-workspace Agent-Scope Skill](../loxtep-workspace/SKILL.md)
- [loxtep-deployments Agent-Scope Skill](../loxtep-deployments/SKILL.md)
- [User story catalog](../../../docs/skills-user-stories.md)
