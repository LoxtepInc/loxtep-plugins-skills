# Procedures (Customer MCP)

**Story S9:** Manage **business procedures** and their **workflows** in the process graph (distinct from data-mesh **workflows** in `loxtep_workflows`).

## When to use

- "**List procedures**", "**procedure workflow**", "create/update/delete **procedure**"

## Prerequisites

- MCP auth. Operations are **organization**-scoped.

## Happy-path flow

1. `list_procedures`.
2. `get_procedure_workflow` for one procedure id.
3. `create_procedure` / `update_procedure`; `delete_procedure` with care.

## MCP mapping

| `operation` | Scope |
|-------------|-------|
| `list_procedures`, `get_procedure_workflow`, `create_procedure`, `update_procedure`, `delete_procedure` | organization |

## Pitfalls

- **Data mesh workflows** (`create_workflow`, `patch_workflow_graph`) live under **`loxtep_workflows`** / **`data-workflows`** skill — different product object.

## Optional attribution

`_metadata: { "skill_name": "loxtep-procedures" }`

## Auth

`loxtep-auth` / login.

## References

- See the user story catalog in the Loxtep plugins-skills repository
