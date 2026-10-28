# Loxtep for Grok

Connect Grok to Loxtep's hosted MCP server and install the generated Loxtep
skills in this directory.

## Install

Use the `loxtep` user-marketplace plugin when available. For the current MCP,
OAuth, and skills-install steps, follow the
[Loxtep setup guide](https://docs.loxtep.io/docs/setup.md).

The hosted endpoint is `https://mcp.loxtep.io/ai/mcp/stream`. Authenticate with
OAuth; do not install the retired local `@loxtep/customer-mcp-server`.

## What you get

- **11 hosted MCP tools:** ten job facades plus the MCP Apps-only
  `loxtep_package_review` review card.
- **26 skills** under `grok/skills/`.
- Guidance aligned to **Connect → Products ↔ Meaning → Use**, with Inbox,
  Observe, and Organization supporting the journey.

Verify the connection with `loxtep_session` and
`operation: "get_current_user"`, then load `get_platform_model` before creating
or changing resources.
