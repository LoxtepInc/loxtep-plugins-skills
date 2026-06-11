# Loxtep Plugins & Skills

Plugins and skills for using [Loxtep](https://loxtep.io) from AI coding and productivity tools.

Loxtep is not another pipeline tool. It publishes **governed data products** on a **real-time streaming** backbone — with **data governance**, **catalog and lineage**, a **semantic layer**, and **AI context** (entity knowledge, decision traces, ontology) that agents can query instead of inventing. These plugins connect your MCP client to that platform over hosted OAuth.

The Customer MCP registers **19 grouped tools** named `loxtep_projects`, `loxtep_workflows`, `loxtep_data_products`, and so on. Each call sets **`operation`** to the flat action name (e.g. `list_projects`, `create_data_product`) plus that action's arguments. See the [Customer MCP README](https://github.com/LoxtepInc/loxtep/blob/main/platform-backend/_customer-mcp-server/README.md) for the full map.

## Quick Start

Add the Loxtep hosted MCP server to your client config:

```json
{
  "mcpServers": {
    "loxtep": {
      "url": "https://mcp.loxtep.io/ai/mcp/stream"
    }
  }
}
```

That's it. On first connection your MCP client will open a browser window for OAuth login — sign in to Loxtep and you're connected. Authentication is handled automatically via OAuth 2.1 with PKCE; tokens refresh in the background.

No installation, no Node.js, no `npx`, no token files to manage.

> **Dev environment:** Replace the URL with `https://mcpdev.loxtep.io/ai/mcp/stream` to connect to the Loxtep dev instance.

## Clients without native MCP OAuth

Some MCP clients (e.g. Google Antigravity) don't yet support the OAuth 2.1 handshake natively. For those, use `mcp-remote` as a local bridge:

```json
{
  "mcpServers": {
    "loxtep": {
      "command": "npx",
      "args": ["-y", "mcp-remote", "https://mcp.loxtep.io/ai/mcp/stream"]
    }
  }
}
```

`mcp-remote` handles the OAuth flow locally (opens your browser, runs a localhost callback server) and bridges the authenticated connection via stdio.

## Plugins

| Plugin | Platform | Path | Description |
|--------|----------|------|-------------|
| **Cursor** | Cursor IDE | [cursor/](cursor/) | Governed data products, streaming, semantic layer, AI context — hosted MCP, skills, auth rule. Native OAuth via `url` config. |
| **Claude** | Claude Code & Claude Cowork | [claude/](claude/) | MCP config, skills. Supports native OAuth via `url` config. |
| **OpenCode** | OpenCode (terminal/desktop/IDE) | [opencode/](opencode/) | MCP config, skills. Supports native OAuth via `url` config. |
| **Kiro** | Kiro IDE | [kiro/](kiro/) | MCP config + README. Supports native OAuth via `url` config. |
| **Antigravity** | Google Antigravity IDE | [antigravity/](antigravity/) | MCP config + README. Uses `mcp-remote` bridge (no native MCP OAuth yet). |
| **Codex** | OpenAI Codex | [codex/](codex/) | TOML config + README. Supports native OAuth via `url` config. |

## Repository layout

- **cursor/** — Cursor plugin (`.cursor-plugin/`, rules, skills, assets).
- **claude/** — Claude Code / Cowork plugin (`.claude-plugin/`, skills).
- **opencode/** — OpenCode (terminal/desktop/IDE): `opencode.json`, skills.
- **kiro/** — Kiro IDE: MCP config and README.
- **antigravity/** — Antigravity IDE: MCP config and README.
- **codex/** — Codex CLI/IDE: TOML snippet and README.

See each directory's `README.md` for install and usage instructions.

**User story catalog** (S0–S12, intent → skill → MCP): [docs/skills-user-stories.md](docs/skills-user-stories.md).

**Skills roadmap** (indexes by story and by facade, `_metadata` slugs, drift notes): [docs/skills-roadmap.md](docs/skills-roadmap.md).

**MCP vs skills drift** (manual process; no CI parser): [docs/mcp-operation-skills-drift.md](docs/mcp-operation-skills-drift.md).

## Skill attribution (optional)

When invoking Loxtep MCP tools, agents may pass `_metadata` in tool arguments for
attribution and eval scoring. This is **fully optional** and backward-compatible.

**Convention:** Include `_metadata: { skill_name: 'skill-slug' }` in the tool
arguments. The `skill_name` must match the skill's `name` from its YAML frontmatter.
The Loxtep platform uses this for per-skill eval and analytics when available.

| `skill_name` (use exactly) |
|----------------------------|
| `loxtep-auth` |
| `loxtep-instances` |
| `create-connector` |
| `data-workflows` |
| `discover-govern-lineage` |
| `org-semantics-quality` |
| `loxtep-analytics` |
| `loxtep-workspace` |
| `loxtep-process-intel` |
| `loxtep-procedures` |
| `loxtep-agent-workspace` |

```json
{
  "operation": "create_connector",
  "connector_type": "shopify",
  "metadata": { "api_key": "..." },
  "_metadata": { "skill_name": "create-connector" }
}
```

(Call the MCP tool **`loxtep_connectors`** with the JSON above as arguments.)

Tools ignore `_metadata` for tool logic; it is used only for request attribution.

## License

MIT
