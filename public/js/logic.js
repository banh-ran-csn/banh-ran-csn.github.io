// Doraemon và vòng thần kỳ nhân bản bánh rán: the maths and the step flow, with no DOM (tested in Node).
// Stations 1..5 along a street, a magic ring between each two; each ring multiplies the cakes by q.
// u_k = u1 · q^(k−1).

export const ROOMS = 5;
export const MAX_DRAWN = 12; // above this, draw 12 cakes and a label for the rest
export const CHOICES = [1, 2, 3]; // both u1 and q: whole numbers, so the cakes can be counted

export function cakes(u1, q, k) {
  if (!Number.isInteger(u1) || !Number.isInteger(q) || !Number.isInteger(k) || k < 1) throw new Error('bad input');
  return u1 * q ** (k - 1);
}

export const doors = (k) => k - 1; // rings walked through from station 1 to station k

// How a count is shown: up to 12 cakes drawn one by one; more than that → 12 drawn + "… + X bánh nữa".
export function drawPlan(total) {
  const drawn = Math.min(total, MAX_DRAWN);
  return { drawn, more: total - drawn, total };
}

// The teacher's questions for the ring into station k (2..5): the teacher's wording, with "phòng" (room) now
// "ô" (a cell of the row, where the cakes are) and "cánh cửa" (door) now "vòng thần kỳ" (magic ring).
export function questionsFor(k) {
  const n = doors(k);
  const fixed = {
    2: 'Từ ô thứ 1 sang ô thứ 2, số bánh đi qua bao nhiêu vòng thần kỳ?',
    3: 'Từ ô thứ 1 sang ô thứ 3, số bánh đã đi qua bao nhiêu vòng thần kỳ?',
    4: 'Từ ô thứ 1 sang ô thứ 4, số bánh đã đi qua bao nhiêu vòng thần kỳ?',
    5: 'Từ ô thứ 1 sang ô thứ 5, số bánh đã đi qua bao nhiêu vòng thần kỳ?',
  };
  return {
    questions: [fixed[k], `Vậy số bánh ở ô thứ ${k} gấp mấy lần số bánh ban đầu?`],
    doors: n,
    answerDoors: `${n} vòng`,
    answerFactor: `q${sup(n)} lần`, // q¹ lần, q² lần…: the exponent is the number of rings
  };
}

const SUP = { 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹' };
export const sup = (n) => String(n).split('').map((d) => SUP[d]).join('');
const SUB = { 0: '₀', 1: '₁', 2: '₂', 3: '₃', 4: '₄', 5: '₅', 6: '₆', 7: '₇', 8: '₈', 9: '₉', n: 'ₙ' };
export const u = (k) => `u${String(k).split('').map((c) => SUB[c]).join('')}`;

// Formula of station k, e.g. "u₃ = u₁·q² = 1·2² = 4".
export function formulaFor(k, u1, q) {
  const n = doors(k);
  if (n === 0) return `${u(1)} = ${u1}`;
  const general = n === 1 ? `${u(1)}·q` : `${u(1)}·q${sup(n)}`;
  const numbers = n === 1 ? `${u1}·${q}` : `${u1}·${q}${sup(n)}`;
  return `${u(k)} = ${general} = ${numbers} = ${cakes(u1, q, k)}`;
}

// The flow, all on one screen. Each step is one press of ▶ (or →); nothing moves on by itself.
//   setup → for each station 2..5: ask → open (Doraemon walks through the ring) → formula
//   → general: ask → hint (n−1 rings) → conclusion (the last screen).
// After station 4's formula the teacher may jump to the general step (station 5 is optional).
export function buildSteps() {
  const steps = [{ id: 'setup' }];
  for (let k = 2; k <= ROOMS; k++) steps.push({ id: 'ask', k }, { id: 'open', k }, { id: 'formula', k });
  steps.push({ id: 'general-ask' }, { id: 'general-hint' }, { id: 'general-conclusion' });
  return steps;
}

export const STEPS = buildSteps();
export const GENERAL_FROM = STEPS.findIndex((s) => s.id === 'general-ask');
// the step from which "Khái quát đến ô thứ n" may be pressed: station 4's formula
export const CAN_GENERALIZE_AT = STEPS.findIndex((s) => s.id === 'formula' && s.k === 4);

// Highest station whose count is visible at step i (station 1 from the start).
export function roomsShown(i) {
  let shown = 0;
  for (let j = 0; j <= i; j++) {
    const s = STEPS[j];
    if (s.id === 'setup') shown = 1;
    if (s.id === 'open') shown = s.k;
  }
  return shown;
}

// Stations whose formula is visible at step i.
export function formulasShown(i) {
  const out = [];
  for (let j = 0; j <= i; j++) if (STEPS[j].id === 'formula') out.push(STEPS[j].k);
  return out;
}

// Label of the main button for the step that pressing it leads to.
export function nextLabel(i) {
  const next = STEPS[i + 1];
  if (!next) return null;
  return {
    ask: i === 0 ? 'Bắt đầu' : 'Đi',
    open: 'Đi',
    formula: 'Hiện công thức',
    'general-ask': 'Khái quát đến ô thứ n',
    'general-hint': 'Hiện gợi ý',
    'general-conclusion': 'Kết luận',
  }[next.id];
}
