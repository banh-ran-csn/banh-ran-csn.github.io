// Plays the whole activity in headless Chrome and checks the teacher's required cases, at projector sizes.
// Needs `npm start` (port 8792). Usage: CHROME=… node tool/e2e.mjs [outDir]
import { mkdirSync } from 'node:fs';
import assert from 'node:assert/strict';
import { launch, sleep } from './cdp.mjs';

const OUT = process.argv[2] || '/tmp/ccnb_shots';
const BASE = process.env.BASE || 'http://127.0.0.1:8792';
mkdirSync(OUT, { recursive: true });
const browser = launch(9281);
const { errors } = browser;

const squash = (s) => s.replace(/\s+/g, ' ').trim();
const counts = (p) => p.eval(`[...document.querySelectorAll('.st-count .num')].map((e) => e.textContent)`);
const formulaOf = (k) => `(() => { const e = document.querySelectorAll('.st-f')[${k - 1}]; return e.hidden ? '' : e.textContent; })()`;
const shownFormulas = (p) => p.eval(`[...document.querySelectorAll('.st-f')].filter((e) => !e.hidden).map((e) => e.textContent)`);
const say = (p) => p.eval(`document.querySelector('#say').innerText`).then(squash);
const state = (p) => p.eval('JSON.stringify({ s: window.__game.step, k: window.__game.k, a: window.__game.anim })').then(JSON.parse);
const press = (p) => p.click('#bNext');
const noScroll = (p) => p.eval(`document.documentElement.scrollHeight <= innerHeight && document.documentElement.scrollWidth <= innerWidth`);
async function untilStep(p, id, k) {
  await p.until(`window.__game.step === ${JSON.stringify(id)} ${k ? `&& window.__game.k === ${k}` : ''} && !window.__game.anim`, `${id}${k ? ' ' + k : ''}`, 8000);
  // the dialog text must fit its box at every step (long questions wrap; nothing may be cut off)
  const fit = await p.eval(`(() => { const b = document.querySelector('#say'); const i = b.firstElementChild; return { inner: i ? i.offsetHeight : 0, box: b.clientHeight }; })()`);
  assert.ok(fit.inner <= fit.box, `${id}${k ? ' ' + k : ''}: dialog text ${fit.inner}px tall in a ${fit.box}px box`);
}
// centred in the white space of the dialog that is left of the button column
const formulaCentred = (p) => p.eval(`(() => { const d = document.querySelector('#dialog').getBoundingClientRect(); const c = document.querySelector('#dialog .controls').getBoundingClientRect(); const f = document.querySelector('#say .ans.big').getBoundingClientRect(); return Math.abs((f.left + f.right) / 2 - (d.left + c.left) / 2) < d.width * 0.015; })()`);
async function opt(p, name, v) { await p.eval(`[...document.querySelectorAll('.opts[data-param="${name}"] .opt')].find((b) => b.textContent === '${v}').click(); true`); }
async function toStation(p, k) { // from the start: walk through the rings up to station k (ask → open → formula each)
  await press(p); // Bắt đầu
  for (let r = 2; r <= k; r++) {
    await untilStep(p, 'ask', r);
    await press(p);
    await untilStep(p, 'open', r);
    await press(p);
    await untilStep(p, 'formula', r);
    if (r < k) await press(p);
  }
}

try {
  const p = await browser.page('gv', `${BASE}/`, 1366, 768);
  await p.until('window.__game && window.__game.ready', 'load (art ready)');
  await sleep(600);
  assert.equal(await noScroll(p), true, 'no scrolling at 1366×768');
  assert.equal((await state(p)).s, 'setup', 'one screen: the street is there from the start');
  assert.deepEqual(await counts(p), ['1', '?', '?', '?', '?'], 'start: only station 1 has cakes (u1 = 1)');
  await p.shot(`${OUT}/01_bat_dau.png`);

  // Case 1 and case 7: u1 = 1, q = 2; every result only after its own press.
  await press(p);
  await untilStep(p, 'ask', 2);
  assert.match(await say(p), /Từ ô 1 sang ô 2, số bánh đi qua bao nhiêu vòng thần kỳ\?/);
  assert.equal(/→/.test(await say(p)), false, 'no expected answer before the press');
  assert.deepEqual(await counts(p), ['1', '?', '?', '?', '?']);
  await p.shot(`${OUT}/02_hoi_tram_2.png`);
  await press(p);
  await sleep(1150);
  assert.equal((await state(p)).a, true, 'Doraemon is walking through the ring');
  await p.shot(`${OUT}/03_qua_vong.png`);
  await p.eval(`document.querySelector('#bNext').click(); document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' })); true`);
  await untilStep(p, 'open', 2);
  assert.equal((await state(p)).s, 'open', 'presses during the walk do not skip a step');
  assert.deepEqual(await counts(p), ['1', '2', '?', '?', '?']);
  assert.match(await say(p), /→ 1 vòng[\s\S]*→ q lần/);
  assert.deepEqual(await shownFormulas(p), [], 'formula still hidden after walking through');
  await press(p);
  await untilStep(p, 'formula', 2);
  assert.deepEqual(await shownFormulas(p), ['= u1·q'], 'under station 2: = u1·q');
  assert.equal(await say(p), 'u2 = u1·q', 'the dialog shows only the formula');
  assert.equal(await formulaCentred(p), true, 'the formula sits in the middle of the white space left of the buttons');
  await p.shot(`${OUT}/04_cong_thuc_tram_2.png`);
  await press(p);
  for (const r of [3, 4]) {
    await untilStep(p, 'ask', r);
    if (r === 3) { // a student at the board can touch the blinking ring itself
      const at = await p.eval(`(() => { const c = document.querySelector('#scene').getBoundingClientRect(); return { x: c.left + c.width * (154 / 384), y: c.top + c.height * (120 / 216) }; })()`);
      await p.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: at.x, y: at.y, button: 'left', clickCount: 1 });
      await p.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: at.x, y: at.y, button: 'left', clickCount: 1 });
    } else await press(p);
    await untilStep(p, 'open', r);
    await press(p);
    await untilStep(p, 'formula', r);
    if (r === 3) await press(p);
  }
  assert.deepEqual(await counts(p), ['1', '2', '4', '8', '?']);
  assert.equal(await p.eval(`!document.querySelector('#bGeneral').hidden`), true, '"Khái quát đến ô n" after station 4');
  await press(p);
  await untilStep(p, 'ask', 5);
  await press(p);
  await untilStep(p, 'open', 5);
  assert.deepEqual(await counts(p), ['1', '2', '4', '8', '16']);
  assert.equal(await p.eval(`[...document.querySelectorAll('.st-more')].filter((e) => !e.hidden).map((e) => e.textContent).join('|')`), '+4 bánh nữa', 'station 5: 12 drawn + 4 named');
  await press(p);
  await untilStep(p, 'formula', 5);
  assert.equal((await shownFormulas(p)).length, 4);
  await p.shot(`${OUT}/05_den_tram_5.png`);

  // Generalisation: n−1 rings only after "Hiện gợi ý", the formula only after "Kết luận".
  await press(p);
  await untilStep(p, 'general-ask');
  const ringNums = () => p.eval(`[...document.querySelectorAll('.ring-num')].filter((e) => !e.hidden).length`);
  assert.equal(await ringNums(), 0);
  assert.equal(/n − 1 vòng/.test(await say(p)), false);
  await p.shot(`${OUT}/06_khai_quat.png`);
  await press(p);
  await untilStep(p, 'general-hint');
  assert.equal(await ringNums(), 4, 'the rings are numbered 1..4');
  assert.match(await say(p), /→ n − 1 vòng/);
  assert.equal(/un = u1/.test(await say(p)), false);
  await press(p);
  await untilStep(p, 'general-conclusion');
  assert.match(await say(p), /un = u1·qn−1/);
  await p.shot(`${OUT}/07_ket_luan.png`);
  await press(p);
  await untilStep(p, 'summary');
  assert.match(await say(p), /un = u1·qn−1 Từ ô 1 đến ô n có n − 1 vòng; mỗi vòng nhân số bánh với q\. Đây là mô hình trực quan với q nguyên dương\./);
  assert.deepEqual(await shownFormulas(p), ['= u1·q', '= u1·q2', '= u1·q3', '= u1·q4'], 'the stations keep the pattern for the summary');
  assert.equal(await p.eval(`document.querySelector('#bNext').hidden`), true, 'nothing after the summary');
  await p.shot(`${OUT}/08_chot_kien_thuc.png`);

  // Case 3 + more than 12 cakes: u1 = 2, q = 3.
  await p.eval(`document.dispatchEvent(new KeyboardEvent('keydown', { key: 'r' })); true`);
  await untilStep(p, 'setup');
  await opt(p, 'u1', 2);
  await opt(p, 'q', 3);
  assert.equal((await state(p)).s, 'setup');
  await toStation(p, 5);
  assert.deepEqual(await counts(p), ['2', '6', '18', '54', '162']);
  assert.equal(await p.eval(`[...document.querySelectorAll('.st-more')].filter((e) => !e.hidden).map((e) => e.textContent).join('|')`), '+6 bánh nữa|+42 bánh nữa|+150 bánh nữa');
  assert.equal(await p.eval(formulaOf(5)), '= u1·q4');
  await p.shot(`${OUT}/09_u1_2_q_3.png`);

  // Case 6: changing q in the middle starts again from station 1, nothing carried over.
  await opt(p, 'q', 1);
  await untilStep(p, 'setup');
  assert.deepEqual(await counts(p), ['2', '?', '?', '?', '?']);
  assert.deepEqual(await shownFormulas(p), []);
  assert.match(await say(p), /Đã đổi q = 1: bắt đầu lại từ ô 1/);

  // Case 4: u1 = 3, q = 1: every station keeps the same count, shown as "giữ nguyên".
  await opt(p, 'u1', 3);
  await toStation(p, 5);
  assert.deepEqual(await counts(p), ['3', '3', '3', '3', '3']);
  assert.deepEqual(await p.eval(`[...document.querySelectorAll('.ring-tag')].map((e) => e.textContent)`), ['×1', '×1', '×1', '×1'], 'q = 1: every ring says ×1');
  await p.shot(`${OUT}/10_q_1.png`);

  // Fits a 1920×1080 projector too.
  await p.viewport(1920, 1080);
  await sleep(400);
  assert.equal(await noScroll(p), true, 'no scrolling at 1920×1080');
  await p.shot(`${OUT}/11_1920.png`);
  console.log('E2E OK · 1,2,4,8,16 · 2,6,18,54,162 · 3,3,3,3,3 · reset on change · no early answers');
} catch (e) {
  console.log('E2E FAIL:', e.message);
  process.exitCode = 1;
} finally {
  if (errors.length) { console.log('Page errors:\n' + errors.join('\n')); process.exitCode = 1; }
  browser.close();
}
