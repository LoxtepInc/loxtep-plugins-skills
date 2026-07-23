<!-- GENERATED FILE -- edit skills/<slug>/SKILL.md (or rule.mdc.src.md) and run `node scripts/generate-skills.mjs` -- do not edit directly -->

# Agent orchestration workspace (Customer MCP)

**Story S10:** **Issues**, **goals**, **agent projects**, **agents** — this is
the **agent workspace**, not **data mesh** repos (`loxtep_workspace` /
`loxtep_build`).

## When to use

- "Create **issue** in agent workspace", "list **goals**",
  "**agent_orchestration**", "orchestration **project**" (agent project, not
  data project)

## Prerequisites

- MCP auth. All listed operations are **organization**-scoped; pass
  `organization_id` if the tool contract requires it (see platform tool
  definitions).

## MCP tool and operations

- **Tool:** `loxtep_context`
- **`operation`** values (flat names): `create_issue`,
  `list_issues`, `get_issue`,
  `create_goal`, `list_goals`,
  `get_goal`, `list_workstreams`,
  `create_workstream`, `get_workstream`,
  `list_agents`, `get_agent`

## Pitfalls

- **`create_workstream`** ≠ **`create_project`** on
  `loxtep_workspace`. Naming collision in English — always pick the **tool** from
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
