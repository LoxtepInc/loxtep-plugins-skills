---
name: loxtep-process-intel
description:
  Use when the user wants to read or write entity context, query what Loxtep
  knows about a business entity, or record and retrieve decision traces.
---

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

<!-- SCOPE_BLOCK -->

## Optional attribution

`_metadata: { "skill_name": "loxtep-process-intel" }`

## Auth

`loxtep-auth` / login.

## References

- [User story catalog](../../../docs/skills-user-stories.md)
