---
name: discover-govern-lineage
description:
  Use when the user wants to discover data in the catalog, search assets, lineage impact,
  evidence, governance flags, run discovery, list domains or tags, or understand "what
  connects to what" in Discover. Customer MCP tool loxtep_catalog. User story S5.
  See docs/skills-user-stories.md.
---

# Discover, lineage, and governance (Customer MCP)

**Story S5:** Find and trust data — **search**, **catalog entries**, **lineage**, **evidence**, **governance**, **discovery**, **domains**, **tags**.

## When to use

- “Search the **catalog**”, “**lineage** for this table”, “**governance** flags”, “**run discovery**”
- `search_catalog`, `get_catalog_entry`, `get_evidence`, `get_lineage_impact`, `get_governance_flags`, `run_discovery`, `list_domains`, `list_tags`

## Prerequisites

- MCP auth. **Catalog-scoped** operations do not use `project_id`; use filters/ids as the API expects per operation.

## Happy-path flows

### Flow — Search then drill in

1. `loxtep_catalog` → `search_catalog` (query / filters per API).
2. `get_catalog_entry` for a chosen asset id.
3. Optional: `get_lineage_impact`, `get_evidence`, `get_governance_flags`.

### Flow — Run discovery

1. `run_discovery` with parameters your deployment supports (async possible — confirm response shape).
2. Follow with `search_catalog` or `get_catalog_entry` to review new/updated entries.

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
| Discovery job | `loxtep_catalog` | `run_discovery` | **catalog** |
| Domains | `loxtep_catalog` | `list_domains` | **catalog** |
| Tags | `loxtep_catalog` | `list_tags` | **catalog** |

## Pitfalls

- Do not confuse **catalog** scope with **project**-scoped workflow tools — different facades.
- Heavy discovery may be asynchronous; poll or use platform UI if MCP returns a job id.
- **Empty or sparse results** — Discovery/search may depend on injected services in the AI runtime (LOX-1226); dev vs prod can differ.

## Optional attribution

`_metadata: { "skill_name": "discover-govern-lineage" }`

## Auth

`loxtep-auth` / `npx @loxtep/customer-mcp-server login`.

## References

- [User story catalog](../../../docs/skills-user-stories.md)
