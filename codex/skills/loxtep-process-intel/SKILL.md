---
name: loxtep-process-intel
description:
  Use when the user wants entity context, query entity context, decision traces, ontology
  relationships, thesaurus terms, or resolve canonical keys for process intelligence. Customer
  MCP loxtep_process_intel. User story S8. Not the same as loxtep_catalog search or
  loxtep_schemas. See docs/skills-user-stories.md.
---

# Process intelligence (Customer MCP)

**Story S8:** Understand **entities**, **decisions**, **ontology paths**, and **canonical naming** across the graph.

## When to use

- “**Entity context** for order/customer”, “**decision traces**”, “**ontology** relationships”, “**thesaurus**”, “resolve **canonical** key”

## Prerequisites

- MCP auth. Operations are **organization**-scoped.

## Happy-path flows

### Flow — Investigate an entity

1. `get_entity_context` or `query_entity_context` with correlation/domain params per API.
2. `list_decision_traces` filtered by entity if supported.

### Flow — Naming and joins

1. `list_thesaurus_terms` / `resolve_canonical_key` for vocabulary alignment.
2. `get_ontology_relationships` for join paths across registered ontology.

## MCP mapping

| `operation` | Scope |
|-------------|-------|
| `get_entity_context`, `query_entity_context`, `list_decision_traces`, `get_ontology_relationships`, `list_thesaurus_terms`, `resolve_canonical_key` | organization |

## Pitfalls

- **Catalog** discovery is **`loxtep_catalog`** — different product surface.
- **Agent workspace** issues are **`loxtep_agent_workspace`** — not process intel.
- **HTTP reads** — Process-intel tools call platform REST; the AI Lambda needs correct **`platformApiBaseUrl`** + auth (JWT or SigV4 per deployment).

## Optional attribution

`_metadata: { "skill_name": "loxtep-process-intel" }`

## Auth

`loxtep-auth` / login.

## References

- [User story catalog](../../../docs/skills-user-stories.md)
