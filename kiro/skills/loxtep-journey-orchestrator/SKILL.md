<!-- GENERATED FILE -- edit skills/<slug>/SKILL.md (or rule.mdc.src.md) and run `node scripts/generate-skills.mjs` -- do not edit directly -->
---
name: loxtep-journey-orchestrator
description:
  Orchestrate the Loxtep Connect→Ingest→Define→AI-ready journey (P0–P7) using
  platform PKO procedures in platform-backend/graph/platform-pko. Use when
  routing agents across connect, capture samples, studio design, deploy,
  semantics, promotion, delivery, MCP access, governance, and maintenance steps.
license: MIT
metadata:
  platform: loxtep
  category: orchestration
  pko_track: data-ingestion
  documentation: https://github.com/LoxtepInc/loxtep-plugins-skills/blob/main/kiro/skills/loxtep-journey-orchestrator/SKILL.md
---

# Loxtep journey orchestrator

Coordinates the **data-ingestion track** (P0–P7) defined in
`platform-backend/graph/platform-pko/loxtep-data-to-ai-ready.jsonld`.

## Procedure chain

| Order | Procedure `@id`                            | Primary agent     | Skill                                    |
| ----- | ------------------------------------------ | ----------------- | ---------------------------------------- |
| P0    | `procedure#agent-session-bootstrap`        | OrchestratorAgent | `loxtep-auth`, `loxtep-mcp-session`      |
| P1    | `procedure#connect-external-system`        | ConnectAgent      | `connect-external-system`                |
| P1    | `procedure#capture-connector-samples`      | ConnectAgent      | `connect-external-system`                |
| P2    | `procedure#design-ingestion-workflow`      | StudioAgent       | `data-workflows`                         |
| P2    | `procedure#deploy-ingestion-workflow`      | DeployAgent       | `loxtep-deployments`, `loxtep-instances` |
| P3    | `procedure#define-data-product-semantics`  | SemanticsAgent    | `semantic-ontology-mapping`              |
|       | (10 steps: select → infer mapping → **review** → apply glossary → **promote mapping** → infer relationships → **review** → persist → infer quality rules → **review**; bold = `hitl_gate: approval`) | | |
| P4    | `procedure#promote-data-product-medallion` | CatalogAgent      | `promote-data-product`                   |
| P5    | `procedure#register-delivery-interface`    | DeliveryAgent     | `data-product-modeling`                  |
| P5    | `procedure#enable-agent-mcp-access`        | OrchestratorAgent | `loxtep-mcp-session`, `mcp-integration`  |
| P6    | `procedure#govern-data-access`             | GovernanceAgent   | `governance-policies`                    |
| P7    | `procedure#maintain-ai-ready-asset`        | CatalogAgent      | `discover-govern-lineage`                |

## Rules

1. **Samples before deploy** — run `capture-connector-samples` before studio
   design; never deploy solely to fetch samples.
2. **Project before P2** — `create_project` (or reuse via `list_projects`) and
   record `project_id` before any workflow/bundle MCP calls. Optional GitHub
   attach via `update_project` `github_*`; when attached, local repo files lead
   and sync to Loxtep.
3. **Bundle-only agent authoring** — P2 design uses `save_workflow_bundle` only.
   Do not use piecemeal `patch_workflow_graph` for new flows. Handoff from P1 =
   `connector_id` + samples → `data-workflows` Flow E. **Do not** call
   `create_data_product` — embed `data-products/{id}.json` in the bundle; deploy
   provisions the runtime DP.
4. **HITL gates** — honor `metadata.hitl_gate` and `metadata.hitl_audience`;
   route via `resolve_hitl_audience()` when assignee not explicit. The backend
   **PKO execution engine** auto-runs `hitl_gate: none` steps and parks
   `hitl_gate: approval` steps as an `approval_request` (same record surfaced
   in the Define workspace inbox, Slack, and email). Resolve programmatically
   via MCP **`loxtep_approvals`** (`list_pending_approvals`, `resolve_approval`)
   or SDK `client.approvals` — do not re-implement gate logic in the agent.
5. **Cross-track** — P3 feeds `procedure#bridge-dp-semantics-to-cdlc` and
   `procedure#cdlc-memory-promotion-intake`; P3 `dependsOn` deployed glossary
   via `procedure#cdlc-approve-and-deploy-artifact`.
6. **Load platform graph** — system org seed via `graph-seed-platform-pko` bot;
   tenants read via `query_context` / federated `get_procedure`.

## Stage gates (skill stories → PKO)

| Gate     | Story         | PKO procedure(s)           | Terminal success                   |
| -------- | ------------- | -------------------------- | ---------------------------------- |
| Session  | S0            | P0 agent-session-bootstrap | MCP session + org context          |
| Connect  | S1            | P1 connect + capture       | Samples in connector metadata      |
| Studio   | S2            | P2 design                  | Graph saved with sample evidence   |
| Deploy   | S14           | P2 deploy                  | Deployment `deployed` + smoke pass |
| Define   | S4, semantics | P3 define                  | Fields → meaning → relationships → quality reviewed & promoted |
| Promote  | S17           | P4 promote                 | Medallion tier applied             |
| Deliver  | S3            | P5 register + enable MCP   | Interface + MCP validated          |
| Govern   | S5            | P6 govern                  | Access policy enforced             |
| Maintain | S5, S7        | P7 maintain                | Quality/lineage within SLA         |

Before each gate: run **build-run-context** (query_context + memory_search + PKO
step hints). After each HITL: `record_decision_trace`.

## References

- Architecture: `docs/architecture/agent-first-process-catalog.md`
- Master graph:
  `platform-backend/graph/platform-pko/loxtep-data-to-ai-ready.jsonld`
