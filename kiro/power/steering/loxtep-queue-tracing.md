# Queue tracing for debugging (Customer MCP)

**Pattern:** Trigger an action → read the output/error queues → understand what happened at the system level.

## When to use

- After a **deployment** fails or behaves unexpectedly
- When a **workflow execution** produces no output or errors silently
- When **data flow** stops at a node (connection, transform, validation, delivery)
- When you need to verify an **event was emitted** correctly
- Debugging **"nothing happened"** scenarios where logs are insufficient

## Queue naming conventions

### Deployment queues (namespace from your instance record)

| Queue | Contains |
|-------|----------|
| `{ns}-workflows-workflow-deployment-requested` | Deploy trigger events |
| `{ns}-workflows-workflow-deployment-errors` | Deploy failures |
| `{ns}-workflows-project-deploy-requested` | Project-level deploy triggers |

### Workflow node queues (microservice_id = `w-{org4}-{inst4}-{proj8}-{wf8}`)

| Suffix | Contains |
|--------|----------|
| `*-source` | Connection input (raw) |
| `*-ingested` | Connection output (parsed) |
| `*-transformed` | Transform output |
| `*-validated` | Validation output |
| `*-delivered` | Consumption output |
| `*-err` | Node error (failed records + stack trace) |

## Debug flows

### Failed deployment
```json
{ "operation": "read_queue_events", "queue_name": "{ns}-workflows-workflow-deployment-errors", "count": 5 }
```

### Trace data through workflow
1. Get queue names: `get_runtime_mapping` with project_id + workflow_id
2. Read each node's output queue in order: source → ingested → transformed → validated → delivered
3. Where events stop, check that node's `*-err` queue

### Verify event emission
```json
{ "operation": "read_queue_events", "queue_name": "{ns}-workflows-{queue}", "count": 1 }
```

## Tips

- Error queues (`*-err`) contain full stack traces — always check them first
- Use `search_text` to filter by workflow_id or error message
- Get namespace from `list_instances` → instance `connection_details.observe_api.namespace`
- Get exact queue names from `get_runtime_mapping`

## MCP operations

| Operation | Facade |
|-----------|--------|
| `read_queue_events` | `loxtep_workspace` |
| `get_runtime_mapping` | `loxtep_deployments` |
| `list_instances` | `loxtep_instances` |
