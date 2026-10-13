"""Even out the MakeHuman skin texture so UV seams stop showing on the 3D body.

The texture is made of islands (torso with arms, legs, feet, hands) with lighter or darker rims
and different baked lighting. Where the body mesh crosses from one island to another the rims and
the tone jump show up as lines (forearm) and pale blotches (ankles). This keeps the fine detail
(pores, nipples, navel, lips) and replaces the large-scale tone with one even skin tone:

1. find the islands (pixels that differ from the flat background) and drop a few pixels of rim
2. fill everything outside the islands from the nearest island colour (push-pull)
3. split into low and high frequencies; keep the detail, flatten most of the low frequencies

    python tools/anatomy/even_skin.py public/models/tex/m-skin.jpg public/models/tex/m-skin-even.jpg
"""
import sys

import numpy as np
from PIL import Image
from scipy import ndimage as ndi

src, dst = sys.argv[1], sys.argv[2]
img = np.asarray(Image.open(src).convert("RGB")).astype(np.float32)
H, W, _ = img.shape

bg = np.median(np.concatenate([img[:8, :8].reshape(-1, 3), img[-8:, :8].reshape(-1, 3)]), axis=0)
diff = ndi.median_filter(np.abs(img - bg).sum(-1), 5)
island = ndi.binary_closing(diff > 10, iterations=4)
island = ndi.binary_fill_holes(island)
lab, n = ndi.label(island)
sizes = ndi.sum(island, lab, range(1, n + 1))
island = np.isin(lab, 1 + np.nonzero(sizes > 2000)[0])
core = ndi.binary_erosion(island, iterations=12)  # drop the rim


def masked_blur(im, mask, s):
    m = mask.astype(np.float32)
    num = np.stack([ndi.gaussian_filter(im[..., i] * m, s) for i in range(3)], -1)
    den = ndi.gaussian_filter(m, s)
    return num / np.maximum(den, 1e-6)[..., None], den


def fill(im, mask):
    """smooth extension of the pixels inside mask into everything outside (normalised blur)"""
    out = im.copy()
    known = mask.copy()
    for s in (2, 6, 18, 54, 160):
        b, den = masked_blur(out, known, s)
        new = ~known & (den > 0.02)
        out[new] = b[new]
        known |= new
    out[~known] = np.median(im[mask], axis=0)
    return out


full = fill(img, core)
# low frequencies of the filled texture; rims and background are already gone
low = np.stack([ndi.gaussian_filter(full[..., i], 40) for i in range(3)], -1)
# pale blotches (island rims, sole skin) are bright detail: cap it; dark marks (nipples, navel) stay
detail = np.clip(full - low, -80, 10)
tone = np.median(img[core], axis=0)  # one even skin tone
out = tone + 0.18 * (low - tone) + detail
Image.fromarray(np.clip(out, 0, 255).astype(np.uint8)).save(dst, quality=90)
print("background", bg.round(), "skin tone", tone.round(), "island px", int(core.sum()))
