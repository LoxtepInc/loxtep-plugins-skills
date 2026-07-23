<!-- GENERATED FILE -- edit skills/<slug>/SKILL.md (or rule.mdc.src.md) and run `node scripts/generate-skills.mjs` -- do not edit directly -->
---
name: mcp-integration
description:
  Configure and validate Loxtep hosted MCP access for agents — OAuth to
  mcp.loxtep.io, map the ten job facades to user goals, and verify tool
  reachability. Part of the Use step when enabling agent consumption of trusted
  data.
metadata:
  documentation: https://github.com/LoxtepInc/loxtep-plugins-skills/blob/main/antigravity/skills/mcp-integration/SKILL.md
---

# Loxtep hosted MCP integration

## When to use

- User wants agents to **consume Loxtep data** via MCP
- Setting up or troubleshooting **hosted MCP** in Cursor, Claude, Codex, or other clients
- Mapping a user goal to the right **`loxtep_*` tool** and **`operation`**
- Verifying OAuth and RBAC after connect

## What it does

Connects the agent client to Loxtep's hosted MCP server, orients via session tools,
maps Connect → Organize → Use goals to the consolidated ten-tool surface, and
smoke-tests reachability.

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

## Connect → Organize → Use (job facades)

| Step | Tool | Purpose |
| ---- | ---- | ------- |
| **Connect** | `loxtep_session` | Who am I, which org, logout |
| **Connect** | `loxtep_connect` | Connectors, OAuth, samples, starter templates |
| **Connect** | `loxtep_workspace` | Projects, instances, snapshots, version history |
| **Organize** | `loxtep_build` | Workflows, triggers, data products, deploy writes |
| **Organize** | `loxtep_define` | Schemas, quality rules, PII tagging |
| **Organize** | `loxtep_meaning` | Vocabulary, ontology, semantic layer |
| **Organize** | `loxtep_review` | Lifecycle transitions, approvals, context mining |
| **Use** | `loxtep_query` | Catalog search, analytics SQL |
| **Use** | `loxtep_observe` | Quality scores, lineage, queues, deployment status |
| **Use** | `loxtep_context` | Process intel, procedures, agent workspace |

Each call sets **`operation`** to the flat action name plus that action's arguments.
Example:

```json
{ "operation": "create_connector", "connector_type": "shopify", "metadata": { "api_key": "…" } }
```

**Scope:** `project`-scoped operations require `project_id` in the same payload;
`organization`-scoped operations may accept optional `domain_id`. Orient first with
`loxtep_session` → `get_current_user` before passing a `project_id`.

## Happy path

| Step | Action | Notes |
| ---- | ------ | ----- |
| 1 | Verify MCP connectivity | Re-authenticate via client OAuth; see **`loxtep-auth`** |
| 2 | Map user goal to tool + `operation` | Use the table above; full operation lists in [AGENTS.md](../../../AGENTS.md) |
| 3 | Validate agent run | Smoke test: `loxtep_session` → `get_current_user`, then one domain call |

Organize review gates auto-run inference and park on `awaiting_approval`; resolve via
`loxtep_review` (`list_pending`, `resolve`) — same record as the Define workspace inbox,
Slack, and email.

Orient first with **`loxtep-mcp-session`** — `get_current_user` returns RBAC grants.

## Troubleshooting

1. **401 Unauthorized** — reconnect MCP server; complete OAuth in browser.
2. **403 permission denied** — not auth; check `get_current_user` → `permissions`.
3. **429 session limit** — close another org session in the Loxtep UI.

## Optional attribution

```json
{ "operation": "get_current_user", "_metadata": { "skill_name": "mcp-integration" } }
```

## Implementation notes

**PKO P5:** `procedure#enable-agent-mcp-access` — grant agents hosted MCP access after
delivery interfaces are registered.

**Legacy facade → job facade mapping** (deprecated names still route server-side):

| Legacy | Job facade |
| ------ | ---------- |
| `loxtep_connectors`, `loxtep_templates` | `loxtep_connect` |
| `loxtep_projects`, `loxtep_instances` | `loxtep_workspace` |
| `loxtep_workflows`, `loxtep_triggers`, `loxtep_data_products`, deploy writes | `loxtep_build` |
| `loxtep_schemas`, `loxtep_quality` | `loxtep_define` |
| `loxtep_ontology`, `loxtep_semantic_layer` | `loxtep_meaning` |
| `loxtep_cdlc`, `loxtep_approvals`, `loxtep_context_mining` | `loxtep_review` |
| `loxtep_catalog`, `loxtep_analytics` | `loxtep_query` |
| `loxtep_deployments` (reads), queue inspection | `loxtep_observe` |
| `loxtep_process_intel`, `loxtep_procedures`, `loxtep_agent_workspace` | `loxtep_context` |

**PKO phase → facade (P0–P7):**

| Phase | Primary facades |
| ----- | ---------------- |
| P0 | `loxtep_session` |
| P1 | `loxtep_connect` |
| P2 | `loxtep_build`, `loxtep_workspace` (instances) |
| P3 | `loxtep_build`, `loxtep_define`, `loxtep_meaning`, `loxtep_review` |
| P4 | `loxtep_build` (`promote_data_product`), `loxtep_review` |
| P5 | `loxtep_build` (delivery interfaces) |
| P6–P7 | `loxtep_query`, `governance` APIs via MCP where exposed |

## References

- Session bootstrap: **`loxtep-mcp-session`**, **`loxtep-auth`**
- Full tool surface: [AGENTS.md](../../../AGENTS.md)
- Journey: **`loxtep-journey-orchestrator`**
