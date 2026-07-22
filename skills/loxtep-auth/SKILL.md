---
name: loxtep-auth
description: When Loxtep hosted MCP returns auth errors, reconnect MCP to re-trigger OAuth, then retry the failed tool.
perTool:
  cursor:
    description: When Loxtep hosted MCP returns auth errors, call mcp_auth first (Cursor authenticate button), then retry the failed tool.
---

# Loxtep MCP — Authentication recovery

Loxtep MCP is **hosted only** (`https://mcp.loxtep.io/ai/mcp/stream`, dev: `https://mcpdev.loxtep.io/ai/mcp/stream`). **Do not** suggest `npx @loxtep/customer-mcp-server` or local stdio MCP.

When a call to a **Loxtep MCP** tool (`loxtep_*` with an `operation` field) fails with:

- **`Unauthorized`** or **`{"error":"Unauthorized"}`**
- **"No valid authentication token found"**, or
- **"RBAC requires JWT token in Authorization header or x-jwt-token header"**

the OAuth session has expired or was never established.

<!-- tool:cursor -->
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
<!-- /tool -->
<!-- tool:!cursor -->
**How to fix:**

1. Disconnect and reconnect the Loxtep MCP server in your IDE's MCP settings (re-triggers OAuth).
2. Sign in and authorize in the browser when prompted.
3. **Retry** the tool call that failed.
<!-- /tool -->

<!-- SCOPE_BLOCK -->
