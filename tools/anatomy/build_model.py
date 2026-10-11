"""Build the web body model (muscles, skin, bones) from the Z-Anatomy export.

Output (per sex): <out>/body-<sex>.dat  (gzip of a little-endian binary blob)
                  <out>/body-<sex>.json (header: sections, offsets, part table)

Coordinates are converted to three.js convention: Y up, +Z forward, meters,
feet at y=0, centred on x=0.
"""
import gzip
import json
import sys

import fast_simplification
import numpy as np
import trimesh
from scipy import sparse
from scipy.spatial import cKDTree


def smoother(mesh):
    e = mesh.edges_unique
    n = len(mesh.vertices)
    A = sparse.coo_matrix((np.ones(len(e) * 2), (np.r_[e[:, 0], e[:, 1]], np.r_[e[:, 1], e[:, 0]])), shape=(n, n)).tocsr()
    deg = np.asarray(A.sum(1)).ravel()
    A = sparse.diags(1 / np.maximum(deg, 1)) @ A
    has = deg > 0

    def smooth(x, it):
        for _ in range(it):
            y = A @ x
            x = np.where(has.reshape((-1,) + (1,) * (x.ndim - 1)), 0.5 * x + 0.5 * y, x)
        return x

    return smooth


def taubin(mesh, iterations, lamb=0.5, nu=-0.53):
    e = mesh.edges_unique
    n = len(mesh.vertices)
    A = sparse.coo_matrix((np.ones(len(e) * 2), (np.r_[e[:, 0], e[:, 1]], np.r_[e[:, 1], e[:, 0]])), shape=(n, n)).tocsr()
    deg = np.asarray(A.sum(1)).ravel()
    A = sparse.diags(1 / np.maximum(deg, 1)) @ A
    has = (deg > 0)[:, None]
    x = np.asarray(mesh.vertices, dtype=np.float64).copy()
    for _ in range(iterations):
        for f in (lamb, nu):
            x = np.where(has, x + f * (A @ x - x), x)
    return x

SRC = sys.argv[1]  # dir with za_raw.npz/json
OUT = sys.argv[2]
SEX = sys.argv[3] if len(sys.argv) > 3 else "m"
WARP = sys.argv[4] if len(sys.argv) > 4 else None  # npz with female warp

GROUPS = ["chest", "frontDelts", "sideDelts", "rearDelts", "traps", "lats", "lowerBack", "abs",
          "obliques", "biceps", "triceps", "forearms", "glutes", "quads", "hamstrings", "calves"]
STATIC, TENDON = 255, 254

FAT_REGIONS = ["abdomen", "lowback", "chest", "glutes", "thighs", "arms", "back", "face", "other"]
REGION_OF = {
    "abdomen": ["Umbilical region", "Umbilicus", "Epigastric region", "Hypochondriac region", "Hypogastric region",
                "Lateral region of abdomen", "Inguinal region"],
    "lowback": ["Lumbar region"],
    "chest": ["Mammary region", "Inframammary region", "Pectoral region", "Presternal region", "Infraclavicular fossa",
              "Deltopectoral triangle", "Lateral region of thorax"],
    "glutes": ["Gluteal region", "Gluteal fold", "Hip region", "Sacral region"],
    "thighs": ["Anterior region of thigh", "Posterior region of thigh", "Femoral triangle", "Urogenital region"],
    "arms": ["Anterior region of arm", "Posterior region of arm", "Lateral bicipital groove", "Medial bicipital groove",
             "Deltoid region"],
    "back": ["Scapular region", "Infrascapular region", "Interscapular region", "Vertebral region",
             "Triangle of auscultation", "Posterior region of neck"],
    "face": ["Submental triangle", "Submandibular triangle", "Buccal region", "Parotideomasseteric region"],
}
REGION_INDEX = {n: FAT_REGIONS.index(r) for r, ns in REGION_OF.items() for n in ns}

z = np.load(f"{SRC}/za_raw.npz")
meta = json.load(open(f"{SRC}/za_raw.json"))


def simplify(v, t, keep):
    v2, t2 = fast_simplification.simplify(v.astype(np.float32), t.astype(np.int32), target_reduction=1 - keep / len(t))
    used = np.unique(t2)
    remap = np.full(len(v2), -1); remap[used] = np.arange(len(used))
    return v2[used].astype(np.float64), remap[t2]


def to_three(v):
    return np.c_[v[:, 0], v[:, 2], -v[:, 1]].astype(np.float64)


warp = None
if WARP:
    w = np.load(WARP)
    warp = w


def apply_warp(v, kind):
    if warp is None:
        return v
    from warp_female import warp_points  # noqa: E402

    return warp_points(v, kind, warp)


# ---------------------------------------------------------------- muscles
parts = []  # part table
mus_v, mus_n, mus_t, mus_part, mus_group, mus_amp, mus_fiber, mus_end = [], [], [], [], [], [], [], []
vo = 0
TARGET_RATIO = 0.12
for i, m in enumerate(meta):
    if m["kind"] != "muscle":
        continue
    v = to_three(z[f"v{i}"])
    t = z[f"t{i}"]
    nt = len(t)
    keep = max(260, int(nt * TARGET_RATIO))
    if keep < nt:
        v, t = simplify(v, t, keep)
    mesh = trimesh.Trimesh(v, t, process=True)
    mesh.remove_unreferenced_vertices()
    if len(mesh.faces) < 8:
        continue
    trimesh.repair.fix_normals(mesh, multibody=True)
    v, t = mesh.vertices, mesh.faces
    n = mesh.vertex_normals
    # PCA for fiber direction and belly profile
    c = v.mean(0)
    u, s, vt = np.linalg.svd(v - c, full_matrices=False)
    ax = vt[0]
    proj = (v - c) @ ax
    sn = (proj - proj.min()) / max(1e-6, np.ptp(proj))
    belly = np.clip(np.sin(np.pi * sn), 0, 1) ** 0.6
    flat = (s[1] / s[0]) > 0.55
    if flat:
        p2 = (v - c) @ vt[1]
        tn = (p2 - p2.min()) / max(1e-6, np.ptp(p2))
        belly = (np.clip(np.sin(np.pi * sn), 0, 1) * np.clip(np.sin(np.pi * tn), 0, 1)) ** 0.45
    # local thickness by casting inward
    origins = v - n * 1e-4
    loc, ray_idx, _ = mesh.ray.intersects_location(origins, -n, multiple_hits=False)
    thick = np.full(len(v), np.nan)
    thick[ray_idx] = np.linalg.norm(loc - origins[ray_idx], axis=1)
    med = np.nanmedian(thick) if np.isfinite(thick).any() else 0.01
    thick = np.where(np.isfinite(thick), thick, med)
    thick = np.clip(thick, 0.002, 0.09)
    # smooth thickness over the mesh
    thick = smoother(mesh)(thick, 6)
    amp = 0.5 * thick * belly
    is_tendon = m["base"] == "Calcaneal tendon"
    g = m["group"]
    gi = TENDON if is_tendon else (GROUPS.index(g) if g else STATIC)
    if is_tendon:
        amp[:] = 0
    pid = len(parts)
    parts.append(dict(name=m["base"], label=m["label"], side=m["side"], group=g, tendon=is_tendon,
                      v0=vo, nv=len(v)))
    fiber = np.tile(ax, (len(v), 1))
    mus_v.append(v); mus_n.append(n); mus_t.append(t + vo); mus_part.append(np.full(len(v), pid))
    mus_group.append(np.full(len(v), gi)); mus_amp.append(amp); mus_fiber.append(fiber)
    mus_end.append(1 - belly)
    vo += len(v)

MV = np.concatenate(mus_v); MN = np.concatenate(mus_n); MT = np.concatenate(mus_t)
MP = np.concatenate(mus_part); MG = np.concatenate(mus_group); MA = np.concatenate(mus_amp)
_all = trimesh.Trimesh(MV, MT, process=False)
_o = MV + MN * 6e-4
_loc, _ri, _tri = _all.ray.intersects_location(_o, MN, multiple_hits=False)
_hitpart = MP[MT[_tri, 0]]
_dist = np.linalg.norm(_loc - _o[_ri], axis=1)
covered = np.zeros(len(MV))
_m = (_hitpart != MP[_ri]) & (_dist < 0.025)
covered[_ri[_m]] = 1
for pid in range(len(parts)):
    sel = MP == pid
    frac = covered[sel].mean()
    if frac > 0.6:  # mostly hidden under other muscles
        MA[sel] *= 0.35
# attachments: muscle surface touching bone does not bulge
_bkd = None
print("deep parts", sum(1 for pid in range(len(parts)) if covered[MP == pid].mean() > 0.6))
MF = np.concatenate(mus_fiber); ME = np.concatenate(mus_end)
print("muscles", len(parts), "verts", len(MV), "tris", len(MT))

# ---------------------------------------------------------------- bones
bv, bt, bo = [], [], 0
for i, m in enumerate(meta):
    if m["kind"] != "bone":
        continue
    v = to_three(z[f"v{i}"]); t = z[f"t{i}"]
    keep = max(120, int(len(t) * 0.18))
    if keep < len(t):
        v, t = simplify(v, t, keep)
    bv.append(v); bt.append(t + bo); bo += len(v)
BV = np.concatenate(bv); BT = np.concatenate(bt)
_db, _ = cKDTree(BV).query(MV)
_t = np.clip((_db - 0.004) / 0.012, 0, 1)
MA *= _t * _t * (3 - 2 * _t)
bmesh = trimesh.Trimesh(BV, BT, process=False)
BN = bmesh.vertex_normals
print("bones verts", len(BV), "tris", len(BT))

# ---------------------------------------------------------------- skin
sv, st, sreg, sname, so = [], [], [], [], 0
NAMES = []
for i, m in enumerate(meta):
    if m["kind"] != "skin":
        continue
    v = to_three(z[f"v{i}"]); t = z[f"t{i}"]
    sv.append(v); st.append(t + so); sreg.append(np.full(len(v), REGION_INDEX.get(m["region"], len(FAT_REGIONS) - 1)))
    if m["region"] not in NAMES:
        NAMES.append(m["region"])
    sname.append(np.full(len(v), NAMES.index(m["region"])))
    so += len(v)
SV = np.concatenate(sv); ST = np.concatenate(st); SR = np.concatenate(sreg); SNM = np.concatenate(sname)
skin = trimesh.Trimesh(SV, ST, process=False)
# weld manually so we can keep region ids
key = np.round(SV, 4)
_, first, inverse = np.unique(key, axis=0, return_index=True, return_inverse=True)
inverse = inverse.reshape(-1)
SV = SV[first]; SR = SR[first]; SNM = SNM[first]; ST = inverse[ST]
ST = ST[(ST[:, 0] != ST[:, 1]) & (ST[:, 1] != ST[:, 2]) & (ST[:, 0] != ST[:, 2])]
skin = trimesh.Trimesh(SV, ST, process=False)
_nv0 = len(skin.vertices)
trimesh.repair.fill_holes(skin)
print("filled holes: faces", len(ST), "->", len(skin.faces))
SV, ST = np.asarray(skin.vertices), np.asarray(skin.faces)
SR = np.r_[SR, np.full(len(SV) - _nv0, len(FAT_REGIONS) - 1)]
SNM = np.r_[SNM, np.full(len(SV) - _nv0, -1)]
skin = trimesh.Trimesh(SV, ST, process=False)
# consistent winding, then make every connected piece face away from the body interior
trimesh.repair.fix_winding(skin)
_under_kd = cKDTree(np.concatenate([MV, BV]))
_c = skin.triangles_center
_, _ui = _under_kd.query(_c)
_out = _c - np.concatenate([MV, BV])[_ui]
_dot = np.sign((skin.face_normals * _out).sum(1))
_lab = trimesh.graph.connected_component_labels(skin.face_adjacency, node_count=len(skin.faces))
_F = skin.faces.copy()
for lab in np.unique(_lab):
    sel = _lab == lab
    if _dot[sel].sum() < 0:
        _F[sel] = _F[sel][:, ::-1]
skin = trimesh.Trimesh(skin.vertices, _F, process=False)
# one loop subdivision for smoother silhouette
sub_v, sub_t = trimesh.remesh.subdivide(skin.vertices, skin.faces)
_sub = trimesh.Trimesh(sub_v, sub_t, process=False)
sub_v = taubin(_sub, 6)
# carry region ids to new vertices by nearest old vertex
_near = cKDTree(skin.vertices).query(sub_v)[1]
SR = SR[_near]; SNM = SNM[_near]
SV = np.asarray(sub_v, dtype=np.float64)
skin = trimesh.Trimesh(SV, sub_t, process=False)


def named(*names):
    ids = [NAMES.index(n) for n in names if n in NAMES]
    return np.isin(SNM, ids)


# genital region becomes a smooth membrane (covered by underwear anyway)
_gen = named("Urogenital region")
_A = smoother(skin)
_x = SV.copy()
_e = skin.edges_unique
_Ad = sparse.coo_matrix((np.ones(len(_e) * 2), (np.r_[_e[:, 0], _e[:, 1]], np.r_[_e[:, 1], _e[:, 0]])), shape=(len(SV), len(SV))).tocsr()
_deg = np.maximum(np.asarray(_Ad.sum(1)).ravel(), 1)
# solve the discrete Laplace equation inside the region with the rest fixed (minimal "membrane")
from scipy.sparse.linalg import spsolve
_L = sparse.diags(_deg) - _Ad
_I = np.where(_gen)[0]; _B = np.where(~_gen)[0]
if len(_I):
    _LII = _L[_I][:, _I].tocsc(); _LIB = _L[_I][:, _B]
    for _c in range(3):
        _x[_I, _c] = spsolve(_LII, -(_LIB @ _x[_B, _c]))
SV = _x
skin = trimesh.Trimesh(SV, sub_t, process=False)

ARM_REGIONS = ["Anterior region of arm", "Posterior region of arm", "Lateral bicipital groove", "Medial bicipital groove",
               "Anterior region of elbow", "Posterior region of elbow", "Cubital fossa", "Posterior region of forearm",
               "Lateral border of forearm", "Medial border of forearm", "Anterior region of forearm",
               "Anterior region of wrist", "Posterior region of wrist", "Radial foveola", "Palm",
               "Palmar surfaces of digits of hand", "Dorsal surfaces of digits of hand", "Dorsum of hand",
               "Nail plate", "Perionyx"]
armMask = named(*ARM_REGIONS)

if WARP:
    from warp_female import arm_axes, warp_body

    wz = np.load(WARP)
    _sm = smoother(skin)
    armW = _sm(armMask.astype(float), 12)
    axes = arm_axes(SV, armMask)
    _kd = cKDTree(SV)
    _, _ni = _kd.query(MV, k=6); armM = armW[_ni].mean(1)
    _, _ni = _kd.query(BV, k=6); armB = armW[_ni].mean(1)
    SV, MV, BV = warp_body(SV, _sm, MV, BV, armW, armM, armB, axes, wz)
    MN = trimesh.Trimesh(MV, MT, process=False).vertex_normals
    BN = trimesh.Trimesh(BV, BT, process=False).vertex_normals
    MA *= 0.92
    skin = trimesh.Trimesh(SV, sub_t, process=False)
ST = skin.faces
SN = skin.vertex_normals
print("skin verts", len(SV), "tris", len(ST))

# underwear: shorts for both, sports top for women (flag per face)
_y = SV[:, 1]
navel = _y[named("Umbilicus")].mean()
crotch = _y[_gen].min() if _gen.any() else navel - 0.2
shorts_v = (_y > crotch - 0.09) & (_y < navel - 0.025) & ~armMask
top_v = np.zeros(len(SV), bool)
if SEX == "f":
    under = _y[named("Inframammary region")].min() - 0.035
    upper = _y[named("Mammary region")].max() + 0.03
    top_v = (_y > under) & (_y < upper) & ~armMask & ~named("Deltoid region")
cloth = np.zeros(len(ST), np.uint8)
cloth[shorts_v[ST].all(1)] = 1
cloth[top_v[ST].all(1)] = 2
print("cloth faces", (cloth == 1).sum(), (cloth == 2).sum())

# soft region weights
sm = smoother(skin)
W = np.zeros((len(SV), len(FAT_REGIONS))); W[np.arange(len(SV)), SR] = 1
W = sm(W, 14)
W = W / W.sum(1, keepdims=True)

# underlying surface = muscles + bones
UV = np.concatenate([MV, BV]); UN = np.concatenate([MN, BN])
under = trimesh.Trimesh(UV, np.concatenate([MT, BT + len(MV)]), process=False)
orig = SV - SN * 1e-4
loc, ri, _ = under.ray.intersects_location(orig, -SN, multiple_hits=False)
depth = np.full(len(SV), np.nan)
depth[ri] = np.linalg.norm(loc - orig[ri], axis=1)
kd = cKDTree(UV)
dn, _ = kd.query(SV)
depth = np.where(np.isfinite(depth), np.minimum(depth, dn * 1.6), dn)
depth = np.clip(depth, 0.0008, 0.08)
depth = sm(depth, 4)

# binding: what lies directly under each skin vertex (ray cast inwards)
K = 3
UT = np.concatenate([MT, BT + len(MV)])
_o = SV - SN * 1e-4
_loc, _ri, _tri = under.ray.intersects_location(_o, -SN, multiple_hits=False)
idx = np.zeros((len(SV), K), np.int64)
bindW = np.zeros((len(SV), K))
hitMuscle = np.zeros(len(SV), bool)
isM = _tri < len(MT)
r_m, t_m, l_m = _ri[isM], _tri[isM], _loc[isM]
tv = MT[t_m]
bary = trimesh.triangles.points_to_barycentric(MV[tv], l_m)
idx[r_m] = tv
bindW[r_m] = np.clip(bary, 0, 1)
hitMuscle[r_m] = True
# fallback for misses: nearest muscle vertices, faded by distance
miss = ~np.isin(np.arange(len(SV)), _ri)
if miss.any():
    dmiss, imiss = cKDTree(MV).query(SV[miss], k=K)
    idx[miss] = imiss
    ww = np.exp(-((dmiss - dmiss[:, :1]) / 0.006) ** 2)
    bindW[miss] = ww / ww.sum(1, keepdims=True)
    hitMuscle[miss] = dmiss[:, 0] < 0.02
bindW = bindW / np.maximum(bindW.sum(1, keepdims=True), 1e-9)
bindStrength = sm(hitMuscle.astype(float), 2)
bindW = bindW * bindStrength[:, None]
fiberS = MF[idx[:, 0]] * (bindStrength[:, None] > 0.05)

# ---------------------------------------------------------------- pack
ground = min(SV[:, 1].min(), MV[:, 1].min(), BV[:, 1].min())
cx = 0.0
lo = np.minimum.reduce([SV.min(0), MV.min(0), BV.min(0)]); hi = np.maximum.reduce([SV.max(0), MV.max(0), BV.max(0)])
for arr in (SV, MV, BV):
    arr[:, 1] -= ground
lo[1] -= ground; hi[1] -= ground
scale = (hi - lo)


def qpos(v):
    return np.round((v - lo) / scale * 65535).astype(np.uint16)


def qn(n):
    n = n / np.maximum(np.linalg.norm(n, axis=1, keepdims=True), 1e-9)
    return np.round(n * 127).astype(np.int8)


sections = []
blob = bytearray()


def put(name, arr):
    global blob
    while len(blob) % 4:
        blob.append(0)
    a = np.ascontiguousarray(arr)
    sections.append(dict(name=name, offset=len(blob), dtype=str(a.dtype), shape=list(a.shape)))
    blob += a.tobytes()


put("muscle.pos", qpos(MV)); put("muscle.nrm", qn(MN)); put("muscle.idx", MT.astype(np.uint32))
put("muscle.part", MP.astype(np.uint16)); put("muscle.group", MG.astype(np.uint8))
put("muscle.amp", np.round(np.clip(MA, 0, 0.06) / 0.06 * 65535).astype(np.uint16))
put("muscle.fiber", qn(MF)); put("muscle.end", np.round(np.clip(ME, 0, 1) * 255).astype(np.uint8))
put("bone.pos", qpos(BV)); put("bone.nrm", qn(BN)); put("bone.idx", BT.astype(np.uint32))
put("skin.pos", qpos(SV)); put("skin.nrm", qn(SN)); put("skin.idx", ST.astype(np.uint32))
put("skin.region", np.round(W * 255).astype(np.uint8))
put("skin.depth", np.round(depth / 0.08 * 65535).astype(np.uint16))
put("skin.bindIdx", idx.astype(np.uint32)); put("skin.bindW", np.round(np.clip(bindW, 0, 1) * 255).astype(np.uint8))
put("skin.fiber", qn(fiberS + 1e-9))
put("skin.cloth", cloth)

header = dict(version=1, sex=SEX, lo=lo.tolist(), scale=scale.tolist(), height=float(hi[1] - lo[1]),
              groups=GROUPS, fatRegions=FAT_REGIONS, parts=parts, sections=sections,
              ampMax=0.06, depthMax=0.08, bindK=K, restBf=12 if SEX == "m" else 24)
open(f"{OUT}/body-{SEX}.json", "w").write(json.dumps(header, ensure_ascii=False))
open(f"{OUT}/body-{SEX}.dat", "wb").write(gzip.compress(bytes(blob), 9))
print("bytes", len(blob), "gz", len(gzip.compress(bytes(blob), 9)), "height", header["height"])
