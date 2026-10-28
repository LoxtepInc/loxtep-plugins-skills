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
  documentation: https://github.com/LoxtepInc/loxtep-plugins-skills/blob/main/cursor/skills/promote-data-product/SKILL.md
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
  contract) are cleared by `procedure#establish-data-standards`, not here.
  **Known issue:** the `quality-rules` gate normally uses per-rule thresholds;
  when the effective-rules lookup fails or `blockingQualityRules` is omitted,
  `checkQualityRules` falls back to the legacy aggregate (at least 3 active
  rules and an overall score of at least 80%). The swap is silent. That is not a
  product feature. See
  [issue 3318](https://github.com/LoxtepInc/loxtep/issues/3318).
- Ready gate `delivery-endpoint` (Consumption methods) is satisfied by the
  baseline data product trigger (`event_stream`). An outbound delivery workflow
  is optional and is **not** required to reach Ready.
- Which gates block is **per organization** (governance tier + per-policy
  `blocks_promotion`). Never assume the full checklist is mandatory; read
  `required` on each prerequisite
- Approval routes to the **domain owner**, not a generic admin
- Never call `list_promotion_candidates` for data-product Ready/In Progress —
  that tool is memory/CDLC only
- Ready gate `lineage-exists` needs a catalog/graph edge with PROV orientation
  for `derives_from`: `source_id` = this product, `target_id` = upstream.
  Writing JSON into `update_data_product.lineage` does **not** satisfy the gate.
  Re-check with `get_promotion_readiness` + `target_tier: gold`.

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
