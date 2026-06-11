# Ontology, Vocabulary & Namespace Mappings (Customer MCP)

**Story S13:** Manage **ontology concepts**, **vocabulary/thesaurus terms**, and **namespace mappings** — the schema layer that underpins process graphs, entity context, and semantic search.

## When to use

- "**Thesaurus** terms", "**vocabulary** sync", "**ontology** concept/relationship", "**namespace** mapping", "**canonical key**", "resolve **term**"

## Prerequisites

- MCP auth. Operations are **organization**-scoped.

## Happy-path flows

### Flow — Vocabulary term CRUD

1. `create_thesaurus_term` with `canonical_key`, `scheme` (field | entity | custom), `aliases`, `broader`, `narrower`, `related`, optional `domain`.
2. `get_thesaurus_term` by `term_id` — returns full term with aliases and hierarchy.
3. `update_thesaurus_term` with `term_id` + partial fields.
4. `delete_thesaurus_term` by `term_id` — soft-deletes (tombstone). Warns if referenced by ontology relationships or procedure steps.
5. `list_thesaurus_terms` — filter by `scheme`, `domain`, `canonical_key_prefix`.
6. `resolve_canonical_key` — resolves aliases to canonical terms.

### Flow — Bulk vocabulary sync

1. `sync_vocabulary` with `domain`, `terms` array, `mode` (full_sync | additive_only).
2. Use `dry_run: true` to preview the diff before applying.
3. Returns structured report: created, updated, tombstoned (full_sync only), unchanged, conflicts.
4. In `full_sync` mode, terms in Loxtep but not in submitted set are tombstoned.
5. Conflicts (same canonical_key, different scheme) are skipped and reported.

### Flow — Ontology concept management

1. `create_ontology_concept` with required `name`, `namespace`, `node_type` (entity | microservice | taxonomy | pattern | custom); optional `description`, `uri`, `parent_concepts`.
2. `update_ontology_concept` for partial field updates.
3. `delete_ontology_concept` — tombstones the concept, warns about dependent relationships.
4. `get_ontology_relationships` — filter by `source_entity_type`, `target_entity_type`, `relation_type`, `namespace`.
5. `create_ontology_relationship` with `source_entity_type`, `target_entity_type`, `relation_type`, `relation_uri`, `join_field`, `description`.

### Flow — Namespace mapping registration

1. `register_namespace_mapping` with `prefix`, `uri`, `mappings` (array of `{external_term, internal_concept_id}`).
2. W3C PKO (`https://w3id.org/pko`) is pre-registered — no user action needed.
3. `list_namespace_mappings` — returns all registered prefixes, URIs, and mapping counts.
4. `get_namespace_mapping` — returns full mapping table for a specific prefix.
5. Re-registering an existing prefix merges new mappings (additive) unless `overwrite: true`.

### Flow — Prepare for process graph import

1. Register any custom namespace mappings via `register_namespace_mapping`.
2. Sync vocabulary terms via `sync_vocabulary` (ensures terms exist before import).
3. Create ontology concepts for entity types referenced in the graph.
4. Then use `loxtep_procedures` → `import_process_graph` — namespace resolution uses registered mappings automatically.

## MCP mapping

| `operation` | Scope |
|-------------|-------|
| `list_thesaurus_terms`, `get_thesaurus_term`, `create_thesaurus_term`, `update_thesaurus_term`, `delete_thesaurus_term`, `sync_vocabulary`, `resolve_canonical_key`, `get_ontology_relationships`, `create_ontology_concept`, `create_ontology_relationship`, `update_ontology_concept`, `delete_ontology_concept`, `register_namespace_mapping`, `list_namespace_mappings`, `get_namespace_mapping` | organization |

## Pitfalls

- **Process intelligence** (entity context, decision traces) is **`loxtep_process_intel`** — different concern (runtime state vs schema definition).
- **Procedures** (process graphs) are **`loxtep_procedures`** — ontology defines the schema, procedures define the processes.
- **Conflict on create** — `create_thesaurus_term` returns conflict if `canonical_key` already exists for the org. Use `update_thesaurus_term` instead.
- **URI uniqueness** — `create_ontology_concept` returns conflict if `uri` matches an existing concept.
- **Relationship validation** — `create_ontology_relationship` fails if source or target entity types don't exist as ontology concepts. Create concepts first.
- **Tombstone pattern** — Deletes are soft (tombstone). Terms/concepts are excluded from queries but preserved for audit.

## Optional attribution

`_metadata: { "skill_name": "loxtep-ontology" }`

## Auth

`loxtep-auth` / login.

## References

- See the user story catalog in the Loxtep plugins-skills repository
