---
name: loxtep-instances
description:
  'Use when the user works with Loxtep runtime instances via Customer MCP -
  list_instances, create_instance, instance provisioning, shared vs managed,
  starter plan, plan_id, Stripe Checkout, regions, or "create a Loxtep
  instance". Self-hosted install flow: get_deployment_urls, then
  register_infrastructure once per remote AWS account, then create_instance with
  that account's role ARN. get_infrastructure lists every registered account. Do
  not skip a second account because one role is already listed. BYOL custom
  Lambda registration: register_custom_bot / list_custom_bots /
  deregister_custom_bot / reconcile_custom_bots (dedicated instances only). Also
  inspect whether an instance''s connector runtime is ready for public or
  customer-VPC (private-network) sources.'
metadata:
  documentation: https://github.com/LoxtepInc/loxtep-plugins-skills/blob/main/kiro/skills/loxtep-instances/SKILL.md
---

<!-- GENERATED FILE -- single source: loxtep/scripts/plugins-skills-generate-skills.mjs. From the loxtep root run `PLUGINS_SKILLS_ROOT=<plugins-skills> node scripts/sync-skills-to-plugins-skills.mjs` (or that generator with PLUGINS_SKILLS_ROOT set). Do not edit client copies; do not run sibling scripts/generate-skills.mjs. -->

# Loxtep instances (Customer MCP)

## Tool shape

- **MCP tool:** `loxtep_workspace`
- **Arguments:**
  `{ "operation": "list_instances" | "create_instance" | "update_instance" | "get_deployment_urls" | "register_infrastructure" | "get_infrastructure" | "register_custom_bot" | "list_custom_bots" | "get_custom_bot" | "update_custom_bot" | "deregister_custom_bot" | "reconcile_custom_bots", ...fields }`

### Paid provisioning — Stripe Checkout

- Never ask for card numbers, CVV, bank details, Stripe Price IDs, or saved
  payment-method IDs in chat.
- Paid `create_instance` calls reserve a `payment_pending` instance. Direct the
  user to the Loxtep billing UI to complete Stripe Checkout. Provisioning starts
  only after Stripe confirms the subscription.

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

| `instance_type`   | Meaning                                          | Create requirements                                                                                                                                       |
| ----------------- | ------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`shared`**      | Default **free-tier playground** (multi-tenant). | Omit `plan_id` or send **`free`**. Paid **`starter`** is also shared. Never send managed or self-hosted plan IDs. Do not send role or secret coordinates. |
| **`managed`**     | Paid **dedicated** bus operated by Loxtep.       | **`growth`/`scale`** and **`connection_details.observe_api.cross_account_role_arn`**. Provisioning writes secret and proxy-role ARNs.                     |
| **`self-hosted`** | Customer-operated dedicated bus in customer AWS. | **`sh_core`/`sh_production`/`sh_scale`** and **`connection_details.observe_api.cross_account_role_arn`**. Loxtep license pricing excludes AWS charges.    |

### Field summary

| Field                             | Notes                                                                                                                                                                                                                                                                                                          |
| --------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `name`, `region`, `instance_type` | Required.                                                                                                                                                                                                                                                                                                      |
| `plan_id`                         | Top-level only. `free`/`starter` for shared; `growth`/`scale` for managed; `sh_core`/`sh_production`/`sh_scale` for self-hosted. Do not send plan fields under `metadata`.                                                                                                                                     |
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
- `plan_id`: `sh_core`, `sh_production`, or `sh_scale`
- `connection_details.observe_api.cross_account_role_arn` — the IAM role ARN for
  the AWS account this instance runs in. Register that ARN with
  `register_infrastructure` first. Self-hosted create returns **400**
  `Register this AWS account before creating the instance.` when the ARN is not
  on the organization's `cross_account_roles` list.
- Do **not** send `rstreams_secret_arn` or `rstreams_auth_arn` — they are
  written by provisioning from the deployed stack's outputs. Sending
  `observe_proxy_role_arn` is a 400.

```json
{
  "operation": "create_instance",
  "name": "Customer VPC mesh",
  "region": "us-east-1",
  "instance_type": "self-hosted",
  "plan_id": "sh_production",
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

- A plan ID paired with the wrong hosting model is invalid.
- `payment_method_id` and `price_id` are not accepted create arguments.
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

After the row is saved, the handler sends `instances-updated`. If that send
throws, the call returns HTTP **500** with message
`The instance update was saved but the instances-updated event was not sent.`
and details `{ instance_id }`. The saved fields stay saved.
`runtimes-deployment-requested` and the Botmon Lite upgrade request are not
sent. Send the same update again. Each save sends `instances-updated` again with
a new timestamp. The handler does not skip that send.

`runtimes-deployment-requested` is sent only after `instances-updated` succeeds,
and only for `managed` or `self-hosted` when connector networks changed or
`force_runtimes_redeploy` is `true`. Shared instances do not send it. If that
send throws, the call returns HTTP **500** with message
`The instance update was saved but the runtimes-deployment-requested event was not sent.`
and details `{ instance_id }`. `instances-updated` was already sent. The saved
fields stay saved. A later call sends `instances-updated` again. It sends
`runtimes-deployment-requested` again only when the stored networks still differ
from the body or `force_runtimes_redeploy` is `true`. A network change that was
already saved does not differ, so repeat that call with
`force_runtimes_redeploy: true`. The handler does not deduplicate either event.
The runtimes event sets `metadata.force_redeploy` to `true`, and the runtimes
bot updates a stack that is already deployed when that flag is set.

If `botmon_lite_allowed_cidrs` changed, both of those send failures put the
previous allowlist back before the 500. Other fields from the call stay saved.
If that restore fails, the 500 is
`Botmon Lite allowlist was saved but not applied, and the automatic rollback failed. The stored allowlist no longer matches the running stack and must be reconciled manually before the next upgrade.`
with `rollback_failed: true`. Reconcile the stored list by hand before the next
upgrade. The same restore runs when the allowlist upgrade request itself fails.
That message is
`Botmon Lite allowlist was not applied because the upgrade request failed; only the allowlist was reverted and other updated fields remain saved.`

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

### 2. `register_infrastructure` — once per remote AWS account

Adds one cross-account role ARN. Call it again with a different account ARN for
stage, production, or another account. Earlier roles stay. Sending the same ARN
again refreshes that entry's `region` and `registered_at`. The external ID stays
one secret shared by every account. A new role ARN past 32 returns **400**
`An organization can register at most 32 AWS accounts.` Sending an ARN that is
already in the list still refreshes that entry.

Each self-hosted instance deploys and upgrades with the role you pass to
`create_instance` (`connection_details.observe_api.cross_account_role_arn`).
With several registered roles and no role on the instance, provisioning fails
with
`This organization has <count> registered AWS accounts. Choose the role stored on the instance.`

Stage, then production:

```json
{
  "operation": "register_infrastructure",
  "cross_account_role_arn": "arn:aws:iam::123456789012:role/LoxtepCrossAccountDeploymentRole",
  "region": "us-east-1"
}
```

```json
{
  "operation": "register_infrastructure",
  "cross_account_role_arn": "arn:aws:iam::987654321098:role/LoxtepCrossAccountDeploymentRole",
  "region": "us-east-1"
}
```

`region` is optional. When you omit it, the call uses the organization's current
preferred region, or `us-east-1`. The response lists every registered role
(`cross_account_roles`: `arn`, `account_id`, `region`, `registered_at`) plus
`preferred_region` and `infrastructure_registered_at`. `cross_account_role_arn`
on the register response is the ARN you just sent. The stored first role stays
the first ARN in the list.

### 3. `get_infrastructure` — list registered accounts

No arguments. Returns `cross_account_roles` and the external ID.
`cross_account_role_arn` is the first registered role. An empty
`cross_account_roles` list means no account is registered yet. One listed
account does not cover a second account. Do not skip `register_infrastructure`
for stage or production because this call already shows one role.

```json
{ "operation": "get_infrastructure" }
```

### 4. `create_instance` — pass the chosen role

See the [self-hosted example](#self-hosted-example-shape) above. Pass the role
ARN for the account this instance runs in. After the two registrations above, a
production instance sends the production ARN:

```json
{
  "operation": "create_instance",
  "name": "Production mesh",
  "region": "us-east-1",
  "instance_type": "self-hosted",
  "plan_id": "sh_production",
  "connection_details": {
    "observe_api": {
      "cross_account_role_arn": "arn:aws:iam::987654321098:role/LoxtepCrossAccountDeploymentRole"
    }
  }
}
```

`rstreams_secret_arn` and `rstreams_auth_arn` are written by provisioning;
callers do not send them. The create returns `payment_pending`; the user
completes Stripe Checkout in the app. AWS resources remain billed separately to
the customer account. An ARN that is not registered returns **400**
`Register this AWS account before creating the instance.`

### Full flow in one agent turn

```text
user:   "Let's set up a self-hosted Loxtep instance in my AWS account."
agent:  1. get_deployment_urls → presents the one-click URL + CLI + Terraform tabs
        2. instructs user to deploy the role in each AWS account and copy each RoleArn
        3. register_infrastructure once per account (stage ARN, then production ARN)
        4. create_instance with connection_details.observe_api.cross_account_role_arn
           set to the ARN for the account this instance runs in
        5. directs the user to complete Stripe Checkout in the app
        6. polls list_instances until status="active" (~20–30 minutes)
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
2. `get_infrastructure` — `cross_account_roles` and the external ID for managed
   and self-hosted. An empty list means no account is registered. One listed
   account does not cover a second account.
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

Additional networks go on `connection_details.connector_vpcs`: up to 7 entries,
each `{ "id", "subnet_ids", "security_group_id" }`. `id` is 1–16 characters
`[a-z0-9]` and `default` is reserved. A subnet or security group belongs to one
network. Each extra network gets its own copy of the private connector function
(`BotConnectorsPrivateAtt{Id}`). A connector stays on the primary network unless
its metadata sets `connector_vpc_id` to an extra id. `connector_vpcs: null`
clears extras only. `connector_vpc: null` clears the primary network. Shared
instances reject both. Removing an extra network that a connector still uses
returns **409** (`Connector network in use`). The message names those connectors
and says to clear `connector_vpc_id` on them first.

A stored `connector_vpcs` that is absent or null means no extra networks. A
present value that does not match the list shape throws
`Invalid connection_details.connector_vpcs` and is not read as an empty list.

If the role can call `ec2:DescribeSubnets`, the provisioner checks that every
network's subnets exist and share a VPC. The different-Availability-Zone check
applies only to extra `connector_vpcs` networks. The primary `connector_vpc` is
checked only for subnet existence and the same VPC. If the role cannot call
`ec2:DescribeSubnets`, the runtimes deploy fails with
`DescribeSubnetsDeniedError` and does not skip the check.

Set networking on the **instance** (ask the customer for two private subnet IDs
in different AZs and one security group ID):

At create:

```json
{
  "operation": "create_instance",
  "name": "<name>",
  "region": "<region>",
  "instance_type": "self-hosted",
  "plan_id": "sh_production",
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

If that call returns 500
`The instance update was saved but the runtimes-deployment-requested event was not sent.`,
the row is saved and the runtimes event was not queued. `instances-updated` was
already sent. Call `update_instance` again with `force_runtimes_redeploy: true`
to queue the runtimes event. That call sends `instances-updated` again. See
[update_instance](#update_instance).

Same fields on other surfaces (permission `instances:update` /
`instances:create`):

```ts
await client.workspace.instances.create({
  name, region, instance_type: 'self-hosted', plan_id: 'sh_production',
  connection_details: { observe_api: { cross_account_role_arn }, connector_vpc: { subnet_ids: [...], security_group_id } },
});
await client.workspace.instances.update(instanceId, {
  connection_details: { connector_vpc: { subnet_ids: [...], security_group_id } },
});
await client.workspace.instances.redeploy_runtimes(instanceId);
```

```bash
loxtep instances create --name <n> --region <region> --type self-hosted \
  --plan sh_production --cross-account-role-arn <arn> \
  --rstreams-secret-arn <arn> --rstreams-auth-arn <arn> \
  --subnet-id subnet-<az1> --subnet-id-2 subnet-<az2> --security-group-id sg-<id>
loxtep instances update <instance_id> \
  --subnet-id subnet-<az1> --subnet-id-2 subnet-<az2> --security-group-id sg-<id>
loxtep instances redeploy-runtimes <instance_id>
```

The HTTP API only requires `plan_id` and `cross_account_role_arn` at create. The
current CLI still implements the retired billing contract. On loxtep-sdk `main`
(`de6bc7c0e7380f3d1afee9556d5a5b6bd2b0dd4b`), `parseCreateInstanceArgs` L297–302
throws
`self-hosted requires --cross-account-role-arn, --rstreams-secret-arn, and --rstreams-auth-arn`
without `--rstreams-secret-arn` and `--rstreams-auth-arn`. The example includes
those flags only to document the old CLI limitation. Provisioning writes the
secret ARNs; prefer MCP or the app for paid creation. The TypeScript/CLI
snippets above use placeholders (`name`, `<n>`, `<uuid>`) and were **not** run
through the schemas. The JSON create and `register_infrastructure` bodies in
this skill were **not** re-checked against the schemas for this update
(unverified). Tracked at https://github.com/LoxtepInc/loxtep-sdk/issues/71 (CLI
still requires both secret ARNs and retired plan names).

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
