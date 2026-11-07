// Vòng nhân bản bánh rán: one projected screen, driven by the teacher (or a student at the board).
// In a small sweets shop, Doraemon walks from station 1 to station 5 (a wall shelf each), carrying a sack of
// dorayaki in his backpack; each magic ring on the way multiplies the cakes by q. The canvas draws the shop in 384×216 logical
// pixels at 3 device pixels each, so Doraemon's art keeps every one of its pixels; HTML on top carries the text.
import {
  cakes, drawPlan, questionsFor, formulaFor, STEPS, roomsShown, formulasShown, nextLabel,
  CAN_GENERALIZE_AT, GENERAL_FROM, CHOICES, ROOMS, u,
} from './logic.js';
import { buildShop, drawShelf, drawBackpack, silhouette, holeMask } from './art.js';

const CHARACTER_NAME = 'Doraemon';
// The licensed pixel art (built by tool/art/build.sh), and how many device pixels each of its pixels takes.
// Everything shares one pixel size (3 device pixels): the ring and the cake are drawn at it, and Doraemon's
// sheet is 3× finer than its own pixels, so it takes 1 device pixel per cell.
const ART = {
  hero: { file: 'assets/doraemon.png', k: 1, w: 108, h: 145 }, // the sheet's 120×161, shrunk to 90%
  cake: { file: 'assets/cake.png', k: 3, w: 14, h: 12 },
  ring: { file: 'assets/ring.png', k: 3, w: 29, h: 59 },
};

const S = 3; // device pixels per logical pixel
const W = 384;
const H = 216;
const GROUND = 156;
const SHELF_Y = 72;
const SHELF_W = 58;
// sizes in logical pixels: Doraemon 36×48, the ring 29×59 (taller than him, so he fits through), a cake 14×12
const RING_W = (ART.ring.w * ART.ring.k) / S;
const RING_H = (ART.ring.h * ART.ring.k) / S;
const RING_TOP = GROUND - 3 - RING_H; // it stands on a small base
const RING_CY = RING_TOP + RING_H / 2;
const CAKE_W = (ART.cake.w * ART.cake.k) / S;
const CAKE_H = (ART.cake.h * ART.cake.k) / S;
const stX = (k) => 40 + (k - 1) * 76; // station k
const ringX = (j) => (stX(j) + stX(j + 1)) / 2; // ring j, between station j and j+1
// cake i on station k's shelf: 4 in a row, rows stacked upwards
const slot = (k, i) => ({ x: stX(k) - 2 * CAKE_W + (i % 4) * CAKE_W, y: SHELF_Y - CAKE_H - Math.floor(i / 4) * 8 });
// the walk through ring k−1 into station k, in ms
const T = { ring: 900, arrive: 1700, popFrom: 1000, popSpan: 900, flight: 380, hop: 2200, end: 2600 };

const $ = (s) => document.querySelector(s);
const canvas = $('#scene');
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const shop = buildShop(W, H, GROUND);

let u1 = 1;
let q = 2;
let step = 0;
let anim = null; // { k, t0, crossed, popped } while Doraemon walks through a ring
const img = {}; // the art, once loaded
let swirl = null; // the ring's hole mask and a canvas to paint the swirl in, made when the art loads
let note = '';

// ---------- small text helpers ----------
const SUBS = '₀₁₂₃₄₅₆₇₈₉ₙ';
const SUPS = '⁰¹²³⁴⁵⁶⁷⁸⁹ⁿ⁻';
// "u₃ = u₁·q²" → HTML with <sub>/<sup>, so the text font draws every character
const fmt = (s) => s
  .replace(/[₀-₉ₙ]+/g, (m) => `<sub>${[...m].map((c) => '0123456789n'[SUBS.indexOf(c)]).join('')}</sub>`)
  .replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹ⁿ⁻]+/g, (m) => `<sup>${[...m].map((c) => '0123456789n−'[SUPS.indexOf(c)]).join('')}</sup>`);
const uk = (k) => fmt(u(k));

// ---------- labels over the shop (positions in % of the canvas) ----------
const overlay = $('#overlay');
function label(cls, x, y) {
  const d = document.createElement('div');
  d.className = `lab ${cls}`;
  d.style.left = `${(x / W) * 100}%`;
  d.style.top = `${(y / H) * 100}%`;
  overlay.append(d);
  return d;
}
const L = [];
for (let k = 1; k <= ROOMS; k++) {
  L[k] = {
    count: label('st-count', stX(k), 27),
    more: label('st-more', stX(k), 41),
    formula: label('st-f', stX(k), SHELF_Y + 10),
  };
  if (k < ROOMS) {
    L[k].tag = label('ring-tag', ringX(k), RING_CY - 4); // ×q in the middle of the ring
    L[k].num = label('ring-num', ringX(k), RING_TOP + 6); // the ring's number, only in the hint step
  }
}
// ---------- drawing ----------
const ease = (p) => 1 - (1 - p) ** 3;

// Draw art at logical (x, y), k device pixels per art pixel, snapped to whole device pixels.
// src: an optional part of the image {x, y, w, h}; size: an optional [w, h] in device pixels (squash and stretch).
function blit(im, x, y, k = 1, src = null, size = null) {
  const r = src || { x: 0, y: 0, w: im.width, h: im.height };
  const [dw, dh] = size || [r.w * k, r.h * k];
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.drawImage(im, r.x, r.y, r.w, r.h, Math.round(x * S), Math.round(y * S), Math.round(dw), Math.round(dh));
  ctx.setTransform(S, 0, 0, S, 0, 0);
}

function ringMode(j) {
  const s = STEPS[step];
  if (anim && anim.k === j + 1) return 'active';
  if (s.id === 'ask' && s.k === j + 1) return 'ready';
  return j + 1 <= roomsShown(step) ? 'passed' : 'idle';
}

// Half of ring j: side −1 is the left half (behind Doraemon), +1 the right half (in front), so he walks through.
// The next ring to pass glows and swirls; the ring being walked through swirls fast and flashes white.
const SWIRL = ['#f878f8', '#fcfcfc', '#3cbcfc', '#b8f8f8'];
function drawRingHalf(j, side, t, flash) {
  const mode = ringMode(j);
  const k = ART.ring.k;
  const ring = img.ring;
  const x = ringX(j) - RING_W / 2;
  const half = Math.floor(ring.width / 2);
  const src = side < 0 ? { x: 0, y: 0, w: half, h: ring.height } : { x: half, y: 0, w: ring.width - half, h: ring.height };
  const ox = side < 0 ? 0 : (half * k) / S;
  if (side < 0) {
    ctx.fillStyle = '#06051a'; // the base it stands on
    ctx.fillRect(Math.round(ringX(j)) - 6, GROUND - 3, 13, 3);
    ctx.fillStyle = '#8c8c8c';
    ctx.fillRect(Math.round(ringX(j)) - 5, GROUND - 2, 11, 1);
    if (mode === 'ready' || mode === 'active') { // the swirl inside the hole
      const g = swirl.canvas.getContext('2d');
      const speed = mode === 'active' ? 50 : 120;
      g.globalCompositeOperation = 'source-over';
      for (let yy = 0; yy < ring.height; yy++) {
        g.fillStyle = SWIRL[Math.floor((yy + t / speed) / 2) % SWIRL.length];
        g.fillRect(0, yy, ring.width, 1);
      }
      g.globalCompositeOperation = 'destination-in';
      g.drawImage(swirl.hole, 0, 0);
      blit(swirl.canvas, x, RING_TOP, k);
    }
  }
  if (mode === 'ready' && Math.floor(t / 380) % 2 === 0) { // blinking glow around the next ring
    for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) blit(img.ringGlow, x + ox + (dx * k) / S, RING_TOP + (dy * k) / S, k, src);
  }
  blit(flash ? img.ringFlash : ring, x + ox, RING_TOP, k, src);
}

// where Doraemon is and how he moves at time t: x, lift (px off the ground), squash (+ wide, − tall)
function heroPose(t) {
  if (!anim) {
    const k = roomsShown(step);
    return { x: stX(k), lift: 0, squash: Math.floor(t / 520) % 2 ? 0.03 : 0 }; // breathing while he waits
  }
  const e = t - anim.t0;
  const from = stX(anim.k - 1);
  const mid = ringX(anim.k - 1);
  const to = stX(anim.k);
  let x = to;
  if (e < T.ring) x = from + (mid - from) * (e / T.ring);
  else if (e < T.arrive) x = mid + (to - mid) * ((e - T.ring) / (T.arrive - T.ring));
  if (e < T.arrive) { // walking: a little hop on every step, squashed on landing
    const ph = e / 220;
    const lift = Math.abs(Math.sin(ph * Math.PI)) * 3;
    return { x, lift, squash: lift < 0.8 ? 0.07 : -0.04 };
  }
  if (e > T.hop && e < T.end - 50) { // a happy jump on arrival
    const p = (e - T.hop) / (T.end - 50 - T.hop);
    const lift = Math.sin(p * Math.PI) * 10;
    return { x, lift, squash: lift < 1.5 ? 0.08 : -0.05 };
  }
  return { x, lift: 0, squash: 0 };
}

function carried() { // cakes in the backpack right now
  if (!anim) return cakes(u1, q, Math.max(1, roomsShown(step)));
  return cakes(u1, q, anim.crossed ? anim.k : anim.k - 1);
}

// Doraemon with his backpack: cakes peeking out of the open bag (behind it), the bag on his back (behind him),
// then Doraemon, then the two straps over his shoulders. Offsets are measured on the full-size sheet (40×54
// logical), scaled to the drawn size, and follow the squash, so the straps stay on his body while he bounces.
function drawHero(pose) {
  const hero = img.hero;
  const dw = hero.width * ART.hero.k * (1 + pose.squash); // device pixels
  const dh = hero.height * ART.hero.k * (1 - pose.squash);
  const x0 = pose.x - dw / S / 2;
  const y0 = GROUND - pose.lift - dh / S;
  const HS = hero.width / 120; // drawn size / the sheet's size
  const sx = (v) => x0 + v * HS * (1 + pose.squash);
  const sy = (v) => y0 + v * HS * (1 - pose.squash);
  const n = carried();
  const bw = 16 + Math.min(4, Math.round(Math.log2(n))); // the bag fills out a little as the cakes multiply
  const bh = Math.round(bw * 1.3);
  // Snapped to device pixels (1/S), the same grid the sprite is drawn on, so the bag rises, lands and breathes
  // with him; rounding to whole logical pixels made it lag behind or stay put on small bounces.
  const snap = (v) => Math.round(v * S) / S;
  const bx = snap(sx(13)) - bw; // on his back: it shows on his left, he walks to the right
  const by = snap(sy(21));
  const peek = n === 1 ? [0.1] : n <= 4 ? [-0.05, 0.3] : [-0.1, 0.2, 0.45];
  peek.forEach((f, i) => blit(img.cake, bx + bw * f, by - CAKE_H + 5 - (i % 2) * 2, ART.cake.k));
  drawBackpack(ctx, bx, by, bw, bh);
  blit(hero, x0, y0, 1, null, [dw, dh]);
  ctx.fillStyle = '#9c2420'; // the straps
  for (const x of [10, 30]) ctx.fillRect(snap(sx(x)), snap(sy(32)), 1, snap(8 * HS * (1 - pose.squash)));
}

function render(t) {
  ctx.setTransform(S, 0, 0, S, 0, 0);
  ctx.drawImage(shop, 0, 0);
  if (!swirl) return; // the art is still loading

  const shown = anim ? anim.k - 1 : roomsShown(step);
  for (let k = 1; k <= ROOMS; k++) {
    drawShelf(ctx, stX(k), SHELF_Y, SHELF_W);
    if (k <= shown) {
      const n = drawPlan(cakes(u1, q, k)).drawn;
      for (let i = 0; i < n; i++) { const p = slot(k, i); blit(img.cake, p.x, p.y, ART.cake.k); }
    }
  }
  const e = anim ? t - anim.t0 : 0;
  const flash = (j) => anim && anim.k === j + 1 && e > T.ring - 60 && e < T.ring + 140;
  for (let j = 1; j < ROOMS; j++) drawRingHalf(j, -1, t, flash(j));
  drawHero(heroPose(t));
  for (let j = 1; j < ROOMS; j++) drawRingHalf(j, 1, t, flash(j));

  if (anim) {
    const k = anim.k;
    const rx = ringX(k - 1);
    if (e > T.ring && e < T.ring + 520) { // sparkles burst from the ring
      const p = (e - T.ring) / 520;
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2;
        const r = 8 + p * 28;
        const x = Math.round(rx + Math.cos(a) * r * 0.8);
        const y = Math.round(RING_CY + Math.sin(a) * r);
        ctx.fillStyle = i % 2 ? '#fcfcfc' : '#fcd800';
        ctx.fillRect(x - 1, y, 3, 1);
        ctx.fillRect(x, y - 1, 1, 3);
      }
    }
    const n = drawPlan(cakes(u1, q, k)).drawn; // the multiplied cakes fly out of the ring onto station k's shelf
    for (let i = 0; i < n; i++) {
      const p = (e - T.popFrom - i * (T.popSpan / n)) / T.flight;
      if (p < 0) continue;
      const b = slot(k, i);
      if (p >= 1) { blit(img.cake, b.x, b.y, ART.cake.k); continue; }
      const f = ease(p);
      const x0 = rx - CAKE_W / 2;
      const y0 = RING_CY - CAKE_H / 2;
      blit(img.cake, x0 + (b.x - x0) * f, y0 + (b.y - y0) * f - Math.sin(p * Math.PI) * 18, ART.cake.k);
    }
  }
}

// ---------- state → screen ----------
function updateLabels() {
  const s = STEPS[step];
  const shown = roomsShown(step);
  const formulas = formulasShown(step);
  const hint = s.id === 'general-hint' || s.id === 'general-conclusion';
  for (let k = 1; k <= ROOMS; k++) {
    const visible = k <= shown && !(anim && anim.k === k);
    const plan = drawPlan(cakes(u1, q, k));
    L[k].count.classList.toggle('unknown', !visible);
    L[k].count.innerHTML = `${uk(k)} = <span class="num">${visible ? plan.total : '?'}</span>`;
    L[k].formula.hidden = !formulas.includes(k);
    if (formulas.includes(k)) L[k].formula.innerHTML = `= ${fmt(formulaFor(k, u1, q).split(' = ')[1])}`;
    L[k].more.hidden = !(visible && plan.more > 0);
    L[k].more.textContent = `+${plan.more} bánh nữa`;
    if (k < ROOMS) {
      L[k].tag.textContent = `×${q}`;
      L[k].num.textContent = k;
      L[k].num.hidden = !hint;
    }
  }
}

// The dialog box: only the teacher's questions and, after the press, their answers; one big formula at the end
// of each station.
function say() {
  const s = STEPS[step];
  const big = (t) => `<p><span class="ans big">${fmt(t)}</span></p>`;
  let h = note ? `<p class="note">${note}</p>` : '';
  if (s.id === 'setup') {
    h += '<p>Qua mỗi vòng thần kỳ, số bánh sẽ được nhân lên <b>q</b> lần.</p>';
  } else if (s.id === 'ask' || s.id === 'open') {
    const info = questionsFor(s.k);
    const ans = (a) => (s.id === 'open' ? `<span class="ans">→ ${fmt(a)}</span>` : '');
    h += `<p class="q">${info.questions[0]}${ans(info.answerDoors)}</p>`
      + `<p class="q">${info.questions[1]}${ans(info.answerFactor)}</p>`;
  } else if (s.id === 'formula') {
    h += big(formulaFor(s.k, u1, q).split(' = ').slice(0, 2).join(' = '));
  } else if (s.id === 'general-ask' || s.id === 'general-hint') {
    h += `<p class="q">Từ ô thứ 1 sang ô thứ n, số bánh cần đi qua bao nhiêu vòng thần kỳ?${s.id === 'general-hint' ? '<span class="ans">→ n − 1 vòng</span>' : ''}</p>`
      + '<p class="q">Vậy số bánh ở ô thứ n gấp mấy lần số bánh ban đầu?</p>';
  } else if (s.id === 'general-conclusion') {
    h += big('uₙ = u₁·qⁿ⁻¹');
  }
  const box = $('#say');
  box.classList.toggle('center', s.id === 'formula' || s.id === 'general-conclusion');
  box.innerHTML = `<div class="in">${h}</div>`;
  fitSay();
}

// Long questions can wrap to two lines each; if the text is taller than the box, make it a little smaller
// (never below 1.7u) instead of cutting lines off.
function fitSay() {
  const box = $('#say');
  const inner = box.firstElementChild;
  let size = 2.3;
  box.style.fontSize = '';
  while (inner && inner.offsetHeight > box.clientHeight && size > 1.7) {
    size -= 0.1;
    box.style.fontSize = `calc(var(--u) * ${size.toFixed(1)})`;
  }
}
addEventListener('resize', fitSay);

function renderOpts() {
  document.querySelectorAll('.opts').forEach((box) => {
    const name = box.dataset.param;
    const cur = name === 'u1' ? u1 : q;
    box.innerHTML = '';
    for (const v of CHOICES) {
      const b = document.createElement('button');
      b.className = `opt${v === cur ? ' on' : ''}`;
      b.textContent = v;
      b.disabled = !!anim;
      b.addEventListener('click', () => setParam(name, v));
      box.append(b);
    }
  });
}

function updateUI() {
  const lbl = nextLabel(step);
  const nb = $('#bNext');
  nb.hidden = !lbl;
  nb.textContent = lbl || '';
  nb.classList.toggle('long', (lbl || '').length > 10); // keeps "Khái quát đến ô thứ n" on one line
  nb.disabled = !!anim;
  $('#bGeneral').hidden = !(step >= CAN_GENERALIZE_AT && step < GENERAL_FROM - 1); // on the last step the main button says it
  $('#bGeneral').disabled = !!anim;
  $('#bReset').disabled = !!anim;
  renderOpts();
  updateLabels();
  say();
}

// ---------- actions ----------
function next() {
  if (anim || step >= STEPS.length - 1) return;
  note = '';
  step++;
  const s = STEPS[step];
  if (s.id === 'open' && !reduced) anim = { k: s.k, t0: performance.now(), crossed: false };
  updateUI();
}

function generalize() {
  if (anim || !(step >= CAN_GENERALIZE_AT && step < GENERAL_FROM)) return;
  note = '';
  step = GENERAL_FROM;
  updateUI();
}

// Changing u1 or q (or "Làm lại") always starts the walk again from station 1, with nothing carried over.
function restart(msg = '') {
  anim = null;
  step = 0;
  note = msg;
  updateUI();
}
function setParam(name, v) {
  if (anim) return;
  const before = name === 'u1' ? u1 : q;
  if (name === 'u1') u1 = v; else q = v;
  if (step > 0 && before !== v) restart(`Đã đổi ${name === 'u1' ? 'u<sub>1</sub>' : 'q'} = ${v}: bắt đầu lại từ ô thứ 1.`);
  else updateUI();
}

function toggleFull() {
  if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
  else $('#stage').requestFullscreen?.().catch(() => {});
}

$('#bNext').addEventListener('click', next);
$('#bGeneral').addEventListener('click', generalize);
$('#bReset').addEventListener('click', () => restart());
$('#bFull').addEventListener('click', toggleFull);
document.addEventListener('keydown', (e) => {
  if (e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
  if (e.key === 'ArrowRight') { e.preventDefault(); next(); }
  if (e.key === 'r' || e.key === 'R') restart();
  if (e.key === 'f' || e.key === 'F') toggleFull();
});
// Touching the blinking ring also walks through it (for a student at the board).
canvas.addEventListener('click', (e) => {
  const s = STEPS[step];
  if (s.id !== 'ask') return;
  const r = canvas.getBoundingClientRect();
  const x = ((e.clientX - r.left) / r.width) * W;
  const y = ((e.clientY - r.top) / r.height) * H;
  if (Math.abs(x - ringX(s.k - 1)) <= RING_W / 2 + 3 && Math.abs(y - RING_CY) <= RING_H / 2 + 3) next();
});

// ---------- loop ----------
let last = 0;
function loop(t) {
  requestAnimationFrame(loop);
  if (t - last < 33) return; // ~30 fps is enough for pixel art
  last = t;
  if (anim) {
    const e = t - anim.t0;
    if (!anim.crossed && e >= T.ring) { // through the ring: the sack now holds q times as many cakes
      anim.crossed = true;
      const tag = L[anim.k - 1].tag;
      tag.classList.remove('boom');
      void tag.offsetWidth;
      tag.classList.add('boom');
    }
    if (e >= T.end) {
      const k = anim.k;
      anim = null;
      updateUI();
      L[k].count.classList.add('fresh');
      setTimeout(() => L[k].count.classList.remove('fresh'), 400);
    }
  }
  render(t);
}

const load = (src) => new Promise((ok, fail) => { const im = new Image(); im.onload = () => ok(im); im.onerror = () => fail(new Error(`cannot load ${src}`)); im.src = src; });
Promise.all(Object.entries(ART).map(([name, a]) => load(a.file).then((im) => {
  if (im.width !== a.w || im.height !== a.h) console.error(`${a.file} is ${im.width}×${im.height}, expected ${a.w}×${a.h}: rebuild with tool/art/build.sh`);
  img[name] = im;
}))).then(() => {
  img.ringGlow = silhouette(img.ring, '#fffbe6');
  img.ringFlash = silhouette(img.ring, '#ffffff');
  const c = document.createElement('canvas');
  c.width = img.ring.width;
  c.height = img.ring.height;
  swirl = { hole: holeMask(img.ring), canvas: c };
}).catch((err) => { console.error(err.message); });
updateUI();
window.__game = { // for the test scripts
  get step() { return STEPS[step].id; },
  get k() { return STEPS[step].k; },
  get anim() { return !!anim; },
  get ready() { return !!swirl; },
};
requestAnimationFrame(loop);
