---
name: loxtep-instances
description:
  'Use when the user works with Loxtep runtime instances via Customer MCP -
  list_instances, create_instance, instance provisioning, shared vs managed,
  starter plan, plan_id, Stripe Checkout, regions, or "create a Loxtep
  instance". Self-hosted install flow: get_deployment_urls, then
  register_infrastructure once per remote AWS account with meter_role_arn and
  bus_lifecycle_role_arn, then create_instance with that account's bus lifecycle
  role ARN. get_infrastructure lists every registered account. Do not skip a
  second account because one role is already listed. BYOL custom Lambda
  registration: register_custom_bot / list_custom_bots / deregister_custom_bot /
  reconcile_custom_bots (dedicated instances only). Also inspect whether an
  instance''s connector runtime is ready for public or customer-VPC
  (private-network) sources. Stop managing an instance is REST detach (status
  detached), not an MCP tool.'
metadata:
  documentation: https://github.com/LoxtepInc/loxtep-plugins-skills/blob/main/cursor/skills/loxtep-instances/SKILL.md
---

<!-- GENERATED FILE -- single source: loxtep/scripts/plugins-skills-generate-skills.mjs. From the loxtep root run `PLUGINS_SKILLS_ROOT=<plugins-skills> node scripts/sync-skills-to-plugins-skills.mjs` (or that generator with PLUGINS_SKILLS_ROOT set). Do not edit client copies; do not run sibling scripts/generate-skills.mjs. -->

# Loxtep instances (Customer MCP)

## Tool shape

- **MCP tool:** `loxtep_workspace`
- **Arguments:**
  `{ "operation": "list_instances" | "create_instance" | "update_instance" | "get_deployment_urls" | "register_infrastructure" | "get_infrastructure" | "register_custom_bot" | "list_custom_bots" | "get_custom_bot" | "update_custom_bot" | "deregister_custom_bot" | "reconcile_custom_bots", ...fields }`

There is no MCP operation to detach an instance or to delete an instance. Do not
invent one. Use the REST calls in
[Stop managing an instance](#stop-managing-an-instance), or **Stop managing** /
**Delete** on the organization Instances page.

### Paid provisioning — Stripe Checkout

- Never ask for card numbers, CVV, bank details, Stripe Price IDs, or saved
  payment-method IDs in chat.
- Paid `create_instance` calls reserve a `payment_pending` instance. Direct the
  user to the Loxtep billing UI to complete Stripe Checkout. Provisioning starts
  only after Stripe confirms the subscription.

## Stop managing an instance

`list_instances` can return `status` `detached`.

**Stop managing** calls `POST /organizations/instances/{instance_id}/detach`
(permission `instances:delete`). `bots` is `leave` (default) or `pause`. When
the instance is self-hosted, or `observe_api` holds a customer role ARN (a value
that is not `ObserveProxyRole`), the body also needs `cross_account_access`:
`meter` or `none`. Omitting it returns **400**
`Choose cross_account_access meter or none before detaching this instance.`
`meter` keeps `meter_role_arn` and `cross_account_role_arn` and removes
`bus_lifecycle_role_arn` and `workflow_deploy_role_arn`. `none` removes all
four. Detach does not delete IAM roles and does not change the organization
registration. It stores `metadata.cross_account_access`, sets
`metadata.control_plane` to `detached`, and sets `metadata.deploy_role_use` to
`stopped`. An already-detached instance returns **200** with `data.idempotent`
`true` and does not apply the choice again.

While `status` is `detached`:

- `update_instance` and `PUT /organizations/instances/{instance_id}` return
  **409** `INSTANCE_DETACHED`:
  `This instance is not managed. Deploy a project to attach it again.`
- `POST /organizations/instances/{instance_id}/upgrade` returns **409**
  `INSTANCE_DETACHED`:
  `This instance is not managed. Deploy a project to attach it again before upgrading.`
- `POST /organizations/instances/{instance_id}/context-refresh` returns **409**
  `INSTANCE_DETACHED`:
  `This instance is not managed. Deploy a project to attach it again before requesting a context refresh.`
- Health is degraded: `Loxtep is not managing this instance. It keeps running.`
  Deep health (`GET /organizations/instances/{instance_id}/health?deep=true`)
  does not poll the instance.

Deploying a project or a workflow to that instance attaches it again (`status`
returns to `active`).

`DELETE /organizations/instances/{instance_id}` returns **400**
`STACK_TEARDOWN_CONFIRMATION_REQUIRED` when the instance is self-hosted
(`metadata.instance_type` or `connection_details.type`) and metadata has a
non-empty `stack_name`, `rstreams_stack_prefix`, or `runtimes_stack_name`,
unless the body is `{ "confirm_stack_teardown": true }`. `stack_id` alone does
not require that flag.

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

| `instance_type`   | Meaning                                          | Create requirements                                                                                                                                                                                                   |
| ----------------- | ------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`shared`**      | Default **free-tier playground** (multi-tenant). | Omit `plan_id` or send **`free`**. Paid **`starter`** is also shared. Never send managed or self-hosted plan IDs. Do not send role or secret coordinates.                                                             |
| **`managed`**     | Paid **dedicated** bus operated by Loxtep.       | **`growth`/`scale`** and **`connection_details.observe_api.cross_account_role_arn`**. Managed create does not copy tier ARNs. Provisioning writes secret and proxy-role ARNs.                                         |
| **`self-hosted`** | Customer-operated dedicated bus in customer AWS. | **`sh_core`/`sh_production`/`sh_scale`** and **`connection_details.observe_api.cross_account_role_arn`** (the bus lifecycle role ARN). Create copies recorded tier ARNs. Loxtep license pricing excludes AWS charges. |

### Field summary

| Field                             | Notes                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `name`, `region`, `instance_type` | Required.                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| `plan_id`                         | Top-level only. `free`/`starter` for shared; `growth`/`scale` for managed; `sh_core`/`sh_production`/`sh_scale` for self-hosted. Do not send plan fields under `metadata`.                                                                                                                                                                                                                                                                                          |
| `connection_details`              | **Required for managed and self-hosted** — nested `observe_api` with `cross_account_role_arn` only. Do not send `meter_role_arn`, `bus_lifecycle_role_arn`, or `workflow_deploy_role_arn` on create (`observe_api` is `.strict()`). `rstreams_secret_arn`, `rstreams_auth_arn`, and `code_bucket` are written by provisioning; callers do not send them. Namespace, `api_url`, and `stack_id` are always server-derived. Sending `observe_proxy_role_arn` is a 400. |

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
      "cross_account_role_arn": "arn:aws:iam::123456789012:role/LoxtepBusLifecycleRole"
    }
  }
}
```

### Self-hosted example (shape)

**Required fields for self-hosted** (validated in
`_core/src/validation/organizations-instances-post.ts`):

- `name`, `region`, `instance_type: "self-hosted"`
- `plan_id`: `sh_core`, `sh_production`, or `sh_scale`
- `connection_details.observe_api.cross_account_role_arn` — the bus lifecycle
  role ARN for the AWS account this instance runs in. Self-hosted create matches
  a registered account whose `arn` or `bus_lifecycle_role_arn` equals that
  value, then copies `meter_role_arn`, `bus_lifecycle_role_arn`, and, when
  present, `workflow_deploy_role_arn` onto the instance. A miss returns **400**
  `Register this AWS account before creating the instance.` Do not send the tier
  fields on create.
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
      "cross_account_role_arn": "arn:aws:iam::123456789012:role/LoxtepBusLifecycleRole"
    }
  }
}
```

Only `cross_account_role_arn` is required on `observe_api` at create.
`rstreams_secret_arn`, `rstreams_auth_arn`, and `code_bucket` are written by
provisioning; callers do not send them. See
[Workflow code bucket](#workflow-code-bucket).

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
  `code_bucket` is one of those extra create keys. Do not send it. Provisioning
  replaces whatever is stored with the computed bucket name when it records the
  field. Update rejects `code_bucket` (`Unrecognized key: "code_bucket"`).

### Workflow code bucket

Managed and self-hosted runtimes deploys create
`org-{org8}-{inst8}-{account}-code` in the account the runtimes stack runs in
(your account for self-hosted, the Loxtep account for managed). `org8` and
`inst8` are the first 8 hex characters of the organization id and instance id
with dashes removed. `account` is that stack's 12-digit account id. The bucket
uses SSE-S3, blocks public access, and requires TLS. The runtimes role can read
that bucket only: `s3:GetObject` on its objects, and `s3:ListBucket` and
`s3:GetBucketLocation` on the bucket. `LoxtepWorkflowDeployRole` allows
`arn:aws:s3:::org-*`. That role exists when the template parameter
`AttachControlPlane` is true. `LoxtepBusLifecycleRole` denies `s3:*` on
`arn:aws:s3:::org-*-code`.

Provisioning writes `connection_details.code_bucket` to that name when it
submits the runtimes stack. Callers do not send it. A stored value, including
one accepted on create because `connection_details` is passthrough, is replaced
by the computed name. Shared and multitenant instances skip the per-instance
runtimes deploy and do not get this field.

- **Create.** The HTTP create handler does not write the field. After the core
  stack finishes, `runtimes-deployment-requested` submits the runtimes stack and
  records the name immediately before that submit.
- **Upgrade.** `POST /organizations/instances/{instance_id}/upgrade` only queues
  `instances-upgrade-requested`. For managed, and for self-hosted when a
  runtimes stack or the control plane is recorded, the upgrade bot records the
  name in `sync-runtimes-import-release` when that step runs with a database
  connection, and again when the follow-on runtimes deploy submits. A recorded
  `workflow_deploy_role_arn` emits `runtimes-deployment-requested`. That event
  sets `metadata.force_redeploy` to `true`, so an already-deployed runtimes
  stack is updated. Without that flag the runtimes bot skips an existing stack
  and does not write `code_bucket`. A bus-only self-hosted upgrade (no runtimes
  stack, control plane not attached) skips the import release and does not emit
  that event. A missing `bus_lifecycle_role_arn` sets `upgrade_status` to
  `failed` and `upgrade_error` to the `MissingTierRoleError` message.
- **`force_runtimes_redeploy: true`** (or a connector-network change) on
  `update_instance` sends the same forced runtimes event and records the name on
  submit.

If `connection_details` is not a JSON object, recording throws
`Cannot record code_bucket: instances.connection_details must be a JSON object`
and does not replace the stored details.

The project workspace for a managed or self-hosted instance is stored in this
bucket: entity JSON, project export, GitHub pull and push, workspace reindex,
deployment manifests, templates, transformations, workspace save, and workflow
graph read and save. Shared instances keep the workspace on the platform bucket.
Postgres stores a derived index of the workspace. A missing object is
`NoSuchKey`, `NotFound`, or a bare 404 (`$metadata.httpStatusCode` is 404 and
there is no `name`, `code`, or `Code`). A non-object error is not absence.
`NoSuchBucket`, `AccessDenied`, `AllAccessDisabled`, `InvalidBucketName`,
`PermanentRedirect`, and `SignatureDoesNotMatch` on `name`, `code`, or `Code`
are not absence. Any other read, parse, or bucket failure is not absence and
fails the request. The index does not fill in for an object that could not be
read.

A dedicated instance with no `code_bucket` fails these calls with HTTP 500
(`dedicated_bucket_missing`). A workspace call that does not name an instance
fails with HTTP 409 (`ambiguous_instance`) when the organization has more than
one live dedicated instance and the project's deployment rows do not name
exactly one of them. `POST /workflows/deployments` names the instance first (the
request `instance_id`, or the organization's oldest instance with status
`active`) and that instance selects the bucket. An explicit instance that is not
a live instance of the organization is HTTP 404 (`target_instance_missing`). See
**`loxtep-deployments`**, Dedicated instance code bucket, for the messages and
the `code_bucket` fix (upgrade or `force_runtimes_redeploy`).

A workflow deploy copies code into the bucket and leaves an object that is
already there in place. The platform read and the instance-bucket check both
treat the object as absent for `NoSuchKey`, `NotFound`, or a bare 404
(`$metadata.httpStatusCode` is 404 and there is no `name`, `code`, or `Code`). A
non-object error is not absence. `NoSuchBucket`, `AccessDenied`,
`AllAccessDisabled`, `InvalidBucketName`, `PermanentRedirect`, and
`SignatureDoesNotMatch` on `name`, `code`, or `Code` are not absence. Any other
read or bucket failure is not absence. There is no job that moves an existing
dedicated project's workspace into the instance bucket. After `code_bucket` is
set and the runtimes stack update has finished, deploy each workflow again
(**`loxtep-deployments`**).

## update_instance

A detached instance returns **409** `INSTANCE_DETACHED`
(`This instance is not managed. Deploy a project to attach it again.`) before
any save. See [Stop managing an instance](#stop-managing-an-instance).

Observe namespace is set at instance creation. `update_instance` (PUT
`/organizations/instances/{instance_id}`, SDK
`client.workspace.instances.update`, CLI `loxtep instances update`) rejects any
attempt to set, change, or remove it with **400** (`ValidationFailed`:
`Observe namespace is set at account creation and cannot be changed`). Do not
send `metadata.observe_namespace`, `metadata.observeNamespace`, or
`metadata.routing.observe_namespace` / `observeNamespace`, and do not send
`routing: {}` or `routing: null` to wipe it.

The row update and the sends run in one database transaction. A failed send
rolls the update back. The raw exception is logged. The client gets the sentence
and `error.details.code`. These sentences were not captured from a live API call
(unverified).

The update sends `instances-updated` after the row write. If that send throws,
the call returns HTTP **500** with message
`The instance update was not saved because the instances-updated event was not sent.`
`error.details.code` is `instance_updated_event_not_emitted` and
`error.details.instance_id` is the instance id. Nothing from this call is saved.
`runtimes-deployment-requested` and the Botmon Lite upgrade request are not
sent. Send the same update again. A later attempt sends `instances-updated`
again with a new timestamp. The handler does not skip that send.

`runtimes-deployment-requested` is sent only after `instances-updated` returns,
and only for `managed` or `self-hosted` when connector networks changed or
`force_runtimes_redeploy` is `true`. Shared instances do not send it. If that
send throws, the call returns HTTP **500** with message
`The instance update was not saved because the runtimes-deployment-requested event was not sent.`
`error.details.code` is `runtimes_deployment_requested_event_not_emitted` and
`error.details.instance_id` is the instance id. The update is not saved.
`instances-updated` may already be on the bus and is not recalled. Send the same
update again. The stored networks did not change, so the same body still queues
`runtimes-deployment-requested` when it changes the networks or sets
`force_runtimes_redeploy` to `true`. Do not add `force_runtimes_redeploy` only
because this send failed. That flag is how a caller asks for a runtimes update
when the networks did not change. The handler does not deduplicate either event.
The runtimes event sets `metadata.force_redeploy` to `true`, and the runtimes
bot updates a stack that is already deployed when that flag is set. That submit
also records `connection_details.code_bucket`. See
[Workflow code bucket](#workflow-code-bucket).

A changed Botmon Lite allowlist has no compensating restore. A missing
`metadata.core_version` is still **409** before the update (see below). If the
upgrade request itself fails, the call returns HTTP **500**
`Botmon Lite allowlist was not applied because the upgrade request failed. The instance update was not saved.`
`error.details` is `{ instance_id }` and has no `rollback_failed`. The update is
not saved. Earlier sends from that call can already be on the bus. Send the same
update again.

### Botmon Lite allowlist on a self-hosted upgrade

A detached instance returns **409** `INSTANCE_DETACHED`
(`This instance is not managed. Deploy a project to attach it again before upgrading.`)
and does not queue the upgrade. See
[Stop managing an instance](#stop-managing-an-instance).

`POST /organizations/instances/{instance_id}/upgrade` queues
`instances-upgrade-requested` and returns `upgrade_status` `accepted`. The
allowlist check runs in the upgrade bot.

On a self-hosted upgrade, a stored `metadata.botmon_lite_allowed_cidrs` is sent
as `BotmonLiteAllowedCidrs`. A missing list and an explicit empty list are
deny-all: Observe Lite stays closed and the upgrade continues. A corrupt stored
list fails before the stack update. The bot sets `metadata.upgrade_status` to
`failed`, `metadata.upgrade_error` to the message, and
`metadata.upgrade_failed_at`. Read those fields on
`GET /organizations/instances/{instance_id}`. Messages:

- `Invalid allowed IP '<value>': expected an IPv4 address or CIDR like 203.0.113.7 or 10.0.0.0/8`
- `Invalid allowed IP '<value>': octet or prefix out of range`

Add addresses afterward with `update_instance` (or Instances → Configure →
Allowed IP addresses). When that call succeeds, the changed list is saved and
the call queues the upgrade with `reason` `botmon_lite_allowlist_updated` and
`target_core_version` set to the stored core version. A failed send saves
nothing. See [update_instance](#update_instance).

When `metadata.core_version` is missing, blank, or not a string, that update
returns **409**
`Botmon Lite allowlist was not applied because this instance has no core version. Upgrade the instance before changing the allowlist.`
and saves nothing. The check reads only `metadata.core_version`. Upgrade the
instance first. Observe Lite stays closed until the list is saved.

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

Returns bus-only `oneClickUrl`, `cliCommand`, and `terraformCode`
(`AttachControlPlane` false), plus `controlPlaneConsentUrl` and
`controlPlaneConsentCli` (`AttachControlPlane` true). Also returns `externalId`,
`loxtepAccountId`, `roleNameSuffix`, `meterRoleName`, `busLifecycleRoleName`,
`workflowDeployRoleName`, and `deploymentStackName`. `deploymentRoleName` is the
bus lifecycle role name. **Present the bus-only options first.** After the stack
completes, the user copies `MeterRoleArn` and `BusLifecycleRoleArn`.
Control-plane consent is a later stack update; then copy
`WorkflowDeployRoleArn`.

This operation also persists `external_id` into `organizations.attributes` and
Secrets Manager (`loxtep/org/{org_id}/external-id`). Bus install reads that
secret, so this call is **required** before step 3. `roleNameSuffix` is the
first 8 characters of the organization id when the generator supplies one.

### 2. `register_infrastructure` — once per remote AWS account

`cross_account_role_arn` is the account key. Use the bus lifecycle role ARN.
Send `meter_role_arn` and `bus_lifecycle_role_arn` on the same call. All ARNs
must be the same AWS account. Omitting the tier fields stores the account key
and does not authorize meter, bus, or workflow calls. Call again for another
account. Earlier accounts stay. A new account past 32 returns **400**
`An organization can register at most 32 AWS accounts.`

When meter and bus ARNs are present, the handler copies them onto matching
instances. The organization row is saved first. Bad `connection_details` JSON or
a candidate ARN that is not an IAM role ARN returns **500**
`Cannot copy tier roles onto instance ${instance_id}: ${detail}`.

Tier **400** messages:

- `meter_role_arn is required when registering tier roles`
- `bus_lifecycle_role_arn is required when registering tier roles`
- `workflow_deploy_role_arn is required when attach_control_plane is true`
- `attach_control_plane must be true to record workflow_deploy_role_arn`
- `All role ARNs in one registration must belong to the same AWS account`

Attach the control plane with `attach_control_plane: true` and
`workflow_deploy_role_arn` after the consent stack update. That sets
`control_plane_attached` true. A tier registration without that flag deletes the
workflow ARN on the account and on matching instances.

```json
{
  "operation": "register_infrastructure",
  "cross_account_role_arn": "arn:aws:iam::987654321098:role/LoxtepBusLifecycleRole",
  "meter_role_arn": "arn:aws:iam::987654321098:role/LoxtepMeterRole",
  "bus_lifecycle_role_arn": "arn:aws:iam::987654321098:role/LoxtepBusLifecycleRole",
  "region": "us-east-1"
}
```

`region` is optional and defaults to the organization's preferred region, or
`us-east-1`. The response lists every account. Each entry can include
`meter_role_arn`, `bus_lifecycle_role_arn`, `workflow_deploy_role_arn`, and
`control_plane_attached`. `cross_account_role_arn` on the response is the
account key just sent. The stored first account key stays the first `arn`. These
JSON bodies were not run (unverified).

### Upgrading from the single role

Re-apply the current template (`AttachControlPlane` false creates the meter and
bus roles; the template does not delete `LoxtepCrossAccountDeploymentRole`).
Then `register_infrastructure` with the meter and bus ARNs so the copy writes
them onto matching instances. Control-plane consent is a second stack update
with `AttachControlPlane` true, then the same call with
`workflow_deploy_role_arn` and `attach_control_plane: true`. Until the instance
has the tier ARN a call needs, that call throws `MissingTierRoleError`:
`Missing ${field} for ${operation}. Record the ${tier} role ARN from the cross-account template. LoxtepCrossAccountDeploymentRole will not be used.`

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
      "cross_account_role_arn": "arn:aws:iam::987654321098:role/LoxtepBusLifecycleRole"
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
agent:  1. get_deployment_urls → bus-only one-click, CLI, and Terraform
        2. user deploys with AttachControlPlane false and copies MeterRoleArn and BusLifecycleRoleArn
        3. register_infrastructure with the account key plus meter and bus ARNs
        4. create_instance with observe_api.cross_account_role_arn set to the bus lifecycle role ARN
        5. directs the user to complete Stripe Checkout in the app
        6. polls list_instances until status="active" (~20–30 minutes)
        7. control plane is optional: consent URL, then register workflow_deploy_role_arn with attach_control_plane true
```

Bus install assumes `bus_lifecycle_role_arn` with the external ID from step 1
and deploys the rstreams stack. Observe assumes `meter_role_arn`. A missing
meter ARN on a catalog route returns **502** `Observe proxy request failed`.

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
      "cross_account_role_arn": "arn:aws:iam::123456789012:role/LoxtepBusLifecycleRole"
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
`The instance update was not saved because the runtimes-deployment-requested event was not sent.`
(`error.details.code` `runtimes_deployment_requested_event_not_emitted`), the
update was not saved. `instances-updated` may already be on the bus and is not
recalled. Call `update_instance` again with the same arguments. Do not add
`force_runtimes_redeploy` only because this send failed. The example above is a
runtimes reapply when the networks stay the same, not the retry for a failed
send. See [update_instance](#update_instance). This 500 sentence was not
captured from a live call (unverified).

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
deploy. Dedicated instances only. Customer accounts need a recorded
`workflow_deploy_role_arn` and `external_id`. A missing workflow role returns
**500** with `MissingTierRoleError`
(`Missing workflow_deploy_role_arn for bot registration. Record the workflow_deploy role ARN from the cross-account template. LoxtepCrossAccountDeploymentRole will not be used.`).
A missing `external_id` returns **400**
`Instance is missing dedicated BYOL prerequisites: connection_details.observe_api.external_id. Complete self-hosted/managed provisioning (cross-account role + external_id) first.`
Shared instances are rejected.

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
