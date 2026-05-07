---
name: loxtep-auth
description: When Loxtep MCP returns "no valid auth token" or "RBAC requires JWT", run the customer MCP login command and retry. Use after any Loxtep tool call that fails with an authentication error.
---

# Loxtep MCP — Authentication recovery

When a call to a **Loxtep Customer MCP** tool (`loxtep_*` with an `operation` field) fails with:

- **"No valid authentication token found"**, or
- **"RBAC requires JWT token in Authorization header or x-jwt-token header"**,

run the login command so the user can re-authenticate:

```bash
npx @loxtep/customer-mcp-server login
```

**What happens:**
- A local server starts and prints a URL (e.g. `https://appdev.loxtep.io/auth/mcp?port=38473`).
- The user must open that URL in a browser, sign in to Loxtep, and complete the OAuth flow.
- Tokens are saved to `~/.loxtep/customer-mcp.json`; the MCP server will use them on subsequent tool calls.

**After login:** Retry the Loxtep tool call that failed.

**Optional env:** Set `LOXTEP_ENV` or `NODE_ENV` to `dev` / `development` for dev app/API (`appdev.loxtep.io`, `apidev.loxtep.io`). Set `LOXTEP_API_BASE_URL` to override the API endpoint.
