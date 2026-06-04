#!/usr/bin/env python3
"""Validate every embedded skill-scope YAML block in SKILL.md files against
the skill-package-v1 JSON schema, and verify the slug matches the `name`."""
import json
import os
import re
import sys

import yaml
from jsonschema import Draft202012Validator

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SCHEMA_PATH = os.path.join(
    os.path.dirname(REPO),
    "loxtep-project-template",
    "schemas",
    "skill-package-v1.schema.json",
)

BLOCK_RE = re.compile(
    r"<!-- BEGIN loxtep skill-scope.*?```yaml\n(.*?)\n```.*?<!-- END loxtep skill-scope.*?-->",
    re.DOTALL,
)


def main():
    with open(SCHEMA_PATH, "r", encoding="utf-8") as f:
        schema = json.load(f)
    validator = Draft202012Validator(schema)

    total = 0
    errors = 0
    for root, _dirs, files in os.walk(REPO):
        if "/.git" in root:
            continue
        for fn in files:
            if fn != "SKILL.md":
                continue
            path = os.path.join(root, fn)
            rel = os.path.relpath(path, REPO)
            slug = re.search(r"/skills/([^/]+)/SKILL\.md$", path).group(1)
            with open(path, "r", encoding="utf-8") as f:
                content = f.read()
            blocks = BLOCK_RE.findall(content)
            if len(blocks) != 1:
                print("FAIL %s: expected 1 scope block, found %d" % (rel, len(blocks)))
                errors += 1
                continue
            total += 1
            doc = yaml.safe_load(blocks[0])
            errs = sorted(validator.iter_errors(doc), key=lambda e: e.path)
            if errs:
                errors += 1
                for e in errs:
                    print("FAIL %s: %s" % (rel, e.message))
                continue
            if doc.get("name") != slug:
                errors += 1
                print("FAIL %s: name '%s' != slug '%s'" % (rel, doc.get("name"), slug))
    print("Validated %d scope blocks; %d error(s)" % (total, errors))
    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main())
