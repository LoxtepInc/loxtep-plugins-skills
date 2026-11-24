---
name: loxtep-deployments
description:
  Use when the user wants to deploy a project or workflow to a runtime instance,
  check deployment status, list deployments, or inspect runtime mappings,
  including customer-VPC connector connections. Not the same as loxtep-workspace
  (provisioning) or data-workflows (authoring).
metadata:
  documentation: https://github.com/LoxtepInc/loxtep-plugins-skills/blob/main/codex/skills/loxtep-deployments/SKILL.md
---

<!-- GENERATED FILE -- single source: loxtep/scripts/plugins-skills-generate-skills.mjs. From the loxtep root run `PLUGINS_SKILLS_ROOT=<plugins-skills> node scripts/sync-skills-to-plugins-skills.mjs` (or that generator with PLUGINS_SKILLS_ROOT set). Do not edit client copies; do not run sibling scripts/generate-skills.mjs. -->

# Deployments (Customer MCP)

Deploy projects and workflows to runtime instances, monitor deployment status,
and inspect runtime mappings.

## Design-time / runtime / global (ADR 0013)

| Layer            | What lives there                                                                                                                      |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| **Global (org)** | Meaning, RBAC, billing, connector catalog                                                                                             |
| **Design-time**  | Project / workflow graph + stable Connection and DP keys + **declared** connection bindings and data-product runtime slots in package |
| **Runtime**      | Per-instance bindings in DB (connector, queues/storage/bots) — applied from package on deploy                                         |

**Promote the flow** with rebinding: author/test on stage, deploy the
design-time artifact to a prod instance with prod connection bindings and
sibling catalog products (`logical_key` + `environment_key`). Never comingle
stage and prod product identity; never treat “same product runtime across stage
and prod” as the model. **Environment ≠ instance** — geo is same-env
multi-instance.

**Composable bindings (#4876):** Declare stage/prod connectors in the project
package — `bindings[]` on each connection (prefer `environment_key`; optional
`instance_id` for geo) and/or `.loxtep/connection-bindings.json`. Do not stuff
two connectors into one scalar `connector_id`. `loxtep lint` validates the
declaration; deploy upserts `connection_instance_bindings` for the target
env/instance and still **fails closed** if prod is undeclared. Legacy
`connector_id` seeds the home instance only. `set_connection_instance_binding`
syncs into the package by default.

**Composable data-product runtime slots (#4877):** Declare expected
queues/bots/storage per env as `runtime_slots[]` on each data product (prefer
`environment_key`; optional `instance_id` for geo) and/or
`.loxtep/data-product-runtime-slots.json`. Optional `queue_name` / `bot_id` /
`storage` pin known handles; omit them when deploy resolves from topology. Lint
validates the declaration; deploy matches the target env and upserts
`data_product_runtime_bindings` — **fails closed** if a product declares slots
but omits the target env (no silent stage→prod copy).

Deploy **requires** `instance_id` for the environment you are targeting (no soft
`prefer_instance_id`, no silent “primary” / prior-deploy pin). Omit is allowed
only when the organization has exactly one unambiguous active target. Deploy
**fails closed** when `instance_id` is omitted under ambiguity (HTTP 409
`ambiguous_instance`), when `expected_environment_key` disagrees with the
instance’s `metadata.environment_key` (HTTP 409 `environment_key_mismatch`),
when required connection bindings or data-product runtime slots are missing for
the target instance, or when product / binding `environment_key` disagrees with
the instance.

## When to use

- "**Deploy** this project", "deploy workflow to instance"
- "**Promote** this flow to prod" (rebinding — not identity copy)
- "What's the **deployment status**?", "list deployments"
- "Show **runtime mapping**" for a project/workflow
- "**Redeploy**", "force redeploy"
- Private-network connections registering on `connectors-private` (unset ingest
  stays `connectors-private-512`)

## Prerequisites

- MCP auth. Project-scoped operations require `project_id`.
- Target `instance_id` must exist (see **`loxtep-workspace`** for provisioning).
- Cross-env deploy: declare prod bindings in the package (or set them via
  `set_connection_instance_binding`, which syncs into `bindings[]`) before
  deploy. Preflight: `list_connection_instance_bindings` with
  `preflight=true&instance_id=…`.

## Happy-path flow

1. `list_deployments` — see what's already deployed (filter by project,
   instance, workflow, status).
2. `deploy_project` — deploy an entire project to an instance.
3. `deploy_workflow` — deploy a single workflow (more targeted).
4. `get_deployment` — check status of a specific deployment.
5. `get_runtime_mapping` — inspect how a project/workflow maps to runtime
   resources.

## Bots already on the instance

`deploy_project` and `deploy_workflow` read that instance's bot list
(`GET /api/cron` through the Observe proxy) before they archive bots.

A bot is adopted when `LOXTEP_PROJECT_ID` and `LOXTEP_WORKFLOW_ID` are both set,
this organization has that project's workspace, and the workflow id is in the
workspace. The platform records a deployment of that workflow with status
`deployed`. `list_deployments` can show that row. The scan does not register a
bot. When a deployed version and a deployment row for that workflow on that
instance already exist, it updates those rows and merges the bot ids. It does
not insert a second row.

The workflow deploy that follows keeps bots still on the bus for that workflow
registered, so they are not archived as orphans.

Bots the scan does not adopt are not written. The log line
`Adopted existing bus` includes the count `unmanaged_bots`. The deploy calls do
not return that list. A bot is unmanaged when it lacks `LOXTEP_PROJECT_ID` or
`LOXTEP_WORKFLOW_ID`, when this organization has no workspace for its project,
or when its workflow id is not in the workspace.

`deploy_project` still archives a bot of the project you are deploying when that
workflow is neither in the project catalog nor adopted. The archive sets the bot
paused and archived. Bots of other projects, and bots with no project or
workflow id, are left unchanged.

If the project catalog has no workflows, the project deploy still records
adopted workflows and archives nothing. The run finishes with reason
`no_workflows`. `get_deployment` on that project run reports status `failed` and
`error` `no_workflows`. Adopted rows can still appear in `list_deployments` with
status `deployed`.

If the bot list cannot be read, a bot's settings are malformed, or the workspace
read fails, the deploy fails and nothing is archived. On a project deploy run,
`get_deployment` reports status `failed` and the message in `error`. Fix the
cause named in the message, then deploy again.

A failed bot-list read:

```text
GET /api/cron failed for instance <id>: <message>
```

`<id>` is the instance id. `<message>` is the read error.

Settings the scan refuses include:

```text
GET /api/cron returned no body; refusing to treat that as an empty bus
```

```text
LeoCron bot is missing id
```

```text
Bot <botId> entity_config is not valid JSON: <message>
```

```text
Bot <botId> env.<key> disagrees between bot.env and lambda.env (<left> vs <right>)
```

`bot.env` and `lambda.env` are written as strings. BusInstall `register.js`
`fixTypes` then stores a numeric string as a finite number and `true` / `false`
as a boolean. Other env keys read a non-empty string as itself, a finite number
as its decimal string, and a boolean as `true` or `false`. An absent env map is
empty. A present null, empty string, NaN, Infinity, array, or object fails the
deploy. The scan does not default, skip, or drop that bot.

`LOXTEP_RUNTIME_MEMORY_MB`, when the key is present, must be a positive integer:
a safe integer greater than zero, or a decimal string of that integer such as
`512`. Zero, a negative, a fraction, a boolean, and any other type fail. An
absent key stays absent. The scan does not fill in 256. The same rule is used
for `lambda.env`. A workflow deploy that requests `"custom"` writes the
operator-configured override integer for that family (`connectors_private` when
the connection requires a customer VPC, otherwise `connectors`), not the token
`custom`. The token is not stored on this env key.

```text
Bot <botId> env.<key> must be a non-empty string
```

```text
Bot <botId> env.LOXTEP_RUNTIME_MEMORY_MB must be a positive integer
```

A workspace read that fails:

```text
Workspace lookup failed for project <projectId>: <message>
```

After adoption succeeds, the workflow deploy reads the bot list again before it
archives. If that read fails, the deploy fails and does not archive. This read
runs after the deploy has registered its own bots:

```text
Refusing to archive orphans for workflow <workflow_id>: live cron scan failed after bus adoption
```

Fix the bot-list read, then call `deploy_workflow` again.

## Revision and outcome evidence

Connect the reviewed local package revision to saved cloud definitions and
deployed runtime readback. Inspect local/cloud/Git differences before syncing a
Git-backed project; preserve workflow IDs, bindings, queues and checkpoints.
`loxtep push` saves definitions; deployment is a separate operation. Project
GitHub push/pull synchronizes the cloud workspace and GitHub, not definitions
into the current local checkout. Follow `loxtep-workspace` and the installed CLI
help for the selected sync direction.

Record the package commit or content revision, relevant SDK/native schema
version, exact deployed workflow/instance and runtime mapping. Local source
support does not establish published SDK or deployed service support. Prefer the
authorized workflow's deployment scope over an unrelated whole-project redeploy.
Follow existing native reviews and promotion policies; do not add a second
customer release gate.

Deployment readback establishes deployment. If the user requested working
delivery, finish with `loxtep-integration-verification` at the named endpoint.
Diagnose lag or materialization separately through `loxtep-data-operations`.
Record compatibility limitations for rollback: redeploying an old artifact does
not reverse persisted schema or data changes.

## Operations

| Facade           | Operation             | Scope        | Required                                   | Optional                                             |
| ---------------- | --------------------- | ------------ | ------------------------------------------ | ---------------------------------------------------- |
| `loxtep_build`   | `deploy_project`      | project      | `project_id`, `instance_id`                | `force_redeploy`                                     |
| `loxtep_build`   | `deploy_workflow`     | project      | `project_id`, `instance_id`, `workflow_id` | `force_redeploy`, `skip_validation`                  |
| `loxtep_observe` | `list_deployments`    | organization | —                                          | `project_id`, `instance_id`, `workflow_id`, `status` |
| `loxtep_observe` | `get_deployment`      | organization | `deployment_id`                            | —                                                    |
| `loxtep_build`   | `get_runtime_mapping` | project      | `project_id`                               | `workflow_id`                                        |

## MCP mapping

| Step            | Tool             | `operation`           | Scope        | Notes                                                          |
| --------------- | ---------------- | --------------------- | ------------ | -------------------------------------------------------------- |
| List            | `loxtep_observe` | `list_deployments`    | organization | Filter by `project_id`, `instance_id`, `workflow_id`, `status` |
| Deploy project  | `loxtep_build`   | `deploy_project`      | project      | Deploys all workflows in the project                           |
| Deploy workflow | `loxtep_build`   | `deploy_workflow`     | project      | Single workflow; `skip_validation` bypasses pre-deploy checks  |
| Get status      | `loxtep_observe` | `get_deployment`      | organization | Returns status, timestamps, errors                             |
| Runtime mapping | `loxtep_build`   | `get_runtime_mapping` | project      | Shows how project resources map to runtime                     |

## Deployment status polling rules

- Only `get_deployment` the `deployment_id` returned by **this turn's**
  `deploy_workflow` or `deploy_project`. Never probe guessed, historical, or
  listed ids that this turn did not just return.
- Parallel `get_deployment` of multiple ids in one turn is forbidden unless
  **each** id was returned by a deploy call in that same turn.
- After a deploy in this turn, check that id once with `get_deployment` (or a
  filtered `list_deployments` that names that same id). Do not fan out across a
  candidate list.
- If status is still `pending` or `in_progress`, back off **30s**, then **60s**,
  then **120s**, and repeat at the **120s** cap until terminal status — still
  only for that same just-returned id.
- On the first `not_found` for that just-returned id: back off **30s**, then
  **60s**, then **120s**, then **stop**. Report the id and the error. Do not
  call `get_deployment` for that id again on a later turn. Do not look up a
  different id. Do not call `deploy_workflow` / `deploy_project` again to "fix"
  `not_found`.
- Never call `deploy_workflow` again for a workflow while a deployment for it is
  `pending` or `in_progress`.
- Always pass full UUIDs to `get_deployment` and other ops — never truncated
  prefixes like `0a9e627d`.

## Pitfalls

- **Display names come from the checked-in package.** For a GitHub-backed
  project, bot `name`, product `name`, and queue labels change only by editing
  workflow files, then `loxtep lint` → `loxtep push --workflow-id <id>` →
  `deploy_workflow` for that workflow → read back design-time names and
  `get_runtime_mapping`. Output and error queue labels are
  `output_queue_display_name` and `error_queue_display_name` on the node that
  owns the queue. A declared name is applied to the existing queue id. An unset
  field keeps the generated label and does not replace a stored one. Do not
  rename with `update_workflow`, `update_data_product`, or Observe
  event-settings. If the platform build rejects those fields or does not apply a
  declared label, stop and report the gap (**`data-workflows`**, Display names).
  Do not rename the queue through an API. A scoped redeploy must keep declared
  labels, immutable bot/queue ids, bindings, and checkpoints, and must not start
  or unpause any other workflow.
- **Deploy is required after ANY graph change** — adding or removing nodes,
  wiring edges, updating transformation configs, or changing the trigger
  schedule are all design-time operations that have no runtime effect until
  `deploy_workflow` is called again. A workflow with `graph_wired: true` but not
  yet (re)deployed will not reflect those changes at runtime. Always redeploy
  after modifying a workflow graph, even if the workflow was previously deployed
  successfully.
- **Instance provisioning** is `loxtep_workspace` — different facade. This
  Agent-Scope Skill assumes the target instance already exists.
- **Workflow authoring** (create, update, graph) is `loxtep_build` via the
  `data-workflows` Agent-Scope Skill. This Agent-Scope Skill handles
  _deployment_ of authored workflows.
- **`force_redeploy`** lets `deploy_workflow` or `deploy_project` start while a
  deployment for that workflow is still `pending` or `in_progress`. Without it,
  the call returns that a deployment is already in progress. The deploy path
  does not consult this flag when it uploads code.
- **`skip_validation`** on `deploy_workflow` bypasses pre-deploy validation
  (graph completeness, connection tests). Use only for known-good redeployments.
- **Status values:** Expect `pending`, `in_progress`, `deployed`, `failed`. Poll
  `get_deployment` for async deploy completion. `list_deployments` filters on
  `deployed`.
- **Customer-VPC connections** (`network_binding: customer_vpc` / `private`,
  `require_private_network: true`, or `mongodb-source` / `mongodb`) register on
  `connectors-private`. Unset memory stays `connectors-private-512`. `256`,
  `512`, `1024`, `2048`, and `custom` select that private size. Shared
  `connectors-*` workers stay off the customer VPC. Probe and sample still
  resolve `connectors-private-512`. If deploy cannot find the private Lambda,
  inspect the instance runtimes stack first (**`loxtep-instances`**). Leave
  shared workers off the VPC. Memory values and the `"custom"` errors are in
  **`data-workflows`**, Tune event transport, batch size, and memory.
- **Preserve networking on upgrade:** workflow `force_redeploy` re-reads org
  connector metadata (`network_binding`, `credential_parameter_store_refs`) and
  does not change subnet or security-group attachment. Instance runtimes
  upgrades re-read `connection_details.connector_vpc` and patch `VpcConfig` on
  every private connector function (`connectors-private-256`, `512`, `1024`,
  `2048`, and the custom private clone). The primary resolver still matches
  `connectorsprivate512`. Clearing `connector_vpc` removes `VpcConfig` from
  every private tier. Change subnets/SG with `update_instance` or the instance
  settings UI. Connector test vs ingest remains **`connect-external-system`** —
  deploy is not a connectivity probe.

## Dedicated instance code bucket

Managed and self-hosted deploys upload the workflow code bundle and each
`code_key` object to `connection_details.code_bucket`
(`org-{org8}-{inst8}-{account}-code`) and set `entity_config.code_bucket` on the
nodes they register. Shared instances keep workflow code and the project
workspace on the platform bucket. Provisioning writes `code_bucket`; callers do
not send it. See **`loxtep-instances`**, Workflow code bucket.

The project workspace for a managed or self-hosted instance is the objects in
that same bucket: entity JSON, project export, GitHub pull and push, workspace
reindex, deployment manifests, templates, transformations, workspace save
(`PUT /workflows/projects/{project_id}/workspace`), and workflow graph read and
save. Postgres stores a derived index of those objects. A missing object is
`NoSuchKey`, `NotFound`, or a bare 404 (`$metadata.httpStatusCode` is 404 and
there is no `name`, `code`, or `Code`). A non-object error is not absence.
`NoSuchBucket`, `AccessDenied`, `AllAccessDisabled`, `InvalidBucketName`,
`PermanentRedirect`, and `SignatureDoesNotMatch` on `name`, `code`, or `Code`
are not absence. Any other read, parse, or bucket failure is not absence and
fails the request. The index does not fill in for an object that could not be
read.

Studio and deploy open the bucket with the instance's deployment role. A managed
instance with no deployment role uses the platform credentials, and the bucket
is still the instance code bucket. A self-hosted instance with no deployment
role fails the workspace open with HTTP 500. `error.message` is the sentence
below. `error.details` has the request id (`project_id` or `workflow_id`) and no
`code` or `name`:

```text
Self-hosted instance code upload requires a deployment role in connection_details. Refusing to upload workflow code with platform credentials. ObserveProxyRole is execute-api:Invoke only.
```

These failures return `success: false`. `error.message` is the sentence below.
For the bucket errors, `error.details.code` and `error.details.name` are set as
shown, plus `project_id` or `workflow_id`. The HTTP 400 sets
`error.details.organization_id` to the organization id.

`deploy_workflow` calls `POST /workflows/deployments` and sends `instance_id`.
The body's `instance_id` is the deploy target, and that instance selects the
bucket. Pass the instance for the environment you are deploying to.

An omitted `instance_id`, an empty string, or the nil UUID
`00000000-0000-0000-0000-000000000000` is allowed only when the organization has
exactly one unambiguous live target: one live dedicated instance, or (when none
are dedicated) one active instance. Soft prefer is forbidden: prior
`deployments.instance_id` pins and stored `projects.instance_id` are **not**
used to choose a deploy target when several instances exist.

When the organization has no active instance, the response is HTTP 400
(`no_active_instance` / `No active instance found for organization`). When more
than one dedicated (or more than one active with no dedicated) remains and
`instance_id` is omitted, the response is HTTP 409 `ambiguous_instance`. The
handler does not choose the earliest `created_at`, a prior deploy pin, or a
“preferred” instance.

Optional `expected_environment_key` on deploy fails closed with HTTP 409
`environment_key_mismatch` when the target instance’s `metadata.environment_key`
disagrees (aliases: staging→stage, production→prod).

A dedicated target uses only that instance's `connection_details.code_bucket`. A
shared target uses the platform bucket.

No `code_bucket` on the dedicated instance. The response is HTTP 500.

```text
Dedicated instance <id> (<type>) has no connection_details.code_bucket. Refusing to read or write the project workspace on the platform bucket.
```

`<id>` is the instance id. `<type>` is the instance type stored on the record,
in lower case, such as `managed` or `self-hosted`. `error.details.code` is
`dedicated_bucket_missing`. `error.details.name` is
`InstanceWorkspaceBucketError`.

Fix: upgrade the instance
(`POST /organizations/instances/{instance_id}/upgrade`) or `update_instance`
with `force_runtimes_redeploy: true`, wait until the runtimes stack update
finishes and `connection_details.code_bucket` is set, then retry. An
already-deployed runtimes stack is updated only when that runtimes request sets
`force_redeploy`.

An explicit `instance_id` that is not an active instance of this organization
returns HTTP 404 before the workspace opens. An active instance has `deleted_at`
null and status `active` (a blank status counts). Status `deleted`, `deleting`,
and `detached` are not deploy targets.

```text
Instance <id> is not an active instance for this organization. Refusing to fall back to another instance for deploy.
```

`<id>` is the instance id. `error.details.code` is `target_instance_missing`.
`error.details.name` is `InstanceWorkspaceBucketError`.

`POST /workflows/projects` stores `instance_id` when the body names a live
instance of this organization. Omitting it when two or more live dedicated
instances exist returns HTTP 409 `ambiguous_instance` and does not insert the
project. One dedicated instance, or none, stores no binding.

Studio workspace reads, saves, graph, and reindex accept optional `instance_id`.
Studio sends the selected instance. An explicit id must match the project's
unique deployment pin or stored `projects.instance_id` when either is set (HTTP
409 `instance_id_mismatch` on conflict); it does not silently open another
instance bucket or the platform bucket. When omitted, the bucket still opens via
a deployment-row pin of exactly one live dedicated instance, then
`projects.instance_id` — that is workspace resolution, not deploy targeting.
Hosted MCP `reindex_workspace`, CLI `push` reindex, and SDK `projects.reindex`
do not pass `instance_id`, so an unbound project in a multi-instance org still
hits 409 `ambiguous_instance` (in the indexer bot for reindex).

Workspace storage is always the selected instance's bucket. Open never copies
from the platform bucket onto a dedicated `code_bucket`. When
`.loxtep/project.json` is missing on the opened instance bucket, readers fail
closed with HTTP 409 `project_metadata_unavailable`, including when the platform
bucket still has a copy. Materialize with pull from git / Studio on that
instance. Pull and restore must send that instance's `instance_id`. Studio Pull
requires a selected instance and never omits `instance_id`. Pull
`PostInputSchema` requires `instance_id` (UUID). A missing, blank, or non-UUID
`instance_id` is HTTP 400 from validation. CLI/SDK Pull require `instance_id`
(fail closed; loxtep-sdk#125). MCP `restore_version` posts `{ commit_sha }`
only, so every call returns HTTP 400 until #5066. Restore in Studio. The
entities GET message is `Project metadata is unavailable at <key>`.
`migratePlatformWorkspaceToDedicatedInstance` throws if called
(`Platform→dedicated migrate-on-open is deprecated (#5024).`).

`POST /workflows/deployments` passes the resolved target instance id into this
open, including when the body omitted `instance_id` and the organization has one
dedicated instance (or, with no dedicated instance, one active instance). That
open reads that instance bucket only. A missing `code_bucket` is still HTTP 500
`dedicated_bucket_missing`. Reindex POST returns
`{ project_id, enqueued, correlation_id }`. When the event includes
`instance_id`, the indexer bot opens that instance bucket only. A missing
`.loxtep/project.json` there is `RuntimeError` `Indexing failed`, with the
reader's message on the error payload.

Export and unbound clone return 409 `project_metadata_unavailable` when the
opened dedicated bucket lacks `.loxtep/project.json`.

**Deploy** (`POST /workflows/deployments`,
`POST /workflows/projects/{id}/deploy`, `deploy_project` / `deploy_workflow`,
`loxtep deploy`) requires an explicit instance for the target environment when
more than one live target exists. Several live dedicated instances with no
`instance_id` on deploy return HTTP 409 before a deployment is requested:

```text
Organization has N dedicated instances and the deployment target is ambiguous. Pass instance_id for the environment you are deploying to. Refusing soft prefer.
```

`N` is the count of dedicated instances with `deleted_at` null and status
`active` (a blank status counts). `error.details.code` is `ambiguous_instance`.
`error.details.name` is `InstanceWorkspaceBucketError`. Status `deleted`,
`deleting`, and `detached` are left out of that count. When no dedicated
instance remains and more than one active instance remains, the message is
`Organization has N active instances and the deployment target is ambiguous. Pass instance_id for the environment you are deploying to. Refusing soft prefer.`

`copyCodeKeysToInstanceBucket` leaves an object that is already in the instance
bucket in place. The source `GetObject` and the instance `HeadObject` both use
the same absence check: `NoSuchKey`, `NotFound`, or a bare 404
(`$metadata.httpStatusCode` is 404 and there is no `name`, `code`, or `Code`). A
non-object error is not absence. `NoSuchBucket`, `AccessDenied`,
`AllAccessDisabled`, `InvalidBucketName`, `PermanentRedirect`, and
`SignatureDoesNotMatch` on `name`, `code`, or `Code` are not absence. Any other
platform read fails the copy, including when the instance key is already there:

```text
Dedicated instance code object s3://<platform-bucket>/<key> could not be read (<message>). Refusing to leave the runtime on the platform bucket.
```

A platform object that is absent, and an instance object that is also absent:

```text
Dedicated instance code object s3://<platform-bucket>/<key> is not in the platform bucket, and it is not in the instance bucket <instance-bucket>. Refusing to leave the runtime on the platform bucket.
```

A check of the instance object that fails for a reason other than that absence:

```text
Could not check instance bucket object s3://<instance-bucket>/<key> (<message>). Refusing to copy the platform object over it.
```

The code-bundle copy above leaves an object already in the instance bucket in
place. It copies workflow `code_key` objects during deploy. A workspace open
does not copy a project prefix from the platform bucket.

If `code_bucket` is missing, the workflow deploy fails before upload:

```text
Cannot deploy to <type> instance <id>: connection_details.code_bucket is not set. The instance runtimes stack creates this bucket. Refusing to upload workflow code to the platform bucket.
```

`<type>` is `managed` or, for a self-hosted instance, `customer`. `<id>` is the
instance id. Use the same upgrade or `force_runtimes_redeploy` fix, then
`deploy_workflow` again. The next workflow deploy copies the current bundle and
`code_key` objects, and keeps any object already in the instance bucket.

On a dedicated runtime, custom-code and MicroVM nodes without
`entity_config.code_bucket` throw:

```text
Dedicated instance runtime requires entity_config.code_bucket. Refusing platform bucket fallback (DATA_PRODUCTS_BUCKET_NAME, LOXTEP_S3_BUCKET, loxtep-code-storage).
```

Shared instances do not throw this. Deploy the workflow again after the instance
bucket is recorded so the node config gets `code_bucket`.

<!-- BEGIN loxtep skill-scope (skill-package-v1) -->

## Agent-Scope Skill scope (`.loxtep/skills/loxtep-deployments.yaml`)

Resource scope and operation permissions for this Agent-Scope Skill, conformant
with the [`skill-package-v1`](https://loxtep.io/schemas/skill-package-v1.json)
schema. Any resource type or operation not listed is **denied (fail-closed)**.
Identifier lists are empty placeholders — fill them with the specific resources
in your workspace. This declaration does not change the hosted MCP config
(`mcp.loxtep.io`).

```yaml
# .loxtep/skills/loxtep-deployments.yaml
# Conforms to https://loxtep.io/schemas/skill-package-v1.json
# Fail-closed: this Agent-Scope Skill's facades are RBAC-governed and carry no data-mesh resource scope.
name: loxtep-deployments
description: Deployment lifecycle management — RBAC-governed; no data-mesh resource scope.
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
`_metadata: { "skill_name": "loxtep-deployments" }`; otherwise the server infers
from the operation map or `X-Skill-Name`. Unresolvable calls are denied
(`MISSING_SKILL_ATTRIBUTION`). The skill name also drives scope checks.

## Auth

If MCP returns missing JWT / auth errors, reconnect the Loxtep MCP server to
re-trigger OAuth (Agent-Scope Skill **loxtep-auth**).

## References

- [User story catalog](../../../docs/skills-user-stories.md) (story **S14**)
- Connect + private test: **`connect-external-system`**
- Instance runtimes / VPC: **`loxtep-instances`**
