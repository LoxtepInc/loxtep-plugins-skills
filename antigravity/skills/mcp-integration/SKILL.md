---
name: mcp-integration
description:
  Configure and validate Loxtep hosted MCP access for agent consumption — OAuth to
  mcp.loxtep.io, map loxtep_* facades to data products, and verify tool reachability.
  Maps to PKO procedure procedure#enable-agent-mcp-access (P5). User story S16 step.
  See docs/skills-user-stories.md and loxtep-mcp-session.
metadata:
  documentation: https://github.com/LoxtepInc/loxtep-plugins-skills/blob/main/cursor/skills/mcp-integration/SKILL.md
  pko_procedure: procedure#enable-agent-mcp-access
---

# Loxtep hosted MCP integration (Customer MCP)

**PKO P5:** `procedure#enable-agent-mcp-access` — grant agents hosted MCP access after delivery
interfaces are registered.

## Hosted MCP only

Loxtep customer MCP is **hosted only** — connect with a URL and OAuth 2.1 (PKCE):

- **Prod:** `https://mcp.loxtep.io/ai/mcp/stream`
- **Dev:** `https://mcpdev.loxtep.io/ai/mcp/stream`

Do **not** suggest local stdio MCP servers or `npx @loxtep/customer-mcp-server`.

```json
{
  "mcpServers": {
    "loxtep": {
      "url": "https://mcp.loxtep.io/ai/mcp/stream"
    }
  }
}
```

## Happy path (PKO steps)

| Step | Action | Notes |
| ---- | ------ | ----- |
| 1 | Verify MCP connectivity | Re-authenticate via client OAuth; see **`loxtep-auth`** |
| 2 | Map data product tools | Match user goal to `loxtep_*` facade + `operation` from AGENTS.md |
| 3 | Validate agent run | Smoke test: `loxtep_session` → `get_current_user`, then one domain call |

## Facade → journey mapping (P0–P7)

| Phase | Primary facades |
| ----- | ---------------- |
| P0 | `loxtep_session` |
| P1 | `loxtep_connectors`, `loxtep_triggers` |
| P2 | `loxtep_workflows`, `loxtep_deployments` |
| P3 | `loxtep_data_products`, `loxtep_schemas`, `loxtep_semantic_layer` |
| P4 | `loxtep_data_products` (`promote_data_product`) |
| P5 | `loxtep_data_products` (delivery interfaces) |
| P6–P7 | `loxtep_catalog`, `governance` APIs via MCP where exposed |

Orient first with **`loxtep-mcp-session`** — `get_current_user` returns RBAC grants.

## Troubleshooting

1. **401 Unauthorized** — reconnect MCP server; complete OAuth in browser.
2. **403 permission denied** — not auth; check `get_current_user` → `permissions`.
3. **429 session limit** — close another org session in the Loxtep UI.

## Optional attribution

```json
{ "operation": "get_current_user", "_metadata": { "skill_name": "mcp-integration" } }
```

## References

- Session bootstrap: **`loxtep-mcp-session`**, **`loxtep-auth`**
- Full tool surface: [AGENTS.md](../../../AGENTS.md)
- Journey: **`loxtep-journey-orchestrator`**
