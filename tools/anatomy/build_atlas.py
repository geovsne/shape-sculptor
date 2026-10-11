"""Web atlas files from the raw Z-Anatomy export: one gzip binary per system.

atlas-<system>.json : {lo, scale, parts:[{name, base, side, group, cat, v0, nv, t0, nt}]}
atlas-<system>.dat  : gzip of pos uint16[n,3] | nrm int8[n,3] | idx uint32[m,3] | part uint16[n]
"""
import gzip
import json
import re
import sys

import fast_simplification
import numpy as np
import trimesh

SRC, OUT = sys.argv[1], sys.argv[2]
meta = json.load(open(f"{SRC}/za_atlas.json"))
raw = np.load(f"{SRC}/za_atlas.npz")

# vertex budget per system (whole body), so phones can load each layer
BUDGET = dict(bones=60000, joints=28000, muscles=120000, vessels=80000, nerves=80000, organs=50000, skin=40000)


def to_three(v):
    return np.c_[v[:, 0], v[:, 2], -v[:, 1]]


def category(m):
    n = m["name"].lower()
    s = m["system"]
    if s == "vessels":
        if re.search(r"atrium|ventric|leaflet|papillary|heart|cusp|chorda|septum|auricle", n) or m["group"] == "Heart":
            return "heart"
        if re.search(r"vein|venous|sinus|vena|azygos|plexus", n):
            return "vein"
        return "artery"
    if s == "nerves":
        if m["curve"]:
            return "nerve"
        if re.search(r"eye|lens|retina|cornea|iris|sclera|ear|cochlea|tympan|ossicle|malleus|incus|stapes|nasal|tongue", n):
            return "sense"
        return "brain"
    if s == "joints":
        return "disc" if "disc" in n or "meniscus" in n else "ligament"
    return s


all_v = []
groups = {}
for i, m in enumerate(meta):
    groups.setdefault(m["system"], []).append(i)

# decimate and convert
parts_out = {}
for sysname, ids in groups.items():
    total = sum(meta[i]["nv"] for i in ids)
    ratio = min(1.0, BUDGET.get(sysname, 50000) / max(total, 1))
    out = []
    for i in ids:
        v = to_three(raw[f"v{i}"].astype(np.float64))
        t = raw[f"t{i}"].astype(np.int64)
        if ratio < 0.98 and len(t) > 80:
            target = max(1 - ratio, 0.0)
            target = min(target, 1 - 60 / len(t))  # keep at least ~60 triangles
            if target > 0.02:
                try:
                    v2, t2 = fast_simplification.simplify(v.astype(np.float32), t.astype(np.int32), target_reduction=target)
                    if len(t2) >= 8:
                        v, t = v2.astype(np.float64), t2.astype(np.int64)
                except Exception:
                    pass
        used = np.unique(t)
        remap = -np.ones(len(v), np.int64)
        remap[used] = np.arange(len(used))
        v, t = v[used], remap[t]
        mesh = trimesh.Trimesh(v, t, process=False)
        n = mesh.vertex_normals
        out.append((i, v, t, n))
        all_v.append(v)
    parts_out[sysname] = out
    print(sysname, "verts", sum(len(o[1]) for o in out), "parts", len(out))

V = np.concatenate(all_v)
ground = V[:, 1].min()
lo = V.min(0)
lo[1] = ground
scale = V.max(0) - lo


def qpos(v):
    return np.round((v - lo) / scale * 65535).clip(0, 65535).astype(np.uint16)


for sysname, out in parts_out.items():
    P, N, I, PI, parts = [], [], [], [], []
    v0 = t0 = 0
    for k, (i, v, t, n) in enumerate(out):
        m = meta[i]
        P.append(qpos(v))
        N.append(np.round(n / np.maximum(np.linalg.norm(n, axis=1, keepdims=True), 1e-9) * 127).astype(np.int8))
        I.append((t + v0).astype(np.uint32))
        PI.append(np.full(len(v), k, np.uint16))
        parts.append(dict(name=m["name"], base=m["base"], side=m["side"], group=m["group"], cat=category(m),
                          v0=int(v0), nv=len(v), t0=int(t0), nt=len(t)))
        v0 += len(v)
        t0 += len(t)
    blob = b"".join(np.concatenate(a).tobytes() for a in (P, N, I, PI))
    hdr = dict(system=sysname, lo=lo.tolist(), scale=scale.tolist(), nv=int(v0), nt=int(t0), parts=parts)
    json.dump(hdr, open(f"{OUT}/atlas-{sysname}.json", "w"), ensure_ascii=False)
    gz = gzip.compress(blob, 9)
    open(f"{OUT}/atlas-{sysname}.dat", "wb").write(gz)
    print(sysname, "file MB", round(len(gz) / 1e6, 2))
