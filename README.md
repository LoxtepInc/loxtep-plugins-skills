# Loxtep Plugins & Skills

Plugins and skills for using [Loxtep](https://loxtep.io) from AI coding and productivity tools.

The MCP server registers **16 grouped tools** named `loxtep_projects`, `loxtep_workflows`, `loxtep_connectors`, and so on. Each call sets **`operation`** to the flat action name (e.g. `list_projects`, `create_connection`) plus that action's arguments. See the [Customer MCP README](https://github.com/symmatiq/loxtep/blob/main/platform-backend/_customer-mcp-server/README.md) for the full map. Under the hood that still covers projects, workflows, data products, connectors, templates, catalog, and the rest of the customer tool surface.

## Quick Start — Hosted MCP (recommended)

The fastest way to connect any MCP-compatible client to Loxtep. No installation, no Node.js, no `npx` required.

Add this to your MCP client config:

```json
{
  "mcpServers": {
    "loxtep": {
      "url": "https://api.loxtep.io/ai/mcp/stream"
    }
  }
}
```

That's it. On first connection your MCP client will open a browser window for OAuth login — sign in to Loxtep and you're connected. Authentication is handled automatically via OAuth 2.1 with PKCE; tokens refresh in the background.

## Alternative — Local MCP Server (stdio)

If you prefer offline access or need a custom environment, you can run the MCP server locally via stdio:

```bash
npx @loxtep/customer-mcp-server
```

One-time login to save tokens locally:

```bash
npx @loxtep/customer-mcp-server login
```

Open the printed URL in your browser, sign in to Loxtep, and complete the OAuth flow. Tokens are stored at `~/.loxtep/customer-mcp.json` and used by the local MCP server.

## Hosted vs Local — when to use which

| | Hosted (`url` config) | Local (`npx` stdio) |
|---|---|---|
| **Install** | None — just a URL | Requires Node.js + npx |
| **Auth** | OAuth 2.1 + PKCE (browser popup, automatic refresh) | File-based tokens (`~/.loxtep/customer-mcp.json`) |
| **Offline** | Requires internet | Works offline after login |
| **Updates** | Always latest — server-side | Manual (`npx @loxtep/customer-mcp-server@latest`) |
| **Best for** | Most users, CI agents, quick setup | Air-gapped environments, custom tooling |

## Plugins (siblings)

| Plugin | Platform | Path | Description |
|--------|----------|------|-------------|
| **Cursor** | Cursor IDE | [cursor/](cursor/) | Cursor Marketplace plugin: MCP, rules, skills. Install from Git or [cursor.com/marketplace/publish](https://cursor.com/marketplace/publish). |
| **Claude** | Claude Code & Claude Cowork | [claude/](claude/) | Claude plugin: MCP, skills. Install from Git or Claude plugin discovery. |
| **OpenCode** | OpenCode (terminal/desktop/IDE) | [opencode/](opencode/) | MCP config, skills, `opencode.json`. Copy skills to `.opencode/skills/` or `~/.config/opencode/skills/`. |
| **Kiro** | Kiro IDE | [kiro/](kiro/) | MCP config + README. Copy `mcp.json` into `.kiro/settings/mcp.json` or `~/.kiro/settings/mcp.json`. |
| **Antigravity** | Google Antigravity IDE | [antigravity/](antigravity/) | MCP config + README. Add Loxtep server via Manage MCP Servers → View raw config. |
| **Codex** | OpenAI Codex | [codex/](codex/) | MCP config + README. Run `codex mcp add loxtep -- npx @loxtep/customer-mcp-server` or edit `~/.codex/config.toml`. |

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
