"""2D muscle map for the simulator: front and back views traced from the 3D body itself.

Each muscle head of the 3D model is projected orthographically (front and back), drawn with a
painter's algorithm so only what is visible from that side counts, and its outline is traced
into SVG paths. Output: src/components/sim/miniMapPaths.json
Run: python3 tools/anatomy/minimap_paths.py public/models/body-m src/components/sim/miniMapPaths.json
"""
import gzip
import json
import sys

import numpy as np
from scipy import ndimage
from skimage import draw, measure

base, out = sys.argv[1], sys.argv[2]
hdr = json.load(open(base + ".json"))
raw = gzip.decompress(open(base + ".dat", "rb").read())
lo, sc = np.array(hdr["lo"]), np.array(hdr["scale"])


def sec(name):
    s = next(x for x in hdr["sections"] if x["name"] == name)
    a = np.frombuffer(raw, dtype=s["dtype"], count=int(np.prod(s["shape"])), offset=s["offset"])
    return a.reshape(s["shape"])


def pos(prefix):
    return lo + sec(prefix + ".pos").astype(np.float64) / 65535 * sc


mpos, midx, mhead = pos("muscle"), sec("muscle.idx"), sec("muscle.head")
spos, sidx = pos("skin"), sec("skin.idx")
heads = hdr["heads"]

W = 360  # pixels across the body width
x0, x1 = mpos[:, 0].min() - 0.02, mpos[:, 0].max() + 0.02
y0, y1 = 0.0, spos[:, 1].max() + 0.01
px = W / (x1 - x0)
H = int((y1 - y0) * px) + 1
OTHER = 254


def render(front):
    """id buffer: head index, OTHER for muscles outside the map, 255 = background"""
    img = np.full((H, W), 255, np.uint8)
    z = mpos[:, 2] if front else -mpos[:, 2]
    xs = (mpos[:, 0] - x0) * px
    if not front:
        xs = W - xs  # seen from behind, the body's right is on the viewer's right
    ys = (y1 - mpos[:, 1]) * px
    tz = z[midx].mean(1)
    order = np.argsort(tz)  # far to near
    tri_head = mhead[midx[:, 0]]
    for t in order:
        a, b, c = midx[t]
        rr, cc = draw.polygon([ys[a], ys[b], ys[c]], [xs[a], xs[b], xs[c]], shape=img.shape)
        h = tri_head[t]
        img[rr, cc] = h if h < len(heads) else OTHER
    return img


def silhouette():
    m = np.zeros((H, W), bool)
    xs = (spos[:, 0] - x0) * px
    ys = (y1 - spos[:, 1]) * px
    for a, b, c in sidx:
        rr, cc = draw.polygon([ys[a], ys[b], ys[c]], [xs[a], xs[b], xs[c]], shape=m.shape)
        m[rr, cc] = True
    return ndimage.binary_closing(m, iterations=2)


def paths_of(mask, tol=0.9, min_area=12):
    mask = ndimage.binary_opening(mask, iterations=1)
    mask = ndimage.gaussian_filter(mask.astype(float), 1.0) > 0.5
    out = []
    lab, n = ndimage.label(mask)
    for k in range(1, n + 1):
        comp = lab == k
        if comp.sum() < min_area:
            continue
        for cnt in measure.find_contours(np.pad(comp, 1).astype(float), 0.5):
            if len(cnt) < 6:
                continue
            poly = measure.approximate_polygon(cnt - 1, tol)
            d = "M" + " L".join(f"{p[1]:.1f} {p[0]:.1f}" for p in poly) + "Z"
            out.append(d)
    return out


res = {"w": W, "h": H, "heads": heads}
sil = silhouette()
res["silhouette"] = paths_of(sil, tol=1.2, min_area=200)
for name, front in (("front", True), ("back", False)):
    img = render(front)
    view = {"other": paths_of(img == OTHER, min_area=20), "heads": {}}
    for i, h in enumerate(heads):
        p = paths_of(img == i)
        if p:
            view["heads"][h] = p
    res[name] = view
    print(name, "heads drawn", len(view["heads"]), "of", len(heads))
json.dump(res, open(out, "w"), separators=(",", ":"))
import os

print("size KB", os.path.getsize(out) // 1024)
