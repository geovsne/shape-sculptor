"""Male -> female displacement field from MakeHuman (CC0) targets.

prepare(): writes an npz with MakeHuman male/female body vertices aligned to the
Z-Anatomy model (three.js coords, metres) plus labels.
warp_points(): displaces Z-Anatomy points (skin, muscle, bone) by the field.
Arms are handled separately because the two models are posed differently.
"""
import sys

import numpy as np
from scipy.spatial import cKDTree


def load_obj_body(path):
    V, F, cur = [], [], None
    for line in open(path):
        if line.startswith("v "):
            V.append([float(x) for x in line.split()[1:4]])
        elif line.startswith("g "):
            cur = line.split()[1]
        elif line.startswith("f ") and cur == "body":
            F.append([int(t.split("/")[0]) - 1 for t in line.split()[1:]])
    V = np.array(V)
    body = np.unique(np.concatenate([np.array(f) for f in F]))
    return V, body


def load_target(path, n):
    d = np.zeros((n, 3))
    for line in open(path):
        if line.startswith("#") or not line.strip():
            continue
        i, x, y, z = line.split()
        d[int(i)] = [float(x), float(y), float(z)]
    return d


def prepare(mh_dir, za_skin_pos, out):
    V, body = load_obj_body(f"{mh_dir}/3dobjs/base.obj")
    M = (V + load_target(f"{mh_dir}/targets/macrodetails/caucasian-male-young.target", len(V)))[body]
    Fm = (V + load_target(f"{mh_dir}/targets/macrodetails/caucasian-female-young.target", len(V))
          + 0.6 * load_target(f"{mh_dir}/targets/breast/female-young-averagemuscle-averageweight-maxcup-averagefirmness.target", len(V)))[body]
    # MakeHuman: decimetres, Y up, +Z forward  (same axes as three.js)
    za = za_skin_pos
    s = (za[:, 1].max() - za[:, 1].min()) / (M[:, 1].max() - M[:, 1].min())
    M = M * s
    Fm = Fm * s
    shift = np.array([0.0, za[:, 1].min() - M[:, 1].min(), 0.0])
    # align depth using the torso band
    band_za = (za[:, 1] > 1.0) & (za[:, 1] < 1.3) & (np.abs(za[:, 0]) < 0.12)
    band_mh = (M[:, 1] + shift[1] > 1.0) & (M[:, 1] + shift[1] < 1.3) & (np.abs(M[:, 0]) < 0.12)
    shift[2] = za[band_za, 2].mean() - M[band_mh, 2].mean()
    M = M + shift
    Fm = Fm + shift
    H = za[:, 1].max()
    # arm vertices of the MakeHuman model (A pose): lateral and below the shoulder
    arm = (np.abs(M[:, 0]) > 0.205 * H / 1.71) & (M[:, 1] < 0.83 * H)
    disp = Fm - M
    breast = (M[:, 1] > 0.68 * H) & (M[:, 1] < 0.8 * H) & (M[:, 2] > 0.0) & (disp[:, 2] > 0.006) & ~arm
    np.savez(out, M=M, F=Fm, arm=arm, breast=breast, H=H)
    print("mh aligned", M.min(0).round(3), M.max(0).round(3), "arm", arm.sum(), "breast", breast.sum())


_state = {}


def _setup(w):
    if "kd" in _state:
        return
    M, D, arm, breast = w["M"], w["F"] - w["M"], w["arm"], w["breast"]
    torso = ~arm
    _state["M"] = M
    _state["D"] = D
    _state["kd_all"] = cKDTree(M[torso])
    _state["D_all"] = D[torso]
    inner = torso & ~breast
    _state["kd_inner"] = cKDTree(M[inner])
    _state["D_inner"] = D[inner]
    H = float(w["H"])
    _state["H"] = H
    # shoulder joints and their displacement (left = +x)
    sh = []
    for sgn in (1, -1):
        sel = torso & (np.sign(M[:, 0]) == sgn) & (np.abs(M[:, 0]) > 0.14 * H / 1.71) & (M[:, 1] > 0.78 * H) & (M[:, 1] < 0.84 * H)
        sh.append((M[sel].mean(0), D[sel].mean(0)))
    _state["shoulders"] = sh
    _state["kd"] = True


def field(p, kind):
    """Smooth kNN interpolation of the torso/leg/head displacement field."""
    kd, D = (_state["kd_all"], _state["D_all"]) if kind == "skin" else (_state["kd_inner"], _state["D_inner"])
    d, i = kd.query(p, k=24)
    w = np.exp(-(d / 0.03) ** 2) + 1e-9
    w /= w.sum(1, keepdims=True)
    return (D[i] * w[..., None]).sum(1)


def arm_transform(p, arm_weight, axes, base):
    out = base.copy()
    ratio = 0.92
    for sgn, (sh_pos, sh_disp) in zip((1, -1), _state["shoulders"]):
        sel = (arm_weight > 0) & (np.sign(p[:, 0]) == sgn)
        if not sel.any():
            continue
        top, ax = axes[sgn]
        rel = p[sel] - top
        along = rel @ ax
        radial = rel - np.outer(along, ax)
        newq = top + sh_disp + np.outer(np.maximum(along, 0) * ratio + np.minimum(along, 0), ax) + radial * 0.86
        aw = arm_weight[sel][:, None]
        out[sel] = base[sel] * (1 - aw) + newq * aw
    return out


def warp_body(SV, smooth, MV, BV, armS, armM, armB, axes, w):
    """Skin gets the full field (breasts included), smoothed over the surface.
    Muscles and bones follow the skin field without the breast bulge."""
    _setup(w)
    Dfull = smooth(field(SV, "skin"), 10)
    Dinner = smooth(field(SV, "inner"), 25)
    S2 = arm_transform(SV, armS, axes, SV + Dfull)
    from scipy.spatial import cKDTree as _KD

    kd = _KD(SV)

    def interior(P, armP):
        d, i = kd.query(P, k=12)
        ww = 1 / np.maximum(d, 0.004) ** 2
        ww /= ww.sum(1, keepdims=True)
        base = P + (Dinner[i] * ww[..., None]).sum(1)
        return arm_transform(P, armP, axes, base)

    return S2, interior(MV, armM), interior(BV, armB)


def arm_axes(skin_pos, arm_mask):
    axes = {}
    for sgn in (1, -1):
        q = skin_pos[arm_mask & (np.sign(skin_pos[:, 0]) == sgn)]
        c = q.mean(0)
        _, _, vt = np.linalg.svd(q - c, full_matrices=False)
        ax = vt[0] if vt[0][1] < 0 else -vt[0]
        top = q[np.argmax(q @ -ax)]
        axes[sgn] = (top, ax)
    return axes


def warp_points(p, kind, w, arm_weight, axes):
    _setup(w)
    out = p + field(p, kind)
    ratio = 0.92  # female / male stature in the source targets
    for sgn, (sh_pos, sh_disp) in zip((1, -1), _state["shoulders"]):
        sel = (arm_weight > 0) & (np.sign(p[:, 0]) == sgn)
        if not sel.any():
            continue
        top, ax = axes[sgn]
        rel = p[sel] - top
        along = rel @ ax
        radial = rel - np.outer(along, ax)
        newq = top + sh_disp + np.outer(np.maximum(along, 0) * ratio + np.minimum(along, 0), ax) + radial * 0.86
        aw = arm_weight[sel][:, None]
        out[sel] = out[sel] * (1 - aw) + newq * aw
    return out


if __name__ == "__main__":
    import numpy as np  # noqa

    prepare(sys.argv[1], np.load(sys.argv[2])["skin"], sys.argv[3])
