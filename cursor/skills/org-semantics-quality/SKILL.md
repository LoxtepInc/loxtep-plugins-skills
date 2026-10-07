<!-- GENERATED FILE -- edit skills/<slug>/SKILL.md (or rule.mdc.src.md) and run `node scripts/generate-skills.mjs` -- do not edit directly -->
---
name: org-semantics-quality
description:
  Use when the user wants to define schemas, tag PII fields, manage quality
  rules, or govern data definitions at the organization level. Part of the
  Organize step. Not for catalog search — use discover-govern-lineage for that.
metadata:
  documentation: https://github.com/LoxtepInc/loxtep-plugins-skills/blob/main/cursor/skills/org-semantics-quality/SKILL.md
---

# Schemas and quality rules

Define and manage schemas, PII classifications, and quality rules at the
organization level.

## When to use

- “Create/update **schema**”, “**list schema versions**”, “**tag PII**”
- “**Quality rule**”, “**test quality rule**”, “list quality rules”

## Prerequisites

- MCP auth. Operations are **organization**-scoped (no `project_id` for these
  facades in MCP scope map).

## Happy-path flows

### Flow — Schema lifecycle (domain shapes)

1. `create_schema` with `name`, `version`, `format`, `fields[]`, `definition`
   (optional `domain_id`) → returns shape ids. This authors a **domain shape**,
   not a data-product schema blob.
2. `apply_schema` to bind the shape to a data product.
3. Align the shape to a concept URI via `patch_schema` /
   `client.define.shapes.align({ aligned_to_concept_uri })`.
4. `tag_pii_fields` with `schema_version_id` and `field_names[]` before exposure
   rules.
5. `delete_schema` only when policy allows destruction.

### Flow — Quality on definitions

1. `list_quality_rules` → `get_quality_rule`.
2. `create_quality_rule` / `update_quality_rule`.
3. `test_quality_rule` before enabling in production.

## MCP mapping

| Area    | Tool            | `operation`                                                                                                                        | Scope        |
| ------- | --------------- | ---------------------------------------------------------------------------------------------------------------------------------- | ------------ |
| Shapes  | `loxtep_define` | `create_schema`, `list_schemas`, `get_schema`, `apply_schema`, `patch_schema`, `list_schema_versions`, `tag_pii_fields`, …       | organization |
| Quality | `loxtep_define` | `create_quality_rule`, `update_quality_rule`, `delete_quality_rule`, `list_quality_rules`, `get_quality_rule`, `test_quality_rule` | organization |

## SDK mapping

| Concern | SDK |
| --- | --- |
| Domain shapes | `client.define.shapes.create` / `.list` / `.get` / `.apply` / `.align` |
| Data-product schemas / PII | `client.define.schemas.get` / `.list` / `.tag_pii_fields` |
| Quality | `client.define.quality.*` |
| Terms (define meaning) | `client.meaning.thesaurus.*` |
| Ontology graph types | `client.meaning.ontology.*` (`node_type` lowercase) |

**Define meaning** = terms + shapes. Ontology concepts are for graph types and
relationships — not the primary path for field vocabulary.

## Pitfalls

- **Shape → product and shape → concept — never product → concept.**
  `create_schema` authors a **shape**. `apply_schema` / Apply definition applies
  that shape to a product. Align the shape to a pack/org **concept** in Meaning.
  Do **not** bind Schema.org Product (or another concept) onto the data product
  — that is the wrong edge. See
  [docs/concepts/type-vs-pack-alignment.md](../../../docs/concepts/type-vs-pack-alignment.md).
- **`create_schema` creates a shape** — Meaning/Bind lists those authored
  Define schemas (`list_schemas` / `domain_schemas`) and applies them with
  `apply_schema`. Pack concepts stay on Align (shape → concept). SDK:
  `client.define.shapes.*` (not `client.define.schemas`, which is data-product
  schema versions).
- **Ontology relationships / thesaurus** for entity intelligence live under
  **`loxtep_meaning`** / graph APIs, not as a second schema store. SDK:
  `client.meaning.thesaurus` + `client.meaning.ontology` (`node_type: 'entity'`).
- **Catalog discovery** is **`loxtep_query`** (`discover-govern-lineage`
  Agent-Scope Skill).
- **403 / permission denied** — Schema and quality tools enforce RBAC
  (`schemas:*`, `quality:*`); session may be valid but role may not allow the
  operation.

<!-- BEGIN loxtep skill-scope (skill-package-v1) -->

## Agent-Scope Skill scope (`.loxtep/skills/org-semantics-quality.yaml`)

Resource scope and operation permissions for this Agent-Scope Skill, conformant
with the [`skill-package-v1`](https://loxtep.io/schemas/skill-package-v1.json)
schema. Any resource type or operation not listed is **denied (fail-closed)**.
Identifier lists are empty placeholders — fill them with the specific resources
in your workspace. This declaration does not change the hosted MCP config
(`mcp.loxtep.io`).

```yaml
# .loxtep/skills/org-semantics-quality.yaml
# Conforms to https://loxtep.io/schemas/skill-package-v1.json
# Fail-closed: this skill's facades are RBAC-governed and carry no data-mesh resource scope.
name: org-semantics-quality
description: Org schema and quality-rule governance — RBAC-governed; no data-mesh resource scope.
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

`_metadata: { "skill_name": "org-semantics-quality" }`

## Auth

`loxtep-auth` / reconnect MCP for OAuth.

## References

- [User story catalog](../../../docs/skills-user-stories.md)
