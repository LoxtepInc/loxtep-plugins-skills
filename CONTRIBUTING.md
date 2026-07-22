# Contributing

## Editing a skill

This repo ships the same set of skills to six AI coding tools (`claude`,
`cursor`, `codex`, `kiro`, `opencode`, `antigravity`). **Do not hand-edit any
of these paths directly** — they are generated and will be silently
overwritten the next time someone runs the generator:

- `claude/skills/**`, `cursor/skills/**`, `codex/skills/**`, `kiro/skills/**`,
  `opencode/skills/**`, `antigravity/skills/**`
- `kiro/power/steering/**`
- `claude/rules/*.mdc`, `cursor/rules/*.mdc`

Every one of those files starts with a `<!-- GENERATED FILE -->` comment as a
reminder. The thing you actually edit is the canonical source:

```
skills/<slug>/SKILL.md            # required — canonical skill content
skills/<slug>/rule.mdc.src.md     # optional — only for skills with a .mdc rule rendition (e.g. loxtep-auth)
skills/rule-targets.json          # maps slug -> output .mdc filename, for skills with a rule.mdc.src.md
.loxtep/skills/<slug>.yaml        # optional — RBAC scope source (skill-package-v1 schema)
```

After editing, run:

```bash
node scripts/generate-skills.mjs          # writes the generated output
node scripts/generate-skills.mjs --check  # verifies no drift (what CI runs)
```

Commit both the canonical source and the generated output together. CI
(`.github/workflows/check-skills-sync.yml`) fails the PR if they're out of
sync.

## Canonical `SKILL.md` format

Frontmatter is the same dialect used across all six tools already: `name`,
`description` (single line or a folded multi-line plain scalar), optionally
`license`, `compatibility`, `trigger`, and a `metadata` object (`platform`,
`category`, `pko_procedure`, ...). **Never set `metadata.documentation`** — the
generator computes it per tool as
`https://github.com/LoxtepInc/loxtep-plugins-skills/blob/main/{tool}/skills/{slug}/SKILL.md`.

Most skills need nothing beyond that — write the body once and it ships
identically to all six tools.

### When a skill genuinely differs per tool

Use `perTool` in frontmatter to override scalar fields for one tool:

```yaml
---
name: loxtep-auth
description: When Loxtep hosted MCP returns auth errors, reconnect MCP to re-trigger OAuth, then retry the failed tool.
perTool:
  cursor:
    description: When Loxtep hosted MCP returns auth errors, call mcp_auth first (Cursor authenticate button), then retry the failed tool.
---
```

Use `<!-- tool:X -->...<!-- /tool -->` in the body to include a block only for
specific tools, and `<!-- tool:!X -->...<!-- /tool -->` for every tool
*except* X. Comma-separated lists work too (`tool:claude,codex`,
`tool:!cursor,!kiro`). Blocks don't nest.

`skills/loxtep-auth/SKILL.md` is the worked example: Cursor gets a
`mcp_auth`-first recovery flow (`tool:cursor`), every other tool gets a
generic MCP-reconnect flow (`tool:!cursor`), and the frontmatter description
differs per tool via `perTool.cursor.description`. `skills/loxtep-auth/rule.mdc.src.md`
uses the same mechanism for the `.mdc` rule rendition (`perTool.cursor.globs`
maps to the `.mdc` frontmatter's `globs` field).

Before reaching for a conditional block or `perTool`, check whether the
difference is real. Most historical divergence in this repo turned out to be
accidental drift (one tool's copy got hand-edited and the edit never
propagated), not an intentional tool-specific behavior — in those cases the
fix is to write the richer/correct version once in the canonical source, not
to encode the difference.

### RBAC scope block

If `.loxtep/skills/<slug>.yaml` exists for a skill, add a
`<!-- SCOPE_BLOCK -->` placeholder on its own line wherever the scope section
should render in the body. The generator replaces it with a rendering of that
yaml file, identical across all six tools. If a skill has no yaml file, don't
add the placeholder. `generate-skills.mjs --check` errors if a placeholder
exists without a matching yaml, or vice versa — the two must stay paired.

`.loxtep/skills/<slug>.yaml` is the **only** place scope/permissions are
authored. Never hand-edit an embedded scope block in generated output; it will
be overwritten. If a skill's actual documented capability changes (e.g. it
starts calling a new facade), update the yaml, not the prose describing it.

### Kiro steering docs

`kiro/power/steering/<slug>.md` is generated for every skill automatically
(frontmatter stripped, conditional blocks rendered for the `kiro` tool). To
exclude specific content from the steering rendition only — while keeping it
in the full `SKILL.md` — wrap it in
`<!-- steering:omit -->...<!-- /steering -->`.

## Adding a new skill

1. Create `skills/<new-slug>/SKILL.md`.
2. If it needs RBAC scope, add `.loxtep/skills/<new-slug>.yaml` and a
   `<!-- SCOPE_BLOCK -->` placeholder in the body.
3. Run `node scripts/generate-skills.mjs` — it creates the directory in all
   six tool dirs plus a kiro steering doc automatically.
4. If the skill needs a `.mdc` rule (rare — currently only `loxtep-auth`
   does), add `skills/<new-slug>/rule.mdc.src.md` and an entry in
   `skills/rule-targets.json` mapping the slug to the output filename.
