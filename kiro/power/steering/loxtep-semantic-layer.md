<!-- GENERATED FILE -- single source: loxtep/scripts/plugins-skills-generate-skills.mjs. From the loxtep root run `PLUGINS_SKILLS_ROOT=<plugins-skills> node scripts/sync-skills-to-plugins-skills.mjs` (or that generator with PLUGINS_SKILLS_ROOT set). Do not edit client copies; do not run sibling scripts/generate-skills.mjs. -->

# Semantic Layer (Customer MCP)

Search and inspect the organization's **semantic layer** - curated business
definitions, metrics, dimensions, and completeness scores. Also manage
**canonical knowledge** artifacts like strategy, positioning, brand voice, org
structure, and process documentation.

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
- "**Review vocabulary proposals**", "**infer definitions** for pending terms",
  "**accept/reject agent proposals**" from connect detection

## Prerequisites

- MCP auth. Operations are **organization**-scoped.

## Shared meaning journey (no product required)

Shared vocabulary, concepts, relationships, and reusable shapes have their own
journey. A product can consume them later. Do not create a product, start
promotion, or require a delivery workflow to define organization meaning.

1. **Scope and evidence:** identify the business domain, owner, intended
   meaning, source evidence, and unresolved questions. A field name or model
   confidence alone does not establish a business definition.
2. **Reuse:** inspect active packs, existing terms, ontology concepts, and org
   shapes before drafting. Use `loxtep-ontology` for terms/concepts and
   `loxtep_define` `list_schemas` for shapes. Search results of type `schema`
   are not the org shape registry. Prefer aliases for naming differences;
   overrides require real semantic divergence.
3. **Draft:** define terms (language), concepts and relationships (business
   model), and shapes (reusable structure) separately. Align shapes to concepts;
   only apply shapes to products when the user requests product work.
4. **Review the exact change:** identify the proposal/package ID, revision when
   available, scope, evidence, intended effect, and affected consumers. Explain
   whether acceptance creates an artifact, applies one, or only records a
   decision. Inbox is a decision surface, not proof of artifact availability.
5. **Verify availability:** read the resulting term/concept/shape or package
   verification result. Report decision, artifact availability, and product
   usage separately. Missing effects remain unfinished even after acceptance.
6. **Optional product adoption:** hand the verified artifact IDs to
   `define-data-product-shape` / `promote-data-product`; recheck the product's
   actual readiness. Shared meaning itself has no bronze/silver/gold lifecycle.

### Route review by proposal type

Use `list_semantic_proposals` with `page` and `page_size` (maximum 100),
following pagination until complete. Group by proposal type and scope. Do not
silently report the first page as the whole backlog. Duplicate names are review
groups, not permission to bulk accept: definitions may conflict across sources.

| Proposal type                                 | Current effect / required verification                                                                                                                                                                                                                                                                   |
| --------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `vocabulary_term`                             | Acceptance with a definition upserts an org term. Read it back and check aliases and definition; graph propagation is separate.                                                                                                                                                                          |
| `canonical_shape`                             | Acceptance creates/revises a shape and attempts specified product applications. Read the shape and check each intended product; inspect `materialization.status` and `failed_data_products`. A partial application is unfinished consumer work; retry using the saved `schema_id`.                       |
| `type_binding` / `semantic_infer_ontology`    | Acceptance can write a product graph mapping. Inspect mapping and review state. Do not use this to bypass shape → concept alignment on a product with an applied shape.                                                                                                                                  |
| `ontology_concept_mapping_proposal`           | Acceptance saves a shared concept, its reviewed property mappings, and class relationships. Read `get_ontology_concept` using the returned `concept_id`; inspect field mappings, review status and provenance. Product IDs are provenance; adoption is separate. Canonical targets require active packs. |
| `product_shape` / `product_semantic_bindings` | Product definition work: follow `define-data-product-shape`, exact revision approval/application, and read definition status. Do not infer application from the generic decision label.                                                                                                                  |

Inspect `materialized` in the accept response. `false` means decision-only;
missing means unverified. Even `true` does not prove every consumer was updated
or that a product is Ready. Never invent an apply operation or bypass a required
human review to compensate for a missing effect.

### Organization inference and review

Organization-wide ontology inference and product semantic inference are
distinct. Use `loxtep_meaning` with `_metadata.skill_name: loxtep-ontology`:

1. `start_ontology_inference` with optional `data_product_ids` (1–50); omit for
   eligible connected products across the organization. Record `run_id`. This is
   optional evidence gathering; authored shared meaning needs no product.
2. `get_ontology_inference_run` with that exact `run_id`. Inspect status,
   completed counts, and each failed/skipped source. Submission is not
   completion. Policy may auto-accept eligible mappings.
3. `list_inferred_ontology` with `needs_review: true`, optionally scoped to one
   product. Inspect `invalid` rows as well as `items`.
4. `review_inferred_ontology` with `data_product_id` and `action`
   accept/reject/edit. Edits supply the intended type or complete field
   mappings, retaining property kinds and references. Read the returned review
   state. Correct mappings projected from applied shapes through shape
   alignment.
5. `cancel_ontology_inference_run` stops a run when requested. Finished items
   remain; inspect the returned state rather than promising rollback.

Do not substitute product `request_semantic_inference` for an organization run.
Graph-inferred mappings use `review_inferred_ontology`; SQL induction proposals
use `accept_semantic_proposal`. Discover available schemas when working against
an older deployed version. No mapping acceptance proves product readiness.

## Happy-path flow

### Search and retrieval

1. `search_semantic_layer` with a query term to discover relevant artifacts.
2. `get_semantic_artifact` by `artifact_type` + `id` to inspect a specific
   artifact.
3. `get_semantic_completeness` to assess overall semantic coverage.

### Canonical knowledge management

1. `create_canonical_knowledge` to store organizational knowledge (strategy,
   positioning, brand voice, org structure, process docs).
2. `list_canonical_knowledge` to find drafts (e.g. wiki-materialized pages).
3. `get_canonical_knowledge` to retrieve a specific artifact by UUID `id` or
   `content_ref`.
4. `update_canonical_knowledge` to modify existing knowledge bases.

### Semantic package stage → review → approve (not deploy)

1. Stage with `import_semantic_bundle` / `save_semantic_package` /
   `import_external_semantic_package` (default is stage, not deploy).
2. Show the plain-language `summary` and `review_url` from the stage result to
   the user (works in every MCP host).
3. Call **`loxtep_package_review`** with `operation: review_semantic_package`
   (`package_id` + `revision`, or `approval_request_id`) so MCP Apps hosts can
   render the in-chat card. Never skip this when status is `pending_approval`.
4. Wait for human Approve/Reject (card buttons, `approve_semantic_package` /
   `reject_semantic_package`, or the authenticated inbox `review_url`).
5. **Do not deploy** until the user explicitly asks after approval. Deploy is
   `deploy_semantic_package` — a separate step.
6. After authorized deployment, call `verify_semantic_package` and inspect its
   result. Approval alone is not deployment; deployment alone is not verified
   availability. Surface failed checks and the next concrete repair.

### Vocabulary agent proposals (connect → review → assert)

Connect heuristics queue pending `vocabulary_term` proposals. Nothing is
asserted until Accept. **Business-field confidence** (e.g. Medium ≈ 55%) is not
definition quality. Detection metadata (`canonical_key`, `data_type`,
`proposal_source`) is not a glossary definition and not a sample event.

1. `list_semantic_proposals` with `disposition: pending` (optional
   `proposal_type: vocabulary_term`, `data_product_id`).
2. For each item, check `proposal_payload.definition`. If missing, call
   `infer_proposal_definitions` with up to 20 `semantic_proposal_ids`.
3. Review drafts. `undefined_ids` means the model omitted that key (often thin
   name/type context) — do not treat as a hard API failure.
4. Accept with `accept_semantic_proposal` only when a definition exists, or pass
   `definition` on accept. Reject noise with `reject_semantic_proposal`.
5. **Never accept** a `vocabulary_term` without a definition.

SDK/CLI: `client.meaning.proposals` /
`loxtep proposals list|infer-definitions|accept|reject`.

## Operations

| Facade                  | Operation                    | Permission |
| ----------------------- | ---------------------------- | ---------- |
| `loxtep_meaning`        | `search_semantic_layer`      | search     |
| `loxtep_meaning`        | `get_semantic_artifact`      | read       |
| `loxtep_meaning`        | `get_semantic_completeness`  | read       |
| `loxtep_meaning`        | `create_canonical_knowledge` | write      |
| `loxtep_meaning`        | `get_canonical_knowledge`    | read       |
| `loxtep_meaning`        | `list_canonical_knowledge`   | read       |
| `loxtep_meaning`        | `update_canonical_knowledge` | write      |
| `loxtep_meaning`        | `import_semantic_bundle`     | write      |
| `loxtep_meaning`        | `approve_semantic_package`   | write      |
| `loxtep_meaning`        | `reject_semantic_package`    | write      |
| `loxtep_meaning`        | `list_semantic_proposals`    | read       |
| `loxtep_meaning`        | `infer_proposal_definitions` | write      |
| `loxtep_meaning`        | `accept_semantic_proposal`   | write      |
| `loxtep_meaning`        | `reject_semantic_proposal`   | write      |
| `loxtep_package_review` | `review_semantic_package`    | read       |

## MCP mapping

| Step             | `operation`                  | Scope        | Notes                                                                  |
| ---------------- | ---------------------------- | ------------ | ---------------------------------------------------------------------- |
| Search           | `search_semantic_layer`      | organization | Filters: `artifact_types`, `domain`, `domain_id`, `industry_relevance` |
| Get artifact     | `get_semantic_artifact`      | organization | Requires `artifact_type` + `id`                                        |
| Completeness     | `get_semantic_completeness`  | organization | Optional `domain_id` filter                                            |
| Create knowledge | `create_canonical_knowledge` | organization | Requires `type`, `title`, `body`, `classification`                     |
| Get knowledge    | `get_canonical_knowledge`    | organization | Exactly one of `id` (UUID) or `content_ref` (e.g. `wiki:{dp}:{page}`)  |
| List knowledge   | `list_canonical_knowledge`   | organization | Optional: `organization_id`, `lifecycle_state`, `content_ref_prefix`   |
| Update knowledge | `update_canonical_knowledge` | organization | Requires `id` + fields to update                                       |

## Canonical Knowledge Types

The semantic layer supports structured organizational knowledge artifacts that
agents can query for context:

| Type            | Description                                       | Example Use Case                          |
| --------------- | ------------------------------------------------- | ----------------------------------------- |
| `strategy`      | Business strategy, mission, vision, goals         | "What is our Q4 revenue target?"          |
| `positioning`   | Market positioning, competitive differentiation   | "How do we position against competitors?" |
| `brand_voice`   | Brand voice guidelines, tone, communication style | "Write in our brand voice"                |
| `org_structure` | Organizational hierarchy, team structure, roles   | "Who owns the sales domain?"              |
| `process_doc`   | Business processes, procedures, workflows         | "How do we handle customer onboarding?"   |

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

Get by UUID (unchanged):

```json
{
  "operation": "get_canonical_knowledge",
  "id": "<knowledge-uuid>"
}
```

Get by wiki `content_ref` (Steward / dogfood):

```json
{
  "operation": "get_canonical_knowledge",
  "content_ref": "wiki:{data_product_id}:{source_page_id}"
}
```

List draft wiki pages for a data product (Steward / dogfood):

```json
{
  "operation": "list_canonical_knowledge",
  "lifecycle_state": "draft",
  "content_ref_prefix": "wiki:{data_product_id}:"
}
```

Do not pass both `id` and `content_ref` on get.

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

- **Pending connect proposals** — Medium/High confidence is business-field score
  only. Do not accept without `proposal_payload.definition` (or supply
  `definition` on accept). Prefer Infer, then review, then Accept; Reject if the
  field is not a real business term.
- **Ontology/vocabulary management** (thesaurus terms, namespace mappings) is
  **`loxtep_meaning`** - same facade as proposal review. This skill covers
  query/completeness, canonical knowledge, packages, and vocabulary proposal
  review — not graph ontology structure editing.
- **`search_semantic_layer` with `artifact_types: schema` is not domain
  schemas.** It searches `schema_registry_cache` / curated artifacts — not
  `domain_schemas` from `create_schema`. Org **shapes** live under
  `loxtep_define` `list_schemas` / SDK `client.define.shapes.list`. Pack hits
  for “Product” are **concepts**, not the S&S Product shape you applied to a raw
  data product.
- **Do not bind a concept onto a DP that already has an applied shape.** Apply
  the shape to the product; align the shape to the concept in Meaning
  (`client.define.shapes.align`). See
  [docs/concepts/type-vs-pack-alignment.md](../../../docs/concepts/type-vs-pack-alignment.md).
- **Define meaning** = terms (`client.meaning.thesaurus`) + shapes
  (`client.define.shapes`). Ontology concepts are graph types/relationships
  (`client.meaning.ontology`, `node_type` lowercase).
- **Catalog search** is **`loxtep_query`** - use that for broad discovery across
  all artifact types. This Agent-Scope Skill is for the semantic-layer-specific
  search and completeness view.
- **`artifact_types`** (plural) is an array filter - pass multiple types to
  narrow results. Do not confuse with `artifact_type` (singular) used in
  `get_semantic_artifact`.
- **Canonical knowledge** is for organizational knowledge, not data product
  schemas or quality rules. Use `loxtep_define` for schema management and
  `loxtep_define` for quality rules.
- **Do NOT use** workflows, data products, or connectors for storing
  unstructured organizational knowledge. Use canonical knowledge artifacts
  instead.

### COA `list_metrics` / `describe_schema` gaps

There are **no** hosted MCP ops named `list_metrics` or `describe_schema`. Use:

| COA intent                        | Loxtep ops                                                                          |
| --------------------------------- | ----------------------------------------------------------------------------------- |
| List metrics / dimensions         | `search_semantic_layer`, `get_compounding_metric`, `list_quality_rules`             |
| Describe schema / ontology tables | `get_table_schema`, `get_schema`, `list_ontology_concepts`, `get_semantic_artifact` |

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

## Skill attribution (required)

MCP tool calls need a resolvable skill name. Prefer
`_metadata: { "skill_name": "loxtep-semantic-layer" }`; otherwise the server
infers from the operation map or `X-Skill-Name`. Unresolvable calls are denied
(`MISSING_SKILL_ATTRIBUTION`). The skill name also drives scope checks.

## Auth

`loxtep-auth` / login.

## References

- [User story catalog](../../../docs/skills-user-stories.md)
- [COA MCP serve parity](../../../platform-backend/ai/lib/tools/docs/coa-mcp-serve-parity.md)
