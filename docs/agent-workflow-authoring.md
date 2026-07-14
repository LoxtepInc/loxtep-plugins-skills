# Agent workflow authoring (all MCP clients)

**Audience:** Any AI agent using Loxtep hosted MCP — Cursor, Claude Code, Codex,
OpenCode, Kiro, Antigravity, or custom clients.

Skills `connect-external-system`, `data-workflows`, and `loxtep-journey-orchestrator`
implement this contract. Hosted MCP tool surface matches it.

---

## Decision tree

| Scenario | Path |
| -------- | ---- |
| **Start of any flow** | **Flow B** — `list_projects` / `create_project` → record `project_id`; optional GitHub attach via `update_project` `github_*` |
| New ingestion / enrichment / consumption flow | Write `workflows/{workflow_id}/` JSON **locally** → build `files` from disk → `save_workflow_bundle` (`dry_run: true` first) |
| GitHub-attached project | **Repo is source of truth** — edit local files, commit, sync to Loxtep via `save_workflow_bundle` (not inline-only MCP payloads) |
| After P1 connect (OAuth, API key, SDK org connector) | Handoff = `connector_id` + captured samples → **P2 bundle** (`connections/{id}.json` in local `files`) |
| User editing an **already open** flow in Studio (small change) | `patch_workflow_graph` only |
| Apply catalog starter template | `apply_template` (writes a bundle internally) |

---

## Do not author bundles inline-only (MCP)

**`save_workflow_bundle` uploads to Loxtep's org workspace store** (S3:
`organizations/.../workflows/{workflow_id}/`). Agents must **also** write the
same JSON to the repo:

```
workflows/{workflow_id}/workflow.json
workflows/{workflow_id}/connections/{id}.json
workflows/{workflow_id}/data-products/{id}.json
…
```

| Correct | Wrong |
| ------- | ----- |
| Write local files → build `files` map from disk → `save_workflow_bundle` | Entire `files` map composed only inside the MCP tool call — no local copy |

When the project is **GitHub-attached**, local repo files are the source of
truth; sync pushes local → Loxtep project.

---

## Do not use piecemeal graph assembly

New flows are authored with **`save_workflow_bundle`**. Connection, transformation, and validation nodes belong in the bundle `files` map — not standalone graph-patch creates.

---

## Do not create data products directly (MCP)

**Agents must not call `create_data_product` for new source or consumer data products.**

| Correct path | Wrong path |
| ------------ | ---------- |
| Design schema (`data-product-modeling`) → `data-products/{id}.json` in bundle → `save_workflow_bundle` → `deploy_workflow` | Standalone `create_data_product` with ODPS payload |

After deploy, a runtime data product carries `workflow_id`, `managed_by: "design-time"`,
`deployed_by: "workflow-deployment"`, and `deployment_bindings` (queues, etc.).
Use `get_data_product` / `update_data_product` **after deploy** for verification,
governance, and medallion — not for initial provisioning.

---

## Phase boundaries (Connect → Ingest)

| Phase | Procedure | Ends with | Do NOT in this phase |
| ----- | --------- | --------- | -------------------- |
| **P1 Connect** | `connect-external-system` + `capture-connector-samples` | `connector_id`, tested credentials, sample payloads | Any workflow graph writes |
| **P2 Design** | `design-ingestion-workflow` (`data-workflows`) | Validated + saved bundle | Piecemeal graph patches for new flows |
| **P2 Deploy** | `deploy-ingestion-workflow` | `deploy_workflow` / `deploy_project` → `deployed` | — |

---

## P2 bundle workflow (canonical)

0. **Project** — `create_project` or reuse (`list_projects`); optional GitHub
   attach (`update_project` `github_*`). Code-first repos: `loxtep init` →
   `loxtep attach` (see **`loxtep-sdk`**).
1. **Write local files** under `workflows/{workflow_id}/`
2. **`get_entity_schemas`** — `pattern`: `ingestion` | `enrichment` | `consumption`
3. **Build `files` map from on-disk JSON** under `workflows/{workflow_id}/`:
   - `workflow.json`
   - `connections/{id}.json` (`connector_id` from P1)
   - `transformations/{id}.json`, `validations/{id}.json` as needed
   - `data-products/{id}.json` with `upstream_entity_id` chain
4. **`save_workflow_bundle`** — `dry_run: true`, fix errors, then `dry_run: false`
5. **`deploy_workflow`** — see `data-workflows` Flow H

Pre-assign UUIDs. Wire with **`upstream_entity_id`**, not separate connect steps.

---

## MCP operations

| Intent | Operation |
| ------ | --------- |
| Author new flow | `save_workflow_bundle` |
| Read schemas / patterns | `get_entity_schemas` |
| Studio canvas incremental edit | `patch_workflow_graph` |
| Inspect existing connection entity | `list_triggers`, `get_trigger`, `test_trigger`, `update_trigger` |

---

## Related skills

- `connect-external-system` — P1 connect + samples
- `data-workflows` — Flow E (bundle compose + save)
- `loxtep-journey-orchestrator` — P0–P7 journey gates
- `docs/skills-user-stories.md` — S1, S2, S14
