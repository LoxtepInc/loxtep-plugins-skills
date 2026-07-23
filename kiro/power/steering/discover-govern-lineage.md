<!-- GENERATED FILE -- edit skills/<slug>/SKILL.md (or rule.mdc.src.md) and run `node scripts/generate-skills.mjs` -- do not edit directly -->

# Discover, lineage, and governance

Find and trust data — **search**, **catalog entries**, **lineage**, **evidence**, **governance**, **domains**, **tags**.

## Terminology: Projection vs Consumer Data Product

When exploring lineage, keep this distinction clear:

- **Projection logic** — The derivation (field mappings, aggregations, joins, filters)
  that transforms source data products into a consumer data product's shape. This is
  the "how" — the process/specification that defines the transformation.
- **Consumer data product** — The resulting entity (`kind: 'consumer'`) that holds the
  derived data. This is the "what" — the catalog-visible product with its own schema,
  governance, and delivery interfaces.
- **Delivery interface** — How a data product (source or consumer) makes its data
  available externally (webhook, API, export, database sync, BI connect, event stream).

In lineage views:
- Nodes represent **data products** (source or consumer), never projections directly.
- Edges between source → consumer represent the projection relationship.
- The projection spec name appears as edge metadata or on the consumer DP detail page.

## When to use

- "Search the **catalog**", "**lineage** for this table", "**governance** flags"
- `search_catalog`, `get_catalog_entry`, `get_evidence`, `get_lineage_impact`, `get_governance_flags`, `list_domains`, `list_tags`

## Prerequisites

- MCP auth. **Catalog-scoped** operations do not use `project_id`; use filters/ids as the API expects per operation.

## Happy-path flows

### Flow — Search then drill in

1. `loxtep_query` → `search_catalog` (query / filters per API).
2. `get_catalog_entry` for a chosen asset id.
3. Optional: `get_lineage_impact`, `get_evidence`, `get_governance_flags`.

### Flow — Domains and tags

1. `list_domains` — browse domain taxonomy.
2. `list_tags` — browse tags for filtering or UI.

## MCP mapping

| User intent | Tool | `operation` | Scope |
|-------------|------|-------------|-------|
| Search | `loxtep_query` | `search_catalog` | **catalog** |
| Entry detail | `loxtep_query` | `get_catalog_entry` | **catalog** |
| Evidence | `loxtep_observe` | `get_evidence` | **catalog** |
| Lineage | `loxtep_observe` | `get_lineage_impact` | **catalog** |
| Governance | `loxtep_observe` | `get_governance_flags` | **catalog** |
| Domains | `loxtep_query` | `list_domains` | **catalog** |
| Tags | `loxtep_query` | `list_tags` | **catalog** |

## Pitfalls

- Do not confuse **catalog** scope with **project**-scoped workflow tools — different facades.
- **Empty or sparse results** — Discovery/search tools may need platform-injected search/evidence services in the AI runtime; behavior can differ between local tests and production.

<!-- BEGIN loxtep skill-scope (skill-package-v1) -->

## Agent-Scope Skill scope (`.loxtep/skills/discover-govern-lineage.yaml`)

Resource scope and operation permissions for this Agent-Scope Skill, conformant
with the [`skill-package-v1`](https://loxtep.io/schemas/skill-package-v1.json)
schema. Any resource type or operation not listed is **denied (fail-closed)**.
Identifier lists are empty placeholders — fill them with the specific resources
in your workspace. This declaration does not change the hosted MCP config
(`mcp.loxtep.io`).

```yaml
# .loxtep/skills/discover-govern-lineage.yaml
# Conforms to https://loxtep.io/schemas/skill-package-v1.json
# Scoped to ONLY the identifiers listed; least-privilege per operation. Fail-closed.
name: discover-govern-lineage
description: Read-only catalog discovery, lineage, and governance over data products and domains.
scope:
  data_products: []
  connectors: []
  workflows: []
  domains: []
  queues: []
permissions:
  data_products: [read]
  domains: [read]
```

<!-- END loxtep skill-scope (skill-package-v1) -->

## Optional attribution

`_metadata: { "skill_name": "discover-govern-lineage" }`

## Auth

Reconnect the Loxtep MCP server to re-trigger OAuth — see **`loxtep-auth`**.

## References

- [User story catalog](../../../docs/skills-user-stories.md)
