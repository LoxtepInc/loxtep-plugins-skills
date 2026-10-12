<!-- GENERATED FILE -- edit skills/<slug>/SKILL.md (or rule.mdc.src.md) and run `node scripts/generate-skills.mjs` -- do not edit directly -->
---
name: define-data-product-shape
description:
  Use when an external agent defines a data product from evidence Loxtep
  supplies. Submit shape and semantic proposals, wait for approval, then apply.
  Do not call hosted inference.
metadata:
  documentation: https://github.com/LoxtepInc/loxtep-plugins-skills/blob/main/kiro/skills/define-data-product-shape/SKILL.md
---

# Define a data product shape

Version `1.1.0`. Procedure: `procedure#define-data-product-via-agent`.

Loxtep supplies evidence, tools, persistence, approvals, and application. You
perform the inference. Do not call `infer-source` or semantic-inference.

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
9. `get_definition_status`. Read `stores` and `readiness_checks`.
   `identifier_present` means the applied shape marked `is_primary_key`.
   `storage_key_present` means Iceberg can use the catalog snapshot. When
   `catalog_refresh` is set, call `apply_definition_proposal` with that
   `semantic_proposal_id`. Do not submit another shape for a missing
   `schema.key`. Resume with `list_runs` and the stored procedure context
   instead of repeating completed steps.

## Where the shape lives

Iceberg reads the catalog snapshot. The other records are not a second schema.

| Record | Store | What it decides |
| --- | --- | --- |
| Proposal | `semantic_proposals` | Draft shape, or a separate semantic-bindings draft |
| Shape | `domain_schemas`, `domain_schema_versions` | Versioned fields. `is_primary_key` is the identity |
| Application | `data_product_schema_applications` | The one shape version pinned to this product |
| Catalog snapshot | `data_products.schema` | `schema.fields`, `schema.entities`, `schema.key`. Iceberg reads this |
| Contract | `data_contracts.schema_ref` | Names a shape version. Creating a contract does not apply it |
| Source observation | `source_schema_versions` | Evidence from a source. Not the product shape |
| Workflow copy | validation node `rules.schema` | Copy taken at deploy. A later shape change reaches it on the next deploy |
| Iceberg table | instance storage | Built from the catalog snapshot. `schema.key` is sent as `identifier_fields` |

`query_trigger.primary_key` is the field list a SQL trigger concatenates into
`lx__id`. It does not set the product storage key.

`schema.key` is the list of source fields marked `is_primary_key`, in field
order. The primary entity `natural_key` is that same list joined with commas.
`lx__id` is the stored concatenation, not a field to pick. A contract, a
semantic binding, or another key field does not replace this declaration.

`get_definition_skill` returns this document. `get_procedure` with
`procedure#define-data-product-via-agent` returns the executable steps.

## How to derive a shape

- Nested fields, JSON types, required vs optional, and nullability. Optional is
  not the same as nullable.
- Identifiers and primary keys. Tombstones and delete markers are their own
  record variants, not missing fields.
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
