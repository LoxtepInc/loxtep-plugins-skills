# Enterprise Context Layer — Canonical Glossary

> **Single source of truth** for category language across all Loxtep surfaces
> (marketing site, skills bundles, SDK/CLI docs, AGENTS.md, frontend labels).
>
> Other artifacts (marketing copy, blog posts, SKILL.md bundles, SDK README)
> reference this file; they do not define terms independently.
>
> Vocabulary and concept names SHALL be consistent across all surfaces
> (Requirement 9.2).

---

## Category

### Enterprise Context Layer (ECL)

| Field | Value |
|-------|-------|
| **Definition** | The system that turns organizational knowledge, expertise, and norms into machine-usable context for AI across heterogeneous systems. |
| **Loxtep realization** | Loxtep's primary category positioning. The platform as a whole — governed data products on a streaming backbone, semantic layer, process graph, and scoped skills — constitutes the ECL. |
| **Status** | ✅ Shipped (existing infrastructure) |

---

## Context Substrate (three integrated parts)

The machine-usable substance of context. The substrate is what makes context
durable, governed, and compounding — not ephemeral prompt fragments.

### Part 1: AI-Ready Data + Knowledge Graph

| Field | Value |
|-------|-------|
| **Definition** | Governed, structured data assets and their interconnections — the factual foundation that AI systems read from and reason over. |
| **Loxtep realization** | Governed data products (source + consumer) on the rstreams streaming backbone; entity context graph (`loxtep_process_intel` → `get_entity_context`, `query_entity_context`); catalog discovery (`loxtep_catalog` → `run_discovery`, `search_catalog`). |
| **Status** | ✅ Shipped |

### Part 2: Semantics + Ontology

| Field | Value |
|-------|-------|
| **Definition** | The meaning layer — definitions, relationships, canonical keys, namespaces, and vocabulary that let AI resolve ambiguity and speak the organization's language. |
| **Loxtep realization** | Semantic layer (`loxtep_semantic_layer`); lexicon and thesaurus (`loxtep_ontology` → `list_thesaurus_terms`, `resolve_canonical_key`); ontology concepts and relationships; namespace mappings; connector vocabulary inference pipeline. |
| **Status** | ✅ Shipped |

### Part 3: Skills (Procedures + Norms)

| Field | Value |
|-------|-------|
| **Definition** | Encoded procedural knowledge ("how work gets done") and the access norms that constrain agent behavior. |
| **Loxtep realization** | Organizational Skills via the process graph (`loxtep_procedures`); Agent-Scope Skills via scoped `.loxtep/skills/` bundles and `SKILL.md` files; decision traces (`loxtep_process_intel` → `list_decision_traces`). |
| **Status** | ✅ Shipped |

---

## Five Capabilities

### 1. Context Mining

| Field | Value |
|-------|-------|
| **Definition** | AI-assisted reverse-engineering of business operations from connected systems and runtime signals (query history, agent traces, event logs, human overrides), producing Context_Candidates for human review. |
| **Loxtep realization** | `loxtep_context_mining` MCP tool (operations: `run_mining_pass`, `list_candidates`, `act_on_candidate`). Builds on `procedure-inference.ts`, `connector-vocabulary-inference`, catalog discovery, analytics/query history, queue/event history, and decision traces. |
| **Status** | ✅ Shipped |

### 2. Context Development Lifecycle (CDLC)

| Field | Value |
|-------|-------|
| **Definition** | The managed lifecycle of a context artifact — `draft → in_review → approved → deployed → retired` — with versioning, dependency tracking, and change propagation policies. Orthogonal to medallion quality maturity and to catalog lifecycle status. |
| **Loxtep realization** | `loxtep_cdlc` MCP facade (operations: `get_artifact_lifecycle`, `transition_lifecycle`, `propagate_change`, `list_propagation_lineage`, `list_context_dependencies`). Extends existing schema versioning, workspace versioning (`restore_version`, `compare_versions`), and lineage (`get_lineage_impact`). |
| **Status** | ✅ Shipped |

### 3. Compounding Learning Loops

| Field | Value |
|-------|-------|
| **Definition** | The mechanism by which episodic experience (decision traces) is promoted, after eval/review/certification, into durable semantic or procedural memory that future agents inherit. This is the engine that builds Token_Capital. |
| **Loxtep realization** | Memory Promotion service — `list_promotion_candidates`, `promote_candidate` (on `loxtep_process_intel` facade). Extends decision traces, procedure inference, and procedure anomaly detection. Promotion routes through the CDLC. Observable via `get_compounding_metric`. |
| **Status** | ✅ Shipped |

### 4. Activation & Retrieval

| Field | Value |
|-------|-------|
| **Definition** | The delivery formats (Activation Dialects) through which one governed context substrate is consumed by heterogeneous systems. "One layer, many dialects." |
| **Loxtep realization** | Already multi-dialect: MCP (hosted tool surface), REST/API (platform backend), SQL/analytics (DuckDB via `loxtep_analytics`), webhook/streaming (rstreams events, queue replay), typed SDK (`@loxtep/sdk`), graph/entity context (`loxtep_process_intel` → entity context). |
| **Status** | ✅ Shipped |

### 5. Governance & Observability

| Field | Value |
|-------|-------|
| **Definition** | The controls that keep context trustworthy — access control, quality enforcement, lineage tracking, PII handling, and observable metrics that prove the layer is improving. |
| **Loxtep realization** | RBAC and scope enforcement (fail-closed Agent-Scope Skills); quality rules (`loxtep_quality`); lineage and impact analysis (`loxtep_catalog` → `get_lineage_impact`); PII tagging (`loxtep_schemas` → `tag_pii_fields`); governance flags (`get_governance_flags`). Compounding Metric extends this. |
| **Status** | ✅ Shipped (including Compounding Metric) |

---

## Skill Model

### Organizational Skill

| Field | Value |
|-------|-------|
| **Definition** | A reusable, versionable, testable unit of procedural knowledge ("how work gets done") plus the norms that constrain it. A skill does for procedural knowledge what a function did for logic. |
| **Loxtep realization** | The process-graph **procedure** entity (PKO namespace) — `loxtep_procedures` MCP tool. Attributes: name/identifier, version, owner, triggers, steps, decisions, dependencies. |
| **Relationship** | Organizational Skills compound: the same procedure is reused by many agents rather than re-derived per agent. |
| **Status** | ✅ Shipped |

### Agent-Scope Skill

| Field | Value |
|-------|-------|
| **Definition** | A scoped integration bundle (`SKILL.md` / `.loxtep/skills/<name>.yaml`) that declares which platform resources and operations an agent may reach inside a workspace. Enforced fail-closed. |
| **Loxtep realization** | Skill bundles in `loxtep-plugins-skills` (per-client `SKILL.md` files); `.loxtep/skills/` scope files in code-first workspaces; scope enforcement returns `SCOPE_VIOLATION` on out-of-scope access. |
| **Relationship** | Distinct from Organizational Skills. Agent-Scope Skills govern *what an agent can touch*; Organizational Skills encode *how work gets done*. |
| **Status** | ✅ Shipped |

---

## Supporting Concepts

### Context Candidate

| Field | Value |
|-------|-------|
| **Definition** | A proposed semantic definition, conflict resolution, procedure, or policy surfaced by Context Mining or Memory Promotion, pending human approval. Lifecycle: `candidate → approved | rejected`. |
| **Loxtep realization** | `context_candidates` store — `(candidate_id, candidate_type, status, payload, provenance_refs[], mining_run_id?, created_at)`. Surfaced via `loxtep_context_mining` → `list_candidates` and `loxtep_process_intel` → `list_promotion_candidates`. |
| **Status** | ✅ Shipped |

### Semantic Conflict

| Field | Value |
|-------|-------|
| **Definition** | A detected disagreement where two or more resolved canonical keys map to definitions that differ in SQL expression, field reference, or prose description (Jaccard similarity < 0.7 on tokenized terms). |
| **Loxtep realization** | Detected by the Context Mining semantic-conflict pass; groups definitions by `resolve_canonical_key` output and flags disagreeing groups. Surfaced as a Context_Candidate for human resolution. |
| **Status** | ✅ Shipped |

### Context Artifact

| Field | Value |
|-------|-------|
| **Definition** | Any governed unit of context that participates in the CDLC: data product schema, semantic/thesaurus term, ontology concept, procedure, quality rule, or canonical knowledge document. |
| **Loxtep realization** | An abstract view over existing concrete entities. Each gains additive `lifecycle_state`, `change_propagation_policy`, and `owner` fields. Managed via `loxtep_cdlc`. |
| **Status** | ✅ Shipped |

### Change Propagation Policy

| Field | Value |
|-------|-------|
| **Definition** | The rule governing what happens to downstream dependents when a Context_Artifact changes. |
| **Values** | `auto_propagate` · `queue_review` (default) · `freeze_until_certified` |
| **Loxtep realization** | Per-artifact field evaluated by the Change Propagation Engine on deploy. `auto_propagate` applies updates transactionally; `queue_review` creates review tasks for owners; `freeze_until_certified` blocks dependent deploy until certified. |
| **Status** | ✅ Shipped |

### Context Development Lifecycle (CDLC) — Lifecycle States

| Field | Value |
|-------|-------|
| **Definition** | The allowed lifecycle states for a Context_Artifact. |
| **States** | `draft → in_review → approved → deployed → retired` (plus rollback paths) |
| **Loxtep realization** | Additive `lifecycle_state` enum column on artifact entities; default `deployed` for existing rows (preserves behavior). Transitions enforced server-side; illegal transitions rejected. |
| **Status** | ✅ Shipped |

### Token Capital

| Field | Value |
|-------|-------|
| **Definition** | The firm's owned AI capability — the accumulated context, procedures, decisions, and evals that make its agents smarter over time, independent of any particular model. Human capital remains the driver; token capital is the compounding artifact. |
| **Loxtep realization** | The context layer IS token capital. It is model-independent (lives in the customer's instance, not in model weights), it compounds (the learning loop promotes experience into durable context), and it is the firm's sovereign IP. Substantiated by the Compounding_Metric showing measurable growth over time. |
| **Status** | ✅ Shipped (narrative + metric substantiation) |

### Memory Promotion

| Field | Value |
|-------|-------|
| **Definition** | The act of converting a recurring decision-trace pattern or agent correction into a durable Context_Artifact (policy, procedure, semantic preference). A pattern qualifies when it recurs ≥ N times (default N = 5) with consistent outcomes. |
| **Loxtep realization** | Memory Promotion service groups decision traces by `(anchor/entity_type, procedure_id, decision_id, outcome)`; threshold-qualified patterns become promotion candidates. Approved promotions create/update artifacts via the CDLC. |
| **Status** | ✅ Shipped |

### Canonical Knowledge

| Field | Value |
|-------|-------|
| **Definition** | Narrative organizational context — strategy, brand voice, positioning, org charts — modeled as a first-class Context_Artifact with CDLC lifecycle, governance metadata, and dependency participation. |
| **Loxtep realization** | New artifact type: `(id, type, title, body/content_ref, owner, classification, version, lifecycle_state, change_propagation_policy)`. Discoverable via semantic layer/catalog; retrievable via MCP; participates in dependency propagation. |
| **Status** | ✅ Shipped |

### Activation Dialect

| Field | Value |
|-------|-------|
| **Definition** | A delivery format through which context is consumed. One governed substrate, many dialects. |
| **Dialects** | MCP · REST/API · SQL/Analytics · Webhook/Streaming · Typed SDK · Graph/Entity Context |
| **Loxtep realization** | MCP (`mcp.loxtep.io`), REST (platform API Gateway), SQL (DuckDB via `loxtep_analytics`), Webhook/Streaming (rstreams events, `replay_events`, `read_queue_events`), SDK (`@loxtep/sdk` + CLI), Graph (`loxtep_process_intel` entity context + `loxtep_ontology` relationships). |
| **Status** | ✅ Shipped |

### Compounding Metric

| Field | Value |
|-------|-------|
| **Definition** | An observable measure computed from existing platform counters that demonstrates context is improving over time. |
| **Primary metric** | `certified_procedures_over_time` — count of procedures with `lifecycle_state = deployed` at each calendar-week boundary. |
| **Secondary metrics** | `promoted_patterns_count` (candidates promoted to artifacts); `decision_trace_reuse_ratio` (traces resolving to an existing procedure vs. unmatched). |
| **Loxtep realization** | Computed from `process-intelligence-usage.ts` counters (`procedures_discovered`, `decision_traces`, `procedure_executions`, `context_graph_triples`). Exposed via `loxtep_analytics` → `get_compounding_metric`; surfaced on frontend catalog/overview via CompoundingMetricCard. |
| **Status** | ✅ Shipped |

### Compounding Learning Loop

| Field | Value |
|-------|-------|
| **Definition** | The full feedback cycle: agents execute → decision traces record → patterns detected → promotion candidates surface → human approves → durable artifact created → future agents inherit improved context → cycle repeats. Each iteration makes the layer smarter. |
| **Loxtep realization** | Decision traces (`record_decision_trace`) → procedure inference (`procedure-inference.ts`) → Memory Promotion → CDLC (`transition_lifecycle` to `deployed`) → activation via any dialect → next agent reads improved context. Observable via `get_compounding_metric` (certified_procedures_over_time). |
| **Status** | ✅ Shipped |

---

## Status Legend

| Icon | Meaning |
|------|---------|
| ✅ | Shipped — capability exists in the current platform |

> All capabilities and supporting concepts are now shipped. The 🗺️ Roadmap
> marker is no longer in use. If a future capability is added before
> implementation, mark it 🗺️ Roadmap and apply Usage Rule 2 below.

---

## Usage Rules

1. **All surfaces reference this glossary.** Marketing copy, AGENTS.md,
   SKILL.md bundles, SDK/CLI docs, and frontend labels use the exact term names
   and definitions above.
2. **Roadmap-gated copy.** Any capability marked 🗺️ Roadmap MUST be described
   as planned/upcoming in customer-facing materials until its implementing phase
   ships. (Requirement 1.6, Correctness Property 8.) As of the current release,
   no capabilities carry this marker.
3. **Do not invent synonyms.** Use "Organizational Skill" not "org procedure,"
   "platform skill," or "workflow skill." Use "Agent-Scope Skill" not "scope
   bundle" or "access skill."
4. **Qualify bare "skill."** Where context is ambiguous, always qualify as
   either "Organizational Skill" or "Agent-Scope Skill." (Requirement 2.3.)
5. **Framework alignment.** Where the Enterprise Context Layer framework uses
   "context substrate" and "capabilities," Loxtep positioning uses the same
   terms. (Requirement 1.4.)
