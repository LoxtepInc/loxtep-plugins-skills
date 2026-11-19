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
  documentation: https://github.com/LoxtepInc/loxtep-plugins-skills/blob/main/codex/skills/loxtep-integration-verification/SKILL.md
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
   **Restricted / query-redacted fields:** do not use `execute_query` cleartext
   (policy redacts those columns). Use `loxtep_observe` →
   `create_data_comparison` + `request_data_comparison_run` +
   `get_data_comparison_run` / `list_data_comparison_findings`. Digests are
   server-side (`privacy.digest_mode: server_side_row_hash` or
   `external_reference_digests`); findings return differing field _names_ only.
   Requires `data_products:pipeline_read`. At least one side must be
   Loxtep-managed warehouse storage. For MongoDB/PostgreSQL fidelity, put
   precomputed digests on a `reference_digests` side (`key_values`,
   `field_digests`, `row_hash`) — never upload restricted cleartext; API
   responses redact row payloads.
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

## Compare against an external MongoDB/PostgreSQL snapshot

When the named endpoint is an external store, do not upload restricted
cleartext. Hash the snapshot offline and put it on a `reference_digests` side.
The other side must be a Loxtep-managed `data_product` or `query`.

**Side** (`kind: "reference_digests"`):

- `source_label` (required): operator label, 1–200 characters after trim (for
  example `mongodb:accounts`).
- `captured_at` (required): ISO-8601 datetime with offset (`Z` or `±HH:MM`).
- `coverage_note` (optional): at most 2000 characters.
- `rows`: 1–100000 reference rows.

**Row** (identity keys plus digests; never restricted compare-field values):

- `key_values`: already-canonical key tuple, same order as `key_fields`. Length
  must equal `key_fields` (1–8). Nulls allowed.
- `field_digests`: one entry per `compare_fields`, same order. Length must equal
  `compare_fields` (0–200). Each value is 32-character lowercase md5 hex, or
  `null` when the canonical value is null.
- `row_hash`: 32-character lowercase md5 hex (not null).

**Compute digests offline.** Canonicalize each mapped field to the same VARCHAR
(or NULL) the warehouse side would (`canonicalFieldSql` in `encoding.ts`). There
is no JS canonicalizer — `encodeTuple` / `md5Hex` take already-canonical
strings.

Per `type`:

- `string`: CAST VARCHAR, then optional `trim`, then optional `lower` / `upper`
  (`case`).
- `integer`: integral value as HUGEINT VARCHAR. A non-integral source fails the
  run; it does not become NULL.
- `decimal`: CAST DECIMAL(38, `scale`) VARCHAR (`scale` is required).
- `boolean`: `true` / `false` (integer 1 / 0 map to those).
- `timestamp`: UTC, `date_trunc` to `timestamp_precision` (default
  `microsecond`), then `strftime` `%Y-%m-%dT%H:%M:%S.%fZ`.
- `date`: `%Y-%m-%d`.

Tuple encoding of already-canonical values (`encodeTuple`): NULL → `"N"`; a
value → `"V"` + utf8 byte length + `":"` + value. Concatenate tokens with no
separator.

Then: field digest = `md5Hex(canonical)` (`null` stays `null`); `row_hash` =
`md5Hex(encodeTuple(key_values) + encodeTuple(canonical compare values))`.

**Constraints:**

- At least one side must be managed (`data_product` or `query`).
- `watermark` is not supported with `reference_digests`; filter the snapshot to
  the same scope offline.
- GET / API responses replace `rows` with `row_count` (payloads are not
  returned).
- `privacy.digest_mode` becomes `external_reference_digests` with
  `privacy.reference`:
  `{ side, source_label, captured_at, row_count, coverage_note }`
  (`coverage_note` omitted when unset).
- Refreshing row payloads does not bump `rule_version`. The rule hash ignores
  `key_values`, `field_digests`, and `row_hash`; identity is `source_label`,
  `captured_at`, `coverage_note`, and `row_count`.
- Findings return differing field names only — never compare-field values.

Worked example (digests verified against `encodeTuple` / `md5Hex` /
`fieldValueDigest` / `referenceRowHash` / `ComparisonSpecSchema`):

```json
{
  "left": {
    "kind": "reference_digests",
    "source_label": "mongodb:accounts",
    "captured_at": "2026-11-18T00:00:00.000Z",
    "coverage_note": "restricted fields only",
    "rows": [
      {
        "key_values": ["1"],
        "field_digests": ["bb6cb5c68df4652941caf652a366f2d8", null],
        "row_hash": "c16ce64e3bf7a017065c8c8fce710ffd"
      }
    ]
  },
  "right": {
    "kind": "data_product",
    "data_product_id": "11111111-1111-4111-8111-111111111111"
  },
  "key_fields": [
    { "name": "id", "left": "id", "right": "id", "type": "string" }
  ],
  "compare_fields": [
    {
      "name": "settings",
      "left": "settings",
      "right": "settings",
      "type": "string"
    },
    {
      "name": "billing",
      "left": "billing",
      "right": "billing",
      "type": "string"
    }
  ]
}
```

That row is key `1`, canonical `settings` `{"a":1}`, canonical `billing` null:
`encodeTuple(["1"])` is `V1:1`; `encodeTuple(['{"a":1}', null])` is
`V7:{"a":1}N`; field digest is `md5Hex('{"a":1}')`; `row_hash` is
`md5Hex("V1:1" + "V7:{\"a\":1}N")`.

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
