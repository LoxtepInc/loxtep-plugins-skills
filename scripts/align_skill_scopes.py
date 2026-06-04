#!/usr/bin/env python3
"""
Align loxtep-plugins-skills SKILL.md bundles to the new `.loxtep/skills/<name>.yaml`
scope schema (skill-package-v1).

For each SKILL.md (per-client mirror of a skill slug), inject an idempotent
"## Skill scope" section carrying a schema-conformant scope + permissions block:
- `scope`: permitted resource types (data_products, connectors, workflows, domains,
  queues) + specific identifiers per type (R5.1)
- `permissions`: allowed operations per resource type drawn from
  {read, write, create, delete}; anything not listed is DENIED (fail-closed) (R5.2)

The hosted MCP config (mcp.loxtep.io) is NOT touched by this script.
"""
import os
import re
import sys

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

BEGIN = "<!-- BEGIN loxtep skill-scope (skill-package-v1) -->"
END = "<!-- END loxtep skill-scope (skill-package-v1) -->"

OP_ORDER = ["read", "create", "write", "delete"]
RES_ORDER = ["data_products", "connectors", "workflows", "domains", "queues"]

# Per-slug: (description, permissions{resource_type: [ops]}, rationale)
# Permissions are mapped from each skill's MCP operation surface to the five
# governed data-mesh resource types. Facades that act on entities outside those
# five types (schemas, quality rules, ontology, procedures, process-intel, agent
# orchestration, instances, sessions) are RBAC-governed and carry no data-mesh
# resource scope -> empty scope/permissions (fail-closed).
RBAC_NOTE = "Fail-closed: this skill's facades are RBAC-governed and carry no data-mesh resource scope."
LP_NOTE = "Scoped to ONLY the identifiers listed; least-privilege per operation. Fail-closed."

SKILLS = {
    "loxtep-auth": (
        "Authentication recovery only \u2014 no data-mesh resource access.",
        {},
        RBAC_NOTE,
    ),
    "loxtep-mcp-session": (
        "Session and RBAC orientation \u2014 no data-mesh resource access.",
        {},
        RBAC_NOTE,
    ),
    "loxtep-instances": (
        "Runtime instance provisioning \u2014 RBAC/billing-governed; no data-mesh resource scope.",
        {},
        RBAC_NOTE,
    ),
    "create-connector": (
        "Manage connectors and project connection nodes.",
        {"connectors": ["read", "create", "write", "delete"]},
        LP_NOTE,
    ),
    "data-workflows": (
        "Author and operate data workflows, connections, and data products.",
        {
            "data_products": ["read", "create", "write", "delete"],
            "connectors": ["read", "create", "write", "delete"],
            "workflows": ["read", "create", "write", "delete"],
            "queues": ["read"],
        },
        LP_NOTE,
    ),
    "data-product-modeling": (
        "Model data products and read their owning domains.",
        {
            "data_products": ["read", "create", "write"],
            "domains": ["read"],
        },
        LP_NOTE,
    ),
    "discover-govern-lineage": (
        "Read-only catalog discovery, lineage, and governance over data products and domains.",
        {
            "data_products": ["read"],
            "domains": ["read"],
        },
        LP_NOTE,
    ),
    "org-semantics-quality": (
        "Org schema and quality-rule governance \u2014 RBAC-governed; no data-mesh resource scope.",
        {},
        RBAC_NOTE,
    ),
    "loxtep-analytics": (
        "Read-only SQL analytics over data products.",
        {"data_products": ["read"]},
        LP_NOTE,
    ),
    "loxtep-workspace": (
        "Workspace versioning plus read-only queue inspection (replay is not performed over MCP).",
        {
            "data_products": ["read"],
            "queues": ["read"],
        },
        LP_NOTE,
    ),
    "loxtep-process-intel": (
        "Runtime process intelligence \u2014 RBAC-governed; no data-mesh resource scope.",
        {},
        RBAC_NOTE,
    ),
    "loxtep-ontology": (
        "Ontology, vocabulary, and namespace management \u2014 RBAC-governed; no data-mesh resource scope.",
        {},
        RBAC_NOTE,
    ),
    "loxtep-procedures": (
        "Process-graph procedures (distinct from data-mesh workflows) \u2014 RBAC-governed; no data-mesh resource scope.",
        {},
        RBAC_NOTE,
    ),
    "loxtep-agent-workspace": (
        "Agent orchestration (issues/goals/agents) \u2014 RBAC-governed; no data-mesh resource scope.",
        {},
        RBAC_NOTE,
    ),
    "loxtep-sdk": (
        "SDK runtime read/write to data products and their queues.",
        {
            "data_products": ["read", "write"],
            "queues": ["read", "write"],
        },
        LP_NOTE,
    ),
    "semantic-ontology-mapping": (
        "Semantic/ontology mapping methodology \u2014 RBAC-governed; no data-mesh resource scope.",
        {},
        RBAC_NOTE,
    ),
}


def fmt_ops(ops):
    ordered = [o for o in OP_ORDER if o in ops]
    return "[" + ", ".join(ordered) + "]"


def build_yaml(slug):
    desc, perms, rationale = SKILLS[slug]
    lines = []
    lines.append("# .loxtep/skills/%s.yaml" % slug)
    lines.append("# Conforms to https://loxtep.io/schemas/skill-package-v1.json")
    lines.append("# %s" % rationale)
    lines.append("name: %s" % slug)
    lines.append("description: %s" % desc)
    lines.append("scope:")
    for rt in RES_ORDER:
        lines.append("  %s: []" % rt)
    if perms:
        lines.append("permissions:")
        for rt in RES_ORDER:
            if rt in perms:
                lines.append("  %s: %s" % (rt, fmt_ops(perms[rt])))
    else:
        lines.append("permissions: {}")
    return "\n".join(lines)


def build_section(slug):
    yaml_block = build_yaml(slug)
    parts = []
    parts.append(BEGIN)
    parts.append("## Skill scope (`.loxtep/skills/%s.yaml`)" % slug)
    parts.append("")
    parts.append(
        "Resource scope and operation permissions for this skill, conformant with the "
        "[`skill-package-v1`](https://loxtep.io/schemas/skill-package-v1.json) schema. "
        "Any resource type or operation not listed is **denied (fail-closed)**. "
        "Identifier lists are empty placeholders \u2014 fill them with the specific "
        "resources in your workspace. This declaration does not change the hosted MCP "
        "config (`mcp.loxtep.io`)."
    )
    parts.append("")
    parts.append("```yaml")
    parts.append(yaml_block)
    parts.append("```")
    parts.append(END)
    return "\n".join(parts)


def slug_from_path(path):
    m = re.search(r"/skills/([^/]+)/SKILL\.md$", path)
    return m.group(1) if m else None


# Headings before which we prefer to insert the section (first match wins).
INSERT_BEFORE = ["## Optional attribution", "## Auth", "## References"]


def upsert(content, section):
    # Idempotent replace if markers already present.
    if BEGIN in content and END in content:
        pattern = re.compile(re.escape(BEGIN) + r".*?" + re.escape(END), re.DOTALL)
        return pattern.sub(lambda _: section, content, count=1)

    block = "\n" + section + "\n"
    for heading in INSERT_BEFORE:
        idx = content.find("\n" + heading)
        if idx != -1:
            insert_at = idx + 1  # keep the leading newline before heading
            return content[:insert_at] + section + "\n\n" + content[insert_at:]
    # Fallback: append at EOF.
    if not content.endswith("\n"):
        content += "\n"
    return content + "\n" + section + "\n"


def main():
    changed = []
    skipped = []
    for root, _dirs, files in os.walk(REPO):
        if "/.git" in root:
            continue
        for fn in files:
            if fn != "SKILL.md":
                continue
            path = os.path.join(root, fn)
            slug = slug_from_path(path)
            if slug is None or slug not in SKILLS:
                skipped.append((path, slug))
                continue
            with open(path, "r", encoding="utf-8") as f:
                content = f.read()
            section = build_section(slug)
            new_content = upsert(content, section)
            if new_content != content:
                with open(path, "w", encoding="utf-8") as f:
                    f.write(new_content)
                changed.append(path)
    print("Changed %d files" % len(changed))
    for p in sorted(changed):
        print("  +", os.path.relpath(p, REPO))
    if skipped:
        print("Skipped (no slug mapping):")
        for p, s in skipped:
            print("  -", os.path.relpath(p, REPO), "slug=", s)


if __name__ == "__main__":
    sys.exit(main())
