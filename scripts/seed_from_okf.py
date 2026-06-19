#!/usr/bin/env python3
"""Seed exporter: OKF / LLM-wiki bundle -> Loxtep seed records.

Reference implementation for docs/seed-from-okf-wiki.md. Walks an OKF bundle and
emits one intermediate "seed record" per concept document (the shape consumed by
the MCP seeding pipeline) plus a stats report that pressure-tests the mapping
contract — especially relationship-edge coverage and link resolution.

This is a *prototype / exporter* only: it produces records, it does not call the
Loxtep MCP. Usage:

    python3 seed_from_okf.py --bundle /path/to/okf --out seed-records.yaml
    python3 seed_from_okf.py --bundle okf --exclude-class learning-note,note   # semantic core

Dependencies: PyYAML.
"""
from __future__ import annotations

import argparse
import re
import sys
from collections import Counter
from pathlib import Path

import yaml

# --- OKF contract knowledge -------------------------------------------------

# type values we emit as concepts; anything else is emitted but flagged off-vocab.
KNOWN_TYPES = {
    "entity", "concept", "synthesis", "customer", "market-analysis",
    "positioning", "reference", "learning-note", "summary", "source", "note",
}
# navigation/provenance — parsed for structure, never emitted as concepts.
SKIP_TYPES = {"index", "log"}

# off-vocab near-synonyms folded onto the canonical vocabulary (dogfood finding).
NORMALIZE = {
    "market-research": "market-analysis",
    "research": "synthesis",
    "analysis": "synthesis",
    "briefing": "summary",
    "content": "reference",
    "customer-engagement": "customer",
}

# frontmatter ref-list fields -> semi-explicit edge type (tier 1.5).
# `sources` is handled leniently (values are often counts/prose, not refs).
FM_REF_FIELDS = {
    "relations": None,            # explicit: each item carries its own `type`
    "entities": "participates-in",
    "concepts": "participates-in",
    "related-entities": "relates-to",
    "related-concepts": "relates-to",
    "related": "relates-to",
    "sources": "derived-from",
}
PHANTOM_FIELDS = {"relations", "entities", "concepts",
                  "related-entities", "related-concepts", "related"}

LINK_RE = re.compile(r"\[[^\]]*\]\((/[^)\s#]+\.md)(?:#[^)]*)?\)")
HEADING_RE = re.compile(r"^#{1,6}\s+(.*)$")


# --- helpers ----------------------------------------------------------------

def split_frontmatter(text: str):
    if not text.startswith("---"):
        return {}, text
    end = text.find("\n---", 3)
    if end == -1:
        return {}, text
    fm_block = text[3:end].strip("\n")
    body = text[end + 4:].lstrip("\n")
    try:
        fm = yaml.safe_load(fm_block) or {}
    except yaml.YAMLError:
        fm = {}
    if not isinstance(fm, dict):
        fm = {}
    return fm, body


def as_list(v):
    if v is None:
        return []
    return v if isinstance(v, list) else [v]


def canonical_of(path: Path, bundle: Path) -> str:
    return "/" + str(path.relative_to(bundle)).replace("\\", "/")


def infer_body_edge(src_type: str, tgt_type: str, section: str) -> str:
    """3-tier strategy, tier 2: deterministic inference from context."""
    s = (section or "").lower()
    if tgt_type in ("source", "summary") or "source" in s:
        return "derived-from"
    if src_type == "synthesis":
        return "participates-in"
    if src_type == "customer" and tgt_type == "entity":
        return "consumes"
    if src_type == "entity" and tgt_type == "entity" and "competit" in s:
        return "conflicts-with"
    if src_type == "entity" and tgt_type == "concept":
        return "participates-in"
    if src_type == "concept" and tgt_type == "concept" and ("broader" in s or "parent" in s):
        return "broader-than"
    if "related" in s:
        return "relates-to"
    return "relates-to"


# --- main -------------------------------------------------------------------

def main():
    ap = argparse.ArgumentParser(description="Export OKF bundle to Loxtep seed records.")
    ap.add_argument("--bundle", default="okf", help="path to OKF bundle root")
    ap.add_argument("--out", default="seed-records.yaml", help="output YAML path")
    ap.add_argument("--include-class", default="", help="comma list of normalized classes to keep (default: all)")
    ap.add_argument("--exclude-class", default="", help="comma list of normalized classes to drop")
    ap.add_argument("--user", default="@me",
                    help="Loxtep user id that authored this seed. Default '@me' = resolve at load "
                         "time from loxtep_session.get_current_user (the MCP source of truth).")
    ap.add_argument("--lifecycle", default="draft",
                    help="CDLC lifecycle state for emitted records (default: draft — personal seeds "
                         "are promoted to canonical via the CDLC, never written canonical directly).")
    ap.add_argument("--domain-map", default="",
                    help="map top-level dirs to org domains, e.g. 'customers=Customers,loxtep=Product'. "
                         "Unmapped dirs keep their dir name as the domain slug; the loader resolves "
                         "slugs to domain_id via loxtep_catalog.list_domains.")
    ap.add_argument("--sample", type=int, default=0, help="also print N sample records to stdout")
    args = ap.parse_args()

    include = {c.strip() for c in args.include_class.split(",") if c.strip()}
    exclude = {c.strip() for c in args.exclude_class.split(",") if c.strip()}
    domain_map = dict(p.split("=", 1) for p in
                      (x.strip() for x in args.domain_map.split(",")) if "=" in p)
    seeded_by = args.user
    lifecycle = args.lifecycle

    bundle = Path(args.bundle).resolve()
    if not bundle.is_dir():
        sys.exit(f"bundle not found: {bundle}")
    files = sorted(bundle.rglob("*.md"))

    # ---- pass 1: identity index + emit decision ----
    by_path: dict[str, dict] = {}
    by_stem: dict[str, str] = {}
    by_title: dict[str, str] = {}
    docs = []
    normalized_folds = Counter()

    for f in files:
        fm, body = split_frontmatter(f.read_text(encoding="utf-8", errors="replace"))
        ck = canonical_of(f, bundle)
        raw_type = str(fm.get("type", "")).strip() or "note"
        ntype = NORMALIZE.get(raw_type, raw_type)
        if ntype != raw_type:
            normalized_folds[f"{raw_type} -> {ntype}"] += 1
        title = str(fm.get("title", "")).strip() or f.stem
        emitted = (ntype not in SKIP_TYPES
                   and (not include or ntype in include)
                   and ntype not in exclude)
        rec = {"path": f, "canonical": ck, "raw_type": raw_type, "type": ntype,
               "title": title, "fm": fm, "body": body, "emitted": emitted}
        docs.append(rec)
        by_path[ck] = rec
        by_stem.setdefault(f.stem.lower(), ck)
        by_title.setdefault(title.lower(), ck)

    def resolve(ref):
        ref = str(ref).strip()
        if ref.startswith("/"):
            p = ref.split("#", 1)[0]
            return p if p in by_path else None
        key = ref.lower()
        return by_stem.get(key) or by_title.get(key)

    # ---- pass 2: extract ----
    records = []
    stats = {"edge_type": Counter(), "edge_via": Counter(), "class": Counter(), "domain": Counter()}
    off_vocab = Counter()
    phantom = Counter()          # unresolved entities/concepts/relations -> missing docs
    sources_nonref = 0           # sources values that are counts/prose, not refs
    edges_to_excluded = 0
    n_skipped = n_excluded = 0

    for rec in docs:
        if rec["type"] in SKIP_TYPES:
            n_skipped += 1
            continue
        if not rec["emitted"]:
            n_excluded += 1
            continue

        typ, fm, body, ck = rec["type"], rec["fm"], rec["body"], rec["canonical"]
        if rec["raw_type"] not in KNOWN_TYPES:
            off_vocab[rec["raw_type"]] += 1
        domain_slug = ck.strip("/").split("/")[0] if "/" in ck.strip("/") else "root"
        domain = domain_map.get(domain_slug, domain_slug)
        stats["class"][typ] += 1
        stats["domain"][domain] += 1

        edges, seen = [], set()

        def add_edge(to_ck, etype, via):
            nonlocal edges_to_excluded
            if not to_ck or to_ck == ck:
                return
            if not by_path[to_ck]["emitted"]:
                edges_to_excluded += 1
                return
            if (to_ck, etype) in seen:
                return
            seen.add((to_ck, etype))
            edges.append({"to": to_ck, "type": etype, "via": via})
            stats["edge_type"][etype] += 1
            stats["edge_via"][via.split(":", 1)[0]] += 1

        # tier 1 + 1.5: frontmatter ref fields
        for field, default_type in FM_REF_FIELDS.items():
            for item in as_list(fm.get(field)):
                if field == "relations" and isinstance(item, dict):
                    to, etype, via = resolve(item.get("to", "")), item.get("type", "relates-to"), "explicit"
                else:
                    to, etype, via = resolve(item), (default_type or "relates-to"), f"fm:{field}"
                if to is None:
                    if field == "sources":
                        sources_nonref += 1          # count/prose, not a ref — expected
                    elif field in PHANTOM_FIELDS:
                        phantom[f"{field}:{item if not isinstance(item, dict) else item.get('to')}"] += 1
                    continue
                add_edge(to, etype, via)

        # tier 2: body links, typed by (src, tgt, section)
        section = ""
        for line in body.splitlines():
            h = HEADING_RE.match(line)
            if h:
                section = h.group(1).strip()
                continue
            for m in LINK_RE.finditer(line):
                to = resolve(m.group(1))
                if to is None:
                    phantom[f"body:{m.group(1)}"] += 1
                    continue
                etype = infer_body_edge(typ, by_path[to]["type"], section)
                add_edge(to, etype, f"body:{section or '-'}")

        tags = [str(t) for t in as_list(fm.get("tags"))]
        records.append({
            "canonical_key": ck,                         # shared logical identity (resolves cross-user)
            "draft_key": f"user:{seeded_by}:{ck}",       # per-user draft store key (avoids cross-user collision)
            "seeded_by": seeded_by,                      # @me -> resolved from get_current_user at load
            "domain": domain,
            "lifecycle": lifecycle,                      # CDLC state (draft); promoted to canonical via CDLC
            "class": typ,
            "label": rec["title"],
            "definition": (fm.get("description") or "").strip(),
            "aliases": sorted(set(tags + [rec["path"].stem])),
            "provenance": {
                "resource": fm.get("resource"),
                "sources": as_list(fm.get("sources")),
                "okf_status": fm.get("status"),          # the doc's own status, distinct from CDLC lifecycle
            },
            "confidence": fm.get("confidence"),
            "off_vocab_class": rec["raw_type"] not in KNOWN_TYPES,
            "edges": edges,                              # edge `to` is in shared canonical_key space
        })

    out = Path(args.out)
    payload = {
        "meta": {
            "bundle": str(bundle),
            "seeded_by": seeded_by,
            "lifecycle": lifecycle,
            "domain_map": domain_map or None,
            "record_count": len(records),
            "edge_count": sum(stats["edge_type"].values()),
            "note": ("seeded_by '@me' resolves to loxtep_session.get_current_user at load time; "
                     "the loader writes each record under draft_key and promotes to canonical_key via the CDLC."),
        },
        "records": records,
    }
    out.write_text(yaml.safe_dump(payload, sort_keys=False, allow_unicode=True, width=100), encoding="utf-8")

    # ---- report ----
    total_edges = sum(stats["edge_type"].values())
    print(f"\n=== OKF -> Loxtep seed export ===")
    print(f"bundle:              {bundle}")
    print(f"markdown files:      {len(files)}")
    print(f"skipped (index/log): {n_skipped}")
    if include or exclude:
        print(f"excluded by filter:  {n_excluded}  (include={sorted(include) or 'all'} exclude={sorted(exclude) or 'none'})")
    print(f"seed records:        {len(records)}")
    print(f"output:              {out}  ({out.stat().st_size:,} bytes)")
    print(f"seeded_by:           {seeded_by}" + ("   (resolves from get_current_user at load)" if seeded_by == "@me" else ""))
    print(f"lifecycle:           {lifecycle}   (draft -> canonical via CDLC)")
    if domain_map:
        print(f"domain map:          {domain_map}")

    if normalized_folds:
        print(f"\n-- class normalization (off-vocab folds) --")
        for k, v in normalized_folds.most_common():
            print(f"  {v:3}  {k}")

    print(f"\n-- classes (emitted) --")
    for k, v in stats["class"].most_common():
        print(f"  {v:4}  {k}{'  [off-vocab raw]' if k in off_vocab else ''}")

    print(f"\n-- domains --")
    for k, v in stats["domain"].most_common():
        print(f"  {v:4}  {k}")

    print(f"\n-- edges: {total_edges} total --")
    print("  by type:")
    for k, v in stats["edge_type"].most_common():
        print(f"    {v:4}  {k}")
    print("  by source (the 3-tier strategy in practice):")
    via_label = {"explicit": "tier1   explicit relations:",
                 "fm": "tier1.5 frontmatter ref-lists",
                 "body": "tier2   inferred body links"}
    for k, v in stats["edge_via"].most_common():
        print(f"    {v:4}  {via_label.get(k, k)}")
    if edges_to_excluded:
        print(f"  dropped (target excluded by class filter): {edges_to_excluded}")

    print(f"\n-- resolver diagnostics --")
    print(f"  sources values that were counts/prose (expected, skipped): {sources_nonref}")
    print(f"  phantom refs (missing docs — wiki gaps to author): {sum(phantom.values())}")
    for k, v in phantom.most_common(15):
        print(f"      {v:3}  {k}")
    if len(phantom) > 15:
        print(f"      ... +{len(phantom) - 15} more")

    if args.sample:
        print(f"\n-- meta + {args.sample} sample record(s) --")
        print(yaml.safe_dump({"meta": payload["meta"], "records": records[:args.sample]},
                             sort_keys=False, allow_unicode=True, width=100))


if __name__ == "__main__":
    main()
