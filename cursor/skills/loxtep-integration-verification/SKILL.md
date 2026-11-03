---
name: loxtep-integration-verification
description:
  Verify a Loxtep integration at the source and destination the user names. Use
  for delivery correctness, reconciliation, missing or different records, and
  evidence of an integration outcome. For tracing a processing failure, use
  loxtep-data-operations.
license: MIT
metadata:
  platform: loxtep
  category: verification
  documentation: https://github.com/LoxtepInc/loxtep-plugins-skills/blob/main/cursor/skills/loxtep-integration-verification/SKILL.md
---

<!-- GENERATED FILE -- single source: loxtep/scripts/plugins-skills-generate-skills.mjs. From the loxtep root run `PLUGINS_SKILLS_ROOT=<plugins-skills> node scripts/sync-skills-to-plugins-skills.mjs` (or that generator with PLUGINS_SKILLS_ROOT set). Do not edit client copies; do not run sibling scripts/generate-skills.mjs. -->

# Integration verification

Verify the requested integration outcome using existing authorized access.
Deployment, queue progress, table materialization and endpoint correctness are
different claims. A product or queue is an endpoint when the task names it as
one.

## Establish the comparison

Read the project's current rules, contracts and prior receipts. Record a short
outcome brief; reuse the task's existing details rather than asking again:

- Requested outcome and exact source/destination, including environment.
- Authorized actions, existing access paths, and what evidence would satisfy it.
- Population or bounded interval, grain, identity keys and mapping revision.
- Declared filters/exclusions, delete behavior, units and null/absent semantics.
- Snapshot times or cutoff rules, expected freshness and agreed tolerances.

Resolve the actual connector contracts and deployed mapping. Do not assume a
database pair, require a particular tunnel or comparison tool, or use catalog
metadata as proof of destination contents. Reuse native Shapes by reference; do
not create another schema authority.

If endpoint access is unavailable, report the exact missing access or native
capability. Existing queue evidence can narrow a diagnosis, but cannot silently
replace the requested endpoint proof. Do not deploy verification workflows,
bots, products or queues just to copy records for comparison.

## Compare at the requested boundary

1. Read both endpoints through the supported, authorized access paths. When a
   named endpoint is a queryable data product, use `loxtep-analytics` and honor
   query status, pagination, sampling and partial-read indicators. External
   endpoints use their existing connector-bound access; do not assume MCP can
   expose arbitrary credentials or query every external database.
2. Compare the declared projection at its actual grain. Counts describe volume;
   key-set checks identify missing/extra records; field comparisons or canonical
   row digests establish mapped value agreement. Choose what the outcome needs.
3. Preserve value types, array order and declared normalization in any digest.
   Record the projection revision. A projection failure is an uncomparable
   source record, not a successful match or an extra destination row.
4. Record complete versus sampled coverage for each side. Finish pagination
   before claiming full-population coverage. Independent snapshots are not a
   distributed transaction; note their pinning window and concurrent writes.
5. Reread affected identities when moving data makes the result ambiguous.
   Report the original comparison and later observations separately. Advancing
   timestamps or equal counts do not erase a remaining value mismatch. Do not
   remove volatile fields or invent a tolerance merely to obtain a pass.

Use `loxtep-data-operations` for a concrete discrepancy's runtime diagnosis.
Distinguish observed differences from their cause; a checksum difference alone
does not establish a platform defect. Native quality rules may persist ongoing
checks, but a quality score is not a substitute for the endpoint comparison.

## Return a useful receipt

Use the project's existing evidence location and format when present. Otherwise
record the fields below as a short Markdown report or structured receipt. This
is evidence metadata, not a new native object schema:

```text
Outcome and environment:
Source / destination and access method (no credentials):
Mapping / contract revision; grain and identity:
Population / interval; filters and exclusions:
Observation times and snapshot limitations:
Coverage per endpoint: complete | sampled | incomplete | unavailable
Counts: compared, missing, extra, different, uncomparable
Checks performed and declared tolerances:
Later observations (separate from the original comparison):
Conclusion supported by these observations:
Remaining uncertainty and smallest next action:
```

Store aggregate counts, field names, digests and sanitized configuration
provenance. Keep credentials, resume tokens and customer payloads out of shared
receipts. If the user requests private row-level differences, use the approved
private destination and keep the shared report payload-free.

Verification is read-only. A discrepancy does not authorize repairs, backfills,
checkpoint resets or broader platform tests. For an authorized correction, hand
off its exact scope to `data-workflows` or `loxtep-replay-and-recovery`.

## Tools and attribution

Use current tool schemas. `get_runtime_mapping` on `loxtep_build` can identify
the deployed path; `get_data_product` identifies the exact product. Follow
`loxtep-queue-tracing` for diagnostic queue reads and `loxtep-analytics` for
SQL. Attribute calls made under this playbook with
`_metadata: { "skill_name": "loxtep-integration-verification" }`. The platform
definition grants scoped-resource reads; RBAC and project/org overrides still
apply. If the deployed server does not resolve this skill, report the version
mismatch; do not change attribution to bypass a denial.
