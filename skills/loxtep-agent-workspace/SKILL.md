---
name: loxtep-agent-workspace
description:
  Use when the user wants agent orchestration — issues, goals, agent projects,
  agents — not data mesh projects or loxtep_build. Customer MCP
  loxtep_context with operations agent_orchestration_*.
license: MIT
compatibility: opencode
metadata:
  platform: loxtep
  category: agent-workspace
---

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

<!-- SCOPE_BLOCK -->

## Optional attribution

`_metadata: { "skill_name": "loxtep-agent-workspace" }`

## Auth

`loxtep-auth` / login.

## References

- [User story catalog](../../docs/skills-user-stories.md)
