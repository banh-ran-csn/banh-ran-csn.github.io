#!/usr/bin/env bash
# Rebuild the game's art from the licensed pixel-art folder (default ~/doraemon_pixel_art).
#   doraemon.png: the pixel grid from pixel_art.html, shrunk to 90% by shrink.py (outlines kept)
#   ring.png, cake.png: the art scripts hoop.py and dorayaki.py, re-rendered at the game's size and pixel scale
set -euo pipefail
ART="${1:-$HOME/doraemon_pixel_art}"
cd "$(dirname "$0")/../.."
TMP="$(mktemp -d)"
python3 -I tool/import_art.py "$ART/pixel_art.html" "$TMP" doraemon
python3 -E tool/art/shrink.py "$TMP/doraemon.png" 0.9 public/assets/doraemon.png  # 10% smaller next to the ring
python3 -E tool/art/regen.py "$ART/nguon_python/hoop.py" 0.8 1.32 public/assets/ring.png 2>/dev/null
python3 -E tool/art/regen.py "$ART/nguon_python/dorayaki.py" 0.3 0.3 public/assets/cake.png 0 2>/dev/null
