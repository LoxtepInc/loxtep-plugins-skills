<!-- GENERATED FILE -- edit skills/<slug>/SKILL.md (or rule.mdc.src.md) and run `node scripts/generate-skills.mjs` -- do not edit directly -->
---
name: loxtep-ontology
description:
  Use when the user wants to manage ontology concepts, vocabulary terms,
  namespace mappings, or sync vocabularies. Part of the Organize step for
  defining shared meaning across systems.
metadata:
  documentation: https://github.com/LoxtepInc/loxtep-plugins-skills/blob/main/cursor/skills/loxtep-ontology/SKILL.md
---

# Ontology, vocabulary, and namespace management

Manage **ontology concepts**, **vocabulary terms** (thesaurus), and **namespace
mappings** for the semantic layer.

## When to use

- "**Thesaurus** terms", "**vocabulary** sync", "**ontology** concept",
  "**namespace** mapping", "**canonical key**", "create/update/delete
  **vocabulary** term", "register **namespace**"
- "**Enterprise override**", "**semantic gap**", "**Minimal Ontology**",
  "**divergence**", "**Govern step**", "resolve gap", "override coverage"

## Minimal Ontology Principle (MOP)

Loxtep uses a **delta-first** semantic model: vocabulary **packs** supply baseline
definitions; stewards record **enterprise overrides** only where meaning **diverges**
from that baseline. Gold promotion measures **override coverage on divergent fields**,
not blanket ontology binding on every schema field.

### Precedence (context injection)

When resolving meaning for a field or term:

1. **Active enterprise override** (linked to the data product when scoped)
2. **Organization thesaurus / steward edits**
3. **Registered vocabulary pack** baseline
4. **Inferred mapping** (auto-accept only above org `auto_accept_threshold`)

### When to create an override

Create an override when:

- Pack baseline does **not** match how your business uses the field (Govern step:
  "meaning differs from baseline" + required `divergence_reason`)
- Inference conflict blocks auto-accept (`needs_review` + active override on same key)
- A **semantic gap** issue was opened (low-confidence context or decision-trace
  override) and a steward resolves it manually

**Do not** override when pack baseline is accurate — inherit pack descriptions and
skip divergent-field promotion work.

### Maintainability — document deltas or Gold is vacuously easy

Gold **`override-coverage`** is the ratio of **divergent fields** that have an
**active enterprise override**, vs total divergent fields (default threshold **80%**,
org-configurable via `organizations.attributes.semantic.delta_coverage_threshold`).

If **no field is flagged as divergent** (`semantic_divergence`, `divergence_reason`,
or inference review conflict), divergent count is **zero** and coverage is **100%**
without any overrides. That is intentional for products that truly match the pack —
but teams must **flag real deltas** in the Govern step (or gap resolution) or Gold
becomes easier than the legacy "bind every field" gate without documenting semantics.

**Operational rule:** whenever steward meaning differs from baseline, flag the field
and create an override before pursuing Gold.

## Prerequisites

- MCP auth. Operations are **organization**-scoped.

## Happy-path flows

### Flow — Enterprise override (Govern / manual)

1. Confirm divergence is real (pack baseline is wrong for your org — not preference).
2. `create_enterprise_override` with:
   - `canonical_key` (usually the schema field name)
   - `enterprise_definition`, `divergence_reason` (required)
   - `override_source`: `govern_step` | `manual` | `inferred_rejection` | `agent_gap`
   - `linked_data_product_ids`: scope override to the data product
3. `list_enterprise_overrides` with optional `override_status`, `override_source`
   filters — UI: **Semantics → Enterprise overrides**.

Requires **`admin:vocabulary`** (or org admin).

### Flow — Resolve semantic gap (convergence)

1. List open gap issues (UI **Open Gaps** tab, or agent-orchestration issues with
   `run_kind=semantic_gap_candidate`).
2. Steward **names the term** and documents meaning — v1 does not auto-extract from
   question text.
3. `resolve_semantic_gap` with `issue_id`, `canonical_key`, `enterprise_definition`,
   `divergence_reason` — creates override with `override_source=agent_gap` and closes
   the issue.

Requires **`semantic_gaps:resolve`** (plus override create permissions).

### Flow — Vocabulary sync (bulk)

1. `list_terms` with `domain` filter to see current state.
2. `sync_vocabulary` with `mode: "full_sync"` or `"additive_only"` and
   `dry_run: true` to preview changes.
3. `sync_vocabulary` with `dry_run: false` to apply.

### Flow — Single term CRUD

1. `create_term` with `canonical_key`, `scheme`, `aliases`.
2. `get_term` by `term_id` to verify.
3. `update_term` for partial field changes.
4. `delete_term` to soft-delete (tombstone).

### Flow — Ontology concept creation

1. `create_ontology_concept` with required `name`, `namespace`, and `node_type`
   (optional `description`, `uri`, `parent_concepts`).
2. `create_ontology_relationship` linking source → target entity types.
3. `get_ontology_relationships` with filters to verify graph edges.
4. `update_ontology_concept` / `delete_ontology_concept` as needed.

### Flow — Namespace registration

1. `list_namespace_mappings` to see existing registrations.
2. `register_namespace_mapping` with `prefix`, `uri`, and `mappings` array.
3. `get_namespace_mapping` by prefix to verify.
4. Use `import_process_graph` (in `loxtep_context`) — registered namespaces
   auto-resolve during import.

### Flow — Resolve canonical key

1. `resolve_canonical_key` with an alias or variant spelling.
2. Returns the canonical term with scheme and precedence.

## MCP mapping

| `operation`                    | Scope        | Notes                                                                                                                  |
| ------------------------------ | ------------ | ---------------------------------------------------------------------------------------------------------------------- |
| `list_terms`         | organization | Filters: `scheme`, `domain`, `canonical_key_prefix`                                                                    |
| `get_term`           | organization | Single term by `term_id`                                                                                               |
| `create_term`        | organization | Conflict error if `canonical_key` exists                                                                               |
| `update_term`        | organization | Partial update by `term_id`                                                                                            |
| `delete_term`        | organization | Soft-delete; warns if referenced                                                                                       |
| `sync_vocabulary`              | organization | Bulk sync with `dry_run` support                                                                                       |
| `resolve_canonical_key`        | organization | Alias → canonical resolution                                                                                           |
| `get_ontology_relationships`   | organization | Filters: `source_entity_type`, `target_entity_type`, `relation_type`, `namespace`                                      |
| `create_ontology_concept`      | organization | Required: `name`, `namespace`, `node_type`; optional: `description`, `uri`, `parent_concepts`. URI uniqueness enforced |
| `create_ontology_relationship` | organization | Validates both entity types exist                                                                                      |
| `update_ontology_concept`      | organization | Partial field updates                                                                                                  |
| `delete_ontology_concept`      | organization | Soft-delete; warns about dependent relationships                                                                       |
| `register_namespace_mapping`   | organization | Additive merge by default; `overwrite: true` replaces                                                                  |
| `list_namespace_mappings`      | organization | Includes system-scoped (W3C PKO) + org-scoped                                                                          |
| `get_namespace_mapping`        | organization | Full mapping table for a prefix                                                                                        |
| `create_enterprise_override`   | organization | `canonical_key`, `enterprise_definition`, `divergence_reason`; optional `baseline_assumption`, `linked_data_product_ids`, `override_source` |
| `list_enterprise_overrides`    | organization | Filters: `override_status`, `override_source`                                                                          |
| `resolve_semantic_gap`         | organization | `issue_id` + override fields; marks AO issue done, `override_source=agent_gap`                                         |

## Prerequisites

- MCP auth. Operations are **organization**-scoped.
- Override CRUD: **`admin:vocabulary`**. Gap resolve: **`semantic_gaps:resolve`**.

## Pitfalls (MOP-specific)

- **Skipping divergent flags:** Gold promotion passes with zero overrides if no field
  is marked divergent — flag deltas in Govern when meaning differs.
- **Override without reason:** `divergence_reason` is required — audits and promotion
  gates depend on it.
- **CDLC orgs:** new overrides may default to `proposed`; only **`active`** overrides
  count toward Gold coverage and context injection.
- **Duplicate canonical_key:** POST returns **409** — update existing term instead.

## Pitfalls (general)

- **Runtime intelligence** (entity context, decision traces) is
  **`loxtep_context`** — different facade. This Agent-Scope Skill is for
  **schema/vocabulary management**, not runtime queries.
- **Process graph CRUD** (procedures, steps, import/export) is
  **`loxtep_context`** — different facade. Ontology concepts describe the
  _types_ in the graph; procedures are the _instances_.
- **Catalog search** is **`loxtep_query`** — use that for discovery across all
  artifact types. This Agent-Scope Skill manages the underlying ontology that
  catalog entries reference.
- **`sync_vocabulary` with `full_sync`** will tombstone terms not in the
  submitted set — use `additive_only` if you only want to add/update.
- **Namespace mappings** are used by `import_process_graph` (in
  `loxtep_context`) to auto-resolve external ontology terms. Register
  mappings _before_ importing graphs that use custom namespaces.
- **W3C PKO** (`https://w3id.org/pko`) is pre-registered as a system-scoped
  mapping — no need to register it manually.
- **`delete_term`** and **`delete_ontology_concept`** use soft-delete
  (tombstone pattern). They warn about dependents but do not cascade.

<!-- BEGIN loxtep skill-scope (skill-package-v1) -->

## Agent-Scope Skill scope (`.loxtep/skills/loxtep-ontology.yaml`)

Resource scope and operation permissions for this Agent-Scope Skill, conformant
with the [`skill-package-v1`](https://loxtep.io/schemas/skill-package-v1.json)
schema. Any resource type or operation not listed is **denied (fail-closed)**.
Identifier lists are empty placeholders — fill them with the specific resources
in your workspace. This declaration does not change the hosted MCP config
(`mcp.loxtep.io`).

```yaml
# .loxtep/skills/loxtep-ontology.yaml
# Conforms to https://loxtep.io/schemas/skill-package-v1.json
# Fail-closed: this skill's facades are RBAC-governed and carry no data-mesh resource scope.
name: loxtep-ontology
description: Ontology, vocabulary, and namespace management — RBAC-governed; no data-mesh resource scope.
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

`_metadata: { "skill_name": "loxtep-ontology" }`

## Auth

`loxtep-auth` / login.

## References

- [User story catalog](../../../docs/skills-user-stories.md)
