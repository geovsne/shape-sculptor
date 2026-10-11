import bpy, sys, re, json, numpy as np
sys.path.insert(0, sys.argv[-3])
from mapping import MUSCLES, SKIP_SKIN, BONE_SKIP
bpy.ops.wm.open_mainfile(filepath=sys.argv[-2])
out_dir = sys.argv[-1]
dg = bpy.context.evaluated_depsgraph_get()

def base(n): return re.sub(r"\.[lr]$", "", n)
def side(n):
    m = re.search(r"\.([lr])$", n); return m.group(1) if m else "c"

def grab(o, disable=("SOLIDIFY",)):
    saved = []
    for m in o.modifiers:
        if m.type in disable or m.type in ("BOOLEAN", "WIREFRAME"):
            saved.append((m, m.show_viewport)); m.show_viewport = False
    dg.update()
    ev = o.evaluated_get(dg)
    me = ev.to_mesh()
    me.calc_loop_triangles()
    mw = np.array(ev.matrix_world)
    v = np.empty(len(me.vertices) * 3, np.float32); me.vertices.foreach_get("co", v); v = v.reshape(-1, 3)
    v = (np.c_[v, np.ones(len(v))] @ mw.T)[:, :3].astype(np.float32)
    t = np.empty(len(me.loop_triangles) * 3, np.int32); me.loop_triangles.foreach_get("vertices", t); t = t.reshape(-1, 3)
    if np.linalg.det(mw[:3, :3]) < 0:
        t = t[:, ::-1].copy()
    ev.to_mesh_clear()
    for m, s in saved: m.show_viewport = s
    return v, t

meta = []
arrays = {}
def add(kind, o, extra):
    v, t = grab(o)
    if len(t) == 0: return
    i = len(meta)
    arrays[f"v{i}"] = v; arrays[f"t{i}"] = t
    meta.append(dict(kind=kind, name=o.name, base=base(o.name), side=side(o.name), nv=len(v), nt=len(t), **extra))

objs = bpy.data.objects
for o in objs:
    if o.type != "MESH": continue
    top = [c.name for c in o.users_collection]
    b = base(o.name)
    if b in MUSCLES:
        g, label = MUSCLES[b]
        add("muscle", o, dict(group=g, label=label))
for o in objs:
    if o.type != "MESH" or len(o.data.vertices) < 3: continue
    colls = [c.name for c in o.users_collection]
    def in_top(prefix):
        for c in bpy.data.collections:
            if c.name.startswith(prefix) and o.name in c.all_objects: return True
        return False
    if in_top("9:") and not any(s in o.name for s in SKIP_SKIN):
        add("skin", o, dict(region=base(o.name)))
    elif in_top("1:") and len(o.data.vertices) > 50 and not any(s.lower() in o.name.lower() for s in BONE_SKIP):
        add("bone", o, {})
EYES = {"Sclera": "sclera", "Iris": "iris", "Cornea": "cornea"}
for o in objs:
    if o.type != "MESH":
        continue
    b = base(o.name)
    if b in EYES:
        add("eye", o, dict(part=EYES[b]))
    elif b in ("Hairs of head", "Hairs of eyebrow", "Eyelashes"):
        add("hair", o, dict(part=b))
np.savez_compressed(out_dir + "/za_raw.npz", **arrays)
json.dump(meta, open(out_dir + "/za_raw.json", "w"), ensure_ascii=False)
import collections
print(collections.Counter(m["kind"] for m in meta), {k: sum(m["nv"] for m in meta if m["kind"] == k) for k in ("muscle", "skin", "bone")})
missing = set(MUSCLES) - {m["base"] for m in meta if m["kind"] == "muscle"}
print("missing", missing)
