# Registry & marketplace listings — submission tracker

Loxtep's discoverability depends on being listed where SMB builders already look
for MCP servers and plugins. This file tracks each listing, the artifact it
consumes, and its status. Update the **Status** column as each listing goes live
(the README must not claim a listing is live until this table says so —
Requirement 1.4).

| Registry / Marketplace | Consumes | Listing id | Status | Notes |
| --- | --- | --- | --- | --- |
| **Cursor Marketplace** | `cursor/.cursor-plugin/plugin.json`, `.cursor-plugin/marketplace.json` | `loxtep` | ☐ submitted | Until live, README recommends the Import-from-git path. |
| **Claude plugin directory** | `claude/.claude-plugin/plugin.json`, `.claude-plugin/marketplace.json` | `loxtep-claude@loxtep` | ☐ submitted | Installable today via `claude plugin marketplace add`. |
| **Anthropic MCP registry** | `server.json` | `io.loxtep/loxtep` | ☐ submitted | Publish with the `mcp-publisher` CLI; requires GitHub/DNS namespace proof for `io.loxtep`. |
| **Smithery** | `smithery.yaml` | `loxtep` | ☐ submitted | HTTP (hosted) server type. |
| **PulseMCP** | `server.json` / repo README | `loxtep` | ☐ submitted | Community directory; submit via pulsemcp.com. |
| **Glama** | repo README + `server.json` | `loxtep` | ☐ submitted | Community directory; auto-indexes public MCP repos. |

## Publishing checklist

1. **Version bump** — bump `version` in both `marketplace.json` files, both
   `plugin.json` files, and `server.json`. The `publish` CI workflow tags
   `v<version>` and cuts a release on push to `main` (Requirement 1.2).
2. **URL safety** — `node scripts/lint-config-urls.mjs` must pass (no non-prod
   host in any shipped config; Requirement 1.5).
3. **MCP registry** — `mcp-publisher publish` after authenticating the
   `io.loxtep` namespace (GitHub or DNS proof).
4. **Smithery / PulseMCP / Glama** — submit the repo URL through each site's
   "add server" flow.
5. **Cursor / Claude** — submit through each marketplace's plugin review flow.
6. **Flip Status** — update this table and remove any "coming soon" caveat from
   the README only once the listing is confirmed live.
