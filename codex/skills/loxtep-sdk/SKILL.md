---
name: loxtep-sdk
description: Bootstrap @loxtep/sdk in Node (auth, env, REST vs Loxtep streams), map MCP tools to SDK methods, and avoid mixing JWT with IAM. Use when adding Loxtep SDK usage, queue readers/writers, or pairing MCP with runtime code.
---

# Loxtep Node SDK (agent skill)

## CRITICAL — Deployment prerequisite

**Queues and bots do NOT exist until a workflow is deployed to an instance.** Design-time configuration (creating workflows, connections, data products via MCP or UI) only defines the graph — it does not provision runtime infrastructure. You **must** deploy the project before the SDK can write or read events.

**Deployment creates:**
- The microservice identifier (namespace for all bots/queues)
- Bot registrations on the stream bus
- Queue registrations on the stream bus
- The `runtime_mapping` that maps entities → containers → bot_ids/queue_ids

**If you skip deployment**, SDK calls to `flows.get_writer()` or direct queue writes will fail with "queue not found" or "no deployed workflow" errors.

**How to deploy:** Use the `loxtep_deployments` MCP facade:
1. `deploy_project` — triggers async deployment (requires `project_id` + `instance_id`)
2. `list_deployments` or `get_deployment` — poll until status is `deployed`
3. `get_runtime_mapping` — resolve entity → queue/bot names after deployment completes

See the **`data-workflows`** skill (Flow F — Deploy before SDK ingestion) for the full sequence.

## Runtime naming convention (how queues and bots are named)

After deployment, all runtime resources follow a hierarchical naming scheme:

### 1. Microservice identifier (workflow namespace)

```
{instance_id_8}-{project_id_8}-{workflow_id_8}
```

UUIDs are stripped of hyphens and truncated to the first 8 characters.
Example: `a1b2c3d4-e5f6g7h8-i9j0k1l2`

### 2. Container ID (entity-level identifier)

```
{entity_prefix}-{first_8_chars_of_entity_uuid}
```

| Entity type    | Prefix |
|----------------|--------|
| connection     | `conn` |
| transformation | `xfm`  |
| validation     | `val`  |
| data_product   | `dp`   |
| export         | `exp`  |
| workflow       | `pipe` |

Example: `xfm-a1b2c3d4`, `conn-e5f6g7h8`

### 3. Bot names

```
{microservice_id}-bot-{container_id}-{role}
```

Example: `a1b2c3d4-e5f6g7h8-i9j0k1l2-bot-conn-e5f6g7h8-handler`

### 4. Queue names

```
{microservice_id}-queue-{container_id}-{direction}
```

Where `direction` is `in`, `out`, or `err`.

Example: `a1b2c3d4-e5f6g7h8-i9j0k1l2-queue-conn-e5f6g7h8-in`

### 5. Resolving names at runtime (don't hardcode)

**Never hardcode queue or bot names.** Use the runtime-mapping API:

```
GET /workflows/{workflow_id}/runtime-mapping?project_id={project_id}
```

Response:
```json
{
  "data": {
    "workflow_id": "...",
    "deployment_id": "...",
    "mapping_source": "deployment",
    "runtime_mapping": {
      "microservice_id": "a1b2c3d4-e5f6g7h8-i9j0k1l2",
      "containers": [
        {
          "container_id": "conn-e5f6g7h8",
          "entity_id": "full-uuid-of-connection",
          "entity_type": "connections",
          "bot_ids": ["a1b2c3d4-e5f6g7h8-i9j0k1l2-bot-conn-e5f6g7h8-handler"],
          "queue_ids": [
            "a1b2c3d4-e5f6g7h8-i9j0k1l2-queue-conn-e5f6g7h8-in",
            "a1b2c3d4-e5f6g7h8-i9j0k1l2-queue-conn-e5f6g7h8-out",
            "a1b2c3d4-e5f6g7h8-i9j0k1l2-queue-conn-e5f6g7h8-err"
          ]
        }
      ],
      "all_bot_ids": ["..."],
      "all_queue_ids": ["..."]
    }
  }
}
```

Use `entity_id` to find the container for your connection/transform/data product, then read its `queue_ids[0]` (input queue) for writing events.

### 6. SDK events endpoint (simplified)

The SDK's `flows.get_writer()` internally calls:

```
POST /workflows/{workflow_id}/events?project_id={project_id}
```

This endpoint resolves the deployment → runtime_mapping → first ingestion queue automatically. You don't need to know the queue name if using the SDK client — but the **workflow must be deployed**.

## Auth (single mental model)

1. `LOXTEP_AUTH_TOKEN` env var (CI/ephemeral), else  
2. `~/.loxtep/credentials.json` (`loxtep login`).

CLI/SDK do **not** auto-merge until one of these exists plus `api_url`.

## Copy-paste: client bootstrap

```ts
import { LoxtepClient } from '@loxtep/sdk';

export function createRuntimeClient() {
  return new LoxtepClient({
    api_url: process.env.LOXTEP_API_URL!.replace(/\/$/, ''),
    auth: { type: 'jwt', token: process.env.LOXTEP_AUTH_TOKEN! },
    organization_id: process.env.LOXTEP_ORGANIZATION_ID,
    project_id: process.env.LOXTEP_PROJECT_ID,
    instance_id: process.env.LOXTEP_INSTANCE_ID,
    default_bot_id: process.env.LOXTEP_BOT_ID,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID ?? 'cli',
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? 'cli',
    },
  });
}
```

## Bootstrapping from an SDK Connector

If an SDK connector already exists (created via UI, API, or MCP — see the **`create-connector`** skill), export its `sdk_config` directly:

```bash
# Export as shell exports (source-able)
loxtep config export --from-connector "<connector_id>" --format sh

# Export as JSON (for programmatic use)
loxtep config export --from-connector "<connector_id>" --format json

# Export as .env file
loxtep config export --from-connector "<connector_id>" --format env
```

The `--from-connector` flag fetches the connector's `sdk_config` (containing `api_url`, `organization_id`, `project_id`, `instance_id`, `region`) and outputs it in the requested format.

**Quick start from a connector:**

```bash
# 1. Source the connector config into your shell
eval "$(loxtep config export --from-connector "<connector_id>" --format sh)"

# 2. SDK client picks up env vars automatically
node -e "
  const { LoxtepClient } = require('@loxtep/sdk');
  const client = new LoxtepClient();
  // client is configured from LOXTEP_* env vars
"
```

> To create an SDK connector in the first place, see the **`create-connector`** skill (Flow — SDK Connector).

## Shell exports from an existing data product

```bash
loxtep config export --from-data-product "<uuid>" --format sh
# or JSON for apps:
loxtep config export --from-data-product "<uuid>" --format json
```

## MCP vs SDK

- **MCP:** provisioning, catalog, agent tool calls over HTTP.  
- **SDK:** typed REST + **Loxtep streams** (live queues / bus).  
- See shipped docs in `@loxtep/sdk`: `docs/sdk-pairing.md`, `docs/sdk-mcp-mapping.md`.

## Stream vs replay

- **`data_products.stream`:** live bus via the stream data plane when `bot_id` + bus config exists.  
- **`data_products.replay`:** historical path via platform HTTP (observe/trace semantics).

## Bus credentials

JWT is **not** bus IAM. Use your instance's stream resource env + AWS principal; future `loxtep bus login` will wrap RBAC issuance — until then see `docs/sdk-bus-rbac-threat-model.md`.
