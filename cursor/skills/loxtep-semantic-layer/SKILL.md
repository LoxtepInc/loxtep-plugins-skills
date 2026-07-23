<!-- GENERATED FILE -- edit skills/<slug>/SKILL.md (or rule.mdc.src.md) and run `node scripts/generate-skills.mjs` -- do not edit directly -->
---
name: loxtep-semantic-layer
description:
  Use when the user wants to search the semantic layer, retrieve semantic
  artifacts, check semantic completeness, or manage canonical knowledge
  (strategy, positioning, brand voice, org structure, process docs).
metadata:
  documentation: https://github.com/LoxtepInc/loxtep-plugins-skills/blob/main/cursor/skills/loxtep-semantic-layer/SKILL.md
---

# Semantic Layer (Customer MCP)

Search and inspect the organization's **semantic layer** - curated business
definitions, metrics, dimensions, and completeness scores. Also manage
**canonical knowledge** artifacts like strategy, positioning, brand voice,
org structure, and process documentation.

## When to use

- "**Search semantic layer**", "find **semantic artifact**", "**completeness**
  score"
- "What **metrics** / **dimensions** / **definitions** exist for X?"
- "How complete is the semantic layer?"
- "**Upload unstructured context knowledge**", "**add canonical knowledge**",
  "**create/update strategy**", "**brand voice**", "**org structure**",
  "**process documentation**"
- "Store **business strategy** for agents", "Define our **brand positioning**",
  "Document **organizational structure**"

## Prerequisites

- MCP auth. Operations are **organization**-scoped.

## Happy-path flow

### Search and retrieval

1. `search_semantic_layer` with a query term to discover relevant artifacts.
2. `get_semantic_artifact` by `artifact_type` + `id` to inspect a specific
   artifact.
3. `get_semantic_completeness` to assess overall semantic coverage.

### Canonical knowledge management

1. `create_canonical_knowledge` to store organizational knowledge (strategy,
   positioning, brand voice, org structure, process docs).
2. `get_canonical_knowledge` to retrieve specific knowledge artifacts.
3. `update_canonical_knowledge` to modify existing knowledge bases.

## Operations

| Facade                  | Operation                   | Permission |
| ----------------------- | --------------------------- | ---------- |
| `loxtep_meaning` | `search_semantic_layer`     | search     |
| `loxtep_meaning` | `get_semantic_artifact`     | read       |
| `loxtep_meaning` | `get_semantic_completeness` | read       |
| `loxtep_meaning` | `create_canonical_knowledge`| write      |
| `loxtep_meaning` | `get_canonical_knowledge`   | read       |
| `loxtep_meaning` | `update_canonical_knowledge`| write      |

## MCP mapping

| Step                  | `operation`                 | Scope        | Notes                                                                  |
| --------------------- | --------------------------- | ------------ | ---------------------------------------------------------------------- |
| Search                | `search_semantic_layer`     | organization | Filters: `artifact_types`, `domain`, `domain_id`, `industry_relevance` |
| Get artifact          | `get_semantic_artifact`     | organization | Requires `artifact_type` + `id`                                        |
| Completeness          | `get_semantic_completeness` | organization | Optional `domain_id` filter                                            |
| Create knowledge      | `create_canonical_knowledge`| organization | Requires `type`, `title`, `body`, `classification`                     |
| Get knowledge         | `get_canonical_knowledge`   | organization | Requires `id`                                                          |
| Update knowledge      | `update_canonical_knowledge`| organization | Requires `id` + fields to update                                       |

## Canonical Knowledge Types

The semantic layer supports structured organizational knowledge artifacts that
agents can query for context:

| Type              | Description                                              | Example Use Case                           |
| ----------------- | -------------------------------------------------------- | ------------------------------------------ |
| `strategy`        | Business strategy, mission, vision, goals                | "What is our Q4 revenue target?"          |
| `positioning`     | Market positioning, competitive differentiation           | "How do we position against competitors?" |
| `brand_voice`     | Brand voice guidelines, tone, communication style         | "Write in our brand voice"                |
| `org_structure`   | Organizational hierarchy, team structure, roles            | "Who owns the sales domain?"              |
| `process_doc`     | Business processes, procedures, workflows                  | "How do we handle customer onboarding?"  |

### Creating Canonical Knowledge

```json
{
  "operation": "create_canonical_knowledge",
  "type": "strategy",
  "title": "Q4 2024 Revenue Strategy",
  "body": "Our strategy is to increase ARR by 40% through expansion of enterprise accounts...",
  "classification": "internal",
  "owner": "strategy-team@company.com"
}
```

### Retrieving Knowledge

```json
{
  "operation": "get_canonical_knowledge",
  "id": "<knowledge-id>"
}
```

### Updating Knowledge

```json
{
  "operation": "update_canonical_knowledge",
  "id": "<knowledge-id>",
  "title": "Updated Q4 2024 Revenue Strategy",
  "body": "We've adjusted our targets to 45% ARR growth..."
}
```

## Pitfalls

- **Ontology/vocabulary management** (thesaurus terms, namespace mappings) is
  **`loxtep_meaning`** - different facade. This Agent-Scope Skill is for
  _querying_ the curated semantic layer and managing canonical knowledge, not
  managing its underlying ontology structure.
- **Catalog search** is **`loxtep_query`** - use that for broad discovery
  across all artifact types. This Agent-Scope Skill is for the
  semantic-layer-specific search and completeness view.
- **`artifact_types`** (plural) is an array filter - pass multiple types to
  narrow results. Do not confuse with `artifact_type` (singular) used in
  `get_semantic_artifact`.
- **Canonical knowledge** is for organizational knowledge, not data product
  schemas or quality rules. Use `loxtep_define` for schema management and
  `loxtep_define` for quality rules.
- **Do NOT use** workflows, data products, or connectors for storing
  unstructured organizational knowledge. Use canonical knowledge artifacts
  instead.

<!-- BEGIN loxtep skill-scope (skill-package-v1) -->

## Agent-Scope Skill scope (`.loxtep/skills/loxtep-semantic-layer.yaml`)

Resource scope and operation permissions for this Agent-Scope Skill, conformant
with the [`skill-package-v1`](https://loxtep.io/schemas/skill-package-v1.json)
schema. Any resource type or operation not listed is **denied (fail-closed)**.
Identifier lists are empty placeholders — fill them with the specific resources
in your workspace. This declaration does not change the hosted MCP config
(`mcp.loxtep.io`).

```yaml
# .loxtep/skills/loxtep-semantic-layer.yaml
# Conforms to https://loxtep.io/schemas/skill-package-v1.json
# Fail-closed: this Agent-Scope Skill's facades are RBAC-governed and carry no data-mesh resource scope.
name: loxtep-semantic-layer
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
