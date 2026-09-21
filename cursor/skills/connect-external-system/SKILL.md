<!-- GENERATED FILE -- edit skills/<slug>/SKILL.md (or rule.mdc.src.md) and run `node scripts/generate-skills.mjs` -- do not edit directly -->
---
name: connect-external-system
description:
  Use when the user wants to connect a data source into Loxtep — SaaS/API,
  databases, files, SDK, or a system on a private network. Covers type
  discovery, public vs private connectivity, runtime inspection, secret storage,
  TLS/auth matching, and connection testing without starting ingestion. After
  Test on rest-api or file-transfer, continue to a templated ingest workflow (do
  not pull without a workflow and user authorization).
license: MIT
compatibility: opencode
metadata:
  platform: loxtep
  category: connectors
  documentation: https://github.com/LoxtepInc/loxtep-plugins-skills/blob/main/cursor/skills/connect-external-system/SKILL.md
---

# Connect external system

## Step boundary (CRITICAL)

| Step                     | Ends with                                            | Do NOT do in this step                |
| ------------------------ | ---------------------------------------------------- | ------------------------------------- |
| **Connect**              | `connector_id`, tested credentials                   | Piecemeal graph patches; ingestion    |
| **Organize** (next step) | Full workflow saved and deployed                     | Piecemeal graph patches for new flows |

**Prerequisite:** A Loxtep **project** must exist before building the workflow
(`create_project` or reuse — see **`data-workflows`**). Org connector create and
test do **not** require `project_id`.

**Connection nodes are workflow entities.** Include them in the workflow bundle
(`connections/{id}.json` with `connector_id`) during the next step — not here.

- **Trigger** — put this connector at the **ingest head** of an ingestion
  workflow.
- **Target** — put a (possibly different) connector at the **delivery tail** of
  a delivery workflow (`workflow_type: "delivery"`). See **`data-workflows`**
  Flow D.

Connection **testing** and **ingestion activation** are separate actions. Do not
start ingest, capture samples, or deploy a workflow unless the user authorizes
that step.

## Read vs mutate

Ask before any mutating step. Do not treat inspection as permission to write.

| Action | Mutates | Permission | Surface |
| ------ | ------- | ---------- | ------- |
| `list_connector_types` | no | `connectors:read` | MCP `loxtep_connect` |
| `list_connectors` | no | `connectors:read` | MCP `loxtep_connect` |
| `list_templates` / `get_template` | no | `catalog:read` | MCP `loxtep_connect` |
| `GET /dataproducts/connector-packages/{slug}` | no | `catalog:read` | REST only |
| `list_instances` / `get_infrastructure` | no | `instances:read` | MCP `loxtep_workspace` |
| `list_observe_bots` | no | `instances:read` | MCP `loxtep_observe` |
| `get_runtime_mapping` | no | project read | MCP `loxtep_build` |
| `test_connector` | no ingest; public path may persist `last_tested_at` when the caller also has `connectors:write` | `connectors:read` | MCP / CLI / SDK / REST |
| `create_connector` / `update_connector` | yes (credentials, metadata) | `connectors:write` | MCP / SDK / REST |
| `get_oauth_url` without `connector_id` | yes (creates connector) | `connectors:read` | MCP |
| `capture_samples` | yes (bounded source rows into metadata) | `connectors:read` | MCP / CLI / SDK / REST |
| `confirm_connector_entity_selection` | yes (starts PKO ingest design/deploy) | `connectors:write` | MCP |
| `delete_connector` | yes (soft-delete; owner only; blocked if in use) | `connectors:write` + approval | MCP |
| `run_connector_action` | yes (third-party side effect) | `connectors:write` + approval | MCP |
| `deploy_project` / `deploy_workflow` | yes (runtime bots/queues) | project write | MCP `loxtep_build` — **`loxtep-deployments`** |
| `register_infrastructure` / `create_instance` | yes (org infra / instance) | instances write | MCP `loxtep_workspace` — **`loxtep-instances`** |

## When to use

- "Connect **Shopify** / **Salesforce** / **Postgres** / **MongoDB** / …"
- "**OAuth**", "**API key**", "**SDK connector**", or private-network source
- Discover types, inspect an instance's connector runtime, test connectivity
- `list_connector_types`, `create_connector`, `update_connector`,
  `get_oauth_url`, `test_connector`, `capture_samples`,
  `list_connector_entities`, `confirm_connector_entity_selection`

**Not this skill:** inventing a new connector type (see
`platform-backend/connectors/docs/ADDING_A_NEW_CONNECTOR_TYPE.md`), ad hoc cloud
console changes, or workflow graph authoring (**`data-workflows`**).

## Prerequisites and missing inputs

- MCP auth (`loxtep-auth`). Confirm grants with **`loxtep-mcp-session`**
  (`get_current_user`).
- **`project_id`** only when applying project templates.
- **Ask** rather than invent: source hostname/URI, whether the source is
  reachable from the public internet, TLS CA/policy, auth method and
  credentials, `instance_id` when the org has more than one instance, customer
  subnet IDs and connector security group (private path), region.

Never put secrets, passwords, URI userinfo, CA PEMs, or SSM parameter values in
examples, logs, or replies. Reads return `[REDACTED]` for externalized fields.

## Readiness layers

Treat these as independent. A pass at one layer is not a pass at the next.

| Layer | Meaning | How to inspect |
| ----- | ------- | -------------- |
| **Connector availability** | Type exists in the catalog | `list_connector_types`; optional `get_template` / connector package |
| **Runtime deployment** | Instance is `active` and runtimes bots exist | `list_instances`; `list_observe_bots` (`instance_id`) |
| **Network readiness** | Path from the connector runtime to the source | `network_binding` on the connector; customer VPC/subnets/SG on the instance **runtimes** stack (see **`loxtep-instances`**) |
| **Authentication success** | Credentials + TLS accepted | `test_connector` (`passed: true`) |
| **Ingestion readiness** | Workflow deployed; trigger/schedule authorized | **`data-workflows`** + **`loxtep-deployments`** after explicit user authorization |

## 1. Discover types, schemas, auth, runtime

```json
{ "operation": "list_connector_types" }
```

Permission: `connectors:read`. Scope: global. Expected result:
`connector_types[]` with `connector_type`, `name`, `description`, and either
`auth_type` (`oauth2` | `api_key` | `basic` | `bearer` | `custom` | `jwt` |
`none`) or, for `rest-api` / `api` / `api_poll`, `primary_auth_schemes`
(`none` | `api_key` | `bearer` | `basic` | `oauth2`). OAuth types may include
`oauth_connection_config_key` (for example Shopify `shop`).

This list does **not** include JSON configuration schemas, `network_binding`,
or VPC/runtime requirements.

For template copy and entity metadata:

```json
{ "operation": "list_templates", "category": "connectors" }
```

```json
{ "operation": "get_template", "template_id": "<uuid>" }
```

Permission: `catalog:read`. `list_templates` optional: `category`, `search`,
`page`, `page_size`.

Full package (actions, `input_schema`, `connector_template`) is REST only:

```
GET /dataproducts/connector-packages/{slug}
```

Permission: `catalog:read`. There is no MCP operation for this. There is no
SDK `list_connector_types`.

Route type-specific fields (hosts, TLS, collections, OAuth shop keys) to that
type's template/package. Do not invent property names.

## 2. Public vs private connectivity

Ask whether the source is reachable from the public internet.

| Signal | Connectivity |
| ------ | ------------ |
| User says the source is on a customer VPC / private subnet / not internet-reachable | Private |
| Connector metadata `network_binding` is `customer_vpc` or `private` | Private |
| Connector metadata `require_private_network: true` | Private |
| Otherwise, and the catalog type is a public SaaS/API | Public |

`mongodb-source` / `mongodb` **workflow deploy** routes to the customer-VPC
runtime (`connectors-private-512`) even without `network_binding`. The
**org-connector test probe** uses the private worker only when
`network_binding` is `customer_vpc`/`private` or `require_private_network` is
true. Set `network_binding: "customer_vpc"` when the source is private so test
and ingest use the same path.

Shared `connectors-{256,512,1024,2048}` Lambdas stay off-VPC. Private sources
must not be tested in the connectors API Lambda.

## 3. Inspect instance connector runtime (read-only)

1. `loxtep_workspace` → `list_instances` — `instance_id`, `name`, `region`,
   `status`, `instance_type`, `plan`. Status must be `active`. This payload
   does not include ARNs or VPC IDs.
2. `loxtep_workspace` → `get_infrastructure` — registered cross-account role
   (self-hosted/managed). Null fields mean the org has not registered
   infrastructure.
3. If more than one instance, **ask for `instance_id`**.
4. `loxtep_observe` → `list_observe_bots` with `instance_id` — look for a bot
   whose name contains `connectors-private-512` (private) or `connectors-`
   (public shared tiers). Permission: `instances:read`.
5. After a workflow is deployed: `loxtep_build` → `get_runtime_mapping`
   (`project_id`, optional `workflow_id`) — connection containers and bot/queue
   IDs. See **`loxtep-deployments`**.

Missing networking / permissions / deploy prerequisites:

| Finding | Likely gap | Owner |
| ------- | ---------- | ----- |
| Instance not `active` | Finish instance provisioning | Loxtep + customer billing/role |
| No `connectors-private-512` bot | Runtimes stack missing customer subnet/SG inputs, or not deployed | Loxtep deploy of **runtimes**; customer supplies subnet/SG IDs |
| `get_infrastructure` empty on self-hosted | Cross-account role not registered | Customer (role) then `register_infrastructure` |
| Connector has no `network_binding` but source is private | Metadata incomplete | Customer + `update_connector` |
| `PRIVATE_PROBE_FAILED` / cannot resolve private Lambda | Runtimes stack name `org-{org8}-{inst8}-runtimes` (or `runtimes_stack_identifier`) missing the private function | Loxtep |

Do not change ENIs, security groups, or routes in the AWS console.

## 4. Configure private connectivity (infrastructure)

**Ownership**

| Resource | Owner |
| -------- | ----- |
| Source system, credentials, TLS CA, allowlists | Customer |
| VPC, private subnets, security groups, routing, NACLs, source firewall | Customer |
| Cross-account deploy role (`get_deployment_urls` → CloudFormation/CLI/Terraform) | Customer deploys; Loxtep registers |
| Instance bus (rstreams) and per-instance **runtimes** stack | Loxtep via instance provisioner / `moon run :deploy-ms -- runtimes …` |
| `connectors-private-512` bot (512 MB, customer subnets/SG only) | Loxtep packaging |
| Shared `connectors-*` workers | Loxtep (stay off customer VPC) |

Supported deploy path (mutating; requires operator authorization):

1. Customer provides **two private subnet IDs** and **one connector security
   group ID** that can reach the source (and that allow Lambda ENIs). Ask for
   these values. Do not guess.
2. Those IDs are the bot package tokens `CustomerPrivateSubnet1`,
   `CustomerPrivateSubnet2`, and `CustomerConnectorSecurityGroup` on
   `runtimes/bots/connectors-private-512`.
3. Deploy the instance **runtimes** stack through the platform path
   (`process-runtimes-deployment-requested` after instance create, or operator
   `moon run :deploy-ms -- runtimes <microserviceidentifier> <stackname> <region> <profile> --skip-approval`).
   Also deploy **workflows** so connection registration can resolve the private
   Lambda. Do not attach shared `botconnectors` to the customer VPC.
4. Confirm with `list_observe_bots` that `connectors-private-512` exists.

`create_instance` / `register_infrastructure` do **not** accept subnet or
security-group IDs. There is no MCP operation to set
`CustomerPrivateSubnet*` / `CustomerConnectorSecurityGroup`. Canonical
microservice template substitution only expands
`${microserviceIdentifier}`, `${serviceName}`, `${stackPrefix}`, `${env}`,
`${coreStackName}`.

Security group / routing the customer must allow (ask them to confirm):

- Ingress from the connector SG to the source port (for example MongoDB 27017)
- Egress from the connector SG to the source and to AWS SSM (credential
  replica) and the instance bus
- Route tables so the chosen subnets reach the source (peering, TGW, or local
  VPC)

## 5. Create and update connectors (secrets)

Permission: `connectors:write`.

OAuth catalog types: `get_oauth_url` (not `create_connector`). Non-OAuth:
`create_connector` with `connector_type` + `metadata`. Secrets may be omitted
at create and completed later with `update_connector`.

```json
{
  "operation": "create_connector",
  "connector_type": "<slug-from-list_connector_types>",
  "metadata": {
    "name": "<display name>",
    "network_binding": "customer_vpc"
  }
}
```

Put type-specific non-secret fields in `metadata` / `metadata.custom_settings`
as required by that type's template or package. Put credentials in the same
write; the API **externalizes** sensitive keys to SSM Parameter Store
(`/loxtep/{organization_id}/connectors/{connector_id}/metadata/…`) as
`SecureString`. The write response may include
`externalized_parameter_refs` (paths only). Later `list_connectors` / GET
returns `[REDACTED]` and does **not** return the secret or, on GET, the SSM
path.

SDK (Node and Python):

```ts
await client.connect.connectors.create({
  connector_type: '<slug>',
  metadata: { name: '<display name>' },
});
await client.connect.connectors.update('<connector_id>', { metadata: { /* … */ } });
```

REST: `POST /connectors/connectors`, `PUT /connectors/connectors/{connector_id}`.
Metadata is shallow-merged on PUT.

There is **no** `loxtep connectors create` or `loxtep connectors get` CLI
command. CLI list: `loxtep connectors list [--type sdk]`.

For SDK connectors (`connector_type: "sdk"`): `metadata.name` is required;
`metadata.instance_id` is required when the org has multiple instances.

## 6. Match authentication and TLS

Use `auth_type` / `primary_auth_schemes` from `list_connector_types`.

| Catalog `auth_type` | Create path |
| ------------------- | ----------- |
| `oauth2` | `get_oauth_url` with `connector_type` or `connector_id`; user completes browser OAuth |
| `api_key` / `basic` / `bearer` / `jwt` / `custom` / `none` | `create_connector` / `update_connector` |
| rest-api family | one primary in `metadata.custom_settings.auth_type`; when `oauth2` set `oauth_grant_type` to `authorization_code` or `client_credentials` |

Do not stack Basic+Bearer+OAuth2. Add only that scheme's credential fields.

TLS: follow the type package. Private database sources typically need
`tls: true` plus a customer CA (`tls.ca` or `tls.tlsCAFile`). Invalid cert or
hostname fails closed (`TLS_POLICY_VIOLATION` / `TLS_FAILURE`) unless a
documented insecure gate exists for that type. Ask the customer for the CA and
hostname policy; do not disable verification.

Type-specific contracts (do not copy their field names into other types):

- MongoDB source private probe:
  `platform-backend/connectors/providers/mongodb-source/PATCH_PRIVATE_TEST.md`
  (minimum version `mongodb-source-private-probe/1`)
- MongoDB operator notes:
  `platform-backend/connectors/providers/mongodb-source/README.md`

## 7. Test connectivity without starting ingestion

Authorized **test** only. Do not call `capture_samples`,
`confirm_connector_entity_selection`, `deploy_workflow`, `run_connector_action`,
or `trigger_bot` as part of a connectivity test.

MCP (permission `connectors:read`):

```json
{ "operation": "test_connector", "connector_id": "<uuid>" }
```

When the org has multiple instances, pass `instance_id` (required for the
customer-VPC probe):

```json
{
  "operation": "test_connector",
  "connector_id": "<uuid>",
  "instance_id": "<uuid>"
}
```

REST: `POST /connectors/connectors/{connector_id}/test` with optional
`{ "instance_id": "<uuid>" }`.

CLI: `loxtep connectors test <connector_id>` — body is empty; **no**
`--instance-id`. SDK `client.connect.connectors.test(connector_id)` posts `{}`.
For a multi-instance private probe use MCP or REST.

Expected success: `{ "passed": true, "tested_at": "<iso>", "details": { … } }`.
Private MongoDB probe `details.account_info` includes topology, collection
names, TLS/permission flags, `runtime_function`, `runtime_version`,
`contract_version`, `network_binding` — never URI, password, CA PEM, or
document payloads.

Public `test_connector` runs in-process `testConnection()`. A successful public
test may persist `last_tested_at` / `last_test_sample` when the caller has
`connectors:write`. The customer-VPC probe does not persist samples, does not
register LeoCron, and does not write checkpoints or data products. It may
perform a bounded permission `find`/`watch().close()` on allowlisted names.

**Samples** (separate, retrieves source rows; ask first):

```json
{
  "operation": "capture_samples",
  "connector_id": "<uuid>",
  "entity_type": "<name>",
  "limit": 10
}
```

CLI: `loxtep connectors capture-samples <id> --entity-type <name> [--limit N]`
(`limit` 1–25). `entity_type` is required.

**Forbidden / do not invent:**

- `loxtep connector test` (singular)
- `loxtep connectors test … --entity … --limit …`
- `loxtep connectors create` / `loxtep connectors get`
- `loxtep test <module>` (workflow module, not a connector)
- `start_connector_ingest` (not an MCP operation)

## 8. Distinguish the layers in the reply

After each step, state which layer passed. Example: "Type is available;
instance is active; private runtime is missing; authentication not tested;
ingestion not started."

Ingestion starts only after the user authorizes **`data-workflows`**
(`save_workflow_bundle` + `deploy_workflow`) or
`confirm_connector_entity_selection` (PKO fan-out). `ingest_started` is true
only when save and deploy both succeed.

## 9. Diagnose failures (customer vs Loxtep)

| Code / symptom | Layer | Typical owner |
| -------------- | ----- | ------------- |
| Unknown `connector_type` | availability | Agent: `list_connector_types`; Loxtep if catalog/template sync stale |
| Missing credentials message | authentication | Customer (supply on manage / `update_connector`) |
| OAuth used with `create_connector` | authentication | Agent: use `get_oauth_url` |
| `TLS_POLICY_VIOLATION` / `TLS_FAILURE` | authentication / TLS | Customer cert/hostname/CA |
| `MISSING_DISCOVERY_PERMISSION` / `MISSING_FIND_PERMISSION` / `MISSING_COLLECTION_ACCESS` / `MISSING_CHANGE_STREAM_PERMISSION` | authentication | Customer source grants |
| `UNSUPPORTED_STANDALONE` | source topology | Customer (replica set / mongos for CDC types) |
| `PRIVATE_PROBE_FAILED` / cannot resolve `connectors-private-512` | runtime / network | Loxtep runtimes deploy; customer if subnet/SG IDs never supplied |
| Timeout / ENI / routing to private IP | network | Customer VPC routing, SG, DNS |
| `403` / permission denied on MCP | RBAC | Customer org admin (`get_current_user`) |
| Probe `passed: true` but no data product | ingestion | Expected until authorized deploy |
| Shared connector Lambda testing a private host | network | Agent: set `network_binding: customer_vpc` and use private runtime |

Sanitize every error string before showing it (redact URI userinfo and PEMs).

## 10. Preserve networking and configuration across upgrades

- Keep `network_binding` / `require_private_network` and SSM refs on the **org
  connector**. Workflow redeploy hydrates connection `entity_config` from
  `connector_id` (connection fields still win).
- Do not clear `credential_parameter_store_refs`. Resubmitting `[REDACTED]`
  keeps the existing SSM parameter.
- `deploy_workflow` / `force_redeploy` does not change VPC attachment. Private
  connections re-register on `connectors-private-512` when
  `network_binding` / mongodb-source routing still applies.
- Runtimes stack updates must keep the same `CustomerPrivateSubnet*` and
  `CustomerConnectorSecurityGroup` values. Dropping them detaches the private
  Lambda from the customer VPC.
- Shared `connectors-*` workers must remain `vpc.enabled: false`.

## Generic example (discovery → successful test)

Placeholders only. Stop after test unless the user authorizes samples or
ingest.

1. Session: `loxtep_session` → `get_current_user` (need `connectors:read`;
   `connectors:write` to create).
2. Discover: `loxtep_connect` → `list_connector_types`. Pick the slug the user
   named. If schema fields are unclear, `GET /dataproducts/connector-packages/{slug}`
   (`catalog:read`) or `list_templates` / `get_template`.
3. Ask: public or private? credentials? TLS CA? If multiple instances,
   `instance_id`?
4. Inspect instance: `list_instances`. For private: `list_observe_bots` with
   `instance_id` and confirm `connectors-private-512`. If missing, collect
   subnet/SG IDs and use **`loxtep-instances`** / operator runtimes deploy
   (section 4) — do not create the connector until the runtime exists.
5. Create (mutate; ask first). Public API-key example:

```json
{
  "operation": "create_connector",
  "connector_type": "rest-api",
  "metadata": {
    "name": "Example API",
    "custom_settings": {
      "auth_type": "api_key",
      "base_url": "https://api.example.com"
    }
  }
}
```

Private example (type-specific settings from that package; secret in the write
only):

```json
{
  "operation": "create_connector",
  "connector_type": "<private-capable-slug>",
  "metadata": {
    "name": "Private source",
    "network_binding": "customer_vpc",
    "custom_settings": {
      "tls": { "tls": true }
    }
  }
}
```

6. Confirm the response shows `connector_id` and redacted secrets.
7. Test:

```json
{
  "operation": "test_connector",
  "connector_id": "<uuid>",
  "instance_id": "<uuid-if-required>"
}
```

8. Report layers: available, runtime present, network ready, `passed: true`,
   ingestion not started. Hand off to **`data-workflows`** only when the user
   wants ingest.

## Happy-path flows (after a passing test)

### Flow — OAuth (e.g. Shopify)

| Step | Action                       | Tool             | `operation`                                |
| ---- | ---------------------------- | ---------------- | ------------------------------------------ |
| 1    | Discover types               | `loxtep_connect` | `list_connector_types`                     |
| 2    | Start OAuth                  | `loxtep_connect` | `get_oauth_url`                            |
| 3    | User completes browser OAuth | —                | —                                          |
| 4    | Connectivity probe           | `loxtep_connect` | `test_connector`                           |
| 5    | Capture samples (ask first)  | `loxtep_connect` | `capture_samples` (`entity_type` required) |
| 6    | **Hand off to studio**       | —                | **`data-workflows`** with `connector_id`   |

### Flow — rest-api or file-transfer after Test

Do not ingest without a workflow and user authorization.

| Step | Action | Tool | `operation` |
| ---- | ------ | ---- | ----------- |
| 1    | Discover types | `loxtep_connect` | `list_connector_types` |
| 2    | Create connector | `loxtep_connect` | `create_connector` |
| 3    | Test | `loxtep_connect` | `test_connector` |
| 4    | List entities | `loxtep_connect` | `list_connector_entities` |
| 5    | Compose from template | `loxtep_connect` | `apply_template` (`template_type`: `workflow`, `template_slug`: `connector-ingestion`) |
| 6    | Set **Entities**, **Schedule**, **How** | — | `resource` / `sync_mode` / `schedule` / optional `last_updated_field` |
| 7    | Save | `loxtep_build` | `save_workflow_bundle` |
| 8    | Deploy | `loxtep_build` | `deploy_workflow` |

Convenience: `confirm_connector_entity_selection` persists the pick and runs
that compose → save → deploy path. Do not add a scheduler.

### Flow — other API key connectors

`list_connector_types` → `create_connector` → `test_connector` → (optional)
`capture_samples` → **`data-workflows`**.

### Flow — SDK connector

Confirm `"sdk"` in types → `create_connector` → optional `test_connector`
(SDK probe is a no-op pass) → **`data-workflows`**. Post-deploy bootstrap:
**`loxtep-sdk`**.

### Flow — Connector template from catalog

`list_templates` / `get_template` → `apply_template` with `project_id`,
`template_type`, `template_slug`. Review via `get_workflow_graph` before
deploy.

## MCP mapping

| User intent | Tool | `operation` | Scope |
| ----------- | ---- | ----------- | ----- |
| List types | `loxtep_connect` | `list_connector_types` | global |
| List org connectors | `loxtep_connect` | `list_connectors` | organization |
| Create connector | `loxtep_connect` | `create_connector` | organization |
| Update connector | `loxtep_connect` | `update_connector` | organization |
| OAuth URL | `loxtep_connect` | `get_oauth_url` | organization |
| Test connectivity | `loxtep_connect` | `test_connector` | organization |
| Capture samples | `loxtep_connect` | `capture_samples` | organization |
| List entities | `loxtep_connect` | `list_connector_entities` | organization |
| Confirm entity selection (PKO fan-out) | `loxtep_connect` | `confirm_connector_entity_selection` | organization |
| Apply template | `loxtep_connect` | `apply_template` | **project** |

## SDK and CLI (actual methods)

Node: `client.connect.connectors.list/get/create/update/delete/test/capture_samples/get_oauth_url`.
Python: the same names on `client.connect.connectors`.
`test(connector_id)` does not take `instance_id`.

CLI (`@loxtep/sdk`):

```bash
loxtep connectors list [--type sdk]
loxtep connectors test <connector_id>
loxtep connectors capture-samples <connector_id> --entity-type <name> [--limit N]
```

## Pitfalls

- **Pull without a workflow** — After Test on rest-api / file-transfer, compose
  from `connector-ingestion`, then **`save_workflow_bundle`** +
  **`deploy_workflow`** only with user authorization.
- **`file-transfer` / SFTP:** prefer credentials on the **org connector**
  (`update_connector`). Deploy hydrates transport / authentication / fileSpecs /
  `credential_parameter_store_refs` onto the connection `entity_config` by
  `connector_id` (connection fields still win).
- **`capture_samples` requires `entity_type`** — for file-transfer, use the
  entity key from connector metadata / fileSpecs.
- **Private test on the API Lambda** — set `network_binding: customer_vpc` and
  use an instance whose runtimes stack has `connectors-private-512`.
- **Warehouse bind** (Snowflake / Databricks table in place) is
  **`bind-external-warehouse`**, not this skill.

## Known gaps (do not invent APIs)

- No MCP `get_connector`; use `list_connectors` or SDK/REST GET.
- No MCP for connector packages; REST `GET /dataproducts/connector-packages/{slug}`.
- `list_connector_types` has no config schema, TLS, or `network_binding`.
- CLI cannot create/get/update connectors or pass `instance_id` to test.
- SDK `test` cannot pass `instance_id`.
- No MCP/SDK to set runtimes VPC subnet/SG parameters.
- Customer-VPC **test** worker is implemented for `mongodb-source` private
  probe (`mongodb-source-private-probe/1`). Other private types still need
  `network_binding` for deploy routing; ask before assuming a private probe.

## References

- Next step: **`data-workflows`**
- Instance / VPC runtime: **`loxtep-instances`**
- Workflow deploy / mapping: **`loxtep-deployments`**
- SDK client: **`loxtep-sdk`**
- Full journey: **`loxtep-journey-orchestrator`**
- Warehouse tables: **`bind-external-warehouse`**

<!-- BEGIN loxtep skill-scope (skill-package-v1) -->

## Agent-Scope Skill scope (`.loxtep/skills/connect-external-system.yaml`)

Resource scope and operation permissions for this Agent-Scope Skill, conformant
with the [`skill-package-v1`](https://loxtep.io/schemas/skill-package-v1.json)
schema. Any resource type or operation not listed is **denied (fail-closed)**.
Identifier lists are empty placeholders — fill them with the specific resources
in your workspace. This declaration does not change the hosted MCP config
(`mcp.loxtep.io`).

```yaml
# .loxtep/skills/connect-external-system.yaml
# Conforms to https://loxtep.io/schemas/skill-package-v1.json
# Scoped to ONLY the identifiers listed; least-privilege per operation. Fail-closed.
name: connect-external-system
description: Manage connectors and project connection nodes.
scope:
  data_products: []
  connectors: []
  workflows: []
  domains: []
  queues: []
permissions:
  connectors: [read, create, write, delete]
```

<!-- END loxtep skill-scope (skill-package-v1) -->

## Implementation notes

- PKO: `procedure#connect-external-system` (P1) →
  `procedure#capture-connector-samples` → `procedure#design-ingestion-workflow`
  (P2)
- PKO graph:
  `platform-backend/graph/platform-pko/connect-external-system.jsonld`
- Private probe invoke:
  `platform-backend/connectors/lib/private-connection-probe-invoke.ts`
- Deploy routing: `connectionRequiresCustomerVpc` in
  `platform-backend/workflows/lib/connection-runtime-registration.ts`

## Auth

Reconnect the Loxtep MCP server to re-trigger OAuth — see **`loxtep-auth`**.
