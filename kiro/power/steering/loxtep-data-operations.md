<!-- GENERATED FILE -- single source: loxtep/scripts/plugins-skills-generate-skills.mjs. From the loxtep root run `PLUGINS_SKILLS_ROOT=<plugins-skills> node scripts/sync-skills-to-plugins-skills.mjs` (or that generator with PLUGINS_SKILLS_ROOT set). Do not edit client copies; do not run sibling scripts/generate-skills.mjs. -->

# Data operations

Locate the boundary responsible for the reported symptom using existing native
observability. Keep evidence, hypotheses and unavailable observations distinct.

## Scope the symptom

Identify the expected outcome, exact environment, affected destination/product,
observed time window and impact. Reuse current project contracts, freshness/lag
objectives, owner/escalation path and prior authorization. If no objective is
declared, report observed age/lag without inventing an SLA or declaring a
breach. An integration incident does not authorize a platform durability
experiment, new test pipeline, broad replay or unrelated infrastructure changes.

## Inspect the relevant boundary

1. Resolve deployed workflow/bot/queue names with `loxtep_build` →
   `get_runtime_mapping`. Use the exact product and bindings, not guessed queue
   labels or infrastructure inferred from `list_instances`.
2. Inspect source failures, relevant node error queues and native progress along
   the affected path. Each stream node owns its checkpoint. Lag is backlog, not
   evidence of loss; a timeout can indicate a node needs tuning.
3. Follow `loxtep-queue-tracing` for queue reads. Continue with the returned
   `next_cursor` as `eid` while `has_more` is true, even when `results` is
   empty. Pass cursors unchanged. An incomplete scan or downstream error does
   not establish an empty queue. Missing observations mean unknown progress.
4. If the intended stream path contains events and has no relevant bot errors,
   retain that stream-delivery evidence. Diagnose missing Iceberg snapshots or
   query failures from the final product queue and its writer: registration,
   consumption, error disposition, snapshot commit and exact-product query. Do
   not restart upstream diagnosis solely because the table is unavailable.
5. For external delivery, inspect the Target's mapping, identity, authorization
   and error evidence, then verify the actual named destination. For a queryable
   product, use `loxtep-analytics` and honor sampled/partial result indicators.

No single status establishes all of these: configured, deployed, stream
delivering, materialized, endpoint correct, semantically approved, published. A
successful health response may still report unknown progress or an internal
failure. A partial query is not complete endpoint evidence.

## Choose the smallest supported action

- **Mapping or wiring error:** hand off to `data-workflows`, preserving native
  IDs, bindings, retained queues and checkpoints. Use native object schemas.
- **Backlog / throughput:** propose supported per-node memory, batch size or
  cadence changes in the declarative definition. Change the measured bottleneck;
  do not replace LeoCron or add unproven dynamic fanout. Unsupported tuning is a
  platform change request, not a reason to invent fields or a customer engine.
- **Replay / historical repair:** hand off to `loxtep-replay-and-recovery` with
  the exact affected scope and evidence.
- **Source or access failure:** report its supported recovery path or exact
  missing access; preserve source-position safeguards. An invalid event and a
  source-position failure can have different native dispositions.
- **Missing/broken native capability:** report a sanitized reproducible handoff
  in the owning platform repository when that work is requested. Do not create a
  duplicate customer implementation to conceal the gap.

Do not pause healthy consumers or add workflow-wide completion gates merely
because one node is behind. Native governance or a user-requested cutover may
require a scoped action; use that actual policy and existing authorization.

## Close the loop

After an authorized change, reread the same relevant signals and verify the
requested endpoint outcome with `loxtep-integration-verification`. Record:

```text
Symptom, affected scope and time window:
Expected objective and owner (or not declared):
Exact deployed workflow / product / runtime mapping:
Observed facts, coverage and observation times:
Boundary and diagnosis; confidence and unresolved alternatives:
Action taken or proposed; authorization and definition revision:
Recovery observations and requested endpoint evidence:
Remaining limitation, owner and next action:
```

Use the project's existing receipt location. Keep shared receipts free of
credentials, secret cursors and customer records. Recommend a targeted
contract/check improvement for a demonstrated failure; do not require a new
failure-injection program to close an ordinary integration task.

## Tools and attribution

Native inspection uses `get_runtime_mapping`, `read_queue_events`,
`get_queue_info`, supported bot observations, and Iceberg health/schema/status
through the available CLI/SDK. Check current operation schemas and deployed
support rather than assuming every diagnostic has MCP parity.

Attribute calls made under this playbook with
`_metadata: { "skill_name": "loxtep-data-operations" }`. Its platform
scoped-resource permissions are read-only; RBAC and project/org overrides still
apply. For an authorized mutation load the existing executing skill and perform
an explicit handoff. Never relabel a rejected call to bypass scope enforcement;
report a missing deployed skill definition instead.
