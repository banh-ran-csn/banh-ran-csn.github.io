"""Shrink a pixel sprite a little (e.g. 0.9) without losing its outlines. Each new pixel looks at the source
pixels under it (weighted by how much they cover): transparent if mostly transparent; the outline colour if an
outline pixel covers a quarter of it or more (so thin lines never vanish); otherwise the colour that covers most.
Usage: python3 -E tool/art/shrink.py <in.png> <factor> <out.png>"""
import sys
import numpy as np
from PIL import Image

src, f, out = sys.argv[1], float(sys.argv[2]), sys.argv[3]
a = np.array(Image.open(src).convert("RGBA"))
h, w = a.shape[:2]
ow, oh = round(w * f), round(h * f)
opaque = a[..., 3] >= 128
lum = a[..., :3].astype(int) @ np.array([299, 587, 114]) // 1000
outline = opaque & (lum < 45)
K = a[outline][0] if outline.any() else np.array([0, 0, 0, 255])
res = np.zeros((oh, ow, 4), np.uint8)


def spans(o, n):  # source pixels under output pixel o, with their coverage
    x0, x1 = o / f, (o + 1) / f
    return [(i, min(x1, i + 1) - max(x0, i)) for i in range(int(x0), min(n, int(np.ceil(x1))))]


for oy in range(oh):
    ys = spans(oy, h)
    for ox in range(ow):
        weights = {}
        cover = line = total = 0.0
        for y, wy in ys:
            for x, wx in spans(ox, w):
                c = wy * wx
                total += c
                if opaque[y, x]:
                    cover += c
                    line += c if outline[y, x] else 0
                    key = tuple(a[y, x])
                    weights[key] = weights.get(key, 0) + c
        if cover < total / 2:
            continue
        res[oy, ox] = K if line >= total / 4 else max(weights, key=weights.get)
Image.fromarray(res, "RGBA").save(out)
print(src, "->", out, ow, "x", oh)
