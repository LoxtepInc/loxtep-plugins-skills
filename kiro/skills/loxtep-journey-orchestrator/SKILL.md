<!-- GENERATED FILE -- edit skills/<slug>/SKILL.md (or rule.mdc.src.md) and run `node scripts/generate-skills.mjs` -- do not edit directly -->
---
name: loxtep-journey-orchestrator
description:
  Orchestrate the full Connect → Organize → Use journey. Use when an agent needs
  to take a data source from first connection through to live delivery, handling
  approvals and transitions at each step.
license: MIT
metadata:
  platform: loxtep
  category: orchestration
  documentation: https://github.com/LoxtepInc/loxtep-plugins-skills/blob/main/kiro/skills/loxtep-journey-orchestrator/SKILL.md
---

# Loxtep journey orchestrator

Guides an agent through the complete journey from connecting a data source to
delivering trusted, AI-ready data — across three steps with human approval where
it matters.

> **Scope:** human-supervised execution. Every approval gate requires a human
> decision. Do not attempt to auto-resolve approvals or skip gates.

## When to use

- "Take me through the whole setup" — end-to-end from source to delivery
- "What's next?" — picking up mid-journey and finding the right step
- "Walk me through connecting Shopify and making it ready for my agent"
- Any flow that spans more than one step (Connect → Organize, or Organize → Use)

For single-step work, use the focused skill for that step directly.

## Connect

**Goal:** A data source is authenticated, sampled, and flowing into a data product.

**Agent actions:**
1. Confirm MCP session and org context — `get_current_user`, `get_current_organization`
2. Create or reuse a project — `create_project` or `list_projects`, record `project_id`
3. List available connector types — `list_connector_types`
4. Create the connector and authenticate — `create_connector` + `get_oauth_url`
5. Capture sample records — `capture_samples`
6. Design and save the ingestion workflow — hand off to `data-workflows` skill
7. Deploy — `deploy_project` or `deploy_workflow`, confirm status is `deployed`

**Done when:** data is flowing, samples confirmed, deployment status `deployed`.

**Rules:**
- Capture samples before designing the workflow; never deploy just to get samples
- Create the project before any workflow or bundle calls
- Embed data product definitions inside the workflow bundle — do not call
  `create_data_product` directly; deployment provisions it

## Organize

**Goal:** The data product has approved definitions, relationships, and quality rules,
and is published as trusted.

**Agent actions:**
1. Define what the data means — hand off to `semantic-ontology-mapping` skill
2. Surface the draft definitions for domain owner review — check
   `list_pending` and surface to the right person
3. On approval, apply the definitions — `promote_data_product` readiness check
4. Infer and review relationships between entities
5. Generate and review quality rules
6. Run the promotion readiness checklist — `get_promotion_readiness`
7. Route to domain owner for final approval — `list_pending`,
   `resolve`

**Done when:** data product is approved and promoted to trusted tier.

**Rules:**
- Approvals surface automatically in the inbox, Slack, and email — do not
  re-implement gate logic; use `list_pending` + `resolve`
- After each approval, call `record_decision_trace`
- Run `query_context` before each approval gate for current state

## Use

**Goal:** The trusted data product is reachable by agents, apps, and queries through
the channel the user chooses.

**Agent actions:**
1. Register the delivery interface — `register_delivery_interface` (webhook, MCP,
   SQL, API, or stream)
2. Verify agent MCP access — confirm the data product appears in `list_data_products`
   and is reachable via the SDK
3. Set access rules — `govern-data-access` skill
4. Confirm quality and lineage — `get_quality_score`, `get_lineage_impact`

**Done when:** the data product is reachable through the chosen channel and access
rules are enforced.

## Handing off between steps

Each step ends with a clear handoff artifact:

| From | Handoff | To |
|---|---|---|
| Connect | `connector_id` + confirmed samples + `project_id` | Organize |
| Organize | Approved data product, promotion confirmed | Use |

If picking up mid-journey, call `query_context` with the data product name to
find current state before deciding which step applies.

## Implementation notes

Internal routing detail for agents that need it. See
`loxtep/docs/vocabulary.md` for the full internal → user language mapping.

**PKO procedure chain:**

| Stage | PKO procedure | Skill |
|---|---|---|
| P0 | `procedure#agent-session-bootstrap` | `loxtep-auth`, `loxtep-mcp-session` |
| P1 | `procedure#connect-external-system` | `connect-external-system` |
| P1 | `procedure#capture-connector-samples` | `connect-external-system` |
| P2 | `procedure#design-ingestion-workflow` | `data-workflows` |
| P2 | `procedure#deploy-ingestion-workflow` | `loxtep-build`, `loxtep-workspace` |
| P3 | `procedure#define-data-product-semantics` | `semantic-ontology-mapping` |
| P4 | `procedure#promote-data-product-medallion` | `promote-data-product` |
| P5 | `procedure#register-delivery-interface` | `data-product-modeling` |
| P5 | `procedure#enable-agent-mcp-access` | `loxtep-mcp-session`, `mcp-integration` |
| P6 | `procedure#govern-data-access` | `governance-policies` |
| P7 | `procedure#maintain-ai-ready-asset` | `discover-govern-lineage` |

**Step → journey mapping:** P0–P2 = Connect · P3–P4 = Organize · P5–P7 = Use

**HITL gates:** `hitl_gate: approval` steps are parked as `approval_request` records
by the PKO execution engine. Resolve via `loxtep_review` (`list_pending`,
`resolve`) or `client.approvals` in the SDK.

**CDLC cross-track:** P3 feeds `procedure#bridge-dp-semantics-to-cdlc` and
`procedure#cdlc-memory-promotion-intake`. P3 `dependsOn`
`procedure#cdlc-approve-and-deploy-artifact` for deployed glossary.

**Bundle authoring (P2):** use `save_workflow_bundle` only. Do not use
`patch_workflow_graph` for new flows. Handoff from P1 = `connector_id` + samples
→ `data-workflows` Flow E.

**Platform graph:** loaded via `graph-seed-platform-pko` bot for system org; tenants
read via `query_context` / federated `get_procedure`.

**Master graph:** `platform-backend/graph/platform-pko/loxtep-data-to-ai-ready.jsonld`
