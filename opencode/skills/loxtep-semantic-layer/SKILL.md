---
name: loxtep-semantic-layer
version: 1.0.0
scope: organization
description:
  Use when the user wants to search the semantic layer, retrieve semantic artifacts,
  or check semantic completeness across the organization. Customer MCP loxtep_semantic_layer.
  Not the same as loxtep_ontology (vocabulary/namespace management) or loxtep_catalog
  (discovery/governance). See docs/skills-user-stories.md.
---

# Semantic Layer (Customer MCP)

Search and inspect the organization's **semantic layer** — curated business
definitions, metrics, dimensions, and completeness scores.

## When to use

- "**Search semantic layer**", "find **semantic artifact**", "**completeness** score"
- "What **metrics** / **dimensions** / **definitions** exist for X?"
- "How complete is the semantic layer?"

## Prerequisites

- MCP auth. Operations are **organization**-scoped.

## Happy-path flow

1. `search_semantic_layer` with a query term to discover relevant artifacts.
2. `get_semantic_artifact` by `artifact_type` + `id` to inspect a specific artifact.
3. `get_semantic_completeness` to assess overall semantic coverage.

## Operations

| Facade | Operation | Permission |
| --- | --- | --- |
| `loxtep_semantic_layer` | `search_semantic_layer` | search |
| `loxtep_semantic_layer` | `get_semantic_artifact` | read |
| `loxtep_semantic_layer` | `get_semantic_completeness` | read |

## MCP mapping

| Step | `operation` | Scope | Notes |
|------|-------------|-------|-------|
| Search | `search_semantic_layer` | organization | Filters: `artifact_types`, `domain`, `domain_id`, `industry_relevance` |
| Get artifact | `get_semantic_artifact` | organization | Requires `artifact_type` + `id` |
| Completeness | `get_semantic_completeness` | organization | Optional `domain_id` filter |

## Pitfalls

- **Ontology/vocabulary management** (thesaurus terms, namespace mappings) is
  **`loxtep_ontology`** — different facade. This Agent-Scope Skill is for *querying* the
  curated semantic layer, not managing its underlying ontology structure.
- **Catalog search** is **`loxtep_catalog`** — use that for broad discovery
  across all artifact types. This Agent-Scope Skill is for the semantic-layer-specific
  search and completeness view.
- **`artifact_types`** (plural) is an array filter — pass multiple types to
  narrow results. Do not confuse with `artifact_type` (singular) used in
  `get_semantic_artifact`.

<!-- BEGIN loxtep skill-scope (skill-package-v1) -->
## Agent-Scope Skill scope (`.loxtep/skills/loxtep-semantic-layer.yaml`)

Resource scope and operation permissions for this Agent-Scope Skill, conformant with the [`skill-package-v1`](https://loxtep.io/schemas/skill-package-v1.json) schema. Any resource type or operation not listed is **denied (fail-closed)**. Identifier lists are empty placeholders — fill them with the specific resources in your workspace. This declaration does not change the hosted MCP config (`mcp.loxtep.io`).

```yaml
# .loxtep/skills/loxtep-semantic-layer.yaml
# Conforms to https://loxtep.io/schemas/skill-package-v1.json
# Fail-closed: this Agent-Scope Skill's facades are RBAC-governed and carry no data-mesh resource scope.
name: loxtep-semantic-layer
version: 1.0.0
description: Semantic layer search, artifact retrieval, and completeness — RBAC-governed; no data-mesh resource scope.
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

`_metadata: { "skill_name": "loxtep-semantic-layer" }`

## Auth

`loxtep-auth` / login.

## References

- [User story catalog](../../../docs/skills-user-stories.md)
