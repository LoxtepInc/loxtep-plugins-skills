---
name: discover-govern-lineage
description:
  Use when the user wants to discover data in the catalog, search assets, lineage impact,
  evidence, governance flags, list domains or tags, or understand "what
  connects to what" in Discover. Distinguishes projection logic (the derivation that
  transforms source data) from consumer data products (the resulting entity that holds
  derived data). Customer MCP tool loxtep_catalog. User story S5.
  See docs/skills-user-stories.md.
---

# Discover, lineage, and governance (Customer MCP)

**Story S5:** Find and trust data — **search**, **catalog entries**, **lineage**, **evidence**, **governance**, **domains**, **tags**.

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

1. `loxtep_catalog` → `search_catalog` (query / filters per API).
2. `get_catalog_entry` for a chosen asset id.
3. Optional: `get_lineage_impact`, `get_evidence`, `get_governance_flags`.

### Flow — Domains and tags

1. `list_domains` — browse domain taxonomy.
2. `list_tags` — browse tags for filtering or UI.

## MCP mapping

| User intent | Tool | `operation` | Scope |
|-------------|------|-------------|-------|
| Search | `loxtep_catalog` | `search_catalog` | **catalog** |
| Entry detail | `loxtep_catalog` | `get_catalog_entry` | **catalog** |
| Evidence | `loxtep_catalog` | `get_evidence` | **catalog** |
| Lineage | `loxtep_catalog` | `get_lineage_impact` | **catalog** |
| Governance | `loxtep_catalog` | `get_governance_flags` | **catalog** |
| Domains | `loxtep_catalog` | `list_domains` | **catalog** |
| Tags | `loxtep_catalog` | `list_tags` | **catalog** |

## Pitfalls

- Do not confuse **catalog** scope with **project**-scoped workflow tools — different facades.
- **Empty or sparse results** — Discovery/search tools may need platform-injected search/evidence services in the AI runtime; behavior can differ between local tests and production.

<!-- SCOPE_BLOCK -->

## Optional attribution

`_metadata: { "skill_name": "discover-govern-lineage" }`

## Auth

Reconnect the Loxtep MCP server to re-trigger OAuth — see **`loxtep-auth`**.

## References

- [User story catalog](../../../docs/skills-user-stories.md)
