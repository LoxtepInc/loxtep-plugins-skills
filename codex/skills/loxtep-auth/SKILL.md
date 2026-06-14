---
name: loxtep-auth
description: When Loxtep hosted MCP returns auth errors, reconnect MCP to re-trigger OAuth, then retry the failed tool.
metadata:
  documentation: https://github.com/LoxtepInc/loxtep-plugins-skills/blob/main/codex/skills/loxtep-auth/SKILL.md
---

# Loxtep MCP — Authentication recovery

Loxtep MCP is **hosted only** (`https://mcp.loxtep.io/ai/mcp/stream`, dev: `https://mcpdev.loxtep.io/ai/mcp/stream`). **Do not** suggest `npx @loxtep/customer-mcp-server` or local stdio MCP.

When a call to a **Loxtep MCP** tool (`loxtep_*` with an `operation` field) fails with auth errors, disconnect/reconnect the hosted MCP server in IDE settings, complete OAuth in the browser, then retry the failed call.

<!-- BEGIN loxtep skill-scope (skill-package-v1) -->
## Skill scope (`.loxtep/skills/loxtep-auth.yaml`)

```yaml
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
