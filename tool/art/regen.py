"""Re-render the shape-drawn art (hoop.py, dorayaki.py from the art folder) at the game's size and pixel scale.
The scripts are run as they are, with four small changes made on the fly:
  * every coordinate is scaled by FX (across) and FY (down), so the drawing gets the size the game needs;
  * outlines (grow) stay whole pixels wide, so the line weight matches the rest of the game;
  * the canvas and the final pixel grid get the scaled size;
  * the result is saved one pixel per cell (no ×10.627 enlargement).
Usage: python3 -E tool/art/regen.py <script.py> <FX> <FY> <out.png> [outline weight, default 1]
Outline weight 0 = no inner lines, then one dark outline around the whole shape (for very small drawings)."""
import sys

src_path, FX, FY, out = sys.argv[1], float(sys.argv[2]), float(sys.argv[3]), sys.argv[4]
OL = float(sys.argv[5]) if len(sys.argv) > 5 else 1.0  # <1: thinner inner outlines on very small drawings
code = open(src_path, encoding="utf-8").read().replace("\r\n", "\n")


def sub(a, b):
    global code
    assert a in code, f"{src_path}: cannot find {a!r}"
    code = code.replace(a, b)


sub("def sc(b):\n    return [v * S for v in b]",
    "def sc(b):\n    return [v * S * (FX if i % 2 == 0 else FY) for i, v in enumerate(b)]")
sub("def grow(b, k):\n    return (b[0] - k, b[1] - k, b[2] + k, b[3] + k)",
    "def grow(b, k):\n    k = k * OL\n    return (b[0] - k / FX, b[1] - k / FY, b[2] + k / FX, b[3] + k / FY)")
sub('g = Image.new("RGBA", (GW * S, GH * S), (0, 0, 0, 0))',
    'g = Image.new("RGBA", (round(GW * FX) * S, round(GH * FY) * S), (0, 0, 0, 0))')
sub("small = g.resize((GW, GH), Image.NEAREST)", "small = g.resize((round(GW * FX), round(GH * FY)), Image.NEAREST)")
cut = code.index("big = small.resize(")
code = code[:cut] + """
if OL == 0:  # one 1px outline around the silhouette, in the art's outline colour
    import numpy as _np
    _a = _np.array(small)
    _a = _np.pad(_a, ((1, 1), (1, 1), (0, 0)))
    _s = _a[..., 3] >= 128
    _n = _np.zeros_like(_s)
    _n[1:] |= _s[:-1]; _n[:-1] |= _s[1:]; _n[:, 1:] |= _s[:, :-1]; _n[:, :-1] |= _s[:, 1:]
    _a[_n & ~_s] = list(K) + [255]
    small = Image.fromarray(_a, "RGBA")
small.save(OUT)
print(small.size)
"""
exec(compile(code, src_path, "exec"), {"__name__": "__main__", "FX": FX, "FY": FY, "OL": OL, "OUT": out, "sys": sys})
