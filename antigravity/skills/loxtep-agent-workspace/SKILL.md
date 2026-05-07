---
name: loxtep-agent-workspace
description:
  Use when the user wants agent orchestration — issues, goals, agent projects, agents — not
  data mesh projects or loxtep_workflows. Customer MCP loxtep_agent_workspace with operations
  agent_orchestration_*. User story S10. See docs/skills-user-stories.md.
---

# Agent orchestration workspace (Customer MCP)

**Story S10:** **Issues**, **goals**, **agent projects**, **agents** — this is the **agent workspace**, not **data mesh** repos (`loxtep_projects` / `loxtep_workflows`).

## When to use

- “Create **issue** in agent workspace”, “list **goals**”, “**agent_orchestration**”, “orchestration **project**” (agent project, not data project)

## Prerequisites

- MCP auth. All listed operations are **organization**-scoped; pass `organization_id` if the tool contract requires it (see platform tool definitions).

## MCP tool and operations

- **Tool:** `loxtep_agent_workspace`
- **`operation`** values (flat names):  
  `agent_orchestration_create_issue`, `agent_orchestration_list_issues`, `agent_orchestration_get_issue`,  
  `agent_orchestration_create_goal`, `agent_orchestration_list_goals`, `agent_orchestration_get_goal`,  
  `agent_orchestration_list_projects`, `agent_orchestration_create_project`, `agent_orchestration_get_project`,  
  `agent_orchestration_list_agents`, `agent_orchestration_get_agent`

## Pitfalls

- **`agent_orchestration_create_project`** ≠ **`create_project`** on `loxtep_projects`. Naming collision in English — always pick the **tool** from user intent.
- Data pipeline work → **`data-workflows`** + **`create-connector`**.

## Optional attribution

`_metadata: { "skill_name": "loxtep-agent-workspace" }`

## Auth

`loxtep-auth` / login.

## References

- [User story catalog](../../../docs/skills-user-stories.md)
