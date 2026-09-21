<!-- GENERATED FILE -- edit skills/<slug>/SKILL.md (or rule.mdc.src.md) and run `node scripts/generate-skills.mjs` -- do not edit directly -->
---
name: loxtep-instances
description:
  Use when the user works with Loxtep runtime instances via Customer MCP -
  list_instances, create_instance, instance provisioning, shared vs managed,
  starter plan, plan_id, payment_method_id, billing UI (add payment methods in
  app, not MCP), regions, or "create a Loxtep instance". Self-hosted install
  flow: get_deployment_urls -> register_infrastructure -> get_infrastructure ->
  create_instance. Also inspect whether an instance's connector runtime is ready
  for public or customer-VPC (private-network) sources.
metadata:
  documentation: https://github.com/LoxtepInc/loxtep-plugins-skills/blob/main/opencode/skills/loxtep-instances/SKILL.md
---

# Loxtep instances (Customer MCP)

## Tool shape

- **MCP tool:** `loxtep_workspace`
- **Arguments:**
  `{ "operation": "list_instances" | "create_instance" | "get_deployment_urls" | "register_infrastructure" | "get_infrastructure", ...fields }`

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

| `instance_type`   | Meaning                                                                                | Create requirements                                                                                                                                                              |
| ----------------- | -------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`shared`**      | Default **free-tier playground** (multi-tenant).                                       | Omit or **`free`** only. **Never** `starter` / `pro` / `enterprise` — API validation **rejects** shared + paid plan.                                                             |
| **`managed`**     | Paid **dedicated** bus (remote account/region — same AWS access model as self-hosted). | **`starter`/`pro`/`enterprise`**, **`payment_method_id`**, and **`connection_details.observe_api.cross_account_role_arn`** (plus stream secret ARNs as provisioning fills them). |
| **`self-hosted`** | Customer-operated dedicated bus.                                                       | **`payment_method_id`** + **`connection_details.observe_api`** with **`cross_account_role_arn`**, stream **integration** secret ARN, and **auth** secret ARN.                    |

### Field summary

| Field                             | Notes                                                                                                                             |
| --------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `name`, `region`, `instance_type` | Required.                                                                                                                         |
| `plan_id`                         | Required for **managed**. Omit or non-paid for **shared**.                                                                        |
| `payment_method_id`               | **Required** for **managed** and **self-hosted**. Omit for **shared**. Value is a UUID for a method **already** saved in the app. |
| `connection_details`              | **Required for managed and self-hosted** — nested `observe_api` with the role (+ stream ARNs). Same remote-access shape for both. |

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

**Paid Starter (managed)** — same observe_api remote-access shape as
self-hosted:

```json
{
  "operation": "create_instance",
  "name": "Production mesh",
  "region": "us-east-1",
  "instance_type": "managed",
  "plan_id": "starter",
  "payment_method_id": "550e8400-e29b-41d4-a716-446655440000",
  "connection_details": {
    "observe_api": {
      "cross_account_role_arn": "arn:aws:iam::123456789012:role/LoxtepCrossAccountDeploymentRole",
      "rstreams_secret_arn": "arn:aws:secretsmanager:us-east-1:123456789012:secret:resources",
      "rstreams_auth_arn": "arn:aws:secretsmanager:us-east-1:123456789012:secret:auth"
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
- `connection_details.observe_api.rstreams_secret_arn` — Secrets Manager ARN of
  the rstreams resources secret (in the customer AWS account)
- `connection_details.observe_api.rstreams_auth_arn` — Secrets Manager ARN of
  the rstreams auth secret (in the customer AWS account)

```json
{
  "operation": "create_instance",
  "name": "Customer VPC mesh",
  "region": "us-east-1",
  "instance_type": "self-hosted",
  "payment_method_id": "550e8400-e29b-41d4-a716-446655440000",
  "connection_details": {
    "observe_api": {
      "cross_account_role_arn": "arn:aws:iam::123456789012:role/LoxtepCrossAccountDeploymentRole",
      "rstreams_secret_arn": "arn:aws:secretsmanager:us-east-1:123456789012:secret:loxtep/rstreams/resources-ABC",
      "rstreams_auth_arn": "arn:aws:secretsmanager:us-east-1:123456789012:secret:loxtep/rstreams/auth-XYZ"
    }
  }
}
```

The earlier shape that only sent `cross_account_role_arn` is **wrong** — the API
rejects self-hosted without all three `observe_api` ARNs.

### Wrong patterns (validation / API error)

- `instance_type: "shared"` + `plan_id: "starter"` — **invalid** (use
  **managed** + `plan_id` + `payment_method_id`).
- **Managed** or **self-hosted** without **`payment_method_id`** — **invalid**
  at MCP and API.
- **Self-hosted** without **`connection_details.observe_api`** ARNs —
  **invalid**.

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
above. Pass the role ARN you registered in step 2 plus the two rstreams secret
ARNs the user created in their AWS account. `payment_method_id` is required
(upfront Loxtep billing applies for self-hosted too — AWS resources are billed
separately to the customer account).

### Full flow in one agent turn

```text
user:   "Let's set up a self-hosted Loxtep instance in my AWS account."
agent:  1. get_deployment_urls → presents the one-click URL + CLI + Terraform tabs
        2. instructs user to deploy the role, copy RoleArn from CFN Outputs
        3. register_infrastructure({ cross_account_role_arn, region })
        4. instructs user to create rstreams resources + auth secrets,
           copy both secret ARNs
        5. create_instance({ ..., payment_method_id, connection_details.observe_api.* })
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
  "payment_method_id": "<uuid>",
  "connection_details": {
    "observe_api": { "cross_account_role_arn": "<role-arn>" },
    "connector_vpc": {
      "subnet_ids": ["subnet-<az1>", "subnet-<az2>"],
      "security_group_id": "sg-<id>"
    }
  }
}
```

On an existing instance (MCP `update_instance` or the instance settings UI):

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

Permission: `instances:update`. The platform reapplies the per-instance runtimes
stack (`force_redeploy`). The customer does not run a Loxtep microservice
deploy. Shared `connectors-*` workers stay off the customer VPC.

Runtimes upgrades keep `connector_vpc` on the instance record. Connector
create/test is **`connect-external-system`**. Workflow deploy onto the private
Lambda is **`loxtep-deployments`**.

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

## Optional attribution

Add `"_metadata": { "skill_name": "loxtep-instances" }` alongside other fields.

## Auth

If MCP returns missing JWT / auth errors, reconnect the Loxtep MCP server to
re-trigger OAuth (Agent-Scope Skill **loxtep-auth**).

## References

- [User story catalog](../../../docs/skills-user-stories.md) (story **S11**)
- Private connector path: **`connect-external-system`**
- Workflow deploy onto `connectors-private-512`: **`loxtep-deployments`**
