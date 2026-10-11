"""Clothes and hair as separate meshes built on top of the skin.

Every output vertex is bound to one skin vertex (``bind``) and keeps a rest offset from it,
so at runtime it follows the deformed skin: pos = skin_deformed[bind] + (rest - skin_rest[bind]).
"""
import numpy as np
import trimesh
from scipy import sparse
from scipy.sparse.csgraph import dijkstra


def _adj(n, faces):
    e = np.r_[faces[:, [0, 1]], faces[:, [1, 2]], faces[:, [2, 0]]]
    A = sparse.coo_matrix((np.ones(len(e) * 2), (np.r_[e[:, 0], e[:, 1]], np.r_[e[:, 1], e[:, 0]])),
                          shape=(n, n)).tocsr()
    A.data[:] = 1
    deg = np.asarray(A.sum(1)).ravel()
    return sparse.diags(1 / np.maximum(deg, 1)) @ A, A


def _submesh(V, F, vmask):
    fsel = vmask[F].all(1)
    used = np.unique(F[fsel])
    remap = -np.ones(len(V), np.int64)
    remap[used] = np.arange(len(used))
    return used, remap[F[fsel]]


def _boundary(F):
    e = np.sort(np.r_[F[:, [0, 1]], F[:, [1, 2]], F[:, [2, 0]]], axis=1)
    u, c = np.unique(e, axis=0, return_counts=True)
    return u[c == 1]


def _dist_from(V, F, src):
    """geodesic-ish distance (edge graph) from a set of vertices"""
    e = np.r_[F[:, [0, 1]], F[:, [1, 2]], F[:, [2, 0]]]
    w = np.linalg.norm(V[e[:, 0]] - V[e[:, 1]], axis=1)
    G = sparse.coo_matrix((np.r_[w, w], (np.r_[e[:, 0], e[:, 1]], np.r_[e[:, 1], e[:, 0]])), shape=(len(V),) * 2).tocsr()
    if len(src) == 0:
        return np.full(len(V), np.inf)
    return dijkstra(G, directed=False, indices=np.unique(src), min_only=True)


def shrinkwrap(V0, N0, F, iters, keep_out=True, pin=None, free=None):
    """smooth a patch while never letting it go inside the original surface: the result
    hugs convex parts and spans concave ones (groin, cleavage, gluteal cleft) like fabric"""
    A, _ = _adj(len(V0), F)
    V = V0.copy()
    for _ in range(iters):
        V = 0.5 * V + 0.5 * (A @ V)
        if keep_out:
            d = ((V - V0) * N0).sum(1)
            if free is not None:
                d[free] = 0
            V -= N0 * np.minimum(d, 0)[:, None]
        if pin is not None:
            V[pin] = V0[pin]
    return V


def _smooth_edges(V0, F, skin, iters=20):
    """straighten the jagged triangle-cut edge: smooth each boundary loop along itself and
    put it back on the skin"""
    be = _boundary(F)
    if not len(be):
        return V0
    n = len(V0)
    B = sparse.coo_matrix((np.ones(len(be) * 2), (np.r_[be[:, 0], be[:, 1]], np.r_[be[:, 1], be[:, 0]])),
                          shape=(n, n)).tocsr()
    deg = np.asarray(B.sum(1)).ravel()
    bv = np.where(deg > 0)[0]
    Bn = sparse.diags(1 / np.maximum(deg, 1)) @ B
    V = V0.copy()
    for _ in range(iters):
        V[bv] = 0.5 * V[bv] + 0.5 * (Bn @ V)[bv]
    V[bv] = skin.nearest.on_surface(V[bv])[0]
    # relax the first rings inside so the moved edge doesn't leave slivers
    A, _ = _adj(n, F)
    inner = np.setdiff1d(np.unique(F[np.isin(F, bv).any(1)]), bv)
    for _ in range(3):
        V[inner] = 0.5 * V[inner] + 0.5 * (A @ V)[inner]
    return V


def garment(SV, ST, SN, vmask, thick, wrap_iters, bands, skin=None, soften=0, crotch=None):
    """bands(y_mean_of_loop, loop_pts) -> (width, level, bump) for waistband / hems.
    Returns V, F, bind, band (0..1 per vertex)."""
    used, F = _submesh(SV, ST, vmask)
    V0, N0 = SV[used], SN[used]
    if skin is not None:
        V0 = _smooth_edges(V0, F, skin)
    # the edge stays put except across the crotch, where fabric bridges the legs
    bvv = np.unique(_boundary(F))
    web = None
    if crotch is not None:
        # skin hanging between the legs below the split: the fabric spans it as a gusset
        cy, cw = crotch
        web = (np.abs(V0[:, 0]) < cw) & (V0[:, 1] < cy)
        V0 = V0.copy()
        V0[web, 1] = cy
        bvv = bvv[~((np.abs(V0[bvv, 0]) < cw) & (V0[bvv, 1] < cy + 0.05))]
    V = shrinkwrap(V0, N0, F, wrap_iters, pin=bvv, free=web)
    if soften:  # fabric doesn't follow small bumps (nipples)
        A, _ = _adj(len(V), F)
        inner = np.setdiff1d(np.arange(len(V)), np.unique(_boundary(F)))
        for _ in range(soften):
            V[inner] = 0.5 * V[inner] + 0.5 * (A @ V)[inner]
            # may dip into the skin a little, but never more than the fabric is thick
            d = ((V - V0) * N0).sum(1)
            V -= N0 * np.minimum(d + 0.8 * thick, 0)[:, None]
    m = trimesh.Trimesh(V, F, process=False)
    N = m.vertex_normals
    # boundary loops: waistband (top) and hems (bottom), measured along the surface
    be = _boundary(F)
    bv = np.unique(be)
    band = np.zeros(len(V))
    extra = np.zeros(len(V))
    if len(bv):
        # split boundary vertices into loops by connected components of boundary edges
        G = sparse.coo_matrix((np.ones(len(be)), (be[:, 0], be[:, 1])), shape=(len(V),) * 2)
        ncomp, lab = sparse.csgraph.connected_components(G, directed=False)
        for c in np.unique(lab[bv]):
            loop = bv[lab[bv] == c]
            if len(loop) < 8:
                continue
            width, level, bump = bands(V[loop, 1].mean(), V[loop])
            if width <= 0:
                continue
            d = _dist_from(V, F, loop)
            t = np.clip(1 - d / width, 0, 1)
            sel = t > 0
            band[sel] = np.maximum(band[sel], np.where(t[sel] > 0.08, level, 0))
            extra[sel] = np.maximum(extra[sel], bump * np.clip(t[sel] * 6, 0, 1))
    V = V + N * (thick + extra)[:, None]
    # rim: close the gap between the fabric edge and the skin so the cloth has thickness
    if len(be):
        nb = len(V)
        # inner lip of the edge: just under the fabric, so the cloth reads as having thickness
        rimV = V[bv] - N[bv] * (thick + extra[bv])[:, None] * 0.85
        idx = -np.ones(len(V), np.int64)
        idx[bv] = nb + np.arange(len(bv))
        quads = []
        for a, b in be:
            quads.append([a, b, idx[b]])
            quads.append([a, idx[b], idx[a]])
        F = np.r_[F, np.array(quads)]
        V = np.r_[V, rimV]
        used = np.r_[used, used[bv]]
        band = np.r_[band, band[bv]]
    # consistent outward winding
    m = trimesh.Trimesh(V, F, process=False)
    if (m.face_normals[: len(F) // 2] * (m.triangles_center[: len(F) // 2] - SV[used][F[: len(F) // 2, 0]])).sum() < 0:
        pass
    return V, F, used, band


def strand_dirs(V, N, target=None, along=None):
    """per-vertex hair direction: towards a point (ponytail base) or along a vector"""
    if target is not None:
        d = target[None, :] - V
    else:
        d = np.tile(along, (len(V), 1))
    d = d - N * (d * N).sum(1, keepdims=True)
    return d / np.maximum(np.linalg.norm(d, axis=1, keepdims=True), 1e-9)


def hair_shell(SV, ST, SN, cap_mask, tmax, wrap_iters=25):
    used, F = _submesh(SV, ST, cap_mask)
    V0, N0 = SV[used], SN[used]
    V = shrinkwrap(V0, N0, F, wrap_iters)
    be = _boundary(F)
    d = _dist_from(V, F, np.unique(be)) if len(be) else np.full(len(V), 1.0)
    t = tmax * np.clip(d / 0.035, 0, 1) ** 0.7
    # fuller on top of the head
    top = (V[:, 1] - V[:, 1].min()) / max(1e-6, np.ptp(V[:, 1]))
    t *= 0.65 + 0.35 * top
    N = trimesh.Trimesh(V, F, process=False).vertex_normals
    V = V + N * (t + 0.0008)[:, None]
    A, _ = _adj(len(V), F)
    for _ in range(4):  # soften the hair mass
        V = 0.6 * V + 0.4 * (A @ V)
    return V, F, used


def tube(path, radii, seg=20):
    """closed-tip tube along a polyline"""
    P = np.asarray(path)
    T = np.gradient(P, axis=0)
    T /= np.linalg.norm(T, axis=1, keepdims=True)
    up = np.array([1.0, 0, 0])
    V, F = [], []
    for i, (p, t, r) in enumerate(zip(P, T, radii)):
        a = np.cross(t, up); a /= np.linalg.norm(a)
        b = np.cross(t, a)
        for k in range(seg):
            th = 2 * np.pi * k / seg
            V.append(p + r * (np.cos(th) * a + np.sin(th) * b * 0.82))
    n = len(P)
    for i in range(n - 1):
        for k in range(seg):
            a0 = i * seg + k; a1 = i * seg + (k + 1) % seg
            b0 = a0 + seg; b1 = a1 + seg
            F += [[a0, b0, a1], [a1, b0, b1]]
    V = np.array(V)
    tip = len(V); V = np.r_[V, P[-1:] + T[-1:] * radii[-1]]
    for k in range(seg):
        F.append([(n - 1) * seg + k, tip, (n - 1) * seg + (k + 1) % seg])
    return V, np.array(F), np.repeat(T, seg, axis=0).tolist() + [T[-1].tolist()]
