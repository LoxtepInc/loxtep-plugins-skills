<!-- GENERATED FILE -- edit skills/<slug>/SKILL.md (or rule.mdc.src.md) and run `node scripts/generate-skills.mjs` -- do not edit directly -->
---
name: loxtep-agent-workspace
description:
  Use when the user wants agent orchestration — issues, goals, agent projects,
  agents — not data mesh projects or loxtep_workflows. Customer MCP
  loxtep_agent_workspace with operations agent_orchestration_*.
license: MIT
compatibility: opencode
metadata:
  platform: loxtep
  category: agent-workspace
  documentation: https://github.com/LoxtepInc/loxtep-plugins-skills/blob/main/opencode/skills/loxtep-agent-workspace/SKILL.md
---

# Agent orchestration workspace (Customer MCP)

**Story S10:** **Issues**, **goals**, **agent projects**, **agents** — this is
the **agent workspace**, not **data mesh** repos (`loxtep_projects` /
`loxtep_workflows`).

## When to use

- "Create **issue** in agent workspace", "list **goals**",
  "**agent_orchestration**", "orchestration **project**" (agent project, not
  data project)

## Prerequisites

- MCP auth. All listed operations are **organization**-scoped; pass
  `organization_id` if the tool contract requires it (see platform tool
  definitions).

## MCP tool and operations

- **Tool:** `loxtep_agent_workspace`
- **`operation`** values (flat names): `agent_orchestration_create_issue`,
  `agent_orchestration_list_issues`, `agent_orchestration_get_issue`,
  `agent_orchestration_create_goal`, `agent_orchestration_list_goals`,
  `agent_orchestration_get_goal`, `agent_orchestration_list_workstreams`,
  `agent_orchestration_create_workstream`, `agent_orchestration_get_workstream`,
  `agent_orchestration_list_agents`, `agent_orchestration_get_agent`

## Pitfalls

- **`agent_orchestration_create_workstream`** ≠ **`create_project`** on
  `loxtep_projects`. Naming collision in English — always pick the **tool** from
  user intent.
- Data pipeline work → **`data-workflows`** + **`connect-external-system`**.

<!-- BEGIN loxtep skill-scope (skill-package-v1) -->

## Agent-Scope Skill scope (`.loxtep/skills/loxtep-agent-workspace.yaml`)

Resource scope and operation permissions for this Agent-Scope Skill, conformant
with the [`skill-package-v1`](https://loxtep.io/schemas/skill-package-v1.json)
schema. Any resource type or operation not listed is **denied (fail-closed)**.
Identifier lists are empty placeholders — fill them with the specific resources
in your workspace. This declaration does not change the hosted MCP config
(`mcp.loxtep.io`).

```yaml
# .loxtep/skills/loxtep-agent-workspace.yaml
# Conforms to https://loxtep.io/schemas/skill-package-v1.json
# Fail-closed: this skill's facades are RBAC-governed and carry no data-mesh resource scope.
name: loxtep-agent-workspace
description: Agent orchestration (issues/goals/agents) — RBAC-governed; no data-mesh resource scope.
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

`_metadata: { "skill_name": "loxtep-agent-workspace" }`

## Auth

`loxtep-auth` / login.

## References

- [User story catalog](../../docs/skills-user-stories.md)
