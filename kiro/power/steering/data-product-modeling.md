<!-- GENERATED FILE -- edit skills/<slug>/SKILL.md (or rule.mdc.src.md) and run `node scripts/generate-skills.mjs` -- do not edit directly -->

# Data product design

Design data products using output-first methodology — define the desired shape,
trace provenance backward, resolve gaps, specify transforms, and wire the pipeline
via **`data-workflows`** (bundle + deploy).

## Creation guardrail (CRITICAL — read first)

**Do not call `create_data_product` to provision new source or consumer data products.**

| Phase | This skill (`data-product-modeling`) | **`data-workflows`** |
| ----- | ------------------------------------ | -------------------- |
| Design | Output schema, provenance, transforms, trust plan | — |
| Create | **Never** — no standalone MCP create | `data-products/{id}.json` in `save_workflow_bundle` |
| Runtime | Post-deploy `update_data_product`, promotion, delivery | `deploy_workflow` → queues + `deployment_bindings` |

A correctly provisioned DP has `workflow_id`, `managed_by: "design-time"`,
`deployed_by: "workflow-deployment"`, and `deployment_bindings` after deploy —
not a standalone `create_data_product` response.

When the user says "**create** a data product", treat it as: **design here →
author bundle → deploy → verify with `get_data_product`.**

## When to use

- "Design a **data product**", "**model** a source", "**output-first**",
  "what should this **data product** look like", "**schema** design",
  "**lineage** mapping", "work **backward** from the desired output",
  "**source** data product", "**consumer** data product"

**Not this skill:** building or deploying — use **`data-workflows`**.

## Core Concepts

### Source vs Consumer

| Aspect       | Source (kind: source)              | Consumer (kind: consumer)            |
| ------------ | ---------------------------------- | ------------------------------------ |
| Nature       | Atomic, domain-owned               | Composed, projected                  |
| Origin       | External system ingestion          | Derived from source DPs              |
| Workflow     | connector-ingestion, webhook, sdk  | delivery workflow (`data-product-consumption`) |
| Trust level  | Draft → validated                  | Validated → delivery-ready                   |
| UI route     | /source/data-products              | /consumer/data-products              |

### Terminology Note

- **Delivery interface** — How a data product makes data available externally
  (webhook, API endpoint, export, DB sync, BI connect, event stream).
- **Delivery workflow** — A workflow with `workflow_type: 'consumption'` that
  pushes data to external systems. The enum value `'consumption'` is unchanged
  in API calls; "delivery workflow" is the user-facing name.
- **`create_delivery`** — MCP operation to create a delivery interface.
- **`list_deliveries`** — MCP operation to list delivery interfaces.

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
7. **Wire the pipeline:** Hand off to **`data-workflows`** — embed the
   designed schema in `data-products/{id}.json` within `save_workflow_bundle`
   (`dry_run: true` first), then `deploy_workflow`. **Do not** call
   `create_data_product`.
8. **Verify after deploy:** `get_data_product` — confirm `workflow_id` and
   `deployment_bindings` are present.

### Flow — Demand-Driven Consumer Modeling (output-first)

1. **Define delivery contract:** What does the destination system expect?
   (e.g., HubSpot contact properties, webhook payload shape)
2. **Trace provenance:** For each output field, identify which source DP provides it.
3. **Identify existing source DPs:** Check catalog for available sources.
4. **Gap analysis:** Which source DPs don't exist yet? Design + deploy them via
   **`data-workflows`** first (not `create_data_product`).
5. **Specify transforms:** JOIN keys, aggregations, derivations, filters.
6. **Design workflow:** Trigger (event/cron), transform chain, delivery config.
7. **Wire consumer DP:** **`data-workflows`** — `data-products/{id}.json` in
   consumption bundle + `save_workflow_bundle` + deploy. **Do not** call
   `create_data_product`.
8. **Configure delivery interface:** After deploy, `create_delivery`
   on the runtime data product.

### Flow — Review and publish as validated (draft → trusted)

1. `get_promotion_readiness` with `data_product_id` to see prerequisite checklist.
2. Remediate each unsatisfied prerequisite:
   - Schema version: `update_data_product` with schema `version: "1.0"`.
   - Field descriptions: `update_data_product` with all fields described.
   - PII classified: `tag_pii_fields` via `loxtep_define`.
   - Quality rules: `create_quality_rule` via `loxtep_define` (≥3 rules). Check with `get_quality_score` via `loxtep_observe`.
   - Glossary terms: `append_synonym` via `loxtep_meaning` for each field.
   - Primary entity: `update_data_product` with `entities[].is_primary + natural_key`.
3. `get_promotion_readiness` again to verify all prerequisites satisfied.
4. `promote_data_product` to advance trust tier (see **`promote-data-product`**).

### Flow — Review and publish for delivery (validated → delivery-ready)

1. `get_promotion_readiness` with `data_product_id` to see delivery-ready prerequisites.
2. Remediate each unsatisfied prerequisite:
   - Ontology bindings: `bind_field_to_ontology` for each unbound field via `loxtep_meaning`.
   - Data contract: `create_data_contract` with SLA terms via `loxtep_build`.
   - Delivery endpoint: `create_delivery` via `loxtep_build`.
   - Graph sync: auto-handled by prior promotion.
   - PROV-O lineage: document upstream lineage via `update_data_product` lineage field.
3. `get_promotion_readiness` again to confirm.
4. `promote_data_product` to mark delivery-ready (see **`promote-data-product`**).

### Flow — Schema Design

1. Start from desired output fields (demand-driven).
2. Use `snake_case` naming, business vocabulary (not system names).
3. Mark PII fields, set governance classification.
4. Version: additive = minor bump, breaking = major bump.
5. `update_data_product` with versioned schema in the `schema` field.

### Flow — Lineage Documentation

1. For consumer DPs: document upstream source DPs.
2. For each field: source_dp.field → [transform] → target_field.
3. Use `search_catalog` (`loxtep_query`) and `get_lineage_impact` (`loxtep_observe`) to inspect existing lineage.
4. Record provenance in the data product metadata via `update_data_product`.

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

| `operation` | Facade | Scope | Notes |
|-------------|--------|-------|-------|
| `list_data_products` | `loxtep_build` | organization | Filters: `kind`, `domain_id`, `status`, `medallion` |
| `get_data_product` | `loxtep_build` | organization | Full ODPS document by `data_product_id` |
| `get_lexicon` | `loxtep_build` | organization | Glossary/lexicon for a data product |
| `create_data_product` | `loxtep_build` | organization | **Agents: do not use** for new DPs. Author via workflow bundle + deploy. |
| `update_data_product` | `loxtep_build` | organization | Partial update; use for schema, metadata, status |
| `delete_data_product` | `loxtep_build` | project | Remove a data product by `project_id`, `data_product_id` |
| `create_delivery` | `loxtep_build` | organization | Delivery interface (webhook/API/export/DB sync/BI/event stream) for a data product. |
| `list_deliveries` | `loxtep_build` | organization | Active delivery interfaces. |
| `get_promotion_readiness` | `loxtep_build` | organization | Check prerequisites, progress, promotability for a data product. |
| `promote_data_product` | `loxtep_build` | organization | Execute tier transition (Silver/Gold). Validates prerequisites server-side. |
| `create_data_contract` | `loxtep_build` | organization | Create contract with SLA/quality terms. Required for Gold. |
| `list_data_contracts` | `loxtep_build` | organization | List contracts, optionally filtered by `data_product_id`. |

## Decision tree

```
"I need a data product that looks like X"
  │
  ├── Design output schema + provenance (this skill — no MCP create)
  │
  ├── Single source system provides all fields?
  │   └── YES → Source DP in ingestion bundle (kind: source) → **`data-workflows`**
  │
  ├── Need to combine multiple sources?
  │   └── YES → Consumer DP in consumption bundle → deploy source DPs first via **`data-workflows`**
  │
  └── Primary source + supplementary enrichment?
      └── Source DP with enrichment transform → **`data-workflows`** (enrichment workflow)
```

## Pitfalls

- **Direct `create_data_product`** — Bypasses workflow graph, queues, and
  deployment bindings. Design in this skill; provision via **`data-workflows`**
  bundle + deploy.
- **Supply-driven thinking** — Don't start with "what data do we have?" Start
  with "what data do we need?" and work backward.
- **God data product** — One DP with 200+ fields serving all use cases. Decompose.
- **Trust inflation** — Publishing as delivery-ready without contracts/SLAs. Enforce promotion checklist.
- **Missing lineage** — Consumer DP with no documented upstream. Always trace provenance.
- **Schema drift** — Source system changes without DP update. Add validation in workflow.
- **Orphan consumer** — Consumer DP whose upstream source was deprecated. Monitor lineage.

## Coupling with other Agent-Scope Skills

- **loxtep-ontology:** Vocabulary terms, concept definitions → bind to DP glossary
- **org-semantics-quality:** Quality rules, governance → bind to DP quality config
- **loxtep-procedures:** Process graphs → map to workflow pipelines
- **loxtep-process-intel:** Runtime entity context → validate DP data at runtime
- **discover-govern-lineage:** Catalog discovery, governance policies
- **data-workflows:** Bundle authoring, deploy, runtime verification (mandatory for creation)

<!-- BEGIN loxtep skill-scope (skill-package-v1) -->

## Agent-Scope Skill scope (`.loxtep/skills/data-product-modeling.yaml`)

Resource scope and operation permissions for this Agent-Scope Skill, conformant
with the [`skill-package-v1`](https://loxtep.io/schemas/skill-package-v1.json)
schema. Any resource type or operation not listed is **denied (fail-closed)**.
Identifier lists are empty placeholders — fill them with the specific resources
in your workspace. This declaration does not change the hosted MCP config
(`mcp.loxtep.io`).

```yaml
# .loxtep/skills/data-product-modeling.yaml
# Conforms to https://loxtep.io/schemas/skill-package-v1.json
# Scoped to ONLY the identifiers listed; least-privilege per operation. Fail-closed.
name: data-product-modeling
description: Model data products and read their owning domains.
scope:
  data_products: []
  connectors: []
  workflows: []
  domains: []
  queues: []
permissions:
  data_products: [read, create, write, delete]
  domains: [read]
```

<!-- END loxtep skill-scope (skill-package-v1) -->

## Implementation notes

**Medallion tiers (internal quality model):**

| Tier | Meaning |
| ---- | ------- |
| Bronze | Raw ingested, minimal schema, domain-internal |
| Silver | Curated, validated, schema versioned, cross-domain OK |
| Gold | Contracted, SLA-bound, delivery-ready, external-facing OK |

Promotion MCP calls use `target_tier: "silver"` / `"gold"` — map to validated /
delivery-ready in user language. See **`promote-data-product`** for the full checklist.

## Optional attribution

`_metadata: { "skill_name": "data-product-modeling" }`

## Auth

`loxtep-auth` / login.

## References

- [User story catalog](../../../docs/skills-user-stories.md)
- Comprehensive methodology: `.agents/skills/data-product-modeling/SKILL.md` (main repo)
