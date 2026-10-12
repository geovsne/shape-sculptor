"""Export every anatomical structure of the Z-Anatomy startup file for the web atlas.

Meshes and curves (vessels, nerves, ducts are bevelled curves) of the systems we show,
evaluated with their modifiers, in world space. Output: raw npz + json list of parts.
Run with Blender's bpy:  python -I za_atlas_export.py -- Startup.blend out_dir
"""
import json
import re
import sys

import bpy
import numpy as np

bpy.ops.wm.open_mainfile(filepath=sys.argv[-2])
out_dir = sys.argv[-1]
dg = bpy.context.evaluated_depsgraph_get()

SYSTEMS = {
    "1: Skeletal system": "bones",
    "3: Joints": "joints",
    "4: Muscular system": "muscles",
    "5: Cardiovascular system": "vessels",
    "7: Nervous system & Sense organs": "nerves",
    "8: Visceral systems": "organs",
    "9: Regions of human body": "skin",
}
# everything anatomical is included (university material); only helper objects are skipped
EXCLUDE = re.compile(r"$^")


def base(n):
    return re.sub(r"\.[lr]$", "", n)


def side(n):
    m = re.search(r"\.([lr])$", n)
    return m.group(1) if m else "c"


def grab(o):
    ev = o.evaluated_get(dg)
    try:
        me = ev.to_mesh()
    except RuntimeError:
        return None
    if me is None or len(me.vertices) < 4:
        ev.to_mesh_clear()
        return None
    me.calc_loop_triangles()
    mw = np.array(ev.matrix_world)
    v = np.empty(len(me.vertices) * 3, np.float32)
    me.vertices.foreach_get("co", v)
    v = v.reshape(-1, 3)
    v = (np.c_[v, np.ones(len(v))] @ mw.T)[:, :3].astype(np.float32)
    t = np.empty(len(me.loop_triangles) * 3, np.int32)
    me.loop_triangles.foreach_get("vertices", t)
    t = t.reshape(-1, 3)
    if np.linalg.det(mw[:3, :3]) < 0:
        t = t[:, ::-1].copy()
    ev.to_mesh_clear()
    if len(t) == 0:
        return None
    return v, t


def tube_from_curve(o, radius, sides=6):
    """curves drawn without bevel: a thin tube around every evaluated segment"""
    ev = o.evaluated_get(dg)
    try:
        me = ev.to_mesh()
    except RuntimeError:
        return None
    if me is None or len(me.edges) == 0:
        ev.to_mesh_clear()
        return None
    mw = np.array(ev.matrix_world)
    v = np.empty(len(me.vertices) * 3, np.float32)
    me.vertices.foreach_get("co", v)
    v = (np.c_[v.reshape(-1, 3), np.ones(len(me.vertices))] @ mw.T)[:, :3]
    e = np.empty(len(me.edges) * 2, np.int32)
    me.edges.foreach_get("vertices", e)
    e = e.reshape(-1, 2)
    ev.to_mesh_clear()
    V, T = [], []
    ang = np.linspace(0, 2 * np.pi, sides, endpoint=False)
    for a, b in e:
        p0, p1 = v[a], v[b]
        d = p1 - p0
        L = np.linalg.norm(d)
        if L < 1e-6:
            continue
        d = d / L
        up = np.array([0, 0, 1.0]) if abs(d[2]) < 0.9 else np.array([1.0, 0, 0])
        x = np.cross(d, up); x /= np.linalg.norm(x)
        y = np.cross(d, x)
        ring = np.outer(np.cos(ang), x) + np.outer(np.sin(ang), y)
        o0 = len(V) * 0 + sum(len(q) for q in V)
        V.append(np.r_[p0 + ring * radius, p1 + ring * radius])
        for k in range(sides):
            k2 = (k + 1) % sides
            T.append([o0 + k, o0 + sides + k, o0 + k2])
            T.append([o0 + k2, o0 + sides + k, o0 + sides + k2])
    if not V:
        return None
    return np.concatenate(V).astype(np.float32), np.array(T, np.int32)


meta, arrays = [], {}
seen = set()
for top in bpy.context.scene.collection.children:
    sysname = SYSTEMS.get(top.name)
    if not sysname:
        continue
    for o in top.all_objects:
        if o.type not in ("MESH", "CURVE") or o.name in seen:
            continue
        n = o.name
        if n.endswith((".j", ".g", ".t")) or EXCLUDE.search(n):
            continue
        seen.add(n)
        r = grab(o)
        if r is None:
            continue
        v, t = r
        i = len(meta)
        arrays[f"v{i}"] = v
        arrays[f"t{i}"] = t
        # nearest named group above the object (e.g. "Heart", "Brachial plexus")
        p = o.parent
        group = None
        while p is not None:
            if p.name.endswith(".g"):
                group = p.name[:-2]
                break
            p = p.parent
        meta.append(dict(system=sysname, name=n, base=base(n), side=side(n), group=group,
                         curve=o.type == "CURVE", nv=len(v), nt=len(t)))
# nerves and vessels of the limbs live outside the system collections (e.g. median,
# ulnar, femoral, tibial nerves; femoral and brachial arteries): pick them up by name
NERVE = re.compile(r"\bnerves?\b|plexus|ganglion|\bcord of brachial", re.I)
VESSEL = re.compile(r"arter|\bveins?\b|aorta|\bvena\b|venous arch|saphenous|azygos|carotid|jugular", re.I)
SKIPN = re.compile(r"groove|foramen|notch|canal|sulcus|impression|hiatus|nucleus|fissure|\?", re.I)
for o in bpy.data.objects:
    n = o.name
    if o.type not in ("MESH", "CURVE") or n in seen or n.endswith((".j", ".g", ".t", ".i")) or SKIPN.search(n):
        continue
    sysname = "nerves" if NERVE.search(n) else "vessels" if VESSEL.search(n) else None
    if not sysname:
        continue
    seen.add(n)
    r = grab(o)
    if r is None and o.type == "CURVE":
        r = tube_from_curve(o, 0.0013 if sysname == "nerves" else 0.0016)
    if r is None:
        continue
    v, t = r
    i = len(meta)
    arrays[f"v{i}"] = v
    arrays[f"t{i}"] = t
    p = o.parent
    group = None
    while p is not None:
        if p.name.endswith(".g"):
            group = p.name[:-2]
            break
        p = p.parent
    meta.append(dict(system=sysname, name=n, base=base(n), side=side(n), group=group,
                     curve=o.type == "CURVE", nv=len(v), nt=len(t)))

np.savez_compressed(out_dir + "/za_atlas.npz", **arrays)
json.dump(meta, open(out_dir + "/za_atlas.json", "w"), ensure_ascii=False)
import collections

print(collections.Counter(m["system"] for m in meta))
print({s: sum(m["nv"] for m in meta if m["system"] == s) for s in SYSTEMS.values()})
