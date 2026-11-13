---
name: loxtep-replay-and-recovery
description:
  Plan and carry out authorized Loxtep replay or historical repair through
  existing native operations. Use for backfill resumption, selective repulls,
  intentional checkpoint rewinds, and Iceberg rebuild recovery.
license: MIT
metadata:
  platform: loxtep
  category: recovery
  documentation: https://github.com/LoxtepInc/loxtep-plugins-skills/blob/main/claude/skills/loxtep-replay-and-recovery/SKILL.md
---

<!-- GENERATED FILE -- single source: loxtep/scripts/plugins-skills-generate-skills.mjs. From the loxtep root run `PLUGINS_SKILLS_ROOT=<plugins-skills> node scripts/sync-skills-to-plugins-skills.mjs` (or that generator with PLUGINS_SKILLS_ROOT set). Do not edit client copies; do not run sibling scripts/generate-skills.mjs. -->

# Replay and recovery

Choose the native recovery operation that serves the requested destination. Keep
continuous capture, consumer replay and table materialization separate. Do not
build a local scheduler, lifecycle engine, retry loop or duplicate CDC
implementation around capabilities Loxtep already provides.

## Identify the operation

Read the project's rules, native contracts and current deployment. Preserve
existing authorization across handoffs and resumed work. Establish the exact
environment, target, affected scope and requested outcome before mutation.

- **Resume / start a registered backfill runner:** use its supported native
  lifecycle and trigger. Where the runner uses LeoCron manual invocation,
  unpause and invoke the deployed registered runner; resetting its checkpoint is
  not the start operation. Inspect any retained schedule and pause it after the
  intended run if the contract requires a one-off invocation.
- **Repull selected identities:** use an existing supported source/connector
  path and its declared input contract. Do not fabricate a replacement envelope
  or write directly to the destination as a shortcut.
- **Rewind a consumer:** use `reset_backfill` only for an intentional replay
  from the position that operation actually supports. Inspect its current input
  schema; never assume it accepts arbitrary bounds. Preserve live capture's
  resume token and unrelated consumer checkpoints.
- **Repair Iceberg:** inspect the exact product's catalog key, writer binding,
  snapshots and current job before requesting its native rebuild. A working
  source-to-product stream does not need to be rebuilt merely because table
  materialization fails.
- **Protect event history:** when the product keeps an event history table
  (`get_iceberg_health` → `history.status` other than `not_enabled`), a normal
  rebuild keeps it, but `clean_reset: true` drops and rebuilds it from the queue
  and loses history older than queue retention. Read the dry run's
  `history_table` check and disclose that loss before a `clean_reset`. A
  `history.gap_after_eid` (history was off for a while) is filled only by a
  `clean_reset` rebuild from `z/`.
- **Find where bad data came from:** before repairing a downstream product, use
  `loxtep_observe` → `trace_iceberg_event` on the bad row's `_eid` to walk it
  upstream (needs event history on each product along the way). Repair at the
  hop where the data first went wrong, not at the symptom.

If scope is ambiguous, continue read-only inspection and resolve the ambiguity
before changing state. A recovery request does not authorize deleting retained
queues, changing capture identity or opening a Production scope not requested.

## Record the plan

Use an existing project plan/receipt format, or record this compact operation
brief. References name native contracts/Shapes rather than duplicating them.

```text
Requested outcome; environment; existing authorization:
Operation: runner resume | selective repull | rewind | Iceberg rebuild
Exact native runner / workflow / product and deployed revision:
Source of truth; target; retained interval / identities / EIDs:
End bound: explicit bound | evergreen | unsupported by this operation
Input/output contract references; stable logical identity:
Per-key ordering; external reads/writes; replay guarantee:
Expected destination behavior, exclusions and verification:
Native execution path and supported dry-run/preview:
Recovery or compatible forward-fix if this operation fails:
Stop/escalate conditions and existing publication policy:
```

Do not promise historical reconstruction for a declared latest-state lookup. It
rereads current source state; per-key ordered consumption and the declared
destination upsert must converge to the right current state. Preserve source
versions when provided; do not invent a source version from arrival time.

Bots remain independent consumers with their own checkpoints. A recovery plan
does not introduce shared run flags, cross-node count barriers, or an automatic
global publication pause. Use actual native policy and owner requirements for
release/cutover decisions. Keep invalid-event disposition distinct from source
position failures such as an invalid resume token; follow the native contract.

## Execute and observe

This playbook's platform scope permits inspection. For an authorized MCP
mutation, explicitly hand off the exact approved operation to `data-workflows`
or `loxtep-deployments`, load that skill, and attribute the operation to that
executing skill. This is a workflow handoff, not a way to evade a scope denial.
CLI/SDK execution follows `loxtep-sdk`, the installed version's help and the
same user authorization and native governance.

For the SDK data-plane CLI, inspect installed help before using:

```bash
loxtep data-products iceberg rebuild <product-id> --backfill-from <position> --dry-run --json
loxtep data-products iceberg status <product-id> --job-id <accepted-job-id> --wait 30s --json
```

Rebuild positions are explicit EIDs, `checkpoint` with a start checkpoint, or
the literal `start_of_queue`; enable-history windows are a different interface.
An omitted rebuild end bound is evergreen: disclose it rather than calling the
operation bounded. A real rebuild requires the CLI's confirmation gate. A dry
run plans the supported operation; it does not prove completed destination data.
Check published SDK and deployed service support separately from local source.

Persist the accepted job ID and poll that job. A timeout does not cancel the job
and does not justify another POST. A different current job, unsupported cancel
route or incomplete status is not success. Resume observation of the existing
operation; report an absent capability rather than emulating it.

## Verify the requested result

Use `loxtep-integration-verification` for the named source/destination outcome.
Native checkpoints describe per-node progress; a recorded run status alone
cannot prove source completeness or destination correctness. Assess table
materialization separately from stream delivery. Record operation, exact job or
runner, scope, evidence, limitations and next action without customer rows or
secret cursor values. Stop when the authorized outcome is established or the
exact missing access/capability prevents further progress.

## Attribution

Inspection under this playbook uses
`_metadata: { "skill_name": "loxtep-replay-and-recovery" }`. RBAC and
project/org scope overrides still apply. If the deployed server lacks this
definition, report the mismatch; never borrow another attribution merely to
bypass rejection.
