---
name: promote-data-product
description:
  Use when a data product should move along the semantic medallion axis (Raw →
  In Progress → Ready), not when changing lifecycle status (draft/active) or
  promoting CDLC/memory candidates. Runs the readiness checklist, remediates
  gates, and applies promote_data_product. Final Products readiness step before
  trusted cross-domain use.
license: MIT
metadata:
  platform: loxtep
  category: catalog
  documentation: https://github.com/LoxtepInc/loxtep-plugins-skills/blob/main/opencode/skills/promote-data-product/SKILL.md
---

<!-- GENERATED FILE -- single source: loxtep/scripts/plugins-skills-generate-skills.mjs. From the loxtep root run `PLUGINS_SKILLS_ROOT=<plugins-skills> node scripts/sync-skills-to-plugins-skills.mjs` (or that generator with PLUGINS_SKILLS_ROOT set). Do not edit client copies; do not run sibling scripts/generate-skills.mjs. -->

# Promote data product medallion (Raw → In Progress → Ready)

## Vocabulary (do not conflate)

| Axis                                | Field / API                 | Values                                            | User words                   |
| ----------------------------------- | --------------------------- | ------------------------------------------------- | ---------------------------- |
| **Semantic medallion** (this skill) | `medallion` / `target_tier` | `bronze` → `silver` → `gold`                      | Raw → In Progress → Ready    |
| **Lifecycle status**                | `status`                    | `draft` \| `active` \| `deprecated` \| `archived` | Live / deprecated / archived |
| **CDLC / memory promotion**         | `list_promotion_candidates` | candidate review queue                            | Context artifact promotion   |

`active` ≠ Ready. A product can be **active** and still **Raw** (bronze).
"Promote to Ready" always means `promote_data_product` with `target_tier: gold`.

## When to use

- "Promote to Ready" / "In Progress → Ready" / "Silver → Gold"
- "Run the readiness check" / "what's blocking promotion"
- After definitions and data standards are in place. An outbound delivery
  workflow is optional for Ready.
- The Ready gate itself — last step before agents consume across domains

## When NOT to use

- Lifecycle `draft` → `active` (use data product update / Studio status)
- Memory/CDLC candidates (`list_promotion_candidates` / `promote_candidate`)
- CDLC artifact states (`transition_lifecycle`)

## Steps

1. Find products — `list_data_products`; read **`medallion`**, not only `status`
2. Run readiness checklist — `get_promotion_readiness` with the **same**
   `target_tier` you intend to promote to (`silver` or `gold`). Default is
   `silver`; Ready / `lineage-exists` only appears for `target_tier: gold`.
3. Remediate **required** (blocking) gates first — each unsatisfied prerequisite
   carries `guidance` pointing at the PKO step/skill that clears it
4. Offer **advisory** gates as suggestions — they never block promotion, but
   they improve AI-readiness
5. Route to domain owner for approval when HITL applies — MCP `loxtep_review`
   (`list_pending`, `resolve`) or SDK `client.review.approvals.*` / CLI
   `loxtep approvals`
6. Apply — `promote_data_product` with `target_tier: silver` (→ In Progress) or
   `gold` (→ Ready)
7. Confirm — `get_data_product` / `get_promotion_readiness` and verify
   **`medallion`** is `silver` or `gold` (not that `status` changed)

## Pitfalls

- An empty `schema.fields` list fails Schema Version, Field Descriptions, and
  PII Classification. `metadata.schema_version` and product-level `pii_fields`
  are not a schema. Do not recommend a primary key, glossary binding, quality
  rules, or `promote_data_product` until `get_data_product` shows a non-empty
  `schema.fields`. The next step is `create_schema` / `apply_schema`, then
  re-read the product.
- `get_definition_status` `identifier_present` means the applied shape marked
  `is_primary_key`. Iceberg reads `schema.key` on the catalog snapshot
  (`data_products.schema`). When `catalog_refresh` is set, re-apply that shape.
  A semantic binding, a contract `schema_ref`, or `query_trigger.primary_key`
  does not write the storage key.
- Definitions must be reviewed before running this — use
  `semantic-ontology-mapping` first
- Data standards (field descriptions, PII classification, quality rules, data
  contract) are cleared by `procedure#establish-data-standards`, not here. A
  failed effective-rules lookup throws. Readiness does not substitute a 3-rule
  or 80% gate.
- Ready gate `delivery-endpoint` (Consumption methods) is satisfied by the
  baseline data product trigger (`event_stream`). An outbound delivery workflow
  is optional and is **not** required to reach Ready.
- Which gates block is **per organization** (governance tier + per-policy
  `blocks_promotion`). Never assume the full checklist is mandatory; read
  `required` on each prerequisite
- Approval routes to the **domain owner**, not a generic admin
- Never call `list_promotion_candidates` for data-product Ready/In Progress —
  that tool is memory/CDLC only
- A replay of the same request (same data product, `target_tier`, and
  `requested_at`), including two writes at the same time, records one Promotion
  history row for a readiness re-check, an entity-IRI failure, invalid Ready
  bindings, a lost stage save, an In Progress catalog registration failure, a
  named completeness override that can't be used, a deprecated or archived
  product, an ontology validation block, or too few defined fields when the
  request did not name a completeness override. The request key is
  `medallion_promotion:{data_product_id}:{target_tier}:rejected:{requested_at}`.
  `GET /graph/promotions/{data_product_id}/audit` shows that key at
  `prerequisites[].details.idempotency_key` when the product was deprecated or
  archived, when ontology validation blocks the promotion, when too few fields
  are defined and the request did not name a completeness override, when the
  named override can't be used, or when In Progress catalog registration fails.
  A different `requested_at` is a different request.
- Ready gate `lineage-exists` needs an active catalog edge. Deploying a workflow
  with upstream wiring records it (`derives_from`: `source_id` = this product,
  `target_id` = upstream; a connection uses `produces`). Writing JSON into
  `update_data_product.lineage` does **not** satisfy the gate. When readiness
  names a missing edge (source type, source id, relationship, and data product),
  redeploy that workflow or run the catalog-lineage-backfill migration. A manual
  edge is still `POST /dataproducts/lineage`. If the remediation says the wiring
  lookup failed, the lookup did not succeed. Do not treat that as "there is no
  wiring". Re-check with `get_promotion_readiness` + `target_tier: gold`.

## References

- Gate registry: `platform-backend/_core/src/medallion/promotion-gates.json`
- Concept: Semantic Medallion (Raw / In Progress / Ready)
- Previous step: **`data-product-modeling`** (register delivery interface)
- Full journey: **`loxtep-journey-orchestrator`**

## Implementation notes

- PKO: `procedure#promote-data-product-medallion` (P4)
- Follows `procedure#register-delivery-interface`, precedes
  `procedure#enable-agent-mcp-access`
- `hitl_gate: approval` — audience: `domain_owner`
- PKO graph:
  `platform-backend/graph/platform-pko/promote-data-product-medallion.jsonld`
