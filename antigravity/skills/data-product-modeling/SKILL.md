---
name: data-product-modeling
description:
  Use when the user wants to model, create, or design data products using
  demand-driven (output-first) methodology. Covers source data product design
  (atomic, domain-owned), consumer data product design (composed/projected),
  medallion promotion (Bronze→Silver→Gold), schema design, lineage mapping,
  and reverse modeling (begin with the end in mind). Complements loxtep-ontology
  (vocabulary/concepts) and org-semantics-quality (governance). User story S20.
---

# Data Product Modeling (Demand-Driven Design)

**Story S20:** Design and create data products using output-first methodology —
define the desired shape, trace provenance backward, resolve gaps, specify
transforms, and wire the pipeline.

## When to use

- "**Model** a data product", "**design** a source/consumer DP",
  "**create** data product", "**reverse model**", "begin with the **end in mind**",
  "what does the **output** look like", "**medallion** promotion",
  "**Bronze→Silver→Gold**", "**schema** design for DP", "**lineage** mapping",
  "work **backward** from the desired output", "**source** data product",
  "**consumer** data product", "**demand-driven**"

## Core Concepts

### Source vs Consumer

| Aspect       | Source (kind: source)              | Consumer (kind: consumer)            |
| ------------ | ---------------------------------- | ------------------------------------ |
| Nature       | Atomic, domain-owned               | Composed, projected                  |
| Origin       | External system ingestion          | Derived from source DPs              |
| Workflow     | connector-ingestion, webhook, sdk  | data-product-consumption             |
| Medallion    | Typically Bronze → Silver          | Typically Silver → Gold              |
| UI route     | /source/data-products              | /consumer/data-products              |

### Medallion Tiers

- **Bronze:** Raw ingested, minimal schema, domain-internal
- **Silver:** Curated, validated, schema versioned, cross-domain OK
- **Gold:** Contracted, SLA-bound, consumption-ready, external-facing OK

## Happy-path flows

### Flow — Demand-Driven Source Modeling (output-first)

1. **Define desired output:** Write the finished schema as if it already exists.
   Include field names, types, required flags, descriptions, PII markers.
2. **Trace provenance:** For each field, identify the source system and field.
3. **Identify source systems:** Group fields by origin system.
4. **Gap analysis:** Which fields aren't available? What needs to be created?
5. **Specify transforms:** For each field: source_format → desired_format.
6. **Architecture decision:** Single source DP with multi-source workflow, or
   multiple source DPs + consumer composition?
7. **Create the data product:** Use `create_data_product` with ODPS document.

### Flow — Demand-Driven Consumer Modeling (output-first)

1. **Define delivery contract:** What does the destination system expect?
   (e.g., HubSpot contact properties, webhook payload shape)
2. **Trace provenance:** For each output field, identify which source DP provides it.
3. **Identify existing source DPs:** Check catalog for available sources.
4. **Gap analysis:** Which source DPs don't exist yet? Create them first.
5. **Specify transforms:** JOIN keys, aggregations, derivations, filters.
6. **Design workflow:** Trigger (event/cron), transform chain, delivery config.
7. **Create consumer DP:** Use `create_data_product` with kind=consumer.
8. **Configure consumption:** Set up webhook/API/SQL delivery endpoint.

### Flow — Medallion Promotion (Bronze → Silver)

1. `get_data_product` to check current state.
2. Verify: schema version ≥ 1.0, all fields described, PII marked,
   quality rules active (≥3), score > 80%, glossary terms defined.
3. `update_data_product` with `medallion: "silver"`.

### Flow — Medallion Promotion (Silver → Gold)

1. Verify all Silver requirements plus: active contract, SLA defined,
   SLA met 30 days, consumption endpoints configured, governance sign-off.
2. `update_data_product` with `medallion: "gold"`.

### Flow — Schema Design

1. Start from desired output fields (demand-driven).
2. Use `snake_case` naming, business vocabulary (not system names).
3. Mark PII fields, set governance classification.
4. Version: additive = minor bump, breaking = major bump.
5. `update_data_product_schema` with versioned field definitions.

### Flow — Lineage Documentation

1. For consumer DPs: document upstream source DPs.
2. For each field: source_dp.field → [transform] → target_field.
3. `create_lineage` with nodes and edges.
4. `get_lineage_impact_analysis` before any schema changes.

## Provenance Card Template

For each field in the desired output:

```
Target Field:     [name]
Source System:    [system]
Source DP:        [existing DP or "TO BE CREATED"]
Source Field:     [field path]
Transform:        [direct | derived | aggregated | filtered | joined]
Transform Logic:  [expression]
```

## MCP mapping

| `operation` | Scope | Notes |
|-------------|-------|-------|
| `list_data_products` | organization | Filters: `kind`, `domain_id`, `status`, `medallion` |
| `get_data_product` | organization | Full ODPS document by `data_product_id` |
| `create_data_product` | organization | ODPS payload; set `kind`, `domain_id`, `owner` |
| `update_data_product` | organization | Partial update; use for medallion promotion |
| `update_data_product_schema` | organization | Schema versioning |
| `create_lineage` | organization | Nodes + edges for data flow |
| `get_lineage` | organization | Lineage graph for a DP |
| `get_lineage_impact_analysis` | organization | Downstream impact before changes |
| `create_consumption` | organization | Webhook/API endpoint for consumer DP |
| `list_consumptions` | organization | Active delivery endpoints |

## Decision tree

```
"I need a data product that looks like X"
  │
  ├── Single source system provides all fields?
  │   └── YES → Source DP (kind: source), connector-ingestion workflow
  │
  ├── Need to combine multiple sources?
  │   └── YES → Consumer DP (kind: consumer), data-product-consumption workflow
  │             Create source DPs for each system first
  │
  └── Primary source + supplementary enrichment?
      └── Source DP with enrichment transform in workflow
```

## Pitfalls

- **Supply-driven thinking** — Don't start with "what data do we have?" Start
  with "what data do we need?" and work backward.
- **God data product** — One DP with 200+ fields serving all use cases. Decompose.
- **Medallion inflation** — Gold without contracts/SLAs. Enforce promotion checklist.
- **Missing lineage** — Consumer DP with no documented upstream. Always trace provenance.
- **Schema drift** — Source system changes without DP update. Add validation in workflow.
- **Orphan consumer** — Consumer DP whose upstream source was deprecated. Monitor lineage.

## Coupling with other skills

- **loxtep-ontology:** Vocabulary terms, concept definitions → bind to DP glossary
- **org-semantics-quality:** Quality rules, governance → bind to DP quality config
- **loxtep-procedures:** Process graphs → map to workflow pipelines
- **loxtep-process-intel:** Runtime entity context → validate DP data at runtime
- **discover-govern-lineage:** Catalog discovery, governance policies

## Optional attribution

`_metadata: { "skill_name": "data-product-modeling" }`

## Auth

`loxtep-auth` / login.

## References

- [User story catalog](../../../docs/skills-user-stories.md)
- Comprehensive methodology: `.agents/skills/data-product-modeling/SKILL.md` (main repo)
