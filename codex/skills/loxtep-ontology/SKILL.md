---
name: loxtep-ontology
description:
  Use when the user wants to manage ontology concepts, vocabulary/thesaurus terms,
  namespace mappings, or sync vocabularies. Customer MCP loxtep_ontology. User story S13.
  Not the same as loxtep_process_intel (runtime intelligence) or loxtep_procedures
  (process graph CRUD). See docs/skills-user-stories.md.
---

# Ontology, vocabulary, and namespace management (Customer MCP)

**Story S13:** Manage **ontology concepts**, **vocabulary terms** (thesaurus),
and **namespace mappings** for the semantic layer — the schema/vocabulary
management surface.

## When to use

- "**Thesaurus** terms", "**vocabulary** sync", "**ontology** concept",
  "**namespace** mapping", "**canonical key**", "create/update/delete
  **vocabulary** term", "register **namespace**"

## Prerequisites

- MCP auth. Operations are **organization**-scoped.

## Happy-path flows

### Flow — Vocabulary sync (bulk)

1. `list_thesaurus_terms` with `domain` filter to see current state.
2. `sync_vocabulary` with `mode: "full_sync"` or `"additive_only"` and
   `dry_run: true` to preview changes.
3. `sync_vocabulary` with `dry_run: false` to apply.

### Flow — Single term CRUD

1. `create_thesaurus_term` with `canonical_key`, `scheme`, `aliases`.
2. `get_thesaurus_term` by `term_id` to verify.
3. `update_thesaurus_term` for partial field changes.
4. `delete_thesaurus_term` to soft-delete (tombstone).

### Flow — Ontology concept creation

1. `create_ontology_concept` with `name`, `namespace`, `node_type`.
2. `create_ontology_relationship` linking source → target entity types.
3. `get_ontology_relationships` with filters to verify graph edges.
4. `update_ontology_concept` / `delete_ontology_concept` as needed.

### Flow — Namespace registration

1. `list_namespace_mappings` to see existing registrations.
2. `register_namespace_mapping` with `prefix`, `uri`, and `mappings` array.
3. `get_namespace_mapping` by prefix to verify.
4. Use `import_process_graph` (in `loxtep_procedures`) — registered namespaces
   auto-resolve during import.

### Flow — Resolve canonical key

1. `resolve_canonical_key` with an alias or variant spelling.
2. Returns the canonical term with scheme and precedence.

## MCP mapping

| `operation` | Scope | Notes |
|-------------|-------|-------|
| `list_thesaurus_terms` | organization | Filters: `scheme`, `domain`, `canonical_key_prefix` |
| `get_thesaurus_term` | organization | Single term by `term_id` |
| `create_thesaurus_term` | organization | Conflict error if `canonical_key` exists |
| `update_thesaurus_term` | organization | Partial update by `term_id` |
| `delete_thesaurus_term` | organization | Soft-delete; warns if referenced |
| `sync_vocabulary` | organization | Bulk sync with `dry_run` support |
| `resolve_canonical_key` | organization | Alias → canonical resolution |
| `get_ontology_relationships` | organization | Filters: `source_entity_type`, `target_entity_type`, `relation_type`, `namespace` |
| `create_ontology_concept` | organization | URI uniqueness enforced |
| `create_ontology_relationship` | organization | Validates both entity types exist |
| `update_ontology_concept` | organization | Partial field updates |
| `delete_ontology_concept` | organization | Soft-delete; warns about dependent relationships |
| `register_namespace_mapping` | organization | Additive merge by default; `overwrite: true` replaces |
| `list_namespace_mappings` | organization | Includes system-scoped (W3C PKO) + org-scoped |
| `get_namespace_mapping` | organization | Full mapping table for a prefix |

## Pitfalls

- **Runtime intelligence** (entity context, decision traces) is
  **`loxtep_process_intel`** — different facade. This skill is for
  **schema/vocabulary management**, not runtime queries.
- **Process graph CRUD** (procedures, steps, import/export) is
  **`loxtep_procedures`** — different facade. Ontology concepts describe the
  *types* in the graph; procedures are the *instances*.
- **Catalog search** is **`loxtep_catalog`** — use that for discovery across
  all artifact types. This skill manages the underlying ontology that catalog
  entries reference.
- **`sync_vocabulary` with `full_sync`** will tombstone terms not in the
  submitted set — use `additive_only` if you only want to add/update.
- **Namespace mappings** are used by `import_process_graph` (in
  `loxtep_procedures`) to auto-resolve external ontology terms. Register
  mappings *before* importing graphs that use custom namespaces.
- **W3C PKO** (`https://w3id.org/pko`) is pre-registered as a system-scoped
  mapping — no need to register it manually.
- **`delete_thesaurus_term`** and **`delete_ontology_concept`** use soft-delete
  (tombstone pattern). They warn about dependents but do not cascade.

## Optional attribution

`_metadata: { "skill_name": "loxtep-ontology" }`

## Auth

`loxtep-auth` / login.

## References

- [User story catalog](../../../docs/skills-user-stories.md)
