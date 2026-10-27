<!-- GENERATED FILE -- edit skills/<slug>/SKILL.md (or rule.mdc.src.md) and run `node scripts/generate-skills.mjs` -- do not edit directly -->
---
name: semantic-ontology-mapping
description:
  Use when the user wants to define what business terms mean, map concepts
  across systems, resolve vocabulary conflicts, or build a shared language for
  their data. This is the meaning-definition work inside the Organize step.
metadata:
  documentation: https://github.com/LoxtepInc/loxtep-plugins-skills/blob/main/codex/skills/semantic-ontology-mapping/SKILL.md
---

# Semantic & Ontological Mapping for Business Environments

Systematic discovery, formalization, and alignment of business semantics across
organizational boundaries — making implicit knowledge explicit,
machine-readable, and actionable.

## Journey and completion

This work can start and finish independently of data product promotion. Follow
`loxtep-semantic-layer`'s shared meaning journey: scope/evidence → reuse → draft
→ typed review → verify availability → optional product adoption. Terms,
concepts, relationships, and shapes are distinct artifacts; a product is a
consumer, not a prerequisite. Return verified artifact IDs and unresolved
questions. Do not equate an accepted proposal with a materialized mapping or
apply bronze/silver/gold readiness to shared meaning.

## When to use

- "**Semantic** mapping", "**ontology** design", "**process** mapping",
  "**crosswalk**", "what does **[term]** mean", "**concept** alignment",
  "**taxonomy**", "**knowledge graph** schema", "**domain** modeling",
  "**vocabulary** conflict", "different teams use different **names**",
  "**process context**", "map our **business processes** to data"
- "**Minimal Ontology**", "**enterprise override**", "**delta-first**",
  "**divergence** from baseline", "**override coverage**", "when **not** to
  override"

## Minimal Ontology Principle (methodology)

Model **deltas**, not the entire universe:

| Layer                | Steward work                                                                        |
| -------------------- | ----------------------------------------------------------------------------------- |
| Vocabulary pack      | Baseline definitions (industry / connector pack)                                    |
| Non-divergent fields | **Inherit** pack — no override, no Gold friction                                    |
| Divergent fields     | Flag in Govern + **enterprise override** with `divergence_reason`                   |
| Unknowns             | **Semantic gaps** (low-confidence context, decision overrides) → steward resolution |

### When **not** to override

- Pack baseline matches operational meaning — use pack term as-is.
- Cosmetic naming preference without semantic difference — use aliases/synonyms
  instead.
- One-off ETL transform detail — document in transformation, not ontology
  override.

### Shape → product and shape → concept (never product → concept)

- **Apply the org shape** (e.g. S&S Product via `apply_schema`) to the raw data
  product. That is shape → product.
- **Align that shape** to a pack/org concept (schema.org/Product) on the
  **shape** in Meaning — inherit non-divergent properties, override the rest.
- **Do not** bind Schema.org Product (or another concept) onto the same data
  product. That is product → concept — the wrong edge. Map to another shape on a
  **derived** product instead.
- Reference:
  [docs/concepts/type-vs-pack-alignment.md](../../../docs/concepts/type-vs-pack-alignment.md).

### Maintainability — flag divergence before publishing as trusted

Promotion to trusted tier uses **override-coverage** (% of **flagged divergent**
fields with active overrides). **Unflagged fields do not count.** If stewards
never mark deltas, coverage is vacuously 100% and the readiness check does not
prove semantic documentation. **Always flag + override real divergences** before
promotion.

## Core Concepts

### Semantic Model Components

| Component       | What                                       | Example                        |
| --------------- | ------------------------------------------ | ------------------------------ |
| Concept         | A business entity or idea                  | "Customer", "Order", "Revenue" |
| Relationship    | How concepts connect                       | "Order" has-a "Line Item"      |
| Constraint      | Business rules governing concepts          | "Order.total > 0"              |
| Crosswalk       | Mapping equivalent concepts across systems | CRM.Contact ≈ ERP.Customer     |
| Process Binding | Which processes produce/consume concepts   | "Fulfillment" consumes "Order" |

### Relationship Types

- `is-a` (taxonomy), `has-a` (composition), `part-of` (mereological)
- `participates-in`, `produces`, `consumes`, `governs`
- `transforms-into`, `equivalent-to`, `broader-than`, `conflicts-with`

## Happy-path flows

### Flow — Enterprise delta (override) instead of full rebinding

1. Identify fields where **your** meaning differs from pack baseline (not all
   fields).
2. Document `divergence_reason` per field (Govern step in Studio).
3. `create_enterprise_override` via **`loxtep-ontology`** — link
   `linked_data_product_ids`.
4. Track **Open Gaps** for inference/context unknowns; resolve with
   `resolve_semantic_gap`.
5. Promote to Gold when **override-coverage** ≥ org threshold (default 80%) on
   divergent fields only.

### Flow — Domain Ontology Construction

1. **Identify domain boundary:** What business capability area?
2. **Extract concepts:** From schemas, APIs, docs, stakeholder interviews.
   Thesaurus `scheme: field` terms are vocabulary keys, not ontology concepts.
3. **Define relationships:** Type each connection between ontology concepts
   (`create_ontology_relationship`). Connect / induction does **not** treat a
   column name ending in `_id` as a foreign key. Declare `references_shape` as a
   non-empty string (target shape name or canonical key). REST and MCP shape
   schemas, proposal accept, apply, data-product normalize, and schema cache
   sync keep it. An object, array, or empty string is HTTP 400. The target shape
   does not have to exist. The SDK still has no reference field. Studio has no
   picker. Graph sync reads `references_shape` as the target node scope and does
   not resolve it to a data product. Postgres and MySQL source foreign keys are
   read from the database catalog as `references_shape`. Mark identifiers with
   `is_primary_key` (or `schema.key`) on the **data-product schema** path, or
   rely on Postgres / MySQL catalog PRIMARY KEY flags cached on the connector
   (tier B: `postgres`, `postgresql`, `mysql`, `mysql-source` only). JSON Schema
   snapshots still drop those flags. Other connectors (MongoDB, REST, and so on)
   still do not emit catalog keys. Warehouses that do not cache field lists
   (Databricks, Snowflake, Redshift, BigQuery, Athena) still use sample
   inference. Missing catalog fields on the four SQL types **DEFER** induction;
   they do not infer from samples. A duplicate FOREIGN KEY on one column is
   `AMBIGUOUS_CATALOG_FK` — drop or fix it, then Test again.
4. **Resolve conflicts:** Same term, different meanings across teams.
5. **Formalize:** Create ontology concepts via `create_ontology_concept`.
6. **Link:** Create relationships via `create_ontology_relationship`.
7. **Register vocabulary:** `sync_vocabulary` with canonical terms.

### Flow — Semantic Crosswalk (Cross-System Alignment)

1. Document each system's definition of the contested concept.
2. Identify business scenarios where disagreement causes problems.
3. Map lifecycle states in each system.
4. Propose resolution: canonical term + qualified subtypes.
5. Build crosswalk: `register_namespace_mapping` for each system.
6. Document transformation rules between representations.

### Flow — Process Context Mapping

1. Decompose business process to activities (L2/L3).
2. For each activity: identify concepts consumed/produced/validated.
3. Map data sources (→ source data products) for each concept.
4. Document decision logic and semantic dependencies.
5. Trace upstream/downstream process dependencies.
6. Bind to data products: process inputs = source DPs, outputs = consumer DPs.

### Flow — Knowledge Graph Schema Design

1. Identify all systems holding domain-related data.
2. Extract entity types and relationships from each.
3. Resolve semantic conflicts (same entity, different representations).
4. Design node types: `create_ontology_concept` with properties.
5. Design edge types: `create_ontology_relationship` with cardinality.
6. Create query pattern catalog for known business questions.
7. Define population rules (which data products feed which graph nodes).

### Flow — Conflict Resolution

1. Document the conflict: same term, different meanings.
2. Identify all contexts where the term is used.
3. Choose resolution strategy:
   - **Canonical renaming:** Neutral umbrella term + qualified subtypes
   - **Context namespacing:** `sales.customer` vs `finance.customer`
   - **Polyhierarchy:** Concept exists in multiple taxonomies
4. Register resolution: `create_term` with aliases.
5. Update affected data products' `business_glossary`.

## Process Decomposition Levels

| Level | Scope            | Maps To                   |
| ----- | ---------------- | ------------------------- |
| L0    | Value chain      | Organization strategy     |
| L1    | Process area     | Domain in Loxtep          |
| L2    | Discrete process | Workflow in Loxtep        |
| L3    | Activity         | Workflow node (transform) |
| L4    | Task             | Individual operation      |

## MCP mapping

| `operation`                                       | Facade           | Scope        | Notes                                                         |
| ------------------------------------------------- | ---------------- | ------------ | ------------------------------------------------------------- |
| `create_term`                                     | `loxtep_meaning` | organization | Canonical term + aliases                                      |
| `sync_vocabulary`                                 | `loxtep_meaning` | organization | Bulk vocabulary sync                                          |
| `resolve_canonical_key`                           | `loxtep_meaning` | organization | Alias → canonical resolution                                  |
| `create_schema` / `apply_schema` / `patch_schema` | `loxtep_define`  | organization | Domain **shapes** (not DP schemas)                            |
| `create_ontology_concept`                         | `loxtep_meaning` | organization | Graph type node (`node_type` lowercase enum)                  |
| `create_ontology_relationship`                    | `loxtep_meaning` | organization | Edge between entity types                                     |
| `get_ontology_relationships`                      | `loxtep_meaning` | organization | Query graph edges                                             |
| `update_ontology_concept`                         | `loxtep_meaning` | organization | Modify concept definition                                     |
| `delete_ontology_concept`                         | `loxtep_meaning` | organization | Soft-delete (tombstone)                                       |
| `register_namespace_mapping`                      | `loxtep_meaning` | organization | Cross-system prefix mapping                                   |
| `list_namespace_mappings`                         | `loxtep_meaning` | organization | View registered namespaces                                    |
| `create_enterprise_override`                      | `loxtep_meaning` | organization | Delta when pack baseline wrong                                |
| `list_enterprise_overrides`                       | `loxtep_meaning` | organization | Audit active/proposed overrides                               |
| `resolve_semantic_gap`                            | `loxtep_meaning` | organization | Close gap issue + create override                             |
| `request_semantic_inference`                      | `loxtep_meaning` | organization | Explicit hosted inference only. Does not write `schema.key`   |
| `get_semantic_inference`                          | `loxtep_meaning` | organization | Read the hosted inference snapshot                            |
| `promote_semantic_inference`                      | `loxtep_meaning` | organization | `accept` or `dismiss` a completed run                         |
| `apply_glossary_bindings`                         | `loxtep_meaning` | organization | Apply accepted glossary bindings. Does not write `schema.key` |
| `discover_ontology_relationships`                 | `loxtep_meaning` | organization | Candidate edges. Optional `limit` 1–500                       |
| `accept_ontology_relationships`                   | `loxtep_meaning` | organization | Persist accepted edges                                        |

`apply_glossary_bindings` uses `target_identifiers[0]` on
`metadata.semantic_mapping.entries` where `target_kind` is `glossary_term` and
`source_path` is set. A UUID matches the glossary term name or `term_id`. A
plain name matches the name. A miss of either creates a glossary term named that
key. An absolute IRI (`scheme:`, including `urn:patch:term:v1:*`) resolves
through the thesaurus (`term_uri`, then the SKOS canonical key; soft-deleted
rows are ignored) and must link a glossary term in the same organization.
Otherwise the call is HTTP 422 `Unresolvable glossary target: <key>`
(`error.details.term_key`; `WebError.kind` is `unprocessable`) and nothing is
written. `process-glossary-bindings-requested` uses the same function.

**Define meaning** = terms + shapes. Ontology concepts are graph types /
relationships — use them after terms/shapes exist when you need typed edges.

## SDK mapping

| Concern                           | SDK                                                                      |
| --------------------------------- | ------------------------------------------------------------------------ |
| Terms / sync / overrides          | `client.meaning.thesaurus.*`                                             |
| Domain shapes                     | `client.define.shapes.*` (`create` / `list` / `get` / `apply` / `align`) |
| Ontology concepts / relationships | `client.meaning.ontology.*` (`node_type: 'entity'`, not `'Entity'`)      |
| Proposal review                   | `client.meaning.proposals.*`                                             |
| Bundle import                     | `client.meaning.bundles.import`                                          |

Do not claim full MCP↔SDK parity for namespace mappings or
`resolve_semantic_gap` (still MCP-only).

## Coupling with data-product-modeling

| Semantic Artifact       | Data Product Artifact              |
| ----------------------- | ---------------------------------- |
| Concept                 | Schema fields                      |
| Concept definition      | `metadata.business_glossary` entry |
| Relationship (produces) | Lineage edge (source → consumer)   |
| Process input           | Source DP consumed by workflow     |
| Process output          | Consumer DP produced by workflow   |
| Crosswalk mapping       | Field-level lineage transformation |
| Taxonomy term           | `metadata.tags` + domain           |
| Controlled vocabulary   | Schema enum values                 |

## Anti-Patterns

- **Product→concept bind:** Applying a shape (S&S Product) and then confirming a
  concept (Schema.org Product) on the same data product. Align the **shape** to
  the concept instead.
- **Semantic drift:** Same term means different things over time → version
  definitions
- **Phantom concepts:** Terms in docs that don't exist in data model → formalize
  or remove
- **Overloaded fields:** One field stores multiple concept types → decompose
- **Shadow taxonomies:** Unofficial classifications in spreadsheets → formalize
- **Semantic silos:** Teams using incompatible vocabularies → build crosswalk

## Pitfalls

- **Semantic bindings are not the storage key.** A concept alignment or field
  mapping does not write `schema.key`. The product storage key is the applied
  shape's `is_primary_key` fields, projected onto `data_products.schema` by
  apply. Iceberg reads that snapshot. Use `define-data-product-shape` for the
  shape, pin, and snapshot.
- **Do not infer keys or relations from `*_id` names.** Semantic connect /
  ontology induction treats a field as an identifier when it is a declared key
  on the data-product schema path, or when Postgres / MySQL catalog PRIMARY KEY
  flags are cached on the connector (`postgres`, `postgresql`, `mysql`,
  `mysql-source`). Those four types DEFER without samples when the cache is
  missing or stale. Databricks, Snowflake, Redshift, BigQuery, and Athena keep
  sample inference. On the semantic connect path only, high-confidence bindings
  still stay `needs_review` when any field mapping needs review. Org-wide
  inference auto-accepts on threshold plus override conflict only. Declare
  `references_shape` as a non-empty string. REST and MCP shape schemas, proposal
  accept, apply, normalize, and schema cache sync keep it; an object, array, or
  empty string is HTTP 400. The target shape does not have to exist. The SDK
  still has no reference field, and Studio has no picker. Graph sync reads
  `references_shape` as the target node scope and does not resolve it to a data
  product. Postgres and MySQL source FKs are read from the database catalog.
  Duplicate FKs on one column fail Test / listing / sync
  (`AMBIGUOUS_CATALOG_FK`); fix the source constraint.
- **Confusing with loxtep-ontology:** That Agent-Scope Skill is for MCP CRUD
  operations on ontology entities. This Agent-Scope Skill is the _methodology_
  for deciding what to create.
- **Confusing with loxtep-procedures:** Procedures are Organizational Skills
  (process graph instances). This Agent-Scope Skill defines the _types_ and
  _context_ that procedures reference.
- **Skipping conflict resolution:** Don't just pick one team's definition.
  Document all contexts and create explicit resolution.
- **Over-modeling:** Not every concept needs formal ontology treatment. Focus on
  concepts that cross system/team boundaries or cause confusion.

<!-- BEGIN loxtep skill-scope (skill-package-v1) -->

## Agent-Scope Skill scope (`.loxtep/skills/semantic-ontology-mapping.yaml`)

Resource scope and operation permissions for this Agent-Scope Skill, conformant
with the [`skill-package-v1`](https://loxtep.io/schemas/skill-package-v1.json)
schema. Any resource type or operation not listed is **denied (fail-closed)**.
Identifier lists are empty placeholders — fill them with the specific resources
in your workspace. This declaration does not change the hosted MCP config
(`mcp.loxtep.io`).

```yaml
# .loxtep/skills/semantic-ontology-mapping.yaml
# Conforms to https://loxtep.io/schemas/skill-package-v1.json
# Fail-closed: this skill's facades are RBAC-governed and carry no data-mesh resource scope.
name: semantic-ontology-mapping
description: Semantic/ontology mapping methodology — RBAC-governed; no data-mesh resource scope.
scope:
  data_products: []
  connectors: []
  workflows: []
  domains: []
  queues: []
permissions: {}
```

<!-- END loxtep skill-scope (skill-package-v1) -->

## Implementation notes

**MCP facade:** ontology and vocabulary CRUD use **`loxtep_meaning`**
(`create_term`, `create_ontology_concept`, `register_namespace_mapping`, etc.).
Legacy names: `loxtep_ontology`, `loxtep_semantic_layer`.

**Medallion / override-coverage:** promotion readiness uses internal tier names
(Bronze/Silver/Gold) and override-coverage on flagged divergent fields — see
**`promote-data-product`** and **`data-product-modeling`**.

## Skill attribution (required)

MCP tool calls need a resolvable skill name. Prefer
`_metadata: { "skill_name": "semantic-ontology-mapping" }`; otherwise the server
infers from the operation map or `X-Skill-Name`. Unresolvable calls are denied
(`MISSING_SKILL_ATTRIBUTION`). The skill name also drives scope checks.

## Auth

`loxtep-auth` / login.

## References

- [User story catalog](../../../docs/skills-user-stories.md)
- Comprehensive methodology: `.agents/skills/semantic-ontology-mapping/SKILL.md`
  (main repo)
