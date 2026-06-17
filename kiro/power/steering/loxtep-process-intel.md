# Process intelligence (Customer MCP)

**Story S8:** Understand **entities**, **decisions**, **execution context**, and perform **unified context retrieval** across the process graph — runtime intelligence for entity state, decision audit trails, and multi-backend context queries.

## When to use

- "**Entity context** for order/customer", "**decision traces**", "record **decision**", "create **entity context**", "**unified context query**"

## Prerequisites

- MCP auth. Operations are **organization**-scoped.

## Happy-path flows

### Flow — Investigate an entity

1. `get_entity_context` or `query_entity_context` with `entity_type` (e.g. `data-products`, `connections`) and `entity_id`.
2. `list_decision_traces` filtered by entity if supported.

### Flow — Record execution context

1. `create_entity_context` with `entity_type`, `entity_id`, `attributes`, `related_entities`, `source`.
2. Each call creates a new context snapshot (append-only).
3. If `entity_type` is not in the ontology, a warning is returned — register it via `loxtep_ontology` → `create_ontology_concept`.

### Flow — Unified context query

1. `query_context` with `query` — a natural language question (e.g. "What processes touch the customer entity?").
2. Optionally restrict search scope with `backends: ["graph", "vector"]` (valid: `graph`, `analytics`, `vector`, `catalog`).
3. Optionally set `max_results` (default 20) and `include_plan: false` to suppress execution plan.
4. Response includes synthesized `answer`, `confidence` score (0–1), `sources` (citations array), and optional execution `plan`.
5. Check `metadata` for latencies, backends consulted/failed, and intent classification.

### Flow — Record decision trace

1. `record_decision_trace` with `decision_id`, `procedure_id`, `step_id`, `inputs`, `outcome`, `rationale`, `actor`, `timestamp`.
2. Set `override: true` if the decision was manually overridden (emits audit event).
3. Query back with `list_decision_traces` filtered by `procedure_id`, `decision_id`, `actor`, `override`, or date range.

## MCP mapping

| `operation` | Scope |
|-------------|-------|
| `get_entity_context`, `query_entity_context`, `create_entity_context`, `list_decision_traces`, `record_decision_trace`, `query_context` | organization |

## Pitfalls

- **Ontology/thesaurus management** is now in **`loxtep_ontology`** — use that for vocabulary terms, ontology concepts, relationships, and namespace mappings.
- **Catalog** discovery is **`loxtep_catalog`** — different product surface.
- **Agent workspace** issues are **`loxtep_agent_workspace`** — not process intel.
- **Connectivity** — Process-intel tools require valid MCP authentication and access to your organization's process-intelligence data.
- **Append-only** — `create_entity_context` never overwrites; each call creates a new snapshot.

## Optional attribution

`_metadata: { "skill_name": "loxtep-process-intel" }`

## Auth

`loxtep-auth` / login.

## References

- See the user story catalog in the Loxtep plugins-skills repository
