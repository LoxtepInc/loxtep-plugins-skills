<!-- GENERATED FILE -- edit skills/<slug>/SKILL.md (or rule.mdc.src.md) and run `node scripts/generate-skills.mjs` -- do not edit directly -->

# Process intelligence

Entity context and decision traces.

## When to use

- "**Entity context** for order/customer", "**decision traces**", "record **execution context**", "record **decision**", "**unified context query**"

## Prerequisites

- MCP auth. Operations are **organization**-scoped.

## Happy-path flows

### Flow — Investigate an entity

1. `get_entity_context` or `query_entity_context` with correlation/domain params per API.
2. `list_decision_traces` filtered by entity/procedure/actor.

### Flow — Record execution context

1. `create_entity_context` with entity_type, entity_id, attributes, related_entities, source.
2. Append-only — each call creates a new context snapshot (no overwrite).

### Flow — Unified context query

1. `query_context` with `query` (natural language question).
2. Optionally restrict with `backends: ["graph", "vector"]` to limit search scope.
3. Response includes synthesized `answer`, `confidence` score, `sources` (citations), and execution `plan`.

### Flow — Record decision trace

1. `record_decision_trace` with decision_id, procedure_id, step_id, inputs, outcome, rationale, actor, timestamp.
2. Set `override: true` if the decision was manually overridden (emits audit event).

## MCP mapping

| `operation` | Scope | Action |
|-------------|-------|--------|
| `get_entity_context` | organization | read |
| `query_entity_context` | organization | read |
| `create_entity_context` | organization | write |
| `list_decision_traces` | organization | read |
| `query_context` | organization | read |
| `record_decision_trace` | organization | write |

## Pitfalls

- **Ontology/thesaurus** management (vocabulary terms, ontology concepts, namespace mappings) is now in the **`loxtep-ontology`** Agent-Scope Skill — not here.
- **Catalog** discovery is **`loxtep_query`** — different product surface.
- **Agent workspace** issues are **`loxtep_context`** — not process intel.
- **Connectivity** — Process-intel tools require valid MCP authentication and access to your organization's process-intelligence data.

<!-- BEGIN loxtep skill-scope (skill-package-v1) -->

## Agent-Scope Skill scope (`.loxtep/skills/loxtep-process-intel.yaml`)

Resource scope and operation permissions for this Agent-Scope Skill, conformant
with the [`skill-package-v1`](https://loxtep.io/schemas/skill-package-v1.json)
schema. Any resource type or operation not listed is **denied (fail-closed)**.
Identifier lists are empty placeholders — fill them with the specific resources
in your workspace. This declaration does not change the hosted MCP config
(`mcp.loxtep.io`).

```yaml
# .loxtep/skills/loxtep-process-intel.yaml
# Conforms to https://loxtep.io/schemas/skill-package-v1.json
# Fail-closed: this skill's facades are RBAC-governed and carry no data-mesh resource scope.
name: loxtep-process-intel
description: Runtime process intelligence — RBAC-governed; no data-mesh resource scope.
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

`_metadata: { "skill_name": "loxtep-process-intel" }`

## Auth

`loxtep-auth` / login.

## References

- [User story catalog](../../../docs/skills-user-stories.md)
