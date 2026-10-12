"""Writes public/atlas/terms-<system>.json from the reviewed tables in this folder.

{ "parts": { <English base name>: {pt, la, ta2, d, src} }, "groups": { <English group>: <pt> } }
"""
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
OUT = os.path.join(HERE, "..", "..", "..", "public", "atlas")

import organs  # noqa: E402

import skin  # noqa: E402

TABLES = {"organs": organs, "skin": skin}
for system, mod in TABLES.items():
    parts = {}
    for en, pt, la, ta2, desc, src, _note in mod.ROWS:
        parts[en] = {"pt": pt, "la": la, "ta2": ta2, "d": desc, "src": src}
    out = {"parts": parts, "groups": getattr(mod, "GROUPS", {})}
    with open(os.path.join(OUT, f"terms-{system}.json"), "w") as f:
        json.dump(out, f, ensure_ascii=False, separators=(",", ":"))
    print(system, len(parts), "terms")
