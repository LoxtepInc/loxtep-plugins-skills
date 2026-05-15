# Procedures (Customer MCP)

**Story S9:** Manage **business procedures** and their **process graphs** — CRUD, import/export JSON-LD, and inter-procedure dependencies (distinct from data-mesh **workflows** in `loxtep_workflows`).

## When to use

- "**List procedures**", "**get procedure**", "create/update/delete **procedure**", "**import** process graph", "**export** process graph", "procedure **dependencies**"

## Prerequisites

- MCP auth. Operations are **organization**-scoped.

## Happy-path flows

### Flow — Browse and inspect procedures

1. `list_procedures` — filter by `status`, `name`, `has_step_with_agent`, `has_trigger_type`, `domain_id`.
2. `get_procedure` for one procedure id — returns full step graph with decisions, triggers, dependencies, metadata.

### Flow — Create a procedure with full step graph

1. `create_procedure` with `name`, `status`, `steps` (ordered array), `decisions`, `triggers`, `dependencies`, `metadata`.
2. Each step supports `agents`, `inputs`, `outputs`, `next_steps` (branching), `decision_ref`, `glossary_terms`.
3. Decisions define `rule`, `inputs`, `outcomes` (with `next_step_ref` for branching).
4. Triggers define `type` (schedule | event | manual | upstream_procedure) + configuration.
5. Dependencies link to other procedures via `relationship_type` (feeds_into | depends_on | triggers | supersedes).

### Flow — Import a JSON-LD process graph

1. `import_process_graph` with inline `graph` (≤ 4MB) or `s3_reference` (≤ 50MB).
2. Supports Loxtep PKO namespace directly, or W3C PKO (auto-mapped).
3. Idempotent: re-importing same graph updates existing procedure.
4. Returns `procedure_id`, `action` (created|updated), counts, unmapped terms, warnings.
5. Auto-creates catalog entry unless `skip_catalog: true`.

### Flow — Export for round-trip

1. `export_process_graph` with `procedure_id` and `format` (jsonld | yaml | summary).
2. `jsonld` produces valid JSON-LD with Loxtep PKO namespace — round-trippable through `import_process_graph`.
3. `yaml` produces structured YAML (procedure, steps, decisions, triggers, dependencies, metadata).
4. `summary` produces concise metadata (name, step count, decision count, trigger types, dependents).
5. Pass `preserve_namespaces: true` to include original import URIs.

### Flow — Query dependency chain

1. `get_procedure_dependencies` with `procedure_id`, `direction` (upstream | downstream | both), `depth` (default 3, max 10).
2. Optionally filter by `relationship_types`.
3. Response includes edges with procedure metadata at each hop and `cycles_detected` flag.

## MCP mapping

| `operation` | Scope |
|-------------|-------|
| `list_procedures`, `get_procedure`, `create_procedure`, `update_procedure`, `delete_procedure`, `import_process_graph`, `export_process_graph`, `get_procedure_dependencies` | organization |

## Pitfalls

- **Data mesh workflows** (`create_workflow`, `patch_workflow_graph`) live under **`loxtep_workflows`** / **`data-workflows`** skill — different product object.
- **Soft-delete** — `delete_procedure` tombstones the procedure and all children. Tombstoned records are excluded from `list_procedures` but preserved for audit.
- **S3 upload path** — For graphs > 4MB, upload to S3 first and pass `s3_reference: {s3_bucket, s3_key}`.
- **Namespace resolution** — W3C PKO is auto-mapped. For custom namespaces, register via `loxtep_ontology` → `register_namespace_mapping` before importing.
- **Unresolved dependencies** — Dependencies referencing non-existent procedures are accepted but marked `unresolved` (forward references).

## Optional attribution

`_metadata: { "skill_name": "loxtep-procedures" }`

## Auth

`loxtep-auth` / login.

## References

- See the user story catalog in the Loxtep plugins-skills repository
