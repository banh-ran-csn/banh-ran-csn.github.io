// Pixel art drawn in code: the shop (wall, wainscoting, floor), the wooden shelves and the backpack. Outlines use the
// licensed art's outline colour (#06051a), so the drawn parts and the art look like one set.
// Doraemon, the dorayaki and the magic ring are the licensed pixel art in public/assets/ (see tool/import_art.py).

// The shop, drawn once: a cream wall with soft stripes, wooden wainscoting below a rail, and a plank floor.
// Kept plain on purpose, so the cakes, rings and numbers are what stands out.
export function buildShop(W, H, FLOOR) {
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const g = c.getContext('2d');
  const rect = (x, y, w, h, col) => { g.fillStyle = col; g.fillRect(x, y, w, h); };
  const wy = FLOOR - 26; // top of the wainscoting
  rect(0, 0, W, wy, '#fbecd0');
  for (let x = 0; x < W; x += 16) rect(x, 0, 8, wy, '#f7e3c2');
  rect(0, wy, W, 26, '#c98b55');
  rect(0, wy, W, 3, '#7a4a26');
  rect(0, wy + 3, W, 1, '#e3ac74');
  for (let x = 12; x < W; x += 24) rect(x, wy + 4, 1, 22, '#a86d3c');
  rect(0, FLOOR, W, H - FLOOR, '#d9a066');
  rect(0, FLOOR, W, 2, '#7a4a26');
  for (let y = FLOOR + 2; y < H; y += 8) {
    rect(0, y + 7, W, 1, '#b97f48');
    for (let x = ((y - FLOOR) / 8) % 2 ? 0 : 20; x < W; x += 40) rect(x, y, 1, 7, '#b97f48');
  }
  return c;
}

// A wooden wall shelf with two brackets; the station's cakes stand on it.
export function drawShelf(g, cx, y, w) {
  const x = Math.round(cx - w / 2);
  g.fillStyle = '#06051a';
  g.fillRect(x - 1, y - 1, w + 2, 7);
  g.fillStyle = '#b5743a';
  g.fillRect(x, y, w, 5);
  g.fillStyle = '#dca062';
  g.fillRect(x, y, w, 1);
  g.fillStyle = '#7a4a26';
  g.fillRect(x, y + 4, w, 1);
  g.fillStyle = '#06051a';
  for (let i = 0; i < 5; i++) {
    g.fillRect(x + 4, y + 6 + i, 5 - i, 1);
    g.fillRect(x + w - 4 - (5 - i), y + 6 + i, 5 - i, 1);
  }
}

// Doraemon's backpack, worn on his back: an open red school bag (cakes peek out of it, drawn by the caller first),
// with a pocket and a buckle on the side that shows. x, y: top-left; w, h: size in logical pixels.
export function drawBackpack(g, x, y, w, h) {
  const rect = (rx, ry, rw, rh, col) => { g.fillStyle = col; g.fillRect(rx, ry, rw, rh); };
  rect(x + 1, y, w - 2, h, '#06051a');
  rect(x, y + 1, w, h - 2, '#06051a');
  rect(x + 1, y + 1, w - 2, h - 2, '#d8403a');
  rect(x + 1, y + 1, w - 2, 2, '#9c2420'); // the rim of the opening
  rect(x + 2, y + 3, 1, h - 5, '#f2786a'); // light edge
  rect(x + w - 3, y + 3, 2, h - 5, '#a82c28'); // shade
  const px = x + 3;
  const py = y + Math.round(h * 0.5);
  const pw = Math.round(w * 0.5);
  const ph = Math.round(h * 0.32);
  rect(px, py, pw, ph, '#06051a'); // the pocket
  rect(px + 1, py + 1, pw - 2, ph - 2, '#ee6a5c');
  rect(px + Math.round(pw / 2) - 1, py - 1, 3, 2, '#06051a'); // its buckle
  rect(px + Math.round(pw / 2), py - 1, 1, 1, '#ffd628');
}

// A copy of a sprite in one flat colour (a glow behind the ring, or its white flash).
export function silhouette(img, color) {
  const c = document.createElement('canvas');
  c.width = img.width;
  c.height = img.height;
  const g = c.getContext('2d');
  g.drawImage(img, 0, 0);
  g.globalCompositeOperation = 'source-in';
  g.fillStyle = color;
  g.fillRect(0, 0, c.width, c.height);
  return c;
}

// The see-through hole of the ring: the transparent pixels that the outside cannot reach. Returned as a mask
// canvas (opaque where the hole is), so a swirl can be drawn only inside the ring.
export function holeMask(img) {
  const w = img.width;
  const h = img.height;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d');
  g.drawImage(img, 0, 0);
  const a = g.getImageData(0, 0, w, h).data;
  const outside = new Uint8Array(w * h);
  const stack = [];
  for (let x = 0; x < w; x++) stack.push(x, (h - 1) * w + x);
  for (let y = 0; y < h; y++) stack.push(y * w, y * w + w - 1);
  while (stack.length) {
    const i = stack.pop();
    if (outside[i] || a[i * 4 + 3] >= 128) continue;
    outside[i] = 1;
    const x = i % w;
    if (x > 0) stack.push(i - 1);
    if (x < w - 1) stack.push(i + 1);
    if (i >= w) stack.push(i - w);
    if (i < w * (h - 1)) stack.push(i + w);
  }
  const out = g.createImageData(w, h);
  for (let i = 0; i < w * h; i++) if (!outside[i] && a[i * 4 + 3] < 128) out.data[i * 4 + 3] = 255;
  g.clearRect(0, 0, w, h);
  g.putImageData(out, 0, 0);
  return c;
}
