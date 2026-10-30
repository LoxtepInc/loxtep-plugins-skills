<!-- GENERATED FILE -- single source: loxtep/scripts/plugins-skills-generate-skills.mjs. From the loxtep root run `PLUGINS_SKILLS_ROOT=<plugins-skills> node scripts/sync-skills-to-plugins-skills.mjs` (or that generator with PLUGINS_SKILLS_ROOT set). Do not edit client copies; do not run sibling scripts/generate-skills.mjs. -->

# Loxtep MCP — session, capabilities, and denials

**Story S0+:** How to orient before (and after) other Customer MCP work —
without relying on any private repo or source tree.

## When to use

- “**What can I do** with MCP?”, “**Permission denied**”, “**403**”, “do I have
  access to …?”
- Before a heavy workflow: confirm **who** and **which org** before passing
  **`project_id`**.

## Recommended session pattern

1. **`loxtep_session`** → **`get_current_user`** (no extra args unless your tool
   schema requires them). The response includes:
   - **`permissions`** — effective grants (typically `resource`, `action`,
     `source`, …). Use this to reason about RBAC.
   - **`roles`** — role assignments.
   - **`user`** / **`organization`** — identity context.
2. **`loxtep_session`** → **`get_platform_model`** (no arguments). Returns the
   Loxtep platform model: concepts, relationships, and the confusions to avoid
   (connector vs connection, shape vs concept vs data product, Products vs
   Meaning). Load this before any tool that creates or changes Loxtep resources.
   The model describes Loxtep. It is not a vocabulary pack and not the
   customer's business ontology (`loxtep_meaning`).
3. **`loxtep_session`** → **`get_current_organization`** — confirm org scope
   matches expectations.
4. **`loxtep_session`** → **`platform_health_check`** (optional but recommended
   on cold start) — ~5s Semantica-style doctor for auth, instance Observe
   namespace (same classifier as the proxy 409) plus public-instance deny-list,
   graph reachability, decision-traces (empty-ok), and MCP facade surface /
   deprecated names. Structured `checks[]` with `pass|fail|warn`. Optional
   `instance_id`. A rejected namespace (`lxapp*` on a tenant, foreign `w-` /
   `org-` prefix) **fails** `instance_observe_api`; it cannot be fixed with
   `update_instance`.
5. For **project-scoped** facades (`loxtep_build`, …), include **`project_id`**
   on every call that needs it.
6. Open your MCP client’s **ListTools** (or schema) for **`loxtep_*`** tools —
   parameter names and descriptions live there; there is no separate “capability
   discovery” MCP operation beyond `platform_health_check` for env sanity.

## First useful answer

After identity and platform orientation, call `loxtep_session` → `get_started`.
Use `_metadata: { skill_name: "data-workflows" }` for this potentially mutating
operation, or omit attribution so the server uses that operation mapping.
Do not attribute it to the read-only session skill.
Use existing authorized products when present. Errors and permission denials
never mean the org is empty. Do not claim queryability from a catalog listing.

If the response is `empty`, offer the synthetic sample policy product or the
human's own context. Ask before creating the sample; only then pass
`create_sample: true`. This creates a labeled example domain, project, and
catalog knowledge product, not an external connector or warehouse. It needs
ordinary create permissions. Do not install both native plugins and duplicate
skills when resuming a setup initiated by `loxtep start`.

For `provisioning`, retry after the returned delay. Reuse the product returned
on retries. For `ready`, use the suggested question and returned scoped-search
evidence, cite the sample product, and explicitly label the answer synthetic.
This verifies stored policy retrieval, not the human's business data. For
`verification_failed`, diagnose the failure and do not overwrite edited content
or claim success. Finish with a concrete next step toward the human's own
context. Keep approvals for connecting sources and promoting business meaning.

`get_started` is not published in ontology-only mode. Use the allowed meaning
tools there; do not bypass the org's publication policy.

## Permission denials

- Tools enforce **resource:action**-style RBAC (e.g. create vs read). If a call
  fails with a permission error, compare it to entries in
  **`get_current_user.permissions`** (`resource` + `action`).
- **Fix:** an org **owner/admin** must change your role or assignments — MCP
  login cannot upgrade RBAC.
- **401 / missing token:** use **`loxtep-auth`** (`login`), not this Agent-Scope
  Skill.

## Plugins & skills updates (nudge)

**Hosted MCP tools are always current** after platform deploy. **Plugins and
skills are a local snapshot** — they do not auto-update for every install path.

**When to nudge** (one short message; do not block the session):

- `ListTools` / docs mention an op the client never heard of (e.g.
  `preview_query_trigger`) or the agent still proposes retired paths (e.g.
  `sql_materialize` transform).
- User asks “what’s new”, reports stale skills, or skills contradict MCP.

**What to tell them:**

1. Latest skills release:
   https://github.com/LoxtepInc/loxtep-plugins-skills/releases/latest
2. Refresh by client:
   - **Cursor (team marketplace):** admin **Refresh** (or **Auto Refresh** +
     GitHub App), then refocus or restart Cursor.
   - **Cursor (Import / local clone):** re-import the repo or reinstall the
     plugin from `https://github.com/LoxtepInc/loxtep-plugins-skills`
     (`cursor/`).
   - **Claude Code:** update the marketplace and reinstall —
     `claude plugin marketplace update` then
     `claude plugin install loxtep-claude@loxtep` (or `/plugin` UI).
   - **Kiro / OpenCode / Antigravity:** re-import or re-copy from the repo /
     release artifact.
3. After refresh, reconnect MCP if tool schemas look cached, then retry.

Do **not** invent a local `npx` MCP or rewrite `~/.loxtep` configs as the fix —
skills lag is almost always “refresh the plugin,” not auth.

## Pitfalls

- **`get_current_user`** needs the platform Organizations API reachable from the
  AI runtime (same as other session tools). If it errors on URL/config, that’s
  deployment wiring — not fixed by repeating `login` on the client alone.
- **ListTools** shows facades and parameters; it does not replace
  **`get_current_user`** for “what am I allowed?” — use both.
- **Agents idle vs inbox HITL:** if `list_agents` shows never-heartbeated seeded
  agents but `loxtep_review.list_pending` shows `pko-engine` approvals, that is
  expected for PKO-driven mapping gates — not a dead dispatcher. See
  [pko-engine-vs-seeded-agents.md](../../../docs/agent-orchestration/pko-engine-vs-seeded-agents.md).
- **PKO procedure runs:** to verify enqueue / HITL provenance for a data
  product, use **`loxtep_context` → `list_runs`** with `data_product_id` (not
  approval-row scraping). `start_run` is not an MCP operation — runs are started
  by the PKO engine. Pre-deploy / operators:
  `GET /agent-orchestration/procedure-runs/{data_product_id}` or table
  `procedure_runs`.

<!-- BEGIN loxtep skill-scope (skill-package-v1) -->

## Agent-Scope Skill scope (`.loxtep/skills/loxtep-mcp-session.yaml`)

Resource scope and operation permissions for this Agent-Scope Skill, conformant
with the [`skill-package-v1`](https://loxtep.io/schemas/skill-package-v1.json)
schema. Any resource type or operation not listed is **denied (fail-closed)**.
Identifier lists are empty placeholders — fill them with the specific resources
in your workspace. This declaration does not change the hosted MCP config
(`mcp.loxtep.io`).

```yaml
# .loxtep/skills/loxtep-mcp-session.yaml
# Conforms to https://loxtep.io/schemas/skill-package-v1.json
# Fail-closed: this skill's facades are RBAC-governed and carry no data-mesh resource scope.
name: loxtep-mcp-session
description: Session and RBAC orientation — no data-mesh resource access.
scope:
  data_products: []
  connectors: []
  workflows: []
  domains: []
  queues: []
permissions: {}
```

<!-- END loxtep skill-scope (skill-package-v1) -->

## Skill attribution (required)

MCP tool calls need a resolvable skill name. Prefer
`_metadata: { "skill_name": "loxtep-mcp-session" }`; otherwise the server infers
from the operation map or `X-Skill-Name`. Unresolvable calls are denied
(`MISSING_SKILL_ATTRIBUTION`). The skill name also drives scope checks.

## References

- [User story catalog](../../../docs/skills-user-stories.md) (S0)
