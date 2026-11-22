---
name: loxtep-process-intel
description:
  Use when the user wants to read or write entity context, query what Loxtep
  knows about a business entity, or record and retrieve decision traces.
metadata:
  documentation: https://github.com/LoxtepInc/loxtep-plugins-skills/blob/main/antigravity/skills/loxtep-process-intel/SKILL.md
---

<!-- GENERATED FILE -- single source: loxtep/scripts/plugins-skills-generate-skills.mjs. From the loxtep root run `PLUGINS_SKILLS_ROOT=<plugins-skills> node scripts/sync-skills-to-plugins-skills.mjs` (or that generator with PLUGINS_SKILLS_ROOT set). Do not edit client copies; do not run sibling scripts/generate-skills.mjs. -->

# Process intelligence

Entity context and decision traces.

## When to use

- "**Entity context** for order/customer", "**decision traces**", "record
  **execution context**", "record **decision**", "**unified context query**"

## Prerequisites

- MCP auth. Operations are **organization**-scoped.

## Happy-path flows

### Flow — Investigate an entity

1. `get_entity_context` or `query_entity_context` with correlation/domain params
   per API.
2. `list_decision_traces` filtered by entity/procedure/actor.

### Flow — Record execution context

1. `create_entity_context` with entity_type, entity_id, attributes,
   related_entities, source.
2. Append-only — each call creates a new context snapshot (no overwrite).

### Flow — Unified context query

1. `query_context` with `query` (natural language question).
2. Optionally restrict with `backends: ["graph", "vector"]` to limit search
   scope.
3. Response includes synthesized `answer`, `confidence` score, `sources`
   (citations), and execution `plan`.

### Flow — Record decision trace

1. `record_decision_trace` with decision_id, procedure_id, step_id, inputs,
   outcome, rationale, actor, timestamp.
2. Set `override: true` if the decision was manually overridden (emits audit
   event).
3. On every action, also send what the decision relied on, so people can see a
   receipt on Observe › Entity context:
   - `entity_type` + `entity_id` (e.g. `order`, `A-10432`)
   - `meaning_refs: [{name, concept_id, version}]`: the published meaning you
     read, with the version the read returned
   - `rule_refs: [{name, procedure_id, version, passed, check}]`: one entry per
     check
   - `data_refs: [{data_product_id, name, stage}]`
   - `needed_person` (true when a person had to decide) and `actor_type`
     (`agent`)
4. Give the user the returned `receipt_path`. Never invent a version: leave it
   out if the read didn't return one.

### Flow — Dogfood feed (Observe + mining) — #4787

`POST …/decision-traces` is a **union**. One MCP `record_decision_trace` call is
procedure-shaped and does **not** necessarily fill Observe `EntityContextPicker`
(Postgres entity traces).

| Shape           | Required fields                                                                  | Destination        |
| --------------- | -------------------------------------------------------------------------------- | ------------------ |
| Entity-level    | `entity_type`, `entity_id`, `decision_point`, `decision` (+ optional `metadata`) | Postgres → Observe |
| Procedure-level | `decision_id`, `procedure_id`, `step_id`, `outcome`, `actor`                     | MCP / mining graph |

When entity `metadata.procedure_id` is set, also send `metadata.decision_id`,
`metadata.actor`, and `metadata.outcome` (required for the mining bridge) plus
optional `metadata.step_id`. Omitting the three required keys is **400**.

**Dual-write** (or the entity bridge when `metadata.procedure_id` is set):

1. Confirm `entity_type` is in `KNOWN_ENTITY_TYPES` (`order`, `customer`,
   `return`, `refund`, `shipment`, `subscription`, `ticket`, `product`). Do not
   invent types — file a prerequisite issue to extend the enum.
2. `create_entity_context` for the demo entity.
3. For each of ≥10 traces on **one** entity:
   - Entity POST with `metadata.procedure_id`, `metadata.step_id`,
     `metadata.decision_id`, `metadata.actor`, and `metadata.outcome` (Observe +
     mining bridge).
   - Procedure POST twin with the same `procedure_id` / `step_id` and
     `inputs.entity_type` / `inputs.entity_id`.
4. Verify: entity-context GET / `list_decision_traces` / EntityContextPicker. If
   entity POST returns 400/500 with `procedure_id` set, the Postgres row may
   already exist — check `list_decision_traces` before retrying.

Checked-in runner (preferred over one-off MCP):

```bash
node scripts/dogfood-process-intel-feed.mjs --dry-run
LOXTEP_AUTH_TOKEN=… node scripts/dogfood-process-intel-feed.mjs --execute
```

Auth: API Gateway needs **SigV4 + `x-jwt-token`** (not `Authorization: Bearer`).
Scripts use `scripts/lib/dogfood-signed-fetch.mjs` (JWT from `LOXTEP_AUTH_TOKEN`
/`loxtep login`; AWS from `aws_credentials` or AWS CLI default chain).

Defaults: Patch Retention dogfood org `1e6b719f-c8a2-47f5-93b3-58530e6711d6`,
`entity_type=order`, `entity_id=dogfood-order-4787`, apidev. Production
(`api.loxtep.io`) requires `--allow-prod` + Nate authorization.

### Flow — Mining dogfood (candidates → steward) — #4788

Prereq: #4787 feed on the demo org (≥10 dual-written traces).

```bash
node scripts/dogfood-process-intel-mining.mjs --dry-run
LOXTEP_AUTH_TOKEN=… node scripts/dogfood-process-intel-mining.mjs --execute
# Steward publish (human JWT; agents must not publish via fenced MCP):
LOXTEP_AUTH_TOKEN=… node scripts/dogfood-process-intel-mining.mjs --execute --steward-publish
```

| Step    | Surface                                       | Notes                                                                                                                                                                     |
| ------- | --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Mine    | `run_mining_pass` / `POST …/mining/run`       | Candidates only; never auto-publish                                                                                                                                       |
| List    | `list_candidates` / `GET …/mining/candidates` |                                                                                                                                                                           |
| Approve | `act_on_candidate` approve                    | CDLC **`in_review`** only                                                                                                                                                 |
| Reject  | `act_on_candidate` reject                     | ≥1 chaff                                                                                                                                                                  |
| Publish | **Steward only**                              | Interim UI `/inbox/candidates`; CDLC `…/cdlc/artifacts/{artifact_ref}/transition` → `approved` → `deployed`. Meaning cockpit (#4765) when ready. Agents must not publish. |

**`source: runtime` stubs** (discover-procedures / thin event_sequences /
dogfood chaff): non-certified sequence sketches until a steward enriches and
publishes. Do not claim “auto PKO from warehouse.”

**Corporate emptiness:** org `00000000-0000-0000-0000-000000000000` (Loxtep
Corporate) showing 0 traces / 0 mining candidates is **not fed**, not an API
outage. Seed a demo org; do not “fix” Corporate emptiness.

## MCP mapping

| `operation`             | Scope        | Action |
| ----------------------- | ------------ | ------ |
| `get_entity_context`    | organization | read   |
| `query_entity_context`  | organization | read   |
| `create_entity_context` | organization | write  |
| `list_decision_traces`  | organization | read   |
| `query_context`         | organization | read   |
| `record_decision_trace` | organization | write  |
| `run_mining_pass`       | organization | write  |
| `list_candidates`       | organization | read   |
| `act_on_candidate`      | organization | write  |

## Pitfalls

- **Ontology/thesaurus** management (vocabulary terms, ontology concepts,
  namespace mappings) is now in the **`loxtep-ontology`** Agent-Scope Skill —
  not here.
- **Catalog** discovery is **`loxtep_query`** — different product surface.
- **Agent workspace** issues are **`loxtep_context`** — not process intel.
- **Data-product Ready / In Progress** is semantic medallion promotion — use
  **`promote-data-product`** (`get_promotion_readiness` +
  `promote_data_product`). `list_promotion_candidates` / `promote_candidate` are
  **memory/CDLC only** and never move a data product's `medallion` field.
- **Connectivity** — Process-intel tools require valid MCP authentication and
  access to your organization's process-intelligence data.

<!-- BEGIN loxtep skill-scope (skill-package-v1) -->

## Agent-Scope Skill scope (`.loxtep/skills/loxtep-process-intel.yaml`)

Resource scope and operation permissions for this Agent-Scope Skill, conformant
with the [`skill-package-v1`](https://loxtep.io/schemas/skill-package-v1.json)
schema. Any resource type or operation not listed is **denied (fail-closed)**.
Identifier lists are empty placeholders — fill them with the specific resources
in your workspace. This declaration does not change the hosted MCP config
(`mcp.loxtep.io`).

```yaml
# .loxtep/skills/loxtep-process-intel.yaml
# Conforms to https://loxtep.io/schemas/skill-package-v1.json
# Fail-closed: this skill's facades are RBAC-governed and carry no data-mesh resource scope.
name: loxtep-process-intel
description: Runtime process intelligence — RBAC-governed; no data-mesh resource scope.
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
`_metadata: { "skill_name": "loxtep-process-intel" }`; otherwise the server
infers from the operation map or `X-Skill-Name`. Unresolvable calls are denied
(`MISSING_SKILL_ATTRIBUTION`). The skill name also drives scope checks.

## Auth

`loxtep-auth` / login.

## References

- [User story catalog](../../../docs/skills-user-stories.md)
