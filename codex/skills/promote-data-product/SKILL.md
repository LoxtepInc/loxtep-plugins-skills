---
name: promote-data-product
description:
  Promote a data product through medallion readiness checks and catalog promotion.
  Maps to PKO procedure procedure#promote-data-product-medallion (P4). Use MCP
  promote_data_product and quality/glossary validation before domain-owner approval.
license: MIT
metadata:
  platform: loxtep
  category: catalog
  pko_procedure: procedure#promote-data-product-medallion
---

# Promote data product (medallion)

**PKO:** `procedure#promote-data-product-medallion` — follows
`procedure#define-data-product-semantics`, precedes
`procedure#register-delivery-interface`.

## When to use

- User asks to promote a data product tier / medallion / readiness
- After semantic mapping is applied (`define-data-product-semantics`)
- Before registering delivery interfaces

## Steps (from PKO)

1. Run readiness checklist (`org-semantics-quality`)
2. Quality and glossary checks
3. Propose promotion — **HITL:** `domain_owner` approval
4. Apply via MCP `promote_data_product` or catalog API
5. Notify stakeholders (`trigger_event: data-product-promoted`)

## Pitfalls

- Do not skip semantics (P3) — promotion assumes glossary bindings exist
- Governance audience is **domain owner**, not generic org admin

## References

- PKO: `platform-backend/graph/platform-pko/promote-data-product-medallion.jsonld`
- Journey: **`loxtep-journey-orchestrator`**
