---
name: define-data-product-shape
description:
  Use when an external agent defines a data product from evidence Loxtep
  supplies. Submit shape and semantic proposals, wait for approval, then apply.
  Do not call hosted inference.
metadata:
  documentation: https://github.com/LoxtepInc/loxtep-plugins-skills/blob/main/opencode/skills/define-data-product-shape/SKILL.md
---

<!-- GENERATED FILE -- single source: loxtep/scripts/plugins-skills-generate-skills.mjs. From the loxtep root run `PLUGINS_SKILLS_ROOT=<plugins-skills> node scripts/sync-skills-to-plugins-skills.mjs` (or that generator with PLUGINS_SKILLS_ROOT set). Do not edit client copies; do not run sibling scripts/generate-skills.mjs. -->

# Define a data product shape

Version `1.1.0`. Procedure: `procedure#define-data-product-via-agent`.

Loxtep supplies evidence, tools, persistence, approvals, and application. You
perform the inference. Do not call `infer-source` or semantic-inference.

Hosted inference is a separate path and only when the user explicitly asks for
it. Then use `loxtep_meaning`: `request_semantic_inference`,
`get_semantic_inference`, and `promote_semantic_inference` (`accept` or
`dismiss`). Those calls do not write `schema.key`. Glossary apply is
`apply_glossary_bindings`. Discovered edges are
`discover_ontology_relationships` then `accept_ontology_relationships`. None of
those replace this proposal, approval, and apply workflow.

## Procedure ownership and resume

These steps are performed by the external agent. The generic PKO engine parks
steps marked `execution_mode: external_agent` with a required-action message; it
does not execute their MCP instructions or create a second workflow approval.

Keep the same `procedure_run_id` on submitted proposals. Submission links the
run to the real proposal approval; approval and application update its current
step, exact proposal/revision, and `context.next_operation`. An applied shape
moves to semantic proposal work, not back to another shape approval. Use typed
definition status and persisted effects to resume; do not approve an obsolete
generic gate. Definition completion and product Ready/publication remain
separate.

## Workflow

1. `list_data_products` — read `processing_role` or `kind`. Medallion `bronze` /
   Raw is not the processing role.
2. `start_definition_procedure_run` for the product you will define.
3. `get_definition_evidence` — note `evidence_id`, `revision`, sample `state`,
   provenance, sampling window, and coverage limitations.
4. `submit_shape_proposal` with `base_definition_revision` from the evidence
   revision. Include evidence refs, rationale, uncertainty, conflicts, and
   unresolved decisions.
5. An authorized principal calls `approve_definition_proposal` for that exact
   revision. Revising cancels the approval.
6. `apply_definition_proposal`. The response includes `catalog_snapshot`.
   `schema.key` there is the storage key. Retrying an applied revision rewrites
   that snapshot and does not create another shape.
7. `submit_semantic_bindings_proposal` separately. Shape approval does not
   accept ontology mappings. Semantic bindings do not write `schema.key`.
8. Approve that revision, then apply it.
9. `get_definition_status`. Read `stores`, `blockers`, and `readiness_checks`.
   `identifier_present` means the applied shape marked `is_primary_key`.
   `storage_key_present` means Iceberg can use the catalog snapshot. When
   `blockers` include `storage_key_conflict`, a shape is applied:
   `apply_definition_proposal` or `apply_schema` with matching keys. When no
   shape is applied, `PUT /dataproducts/{id}` with a matching `schema.key` is
   the only fix; MCP `update_data_product` does not. `catalog_refresh` rewrites
   a stale snapshot from an already-applied shape; it does not repair
   `DeclaredKeyConflictError`. Do not submit another shape for a missing
   `schema.key`. Resume with `list_runs` and the stored procedure context
   instead of repeating completed steps.

## Where the shape lives

Iceberg reads the catalog snapshot. The other records are not a second schema.

| Record             | Store                                      | What it decides                                                              |
| ------------------ | ------------------------------------------ | ---------------------------------------------------------------------------- |
| Proposal           | `semantic_proposals`                       | Draft shape, or a separate semantic-bindings draft                           |
| Shape              | `domain_schemas`, `domain_schema_versions` | Versioned fields. `is_primary_key` is the identity                           |
| Application        | `data_product_schema_applications`         | The one shape version pinned to this product                                 |
| Catalog snapshot   | `data_products.schema`                     | `schema.fields`, `schema.entities`, `schema.key`. Iceberg reads this         |
| Contract           | `data_contracts.schema_ref`                | Names a shape version. Creating a contract does not apply it                 |
| Source observation | `source_schema_versions`                   | Evidence from a source. Not the product shape                                |
| Workflow copy      | validation node `rules.schema`             | Copy taken at deploy. A later shape change reaches it on the next deploy     |
| Iceberg table      | instance storage                           | Built from the catalog snapshot. `schema.key` is sent as `identifier_fields` |

`query_trigger.primary_key` is the field list a SQL trigger concatenates into
`lx__id`. It does not set the product storage key.

`schema.key` is the list of source fields marked `is_primary_key`, in field
order. The primary entity `natural_key` is that same list joined with commas.
`lx__id` is the stored concatenation, not a field to pick. A contract, a
semantic binding, or another key field does not replace this declaration.

`get_definition_skill` returns this document. `get_procedure` with
`procedure#define-data-product-via-agent` returns the executable steps.

## Integer field types (Iceberg)

When declaring numeric whole-number fields on the Shape:

| Shape type | Iceberg storage         | Use when                                                              |
| ---------- | ----------------------- | --------------------------------------------------------------------- |
| `integer`  | Iceberg `long` (64-bit) | Default for counts, ids, and any whole number a JSON integer can hold |
| `int`      | Iceberg `int` (32-bit)  | Only when the product explicitly needs a 32-bit column                |
| `long`     | Iceberg `long` (64-bit) | Same physical type as Shape `integer`                                 |

Existing Iceberg `int` columns widen to `long` via schema evolution when the
Shape uses `integer` (or `long`). Out-of-range values (outside INT32 for `int`,
or not a safe integer for `int`/`long`) are sent to the error queue — never
truncated or coerced. Prefer `integer` unless you have a hard 32-bit
requirement.

## How to derive a shape

- Nested fields, JSON types, required vs optional, and nullability. Optional is
  not the same as nullable.
- Identifiers: mark those fields `is_primary_key` on the **data-product schema**
  path (`data_products.schema`, including REST/MCP shape `fields[]` that apply
  writes onto that snapshot). JSON Schema snapshots still drop `is_primary_key`
  and `schema.key`. Postgres and MySQL source catalog field lists (`postgres`,
  `postgresql`, `mysql`, `mysql-source`) keep `is_primary_key` (from the PRIMARY
  KEY constraint) and `references_shape` (from catalog foreign keys) on
  `connectors.metadata.entity_field_schemas`; those feed ontology induction
  (tier B) and, when promoted, write `schema.key` on the data product. Induction
  DEFERs without samples when that cache is missing for those types. Databricks,
  Snowflake, Redshift, BigQuery, and Athena still infer from samples. MongoDB,
  REST, and other connectors are unchanged. Declare a reference with
  `references_shape` (non-empty string: target shape name or canonical key).
  REST ShapeFieldSchema, MCP SchemaFieldSchema, proposal accept,
  apply_definition_proposal, data-product schema normalize, and schema cache
  sync keep it. An object, array, or empty string is HTTP 400. The target shape
  does not need to exist. The SDK still has no `references_shape` or
  `is_primary_key` field. Studio has no picker. Graph sync reads
  `references_shape` as the target node scope and does not resolve it to a data
  product. Do not treat a `_id` suffix as a key or foreign key. Postgres and
  MySQL source FKs are read from the database catalog. A column with FOREIGN KEY
  constraints to two tables is refused (`AMBIGUOUS_CATALOG_FK`); drop or fix the
  duplicate constraint before Test / listing / sync. If both `schema.key` and
  `is_primary_key` are present they must name the same fields; semantic
  bootstrap throws `DeclaredKeyConflictError` instead of unioning them.
  Recovery: (a) if a shape is applied, `get_definition_status` reports a
  `storage_key_conflict` blocker, and `apply_definition_proposal` or
  `apply_schema` with matching keys fixes it; (b) if no shape is applied, the
  only fix is `PUT /dataproducts/{id}` with a matching `schema.key`. MCP
  `update_data_product` does not accept `schema` and does not fix it.
  `catalog_refresh` does not repair `DeclaredKeyConflictError`. Tombstones and
  delete markers are their own record variants, not missing fields.
- Descriptions and sensitive-data classifications only when evidence supports
  them. Say so in `uncertainty` when it does not.
- Canonical targets, source-to-target field bindings, concept URIs
  (`urn:patch:…` is valid; a shape id `schema:{uuid}` is not), and relationship
  types. List unresolved gaps instead of inventing alignments.
- Record evidence refs. Structural similarity does not establish semantic
  equivalence.

## Reconciling evidence

Prefer, in order: declared contract, transformation outputs, observed source
schema, then samples.

- `sample.state: empty` means the read succeeded and returned nothing.
- `sample.state: failed` means the read did not succeed.
- `sample.state: unavailable` still allows a contract-backed proposal.
- A small sample is not proof of every valid value.

## Batch

`run_definition_batch` takes an explicit `data_product_ids` list. Read each
product's outcome. Do not treat one success flag as the batch result.
