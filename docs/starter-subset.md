# Starter set — your first 15 minutes

Loxtep ships **23 skills**. You do not need all of them on day one. The
**Starter set** is the minimal path from install to a governed query over your
own data: authenticate, connect one source, and query it. Everything else stays
installed and available — it just isn't what you reach for first.

## The Starter set (default entry experience)

| Order | Skill | What it does |
| --- | --- | --- |
| 1 | **`loxtep-mcp-session`** | Establishes your session, org context, and what you're allowed to do (`get_current_user`, `get_current_organization`). Start here. |
| 2 | **`loxtep-auth`** | Recovers cleanly if the hosted MCP returns an auth error (re-run OAuth, retry). |
| 3 | **`connect-external-system`** | Connects one **Golden Path connector** — Postgres, S3, webhook, Shopify, Stripe, or HubSpot — and captures samples. |
| 4 | **`data-workflows`** | Turns that connected source into a governed data product you (and your agent) can query. |

Golden Path connectors are the ones marketed as no-code for SMBs: **Postgres,
S3, webhook, Shopify, Stripe, HubSpot** (plus Composio for
Salesforce/NetSuite/QuickBooks). Pick one; you can add more later.

Because governance is **on by default** at instance creation (audit logging +
field masking), your very first query is already recorded in the audit log and
respects masked fields — no policy authoring required.

## Everything else (opt-in)

The full skill set remains installed and is there when you need it — nothing is
removed. Reach for these as your use case grows:

- **Modeling & semantics:** `data-product-modeling`, `loxtep-schemas`,
  `loxtep-semantic-layer`, `semantic-ontology-mapping`, `loxtep-ontology`,
  `org-semantics-quality`
- **Governance & discovery:** `discover-govern-lineage`, `governance-policies`,
  `promote-data-product`
- **Operations:** `loxtep-deployments`, `loxtep-workspace`,
  `loxtep-queue-tracing`, `loxtep-instances`, `loxtep-analytics`
- **Advanced / context:** `loxtep-agent-workspace`, `loxtep-process-intel`,
  `loxtep-procedures`, `loxtep-journey-orchestrator`, `loxtep-sdk`,
  `mcp-integration`

## Next step

Follow the [Loxtep Quickstart](https://docs.loxtep.io/quickstart), or just tell
your agent: *"Use Loxtep to connect my Postgres database and show me the orders
table."* The Starter-set skills handle the rest.
