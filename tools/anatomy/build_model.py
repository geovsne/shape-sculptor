"""Build the web body model (muscles, skin, bones) from the Z-Anatomy export.

Output (per sex): <out>/body-<sex>.dat  (gzip of a little-endian binary blob)
                  <out>/body-<sex>.json (header: sections, offsets, part table)

Coordinates are converted to three.js convention: Y up, +Z forward, meters,
feet at y=0, centred on x=0.
"""
import gzip
import os
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

sys.path.insert(0, __import__("os").path.dirname(__file__))
from mapping import HEADS, HEAD_OF  # noqa: E402

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
mus_h1, mus_h2, mus_hw = [], [], []
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
    if m["base"] == "Rectus abdominis muscle":
        # six-pack: tendinous intersections and the linea alba don't bulge and look pale
        yy = v[:, 1]; t_ = (yy - yy.min()) / max(1e-6, np.ptp(yy))
        groove = np.zeros(len(v))
        for tk in (0.47, 0.66, 0.84):
            groove = np.maximum(groove, np.exp(-((t_ - tk) / 0.035) ** 2))
        groove = np.maximum(groove, np.exp(-(v[:, 0] / 0.0075) ** 2))
        belly = belly * (1 - 0.8 * groove)
        amp = amp * (1 - 0.8 * groove)
        segment_end = groove
    else:
        segment_end = None
    is_tendon = m["base"] == "Calcaneal tendon"
    g = m["group"]
    gi = TENDON if is_tendon else (GROUPS.index(g) if g else STATIC)
    if is_tendon:
        amp[:] = 0
    # head (and an optional second head blended by height, e.g. lower chest / lower abs)
    h1 = HEADS.index(HEAD_OF[m["base"]]) if m["base"] in HEAD_OF else 255
    h2, hw = h1, np.zeros(len(v))
    yy = v[:, 1]
    ty = (yy - yy.min()) / max(1e-6, np.ptp(yy))
    if m["base"] == "Sternocostal head of pectoralis major muscle":
        h2 = HEADS.index("chest_lower"); hw = np.clip((0.45 - ty) / 0.3, 0, 1)
    if m["base"] == "Rectus abdominis muscle":
        h2 = HEADS.index("abs_lower"); hw = np.clip((0.6 - ty) / 0.22, 0, 1)
    if m["base"] == "Latissimus dorsi muscle":
        # the muscle runs from the iliac crest / low thoracic spine up to the armpit
        h2 = HEADS.index("lats_lower"); hw = np.clip((0.62 - ty) / 0.3, 0, 1)
    mus_h1.append(np.full(len(v), h1)); mus_h2.append(np.full(len(v), h2)); mus_hw.append(hw)
    pid = len(parts)
    parts.append(dict(name=m["base"], label=m["label"], side=m["side"], group=g, tendon=is_tendon,
                      head=HEADS[h1] if h1 != 255 else None,
                      v0=vo, nv=len(v)))
    fiber = np.tile(ax, (len(v), 1))
    mus_v.append(v); mus_n.append(n); mus_t.append(t + vo); mus_part.append(np.full(len(v), pid))
    mus_group.append(np.full(len(v), gi)); mus_amp.append(amp); mus_fiber.append(fiber)
    mus_end.append(np.maximum(1 - belly, 0.9 * segment_end) if segment_end is not None else 1 - belly)
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
MH1 = np.concatenate(mus_h1); MH2 = np.concatenate(mus_h2); MHW = np.concatenate(mus_hw)
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
# ---------------------------------------------------------------- eyes and fine hair
ev, et, ek, eo = [], [], [], 0
hv, ht, ho = [], [], 0
_eye = {}
for i, m in enumerate(meta):
    if m["kind"] == "eye" and m["part"] in ("sclera", "iris"):
        _eye[(m["side"], m["part"])] = (to_three(z[f"v{i}"]), z[f"t{i}"])
    elif m["kind"] == "hair" and m["part"] in ("Eyelashes",):
        v = to_three(z[f"v{i}"]); t = z[f"t{i}"]
        hv.append(v); ht.append(t + ho); ho += len(v)
# paint iris and pupil onto the eyeball itself: kind = angle from the gaze axis / iris angle
for side in ("l", "r"):
    sv_, st_ = _eye[(side, "sclera")]
    iv_, _ = _eye[(side, "iris")]
    mesh = trimesh.Trimesh(sv_, st_, process=True)
    v, t = np.asarray(mesh.vertices), np.asarray(mesh.faces)
    c = v.mean(0)
    axis = iv_.mean(0) - c; axis /= np.linalg.norm(axis)
    ang = lambda p: np.arccos(np.clip(((p - c) / np.linalg.norm(p - c, axis=1, keepdims=True)) @ axis, -1, 1))
    theta = np.percentile(ang(iv_), 98) * 1.28  # enlarged iris for a friendlier look
    ev.append(v); et.append(t + eo); ek.append(np.clip(ang(v) / theta, 0, 2)); eo += len(v)
    # the iris disc (pupil hole closed) plugs the opening at the front of the sclera
    im = trimesh.Trimesh(*_eye[(side, "iris")], process=True)
    trimesh.repair.fill_holes(im)
    iv2, it2 = np.asarray(im.vertices), np.asarray(im.faces)
    ev.append(iv2); et.append(it2 + eo); ek.append(np.clip(ang(iv2) / theta, 0, 2)); eo += len(iv2)
EV = np.concatenate(ev); ET = np.concatenate(et); EK = np.concatenate(ek)
HV = np.concatenate(hv); HT = np.concatenate(ht)
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
    _side_pre = np.sign(SV[:, 0])
    SV, MV, BV, (EV, HV) = warp_body(SV, _sm, MV, BV, armW, armM, armB, axes, wz, (EV, HV))
    MN = trimesh.Trimesh(MV, MT, process=False).vertex_normals
    BN = trimesh.Trimesh(BV, BT, process=False).vertex_normals
    MA *= 0.92
    skin = trimesh.Trimesh(SV, sub_t, process=False)
    # the warp brings back some relief in the groin: flatten it again (minimal membrane)
    _x = SV.copy()
    if len(_I):
        for _c in range(3):
            _x[_I, _c] = spsolve(_LII, -(_LIB @ _x[_B, _c]))
    SV = _x
    # wider hips can push the inner thighs through each other: keep each leg on its side
    _legs = ~_gen & (SV[:, 1] < SV[_gen, 1].max() + 0.02) & (np.abs(SV[:, 0]) < 0.08)
    _sx = _side_pre * SV[:, 0]
    _fix = _legs & (_sx < 0.006)
    SV[_fix, 0] = _side_pre[_fix] * (0.006 + 0.3 * np.maximum(_sx[_fix], -0.02) * 0)
    print("thigh crossing fixed", _fix.sum())
    # smooth the groin and inner thighs: no genital relief, no creases, legs just touching
    _cr = SV[_gen, 1].min()
    _gz = np.clip(1 - np.abs(SV[:, 0]) / 0.1, 0, 1) * np.clip(1 - np.abs(SV[:, 1] - (_cr + 0.02)) / 0.12, 0, 1)
    _gz = np.clip(_gz * 2.2, 0, 1)[:, None]
    _A = smoother(trimesh.Trimesh(SV, sub_t, process=False))
    for _ in range(4):
        SV = SV * (1 - _gz) + _A(SV, 10) * _gz
        _sx = _side_pre * SV[:, 0]
        _fx = _legs & (_sx < 0.005)
        SV[_fx, 0] = _side_pre[_fx] * 0.005
    print("groin smoothed", int((_gz[:, 0] > 0.05).sum()))
    skin = trimesh.Trimesh(SV, sub_t, process=False)
ST = skin.faces
SN = skin.vertex_normals
print("skin verts", len(SV), "tris", len(ST))

# underwear: shorts for both, sports top for women (flag per face)
_y = SV[:, 1]
navel = _y[named("Umbilicus")].mean()
crotch = _y[_gen].min() if _gen.any() else navel - 0.2
def band(y, lo, hi, soft=0.004):
    a = np.clip((y - lo) / soft, -1, 1); b = np.clip((hi - y) / soft, -1, 1)
    return np.minimum(a, b)  # >0 inside, <0 outside, smooth across the edge


_noarm = 1 - 2 * np.clip(smoother(skin)(armMask.astype(float), 8), 0, 1)
ear_lo = _y[named("Lobule of auricle")].min()
_hem, _rise = (crotch - 0.075, navel - 0.03) if SEX == "m" else (crotch - 0.03, navel - 0.045)
shortsF = np.minimum(band(_y, _hem, _rise), _noarm)
# the flattened groin hangs between the legs like a web below the perineum: real shorts
# stop at the inseam there, so leave that part out
_gm = _gen & (np.abs(SV[:, 0]) < 0.01)
_perineum = crotch + 0.55 * (np.median(_y[_gm]) - crotch) if _gm.any() else crotch + 0.04
# drop the membrane that hangs between the legs below the leg split (it would show as a
# flap of skin under the shorts); the gap left there is hidden between the thighs
_web_v = _gen & (_y < _perineum + 0.012)
_fc = SV[ST].mean(1)
_keep = ~_web_v[ST].all(1)
print("groin web faces removed", (~_keep).sum())
ST = ST[_keep]
skin = trimesh.Trimesh(SV, ST, process=False)

shorts_v = shortsF > 0
top_v = np.zeros(len(SV), bool)
topF = np.full(len(SV), -1.0)
if SEX == "f":
    under = _y[named("Inframammary region")].min() - 0.035
    upper = _y[named("Mammary region")].max() + 0.03
    _nodelt = 1 - 2 * np.clip(smoother(skin)(named("Deltoid region").astype(float), 8), 0, 1)
    # sports bra: covers the bust (not the belly), scooped neckline, narrow back band, straps
    under = _y[named("Inframammary region")].min() - 0.012
    _br = named("Mammary region") & (SV[:, 0] > 0)
    apexY = SV[_br][np.argmax(SV[_br, 2]), 1]
    _torso = (np.abs(SV[:, 0]) < 0.16) & (_noarm > 0)
    _bins = np.round(_y / 0.01).astype(int)
    _cz = np.zeros(len(SV))
    for _b in np.unique(_bins[_torso]):
        _sel = _torso & (_bins == _b)
        _cz[_bins == _b] = 0.5 * (SV[_sel, 2].max() + SV[_sel, 2].min())
    _front = np.clip((SV[:, 2] - _cz) / 0.03 + 0.5, 0, 1)
    _neck = apexY + 0.05 + 0.045 * np.clip(np.abs(SV[:, 0]) / 0.12, 0, 1)
    _hi = _front * _neck + (1 - _front) * (under + 0.065)
    _bra = np.minimum(np.minimum(np.minimum(_y - under, _hi - _y) / 0.004, _noarm), _nodelt)
    _strap_x = 0.088
    _strap = np.minimum(
        (0.0095 - np.abs(np.abs(SV[:, 0]) - _strap_x)) / 0.002,
        np.minimum((_y - (_hi - 0.01)) / 0.004, (ear_lo - 0.04 - _y) / 0.004),
    )
    _strap = np.minimum(_strap, _noarm)
    topF = np.clip(np.maximum(_bra, _strap), -1, 1)
    bra_under = under
    top_v = topF > 0
cloth = np.zeros(len(ST), np.uint8)
cloth[shorts_v[ST].all(1)] = 1
cloth[top_v[ST].all(1)] = 2
print("cloth faces", (cloth == 1).sum(), (cloth == 2).sum())

# fabric drape: a sports top hides the nipples (smooth the whole bust surface) and shorts
# bridge the groin creases (only fill concavities), like real fabric over skin
_fab_n = skin.vertex_normals
_sm2 = smoother(skin)
# low-pass the surface, then give back the large-scale shrink along the normal so the
# bust keeps its volume while small bumps (nipples, creases) disappear
_fab_s = _sm2(SV, 45)
_shr = _sm2(((SV - _fab_s) * _fab_n).sum(1), 220)
_fab_s = _fab_s + _fab_n * _shr[:, None]
_fab_d = ((_fab_s - SV) * _fab_n).sum(1)
_sm2 = smoother(skin)
_wt = _sm2(np.clip(topF + 0.6, 0, 1), 6)
_ws = _sm2(np.clip(shortsF + 0.6, 0, 1), 6) * (_fab_d > 0)
_w = np.clip(np.maximum(_wt, _ws), 0, 1)[:, None]
SV = SV * (1 - _w) + _fab_s * _w
skin = trimesh.Trimesh(SV, sub_t, process=False)
SN = skin.vertex_normals
_y = SV[:, 1]

# hair cap (flag 3) from the scalp, friendly-looking instead of a bald anatomy head
EAR = ["Helix", "Antihelix", "Antitragus", "Tragus", "Lobule of auricle", "Concha of auricle", "Cavity of concha",
       "Cymba conchae", "Scapha", "Triangular fossa", "Crura of antihelix", "Eminentia conchae",
       "Eminentia fossae triangularis", "Eminentia scaphae", "Fossa antihelica", "Intertragic incisure",
       "Anterior notch of auricle", "Apex of auricle", "Auricular tubercle", "Posterior auricular groove",
       "Auricular region"]
ear = named(*EAR)
brow = _y[named("Eyebrow")].mean()
ear_lo = _y[named("Lobule of auricle")].min()
headv = (_y > ear_lo - 0.03) & ~ear
hc = SV[headv].mean(0)
dv = SV - hc
front = dv[:, 2] / np.maximum(np.hypot(dv[:, 0], dv[:, 2]), 1e-6)
tt = np.clip((front + 0.25) / 0.85, 0, 1); tt = tt * tt * (3 - 2 * tt)
back_line = ear_lo + (0.0 if SEX == "m" else -0.02)
hairline = back_line + (brow + 0.055 - back_line) * tt
capF = np.where(headv, np.clip((_y - hairline) / 0.004, -1, 1), -1.0)
hair_v = capF > 0
cloth[hair_v[ST].all(1) & (cloth == 0)] = 3
_occ = np.where(headv & (_y > brow - 0.01) & (_y < brow + 0.04))[0]
occ_i = _occ[np.argmin(SV[_occ, 2])]
print("hair cap faces", (cloth == 3).sum())

# gentle smile: lift and pull back the mouth corners a little
_corner = named("Angle of mouth", "Labial commissure")
if _corner.any():
    _cp = SV[_corner]
    for sgn in (1, -1):
        cc = _cp[np.sign(_cp[:, 0]) == sgn].mean(0)
        d = np.linalg.norm(SV - cc, axis=1)
        wgt = np.clip(1 - d / 0.016, 0, 1) ** 2
        SV[:, 1] += wgt * 0.0022
        SV[:, 2] -= wgt * 0.0008
    skin = trimesh.Trimesh(SV, ST, process=False)
    SN = skin.vertex_normals

# lips a little rosier
mouth = SV[named("Labial commissure")].mean(0)
lips = named("Oral region", "Tubercle of upper lip", "Labial commissure", "Philtrum") & (np.linalg.norm(SV - mouth, axis=1) < 0.014)
tint = np.zeros(len(SV)); tint[lips] = 1
tint = smoother(skin)(tint, 2)

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

# ---------------------------------------------------------------- MakeHuman assets
from mh_assets import Mapper, fit_proxy, load_base, skin_uv  # noqa: E402
from mh_assets import nearest as _nearest  # noqa: E402

ASSETS = os.environ.get("MH_ASSETS", os.path.join(os.path.dirname(__file__), "..", "assets"))
MH_DIR = os.environ.get("MH_DIR", os.path.join(os.path.dirname(__file__), "..", "anat/mh/makehuman/data"))
SN = trimesh.Trimesh(SV, ST, process=False).vertex_normals
def _subdivide_uv(P, F, UV):
    """midpoint subdivision carrying uv, then a light smoothing of the new surface"""
    e = np.sort(np.r_[F[:, [0, 1]], F[:, [1, 2]], F[:, [2, 0]]], axis=1)
    ue, inv = np.unique(e, axis=0, return_inverse=True)
    mid = len(P) + np.arange(len(ue))
    P2 = np.r_[P, 0.5 * (P[ue[:, 0]] + P[ue[:, 1]])]
    UV2 = np.r_[UV, 0.5 * (UV[ue[:, 0]] + UV[ue[:, 1]])]
    m = mid[inv].reshape(3, -1).T  # midpoints of edges 01, 12, 20
    a, b, c = F[:, 0], F[:, 1], F[:, 2]
    F2 = np.r_[np.c_[a, m[:, 0], m[:, 2]], np.c_[m[:, 0], b, m[:, 1]], np.c_[m[:, 2], m[:, 1], c], m]
    # smooth on the welded surface (uv seams split vertices) so no cracks open
    _, first, inv2 = np.unique(np.round(P2, 6), axis=0, return_index=True, return_inverse=True)
    inv2 = inv2.ravel()
    Pw = taubin(trimesh.Trimesh(P2[first], inv2[F2], process=False), 2)
    return Pw[inv2], F2, UV2


ASSET_LIST = []
SKIN_UV, ST_UV, DUP = np.zeros((len(SV), 2)), ST.copy(), np.zeros(0, np.int64)
GV = SV[:1]
if WARP:  # the base (unwarped) build only feeds the warp step
    _w = np.load(WARP)
    mapper = Mapper(_w["Ffull"], _w["body"], _w["arm"], SV, ST, armMask)
    _VT, _BF, _BFT = load_base(f"{MH_DIR}/3dobjs/base.obj")
    SKIN_UV, ST_UV, DUP = skin_uv(mapper, _VT, _BF, _BFT, SV, ST)
    print("skin uv: seam copies", len(DUP))

    PIECES = {
        "f": [
            ("top", "cloth", "underwear02_cc0/clothes/punkduck_sport_bra/punkduck_sport_bra.mhclo", "#eeedea", "punkduck (CC BY)"),
            ("shorts", "cloth", "pants03_ccby/clothes/mindfront_male_swimming_trunks_01/mindfront_male_swimming_trunks_01.mhclo", "#4c525b", "Mindfront (CC BY)"),
            ("hair", "hair", "hair01_cc0/hair/rehmanpolanski_hair_bun_brown/rehmanpolanski_hair_bun_brown.mhclo", None, "RehmanPolanski (CC0)"),
            ("brows", "brow", "eyebrows01_cc0/eyebrows/mindfront_eyebrows_05/mindfront_eyebrows_05.mhclo", "#2a1a12", "Mindfront (CC0)"),
        ],
        "m": [
            ("shorts", "cloth", "pants03_ccby/clothes/mindfront_male_swimming_trunks_01/mindfront_male_swimming_trunks_01.mhclo", "#4c525b", "Mindfront (CC BY)"),
            ("hair", "hair", "hair01_cc0/hair/culturalibre_hair_02/culturalibre_hair_02.mhclo", None, "culturalibre (CC0)"),
            ("brows", "brow", "eyebrows01_cc0/eyebrows/mindfront_eyebrows_03/mindfront_eyebrows_03.mhclo", "#1e140e", "Mindfront (CC0)"),
        ],
    }
    ASSET_LIST = []
    _kds = cKDTree(SV)
    for name, kind, rel, color, credit in PIECES[SEX]:
        P, F, UV, tex, mat = fit_proxy(os.path.join(ASSETS, rel), _w["Ffull"])
        if kind == "cloth":  # MakeHuman clothes are low-poly: smooth them so they follow the body
            for _ in range(2):
                P, F, UV = _subdivide_uv(P, F, UV)
        P = mapper.carry(P)
        if SEX == "f" and name == "shorts":
            # same trunks as the man, cut shorter: hem 5 cm below the crotch
            _keepf = ~(P[F, 1] < _perineum - 0.045).any(1)
            print("shorts faces cut", (~_keepf).sum())
            F = F[_keepf]
        bind = _kds.query(P)[1]
        ASSET_LIST.append(dict(name=name, kind=kind, P=P, F=F, UV=UV, tex=tex, color=color, credit=credit, bind=bind))
        print("asset", name, len(P), "verts", len(F), "tris", tex and os.path.basename(tex))
    # skin under clothes goes at least 4 mm below the fabric (nipples, groin, creases), so
    # the fabric stays smooth and nothing pokes through
    _cl = [a for a in ASSET_LIST if a["kind"] == "cloth"]
    if _cl:
        _off = np.cumsum([0] + [len(a["P"]) for a in _cl])
        _cm = trimesh.Trimesh(np.concatenate([a["P"] for a in _cl]),
                              np.concatenate([a["F"] + _off[k] for k, a in enumerate(_cl)]), process=False)
        _sm_s = smoother(trimesh.Trimesh(SV, ST, process=False))
        _depth = np.zeros(len(SV))
        _covered = np.zeros(len(SV), bool)
        for _sgn in (1, -1):  # skin inside or outside the cloth
            _loc, _ri, _ = _cm.ray.intersects_location(SV - _sgn * SN * 0.03, _sgn * SN, multiple_hits=False)
            _d = ((_loc - SV[_ri]) * SN[_ri]).sum(1)  # cloth height above skin (<0: skin outside)
            _ok = (np.abs(_d) < 0.03) & ~armMask[_ri]
            _need = np.maximum(0.005 - _d[_ok], 0)
            _depth[_ri[_ok]] = np.maximum(_depth[_ri[_ok]], _need)
            _covered[_ri[_ok]] = True
        # the crotch of the shorts is open at the inseam: sink the skin there well inside, so
        # through the opening one sees the inside of the shorts, never skin
        _cz = np.clip(1 - np.abs(SV[:, 0]) / 0.06, 0, 1) * ((SV[:, 1] > _perineum - 0.03) & (SV[:, 1] < _perineum + 0.09))
        _depth = np.maximum(_depth, 0.02 * _cz)
        _depth = np.maximum(_depth, _sm_s(_depth, 4))
        _depth[armMask] = 0
        SV = SV - SN * _depth[:, None]
        # groin skin the shorts don't cover would show between the thighs: drop it
        _bare = _gen & ~_covered
        _drop = np.zeros(len(ST), bool)  # (smoothing below makes cutting unnecessary)
        ST = ST[~_drop]; ST_UV = ST_UV[~_drop]
        print("uncovered groin faces removed", _drop.sum())
        print("skin under clothes moved", (_depth > 0).sum(), "max mm", round(_depth.max() * 1000, 1))
    # hair and brows sit just above the skin
    for A_ in ASSET_LIST:
        if A_["kind"] == "cloth":
            continue
        q, tri = _nearest(mapper.skin, A_["P"])
        nrm = mapper.skin.face_normals[tri]
        d = ((A_["P"] - q) * nrm).sum(1)
        gap = {"hair": 0.0012, "brow": 0.0006}[A_["kind"]]
        A_["P"] = A_["P"] + nrm * np.maximum(gap - d, 0)[:, None]
    GV = np.concatenate([a["P"] for a in ASSET_LIST])

    # textures for the web: skin 2048 jpg, clothes greyscale jpg (tinted in the shader), hair png
    from PIL import Image  # noqa: E402

    os.makedirs(f"{OUT}/tex", exist_ok=True)
    _skin_png = {"f": "skins01_cc0/skins/toigo_light_skin_female_bronze/young_lightskinned_female_diffuse_Bronze.png",
                 "m": "skins02_cc0/skins/toigo_light_skin_male_bronze/young_lightskinned_male_diffuse_Bronze.png"}[SEX]
    _simg = Image.open(os.path.join(ASSETS, _skin_png)).convert("RGB")
    # the face painted in the texture (lips, eye shadow, brows) belongs to the MakeHuman face,
    # not ours: replace the head island by plain skin of the neck's tone, keeping the pores
    from PIL import ImageDraw, ImageFilter  # noqa: E402

    _W, _H = _simg.size
    _Hb = SV[:, 1].max()
    _cy = mapper.mapped[mapper.loc[_BF]].mean(1)[:, 1] if hasattr(mapper, "loc") else mapper.mapped[_BF].mean(1)[:, 1]

    def _uvmask(sel):
        m = Image.new("L", (_W, _H), 0)
        dr = ImageDraw.Draw(m)
        for t in np.where(sel)[0]:
            uv = _VT[_BFT[t]]
            dr.polygon([(u * _W, (1 - v) * _H) for u, v in uv], fill=255)
        return m

    _head = _uvmask(_cy > 0.865 * _Hb).filter(ImageFilter.MaxFilter(9)).filter(ImageFilter.GaussianBlur(12))
    _neck = np.asarray(_uvmask((_cy > 0.80 * _Hb) & (_cy < 0.845 * _Hb))) > 128
    _arr = np.asarray(_simg).astype(float)
    _base = np.median(np.asarray(_simg.filter(ImageFilter.GaussianBlur(6))).astype(float)[_neck], axis=0)
    _pores = _arr - np.asarray(_simg.filter(ImageFilter.GaussianBlur(3))).astype(float)
    _plain = np.clip(_base[None, None] + _pores * 0.9, 0, 255)
    _m = (np.asarray(_head).astype(float) / 255)[..., None]
    _arr = _arr * (1 - _m) + _plain * _m
    # same for the groin (painted genitals/pubic hair would show on the inner thighs)
    _cen = mapper.mapped[mapper.loc[_BF]].mean(1)
    _gr = (np.abs(_cen[:, 0]) < 0.075) & (_cen[:, 1] > crotch - 0.07) & (_cen[:, 1] < crotch + 0.13)
    _grm = _uvmask(_gr).filter(ImageFilter.MaxFilter(9)).filter(ImageFilter.GaussianBlur(12))
    _thigh = np.asarray(_uvmask((np.abs(_cen[:, 0]) > 0.06) & (_cen[:, 1] > crotch - 0.25) & (_cen[:, 1] < crotch - 0.12))) > 128
    _tb = np.median(np.asarray(_simg.filter(ImageFilter.GaussianBlur(6))).astype(float)[_thigh], axis=0)
    _m2 = (np.asarray(_grm).astype(float) / 255)[..., None]
    _arr = _arr * (1 - _m2) + np.clip(_tb[None, None] + _pores * 0.9, 0, 255) * _m2
    _simg = Image.fromarray(_arr.astype(np.uint8))
    _simg.save(f"{OUT}/tex/{SEX}-skin.jpg", quality=86)
    # tone equalisation: divide out the texture's low-frequency colour so painted regions
    # that land a bit off on our body (and uv seams) blend; fine detail stays
    from PIL import ImageFilter  # noqa: E402
    _blur = np.asarray(_simg.resize((512, 512)).filter(ImageFilter.GaussianBlur(10))).astype(float)
    _uvN = SKIN_UV[: len(SV)]
    _px = np.clip((_uvN[:, 0] * 511).astype(int), 0, 511)
    _py = np.clip(((1 - _uvN[:, 1]) * 511).astype(int), 0, 511)
    _tone = _blur[_py, _px]
    _ref = np.median(_tone[(np.abs(SV[:, 0]) < 0.12) & (SV[:, 1] > 0.9) & (SV[:, 1] < 1.3)], axis=0)
    SKIN_TONE = np.clip(_ref[None] / np.maximum(_tone, 1), 0.7, 1.45)
    SKIN_TONE = smoother(trimesh.Trimesh(SV, ST, process=False))(SKIN_TONE, 4)
    for A_ in ASSET_LIST:
        if not A_["tex"]:
            continue
        im = Image.open(A_["tex"])
        im.thumbnail((1024, 1024))
        if A_["kind"] == "cloth":
            g = im.convert("L")
            # normalise brightness so the tint colour decides the final colour
            arr = np.asarray(g).astype(float)
            arr = np.clip(arr / max(1, np.percentile(arr, 90)) * 235, 0, 255).astype(np.uint8)
            Image.fromarray(arr).convert("RGB").save(f"{OUT}/tex/{SEX}-{A_['name']}.jpg", quality=85)
        else:
            im.convert("RGBA").save(f"{OUT}/tex/{SEX}-{A_['name']}.png", optimize=True)


# ---------------------------------------------------------------- pack
ground = min(SV[:, 1].min(), MV[:, 1].min(), BV[:, 1].min())
cx = 0.0
lo = np.minimum.reduce([X.min(0) for X in (SV, MV, BV, EV, HV, GV)]); hi = np.maximum.reduce([X.max(0) for X in (SV, MV, BV, EV, HV, GV)])
for arr in [SV, MV, BV, EV, HV] + [A_["P"] for A_ in ASSET_LIST]:
    arr[:, 1] -= ground
lo[1] -= ground; hi[1] -= ground
scale = (hi - lo)


def qpos(v):
    q = np.round((v - lo) / scale * 65535)
    assert q.min() >= 0 and q.max() <= 65535, "position outside the quantisation box"
    return q.astype(np.uint16)


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
put("muscle.head", MH1.astype(np.uint8)); put("muscle.head2", MH2.astype(np.uint8))
put("muscle.hw", np.round(MHW * 255).astype(np.uint8))
put("muscle.fiber", qn(MF)); put("muscle.end", np.round(np.clip(ME, 0, 1) * 255).astype(np.uint8))
put("bone.pos", qpos(BV)); put("bone.nrm", qn(BN)); put("bone.idx", BT.astype(np.uint32))
put("skin.pos", qpos(SV)); put("skin.nrm", qn(SN)); put("skin.idx", ST.astype(np.uint32))
put("skin.region", np.round(W * 255).astype(np.uint8))
put("skin.depth", np.round(depth / 0.08 * 65535).astype(np.uint16))
put("skin.bindIdx", idx.astype(np.uint32)); put("skin.bindW", np.round(np.clip(bindW, 0, 1) * 255).astype(np.uint8))
put("skin.fiber", qn(fiberS + 1e-9))
put("skin.cloth", cloth)
_cw = np.stack([shortsF, topF, capF], 1)
put("skin.clothW", np.round((np.clip(_cw, -1, 1) * 0.5 + 0.5) * 255).astype(np.uint8))
put("skin.tint", np.round(np.clip(tint, 0, 1) * 255).astype(np.uint8))
EN = trimesh.Trimesh(EV, ET, process=False).vertex_normals
put("eye.pos", qpos(EV)); put("eye.nrm", qn(EN)); put("eye.idx", ET.astype(np.uint32))
put("eye.kind", np.round(EK / 2 * 255).astype(np.uint8))  # 0..2 = angle / iris angle
HN = trimesh.Trimesh(HV, HT, process=False).vertex_normals
put("hair.pos", qpos(HV)); put("hair.nrm", qn(HN)); put("hair.idx", HT.astype(np.uint32))
put("hair.bind", cKDTree(SV).query(HV)[1].astype(np.uint32))
asset_meta = []
for k, A_ in enumerate(ASSET_LIST):
    AN = trimesh.Trimesh(A_["P"], A_["F"], process=False).vertex_normals
    put(f"a{k}.pos", qpos(A_["P"])); put(f"a{k}.nrm", qn(AN)); put(f"a{k}.idx", A_["F"].astype(np.uint32))
    put(f"a{k}.uv", np.round(np.clip(A_["UV"], 0, 1) * 65535).astype(np.uint16))
    put(f"a{k}.bind", A_["bind"].astype(np.uint32))
    asset_meta.append(dict(name=A_["name"], kind=A_["kind"], tex=f"tex/{SEX}-{A_['name']}" + (".png" if A_["kind"] != "cloth" else ".jpg") if A_["tex"] else None,
                           color=A_["color"], credit=A_["credit"]))
put("skin.uv", np.round(SKIN_UV * 65535).astype(np.uint16))
put("skin.uvIdx", ST_UV.astype(np.uint32))
put("skin.dup", DUP.astype(np.uint32))
if WARP:
    put("skin.tone", np.round(np.clip(SKIN_TONE / 2, 0, 1) * 255).astype(np.uint8))

header = dict(version=1, sex=SEX, lo=lo.tolist(), scale=scale.tolist(), height=float(hi[1] - lo[1]),
              groups=GROUPS, heads=HEADS, fatRegions=FAT_REGIONS, parts=parts, sections=sections,
              ampMax=0.06, depthMax=0.08, bindK=K, restBf=12 if SEX == "m" else 24,
              assets=asset_meta, skinTex=f"tex/{SEX}-skin.jpg")
open(f"{OUT}/body-{SEX}.json", "w").write(json.dumps(header, ensure_ascii=False))
open(f"{OUT}/body-{SEX}.dat", "wb").write(gzip.compress(bytes(blob), 9))
print("bytes", len(blob), "gz", len(gzip.compress(bytes(blob), 9)), "height", header["height"])
