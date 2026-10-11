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
    elif m["kind"] == "hair" and m["part"] in ("Hairs of eyebrow", "Eyelashes"):
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
    SV, MV, BV, (EV, HV) = warp_body(SV, _sm, MV, BV, armW, armM, armB, axes, wz, (EV, HV))
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
def band(y, lo, hi, soft=0.004):
    a = np.clip((y - lo) / soft, -1, 1); b = np.clip((hi - y) / soft, -1, 1)
    return np.minimum(a, b)  # >0 inside, <0 outside, smooth across the edge


_noarm = 1 - 2 * np.clip(smoother(skin)(armMask.astype(float), 8), 0, 1)
shortsF = np.minimum(band(_y, crotch - 0.075, navel - 0.03), _noarm)
shorts_v = shortsF > 0
top_v = np.zeros(len(SV), bool)
topF = np.full(len(SV), -1.0)
if SEX == "f":
    under = _y[named("Inframammary region")].min() - 0.035
    upper = _y[named("Mammary region")].max() + 0.03
    _nodelt = 1 - 2 * np.clip(smoother(skin)(named("Deltoid region").astype(float), 8), 0, 1)
    topF = np.minimum(np.minimum(band(_y, under, upper), _noarm), _nodelt)
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
_fab_s = _sm2(SV, 30)
_shr = _sm2(((SV - _fab_s) * _fab_n).sum(1), 60)
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
if SEX == "f":
    occ = SV[headv & (_y > brow - 0.01) & (_y < brow + 0.04)]
    back_pt = occ[np.argmin(occ[:, 2])]
    bun = trimesh.creation.icosphere(subdivisions=3, radius=0.042)
    bun.vertices[:, 2] *= 0.85
    bun.apply_translation(back_pt + np.array([0, 0.035, -0.03]))
    HT = np.r_[HT, bun.faces + len(HV)]; HV = np.r_[HV, bun.vertices]
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

# ---------------------------------------------------------------- pack
ground = min(SV[:, 1].min(), MV[:, 1].min(), BV[:, 1].min())
cx = 0.0
lo = np.minimum.reduce([X.min(0) for X in (SV, MV, BV, EV, HV)]); hi = np.maximum.reduce([X.max(0) for X in (SV, MV, BV, EV, HV)])
for arr in (SV, MV, BV, EV, HV):
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

header = dict(version=1, sex=SEX, lo=lo.tolist(), scale=scale.tolist(), height=float(hi[1] - lo[1]),
              groups=GROUPS, heads=HEADS, fatRegions=FAT_REGIONS, parts=parts, sections=sections,
              ampMax=0.06, depthMax=0.08, bindK=K, restBf=12 if SEX == "m" else 24)
open(f"{OUT}/body-{SEX}.json", "w").write(json.dumps(header, ensure_ascii=False))
open(f"{OUT}/body-{SEX}.dat", "wb").write(gzip.compress(bytes(blob), 9))
print("bytes", len(blob), "gz", len(gzip.compress(bytes(blob), 9)), "height", header["height"])
