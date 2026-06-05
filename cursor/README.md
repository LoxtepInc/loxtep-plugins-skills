# Loxtep Cursor Plugin

Cursor plugin for the [Loxtep](https://loxtep.io) data mesh platform. The Customer MCP exposes **19 grouped tools** (`loxtep_projects`, `loxtep_workflows`, …); each call uses **`operation`** plus arguments (many actions total across those groups). Use it from Cursor to manage projects, workflows, data products, connections, templates, and more.

This plugin lives in the [loxtep-plugins-skills](https://github.com/loxtepinc/loxtep-plugins-skills) repo under `cursor/`. For Cursor Marketplace or "install from Git", use the repo URL and select the `cursor/` path if your client supports subpaths.

## Prerequisites

- **Loxtep account** with `owner`, `org_admin`, or `developer` role (for MCP tool access)

## Quick start

1. **Install the plugin** in Cursor (Settings → Plugins → Install from Git; use `https://github.com/loxtepinc/loxtep-plugins-skills` and `cursor/` as the plugin path if supported).

2. **Or add manually** — merge the following into your `.cursor/mcp.json` or project `.mcp.json`:

   ```json
   {
     "mcpServers": {
       "loxtep": {
         "url": "https://mcp.loxtep.io/ai/mcp/stream"
       }
     }
   }
   ```

3. **Connect** — On first use, Cursor will open a browser window for OAuth login. Sign in to Loxtep and you're connected. Tokens refresh automatically.

4. **Use the tools** — In the MCP palette you'll see names like `loxtep_projects` and `loxtep_connectors`. Pass **`operation`** (e.g. `list_projects`, `create_connector`) and the fields that action needs.

> **Dev environment:** Replace the URL with `https://mcpdev.loxtep.io/ai/mcp/stream` to connect to the Loxtep dev instance.

## What's included

### Loxtep Customer MCP

Hosted at `https://mcp.loxtep.io/ai/mcp/stream` — 19 grouped `loxtep_*` tools with `operation`-based dispatch covering projects, workflows, data products, connectors, templates, catalog, schemas, deployments, semantic layer, agent orchestration, and more.

### Auth recovery rule

`rules/loxtep-mcp-auth.mdc` — a Cursor rule that guides the agent to re-authenticate when a tool call fails with "No valid authentication token". Automatically triggers the OAuth browser flow recovery.

### Logo

`assets/logo.svg` — the Loxtep logo asset used for Cursor Marketplace display.

### Skills (17 bundles)

Scoped skill bundles under `cursor/skills/<slug>/SKILL.md`. See [docs/skills-user-stories.md](../docs/skills-user-stories.md) for full user stories.

| Skill slug | Focus |
| --- | --- |
| `loxtep-mcp-session` | Orient: capabilities, RBAC grants, recommended session order |
| `loxtep-auth` | Authentication flows and token management |
| `loxtep-instances` | Provision/manage runtime instances |
| `create-connector` | Connect external systems |
| `data-workflows` | Author and deploy data workflows |
| `data-product-modeling` | Model source/consumer data products |
| `discover-govern-lineage` | Discovery, governance, lineage |
| `org-semantics-quality` | Semantic layer + quality rules |
| `loxtep-analytics` | DuckDB analytics |
| `loxtep-workspace` | Snapshots, versions, workspace index |
| `loxtep-process-intel` | Entity context + decision traces |
| `loxtep-ontology` | Ontology, vocabulary, namespaces |
| `loxtep-procedures` | Process graph procedures |
| `loxtep-agent-workspace` | Agent orchestration (issues/goals/agents) |
| `loxtep-sdk` | Using the `@loxtep/sdk` runtime + CLI |
| `loxtep-semantic-layer` | Semantic layer search, artifacts, completeness |
| `semantic-ontology-mapping` | Mapping external vocabularies to the ontology |

## Submission (Cursor Marketplace)

Before submitting at [cursor.com/marketplace/publish](https://cursor.com/marketplace/publish): ensure valid manifest, relative paths, README, logo, and frontmatter on rules/skills. Submit the repository URL; if the marketplace supports a plugin subpath, specify `cursor/`. Plugins are manually reviewed.

## License

MIT
