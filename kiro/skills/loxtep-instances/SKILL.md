<!-- GENERATED FILE -- edit skills/<slug>/SKILL.md (or rule.mdc.src.md) and run `node scripts/generate-skills.mjs` -- do not edit directly -->
---
name: loxtep-instances
description:
  'Use when the user works with Loxtep runtime instances via Customer MCP -
  list_instances, create_instance, instance provisioning, shared vs managed,
  starter plan, plan_id, payment_method_id, billing UI (add payment methods in
  app, not MCP), regions, or "create a Loxtep instance". Self-hosted install
  flow: get_deployment_urls -> register_infrastructure -> get_infrastructure ->
  create_instance. BYOL custom Lambda registration: register_custom_bot /
  list_custom_bots / deregister_custom_bot / reconcile_custom_bots (dedicated
  instances only). Also inspect whether an instance''s connector runtime is
  ready for public or customer-VPC (private-network) sources.'
metadata:
  documentation: https://github.com/LoxtepInc/loxtep-plugins-skills/blob/main/kiro/skills/loxtep-instances/SKILL.md
---

# Loxtep instances (Customer MCP)

## Tool shape

- **MCP tool:** `loxtep_workspace`
- **Arguments:**
  `{ "operation": "list_instances" | "create_instance" | "update_instance" | "get_deployment_urls" | "register_infrastructure" | "get_infrastructure" | "register_custom_bot" | "list_custom_bots" | "get_custom_bot" | "update_custom_bot" | "deregister_custom_bot" | "reconcile_custom_bots", ...fields }`

### Payment methods — app UI only (read this)

- **There is no MCP tool** to create, tokenize, or add a payment method. Do not
  ask the user for card numbers, CVV, or bank account details in chat.
- For **managed** or **self-hosted** instances, the user must add a payment
  method in the **Loxtep app** (Billing, Account, or Payments — exact label
  depends on the product), complete the **payment processor** flow there, then
  use the saved method's **`payment_method_id` (UUID)** in `create_instance`.
- If the user has no method yet, **direct them to the dashboard** (e.g. dev or
  prod app URL for their environment), not to imaginary MCP billing APIs.

## list_instances

```json
{ "operation": "list_instances" }
```

Returns **only** `instance_id`, `name`, `region`, `status`, `instance_type`, and
`plan`. It does **not** include ARNs, `external_id`, namespaces, API Gateway
URLs, or rstreams physical resource names — those must not land in chat
transcripts. Role + external id: `get_infrastructure` / `get_deployment_urls`.
Bus table names for engineers: Node CLI
`loxtep instances stream-config [<instance_id>]`, SDK
`client.workspace.instances.get_stream_config` (Node or Python), or REST
`GET /organizations/instances/{instance_id}/stream-config` (`instances:read`),
not MCP.

## create_instance

Pass **flat** fields (not nested `instance_config`) — the platform maps them.

### Deployment vs billing (read this)

| `instance_type`   | Meaning                                                                                | Create requirements                                                                                                                                                                                                                                                            |
| ----------------- | -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **`shared`**      | Default **free-tier playground** (multi-tenant).                                       | Omit `plan_id` or send **`free`**. Paid **`starter`** is also shared and needs **`payment_method_id`**. Never `growth` / `scale` / `enterprise`. Do **not** send `observe_api` role or secret coordinates.                                                                     |
| **`managed`**     | Paid **dedicated** bus (remote account/region — same AWS access model as self-hosted). | **`growth`/`scale`**, **`payment_method_id`**, and **`connection_details.observe_api.cross_account_role_arn`** (IAM role ARN). `rstreams_secret_arn` and `rstreams_auth_arn` are written by provisioning; callers do not send them. Sending `observe_proxy_role_arn` is a 400. |
| **`self-hosted`** | Customer-operated dedicated bus.                                                       | **`payment_method_id`** + **`connection_details.observe_api.cross_account_role_arn`** (IAM role ARN). `rstreams_secret_arn` and `rstreams_auth_arn` are written by provisioning; callers do not send them. Sending `observe_proxy_role_arn` is a 400.                          |

### Field summary

| Field                             | Notes                                                                                                                                                                                                                                                                                                          |
| --------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `name`, `region`, `instance_type` | Required.                                                                                                                                                                                                                                                                                                      |
| `plan_id`                         | Top-level only. Required for **managed** (`growth` or `scale`). Omit or `free` for unpaid **shared**; `starter` is paid shared. Do **not** send plan fields under `metadata`.                                                                                                                                  |
| `payment_method_id`               | **Required** for **managed** and **self-hosted** (and for paid `starter`). Omit for unpaid **shared**. Value is a UUID for a method **already** saved in the app.                                                                                                                                              |
| `connection_details`              | **Required for managed and self-hosted** — nested `observe_api` with `cross_account_role_arn`. `rstreams_secret_arn` and `rstreams_auth_arn` are written by provisioning; callers do not send them. Namespace, `api_url`, and `stack_id` are always server-derived. Sending `observe_proxy_role_arn` is a 400. |

### Correct examples

**Free playground (shared)**

```json
{
  "operation": "create_instance",
  "name": "My playground",
  "region": "us-east-1",
  "instance_type": "shared"
}
```

**Paid Growth (managed)** — same observe_api remote-access shape as self-hosted:

```json
{
  "operation": "create_instance",
  "name": "Production mesh",
  "region": "us-east-1",
  "instance_type": "managed",
  "plan_id": "growth",
  "payment_method_id": "550e8400-e29b-41d4-a716-446655440000",
  "connection_details": {
    "observe_api": {
      "cross_account_role_arn": "arn:aws:iam::123456789012:role/LoxtepCrossAccountDeploymentRole"
    }
  }
}
```

### Self-hosted example (shape)

**Required fields for self-hosted** (validated in
`_core/src/validation/organizations-instances-post.ts`):

- `name`, `region`, `instance_type: "self-hosted"`
- `payment_method_id` (UUID — saved in the Loxtep app Billing settings)
- `connection_details.observe_api.cross_account_role_arn` — the IAM role ARN
  registered via `register_infrastructure` (see the install flow below)
- Do **not** send `rstreams_secret_arn` or `rstreams_auth_arn` — they are
  written by provisioning from the deployed stack's outputs. Sending
  `observe_proxy_role_arn` is a 400.

```json
{
  "operation": "create_instance",
  "name": "Customer VPC mesh",
  "region": "us-east-1",
  "instance_type": "self-hosted",
  "payment_method_id": "550e8400-e29b-41d4-a716-446655440000",
  "connection_details": {
    "observe_api": {
      "cross_account_role_arn": "arn:aws:iam::123456789012:role/LoxtepCrossAccountDeploymentRole"
    }
  }
}
```

Only `cross_account_role_arn` is required on `observe_api` at create.
`rstreams_secret_arn` and `rstreams_auth_arn` are written by provisioning after
the stack deploys; callers do not send them.

### Wrong patterns (validation / API error)

Each hit is a **400** (one issue per field). MCP `create_instance` maps to the
same `PostInputSchema`. `CreateInstanceMcpFlatInputSchema`, `PostInputSchema`,
and `InstanceConfigSchema` are `.strict()`: an unknown key is
`Unrecognized key: "<key>"` (`unrecognized_keys`). A top-level MCP `api_url` is
that 400, not dropped (`Validation failed: : Unrecognized key: "api_url"` after
the facade strips `operation`; HTTP `details.field` is `"root"`).
`connection_details` is still `.passthrough()`. `observe_api` is `.strict()`. A
strict failure reports only the unknown key; platform-owned field refusals on
the same request are not listed until the unknown keys are removed (for example
MCP `instance_typo` plus `observe_api.namespace` returns only
`Unrecognized key: "instance_typo"`).

- `instance_type: "shared"` + `plan_id: "growth"` / `"scale"` / `"enterprise"` —
  **invalid** (`plan_id` must match the instance type). Paid **`starter`** stays
  on **shared** and needs `payment_method_id`.
- **Managed** or **self-hosted** without **`payment_method_id`** — **invalid**
  at MCP and API.
- **Managed** or **self-hosted** without
  **`connection_details.observe_api.cross_account_role_arn`** — **invalid**.
- Platform-owned fields — do **not** send `api_url`, `stack_id`,
  `metadata.routing`, `observe_api.namespace`, or
  `observe_api.observe_proxy_role_arn`. Messages:
  `api_url is set by the platform; do not send it.`,
  `stack_id is set by the platform; do not send it.`,
  `metadata.routing (observe namespace) is set by the platform; do not send it.`,
  `observe_api.namespace is derived by the platform; do not send it.`,
  `observe_api.observe_proxy_role_arn is written by provisioning; do not send it.`
- Plan metadata — do **not** send `metadata.subscription`, `metadata.tier`,
  `metadata.plan_id`, `metadata.limits`, or `metadata.subscription_details`.
  Message:
  `metadata.<key> is set by the platform from plan_id; send plan_id instead.`
- Shared instances: `cross_account_role_arn`, `external_id`,
  `rstreams_secret_arn`, and `rstreams_auth_arn` are refused
  (`observe_api.<key> is not accepted for shared instances.`).
- Managed / self-hosted: `cross_account_role_arn` must be
  `arn:aws:iam::<12 digits>:role/...`. `rstreams_secret_arn` and
  `rstreams_auth_arn` are written by provisioning; callers do not send them.
- Unknown keys on the MCP flat input, the HTTP body, or `instance_config` (for
  example `instance_typo`, top-level MCP `api_url`, HTTP `paymentMethodId`) are
  a **400** `Unrecognized key: "<key>"`, not stripped. Unknown `observe_api`
  keys (for example `api_base_url`) are the same. Extra keys under
  `connection_details` (other than `observe_api`) are still allowed.

## update_instance

Observe namespace is set at instance creation. `update_instance` (PUT
`/organizations/instances/{instance_id}`, SDK
`client.workspace.instances.update`, CLI `loxtep instances update`) rejects any
attempt to set, change, or remove it with **400** (`ValidationFailed`:
`Observe namespace is set at account creation and cannot be changed`). Do not
send `metadata.observe_namespace`, `metadata.observeNamespace`, or
`metadata.routing.observe_namespace` / `observeNamespace`, and do not send
`routing: {}` or `routing: null` to wipe it.

## Self-hosted install flow (new operations)

Self-hosted instances run the entire rstreams data plane in the customer AWS
account. Three operations drive the install end-to-end from MCP — no raw REST or
AWS console needed (though the user must still deploy the IAM role in their AWS
account, which they do via the one-click URL the operation gives them).

### 1. `get_deployment_urls` — step 1

No arguments (the organization is resolved from the authenticated session).

```json
{ "operation": "get_deployment_urls" }
```

Returns the one-click CloudFormation URL, the CLI command, the Terraform code,
the template download URL, the `externalId` Loxtep will use for
`sts:AssumeRole`, and the Loxtep AWS account ID. **Present these options to the
user** so they can deploy the cross-account IAM role in their AWS account. After
the CloudFormation stack completes, the user copies the `RoleArn` from the stack
Outputs tab.

This operation also persists `external_id` into `organizations.attributes` and
Secrets Manager (`loxtep/org/{org_id}/external-id`) — the provisioner reads the
secret at deploy time, so this call is **required** before step 3.

Returns `roleNameSuffix`, `deploymentRoleName`, and `deploymentStackName` for
multi-org installs in the same AWS account (one IAM role stack per Loxtep org).

### 2. `register_infrastructure` — step 2

Stores the user-supplied role ARN at the organization level. Required before
`create_instance` with `instance_type: "self-hosted"` — the provisioner reads
`organizations.attributes.cross_account_role_arn` at deploy time.

```json
{
  "operation": "register_infrastructure",
  "cross_account_role_arn": "arn:aws:iam::987654321098:role/LoxtepCrossAccountDeploymentRole",
  "region": "us-east-1"
}
```

`region` is optional (defaults to `us-east-1`). You only do this once per
organization — subsequent self-hosted instances reuse the registered role.

### 3. `get_infrastructure` — optional check

No arguments. Returns the registered role ARN + external ID, or null fields when
the org has not registered infrastructure yet. **Before step 2**, use it to skip
re-registration when the org is already configured:

```json
{ "operation": "get_infrastructure" }
```

### 4. `create_instance` — step 3

The final step — see the [self-hosted example](#self-hosted-example-shape)
above. Pass the role ARN you registered in step 2. `rstreams_secret_arn` and
`rstreams_auth_arn` are written by provisioning; callers do not send them.
`payment_method_id` is required (upfront Loxtep billing applies for self-hosted
too — AWS resources are billed separately to the customer account).

### Full flow in one agent turn

```text
user:   "Let's set up a self-hosted Loxtep instance in my AWS account."
agent:  1. get_deployment_urls → presents the one-click URL + CLI + Terraform tabs
        2. instructs user to deploy the role, copy RoleArn from CFN Outputs
        3. register_infrastructure({ cross_account_role_arn, region })
        4. create_instance({ ..., payment_method_id, connection_details.observe_api.cross_account_role_arn })
        5. polls list_instances until status="active" (~20–30 minutes)
```

The provisioner assumes the customer role via `sts:AssumeRole` (using the
external ID from step 1), deploys the rstreams CDK stack into the customer
account via `@aws-cdk/toolkit-lib`, and writes stack outputs back into the
instance's `connection_details.observe_api`. Monitoring is via the Observe proxy
— no CloudWatch cross-account sharing is configured by the provisioner.

## Connector runtime on an instance (read-only first)

Public SaaS connectors run on shared `connectors-{256,512,1024,2048}` Lambdas
(`vpc.enabled: false` on the runtimes microservice). Sources that are not
internet-reachable need the dedicated `connectors-private-512` bot, which
attaches only to customer private subnets and a connector security group.

**Inspect (do not mutate):**

1. `list_instances` — confirm `status: active` and record `instance_id`. The
   payload has no VPC IDs, subnet IDs, or ARNs.
2. `get_infrastructure` — role ARN / external ID for managed and self-hosted.
3. `loxtep_observe` → `list_observe_bots` with `instance_id` (permission
   `instances:read`). Look for `connectors-private-512` when the source is
   private.

```json
{ "operation": "list_observe_bots", "instance_id": "<uuid>" }
```

**Ownership:** the customer owns the VPC, two private subnet IDs, the connector
security group, routing, and source firewall rules. Loxtep packages
`connectors-private-512` and the instance provisioner attaches it when
`connection_details.connector_vpc` is set.

Set networking on the **instance** (ask the customer for two private subnet IDs
in different AZs and one security group ID):

At create:

```json
{
  "operation": "create_instance",
  "name": "<name>",
  "region": "<region>",
  "instance_type": "self-hosted",
  "payment_method_id": "550e8400-e29b-41d4-a716-446655440000",
  "connection_details": {
    "observe_api": {
      "cross_account_role_arn": "arn:aws:iam::123456789012:role/LoxtepCrossAccountDeploymentRole"
    },
    "connector_vpc": {
      "subnet_ids": ["subnet-0123456789abcdef0", "subnet-0fedcba9876543210"],
      "security_group_id": "sg-0123456789abcdef0"
    }
  }
}
```

On an existing instance (MCP `update_instance`, SDK, CLI, or the instance
settings UI):

```json
{
  "operation": "update_instance",
  "instance_id": "<uuid>",
  "connection_details": {
    "connector_vpc": {
      "subnet_ids": ["subnet-<az1>", "subnet-<az2>"],
      "security_group_id": "sg-<id>"
    }
  }
}
```

Reapply the runtimes stack without changing VPC (retry a failed attach, pick up
a new runtimes package):

```json
{
  "operation": "update_instance",
  "instance_id": "<uuid>",
  "force_runtimes_redeploy": true
}
```

Same fields on other surfaces (permission `instances:update` /
`instances:create`):

```ts
await client.workspace.instances.create({
  name, region, instance_type: 'self-hosted', payment_method_id,
  connection_details: { observe_api: { cross_account_role_arn }, connector_vpc: { subnet_ids: [...], security_group_id } },
});
await client.workspace.instances.update(instanceId, {
  connection_details: { connector_vpc: { subnet_ids: [...], security_group_id } },
});
await client.workspace.instances.redeploy_runtimes(instanceId);
```

```bash
loxtep instances create --name <n> --region <region> --type self-hosted \
  --payment-method-id <uuid> --cross-account-role-arn <arn> \
  --rstreams-secret-arn <arn> --rstreams-auth-arn <arn> \
  --subnet-id subnet-<az1> --subnet-id-2 subnet-<az2> --security-group-id sg-<id>
loxtep instances update <instance_id> \
  --subnet-id subnet-<az1> --subnet-id-2 subnet-<az2> --security-group-id sg-<id>
loxtep instances redeploy-runtimes <instance_id>
```

The HTTP API only requires `cross_account_role_arn` at create. The current CLI
also requires the two secret ARNs. On loxtep-sdk `main`
(`de6bc7c0e7380f3d1afee9556d5a5b6bd2b0dd4b`), `parseCreateInstanceArgs` L297–302
throws
`self-hosted requires --cross-account-role-arn, --rstreams-secret-arn, and --rstreams-auth-arn`
without `--rstreams-secret-arn` and `--rstreams-auth-arn`. The example includes
those flags so it runs as the CLI exists today. Provisioning writes the secret
ARNs; prefer MCP or HTTP create without them. Managed CLI create does not
require the secret flags. The TypeScript/CLI snippets above use placeholders
(`name`, `<n>`, `<uuid>`) and were **not** run through the schemas; the JSON
create bodies in this skill were. Tracked at
https://github.com/LoxtepInc/loxtep-sdk/issues/71 (CLI still requires both
secret ARNs; `parseCreateInstanceArgs` L286–287 still names
`starter|pro|enterprise`).

The platform reapplies the per-instance runtimes stack (`force_redeploy`). The
customer does not run a Loxtep microservice deploy. Shared `connectors-*`
workers stay off the customer VPC.

CloudFormation `UPDATE_COMPLETE` is not proof that VPC attached. Confirm the
private connector Lambda (`botconnectorsprivate512…`) `VpcConfig` SubnetIds and
SecurityGroupIds match `connection_details.connector_vpc`. If a stack completed
without `VpcConfig`, retry after the organizations runtimes provisioner includes
the logical-ID template patch:

```bash
loxtep instances redeploy-runtimes <instance_id>
```

Runtimes upgrades keep `connector_vpc` on the instance record. Connector
create/test is **`connect-external-system`**. Workflow deploy onto the private
Lambda is **`loxtep-deployments`**.

## Bring your own Lambda (BYOL)

Register a customer-deployed Lambda with LeoCron **without** Studio workflow
deploy. Dedicated instances only (self-hosted or managed with
`cross_account_role_arn` + `external_id`). Shared instances are rejected.

**Projects / Studio deploy are not required for the function.** Registration
creates `{bot_id}-in` / `-out` / `-errors`. Bind a catalog data product to the
publish queue (`{bot_id}-out`) afterward. Do not create a Studio workflow to
“connect” the Lambda. Do not pass `source_queue` / `destination_queue` as a
workflow container queue (`w-…-queue-…`).

**When to use which (hybrid OK):** BYOL = customer-owned Lambda on the bus.
Connector **Trigger** ingest / **Target** delivery = Loxtep workflow hops
(`connect-external-system`, `data-workflows`, delivery guide). Studio custom
code (MicroVM) = Loxtep hosts the hop. Mix on one dedicated instance; join via
queue name + catalog bind — not by retargeting BYOL cron onto `w-…-queue-…`.

Customer guide: `/docs/guides/bring-your-own-lambda` (section **When to use
which**).

### Agent flow

1. `list_instances` — confirm instance type is not `shared`.
2. Ensure the Lambda is in the **same AWS account/region** as the instance bus.
3. `loxtep instances stream-config` / REST stream-config for bus resource names
   (not over MCP). Tell the customer to set `RSTREAMS_CONFIG_SECRET` and
   `LEOAUTH_CONFIG_SECRET` on the function.
4. Register (leave queues default):

```json
{
  "operation": "register_custom_bot",
  "instance_id": "<uuid>",
  "name": "My Worker",
  "slug": "my-worker",
  "lambda_name": "my-company-worker",
  "paused": true,
  "_metadata": { "skill_name": "loxtep-instances" }
}
```

5. Return `iam_policy` + checklist from the response; customer attaches IAM to
   the Lambda role.
6. **Bind a data product to `{bot_id}-out`** (not `-in` / `-errors`):
   - Prefer dry-run then run
     `POST /dataproducts/dataproducts/runtime-queue-reconciliation`
     (`instance_id`, `dry_run`). Needs `system:admin` | `data_products:admin` |
     `instances:update` (skill **data-product-modeling**). Do not instruct
     customers to set internal storage queue fields — bindings come from
     reconciliation or deploy.
   - Stub insert needs an active org project (placeholder deployment/workflow is
     DB-only). If there is no project, say stub insert will skip until one
     exists — still do not invent a Studio graph for the Lambda.
   - List stubs: `GET /dataproducts?synthetic_visibility=include`.
7. Unpause in Observe (LeoCron `paused` is runtime SoT after first register).
8. Optional: `reconcile_custom_bots` for catalog ↔ LeoCron drift.

CLI (SDK): `loxtep bots register|list|get|update|deregister|reconcile`.

Permissions: `instances:bots:write` / `instances:bots:read`.

<!-- BEGIN loxtep skill-scope (skill-package-v1) -->

## Agent-Scope Skill scope (`.loxtep/skills/loxtep-instances.yaml`)

Resource scope and operation permissions for this Agent-Scope Skill, conformant
with the [`skill-package-v1`](https://loxtep.io/schemas/skill-package-v1.json)
schema. Any resource type or operation not listed is **denied (fail-closed)**.
Identifier lists are empty placeholders — fill them with the specific resources
in your workspace. This declaration does not change the hosted MCP config
(`mcp.loxtep.io`).

```yaml
# .loxtep/skills/loxtep-instances.yaml
# Conforms to https://loxtep.io/schemas/skill-package-v1.json
# Fail-closed: this skill's facades are RBAC-governed and carry no data-mesh resource scope.
name: loxtep-instances
description: Runtime instance provisioning — RBAC/billing-governed; no data-mesh resource scope.
scope:
  data_products: []
  connectors: []
  workflows: []
  domains: []
  queues: []
permissions: {}
```

<!-- END loxtep skill-scope (skill-package-v1) -->

## Skill attribution (required)

MCP tool calls need a resolvable skill name. Prefer
`"_metadata": { "skill_name": "loxtep-instances" }` alongside other fields;
otherwise the server infers from the operation map or `X-Skill-Name`.
Unresolvable calls are denied (`MISSING_SKILL_ATTRIBUTION`). The skill name also
drives scope checks.

## Auth

If MCP returns missing JWT / auth errors, reconnect the Loxtep MCP server to
re-trigger OAuth (Agent-Scope Skill **loxtep-auth**).

## References

- [User story catalog](../../../docs/skills-user-stories.md) (story **S11**)
- Private connector path: **`connect-external-system`**
- Workflow deploy onto `connectors-private-512`: **`loxtep-deployments`**
