"""MakeHuman assets (CC0 / CC-BY) on our anatomical body.

MakeHuman skins, clothes, hair and eyebrows are made for the MakeHuman base mesh. The
warp step already morphed that base mesh into our proportions (Ffull, aligned to our
coordinates). Here we
  1. map the MakeHuman surface onto our final skin (closest point; arms re-posed first),
  2. fit proxies (.mhclo) on the morphed base mesh and carry them along the same map,
  3. give our skin MakeHuman texture coordinates (with seam vertices duplicated).
"""
import os

import numpy as np
import trimesh
from scipy import sparse
from scipy.spatial import cKDTree


def load_base(path):
    """MakeHuman base.obj: texture coordinates and the triangulated 'body' group"""
    VT, F, FT, cur = [], [], [], None
    for line in open(path):
        if line.startswith("vt "):
            VT.append([float(x) for x in line.split()[1:3]])
        elif line.startswith("g "):
            cur = line.split()[1]
        elif line.startswith("f ") and cur == "body":
            parts = [t.split("/") for t in line.split()[1:]]
            vi = [int(p[0]) - 1 for p in parts]
            ti = [int(p[1]) - 1 for p in parts]
            tris = ([0, 1, 2], [0, 2, 3]) if len(vi) == 4 else ([0, 1, 2],)
            for a, b, c in tris:
                F.append([vi[a], vi[b], vi[c]])
                FT.append([ti[a], ti[b], ti[c]])
    return np.array(VT), np.array(F), np.array(FT)


def nearest(mesh, P, chunk=600):
    """closest points on a mesh, in chunks (trimesh's query is memory hungry)"""
    qs, ts = [], []
    for i in range(0, len(P), chunk):
        q, _, t = mesh.nearest.on_surface(P[i:i + chunk])
        qs.append(q); ts.append(t)
    return np.concatenate(qs), np.concatenate(ts)


def _rot(a, b):
    """rotation taking unit vector a onto unit vector b"""
    v = np.cross(a, b)
    c = float(a @ b)
    if np.linalg.norm(v) < 1e-9:
        return np.eye(3)
    K = np.array([[0, -v[2], v[1]], [v[2], 0, -v[0]], [-v[1], v[0], 0]])
    return np.eye(3) + K + K @ K * (1 / (1 + c))


def _axes(P):
    c = P.mean(0)
    _, _, vt = np.linalg.svd(P - c, full_matrices=False)
    ax = vt[0] if vt[0][1] < 0 else -vt[0]
    top = P[np.argmax(P @ -ax)]
    return top, ax


class Mapper:
    """MakeHuman body (morphed, aligned) -> our deformed skin"""

    def __init__(self, Ffull, body, mh_arm, SV, ST, our_arm):
        self.Ffull = Ffull
        self.body = body
        F = Ffull[body].copy()
        # re-pose the MakeHuman arms (A pose) onto ours, around each shoulder
        Fp = F.copy()
        for sgn in (1, -1):
            sel_mh = mh_arm & (np.sign(F[:, 0]) == sgn)
            sel_us = our_arm & (np.sign(SV[:, 0]) == sgn)
            if sel_mh.sum() < 20 or sel_us.sum() < 20:
                continue
            t0, a0 = _axes(F[sel_mh])
            t1, a1 = _axes(SV[sel_us])
            L0 = np.ptp(F[sel_mh] @ a0)
            L1 = np.ptp(SV[sel_us] @ a1)
            R = _rot(a0, a1)
            rel = F[sel_mh] - t0
            along = rel @ a0
            rel = rel + np.outer(along * (L1 / L0 - 1), a0)
            Fp[sel_mh] = t1 + rel @ R.T
        self.skin = trimesh.Trimesh(SV, ST, process=False)
        q, _ = nearest(self.skin, Fp)
        D = q - F
        # smooth the correction over the MakeHuman surface so it stays coherent
        n = len(Ffull)
        loc = -np.ones(n, np.int64)
        loc[body] = np.arange(len(body))
        self.loc = loc
        self.D = D
        self.mapped = F + D
        self.kd = cKDTree(F)

    def carry(self, P, sigma=0.015, k=16):
        """move points fitted on the MakeHuman body along the same map"""
        d, i = self.kd.query(P, k=k)
        w = np.exp(-(d / sigma) ** 2) + 1e-12
        w /= w.sum(1, keepdims=True)
        return P + (self.D[i] * w[..., None]).sum(1)


def read_mhclo(path):
    meta, refs = {}, []
    mode = None
    for line in open(path, encoding="utf-8", errors="ignore"):
        s = line.strip()
        if not s or s.startswith("#"):
            continue
        tok = s.split()
        if tok[0] == "verts":
            mode = "verts"
            continue
        if mode == "verts":
            if len(tok) == 9 and tok[0].isdigit():
                refs.append(tok)
                continue
            if len(tok) == 1 and tok[0].isdigit():
                refs.append([tok[0], tok[0], tok[0], "1", "0", "0", "0", "0", "0"])
                continue
            mode = None
        if tok[0] in ("x_scale", "y_scale", "z_scale"):
            meta[tok[0]] = (int(tok[1]), int(tok[2]), float(tok[3]))
        elif tok[0].endswith(("_shear_x", "_shear_y", "_shear_z")):
            meta[tok[0]] = (int(tok[1]), int(tok[2]), float(tok[3]), float(tok[4]))
        elif tok[0] in ("obj_file", "material", "name"):
            meta[tok[0]] = tok[1]
    R = np.array(refs, dtype=float)
    return meta, R[:, :3].astype(int), R[:, 3:6], R[:, 6:9]


def read_obj(path):
    V, VT, F, FT = [], [], [], []
    for line in open(path):
        if line.startswith("v "):
            V.append([float(x) for x in line.split()[1:4]])
        elif line.startswith("vt "):
            VT.append([float(x) for x in line.split()[1:3]])
        elif line.startswith("f "):
            parts = [t.split("/") for t in line.split()[1:]]
            vi = [int(p[0]) - 1 for p in parts]
            ti = [int(p[1]) - 1 if len(p) > 1 and p[1] else int(p[0]) - 1 for p in parts]
            for j in range(1, len(vi) - 1):
                F.append([vi[0], vi[j], vi[j + 1]])
                FT.append([ti[0], ti[j], ti[j + 1]])
    return np.array(V), np.array(VT) if VT else None, np.array(F), np.array(FT)


def read_mhmat(path):
    out = {}
    if not os.path.exists(path):
        return out
    for line in open(path, encoding="utf-8", errors="ignore"):
        tok = line.split()
        if len(tok) >= 2 and tok[0] in ("diffuseTexture", "diffuseColor", "transparencyMapTexture"):
            out[tok[0]] = tok[1:] if tok[0] == "diffuseColor" else tok[1]
    return out


def fit_proxy(mhclo, Ffull):
    """proxy vertices on the morphed MakeHuman body; faces and per-vertex uv"""
    meta, ref, w, off = read_mhclo(mhclo)
    base = (Ffull[ref] * w[..., None]).sum(1)
    if "x_scale" in meta:
        sc = []
        for ax, key in enumerate(("x_scale", "y_scale", "z_scale")):
            a, b, den = meta[key]
            sc.append(abs(Ffull[a, ax] - Ffull[b, ax]) / den)
        P = base + off * np.array(sc)
    else:
        # newer format: per-side scale from two reference vertices and their original coords
        def side(prefix):
            sc = []
            for ax, key in enumerate(("x", "y", "z")):
                a, b, x1, x2 = meta[f"{prefix}_shear_{key}"]
                sc.append(abs((Ffull[a, ax] - Ffull[b, ax]) / (x1 - x2)))
            return np.array(sc)
        sl, sr = side("l"), side("r")
        P = base + off * np.where(base[:, :1] >= 0, sl, sr)
    d = os.path.dirname(mhclo)
    V, VT, F, FT = read_obj(os.path.join(d, meta["obj_file"]))
    assert len(V) == len(P), (mhclo, len(V), len(P))
    # one uv per vertex: split vertices that carry several uvs
    if VT is not None:
        key = {}
        newF = np.zeros_like(F)
        src, uv = [], []
        for fi in range(len(F)):
            for c in range(3):
                k = (F[fi, c], FT[fi, c])
                if k not in key:
                    key[k] = len(src)
                    src.append(F[fi, c])
                    uv.append(VT[FT[fi, c]])
                newF[fi, c] = key[k]
        P, F, UV = P[np.array(src)], newF, np.array(uv)
    else:
        UV = np.zeros((len(P), 2))
    mat = read_mhmat(os.path.join(d, meta.get("material", "")))
    tex = mat.get("diffuseTexture")
    return P, F, UV, (os.path.join(d, tex) if tex else None), mat


def skin_uv(mapper, VT, BF, BFT, SV, ST, seam=0.05):
    """texture coordinates for our skin from the MakeHuman layout. Faces that straddle
    a uv seam get their own copies of the vertices; returns uv, faces, dup source"""
    mapped = trimesh.Trimesh(mapper.mapped, mapper.loc[BF], process=False)
    q, tri = nearest(mapped, SV)
    bary = trimesh.triangles.points_to_barycentric(mapped.triangles[tri], q)
    uvv = (VT[BFT[tri]] * bary[..., None]).sum(1)
    F = ST.copy()
    span = np.ptp(uvv[F], axis=1).max(1)
    bad = np.where(span > seam)[0]
    extra_src, extra_uv = [], []
    cache = {}
    tris3 = mapped.triangles
    _, ctri = nearest(mapped, SV[F[bad]].mean(1)) if len(bad) else (None, [])
    for fi, t in zip(bad, ctri):
        # use the chart of the triangle under the face centre for all three corners
        T = tris3[t]
        for k in range(3):
            v = F[fi, k]
            b = trimesh.triangles.points_to_barycentric(T[None], SV[v][None])[0]
            uv = b @ VT[BFT[t]]
            if np.abs(uv - uvv[v]).max() < 0.004:
                continue
            key = (v, round(uv[0], 3), round(uv[1], 3))
            if key not in cache:
                cache[key] = len(SV) + len(extra_src)
                extra_src.append(v)
                extra_uv.append(uv)
            F[fi, k] = cache[key]
    uv_all = np.r_[uvv, np.array(extra_uv).reshape(-1, 2)]
    return np.clip(np.nan_to_num(uv_all, nan=0.5), 0, 1), F, np.array(extra_src, np.int64)
