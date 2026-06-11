# MCP operations vs skills (drift notes)

There is **no CI job** in this repo that parses the Loxtep monorepo’s `mcp-facades.ts`. Coverage is maintained manually in **[skills-user-stories.md](skills-user-stories.md)**:

- **Skill clusters** — which stories and facades each skill owns.
- **MCP operation → skill index** — expected primary skill per operation family (and intentional doubles, e.g. `create_connection` in both `create-connector` and `data-workflows`).

## When to update

After the Customer MCP adds, renames, or removes an `operation` on any `loxtep_*` facade:

1. Compare against [`mcp-facades.ts`](https://github.com/LoxtepInc/loxtep/blob/main/platform-backend/ai/lib/tools/mcp-facades.ts).
2. Update **skills-user-stories.md** (index + operation table + any affected story section).
3. Update the affected **skill(s)** in `claude/skills/<slug>/SKILL.md`, `cursor/skills/<slug>/SKILL.md`, `kiro/skills/<slug>/SKILL.md`, `opencode/skills/<slug>/SKILL.md`, `antigravity/skills/<slug>/SKILL.md`, and `codex/skills/<slug>/SKILL.md`.
4. Refresh **skills-roadmap.md** if a new skill slug or facade ownership changes.

## Optional automation

A future script could diff `mcp-facades` operation strings against a machine-readable export of the catalog; until then, treat the markdown catalog as the source of truth for “which skill documents which operations.”
