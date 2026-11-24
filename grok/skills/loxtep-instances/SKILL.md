---
name: loxtep-instances
description:
  'Use when the user works with Loxtep runtime instances via Customer MCP -
  list_instances, create_instance, instance provisioning, shared vs managed,
  starter plan, plan_id, Stripe Checkout, regions, or "create a Loxtep
  instance". Self-hosted install flow: get_deployment_urls, deploy
  LoxtepCrossAccountDeploymentRole, register_infrastructure once per remote AWS
  account with that RoleArn as cross_account_role_arn. That call records the
  same ARN as meter_role_arn, bus_lifecycle_role_arn, and
  workflow_deploy_role_arn on the cross_account_roles entry whose arn equals
  that RoleArn, and sets control_plane_attached, when that entry's meter and bus
  ARNs are empty or already that RoleArn. Other entries in the same AWS account
  keep their tier fields. A stored meter or bus ARN on that entry that differs
  returns 409 tier_role_conflict and writes nothing. Registration leaves a
  detached instance unchanged, and leaves an instance unchanged when its stored
  cross_account_role_arn differs. A later infrastructure PUT does not restore
  bus or workflow ARNs that detach cleared. Then create_instance with the same
  ARN on cross_account_role_arn. Update the existing cross-account role stack
  before the next bus install. get_infrastructure lists every registered
  account. Do not skip a second account because one role is already listed. BYOL
  custom Lambda registration: register_custom_bot / list_custom_bots /
  deregister_custom_bot / reconcile_custom_bots (dedicated instances only). Also
  inspect whether an instance''s connector runtime is ready for public or
  customer-VPC (private-network) sources. Stop managing an instance is REST
  detach (status detached), not an MCP tool.'
metadata:
  documentation: https://github.com/LoxtepInc/loxtep-plugins-skills/blob/main/grok/skills/loxtep-instances/SKILL.md
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
`true` and does not apply the choice again. A later
`PUT /organizations/organizations/{org_id}/infrastructure` does not restore the
cleared `bus_lifecycle_role_arn` or `workflow_deploy_role_arn` on a detached
instance. Registration leaves that instance unchanged.

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

| `instance_type`   | Meaning                                          | Create requirements                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| ----------------- | ------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`shared`**      | Default **free-tier playground** (multi-tenant). | Omit `plan_id` or send **`free`**. Paid **`starter`** is also shared. Never send managed or self-hosted plan IDs. Do not send role or secret coordinates.                                                                                                                                                                                                                                                                                                                    |
| **`managed`**     | Paid **dedicated** bus operated by Loxtep.       | **`growth`/`scale`**. Same-account managed omits `cross_account_role_arn` and stays on platform credentials. A customer role ARN (not `ObserveProxyRole`) uses the same registered-account meter and bus check as self-hosted create (empty meter and bus fall back to the entry `arn`; a one-sided gap is **400** `missing_tier_role`; both stored copies them). Provisioning writes secret and proxy-role ARNs.                                                            |
| **`self-hosted`** | Customer-operated dedicated bus in customer AWS. | **`sh_core`/`sh_production`/`sh_scale`** and **`connection_details.observe_api.cross_account_role_arn`** (deployment role `RoleArn`). Create copies recorded meter, bus, and workflow ARNs when both meter and bus are stored. When both are empty, create uses the entry `arn` for meter, bus, and workflow (stored `workflow_deploy_role_arn` if present). Exactly one of meter or bus stored is **400** `missing_tier_role`. Loxtep license pricing excludes AWS charges. |

### Field summary

| Field                             | Notes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `name`, `region`, `instance_type` | Required.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `plan_id`                         | Top-level only. `free`/`starter` for shared; `growth`/`scale` for managed; `sh_core`/`sh_production`/`sh_scale` for self-hosted. Do not send plan fields under `metadata`.                                                                                                                                                                                                                                                                                                                                                                  |
| `connection_details`              | **Self-hosted:** nested `observe_api` with `cross_account_role_arn` required. **Managed:** omit for same-account; send a customer role ARN only for remote-account managed. Do not send `meter_role_arn`, `bus_lifecycle_role_arn`, or `workflow_deploy_role_arn` on create (`observe_api` is `.strict()`). `rstreams_secret_arn`, `rstreams_auth_arn`, and `code_bucket` are written by provisioning; callers do not send them. Namespace, `api_url`, and `stack_id` are always server-derived. Sending `observe_proxy_role_arn` is a 400. |

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

**Paid Growth (managed, same-account)** — omit `cross_account_role_arn`; the bus
runs in the Loxtep control-plane account:

```json
{
  "operation": "create_instance",
  "name": "Production mesh",
  "region": "us-east-1",
  "instance_type": "managed",
  "plan_id": "growth"
}
```

**Paid Growth (managed, remote customer account)** — same observe_api role shape
as self-hosted after `register_infrastructure`:

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
- `connection_details.observe_api.cross_account_role_arn` — the deployment role
  `RoleArn` for the AWS account this instance runs in. Self-hosted create
  matches a registered account whose `arn` or `bus_lifecycle_role_arn` equals
  that value. A miss returns **400**
  `Register this AWS account before creating the instance.` When both meter and
  bus are empty on that entry, create succeeds and sets `meter_role_arn`,
  `bus_lifecycle_role_arn`, and `workflow_deploy_role_arn` on the instance to
  the entry's `arn` (workflow uses the stored `workflow_deploy_role_arn` when
  present). When both meter and bus are stored, create copies them and, when
  stored, `workflow_deploy_role_arn`. Exactly one of meter or bus stored and the
  other empty returns **400** `missing_tier_role` before an instance row or a
  `payment_pending` reservation. `details.missing_tiers` names the missing tier
  (`meter` or `bus_lifecycle`). `details.field` and `details.tier` name that
  role. The message names the missing field
  (`Missing bus_lifecycle_role_arn for self-hosted instance create. Record the deployment role ARN from the cross-account template.`
  when bus is missing). Leave meter, bus, and workflow fields off create.
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
- **Self-hosted** without
  **`connection_details.observe_api.cross_account_role_arn`** — **invalid**.
  Same-account managed may omit it.
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
`s3:GetBucketLocation` on the bucket. The deployment role identity policy allows
`arn:aws:s3:::org-*`. Code upload assumes `workflow_deploy_role_arn`, or
`cross_account_role_arn` when that field is empty.

Provisioning writes `connection_details.code_bucket` to that name when it
submits the runtimes stack. Callers do not send it. A stored value, including
one accepted on create because `connection_details` is passthrough, is replaced
by the computed name. Shared and multitenant instances skip the per-instance
runtimes deploy and do not get this field.

- **Create.** The HTTP create handler does not write the field. After the core
  stack finishes, `runtimes-deployment-requested` submits the runtimes stack and
  records the name immediately before that submit.
- **Upgrade.** Intended policy: Engineers edit non-upgrade instance fields with
  `instances:update` alone. Changing `upgrade_mode` needs `instances:admin` (or
  `system:admin`). Run, schedule, and cancel upgrade need `instances:admin`. The
  Admin role is granted both `instances:admin` and `instances:update`. Engineers
  with only `instances:update` get **403** on upgrade POST and schedule
  POST/DELETE, and on PUT when the body changes `upgrade_mode`. Set a schedule
  with `POST /organizations/instances/{instance_id}/upgrade/schedule`, not
  `metadata.upgrade_scheduled_at` (**400**). **Known issue:** Today that PUT
  also requires `organizations:write`, so Engineer-role users currently get
  **403** on any instance PUT. Admin is unaffected because `ADMIN_PERMISSIONS`
  also includes `organizations:write` (`20260621120000_rbac_consolidation.js`).
  `instances:admin` plus `instances:update` alone would still 403. Tracked in
  #4747. Do not treat that extra permission as policy.
  `POST /organizations/instances/{instance_id}/upgrade` only queues
  `instances-upgrade-requested`. For managed, and for self-hosted when a
  runtimes stack or the control plane is recorded, the upgrade bot records the
  name in `sync-runtimes-import-release` when that step runs with a database
  connection, and again when the follow-on runtimes deploy submits. A recorded
  runtimes stack, `control_plane_attached`, or a recorded
  `workflow_deploy_role_arn` emits `runtimes-deployment-requested`. The role is
  `workflow_deploy_role_arn`, or `cross_account_role_arn` when the workflow
  field is empty and a runtimes stack or the control plane is recorded. That
  event sets `metadata.force_redeploy` to `true`, so an already-deployed
  runtimes stack is updated. Without that flag the runtimes bot skips an
  existing stack and does not write `code_bucket`. A bus-only self-hosted
  upgrade (no runtimes stack, control plane not attached, no
  `workflow_deploy_role_arn`) skips the import release and does not emit that
  event. Bus install reads the instance `bus_lifecycle_role_arn` and throws
  `MissingTierRoleError`
  (`Missing bus_lifecycle_role_arn for bus lifecycle. Record the deployment role ARN from the cross-account template.`)
  when that field is empty. A self-hosted upgrade uses `bus_lifecycle_role_arn`
  when it is set, otherwise `cross_account_role_arn`, then looks up the
  organization registration. A registered `bus_lifecycle_role_arn` that equals
  that ARN wins. Surrounding whitespace on either ARN is ignored. An entry with
  no `bus_lifecycle_role_arn` matches when its account `arn` equals that ARN. A
  stored `bus_lifecycle_role_arn` that differs does not fall back to the account
  `arn`. No match throws `RegisteredBusRoleMismatchError`
  (`Instance bus_lifecycle_role_arn <arn> does not match a registered cross-account role. Registered bus_lifecycle_role_arn: <list or none>. Registered account role without bus_lifecycle_role_arn: <list or none>.`).
  `process-instances-upgrade-requested` throws that error as
  `upgradeAttemptError` and does not record the failed upgrade.
  `process-instances-upgrade-failed` records `upgrade_status` `failed`,
  `upgrade_error` as that message, and `upgrade_failed_at`. It emits
  `instance.upgrade.failed`. `metadata.core_version` stays unchanged. A
  self-hosted upgrade that needs a workflow role and has neither
  `workflow_deploy_role_arn` nor `cross_account_role_arn` fails the same way,
  and `metadata.core_version` stays unchanged. It needs that role when
  `metadata.runtimes_stack_name` is set, or when `control_plane_attached` is
  true on metadata or `connection_details.observe_api`. With no recorded
  runtimes stack, `process-instances-upgrade-requested` resolves the role after
  infrastructure and throws `upgradeAttemptError` before it writes success.
  `process-instances-upgrade-failed` sets `upgrade_status` to `failed`,
  `upgrade_error` to
  `Missing workflow_deploy_role_arn for runtimes deployment. Record the deployment role ARN from the cross-account template.`,
  and `upgrade_failed_at`. It emits `instance.upgrade.failed`.
  `upgrade_infra_completed_at` and `upgrade_infra_completed_version` may already
  be set, and the failed record keeps them. Record `workflow_deploy_role_arn`
  with `PUT /organizations/organizations/{org_id}/infrastructure`
  (`register_infrastructure`) and retry the upgrade. When the checkpoint is for
  that target, the retry skips CloudFormation and finalizes. A recorded runtimes
  stack with both roles empty fails during the import release, before the
  checkpoint, with
  `Missing workflow_deploy_role_arn for runtimes import release. Record the deployment role ARN from the cross-account template.`
  `process-instances-upgrade-requested` throws that as `upgradeAttemptError` and
  does not record the failed upgrade. `process-instances-upgrade-failed` records
  the same failed fields, emits `instance.upgrade.failed`, and leaves
  `core_version` unchanged. Record the role with the same PUT and retry. That
  retry runs the infrastructure step again.
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
(`dedicated_bucket_missing`). `POST /workflows/projects` stores
`projects.instance_id` when the body names a live instance. Omitting it when the
organization has more than one live dedicated instance returns HTTP 409
(`ambiguous_instance`) and does not insert the project. Studio workspace calls
(entities GET, workspace PUT, single-entity GET/PUT/DELETE, workflow graph
GET/PUT, reindex POST) accept optional `instance_id` (query; reindex also JSON
body). Studio sends the selected instance. An explicit id must match the
project's unique deployment pin or stored `projects.instance_id` when either is
set (HTTP 409 `instance_id_mismatch` on conflict); it does not silently open
another instance bucket or the platform bucket. When `instance_id` is omitted on
a workspace call, a deployment pin of exactly one live dedicated instance
selects the bucket, and otherwise the stored `projects.instance_id`. With
neither, the same 409 applies. `POST /workflows/deployments` does not use that
pin or the stored id: an omitted `instance_id` is one dedicated instance, or one
active instance when none are dedicated, and several targets return HTTP 409
`ambiguous_instance` before the workspace opens. Hosted MCP `reindex_workspace`,
CLI `push` reindex, and SDK `projects.reindex` do not pass `instance_id`. An
omitted id does not select the oldest instance. An explicit instance that is not
a live instance of the organization is HTTP 404 (`target_instance_missing`). See
**`loxtep-deployments`**, Dedicated instance code bucket, for the messages and
the `code_bucket` fix (upgrade or `force_runtimes_redeploy`).

A workspace open uses only the selected instance's `code_bucket`. It does not
copy the project prefix from the platform bucket. When `.loxtep/project.json` is
missing on that bucket, readers fail closed with HTTP 409
`project_metadata_unavailable`, including when the platform bucket still has the
file. Materialize with pull from git / Studio on that instance. Studio Pull
requires a selected instance and never omits `instance_id`. CLI
`loxtep projects pull`, SDK `github_pull`, and MCP `restore_version` still omit
it. Export and unbound clone return that 409 when the opened dedicated bucket
lacks the file. Calls that omit `instance_id` (export, unbound clone, GitHub
push, CLI / SDK / MCP GitHub pull, workflow-bundle / CLI `loxtep push`, hosted
MCP `reindex_workspace`, SDK `projects.reindex`) open the resolved instance
bucket and do not copy from the platform bucket. Reindex POST returns enqueued;
the indexer bot opens the bucket named by `instance_id` on the event and does
not copy from the platform bucket. A missing `.loxtep/project.json` there is
`RuntimeError` `Indexing failed` with the reader's message.
`POST /workflows/deployments` passes the resolved target id into the same open
and reads that bucket only, including when the body omitted `instance_id` and
the organization has one dedicated instance. Full messages are in
**`loxtep-workspace`** and **`loxtep-deployments`**.

A workflow deploy copies code into the bucket and leaves an object that is
already there in place. The platform read and the instance-bucket check both
treat the object as absent for `NoSuchKey`, `NotFound`, or a bare 404
(`$metadata.httpStatusCode` is 404 and there is no `name`, `code`, or `Code`). A
non-object error is not absence. `NoSuchBucket`, `AccessDenied`,
`AllAccessDisabled`, `InvalidBucketName`, `PermanentRedirect`, and
`SignatureDoesNotMatch` on `name`, `code`, or `Code` are not absence. Any other
read or bucket failure is not absence. That copy moves workflow `code_key`
objects into the instance bucket. It does not copy the project workspace from
the platform bucket. After `code_bucket` is set and the runtimes stack update
has finished, deploy each workflow again (**`loxtep-deployments`**).

## update_instance

Intended policy: `update_instance` / **PUT**
`/organizations/instances/{instance_id}` needs `instances:update` alone for
non-upgrade fields. Changing `upgrade_mode` needs `instances:admin` (or
`system:admin`). The Admin role is granted both.

> **Known issue:** Today that PUT also requires `organizations:write`, so
> Engineer-role users currently get **403** on any instance PUT. Admin is
> unaffected because `ADMIN_PERMISSIONS` also includes `organizations:write`
> (`20260621120000_rbac_consolidation.js`). `instances:admin` plus
> `instances:update` alone would still 403. This is a bug tracked in #4747. Do
> not treat the extra `organizations:write` check as policy.

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
`error.details.code` is `instance_upgrade_requested_event_not_emitted` and
`error.details.instance_id` is the instance id. It has no `rollback_failed`. The
update is not saved. Earlier sends from that call can already be on the bus.
Send the same update again.

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
list fails before the stack update. `process-instances-upgrade-requested` throws
`upgradeAttemptError` and does not record the failed upgrade.
`process-instances-upgrade-failed` sets `metadata.upgrade_status` to `failed`,
`metadata.upgrade_error` to the message, and `metadata.upgrade_failed_at`. It
emits `instance.upgrade.failed`. `metadata.core_version` stays unchanged. Read
those fields on `GET /organizations/instances/{instance_id}`. Messages:

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

The HTTP body is `{ "success": true, "data": <onboarding package> }`. `data`
fields from `generateOnboardingPackage` are `organization_id`, `region`,
`external_id`, `loxtep_account_id`, `role_name_suffix`, `deployment_role_name`,
`deployment_stack_name`, `deployment_options` (`one_click_url`,
`template_download_url`, `cli_command`, `terraform_code`), `instructions`, and
`next_steps`. `deployment_role_name` is `LoxtepCrossAccountDeploymentRole` plus
`role_name_suffix`. `cli_command` prints stack output `RoleArn`. After the stack
completes, the user copies `RoleArn`.

This operation also persists `external_id` into `organizations.attributes` and
Secrets Manager (`loxtep/org/{org_id}/external-id`). Bus install reads that
secret, so this call is **required** before step 3. `role_name_suffix` is the
first 8 characters of the organization id when the generator supplies one.

### 2. `register_infrastructure` — once per remote AWS account

Send the stack output `RoleArn` as `cross_account_role_arn`, `meter_role_arn`,
and `bus_lifecycle_role_arn` (the same ARN). Send `workflow_deploy_role_arn`
with `attach_control_plane: true` when workflow deploy should store that field.
Do this before relying on the tier fields. A body that sends only
`cross_account_role_arn` records that ARN as `meter_role_arn`,
`bus_lifecycle_role_arn`, and `workflow_deploy_role_arn` on the
`cross_account_roles` entry whose `arn` equals that RoleArn, and sets
`control_plane_attached` to true, when that entry's `meter_role_arn` and
`bus_lifecycle_role_arn` are empty or already that RoleArn. Other entries in the
same AWS account keep their tier fields. A stored meter or bus ARN on that entry
that differs returns **409** `tier_role_conflict`. `details.fields` lists
`meter_role_arn` and/or `bus_lifecycle_role_arn`. One field differs with
`Registered meter_role_arn differs from this RoleArn. Send explicit tier ARNs.`
Both differ with
`Registered meter_role_arn and bus_lifecycle_role_arn differ from this RoleArn. Send explicit tier ARNs.`
Nothing is written. Workflow deploy and `control_plane_attached` are not part of
that check. `cross_account_role_arn` is the account key. All ARNs must be the
same AWS account. Call again for another account. Earlier accounts stay. A new
account past 32 returns **400**
`An organization can register at most 32 AWS accounts.` The Create Instance
dialog **Register** button sends only `cross_account_role_arn`. That records the
three tier roles on that same entry. Entering an ARN that is already registered
with both `meter_role_arn` and `bus_lifecycle_role_arn` set selects that account
without a PUT even when `workflow_deploy_role_arn` is empty (toast:
`This instance will use that AWS account.`). Entering a registered pre-tier ARN
(no meter or bus) registers it again, which fills its tier roles. Entering a
registered ARN with only one of meter or bus set also registers it again (PUT).
That PUT returns **409** `tier_role_conflict` if the stored meter or bus ARN
differs from the RoleArn.

A body that also sends `meter_role_arn`, `bus_lifecycle_role_arn`,
`workflow_deploy_role_arn`, or `attach_control_plane` uses those fields instead
of writing the single `RoleArn` into every tier. Meter and bus are both
required. `workflow_deploy_role_arn` is stored on that path only when
`attach_control_plane` is true.

A successful single `RoleArn` registration records `meter_role_arn`,
`bus_lifecycle_role_arn`, and `workflow_deploy_role_arn` on the
`cross_account_roles` entry whose `arn` equals that RoleArn, and copies those
ARNs onto an instance whose candidate ARN is in that AWS account, whose stored
`cross_account_role_arn` is unset or equals the sent ARN, and whose `status` is
not `detached`. A detached instance stays unchanged. An instance in that account
that names a different `cross_account_role_arn` stays unchanged. A later
infrastructure PUT does not restore bus or workflow ARNs that detach cleared on
a detached instance. Other entries in the same AWS account keep their tier
fields. The **409** writes nothing and does not copy. When meter and bus ARNs
are present, the handler records those fields on that same entry and copies them
onto those same instances, and copies `workflow_deploy_role_arn` when
`attach_control_plane` is true. The organization row, the instance copies, and
the `organization-infrastructure-registered` event are one database transaction.
Bad `connection_details` JSON or a candidate ARN that is not an IAM role ARN
returns **500**
`Cannot copy tier roles onto instance ${instance_id}: ${detail}`.
`error.details.code` is `instance_tier_copy_failed` and
`error.details.instance_id` is that instance id. The transaction rolls back. The
organization row and instance rows stay as they were before the call, and the
event is not sent.

Tier **400** messages:

- `meter_role_arn is required when registering tier roles`
- `bus_lifecycle_role_arn is required when registering tier roles`
- `workflow_deploy_role_arn is required when attach_control_plane is true`
- `attach_control_plane must be true to record workflow_deploy_role_arn`
- `All role ARNs in one registration must belong to the same AWS account`

On the explicit tier path, send `workflow_deploy_role_arn` with
`attach_control_plane: true` to store that field. Use the same `RoleArn`. A
registration that sends meter and bus without `attach_control_plane: true`
clears `workflow_deploy_role_arn` on the `cross_account_roles` entry whose `arn`
equals the sent `cross_account_role_arn`, and on instances that receive that
copy. Other entries in the same AWS account keep their tier fields. A detached
instance stays unchanged. An instance whose stored `cross_account_role_arn` is
set and differs from the sent ARN stays unchanged. A single `RoleArn`
registration that is accepted stores the workflow role and sets
`control_plane_attached` to true on that same entry.

```json
{
  "operation": "register_infrastructure",
  "cross_account_role_arn": "arn:aws:iam::987654321098:role/LoxtepCrossAccountDeploymentRole",
  "region": "us-east-1"
}
```

`region` is optional and defaults to the organization's preferred region, or
`us-east-1`. The response lists every account. Each entry can include
`meter_role_arn`, `bus_lifecycle_role_arn`, `workflow_deploy_role_arn`, and
`control_plane_attached`. `cross_account_role_arn` on the response is the
account key just sent. The stored first account key stays the first `arn`. These
JSON bodies were not run (unverified).

### Update the existing cross-account role stack

Before the next bus install, the customer updates the stack that already created
the role. A new stack does not replace the role the instance uses.

```bash
aws cloudformation update-stack \
  --stack-name <existing-cross-account-role-stack> \
  --template-body file://cross-account-role-template.yaml \
  --parameters ParameterKey=LoxtepAccountId,UsePreviousValue=true \
               ParameterKey=ExternalId,UsePreviousValue=true \
               ParameterKey=RoleNameSuffix,UsePreviousValue=true \
  --capabilities CAPABILITY_NAMED_IAM
```

The bus stack attaches managed policy
`LoxtepDeployObserveApiInvoke-<stack name>`. The boundary allows
`iam:AttachRolePolicy` and `iam:DetachRolePolicy` on the deployment role only
when `iam:PolicyARN` is
`arn:aws:iam::<account>:policy/LoxtepDeployObserveApiInvoke-*`.
`iam:DeleteRolePolicy` stays denied. Inline policy
`LoxtepDeploymentRoleObserveApiInvokePolicy` is retained. Its IAM name is
`<stack name>-deploy-observe-api-invoke`.

A stack in `ROLLBACK_FAILED` or `DELETE_FAILED` because CloudFormation is
deleting that inline policy needs an administrator who is not the deployment
role. Use the role name from `RoleArn` when `RoleNameSuffix` is set.

```bash
aws iam delete-role-policy \
  --role-name LoxtepCrossAccountDeploymentRole \
  --policy-name <stack-name>-deploy-observe-api-invoke
aws cloudformation continue-update-rollback --stack-name <bus-stack-name>
aws cloudformation delete-stack --stack-name <bus-stack-name>
```

`continue-update-rollback` is for `UPDATE_ROLLBACK_FAILED`. `delete-stack` is
for `ROLLBACK_FAILED` and `DELETE_FAILED`. If the stack is still the three-role
template, the update removes `LoxtepMeterRole`, `LoxtepBusLifecycleRole`, and
`LoxtepWorkflowDeployRole`. Record the stack output `RoleArn` as
`cross_account_role_arn`, `meter_role_arn`, and `bus_lifecycle_role_arn` (the
same ARN). Send `workflow_deploy_role_arn` with `attach_control_plane: true`
when workflow deploy should store that field. Do this before relying on the tier
fields. A body that sends only `cross_account_role_arn` records that ARN as
`meter_role_arn`, `bus_lifecycle_role_arn`, and `workflow_deploy_role_arn` on
the `cross_account_roles` entry whose `arn` equals that RoleArn, and sets
`control_plane_attached` to true, when that entry's meter and bus ARNs are empty
or already that RoleArn. Other entries in the same AWS account keep their tier
fields. A stored meter or bus ARN on that entry that differs returns **409**
`tier_role_conflict` and writes nothing. The Terraform snippet does not create
`LoxtepMaxPermissionsBoundary`. These commands were not run in a customer
account (unverified).

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
`Register this AWS account before creating the instance.` When both meter and
bus are empty on the matched entry, create succeeds and uses that entry's `arn`
for meter, bus, and workflow (stored `workflow_deploy_role_arn` if present).
Exactly one of meter or bus stored and the other empty returns **400**
`missing_tier_role` and does not reserve `payment_pending`.
`details.missing_tiers` names the missing tier. The message names that field.

### Full flow in one agent turn

```text
user:   "Let's set up a self-hosted Loxtep instance in my AWS account."
agent:  1. get_deployment_urls → one_click_url, cli_command, terraform_code
        2. user deploys the stack and copies RoleArn
        3. user updates that existing stack before the next bus install
        4. register_infrastructure with RoleArn as cross_account_role_arn
        5. create_instance with observe_api.cross_account_role_arn set to that RoleArn
        6. directs the user to complete Stripe Checkout in the app
        7. polls list_instances until status="active" (~20–30 minutes)
```

Bus install assumes `bus_lifecycle_role_arn` with the external ID from step 1
and deploys the rstreams stack. Observe signing uses `meter_role_arn`, then
`cross_account_role_arn`, then `observe_proxy_role_arn`.

## Connector runtime on an instance (read-only first)

Public SaaS connectors run on shared `connectors-{256,512,1024,2048}` Lambdas
(`vpc.enabled: false` on the runtimes microservice). Sources that are not
internet-reachable need a private connector function, which attaches only to
customer private subnets and a connector security group. Unset ingest and the
connectivity probe use `connectors-private-512`. Sizes `256`, `1024`, `2048`,
and `custom` also attach only to those subnets.

**Inspect (do not mutate):**

1. `list_instances` — confirm `status: active` and record `instance_id`. The
   payload has no VPC IDs, subnet IDs, or ARNs.
2. `get_infrastructure` — `cross_account_roles` and the external ID for managed
   and self-hosted. An empty list means no account is registered. One listed
   account does not cover a second account.
3. `loxtep_observe` → `list_observe_bots` with `instance_id` (permission
   `instances:read`). Look for `connectors-private-512` when the source is
   private. That name is the primary and probe function. Other private sizes
   attach to the same subnets.

```json
{ "operation": "list_observe_bots", "instance_id": "<uuid>" }
```

**Ownership:** the customer owns the VPC, two private subnet IDs, the connector
security group, routing, and source firewall rules. Loxtep packages the private
connector functions. The instance provisioner attaches every private tier when
`connection_details.connector_vpc` is set. Unset ingest and the probe use
`connectors-private-512`.

Additional networks go on `connection_details.connector_vpcs`: up to 7 entries,
each `{ "id", "subnet_ids", "security_group_id" }`. `id` is 1–16 characters
`[a-z0-9]` and `default` is reserved. A subnet or security group belongs to one
network. Each extra network gets its own copy of each private connector
function. The 512 copy, and unset, is `BotConnectorsPrivateAtt{Id}`. Other sizes
append the megabytes (`BotConnectorsPrivateAtt{Id}256`, `1024`, `2048`).
`custom` appends `Custom` (`BotConnectorsPrivateAtt{Id}Custom`). That attachment
logical id must not contain `connectorsprivate512`, because the primary 512
resolver matches that substring. A connector stays on the primary network unless
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
primary private connector Lambda (`botconnectorsprivate512…`) `VpcConfig`
SubnetIds and SecurityGroupIds match `connection_details.connector_vpc`. The
other private logical IDs (`connectors-private-256`, `1024`, `2048`, and the
custom private clone) receive the same `VpcConfig`. If a stack completed without
`VpcConfig`, retry after the organizations runtimes provisioner includes the
logical-ID template patch:

```bash
loxtep instances redeploy-runtimes <instance_id>
```

Runtimes upgrades keep `connector_vpc` on the instance record. Connector
create/test is **`connect-external-system`**. Workflow deploy onto the private
Lambda is **`loxtep-deployments`**.

## Bring your own Lambda (BYOL)

Register a customer-deployed Lambda with LeoCron **without** Studio workflow
deploy. Dedicated instances only. Customer accounts need `external_id` and
either `workflow_deploy_role_arn` or `cross_account_role_arn`. A recorded
workflow ARN wins. Both empty returns **500** with `MissingTierRoleError`
(`Missing workflow_deploy_role_arn for bot registration. Record the deployment role ARN from the cross-account template.`).
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
- Workflow deploy onto `connectors-private`: **`loxtep-deployments`**
