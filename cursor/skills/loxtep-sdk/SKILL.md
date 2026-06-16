---
name: loxtep-sdk
description: Bootstrap @loxtep/sdk in Node (auth, env, REST vs Loxtep streams), map MCP tools to SDK methods, and avoid mixing JWT with IAM. Use when adding Loxtep SDK usage, queue readers/writers, or pairing MCP with runtime code.
metadata:
  documentation: https://github.com/LoxtepInc/loxtep-plugins-skills/blob/main/cursor/skills/loxtep-sdk/SKILL.md
---

# Loxtep Node SDK (Agent-Scope Skill)

## Recommended: Data-product-centric writer & reader

**Use `data_products.get_writer(id_or_name)` and `data_products.get_reader(id_or_name)` as the primary pattern.** These methods resolve all plumbing (queue names, bot IDs, stream bus config) automatically from the data product name or UUID — no manual runtime-mapping lookups needed.

### Delivery interfaces

The SDK exposes delivery interface management under `data_products.delivery`:

```ts
// Primary namespace (preferred)
const interfaces = await client.data_products.delivery.list(dataProductId);
await client.data_products.delivery.create(dataProductId, {
  endpoint_url: 'https://example.com/webhook',
  delivery_type: 'webhook',
});

```

### Copy-paste: write events to a data product

```ts
import { LoxtepClient } from '@loxtep/sdk';

const client = new LoxtepClient({
  api_url: process.env.LOXTEP_API_URL!,
  auth: { type: 'jwt', token: process.env.LOXTEP_AUTH_TOKEN! },
});

// Resolve by name — SDK handles queue, bot_id, and stream bus config
const writer = await client.data_products.get_writer('my-data-product');

writer.write({ id: '123', name: 'Example', timestamp: Date.now() });
writer.write({ id: '456', name: 'Another', timestamp: Date.now() });

await writer.close();
```

### Copy-paste: read events from a data product

```ts
import { LoxtepClient } from '@loxtep/sdk';

const client = new LoxtepClient({
  api_url: process.env.LOXTEP_API_URL!,
  auth: { type: 'jwt', token: process.env.LOXTEP_AUTH_TOKEN! },
});

const reader = await client.data_products.get_reader('my-data-product');

for await (const event of reader) {
  console.log(event.payload);
}
```

### Options

```ts
// Writer options
const writer = await client.data_products.get_writer('my-data-product', {
  bot_id: 'custom-bot-id',   // override resolved bot (advanced)
  batch_size: 100,            // events per batch (default: 100)
  max_retries: 3,             // retry attempts (default: 3)
});

// Reader options
const reader = await client.data_products.get_reader('my-data-product', {
  bot_id: 'my-reader-bot',   // custom reader identity for checkpointing
  from: 'z/2024/01/01',      // start position
  batch_size: 100,            // events per batch (default: 100)
});
```

### Cache invalidation

The SDK caches resolved data product config in memory. To force re-resolution:

```ts
client.data_products.invalidate_cache('my-data-product'); // specific
client.data_products.invalidate_cache();                  // all
```

### Lower-level escape hatch: `flows.get_writer`

For cases where you need explicit control over bot_id and queue name (e.g., writing to a queue that isn't a data product, or using a non-standard bot identity), use the lower-level `flows.get_writer()`:

```ts
const writer = await client.flows.get_writer({
  bot_id: 'custom-bot-id',
  queue: 'explicit-queue-name',
});
writer.write({ ... });
await writer.close();
```

> **Prefer `data_products.get_writer`** unless you have a specific reason to manage queue/bot resolution yourself.

## CRITICAL — Deployment prerequisite

**Queues and bots do NOT exist until a workflow is deployed to an instance.** Design-time configuration (creating workflows, connections, data products via MCP or UI) only defines the graph — it does not provision runtime infrastructure. You **must** deploy the project before the SDK can write or read events.

**Deployment creates:**
- The microservice identifier (namespace for all bots/queues)
- Bot registrations on the stream bus
- Queue registrations on the stream bus
- The `runtime_mapping` that maps entities → containers → bot_ids/queue_ids

**If you skip deployment**, SDK calls to `data_products.get_writer()` or `flows.get_writer()` will fail with "data product not deployed" or "queue not found" errors.

**How to deploy:** Use the `loxtep_deployments` MCP facade:
1. `deploy_project` — triggers async deployment (requires `project_id` + `instance_id`)
2. `list_deployments` or `get_deployment` — poll until status is `deployed`
3. After deployment, `data_products.get_writer('name')` resolves automatically

See the **`data-workflows`** Agent-Scope Skill (Flow F — Deploy before SDK ingestion) for the full sequence.

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

### 6. SDK event writing (via stream bus)

The SDK writes events through the **stream bus** — not via HTTP.

**Recommended:** Use `data_products.get_writer('name')` — it resolves the runtime mapping, bot_id, queue, and stream bus config automatically. See the top of this document.

**Lower-level path (explicit control):**

1. Resolve the runtime mapping (via MCP `get_runtime_mapping` or CLI `loxtep config export`)
2. Configure the SDK client with the deployed `bot_id` and target queue
3. Use `flows.get_writer()` which writes directly to the stream bus queue

**Quick path — export config from a deployed connector:**

```bash
# Resolves the deployed bot_id and queue from the runtime mapping
loxtep config export --from-connector "<connector_id>" --format env
```

Then the SDK client picks up `LOXTEP_BOT_ID` and queue configuration automatically.

## MCP operations

| Facade | `operation` | Permission | Notes |
|--------|-------------|------------|-------|
| `loxtep_data_products` | `get_data_product_sdk_config` | read | Returns SDK connection config for a data product |
| `loxtep_data_products` | `create_delivery_interface` | write | Create a delivery interface |
| `loxtep_data_products` | `list_delivery_interfaces` | read | List active delivery interfaces |
| `loxtep_deployments` | `deploy_workflow` | write | Deploy a single workflow to an instance |
| `loxtep_deployments` | `list_deployments` | read | List deployment records (poll for status) |
| `loxtep_deployments` | `get_deployment` | read | Get a single deployment record by ID |

<!-- BEGIN loxtep skill-scope (skill-package-v1) -->
## Agent-Scope Skill scope (`.loxtep/skills/loxtep-sdk.yaml`)

Resource scope and operation permissions for this Agent-Scope Skill, conformant with the [`skill-package-v1`](https://loxtep.io/schemas/skill-package-v1.json) schema. Any resource type or operation not listed is **denied (fail-closed)**. Identifier lists are empty placeholders — fill them with the specific resources in your workspace. This declaration does not change the hosted MCP config (`mcp.loxtep.io`).

```yaml
# .loxtep/skills/loxtep-sdk.yaml
# Conforms to https://loxtep.io/schemas/skill-package-v1.json
# Scoped to ONLY the identifiers listed; least-privilege per operation. Fail-closed.
name: loxtep-sdk
description: SDK runtime read/write to data products and their queues.
scope:
  data_products: []
  connectors: []
  workflows: []
  deployments: []
  domains: []
  queues: []
permissions:
  data_products: [read, write]
  deployments: [read, write]
  queues: [read, write]
```
<!-- END loxtep skill-scope (skill-package-v1) -->

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

If an SDK connector already exists (created via UI, API, or MCP — see the **`create-connector`** Agent-Scope Skill), export its `sdk_config` directly:

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

> To create an SDK connector in the first place, see the **`create-connector`** Agent-Scope Skill (Flow — SDK Connector).

## Shell exports from an existing data product

```bash
loxtep config export --from-data-product "<name_or_uuid>" --format sh
# or JSON for apps:
loxtep config export --from-data-product "<name_or_uuid>" --format json
```

> **Note:** For most use cases, `data_products.get_writer('name')` resolves everything automatically — you only need CLI config export for debugging or non-SDK environments.

## MCP vs SDK

- **MCP:** provisioning, catalog, agent tool calls over HTTP.  
- **SDK:** typed REST + **Loxtep streams** (live queues / bus).  
- See shipped docs in `@loxtep/sdk`: `docs/sdk-pairing.md`, `docs/sdk-mcp-mapping.md`.

## Stream vs replay

- **`data_products.stream`:** live bus via the stream data plane when `bot_id` + bus config exists.  
- **`data_products.replay`:** historical path via platform HTTP (observe/trace semantics).

## Bus credentials

JWT is **not** bus IAM. Use your instance's stream resource env + AWS principal; future `loxtep bus login` will wrap RBAC issuance — until then see `docs/sdk-bus-rbac-threat-model.md`.
