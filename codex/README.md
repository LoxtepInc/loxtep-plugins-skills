# Loxtep for Codex

Use the [Loxtep](https://loxtep.io) Customer MCP from [OpenAI Codex](https://codex.openai.com) (CLI and IDE): **19 grouped tools** (`loxtep_*`) with **`operation`** per invocation.

This directory lives in the [loxtep-plugins-skills](https://github.com/LoxtepInc/loxtep-plugins-skills) repo under `codex/`.

## Prerequisites

- **Loxtep account** with `owner`, `org_admin`, or `developer` role (for MCP tool access)

## Install

Edit `~/.codex/config.toml` and add the snippet from `config.snippet.toml` in this repo (or the block below). Codex uses TOML; see [Codex MCP](https://developers.openai.com/codex/mcp) and [config reference](https://developers.openai.com/codex/config-reference).

```toml
[mcp_servers.loxtep]
url = "https://mcp.loxtep.io/ai/mcp/stream"
```

On first use, Codex will open a browser window for OAuth login. Sign in to Loxtep and you're connected. Tokens refresh automatically.

> **Dev environment:** Replace the URL with `https://mcpdev.loxtep.io/ai/mcp/stream` to connect to the Loxtep dev instance.

## What you get

- **Loxtep Customer MCP** — hosted at `https://mcp.loxtep.io/ai/mcp/stream` (grouped tools + `operation`; projects, workflows, data products, connectors, templates, catalog, schemas, and more).
- **Skills** — Story-first playbooks (see [docs/skills-user-stories.md](../docs/skills-user-stories.md)): `create-connector`, `data-product-modeling`, `data-workflows`, `discover-govern-lineage`, `loxtep-agent-workspace`, `loxtep-analytics`, `loxtep-auth`, `loxtep-instances`, `loxtep-mcp-session`, `loxtep-ontology`, `loxtep-procedures`, `loxtep-process-intel`, `loxtep-sdk`, `loxtep-workspace`, `org-semantics-quality`, `semantic-ontology-mapping`. Each lives under `codex/skills/<slug>/SKILL.md` with MCP mapping tables where applicable.

## License

MIT
