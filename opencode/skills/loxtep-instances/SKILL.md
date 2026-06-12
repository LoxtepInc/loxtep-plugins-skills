---
name: loxtep-instances
description: Use when the user works with Loxtep runtime instances via Customer MCP — list_instances, create_instance, instance provisioning, shared vs managed, starter plan, plan_id, payment_method_id, billing UI (add payment methods in app, not MCP), regions, or "create a Loxtep instance".
license: MIT
compatibility: opencode
metadata:
  platform: loxtep
  category: instances
---

# Loxtep instances (Customer MCP)

## Tool shape

- **MCP tool:** `loxtep_instances`
- **Arguments:** `{ "operation": "list_instances" | "create_instance", ...fields }`

### Payment methods — app UI only (read this)

- **There is no MCP tool** to create, tokenize, or add a payment method. Do not ask the user for card numbers, CVV, or bank account details in chat.
- For **managed** or **self-hosted** instances, the user must add a payment method in the **Loxtep app** (Billing, Account, or Payments — exact label depends on the product), complete the **payment processor** flow there, then use the saved method's **`payment_method_id` (UUID)** in `create_instance`.
- If the user has no method yet, **direct them to the dashboard** (e.g. dev or prod app URL for their environment), not to imaginary MCP billing APIs.

## list_instances

```json
{ "operation": "list_instances" }
```

## create_instance

Pass **flat** fields (not nested `instance_config`) — the platform maps them.

### Deployment vs billing (read this)

| `instance_type` | Meaning | `plan_id` |
| ----------------- | -------- | --------- |
| **`shared`** | Default **free-tier playground** (multi-tenant). | Omit or **`free`** only. **Never** `starter` / `pro` / `enterprise` — API validation **rejects** shared + paid plan. |
| **`managed`** | Paid **dedicated** infrastructure. | **`starter`**, **`pro`**, or **`enterprise`** (required). **`payment_method_id`** is **required**. |
| **`self-hosted`** | Customer AWS; advanced / may be limited by environment. | **`payment_method_id`** required. **`connection_details.observe_api`** must include **`cross_account_role_arn`**, the stream **integration** secret ARN, and the **auth** secret ARN. |

### Field summary

| Field | Notes |
| ----- | ----- |
| `name`, `region`, `instance_type` | Required. |
| `plan_id` | Required for **managed**. Omit or non-paid for **shared**. |
| `payment_method_id` | **Required** for **managed** and **self-hosted**. Omit for **shared**. Value is a UUID for a method **already** saved in the app. |
| `connection_details` | **Self-hosted** only; nested `observe_api` with the role + two stream integration ARNs. |

### Correct examples

**Free playground (shared)**

```json
{
  "operation": "create_instance",
  "name": "My playground",
  "region": "us-east-1",
  "instance_type": "shared"
}
```

**Paid Starter (managed)**

```json
{
  "operation": "create_instance",
  "name": "Production mesh",
  "region": "us-east-1",
  "instance_type": "managed",
  "plan_id": "starter",
  "payment_method_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

### Self-hosted example (shape)

```json
{
  "operation": "create_instance",
  "name": "Customer VPC mesh",
  "region": "us-east-1",
  "instance_type": "self-hosted",
  "payment_method_id": "550e8400-e29b-41d4-a716-446655440000",
  "connection_details": {
    "observe_api": {
      "cross_account_role_arn": "arn:aws:iam::123456789012:role/LoxtepObserve",
    }
  }
}
```

### Wrong patterns (validation / API error)

- `instance_type: "shared"` + `plan_id: "starter"` — **invalid** (use **managed** + `plan_id` + `payment_method_id`).
- **Managed** or **self-hosted** without **`payment_method_id`** — **invalid** at MCP and API.
- **Self-hosted** without **`connection_details.observe_api`** ARNs — **invalid**.

<!-- BEGIN loxtep skill-scope (skill-package-v1) -->
## Skill scope (`.loxtep/skills/loxtep-instances.yaml`)

Resource scope and operation permissions for this skill, conformant with the [`skill-package-v1`](https://loxtep.io/schemas/skill-package-v1.json) schema. Any resource type or operation not listed is **denied (fail-closed)**. Identifier lists are empty placeholders — fill them with the specific resources in your workspace. This declaration does not change the hosted MCP config (`mcp.loxtep.io`).

```yaml
# .loxtep/skills/loxtep-instances.yaml
# Conforms to https://loxtep.io/schemas/skill-package-v1.json
# Fail-closed: this skill's facades are RBAC-governed and carry no data-mesh resource scope.
name: loxtep-instances
description: Runtime instance provisioning — RBAC/billing-governed; no data-mesh resource scope.
scope:
  data_products: []
  connectors: []
  workflows: []
  domains: []
  queues: []
permissions: {}
```
<!-- END loxtep skill-scope (skill-package-v1) -->

## Optional attribution

Add `"_metadata": { "skill_name": "loxtep-instances" }` alongside other fields.

## Auth

If MCP returns missing JWT / auth errors, reconnect the Loxtep MCP server to re-trigger OAuth (skill **loxtep-auth**).

## References

- [User story catalog](../../docs/skills-user-stories.md) (story **S11**)
