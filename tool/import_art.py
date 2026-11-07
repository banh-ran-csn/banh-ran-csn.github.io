"""Turn the pixel grids in the art sheet (pixel_art.html, `const SPRITES = [...]`) into PNG files, one pixel per
grid cell, so the game draws the licensed art exactly. Reads the HTML as data only.
Usage: python3 -I tool/import_art.py <pixel_art.html> <out_dir> [id ...]   (default: every sprite)"""
import json
import re
import struct
import sys
import zlib

src, out = sys.argv[1], sys.argv[2]
wanted = set(sys.argv[3:])
html = open(src, encoding="utf-8").read()
m = re.search(r"const SPRITES = (\[.*?\]);", html, re.S)
sprites = json.loads(m.group(1))


def png(path, w, h, rows, palette, syms):
    lut = dict(zip(syms, palette))
    raw = bytearray()
    for r in rows:
        raw.append(0)
        for c in r:
            if c == ".":
                raw += b"\0\0\0\0"
            else:
                hx = lut[c].lstrip("#")
                raw += bytes(int(hx[i:i + 2], 16) for i in (0, 2, 4)) + b"\xff"
    chunk = lambda t, d: struct.pack(">I", len(d)) + t + d + struct.pack(">I", zlib.crc32(t + d) & 0xFFFFFFFF)
    data = b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">IIBBBBB", w, h, 8, 6, 0, 0, 0)) \
        + chunk(b"IDAT", zlib.compress(bytes(raw), 9)) + chunk(b"IEND", b"")
    open(path, "wb").write(data)


SYMS = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#$%&*+-=?@^~"
for s in sprites:
    if wanted and s["id"] not in wanted:
        continue
    rows = s["rows"]
    assert len(rows) == s["h"] and all(len(r) == s["w"] for r in rows), s["id"]
    png(f"{out}/{s['id']}.png", s["w"], s["h"], rows, s["palette"], SYMS)
    print(s["id"], s["w"], "x", s["h"], "cell", s["cell"], "colours", len(s["palette"]))
