# Seeding Loxtep from an OKF / LLM-Wiki Bundle

**Audience:** Engineers and agents seeding a Loxtep workspace's **semantic layer,
ontology, and process graph (PKOs)** from an existing knowledge base authored in
the **Open Knowledge Format (OKF v0.1)** — a.k.a. an "LLM wiki."

**Status:** Mapping contract (v0.1). Validated by dogfooding against Loxtep's own
OKF wiki before being offered as a customer onboarding path. Treat the
relationship-typing rules (below) as the part most likely to change as we learn.

**Why this exists.** Most orgs already have knowledge written down — wikis,
runbooks, competitive notes, glossaries. An OKF bundle is that knowledge in a
**typed, cross-linked** form. This document defines how an OKF bundle deterministically
populates Loxtep's three discovery layers (structured graph → keyword → semantic),
so a customer can go from "we have a wiki" to "agents query our governed context"
without hand-modeling an ontology from scratch.

---

## TL;DR

- An OKF bundle **is already a knowledge graph** serialized as markdown: `type:`
  frontmatter ≈ ontology classes, documents ≈ concept/entity nodes, root-absolute
  markdown links ≈ graph edges, `tags` ≈ thesaurus terms, body text ≈ embedding
  material.
- Seeding is a deterministic walk of the bundle that emits Loxtep ontology
  concepts, relationships, thesaurus terms, entity context, canonical knowledge,
  and process graphs via the **organization-scoped** `loxtep_ontology`,
  `loxtep_semantic_layer`, `loxtep_process_intel`, and `loxtep_procedures` tools.
- The **one real gap** is that OKF links are *untyped*. We close it with a default
  inference table (source-type × target-type × section) plus an optional explicit
  `relations:` extension, and reconcile with `loxtep_context_mining`.
- **At team scale**, every user seeds their own wiki as attributed **draft** context;
  the **CDLC** (mining → identity resolution → promotion) solidifies it into one
  governed, canonical org context. See [Multi-author seeding & CDLC promotion](#multi-author-seeding--cdlc-promotion).

---

## What an OKF bundle is

OKF v0.1 is a minimally opinionated markdown convention. The only hard rule: every
document has a `type` frontmatter field. Standard queryable fields, in order:
`type`, `title`, `description`, `resource`, `tags`, `timestamp`. Common extra
fields: `status`, `confidence`, `sources`. Internal references are **root-absolute
markdown links** (`[Shopify](/entities/competitors/Shopify.md)`) — never wikilinks.

Reserved files: `index.md` (per-directory navigation) and `log.md` (append-only
change history at the bundle root).

`type` vocabulary (this is the class hierarchy we seed from):

| `type` | Used for |
| --- | --- |
| `entity` | Companies, platforms, products |
| `concept` | Ideas, frameworks, patterns |
| `synthesis` | Cross-cutting analyses |
| `customer` | Customer accounts & engagements |
| `market-analysis` | Market / competitive research |
| `positioning` | Brand & market positioning |
| `reference` | Product / architecture / how-to |
| `learning-note` | Learning material |
| `summary` / `source` | Summary of, or pointer to, a raw source |
| `note` | Misc. notes |
| `index` / `log` | Reserved (navigation, history) — **not seeded as concepts** |

**`type` is free-form in practice.** Real bundles drift off-vocab (`research`,
`analysis`, `briefing`, `market-research`, `content`, `customer-engagement` all
appeared in the dogfood bundle). The seeder applies a **normalization map** to fold
near-synonyms onto the canonical vocabulary before emitting classes
(`market-research → market-analysis`, `research`/`analysis → synthesis`,
`briefing → summary`, `content → reference`, `customer-engagement → customer`).
Extend the map per bundle; unmapped off-vocab types still seed but are flagged.

**Class scoping.** Not every `type` belongs in a *shared* semantic layer. In the
dogfood bundle 90 of 146 docs were `learning-note` (personal study material) and
formed a graph island — excluding them dropped **zero** edges from the semantic
core. The seeder takes include/exclude class filters; choose the seed scope
deliberately rather than dumping the whole bundle.

---

## Core mapping (OKF → Loxtep → MCP)

Each row is the contract. All target operations are **organization-scoped** (no
`project_id`); call them through the grouped MCP tools shown.

| OKF element | Loxtep primitive | MCP tool · `operation` |
| --- | --- | --- |
| `type:` value | Ontology **class** (node type) | `loxtep_ontology` · `create_ontology_concept` (class-level) |
| A document (`entity`/`concept`/`customer`/…) | Ontology **concept node** + **entity context** | `loxtep_ontology` · `create_ontology_concept`; `loxtep_process_intel` · `create_entity_context` |
| `title` | Canonical **term** / node label | `loxtep_ontology` · `create_thesaurus_term`; resolved via `resolve_canonical_key` |
| `description` | **Lexicon** definition / canonical knowledge | `loxtep_semantic_layer` · `create_canonical_knowledge` |
| `tags` | **Thesaurus** terms + catalog tags | `loxtep_ontology` · `create_thesaurus_term` (as aliases); `loxtep_catalog` · `list_tags` |
| Markdown cross-link `[X](/path.md)` | Ontology **relationship** (edge) | `loxtep_ontology` · `create_ontology_relationship` (`from`, `to`, `type`) |
| Document **body** | Embedding material (keyword + vector discovery) | indexed on ingest; queried via `loxtep_semantic_layer` · `search_semantic_layer`, `loxtep_process_intel` · `query_context`, `loxtep_catalog` · `search_catalog` |
| `resource` (canonical URL) | Provenance / evidence pointer | carried on `create_entity_context`; surfaced via `loxtep_catalog` · `get_evidence` |
| `sources:` (frontmatter) | Evidence anchors / decision trace | `loxtep_process_intel` · `record_decision_trace` |
| `synthesis` & procedure-shaped docs | **Process graph (PKO)** | `loxtep_procedures` · `import_process_graph` / `create_procedure` |
| Top-level directory (`entities/`, `customers/`, …) | **Domain** / namespace | `loxtep_ontology` · `register_namespace_mapping`; `loxtep_catalog` · `list_domains` |
| `status` (`active`/`archived`/…) | CDLC **lifecycle state** | `loxtep_cdlc` · `transition_lifecycle` |
| `confidence` (`high`/`medium`/`low`) | Trust / quality signal | governance flag (carried as concept metadata) |
| `log.md` entries | Change propagation / re-seed driver | `loxtep_cdlc` · `propagate_change`; `record_decision_trace` |

`index.md` and `log.md` are navigation/provenance only — parse them for structure
and change history, but **do not** emit them as ontology concepts.

---

## Relationship typing (the gap, and how we close it)

OKF links say *that* two things relate, not *how*. Loxtep edges are typed. We
reuse the relationship vocabulary from
[`semantic-ontology-mapping`](../claude/skills/semantic-ontology-mapping/SKILL.md):
`is-a`, `has-a`, `part-of`, `participates-in`, `produces`, `consumes`, `governs`,
`transforms-into`, `equivalent-to`, `broader-than`, `conflicts-with`,
`relates-to` (fallback).

Four-tier strategy — apply in order, highest-confidence wins:

### 1. Explicit (author-declared) — highest confidence

Optional OKF extension: a `relations:` frontmatter block declares typed edges for
the cases that matter. Backward-compatible (bundles without it still seed fine).

```yaml
relations:
  - to: /entities/competitors/Shopify.md
    type: conflicts-with        # competitor
  - to: /concepts/ecommerce-context/Context-Problem.md
    type: participates-in
```

### 1.5. Semi-explicit (frontmatter ref-lists) — high confidence, zero extra burden

Real OKF bundles already carry typed reference lists in frontmatter — the field
name implies the edge type. These reference targets by **title/stem _or_ path**, so
the seeder resolves them through the same identity index as links. The mapping:

| Frontmatter field | Edge type | Notes |
| --- | --- | --- |
| `entities:` | `participates-in` | usually on `synthesis` docs (the entities the analysis is about) |
| `concepts:` | `participates-in` | concepts the doc is about |
| `related-entities:` | `relates-to` | |
| `related-concepts:` | `relates-to` | |
| `sources:` | `derived-from` | **only when the value resolves to a doc** — see Identity note below |

This tier carried ~20% of edges in the dogfood run **without any authoring change**
and is higher-signal than tier 2. Mine bundles for these fields before falling back
to body-link inference.

### 2. Inferred (deterministic heuristic) — default for plain links

When a link has no explicit type, infer from **(source type, target type, the
section the link appears under)**:

| Source `type` | Target `type` | Section context | Inferred edge |
| --- | --- | --- | --- |
| `entity` | `entity` | "Competitive Position" | `conflicts-with` |
| `entity` | `concept` | any | `participates-in` |
| `customer` | `entity` | any | `consumes` |
| any | `concept` | "Related" | `relates-to` |
| `concept` | `concept` | "broader/parent" cue | `broader-than` |
| any | `source`/`summary` | "Sources" | `derived-from` → `record_decision_trace` |
| `synthesis` | any | body reference | `participates-in` (process step binding) |
| _fallback_ | _any_ | _any_ | `relates-to` |

### 3. Reconciled (platform mining) — catches what heuristics miss

After the deterministic pass, run `loxtep_context_mining` · `run_mining_pass`,
review `list_candidates`, and `act_on_candidate` to promote high-value inferred
edges. This is the human-in-the-loop checkpoint.

> **Empirical guidance (from the dogfood run — see findings below):** tier 2 alone
> collapses toward the `relates-to` catch-all (~58% of edges) and produces **zero**
> high-value typed edges like `conflicts-with`, even over a competitive-positioning
> corpus. **Recommendation:** rely on tiers 1.5 + 2 for breadth, but require **tier 1
> `relations:`** for the edges that carry business meaning (competitor
> `conflicts-with`, `produces`/`consumes`, `governs`). Don't expect inference to
> manufacture semantics the author never wrote down.

---

## Identity & idempotency

Re-seeding must be an **upsert**, not a duplicate. Identity rules:

- **Canonical key** = the document's root-absolute path (e.g.
  `/entities/competitors/Shopify.md`). Stable across edits, unique per bundle.
  Register via `resolve_canonical_key`; `title` and `tags` become aliases.
  At team scale this key is **namespaced per user** while in draft and resolved to a
  shared canonical key at promotion — see
  [Multi-author seeding & CDLC promotion](#multi-author-seeding--cdlc-promotion).
- **Ref resolution is by path _or_ title/stem.** Frontmatter ref-lists name targets
  by title/filename-stem, not path, so the seeder builds an identity index
  (path → record, plus stem and title lookups) in a first pass and resolves all refs
  against it.
- **`sources:` is overloaded** — in real bundles it is sometimes a doc reference,
  sometimes a count, sometimes prose (`sources: 4 (Gmail threads…)`). Treat a
  `sources` value as an edge **only if it resolves** to a doc; otherwise skip it
  silently (it is provenance prose, not a graph edge — keep it on the record's
  `provenance`, not as an edge).
- **Unresolved typed refs are wiki gaps, not errors.** When an `entities:`/`concepts:`
  ref fails to resolve, the target doc doesn't exist — surface these as
  phantom-concept lint (docs to author), not as silent drops.
- On re-seed, the canonical key resolves the existing concept → `update_*` instead
  of `create_*`.
- **Incremental re-seed:** diff `log.md` (or git) since the last seed; for changed
  docs call `loxtep_cdlc` · `propagate_change` so dependent artifacts update and
  `list_propagation_lineage` records the ripple.

---

## Seed pipeline (ordered)

1. **Parse + index** the bundle → in-memory graph (nodes = docs, edges = links) and
   an identity index (path / stem / title) for ref resolution. Skip `index.md` /
   `log.md` as concepts; keep them for structure + history.
2. **Normalize + scope** — fold off-vocab `type` values via the normalization map;
   apply the include/exclude class filter to choose the seed scope.
3. **Domains** — map top-level directories → domains/namespaces
   (`register_namespace_mapping`).
4. **Classes** — emit one ontology class per normalized `type`
   (`create_ontology_concept`, class-level).
5. **Nodes** — for each in-scope document, upsert a concept
   (`create_ontology_concept`), keyed by canonical path; definition from
   `description` + body summary.
6. **Vocabulary** — emit `create_thesaurus_term` for each `title`; fold `tags` and
   naming variants in as aliases. Bulk: `sync_vocabulary`.
7. **Knowledge & context** — `create_canonical_knowledge` (definition) and
   `create_entity_context` (body + `resource`/`sources` provenance) per node.
8. **Edges** — resolve every ref/link to an edge with a type from the 4-tier
   strategy (`create_ontology_relationship`); route resolvable `sources` to
   `record_decision_trace`; skip edges whose target is out of scope.
9. **Process graphs (PKOs)** — convert `synthesis` and procedure-shaped docs to
   process graphs (`import_process_graph` / `create_procedure`), anchored to the
   entity/concept nodes they reference.
10. **Lifecycle & trust** — set state from `status` (`transition_lifecycle`) and
    carry `confidence` as a trust signal.
11. **Reconcile** — `run_mining_pass` → review candidates → promote.

A convenient intermediate representation (the exporter's output, one record per
doc) keeps the walk decoupled from the MCP calls:

```yaml
canonical_key: /entities/competitors/Shopify.md
class: entity                 # from type (normalized)
domain: entities              # from top-level directory
label: Shopify                # from title
definition: "..."             # from description
aliases: [commerce-platform, shopify-plus]   # from tags + filename stem
provenance: { resource: https://..., sources: [/summaries/...] }
lifecycle: active             # from status
confidence: high
off_vocab_class: false
edges:
  # `via` records which tier produced the edge: explicit | fm:<field> | body:<section>
  - { to: /concepts/ecommerce-context/Context-Problem.md, type: participates-in, via: "fm:concepts" }
  - { to: /summaries/shopify-q3-2026.md, type: derived-from, via: "body:Sources" }
```

This is exactly the output of the reference exporter,
[`scripts/seed_from_okf.py`](../scripts/seed_from_okf.py).

---

## Multi-author seeding & CDLC promotion

A Loxtep organization contains **users** and **domains**. The team pattern is:
**every user seeds their own OKF wiki, then the org solidifies the combined context
through the Context Development Lifecycle (CDLC).** Branch → pull request → main:
personal wikis are branches; CDLC promotion is the merge to canonical org context.
The single-author pipeline above runs **per user**; this section is the orchestration
on top.

### Two namespace axes: author (user) × domain

Every seeded record is located on two axes:

- **Author = the authenticated user.** Authorship is established automatically by *who
  is signed in when the seed runs* (`loxtep_session` · `get_current_user`). Each user
  runs the exporter under their own OAuth, so everything they emit is **their** draft
  candidate context — no manual author stamping.
- **Domain = the shared subject classification.** Domains are org-level
  (`loxtep_catalog` · `list_domains`). Map each wiki's top-level directories (and/or
  tags) to an existing `domain_id` via `register_namespace_mapping`; leave unmapped
  content unassigned for curation. Domains are **shared across users** — they're how
  two people's "Customers" knowledge lands in the same place.

So the address of any fact is `organization → (user = who authored, draft scope) ×
(domain = what subject, shared)`.

### Lifecycle: draft in, canonical out

Personal seeds **never** write straight to canonical. They enter as **draft** (map
`status` → lifecycle; default `draft` for any personal seed) and become canonical only
through promotion:

```
User A wiki ─seed→ ┐
User B wiki ─seed→ ├─ per-user DRAFT candidates (attributed, domain-tagged)
User C wiki ─seed→ ┘
                     │  run_mining_pass → list_candidates        (cross-user)
                     ▼
             identity resolution + conflict reconcile
                     │  promote_candidate / create_canonical_knowledge
                     ▼
             CANONICAL org context   (transition_lifecycle: draft → canonical)
                     │  propagate_change → list_propagation_lineage
                     ▼
             downstream artifacts stay consistent + audited
```

### Solidification (the merge), step by step

1. **Per-user draft seed** — each user runs the [seed pipeline](#seed-pipeline-ordered)
   under their own auth; records are draft, attributed, domain-mapped. Namespace the
   canonical key by user while draft (`user:<id>:/entities/.../Shopify.md`) so two
   people's identical paths don't collide.
2. **Surface candidates** — `loxtep_context_mining` · `run_mining_pass` →
   `list_candidates` across all users' drafts.
3. **Resolve identity** — collapse the same real entity seeded by multiple users into
   one canonical key (`resolve_canonical_key` + thesaurus crosswalk). Five "Shopify"
   drafts → one canonical Shopify; aliases/tags union, links re-point.
4. **Reconcile conflicts** — where definitions differ, this is a **review task, not
   last-write-wins**. Record disagreement as `conflicts-with` and resolve to a canonical
   definition (the crosswalk methodology in
   [`semantic-ontology-mapping`](../claude/skills/semantic-ontology-mapping/SKILL.md));
   keep each user's version as provenance.
5. **Promote** — `loxtep_process_intel` · `promote_candidate` /
   `loxtep_semantic_layer` · `create_canonical_knowledge` lifts the reconciled concept
   to org canonical at its `domain_id`; `loxtep_cdlc` · `transition_lifecycle` moves it
   draft → canonical.
6. **Propagate** — `loxtep_cdlc` · `propagate_change` updates dependents;
   `list_propagation_lineage` gives the audit trail of what was promoted and why.

### Governance — who can promote

Seeding is open to **every** user (their own drafts only). **Promotion to canonical is
RBAC-gated** to domain owners / curators. `confidence` and authorship travel with every
record so reviewers can weigh sources. This gate is what keeps "ten people's notes" from
becoming "ten conflicting truths" — the exact failure mode Loxtep sells against.

### Worked example

Three teammates seed personal wikis; each has an `entities/.../Shopify.md` and a
`Decision-Traces` concept:

- Draft load → 3 Shopify drafts (`user:nate:…`, `user:chris:…`, `user:matson:…`) and
  3 Decision-Traces drafts, all attributed + domain-tagged.
- `run_mining_pass` flags them as duplicate candidates.
- Identity resolution → **one** canonical Shopify (union of aliases/tags, links
  re-pointed) and **one** canonical Decision-Traces.
- Nate's and Chris's Decision-Traces definitions are compatible → merge. Matson's
  differs → `conflicts-with`; a domain owner reconciles to the canonical definition and
  keeps Matson's as provenance.
- Domain owner `promote_candidate` → canonical; `transition_lifecycle` draft → canonical;
  `propagate_change` updates the syntheses that referenced it.

Result: every user contributed, and the org has **one governed, attributed,
conflict-resolved** context — not N siloed copies.

### Seed-record additions for multi-author

```yaml
canonical_key: /entities/platforms/Shopify.md               # shared logical identity (resolves cross-user)
draft_key: "user:@me:/entities/platforms/Shopify.md"        # per-user draft store key (no cross-user collision)
seeded_by: "@me"                # '@me' = resolved at load from loxtep_session.get_current_user (automatic)
domain: customers               # mapped dir -> org domain (loader resolves to domain_id via list_domains)
lifecycle: draft                # default for personal seeds; promoted to canonical via the CDLC
```

The exporter emits a `meta` header (`seeded_by`, `lifecycle`, `domain_map`, counts) plus the
records. Authorship is **not** hard-coded: `seeded_by` defaults to the `@me` sentinel and the
load step resolves it to the real Loxtep user id via `loxtep_session` · `get_current_user` —
so whoever is authenticated when the seed loads *is* the author. `--user <id>` pins it for
offline review; `--domain-map` maps directories to org domains.

---

## Validation

After a seed, confirm the three layers answer real questions:

- **Coverage** — `loxtep_semantic_layer` · `get_semantic_completeness` (per domain).
- **Structured** — `loxtep_ontology` · `get_ontology_relationships` on a known node
  returns the expected typed edges.
- **Keyword/semantic** — `loxtep_catalog` · `search_catalog` and
  `loxtep_process_intel` · `query_context` return the source docs for
  natural-language questions that share **no keywords** with them (the real test of
  the embedding layer).
- **Round-trip** — `resolve_canonical_key` on a `title`/alias returns the right
  canonical concept.

---

## Dogfood findings (v0.1 run — Loxtep's own OKF wiki, 2026-06-17)

First run of [`scripts/seed_from_okf.py`](../scripts/seed_from_okf.py) over Loxtep's
own 182-file OKF bundle. What the data taught us (already folded into the rules above):

- **Scope deliberately.** 90 of 146 emitted docs were `learning-note` and formed a
  disconnected island — excluding them dropped **0 edges** from the semantic core
  (56 records). Personal study notes ≠ shared semantic layer. → class filter.
- **Normalize off-vocab types.** 6 docs used near-synonym types
  (`research`/`analysis`/`briefing`/`content`/`market-research`/`customer-engagement`).
  → normalization map.
- **Inference plateaus at `relates-to`.** 163 edges: `relates-to` 91 (56%),
  `participates-in` 59, `derived-from` 9, `consumes` 4, **`conflicts-with` 0** —
  despite a full competitive-positioning corpus. 80% of edges came from tier-2 body
  inference, 20% from tier-1.5 ref-lists, **0% explicit**. → high-value edges need
  tier-1 `relations:`; don't expect inference to invent them.
- **The resolver is a free wiki linter.** It found **10 phantom refs** — entities and
  concepts referenced but never authored (`Shopify`, `Stripe`, `Zendesk`, `Nango`,
  `Microsoft GraphRAG`, `Modern Data Company`, `Joe Reis`, concepts `Semantic-Layer`,
  `Data-Products`, `Decision-Traces`) — plus 12 `sources:` values that were
  counts/prose, not refs. The phantoms are a real backlog of pages to write before
  the seed is high-quality.

**Next:** load the core seed into the Loxtep **dev** instance via MCP (step 3), then
validate retrieval and decide whether to author tier-1 `relations:` for the
high-value edges inference can't type.

## Relationship to existing skills

| Skill | Role relative to seeding |
| --- | --- |
| [`semantic-ontology-mapping`](../claude/skills/semantic-ontology-mapping/SKILL.md) | The *methodology* — deciding what concepts/edges should exist. OKF seeding is one concrete **input source** for it. |
| [`loxtep-ontology`](../claude/skills/loxtep-ontology/SKILL.md) | The MCP **CRUD** for ontology/thesaurus/namespaces this pipeline drives. |
| [`org-semantics-quality`](../claude/skills/org-semantics-quality/SKILL.md) | Semantic layer + quality rules — validates seed completeness. |
| [`loxtep-procedures`](../claude/skills/loxtep-procedures/SKILL.md) | Process graph (PKO) CRUD for step 8. |
| [`loxtep-process-intel`](../claude/skills/loxtep-process-intel/SKILL.md) | Entity context + decision traces + unified context retrieval. |

**Next artifact:** a `seed-from-okf` skill bundle that operationalizes this
contract (bundle parser → intermediate records → MCP calls), with the exporter as
its reference implementation.

## References

- OKF v0.1 contract: the source bundle's `WIKI.md` (format) and `.TEMPLATES.md`
  (page templates).
- MCP tool surface & scopes: [`AGENTS.md`](../AGENTS.md) (`loxtep_ontology`,
  `loxtep_semantic_layer`, `loxtep_process_intel`, `loxtep_procedures`,
  `loxtep_catalog`, `loxtep_cdlc`, `loxtep_context_mining`).
- Concept definitions: [`docs/context-layer-glossary.md`](context-layer-glossary.md).
