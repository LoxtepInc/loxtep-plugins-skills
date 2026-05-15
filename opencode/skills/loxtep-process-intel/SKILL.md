---
name: loxtep-process-intel
description: Runtime process intelligence — entity context and decision traces. Use when the user wants to read or write entity context, query entity context, or list/record decision traces. Customer MCP loxtep_process_intel. Not the same as loxtep_ontology (vocabulary/ontology management) or loxtep_catalog (discovery).
license: MIT
compatibility: opencode
metadata:
  platform: loxtep
  category: process-intel
---

# Process intelligence (Customer MCP)

**Story S8:** Runtime process intelligence — **entity context** and **decision traces**.

## When to use

- "**Entity context** for order/customer", "**decision traces**", "record **execution context**", "record **decision**"

## Prerequisites

- MCP auth. Operations are **organization**-scoped.

## Happy-path flows

### Flow — Investigate an entity

1. `get_entity_context` or `query_entity_context` with correlation/domain params per API.
2. `list_decision_traces` filtered by entity/procedure/actor.

### Flow — Record execution context

1. `create_entity_context` with entity_type, entity_id, attributes, related_entities, source.
2. Append-only — each call creates a new context snapshot (no overwrite).

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
| `record_decision_trace` | organization | write |

## Pitfalls

- **Ontology/thesaurus** management (vocabulary terms, ontology concepts, namespace mappings) is now in **`loxtep-ontology`** skill — not here.
- **Catalog** discovery is **`loxtep_catalog`** — different product surface.
- **Agent workspace** issues are **`loxtep_agent_workspace`** — not process intel.
- **HTTP reads** — Process-intel tools call platform REST; the AI Lambda needs correct **`platformApiBaseUrl`** + auth (JWT or SigV4 per deployment).

## Optional attribution

`_metadata: { "skill_name": "loxtep-process-intel" }`

## Auth

`loxtep-auth` / login.

## References

- [User story catalog](../../docs/skills-user-stories.md)
