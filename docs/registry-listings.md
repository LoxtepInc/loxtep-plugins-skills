# Registry & marketplace listings — submission tracker

Loxtep's discoverability depends on being listed where SMB builders already look
for MCP servers and plugins. This file tracks each listing, the artifact it
consumes, and its status. Update the **Status** column as each listing goes live
(the README must not claim a listing is live until this table says so —
Requirement 1.4).

| Registry / Marketplace | Consumes | Listing id | Status | Notes |
| --- | --- | --- | --- | --- |
| **Cursor / Grok user marketplace** | `.cursor-plugin/marketplace.json` → `cursor/` | `loxtep` (plugin id `53763249`, marketplace `loxtep-2429181`) | ☑ live | GitHub-imported user marketplace. **Pins the first commit SHA** — `agent plugin marketplace update` does not advance it. After every release run `scripts/refresh-cursor-marketplace.sh`. |
| **Cursor official Marketplace** | `cursor/.cursor-plugin/plugin.json`, `.cursor-plugin/marketplace.json` | `loxtep` | ☐ submitted | Manual review at cursor.com/marketplace/publish; GitHub releases do not auto-update this listing. |
| **Grok Build official catalog** | remote SHA pin in `xai-org/plugin-marketplace` | `loxtep` | ☐ submitted | PR to https://github.com/xai-org/plugin-marketplace with `source.sha` = release commit. |
| **Claude plugin directory** | `claude/.claude-plugin/plugin.json`, `.claude-plugin/marketplace.json` | `loxtep-claude@loxtep` | ☐ submitted | Installable today via `claude plugin marketplace add`. |
| **Anthropic MCP registry** | `server.json` | `io.loxtep/loxtep` | ☐ submitted | Publish with the `mcp-publisher` CLI; requires GitHub/DNS namespace proof for `io.loxtep`. |
| **Smithery** | `smithery.yaml` | `loxtep` | ☐ submitted | HTTP (hosted) server type. |
| **PulseMCP** | `server.json` / repo README | `loxtep` | ☐ submitted | Community directory; submit via pulsemcp.com. |
| **Glama** | repo README + `server.json` | `loxtep` | ☐ submitted | Community directory; auto-indexes public MCP repos. |

Provider clients **without** a `plugin.json` (skills-only today): `codex/`,
`kiro/`, `antigravity/`, `opencode/`. Version sync only covers Claude + Cursor
plugin manifests plus the two root `marketplace.json` files and `server.json`.

## Publishing checklist

1. **Version bump** — bump `version` in both `marketplace.json` files, both
   `plugin.json` files, and `server.json` to the **same** semver.
   `node scripts/check-version-sync.mjs` must pass (CI fails the release
   otherwise). The `publish` workflow tags `v<version>` and cuts a release on
   push to `main` (Requirement 1.2). Duplicate tags on a bump fail the job
   loudly — never a silent skip.
2. **URL safety** — `node scripts/lint-config-urls.mjs` must pass (no non-prod
   host in any shipped config; Requirement 1.5).
3. **Cursor/Grok user-marketplace refresh** — after the GitHub release exists:
   `EXPECTED_VERSION=<semver> ./scripts/refresh-cursor-marketplace.sh`.
   Confirm the mirror SHA matches the release commit and `plugin.json` reports
   the new version. Do **not** rely on `agent plugin marketplace update`.
4. **MCP registry** — `mcp-publisher publish` after authenticating the
   `io.loxtep` namespace (GitHub or DNS proof).
5. **Smithery / PulseMCP / Glama** — submit the repo URL through each site's
   "add server" flow.
6. **Cursor official / Grok Build official** — resubmit / PR the new commit SHA
   through each catalog's review flow.
7. **Flip Status** — update this table and remove any "coming soon" caveat from
   the README only once the listing is confirmed live.
