#!/usr/bin/env python3
"""Loader: push OKF seed records into Loxtep via the customer MCP HTTP API.

Companion to seed_from_okf.py. Reads the exporter's records (YAML) and creates
ontology concepts + relationships (+ optional thesaurus terms) by POSTing to
`/ai/mcp/tools/call`. Runs the whole seed in one burst — the right tool for bulk
seeding (avoids the per-turn token expiry you hit driving MCP by hand).

Auth: pass a bearer token via --token or $LOXTEP_TOKEN. The token only needs to
live for the duration of the run (~seconds), so one fresh token is plenty.

Usage:
    export LOXTEP_TOKEN="<bearer token for the dev instance>"
    python3 load_to_loxtep.py --records /tmp/seed-core.yaml \
        --base-url https://mcpdev.loxtep.io --namespace okf_nate
    # add --relationships to also create edges, --thesaurus for aliases,
    # --dry-run to print the plan without calling.

Idempotent: a URI/name conflict is treated as success (re-runnable).
Dependencies: PyYAML, requests.
"""
from __future__ import annotations

import argparse, json, os, sys, time
from pathlib import Path

import yaml
import requests

NODE_TYPE = {
    "entity": "entity", "customer": "entity",
    "concept": "taxonomy",
    "synthesis": "custom", "positioning": "custom", "market-analysis": "custom",
    "reference": "custom", "summary": "custom", "source": "custom", "note": "custom",
}
URI_BASE = "https://loxtep.io/okf"


def uri_for(canonical_key: str, namespace: str) -> str:
    path = canonical_key.lstrip("/")
    if path.endswith(".md"):
        path = path[:-3]
    ns = namespace.replace("okf_", "")  # okf_nate -> nate
    return f"{URI_BASE}/{ns}#{path}".replace(" ", "%20")


def main():
    ap = argparse.ArgumentParser(description="Load OKF seed records into Loxtep via customer MCP.")
    ap.add_argument("--records", default="/tmp/seed-core.yaml", help="exporter output (YAML: {meta, records})")
    ap.add_argument("--base-url", default=os.environ.get("LOXTEP_MCP_URL", "https://mcpdev.loxtep.io"))
    ap.add_argument("--token", default=os.environ.get("LOXTEP_TOKEN", ""))
    ap.add_argument("--namespace", default="okf_nate")
    ap.add_argument("--relationships", action="store_true", help="also create ontology relationships (edges)")
    ap.add_argument("--thesaurus", action="store_true", help="also create thesaurus terms from aliases")
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    if not args.token and not args.dry_run:
        sys.exit("No token. Set --token or $LOXTEP_TOKEN (bearer for the target instance).")

    doc = yaml.safe_load(Path(args.records).read_text(encoding="utf-8"))
    records = doc["records"] if isinstance(doc, dict) and "records" in doc else doc

    # dedupe by label (the bundle has a few duplicate-label files; nodes/edges are name-keyed)
    seen, recs = set(), []
    for r in records:
        lab = r["label"].strip()
        if lab.lower() in seen:
            continue
        seen.add(lab.lower())
        recs.append(r)
    label_set = {r["label"].strip() for r in recs}
    ck2label = {r["canonical_key"]: r["label"].strip() for r in recs}

    url = args.base_url.rstrip("/") + "/ai/mcp/tools/call"
    session = requests.Session()
    headers = {"Authorization": f"Bearer {args.token}", "Content-Type": "application/json"}

    stats = {"concept_ok": 0, "concept_dup": 0, "concept_err": 0,
             "edge_ok": 0, "edge_skip": 0, "edge_err": 0,
             "term_ok": 0, "term_err": 0}
    errors = []

    def call(name, arguments):
        if args.dry_run:
            return {"success": True, "dry_run": True}
        for attempt in range(3):
            try:
                resp = session.post(url, headers=headers,
                                    json={"name": name, "arguments": arguments}, timeout=30)
                if resp.status_code == 401:
                    sys.exit("401 Unauthorized — token expired/invalid. Get a fresh token and re-run "
                             "(the script is idempotent, so already-created concepts are skipped).")
                data = resp.json()
                # unwrap MCP content envelope if present
                if isinstance(data, dict) and "content" in data and data.get("content"):
                    txt = data["content"][0].get("text", "")
                    try: data = json.loads(txt)
                    except Exception: pass
                return data
            except requests.RequestException as e:
                if attempt == 2:
                    return {"success": False, "error": str(e)}
                time.sleep(1.5 * (attempt + 1))

    # ---- pass 1: concepts ----
    print(f"Seeding {len(recs)} concepts into namespace '{args.namespace}' at {args.base_url} ...")
    for r in recs:
        lab = r["label"].strip()
        nt = NODE_TYPE.get(r["class"], "custom")
        res = call("loxtep_ontology", {
            "operation": "create_ontology_concept",
            "name": lab, "namespace": args.namespace, "node_type": nt,
            "description": (r.get("definition") or "")[:1000],
            "uri": uri_for(r["canonical_key"], args.namespace),
        })
        if res.get("success"):
            stats["concept_ok"] += 1
        elif "exist" in json.dumps(res).lower() or "conflict" in json.dumps(res).lower():
            stats["concept_dup"] += 1
        else:
            stats["concept_err"] += 1; errors.append((lab, res.get("error")))
        print(f"  [{stats['concept_ok']+stats['concept_dup']+stats['concept_err']}/{len(recs)}] {lab}", flush=True)

    # ---- pass 2: relationships (name-keyed; only when both ends are in-scope) ----
    if args.relationships:
        edges = []
        for r in recs:
            src = r["label"].strip()
            for e in r.get("edges", []):
                tgt = ck2label.get(e["to"])
                if tgt and tgt in label_set:
                    edges.append((src, e["type"], tgt))
        print(f"\nCreating {len(edges)} relationships ...")
        for src, etype, tgt in edges:
            res = call("loxtep_ontology", {
                "operation": "create_ontology_relationship",
                "source_entity_type": src, "target_entity_type": tgt, "relation_type": etype,
            })
            if res.get("success"): stats["edge_ok"] += 1
            else: stats["edge_err"] += 1

    # ---- pass 3: thesaurus terms from aliases (array-of-objects {path}) ----
    if args.thesaurus:
        print("\nCreating thesaurus terms ...")
        for r in recs:
            aliases = [{"path": a} for a in (r.get("aliases") or []) if a][:12]
            if not aliases:
                continue
            ck = r["canonical_key"].lstrip("/").replace(".md", "").replace("/", "-").lower()
            res = call("loxtep_ontology", {
                "operation": "create_thesaurus_term",
                "canonical_key": ck, "scheme": "custom", "aliases": aliases,
            })
            if res.get("success"): stats["term_ok"] += 1
            else: stats["term_err"] += 1

    print("\n=== summary ===")
    for k, v in stats.items():
        print(f"  {k}: {v}")
    if errors:
        print("\nfirst errors:")
        for lab, err in errors[:10]:
            print(f"  {lab}: {err}")


if __name__ == "__main__":
    main()
