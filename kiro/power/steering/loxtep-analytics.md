# Analytics and SQL (Customer MCP)

**Story S6:** Explore curated mesh data with **SQL** — discover tables, inspect schema, run queries, fetch results.

## When to use

- "Run **SQL**", "**list tables**", "**schema** for table", "**execute_query**", "get **query results**"

## Prerequisites

- MCP auth. Operations are **organization**-scoped in MCP map.

## Happy-path flow

1. `loxtep_analytics` → `list_tables`.
2. `get_table_schema` for chosen table(s).
3. `execute_query` with the required `query` parameter (the SQL text). The required parameter is named `query`, not `sql`.
4. `get_query_results` if execution is asynchronous or paginated.

## MCP mapping

| Step | `operation` | Scope |
|------|-------------|-------|
| List | `list_tables` | organization |
| Schema | `get_table_schema` | organization |
| Run | `execute_query` | organization |
| Results | `get_query_results` | organization |

## Pitfalls

- Large result sets — use limits / pagination per platform.
- Wrong **org** or missing permissions show as auth or empty results.
- **Execution environment** — SQL runs via **in-process** DuckDB in the AI service, not a user-supplied database URL.

## Optional attribution

`_metadata: { "skill_name": "loxtep-analytics" }`

## Auth

`loxtep-auth` / login.

## References

- See the user story catalog in the Loxtep plugins-skills repository
