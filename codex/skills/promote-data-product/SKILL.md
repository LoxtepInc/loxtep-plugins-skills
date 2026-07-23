<!-- GENERATED FILE -- edit skills/<slug>/SKILL.md (or rule.mdc.src.md) and run `node scripts/generate-skills.mjs` -- do not edit directly -->
---
name: promote-data-product
description:
  Use when a data product is ready to be trusted and published for wider use.
  Runs the readiness checklist, validates quality and definitions, and routes to
  the domain owner for approval. This is the final step of Organize.
license: MIT
metadata:
  platform: loxtep
  category: catalog
  documentation: https://github.com/LoxtepInc/loxtep-plugins-skills/blob/main/codex/skills/promote-data-product/SKILL.md
---

# Publish data product as trusted

## When to use

- "My data product is ready — publish it"
- "Run the readiness check"
- After definitions and quality rules have been reviewed and approved
- Before setting up delivery (the Use step)

## Steps

1. Run readiness checklist — `get_promotion_readiness`
2. Remediate any failing checks with `org-semantics-quality`
3. Route to domain owner for approval — `list_pending`, `resolve`
4. Apply — `promote_data_product`
5. Confirm — `get_data_product` to verify promoted status

## Pitfalls

- Definitions must be reviewed before running this — use `semantic-ontology-mapping` first
- Approval routes to the **domain owner**, not a generic admin

## References

- Next step: **`data-product-modeling`** (delivery interfaces)
- Full journey: **`loxtep-journey-orchestrator`**

## Implementation notes

- PKO: `procedure#promote-data-product-medallion` (P4)
- Follows `procedure#define-data-product-semantics`, precedes `procedure#register-delivery-interface`
- `hitl_gate: approval` — audience: `domain_owner`
- PKO graph: `platform-backend/graph/platform-pko/promote-data-product-medallion.jsonld`
