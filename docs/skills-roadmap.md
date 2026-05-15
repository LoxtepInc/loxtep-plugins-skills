# Loxtep plugins — skills roadmap

Canonical MCP grouping: **17** `loxtep_*` tools; each call sets **`operation`** to a flat tool name plus arguments. See the [Customer MCP Server README](https://github.com/symmatiq/loxtep/blob/main/platform-backend/_customer-mcp-server/README.md).

**Pick a goal first:** use the [user story catalog](skills-user-stories.md) (S0–S13) to map intent → primary skill → facades. Skills in `claude/skills/`, `cursor/skills/`, `kiro/skills/`, `opencode/skills/`, `antigravity/skills/`, and `codex/skills/` are kept in parity.

---

## Current skills (implemented)

| Skill `name` | User stories | Primary MCP facades |
|--------------|----------------|---------------------|
| `loxtep-auth` | S12 | — (login CLI; no grouped tool) |
| `loxtep-instances` | S11 | `loxtep_instances` |
| `create-connector` | S1 | `loxtep_connectors`, `loxtep_connections`, `loxtep_templates` (connector flows) |
| `data-workflows` | S0, S2, S3 (+ orchestrates with `create-connector` for S1) | `loxtep_session`, `loxtep_projects`, `loxtep_templates`, `loxtep_workflows`, `loxtep_connections`, `loxtep_data_products` |
| `discover-govern-lineage` | S5 | `loxtep_catalog` |
| `org-semantics-quality` | S4 | `loxtep_schemas`, `loxtep_quality` |
| `loxtep-analytics` | S6 | `loxtep_analytics` |
| `loxtep-workspace` | S7 | `loxtep_workspace` |
| `loxtep-process-intel` | S8 | `loxtep_process_intel` |
| `loxtep-procedures` | S9 | `loxtep_procedures` |
| `loxtep-ontology` | S13 | `loxtep_ontology` |
| `loxtep-agent-workspace` | S10 | `loxtep_agent_workspace` |

Each skill’s `SKILL.md` includes flows, pitfalls, and an MCP mapping table where relevant.

---

## Index by user story

| Story | Intent (short) | Primary skill |
|-------|----------------|---------------|
| S0 | Session / org context | `data-workflows` |
| S1 | Connect SaaS / API (e.g. Shopify) | `create-connector` |
| S2 | Omnichannel data product | `data-workflows` |
| S3 | Webhook / consumptions | `data-workflows` |
| S4 | Org schemas, PII, quality | `org-semantics-quality` |
| S5 | Catalog, lineage, discovery | `discover-govern-lineage` |
| S6 | SQL / analytics | `loxtep-analytics` |
| S7 | Snapshots, versions, reindex | `loxtep-workspace` |
| S8 | Runtime entity context / decision traces | `loxtep-process-intel` |
| S9 | Procedures (CRUD, import/export, dependencies) | `loxtep-procedures` |
| S10 | Agent issues / goals (not data workflows) | `loxtep-agent-workspace` |
| S11 | List / create instances | `loxtep-instances` |
| S12 | Auth recovery | `loxtep-auth` |
| S13 | Ontology, vocabulary, namespace management | `loxtep-ontology` |

Full narrative: [skills-user-stories.md](skills-user-stories.md).

---

## Index by MCP facade → primary skill

| MCP tool (`loxtep_*`) | Primary skill(s) |
|-----------------------|------------------|
| `loxtep_session` | `data-workflows` |
| `loxtep_instances` | `loxtep-instances` |
| `loxtep_connectors` | `create-connector` |
| `loxtep_connections` | `create-connector` and `data-workflows` (shared by design) |
| `loxtep_projects` | `data-workflows` |
| `loxtep_templates` | `data-workflows`; `create-connector` for connector-template flows |
| `loxtep_workflows` | `data-workflows` |
| `loxtep_data_products` | `data-workflows` |
| `loxtep_catalog` | `discover-govern-lineage` |
| `loxtep_schemas`, `loxtep_quality` | `org-semantics-quality` |
| `loxtep_analytics` | `loxtep-analytics` |
| `loxtep_workspace` | `loxtep-workspace` |
| `loxtep_process_intel` | `loxtep-process-intel` |
| `loxtep_procedures` | `loxtep-procedures` |
| `loxtep_ontology` | `loxtep-ontology` |
| `loxtep_agent_workspace` | `loxtep-agent-workspace` |

Operation-level index: final section of [skills-user-stories.md](skills-user-stories.md) (“MCP operation → skill index”).

---

## Optional attribution (`_metadata`)

Agents may pass `_metadata: { skill_name: '<slug>' }` on tool arguments; it must match the skill’s `name` in frontmatter. See repository root [README](../README.md#skill-attribution-optional).

| `skill_name` value |
|--------------------|
| `loxtep-auth`, `loxtep-instances`, `create-connector`, `data-workflows`, `discover-govern-lineage`, `org-semantics-quality`, `loxtep-analytics`, `loxtep-workspace`, `loxtep-process-intel`, `loxtep-procedures`, `loxtep-ontology`, `loxtep-agent-workspace` |

---

## Candidate skills (future)

Add focused skills only when agents repeatedly mis-route or need deeper playbooks. Prefer **one or two** new skills per iteration.

| Candidate slug | Rationale |
|----------------|-----------|
| `session-org` | Deep playbook for **only** `loxtep_session` if S0 grows too large inside `data-workflows`. |

Scaffold new skills like [create-connector](../cursor/skills/create-connector/SKILL.md): frontmatter `name`, triggers, `loxtep_*` + `operation` tables, optional `_metadata.skill_name`, auth pointer, link to [skills-user-stories.md](skills-user-stories.md).

---

## Drift checks

See [mcp-operation-skills-drift.md](mcp-operation-skills-drift.md) for how to keep the catalog aligned with `mcp-facades.ts` in the monorepo.
