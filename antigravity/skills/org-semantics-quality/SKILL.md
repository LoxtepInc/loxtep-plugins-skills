<!-- GENERATED FILE -- edit skills/<slug>/SKILL.md (or rule.mdc.src.md) and run `node scripts/generate-skills.mjs` -- do not edit directly -->
---
name: org-semantics-quality
description:
  Use when the user wants to define schemas, tag PII fields, manage quality
  rules, or govern data definitions at the organization level. Part of the
  Organize step. Not for catalog search — use discover-govern-lineage for that.
metadata:
  documentation: https://github.com/LoxtepInc/loxtep-plugins-skills/blob/main/antigravity/skills/org-semantics-quality/SKILL.md
---

# Schemas and quality rules

Define and manage schemas, PII classifications, and quality rules at the organization level.

## When to use

- “Create/update **schema**”, “**list schema versions**”, “**tag PII**”
- “**Quality rule**”, “**test quality rule**”, “list quality rules”

## Prerequisites

- MCP auth. Operations are **organization**-scoped (no `project_id` for these facades in MCP scope map).

## Happy-path flows

### Flow — Schema lifecycle

1. `create_schema` with `data_product_id`, `name`, `version`, `format`, `fields[]`, `definition` → returns `schema_id` + `schema_version_id`.
2. `update_schema` as model evolves.
3. `tag_pii_fields` with `schema_version_id` and `field_names[]` before exposure rules.
3. `delete_schema` only when policy allows destruction.

### Flow — Quality on definitions

1. `list_quality_rules` → `get_quality_rule`.
2. `create_quality_rule` / `update_quality_rule`.
3. `test_quality_rule` before enabling in production.

## MCP mapping

| Area | Tool | `operation` | Scope |
|------|------|-------------|-------|
| Schemas | `loxtep_define` | `create_schema`, `update_schema`, `delete_schema`, `get_schema`, `list_schema_versions`, `tag_pii_fields` | organization |
| Quality | `loxtep_define` | `create_quality_rule`, `update_quality_rule`, `delete_quality_rule`, `list_quality_rules`, `get_quality_rule`, `test_quality_rule` | organization |

## Pitfalls

- **Ontology relationships / thesaurus** for entity intelligence live under **`loxtep_context`**, not `loxtep_define`.
- **Catalog discovery** is **`loxtep_query`** (`discover-govern-lineage` Agent-Scope Skill).
- **403 / permission denied** — Schema and quality tools enforce RBAC (`schemas:*`, `quality:*`); session may be valid but role may not allow the operation.

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
