# Promotion Workflow — Surface Parity

> Updated 2026-06-17. All gaps resolved. Full parity across UI, MCP, SDK, CLI.

## Summary

| Surface | Bronze→Silver | Silver→Gold | Promote Action |
|---------|--------------|-------------|----------------|
| **UI** | ✅ Full | ✅ Full | ✅ Button in dialog |
| **MCP** | ✅ Full | ✅ Full | ✅ `promote_data_product` |
| **SDK** | ✅ Full | ✅ Full | ✅ `data_products.promote()` |
| **CLI** | ✅ Full | ✅ Full | ✅ `loxtep data-products promote` |

---

## Bronze → Silver Prerequisites

| # | Prerequisite | MCP | SDK | CLI |
|---|---|---|---|---|
| 1 | Schema version ≥ 1.0 | `loxtep_build` → `update_data_product` | `client.data_products.update()` | `loxtep data-products create/get` + update |
| 2 | All fields have descriptions | `loxtep_build` → `update_data_product` | `client.data_products.update()` | same |
| 3 | PII fields classified | `loxtep_define` → `tag_pii_fields` | `client.schemas.tag_pii_fields(dp_id, fields)` | via SDK |
| 4 | ≥3 active quality rules | `loxtep_define` → `create_quality_rule` | `client.quality.create()` | `loxtep quality create` |
| 5 | Quality score ≥ 80% | `loxtep_observe` → `get_quality_score` | `client.quality` list + check | `loxtep quality` |
| 6 | ≥1 glossary term (field alias) | `loxtep_meaning` → `append_synonym` | `client.thesaurus.append_synonym()` | via SDK |
| 7 | ≥1 primary entity with natural key | `loxtep_build` → `update_data_product` | `client.data_products.update()` | same |

---

## Silver → Gold Prerequisites

| # | Prerequisite | MCP | SDK | CLI |
|---|---|---|---|---|
| 8 | All fields have ontology bindings | `loxtep_meaning` → `bind_field_to_ontology` | `client.data_products.promote()` triggers engine validation | via MCP/SDK |
| 9 | Active data contract with SLA | `loxtep_build` → `create_data_contract` | `client.data_contracts.create()` | `loxtep data-contracts create` |
| 10 | ≥1 delivery interface | `loxtep_build` → `create_delivery` | `client.deliveries.create()` | via SDK |
| 11 | Graph sync | Auto-handled by Silver promotion engine | — | — |
| 12 | PROV-O lineage | `update_data_product` lineage field | `client.data_products.update()` | same |

---

## The Promote Action

| Action | MCP | SDK | CLI |
|---|---|---|---|
| Check readiness | `loxtep_build` → `get_promotion_readiness` | `client.data_products.readiness(id)` | `loxtep data-products readiness <id>` |
| Execute promotion | `loxtep_build` → `promote_data_product` | `client.data_products.promote(id, 'silver'\|'gold')` | `loxtep data-products promote <id> --target silver\|gold` |
| Create data contract | `loxtep_build` → `create_data_contract` | `client.data_contracts.create(payload)` | `loxtep data-contracts create --data-product-id <id> --name <name>` |
| List data contracts | `loxtep_build` → `list_data_contracts` | `client.data_contracts.list({ data_product_id })` | `loxtep data-contracts list` |

---

## End-to-end agent flow (Bronze → Silver)

```
1. get_promotion_readiness          → see what's missing
2. update_data_product              → ensure schema version ≥ 1.0, all fields described
3. tag_pii_fields                   → classify PII
4. create_quality_rule (×3)         → add quality rules
5. get_quality_score                → confirm score ≥ 80%
6. append_synonym (×N)              → register field aliases
7. get_promotion_readiness          → confirm all green
8. promote_data_product             → target_tier: "silver"
```

## End-to-end agent flow (Silver → Gold)

```
1. get_promotion_readiness          → see what's missing
2. bind_field_to_ontology (×N)      → bind each field to a concept URI
3. create_data_contract             → with SLA terms
4. create_delivery      → at least one endpoint
5. get_promotion_readiness          → confirm all green
6. promote_data_product             → target_tier: "gold"
```
