<!-- GENERATED FILE -- edit skills/<slug>/SKILL.md (or rule.mdc.src.md) and run `node scripts/generate-skills.mjs` -- do not edit directly -->
---
name: loxtep-mcp-session
description:
  Use when the user asks what they can do with Loxtep MCP, hits permission
  denied / 403, wants to know their RBAC grants, or needs the recommended
  session order before other tools. Covers get_current_user (permissions),
  get_current_organization, project_id, and ListTools. Complements loxtep-auth
  for JWT recovery. See docs/skills-user-stories.md S0.
metadata:
  documentation: https://github.com/LoxtepInc/loxtep-plugins-skills/blob/main/codex/skills/loxtep-mcp-session/SKILL.md
---

# Loxtep MCP — session, capabilities, and denials

**Story S0+:** How to orient before (and after) other Customer MCP work — without relying on any private repo or source tree.

## When to use

- “**What can I do** with MCP?”, “**Permission denied**”, “**403**”, “do I have access to …?”
- Before a heavy workflow: confirm **who** and **which org** before passing **`project_id`**.

## Recommended session pattern

1. **`loxtep_session`** → **`get_current_user`** (no extra args unless your tool schema requires them). The response includes:
   - **`permissions`** — effective grants (typically `resource`, `action`, `source`, …). Use this to reason about RBAC.
   - **`roles`** — role assignments.
   - **`user`** / **`organization`** — identity context.
2. **`loxtep_session`** → **`get_current_organization`** — confirm org scope matches expectations.
3. For **project-scoped** facades (`loxtep_build`, `loxtep_build`, `loxtep_build`, …), include **`project_id`** on every call that needs it.
4. Open your MCP client’s **ListTools** (or schema) for **`loxtep_*`** tools — parameter names and descriptions live there; there is no separate “capability discovery” MCP operation.

## Permission denials

- Tools enforce **resource:action**-style RBAC (e.g. create vs read). If a call fails with a permission error, compare it to entries in **`get_current_user.permissions`** (`resource` + `action`).
- **Fix:** an org **owner/admin** must change your role or assignments — MCP login cannot upgrade RBAC.
- **401 / missing token:** use **`loxtep-auth`** (`login`), not this Agent-Scope Skill.

## Pitfalls

- **`get_current_user`** needs the platform Organizations API reachable from the AI runtime (same as other session tools). If it errors on URL/config, that’s deployment wiring — not fixed by repeating `login` on the client alone.
- **ListTools** shows facades and parameters; it does not replace **`get_current_user`** for “what am I allowed?” — use both.

<!-- BEGIN loxtep skill-scope (skill-package-v1) -->

## Agent-Scope Skill scope (`.loxtep/skills/loxtep-mcp-session.yaml`)

Resource scope and operation permissions for this Agent-Scope Skill, conformant
with the [`skill-package-v1`](https://loxtep.io/schemas/skill-package-v1.json)
schema. Any resource type or operation not listed is **denied (fail-closed)**.
Identifier lists are empty placeholders — fill them with the specific resources
in your workspace. This declaration does not change the hosted MCP config
(`mcp.loxtep.io`).

```yaml
# .loxtep/skills/loxtep-mcp-session.yaml
# Conforms to https://loxtep.io/schemas/skill-package-v1.json
# Fail-closed: this skill's facades are RBAC-governed and carry no data-mesh resource scope.
name: loxtep-mcp-session
description: Session and RBAC orientation — no data-mesh resource access.
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

`_metadata: { "skill_name": "loxtep-mcp-session" }`

## References

- [User story catalog](../../../docs/skills-user-stories.md) (S0)
