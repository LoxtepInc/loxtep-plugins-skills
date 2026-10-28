---
name: loxtep-journey-orchestrator
description:
  Orchestrate the full Connect → Products ↔ Meaning → Use journey. Use when an
  agent needs to take a data source from first connection through to live
  delivery, handling approvals and transitions at each step, or maintain shared
  organization meaning independently of data product promotion.
license: MIT
metadata:
  platform: loxtep
  category: orchestration
  documentation: https://github.com/LoxtepInc/loxtep-plugins-skills/blob/main/kiro/skills/loxtep-journey-orchestrator/SKILL.md
---

<!-- GENERATED FILE -- single source: loxtep/scripts/plugins-skills-generate-skills.mjs. From the loxtep root run `PLUGINS_SKILLS_ROOT=<plugins-skills> node scripts/sync-skills-to-plugins-skills.mjs` (or that generator with PLUGINS_SKILLS_ROOT set). Do not edit client copies; do not run sibling scripts/generate-skills.mjs. -->

# Loxtep journey orchestrator

Guides an agent through the complete journey from connecting a data source to
delivering trusted, AI-ready data across the customer journey, with human
approval where it matters.

> **Scope:** human-supervised execution. Every approval gate requires a human
> decision. Do not attempt to auto-resolve approvals or skip gates.

## When to use

- "Take me through the whole setup" — end-to-end from source to delivery
- "What's next?" — picking up mid-journey and finding the right step
- "Walk me through connecting Shopify and making it ready for my agent"
- Any flow that spans more than one area (Connect → Products, Products ↔
  Meaning, or Products → Use)

For single-step work, use the focused skill for that step directly.

## Choose the journey before acting

- **Shared meaning:** maintain vocabulary, concepts, relationships, or reusable
  shapes without a product. Follow `loxtep-semantic-layer` and
  `loxtep-ontology`: evidence → reuse → draft → typed review → verify artifact
  availability. No connector, delivery, or product promotion is required.
- **Product readiness:** apply verified shared meaning to a particular product,
  then evaluate its own readiness. Follow the steps below.
- **Both:** complete the shared change once, then explicitly apply it to the
  intended products. Track artifact availability and consumer adoption
  separately.

Do not route every review through `list_pending` + `resolve`. Semantic
proposals, product definition revisions, and semantic packages have distinct
typed review operations. Read the artifact's actual state after resolving a
decision. A stale Inbox item is not evidence that an already-applied definition
needs reapproval.

## Connect

**Goal:** A data source is authenticated, sampled, and flowing into a data
product.

**Agent actions:**

1. Confirm MCP session and org context — `get_current_user`,
   `get_current_organization`
2. List domains and projects, then apply the workspace-boundary rule from
   **`data-workflows`**: reuse a project when ownership and execution lifecycle
   are shared; use another project in the same domain for execution isolation;
   create a domain only for distinct semantic ownership or governance. Confirm
   before creating a domain, then record the chosen `project_id`.
3. Follow **`connect-external-system`**: `list_connector_types`, decide public
   vs private, inspect instance runtime (`list_instances`, `list_observe_bots`)
   before creating a private connector
4. Create the connector and authenticate — `create_connector` or `get_oauth_url`
5. **Test connectivity** — `test_connector` (does not start ingestion). Ask
   before `capture_samples`
6. Design and save the ingestion workflow — hand off to `data-workflows` skill
   only with user authorization to ingest
7. Deploy — `deploy_project` or `deploy_workflow`, confirm status is `deployed`

**Done when:** credentials tested (`test_connector` passed), and — if the user
authorized ingest — samples confirmed and deployment status `deployed`.

**Rules:**

- Connection test and ingestion activation are separate; do not deploy just to
  get samples
- Private sources need `network_binding: customer_vpc` and
  `connectors-private-512` on the instance (**`loxtep-instances`**)
- Create the project before any workflow or bundle calls
- Embed data product definitions inside the workflow bundle — do not call
  `create_data_product` directly; deployment provisions it

## Products ↔ Meaning

**Goal:** The data product has approved definitions, relationships, and quality
rules, and is published as trusted.

**Agent actions:**

1. Define what the data means — hand off to `semantic-ontology-mapping` skill
2. Surface the exact draft revision for domain owner review using
   `define-data-product-shape`. Inspect `list_pending` for any associated
   workflow gate, but do not substitute its resolution for definition approval.
3. Apply the approved definition revision and read definition status. Shared
   semantic packages use their own stage/review/approve/deploy/verify path; do
   not require a package for every direct vocabulary or shape edit.
4. Infer and review relationships between entities
5. Generate and review quality rules
6. Establish the required quality, lineage, and delivery interface before
   promotion (use `data-workflows` Flow D for delivery). Then run the **semantic
   medallion** readiness checklist — `get_promotion_readiness` (Raw/In
   Progress/Ready = bronze/silver/gold; orthogonal to `status`)
7. If policy requires a workflow approval, route its exact current request to
   the domain owner using `list_pending` / `resolve`; do not invent another
   gate.
8. Apply medallion promotion — `promote_data_product` with `target_tier`
   `silver` or `gold`

**Done when:** data product `medallion` is at the trusted tier (Ready/gold when
cross-domain use is the goal). Do not confuse with lifecycle `status=active`.

**Rules:**

- Use `list_pending` + `resolve` for workflow approval requests. For semantic
  proposals/packages and definition revisions use their typed review operations;
  verify effects rather than assuming a workflow decision performed the change.
- After each approval, call `record_decision_trace`
- Run `query_context` before each approval gate for current state

## Use

**Goal:** The trusted data product is reachable by agents, apps, and queries
through the channel the user chooses.

**Agent actions:**

1. Verify the delivery interface established before promotion; if another
   channel is needed, author a **delivery workflow**
   (`workflow_type: "delivery"`) with a **`data-product-trigger` head** and a
   **Target** connection at the tail — hand off to `data-workflows` Flow D
   (`get_entity_schemas` → `save_workflow_bundle` → `save_delivery_grant` →
   `deploy_workflow`). Prefer Target `connections/{id}.json` + `connector_id`.
   List existing delivery workflows with `list_workflows`.
2. Verify agent MCP access — confirm the data product appears in
   `list_data_products` and is reachable via the SDK
3. Set access rules — `governance-policies` (`list_governance_policies`,
   `create_governance_policy`, `create_access_request`, `decide_access_request`)
4. Confirm quality and lineage — `get_quality_score`, `get_lineage_impact`

**Done when:** the data product is reachable through the chosen channel and
access rules are enforced.

## Handing off between steps

Each step ends with a clear handoff artifact:

| From               | Handoff                                           | To       |
| ------------------ | ------------------------------------------------- | -------- |
| Connect            | `connector_id` + confirmed samples + `project_id` | Products |
| Products ↔ Meaning | Approved data product, promotion confirmed        | Use      |

If picking up mid-journey, call `query_context` with the data product name to
find current state before deciding which step applies.

## Implementation notes

Internal routing detail for agents that need it. See `loxtep/docs/vocabulary.md`
for the full internal → user language mapping.

**PKO procedure chain:**

| Stage | PKO procedure                              | Skill                                   |
| ----- | ------------------------------------------ | --------------------------------------- |
| P0    | `procedure#agent-session-bootstrap`        | `loxtep-auth`, `loxtep-mcp-session`     |
| P1    | `procedure#connect-external-system`        | `connect-external-system`               |
| P1    | `procedure#capture-connector-samples`      | `connect-external-system`               |
| P2    | `procedure#design-ingestion-workflow`      | `data-workflows`                        |
| P2    | `procedure#deploy-ingestion-workflow`      | `loxtep-build`, `loxtep-workspace`      |
| P3    | `procedure#define-data-product-semantics`  | `semantic-ontology-mapping`             |
| P3    | `procedure#materialize-iceberg-table`      | `loxtep-analytics`                      |
| P3    | `procedure#establish-data-standards`       | `org-semantics-quality`                 |
| P4    | `procedure#register-delivery-interface`    | `data-product-modeling`                 |
| P4    | `procedure#promote-data-product-medallion` | `promote-data-product`                  |
| P5    | `procedure#enable-agent-mcp-access`        | `loxtep-mcp-session`, `mcp-integration` |
| P6    | `procedure#govern-data-access`             | `governance-policies`                   |
| P7    | `procedure#maintain-ai-ready-asset`        | `discover-govern-lineage`               |

**Step → journey mapping:** P0–P2 = Connect and Products · P3–P4 = Products ↔
Meaning · P5 = Use enablement · P6–P7 = Organization governance and ongoing
Observe evidence. Inbox supplies human decisions across all phases.

**Promotion gates:** `procedure#establish-data-standards` and
`procedure#register-delivery-interface` run **before** promotion because their
outputs are Ready (Gold) gates. Steps that clear a gate declare
`metadata.satisfies_gates`; whether a gate blocks is per-org
(`governance_policies.blocks_promotion`, seeded from the governance tier).
Registry: `platform-backend/_core/src/medallion/promotion-gates.json`. Blocking
gates come first; non-blocking ones are always still offered as suggestions.

**HITL gates:** `hitl_gate: approval` steps are parked as `approval_request`
records by the PKO execution engine. Resolve via `loxtep_review`
(`list_pending`, `resolve`) or `client.review.approvals.*` in the SDK
(`@loxtep/sdk@0.9.7+`; CLI: `loxtep approvals`).

**CDLC cross-track:** P3 feeds `procedure#bridge-dp-semantics-to-cdlc` and
`procedure#cdlc-memory-promotion-inbox`. New-source semantics must **not**
`dependsOn` `procedure#cdlc-approve-and-deploy-artifact` (that gate deadlocks
first-source Inbox HITL — LOX-1808). Deployed glossary for promote is a P4
readiness/policy concern after the bridge, not a P3 start gate.

**Bundle authoring (P2):** use `save_workflow_bundle` only. Do not use
`patch_workflow_graph` for new flows. Handoff from P1 = `connector_id` + samples
→ `data-workflows` Flow E (Trigger at ingest head). Delivery (P5) = Flow D
(`data-product-trigger` head + Target at tail + grant,
`workflow_type: "delivery"`).

**CLI methodology (code-first):** `ingest create` → `transform create` →
`delivery create` → `lint` → `push` → `deploy`. MCP stays primitives:
`get_entity_schemas` → `save_workflow_bundle` → `save_delivery_grant` →
`deploy_workflow`.

**Platform graph:** loaded via `graph-seed-platform-pko` bot for system org;
tenants read via `query_context` / federated `get_procedure`.

**Master graph:**
`platform-backend/graph/platform-pko/loxtep-data-to-ai-ready.jsonld`
