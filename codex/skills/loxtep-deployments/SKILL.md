<!-- GENERATED FILE -- edit skills/<slug>/SKILL.md (or rule.mdc.src.md) and run `node scripts/generate-skills.mjs` -- do not edit directly -->
---
name: loxtep-deployments
description:
  Use when the user wants to deploy a project or workflow to a runtime instance,
  check deployment status, list deployments, or inspect runtime mappings. Not
  the same as loxtep-workspace (provisioning) or data-workflows (authoring).
metadata:
  documentation: https://github.com/LoxtepInc/loxtep-plugins-skills/blob/main/codex/skills/loxtep-deployments/SKILL.md
---

# Deployments (Customer MCP)

Deploy projects and workflows to runtime instances, monitor deployment status,
and inspect runtime mappings.

## When to use

- "**Deploy** this project", "deploy workflow to instance"
- "What's the **deployment status**?", "list deployments"
- "Show **runtime mapping**" for a project/workflow
- "**Redeploy**", "force redeploy"

## Prerequisites

- MCP auth. Project-scoped operations require `project_id`.
- Target `instance_id` must exist (see **`loxtep-workspace`** for provisioning).

## Happy-path flow

1. `list_deployments` — see what's already deployed (filter by project, instance, workflow, status).
2. `deploy_project` — deploy an entire project to an instance.
3. `deploy_workflow` — deploy a single workflow (more targeted).
4. `get_deployment` — check status of a specific deployment.
5. `get_runtime_mapping` — inspect how a project/workflow maps to runtime resources.

## Operations

| Facade | Operation | Scope | Required | Optional |
| --- | --- | --- | --- | --- |
| `loxtep_build` | `deploy_project` | project | `project_id`, `instance_id` | `force_redeploy` |
| `loxtep_build` | `deploy_workflow` | project | `project_id`, `instance_id`, `workflow_id` | `force_redeploy`, `skip_validation` |
| `loxtep_observe` | `list_deployments` | organization | — | `project_id`, `instance_id`, `workflow_id`, `status` |
| `loxtep_observe` | `get_deployment` | organization | `deployment_id` | — |
| `loxtep_build` | `get_runtime_mapping` | project | `project_id` | `workflow_id` |

## MCP mapping

| Step | Tool | `operation` | Scope | Notes |
|------|------|-------------|-------|-------|
| List | `loxtep_observe` | `list_deployments` | organization | Filter by `project_id`, `instance_id`, `workflow_id`, `status` |
| Deploy project | `loxtep_build` | `deploy_project` | project | Deploys all workflows in the project |
| Deploy workflow | `loxtep_build` | `deploy_workflow` | project | Single workflow; `skip_validation` bypasses pre-deploy checks |
| Get status | `loxtep_observe` | `get_deployment` | organization | Returns status, timestamps, errors |
| Runtime mapping | `loxtep_build` | `get_runtime_mapping` | project | Shows how project resources map to runtime |

## Pitfalls

- **Deploy is required after ANY graph change** — adding or removing nodes, wiring edges,
  updating transformation configs, or changing the trigger schedule are all design-time
  operations that have no runtime effect until `deploy_workflow` is called again. A workflow
  with `graph_wired: true` but not yet (re)deployed will not reflect those changes at runtime.
  Always redeploy after modifying a workflow graph, even if the workflow was previously
  deployed successfully.
- **Instance provisioning** is `loxtep_workspace` — different facade. This Agent-Scope Skill
  assumes the target instance already exists.
- **Workflow authoring** (create, update, graph) is `loxtep_build` via the
  `data-workflows` Agent-Scope Skill. This Agent-Scope Skill handles *deployment* of authored workflows.
- **`force_redeploy`** skips the "already deployed at same version" short-circuit.
  Use when runtime state is suspected stale.
- **`skip_validation`** on `deploy_workflow` bypasses pre-deploy validation (graph
  completeness, connection tests). Use only for known-good redeployments.
- **Status values:** Expect `pending`, `in_progress`, `completed`, `failed`.
  Poll `get_deployment` for async deploy completion.

<!-- BEGIN loxtep skill-scope (skill-package-v1) -->

## Agent-Scope Skill scope (`.loxtep/skills/loxtep-deployments.yaml`)

Resource scope and operation permissions for this Agent-Scope Skill, conformant
with the [`skill-package-v1`](https://loxtep.io/schemas/skill-package-v1.json)
schema. Any resource type or operation not listed is **denied (fail-closed)**.
Identifier lists are empty placeholders — fill them with the specific resources
in your workspace. This declaration does not change the hosted MCP config
(`mcp.loxtep.io`).

```yaml
# .loxtep/skills/loxtep-deployments.yaml
# Conforms to https://loxtep.io/schemas/skill-package-v1.json
# Fail-closed: this Agent-Scope Skill's facades are RBAC-governed and carry no data-mesh resource scope.
name: loxtep-deployments
description: Deployment lifecycle management — RBAC-governed; no data-mesh resource scope.
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

`_metadata: { "skill_name": "loxtep-deployments" }`

## Auth

If MCP returns missing JWT / auth errors, reconnect the Loxtep MCP server to re-trigger OAuth (Agent-Scope Skill **loxtep-auth**).

## References

- [User story catalog](../../../docs/skills-user-stories.md) (story **S14**)
