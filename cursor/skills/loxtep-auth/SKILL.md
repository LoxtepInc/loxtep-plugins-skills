---
name: loxtep-auth
description: When Loxtep MCP returns "no valid auth token" or "RBAC requires JWT", guide the user to re-authenticate via the OAuth browser flow. Use after any Loxtep tool call that fails with an authentication error.
metadata:
  documentation: https://github.com/LoxtepInc/loxtep-plugins-skills/blob/main/cursor/skills/loxtep-auth/SKILL.md
---

# Loxtep MCP — Authentication recovery

When a call to a **Loxtep Customer MCP** tool (`loxtep_*` with an `operation` field) fails with:

- **"No valid authentication token found"**, or
- **"RBAC requires JWT token in Authorization header or x-jwt-token header"**,

the OAuth session has expired or was never established.

**How to fix:**

1. **Disconnect and reconnect** the Loxtep MCP server in your IDE's MCP settings. This will trigger the OAuth flow again.
2. A browser window will open for Loxtep login — sign in and authorize the connection.
3. Tokens refresh automatically after re-authentication.

**After re-auth:** Retry the Loxtep tool call that failed.

**If your MCP client uses `mcp-remote`** (e.g. Antigravity): Kill and restart the `mcp-remote` process, or disconnect/reconnect the server in your IDE. The OAuth flow will re-trigger in your browser.

**Dev environment:** Use `https://mcpdev.loxtep.io/ai/mcp/stream` as the server URL to connect to the Loxtep dev instance.

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
