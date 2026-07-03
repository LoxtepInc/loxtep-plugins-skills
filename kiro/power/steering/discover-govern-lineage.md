# Discover, lineage, and governance (Customer MCP)

**Story S5:** Find and trust data — **search**, **catalog entries**, **lineage**, **evidence**, **governance**, **domains**, **tags**.

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
- **Empty or sparse results** — Discovery/search may depend on injected services in the AI runtime (LOX-1226); dev vs prod can differ.

## Optional attribution

`_metadata: { "skill_name": "discover-govern-lineage" }`

## Auth

Reconnect the Loxtep MCP server to re-trigger OAuth — see **`loxtep-auth`**.

## References

- See the user story catalog in the Loxtep plugins-skills repository
