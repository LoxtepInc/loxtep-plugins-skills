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
2. `apply_schema` to pin the shape on a data product. Apply writes
   `data_product_schema_applications` and refreshes the catalog snapshot
   `data_products.schema`, including `schema.key` from `fields[].is_primary_key`
   on that data-product schema path. JSON Schema snapshots still drop
   `is_primary_key` and `schema.key`. Postgres and MySQL source catalog field
   lists keep `is_primary_key` (and `references_shape`) on the connector cache
   for induction; Iceberg still reads the data-product schema snapshot. If both
   `schema.key` and `is_primary_key` are present they must agree; semantic
   bootstrap throws `DeclaredKeyConflictError` instead of unioning them.
   Recovery: (a) if a shape is applied, `get_definition_status` reports a
   `storage_key_conflict` blocker, and `apply_schema` or
   `apply_definition_proposal` with matching keys fixes it; (b) if no shape is
   applied, the only fix is `PUT /dataproducts/{id}` with a matching
   `schema.key`. MCP `update_data_product` does not. `catalog_refresh` does not
   repair that. See
   [shape, application, and catalog snapshot](../../../docs/concepts/shape-application-catalog-snapshot.md).
3. Align the shape to a concept URI via `patch_schema` /
   `client.define.shapes.align({ aligned_to_concept_uri })`.
4. `tag_pii_fields` with `schema_version_id` and `field_names[]` before exposure
   rules.
5. `delete_schema` only when policy allows destruction.

### Flow — Data contract

1. `create_data_contract` on `loxtep_build` with `data_product_id`, `name`, and
   `schema_version_id` from the applied shape version.
2. `schema_version_id` is stored as `schema_ref`. It names the shape version. It
   does not write `schema.key`.

### Flow — Quality on definitions

1. `list_quality_rules` → `get_quality_rule`.
2. `create_quality_rule` / `update_quality_rule`.
3. `test_quality_rule` before enabling in production.

## MCP mapping

| Area    | Tool            | `operation`                                                                                                                        | Scope        |
| ------- | --------------- | ---------------------------------------------------------------------------------------------------------------------------------- | ------------ |
| Shapes  | `loxtep_define` | `create_schema`, `list_schemas`, `get_schema`, `apply_schema`, `patch_schema`, `list_schema_versions`, `tag_pii_fields`, …         | organization |
| Quality | `loxtep_define` | `create_quality_rule`, `update_quality_rule`, `delete_quality_rule`, `list_quality_rules`, `get_quality_rule`, `test_quality_rule` | organization |

## SDK mapping

| Concern                    | SDK                                                                    |
| -------------------------- | ---------------------------------------------------------------------- |
| Domain shapes              | `client.define.shapes.create` / `.list` / `.get` / `.apply` / `.align` |
| Data-product schemas / PII | `client.define.schemas.get` / `.list` / `.tag_pii_fields`              |
| Quality                    | `client.define.quality.*`                                              |
| Terms (define meaning)     | `client.meaning.thesaurus.*`                                           |
| Ontology graph types       | `client.meaning.ontology.*` (`node_type` lowercase)                    |

**Define meaning** = terms + shapes. Ontology concepts are for graph types and
relationships — not the primary path for field vocabulary.

## Pitfalls

- **Shape → product and shape → concept — never product → concept.**
  `create_schema` authors a **shape**. `apply_schema` / Apply definition applies
  that shape to a product. Align the shape to a pack/org **concept** in Meaning.
  Do **not** bind Schema.org Product (or another concept) onto the data product
  — that is the wrong edge. See
  [docs/concepts/type-vs-pack-alignment.md](../../../docs/concepts/type-vs-pack-alignment.md).
- **`create_schema` creates a shape** — Meaning/Bind lists those authored Define
  schemas (`list_schemas` / `domain_schemas`) and pins them with `apply_schema`.
  The product row `data_products.schema` is the catalog snapshot Iceberg reads,
  including `schema.key`. It is not a second shape registry.
  `data_product_schemas` is gone. Pack concepts stay on Align (shape → concept).
  SDK: `client.define.shapes.*`.
- **Ontology relationships / thesaurus** for entity intelligence live under
  **`loxtep_meaning`** / graph APIs, not as a second schema store. SDK:
  `client.meaning.thesaurus` + `client.meaning.ontology`
  (`node_type: 'entity'`).
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

## Skill attribution (required)

MCP tool calls need a resolvable skill name. Prefer
`_metadata: { "skill_name": "org-semantics-quality" }`; otherwise the server
infers from the operation map or `X-Skill-Name`. Unresolvable calls are denied
(`MISSING_SKILL_ATTRIBUTION`). The skill name also drives scope checks.

## Auth

`loxtep-auth` / reconnect MCP for OAuth.

## References

- [User story catalog](../../../docs/skills-user-stories.md)
