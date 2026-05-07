---
name: org-semantics-quality
description:
  Use when the user wants org-level schema definitions, semantic definitions, PII tagging,
  schema versions, quality rules, test quality rules, or governance on definitions — not
  catalog search. Customer MCP loxtep_schemas and loxtep_quality. User story S4. Pair with
  discover-govern-lineage and loxtep-process-intel for catalog vs ontology vs thesaurus.
  See docs/skills-user-stories.md.
---

# Org semantics, schemas, and quality (Customer MCP)

**Story S4:** Model **definitions** at organization scope: **schemas** (CRUD, versions, PII) and **quality rules** (CRUD, test).

## When to use

- “Create/update **schema**”, “**list schema versions**”, “**tag PII**”
- “**Quality rule**”, “**test quality rule**”, “list quality rules”

## Prerequisites

- MCP auth. Operations are **organization**-scoped (no `project_id` for these facades in MCP scope map).

## Happy-path flows

### Flow — Schema lifecycle

1. `create_schema` → `get_schema` / `list_schema_versions`.
2. `update_schema` as model evolves; `tag_pii_fields` before exposure rules.
3. `delete_schema` only when policy allows destruction.

### Flow — Quality on definitions

1. `list_quality_rules` → `get_quality_rule`.
2. `create_quality_rule` / `update_quality_rule`.
3. `test_quality_rule` before enabling in production.

## MCP mapping

| Area | Tool | `operation` | Scope |
|------|------|-------------|-------|
| Schemas | `loxtep_schemas` | `create_schema`, `update_schema`, `delete_schema`, `get_schema`, `list_schema_versions`, `tag_pii_fields` | organization |
| Quality | `loxtep_quality` | `create_quality_rule`, `update_quality_rule`, `delete_quality_rule`, `list_quality_rules`, `get_quality_rule`, `test_quality_rule` | organization |

## Pitfalls

- **Ontology relationships / thesaurus** for entity intelligence live under **`loxtep_process_intel`**, not `loxtep_schemas`.
- **Catalog discovery** is **`loxtep_catalog`** (`discover-govern-lineage` skill).
- **403 / permission denied** — Schema and quality tools enforce RBAC (`schemas:*`, `quality:*`); session may be valid but role may not allow the operation.

## Optional attribution

`_metadata: { "skill_name": "org-semantics-quality" }`

## Auth

`loxtep-auth` / login command.

## References

- [User story catalog](../../../docs/skills-user-stories.md)
