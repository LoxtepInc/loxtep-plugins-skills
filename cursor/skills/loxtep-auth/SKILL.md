---
name: loxtep-auth
description: When Loxtep hosted MCP returns auth errors, call mcp_auth first (Cursor authenticate button), then retry the failed tool.
metadata:
  documentation: https://github.com/LoxtepInc/loxtep-plugins-skills/blob/main/cursor/skills/loxtep-auth/SKILL.md
---

# Loxtep MCP — Authentication recovery

Loxtep MCP is **hosted only** (`https://mcp.loxtep.io/ai/mcp/stream`, dev: `https://mcpdev.loxtep.io/ai/mcp/stream`). **Do not** suggest `npx @loxtep/customer-mcp-server` or local stdio MCP.

When a call to a **Loxtep MCP** tool (`loxtep_*` with an `operation` field) fails with:

- **`Unauthorized`** or **`{"error":"Unauthorized"}`**
- **"No valid authentication token found"**, or
- **"RBAC requires JWT token in Authorization header or x-jwt-token header"**

the OAuth session has expired or was never established.

## Cursor — call `mcp_auth` first

**Do this immediately** — do not send the user to MCP Settings first:

```typescript
CallMcpTool({
  server: '<loxtep-mcp-server-id>', // e.g. project-0-loxtep-loxtep
  toolName: 'mcp_auth',
  arguments: {},
});
```

Cursor shows an **Authenticate** button. Ask the user to click it, then **retry** the tool call that failed.

**Fallback** (only if `mcp_auth` fails): disconnect/reconnect the Loxtep MCP server in IDE settings, sign in in the browser, retry.

<!-- BEGIN loxtep skill-scope (skill-package-v1) -->
## Skill scope (`.loxtep/skills/loxtep-auth.yaml`)

Resource scope and operation permissions for this skill, conformant with the [`skill-package-v1`](https://loxtep.io/schemas/skill-package-v1.json) schema. Any resource type or operation not listed is **denied (fail-closed)**. Identifier lists are empty placeholders — fill them with the specific resources in your workspace. This declaration does not change the hosted MCP config (`mcp.loxtep.io`).

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
