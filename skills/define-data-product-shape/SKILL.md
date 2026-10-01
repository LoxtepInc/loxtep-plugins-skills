---
name: define-data-product-shape
version: 1.0.0
description:
  Use when an external agent defines a data product from evidence Loxtep
  supplies. Submit shape and semantic proposals, wait for approval, then apply.
  Do not call hosted inference.
---

# Define a data product shape

Version `1.0.0`. Procedure: `procedure#define-data-product-via-agent`.

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
6. `apply_definition_proposal`. Retrying an applied revision is safe.
7. `submit_semantic_bindings_proposal` separately. Shape approval does not
   accept ontology mappings or publish the product.
8. Approve that revision, then apply it.
9. `get_definition_status` and report blockers. Resume with `list_runs` and the
   stored procedure context instead of repeating completed steps.

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
