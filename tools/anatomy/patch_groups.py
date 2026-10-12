"""Relabel muscles of an existing body-<sex>.json/.dat with the groups and heads of mapping.py.

Use it when mapping.py gains groups but the mesh must stay exactly as built (a full rebuild with
build_model.py would also regenerate skin, clothes and hair). Only the header (groups, heads,
part table) and the muscle.group / muscle.head / muscle.head2 / muscle.hw sections change.

    python tools/anatomy/patch_groups.py public/models/body-m
"""
import gzip
import json
import os
import sys

import numpy as np

sys.path.insert(0, os.path.dirname(__file__))
from mapping import HEAD_OF, HEADS, MUSCLES  # noqa: E402

GROUPS = ["chest", "frontDelts", "sideDelts", "rearDelts", "traps", "lats", "lowerBack", "abs",
          "obliques", "biceps", "triceps", "forearms", "glutes", "quads", "hamstrings", "calves",
          "adductors", "hipFlexors", "neck", "tibialis"]
STATIC = 255

base = sys.argv[1]
header = json.load(open(base + ".json"))
blob = bytearray(gzip.decompress(open(base + ".dat", "rb").read()))
sec = {s["name"]: s for s in header["sections"]}


def view(name):
    s = sec[name]
    return np.frombuffer(blob, dtype=s["dtype"], count=int(np.prod(s["shape"])), offset=s["offset"])


# existing indices must keep their meaning (only appends are allowed)
assert header["groups"] == GROUPS[: len(header["groups"])], "groups were reordered"
assert header["heads"] == HEADS[: len(header["heads"])], "heads were reordered"

g, h1, h2, hw = view("muscle.group"), view("muscle.head"), view("muscle.head2"), view("muscle.hw")
changed = 0
for p in header["parts"]:
    if p["tendon"] or p["name"] not in MUSCLES:
        continue
    grp = MUSCLES[p["name"]][0]
    head = HEAD_OF.get(p["name"])
    if grp == p["group"] and head == p["head"]:
        continue
    assert p["group"] is None, f"{p['name']}: only static muscles can be relabelled"
    sl = slice(p["v0"], p["v0"] + p["nv"])
    g[sl] = GROUPS.index(grp) if grp else STATIC
    h1[sl] = HEADS.index(head) if head else STATIC
    h2[sl] = h1[sl]
    hw[sl] = 0
    p["group"], p["head"] = grp, head
    changed += 1

header["groups"], header["heads"] = GROUPS, HEADS
open(base + ".json", "w").write(json.dumps(header, ensure_ascii=False))
open(base + ".dat", "wb").write(gzip.compress(bytes(blob), 9))
print(f"{changed} parts relabelled")
