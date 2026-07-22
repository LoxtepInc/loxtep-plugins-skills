<!-- GENERATED FILE -- edit skills/<slug>/SKILL.md (or rule.mdc.src.md) and run `node scripts/generate-skills.mjs` -- do not edit directly -->

# Procedures & Process Graph (Customer MCP)

**Story S9:** Manage **business procedures**, their **step graphs**, and
**inter-procedure dependencies** in the process graph. Import/export
PKO-compliant JSON-LD graphs. Distinct from data-mesh **workflows** in
`loxtep_workflows`.

## When to use

- "**List procedures**", "**get procedure**", "create/update/delete
  **procedure**"
- "**Import** process graph", "**export** process graph", "**JSON-LD**"
- "**Procedure dependencies**", "upstream/downstream procedures"
- "**Decisions**", "**triggers**", "**steps**" within a procedure

## Prerequisites

- MCP auth. Operations are **organization**-scoped.

## Happy-path flows

### Flow — Browse and inspect procedures

1. `list_procedures` (optional filters: `status`, `domain_id`, `name`).
2. `get_procedure` for full step graph including decisions, triggers, and
   dependencies.

### Flow — Create procedure with full step graph

1. `create_procedure` with required `organization_id` and `name` (optional
   `description`, `status`, `domain_id`, `steps`, `decisions`, `triggers`,
   `dependencies`, and `metadata`).
2. `get_procedure` to verify the created structure.
3. `update_procedure` for partial updates (submit complete arrays per field to
   replace).

### Flow — Import JSON-LD graph

1. `import_process_graph` with inline `graph` (≤ 4 MB) or `s3_reference`
   (`{s3_bucket, s3_key}`) for larger payloads.
2. Response includes `procedure_id`, `action` (created | updated), counts, and
   any `unmapped_terms`.
3. Optionally pass `procedure_id` for idempotent re-imports (upsert).
4. Pass `skip_catalog: true` to suppress automatic catalog entry creation.

### Flow — Export for round-trip

1. `export_process_graph` with `procedure_id` and `format`:
   - `jsonld` — valid PKO-compliant JSON-LD, round-trippable through
     `import_process_graph`.
   - `yaml` — Loxtep-standard YAML (procedure, steps, decisions, triggers,
     dependencies, metadata).
   - `summary` — concise metadata: name, step count, decision count, trigger
     types, dependents, last modified.
2. Pass `preserve_namespaces: true` to include original import URIs in the
   export.

### Flow — Query dependency chain

1. `get_procedure_dependencies` with `procedure_id`, `direction`
   (upstream | downstream | both), optional `depth` (default 3, max 10).
2. Optionally filter by `relationship_types` (feeds_into, depends_on, triggers,
   supersedes).
3. Response includes edges with procedure metadata at each hop and a
   `cycles_detected` flag.

### Flow — Soft-delete a procedure

1. `delete_procedure` — soft-deletes (tombstones) the procedure and all child
   nodes (steps, decisions, triggers).
2. Response includes warnings listing downstream dependents.
3. Tombstoned procedures are excluded from `list_procedures` results.

## MCP mapping

| `operation` | Scope | Notes |
|-------------|-------|-------|
| `list_procedures` | organization | Filters: `status`, `name`, `domain_id`, `has_step_with_agent`, `has_trigger_type`, `has_dependents`, `depends_on`, `created_after`, `created_before` |
| `get_procedure` | organization | Full step graph with decisions, triggers, dependencies, metadata |
| `create_procedure` | organization | Required: `organization_id`, `name`; optional: `description`, `status`, `domain_id`, `steps`, `decisions`, `triggers`, `dependencies`, `metadata` |
| `update_procedure` | organization | Partial updates; arrays use full-replacement semantics |
| `delete_procedure` | organization | Soft-delete (tombstone); warns about downstream dependents |
| `import_process_graph` | organization | Inline JSON-LD (≤ 4 MB) or S3 reference; idempotent upsert |
| `export_process_graph` | organization | Formats: `jsonld`, `yaml`, `summary`; `preserve_namespaces` option |
| `get_procedure_dependencies` | organization | Direction: upstream/downstream/both; depth 1–10; cycle detection |

## Pitfalls

- **Data mesh workflows** (`create_workflow`, `patch_workflow_graph`) live under
  **`loxtep_workflows`** / **`data-workflows`** Agent-Scope Skill — different product
  object.
- **Platform PKO procedures** — stable `@id` values like `procedure#connect-external-system`.
  Use `get_procedure` to read step `metadata.skill_ref` / `metadata.api_ref` / HITL gates;
  use **`loxtep-journey-orchestrator`** to walk P0–P7.
- **Ontology/vocabulary management** (thesaurus terms, ontology concepts,
  namespace mappings) is **`loxtep_ontology`** — different facade. Procedures
  are *instances* in the graph; ontology concepts describe the *types*.
- **`delete_procedure` uses soft-delete** (tombstone pattern). The procedure and
  all children are marked with `tombstoned_at` and excluded from queries. A
  background TTL process purges tombstoned records after the retention period.
  There is no hard-delete via MCP.
- **S3 upload path for large graphs**: For JSON-LD payloads > 4 MB (up to
  50 MB), upload to S3 first and pass `s3_reference: {s3_bucket, s3_key}` to
  `import_process_graph`. The inline `graph` field is limited to 4 MB (below
  API Gateway's 6 MB limit with overhead).
- **`update_procedure` uses full-replacement semantics** per array field —
  submit the complete desired `steps`/`decisions`/`triggers` array to replace
  all existing entries. Top-level scalars (name, description, status) are
  individually updatable.
- **Renamed operation**: `get_procedure_workflow` is now `get_procedure`. The
  old name is no longer valid.
- **Dependency forward references**: `dependencies` can reference a
  `target_procedure_id` that doesn't exist yet — it will be marked `unresolved`
  until the target is imported/created.
- **Namespace resolution on import**: `import_process_graph` auto-resolves W3C
  PKO terms and any registered namespace mappings (see `loxtep-ontology` Agent-Scope Skill).
  Unregistered namespace terms are flagged as `unmapped_terms` in the response
  without failing the import.

<!-- BEGIN loxtep skill-scope (skill-package-v1) -->

## Agent-Scope Skill scope (`.loxtep/skills/loxtep-procedures.yaml`)

Resource scope and operation permissions for this Agent-Scope Skill, conformant
with the [`skill-package-v1`](https://loxtep.io/schemas/skill-package-v1.json)
schema. Any resource type or operation not listed is **denied (fail-closed)**.
Identifier lists are empty placeholders — fill them with the specific resources
in your workspace. This declaration does not change the hosted MCP config
(`mcp.loxtep.io`).

```yaml
# .loxtep/skills/loxtep-procedures.yaml
# Conforms to https://loxtep.io/schemas/skill-package-v1.json
# Fail-closed: this skill's facades are RBAC-governed and carry no data-mesh resource scope.
name: loxtep-procedures
description: Process-graph procedures (distinct from data-mesh workflows) — RBAC-governed; no data-mesh resource scope.
scope:
  data_products: []
  connectors: []
  workflows: []
  domains: []
  queues: []
permissions: {}
```

<!-- END loxtep skill-scope (skill-package-v1) -->

## Optional attribution

`_metadata: { "skill_name": "loxtep-procedures" }`

## Auth

`loxtep-auth` / login.

## References

- [User story catalog](../../../docs/skills-user-stories.md)
