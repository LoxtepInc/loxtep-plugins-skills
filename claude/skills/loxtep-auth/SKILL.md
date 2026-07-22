<!-- GENERATED FILE -- edit skills/<slug>/SKILL.md (or rule.mdc.src.md) and run `node scripts/generate-skills.mjs` -- do not edit directly -->
---
name: loxtep-auth
description:
  When Loxtep hosted MCP returns auth errors, reconnect MCP to re-trigger OAuth,
  then retry the failed tool.
metadata:
  documentation: https://github.com/LoxtepInc/loxtep-plugins-skills/blob/main/claude/skills/loxtep-auth/SKILL.md
---

# Loxtep MCP — Authentication recovery

Loxtep MCP is **hosted only** (`https://mcp.loxtep.io/ai/mcp/stream`, dev: `https://mcpdev.loxtep.io/ai/mcp/stream`). **Do not** suggest `npx @loxtep/customer-mcp-server` or local stdio MCP.

When a call to a **Loxtep MCP** tool (`loxtep_*` with an `operation` field) fails with:

- **`Unauthorized`** or **`{"error":"Unauthorized"}`**
- **"No valid authentication token found"**, or
- **"RBAC requires JWT token in Authorization header or x-jwt-token header"**

the OAuth session has expired or was never established.

**How to fix:**

1. Disconnect and reconnect the Loxtep MCP server in your IDE's MCP settings (re-triggers OAuth).
2. Sign in and authorize in the browser when prompted.
3. **Retry** the tool call that failed.

<!-- BEGIN loxtep skill-scope (skill-package-v1) -->

## Agent-Scope Skill scope (`.loxtep/skills/loxtep-auth.yaml`)

Resource scope and operation permissions for this Agent-Scope Skill, conformant
with the [`skill-package-v1`](https://loxtep.io/schemas/skill-package-v1.json)
schema. Any resource type or operation not listed is **denied (fail-closed)**.
Identifier lists are empty placeholders — fill them with the specific resources
in your workspace. This declaration does not change the hosted MCP config
(`mcp.loxtep.io`).

```yaml
# .loxtep/skills/loxtep-auth.yaml
# Conforms to https://loxtep.io/schemas/skill-package-v1.json
# Fail-closed: this skill's facades are RBAC-governed and carry no data-mesh resource scope.
name: loxtep-auth
description: Authentication recovery only — no data-mesh resource access.
scope:
  data_products: []
  connectors: []
  workflows: []
  domains: []
  queues: []
permissions: {}
```

<!-- END loxtep skill-scope (skill-package-v1) -->
