<!-- GENERATED FILE -- edit skills/<slug>/SKILL.md (or rule.mdc.src.md) and run `node scripts/generate-skills.mjs` -- do not edit directly -->
---
name: promote-data-product
description:
  Use when a data product should move along the semantic medallion axis (Raw →
  In Progress → Ready), not when changing lifecycle status (draft/active) or
  promoting CDLC/memory candidates. Runs the readiness checklist, remediates
  gates, and applies promote_data_product. Final Organize step before trusted
  cross-domain use.
license: MIT
metadata:
  platform: loxtep
  category: catalog
  documentation: https://github.com/LoxtepInc/loxtep-plugins-skills/blob/main/claude/skills/promote-data-product/SKILL.md
---

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
- After definitions, data standards, and the delivery interface are in place
- The Ready gate itself — last step before agents consume across domains

## When NOT to use

- Lifecycle `draft` → `active` (use data product update / Studio status)
- Memory/CDLC candidates (`list_promotion_candidates` / `promote_candidate`)
- CDLC artifact states (`transition_lifecycle`)

## Steps

1. Find products — `list_data_products`; read **`medallion`**, not only `status`
2. Run readiness checklist — `get_promotion_readiness`
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

- Definitions must be reviewed before running this — use
  `semantic-ontology-mapping` first
- Data standards (field descriptions, PII classification, quality rules, data
  contract) are cleared by `procedure#establish-data-standards`, not here
- A registered delivery endpoint is a **Ready gate** — register delivery before
  promoting to gold, not after
- Which gates block is **per organization** (governance tier + per-policy
  `blocks_promotion`). Never assume the full checklist is mandatory; read
  `required` on each prerequisite
- Approval routes to the **domain owner**, not a generic admin
- Never call `list_promotion_candidates` for data-product Ready/In Progress —
  that tool is memory/CDLC only

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
