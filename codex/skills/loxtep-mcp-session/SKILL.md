---
name: loxtep-mcp-session
description:
  Use when the user asks what they can do with Loxtep MCP, hits permission denied / 403,
  wants RBAC grants, or needs the recommended session order before other tools.
  Covers get_current_user (permissions), get_current_organization, project_id, ListTools.
  Complements loxtep-auth. See docs/skills-user-stories.md S0.
---

# Loxtep MCP — session, capabilities, and denials

**Story S0+:** Orient before other Customer MCP calls — no private codebase required.

## When to use

- “**What can I do**?”, “**403**”, “**permission denied**”, “check my **access**”
- Before project work: confirm user, org, and gather **`project_id`**

## Recommended session pattern

1. **`loxtep_session`** → **`get_current_user`** — use **`permissions`** (effective `resource` / `action` grants) and **`roles`**.
2. **`loxtep_session`** → **`get_current_organization`**
3. Pass **`project_id`** for project-scoped facades (`loxtep_workflows`, `loxtep_connections`, `loxtep_data_products`, …).
4. Use the client’s **ListTools** output for **`loxtep_*`** parameter schemas.

## Permission denials

- Match failure messages to **`get_current_user.permissions`**. Role changes are admin-only.
- **401:** **`loxtep-auth`** / `login`.

## Pitfalls

- Session tools still need the hosted Organizations API; client-only login does not fix server-side URL misconfiguration.

## Optional attribution

`_metadata: { "skill_name": "loxtep-mcp-session" }`

## References

- [User story catalog](../../../docs/skills-user-stories.md) (S0)
