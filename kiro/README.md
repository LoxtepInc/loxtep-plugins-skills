# Loxtep for Kiro

Use the [Loxtep](https://loxtep.io) Customer MCP from [Kiro](https://kiro.dev): **19 grouped tools** (`loxtep_*`) with per-call **`operation`**, covering projects, workflows, data products, connectors, and more.

This directory lives in the [loxtep-plugins-skills](https://github.com/LoxtepInc/loxtep-plugins-skills) repo under `kiro/`.

## Prerequisites

- **Loxtep account** with `owner`, `org_admin`, or `developer` role (for MCP tool access)

## Install

1. **Add the Loxtep MCP server** to Kiro:
   - **Workspace:** Copy the contents of `mcp.json` into `.kiro/settings/mcp.json` in your project (create the file if needed), or merge the `loxtep` entry into your existing `mcpServers` object.
   - **User (global):** Copy into `~/.kiro/settings/mcp.json` so Loxtep is available in all workspaces.

   ```json
   {
     "mcpServers": {
       "loxtep": {
         "url": "https://mcp.loxtep.io/ai/mcp/stream"
       }
     }
   }
   ```

2. **Connect** — On first use, Kiro will open a browser window for OAuth login. Sign in to Loxtep and you're connected. Tokens refresh automatically.

3. **Use the tools** — Kiro's MCP panel lists `loxtep_projects`, `loxtep_workflows`, etc. Pass **`operation`** (flat action name) and the fields that action needs.

> **Dev environment:** Replace the URL with `https://mcpdev.loxtep.io/ai/mcp/stream` to connect to the Loxtep dev instance.

## What you get

- **Loxtep Customer MCP** — hosted at `https://mcp.loxtep.io/ai/mcp/stream` (grouped `loxtep_*` + `operation`; projects, workflows, data products, connectors, templates, catalog, schemas, and more).
- **Skills** — Story-first playbooks (see [docs/skills-user-stories.md](../docs/skills-user-stories.md)): `create-connector`, `data-product-modeling`, `data-workflows`, `discover-govern-lineage`, `loxtep-agent-workspace`, `loxtep-analytics`, `loxtep-auth`, `loxtep-instances`, `loxtep-mcp-session`, `loxtep-ontology`, `loxtep-procedures`, `loxtep-process-intel`, `loxtep-sdk`, `loxtep-semantic-layer`, `loxtep-workspace`, `org-semantics-quality`, `semantic-ontology-mapping`. Each lives under `kiro/skills/<slug>/SKILL.md` with MCP mapping tables where applicable.

## `power/` subdirectory (Kiro Power)

The `kiro/power/` directory packages the Loxtep MCP integration as a **Kiro Power** — a discoverable, self-documenting plugin format for Kiro IDE.

```
kiro/power/
├── POWER.md        # Power manifest — metadata (name, keywords, description),
│                   #   full documentation, MCP tools reference, steering file index
├── mcp.json        # MCP server connection config (server URL, auth method)
└── steering/       # Workflow steering files — detailed step-by-step guides
    ├── create-connector.md
    ├── data-workflows.md
    ├── discover-govern-lineage.md
    ├── loxtep-agent-workspace.md
    ├── loxtep-analytics.md
    ├── loxtep-instances.md
    ├── loxtep-ontology.md
    ├── loxtep-procedures.md
    ├── loxtep-process-intel.md
    ├── loxtep-sdk.md
    ├── loxtep-workspace.md
    └── org-semantics-quality.md
```

- **POWER.md** — The main manifest. Contains YAML frontmatter (name, display name, keywords, description, author) plus full documentation: overview, onboarding, session patterns, MCP tools reference table, steering file index, and troubleshooting.
- **mcp.json** — Connection configuration for the hosted Loxtep MCP server. Kiro reads this to register the server automatically.
- **steering/** — Each `.md` file is a workflow guide covering one functional area (connectors, workflows, analytics, etc.). Kiro loads these on demand based on user intent.

## License

MIT
