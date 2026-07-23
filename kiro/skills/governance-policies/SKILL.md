<!-- GENERATED FILE -- edit skills/<slug>/SKILL.md (or rule.mdc.src.md) and run `node scripts/generate-skills.mjs` -- do not edit directly -->
---
name: governance-policies
description:
  Use when the user wants to author, edit, lift, or reason about GOVERNANCE
  POLICIES — the deploy-time gate that blocks a deployment or requires approval
  before a data product or workflow goes live. Covers the policy schema, rules,
  condition syntax (freeze / quality_score / classification / pii), enforcement
  modes (block vs audit), scope, status, and the approval gate. NOT on the MCP
  tool surface: policies are managed via the governance REST API or the console,
  not loxtep_* tools. To inspect governance flags on existing data instead, use
  discover-govern-lineage (loxtep_query get_governance_flags). User story S5
  (governance authoring). See docs/skills-user-stories.md.
metadata:
  documentation: https://github.com/LoxtepInc/loxtep-plugins-skills/blob/main/kiro/skills/governance-policies/SKILL.md
---

# Governance policies (deploy-time gate)

**Authoring and reasoning about governance policies** — the rules that gate **deployments** of data
products and workflows. Customer-facing reference:
`/docs/guides/governance-policies` in the Loxtep docs.

## First: pick the right enforcement point

Governance is enforced in **two** places. Choosing wrong is the #1 mistake.

| | **Deploy-time gate (this skill)** | **Runtime / event-time** |
|---|---|---|
| Governs | the **change** (deploying a DP/workflow) | the **data** flowing through a product |
| Good for | approval/sign-off, classification/compliance, contract breaking-change, release freeze | data quality, schema/contract conformance, PII handling |
| Not for | **data quality** (you deploy to *fix* quality) | structural change approvals |

If the user asks to "block low-quality data," that is **runtime** — use quality rules + data
contracts, not a policy. Blocking a deploy on low quality is backwards (the deploy is the fix).

## Where policies live (NOT MCP)

Policies are **not** exposed through the Loxtep MCP. Manage them via the console **Governance** area
or the governance REST API (IAM/SigV4-signed; a plain JWT bearer is rejected):

| Op | Route |
|---|---|
| List | `GET /governance/policies` |
| Get | `GET /governance/policies/{policy_id}` |
| Create | `POST /governance/policies` |
| Update | `PUT /governance/policies/{policy_id}` |
| Delete | `DELETE /governance/policies/{policy_id}` |

For *inspecting* governance flags on existing data products, switch to the
`discover-govern-lineage` skill (`loxtep_observe` → `get_governance_flags`).

## Policy schema (POST body)

```jsonc
{
  "name": "Require approval before deploy (Data Council)", // required
  "type": "data_governance",        // categorization only; does not change gate behavior
  "status": "draft",                // draft | active | approved | archived
  "is_active": true,                // default true
  "requires_approval": true,        // optional — turns on the approval gate
  "approval_threshold": 1,          // optional, default 1
  "rules": [                         // required, >= 1
    { "condition": "<string>", "action": "deny", "resources": ["data-products"] }
  ],
  "scope": { "domains": ["<domain_id>"], "dataProducts": ["<dp_id>"], "users": ["<user_id>"] },
  "metadata": { "enforcement": "block" }  // block | audit
}
```

- The gate acts on **`deny`** rules and the policy-level `requires_approval`. `allow` is informational.
- `condition` is a **non-empty string**. Structured conditions are passed as a **JSON string**, not a
  JSON object.

## Condition syntax

Anything not recognized (empty, `"{}"`, or a plain label like `"freeze:release-window"`) ⇒
**unconditional** freeze (blocks every DP in scope).

| Intent | `condition` (JSON string) | Denies when… |
|---|---|---|
| Freeze / lock | `"freeze:release-window"` or `"{}"` | always — every DP in scope |
| Quality score | `{"metric":"quality_score","operator":"lt","value":95}` | latest score `< 95` (usually wrong gate) |
| Classification | `{"metric":"classification","operator":"eq","value":"restricted"}` | DP classified `restricted` |
| PII present | `{"metric":"pii","operator":"exists"}` | DP declares any PII fields |
| PII missing | `{"metric":"pii","operator":"not_exists"}` | DP declares no PII fields |

- `quality_score` ops: `lt lte gt gte eq neq` (numeric). Unmeasured DPs are **not** a violation.
- `classification` ops: `eq neq in not_in` (string or array; case-insensitive).
- A structured condition denies only the **specific DPs that violate it**, not the whole deploy.

## Enforcement, status, approval

- `metadata.enforcement`: **`block`** = violations fail the deploy; **`audit`** = logged, deploy
  proceeds (use to trial a policy).
- Only evaluated when **`status ∈ (active, approved)` AND `is_active = true`**. `draft`/`archived`
  are inert. To lift a live policy without deleting: set `status: draft` or `enforcement: audit`.
- `requires_approval: true` + `enforcement: block` blocks deploys in scope until the required
  approvals are recorded.

## How the gate evaluates

1. Load active policies (org). 2. Match **scope** (`applies_to`): `organization` always applies;
`domain` matches the deploy's domain; `data_product` matches a deployed DP; **empty scope ⇒
org-wide**. 3. Skip `audit`. 4. For each `deny` rule: unconditional ⇒ violation; structured ⇒ load
per-DP signals (latest quality score, classification, pii fields) and deny only offenders.
5. `requires_approval` + block + no approval ⇒ violation. 6. Any violation blocks the deploy.

**Data Council** is the org's **root governance domain** — a policy scoped there (or org-wide) gates
everything beneath it. Moving a project into a governed domain subjects it to those policies.

## Common gotchas

- A `deny` rule with **no structured condition denies everything in scope** — that is a freeze. An
  empty/`"{}"` condition will block *all* deploys in its domain.
- `condition` must be a JSON **string**, not an object, in the body.
- Both `status` and `is_active` matter (`active` + `is_active:false` is inert).
- Quality at deploy time is an anti-pattern — gate quality at runtime.
- Scope drives evaluation via `applies_to`; an unscoped policy applies org-wide.

## Lifecycle cheatsheet

- **Dormant**: POST `status: draft`. **Trial**: `status: active` + `enforcement: audit`.
- **Enforce**: `status: active` + `enforcement: block`. **Pause**: PUT `status: draft`.
- **Remove**: `DELETE /governance/policies/{id}`.

<!-- BEGIN loxtep skill-scope (skill-package-v1) -->

## Agent-Scope Skill scope (`.loxtep/skills/governance-policies.yaml`)

Resource scope and operation permissions for this Agent-Scope Skill, conformant
with the [`skill-package-v1`](https://loxtep.io/schemas/skill-package-v1.json)
schema. Any resource type or operation not listed is **denied (fail-closed)**.
Identifier lists are empty placeholders — fill them with the specific resources
in your workspace. This declaration does not change the hosted MCP config
(`mcp.loxtep.io`).

```yaml
# .loxtep/skills/governance-policies.yaml
# Conforms to https://loxtep.io/schemas/skill-package-v1.json
# Fail-closed: policy CRUD is RBAC-governed via the governance API/console, not a data-mesh
# resource scope and not on the MCP tool surface.
name: governance-policies
description: Author and manage deploy-time governance policies — RBAC-governed; no data-mesh resource scope.
scope:
  data_products: []
  connectors: []
  workflows: []
  domains: []
  queues: []
permissions: {}
```

<!-- END loxtep skill-scope (skill-package-v1) -->
