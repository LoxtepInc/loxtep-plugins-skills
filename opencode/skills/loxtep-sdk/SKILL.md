---
name: loxtep-sdk
description: Bootstrap @loxtep/sdk in Node (auth, env, REST vs Loxtep streams), map MCP tools to SDK methods, and avoid mixing JWT with IAM. Use when adding Loxtep SDK usage, queue readers/writers, or pairing MCP with runtime code.
license: MIT
compatibility: opencode
metadata:
  platform: loxtep
  category: sdk
---

# Loxtep Node SDK (agent skill)

## Recommended: Data-product-centric writer & reader

**Use `data_products.get_writer(id_or_name)` and `data_products.get_reader(id_or_name)` as the primary pattern.** These methods resolve all plumbing (queue names, bot IDs, stream bus config) automatically from the data product name or UUID — no manual runtime-mapping lookups needed.

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
const writer = client.flows.get_writer(flowId, {
  bot_id: 'custom-bot-id',
  output_queue_name: 'explicit-queue-name',
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

See the **`data-workflows`** skill (Flow F — Deploy before SDK ingestion) for the full sequence.

<!-- BEGIN loxtep skill-scope (skill-package-v1) -->
## Skill scope (`.loxtep/skills/loxtep-sdk.yaml`)

Resource scope and operation permissions for this skill, conformant with the [`skill-package-v1`](https://loxtep.io/schemas/skill-package-v1.json) schema. Any resource type or operation not listed is **denied (fail-closed)**. Identifier lists are empty placeholders — fill them with the specific resources in your workspace. This declaration does not change the hosted MCP config (`mcp.loxtep.io`).

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
  domains: []
  queues: []
permissions:
  data_products: [read, write]
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

## Bus credentials

JWT is **not** bus IAM. Use your instance's stream resource env + AWS principal; future `loxtep bus login` will wrap RBAC issuance — until then see `docs/sdk-bus-rbac-threat-model.md`.
