// The teacher's required self-checks (cases 1–7 of the activity brief) and the "no answer before a press" flow.
import test from 'node:test';
import assert from 'node:assert/strict';
import { cakes, doors, drawPlan, formulaFor, questionsFor, STEPS, roomsShown, formulasShown, nextLabel, CAN_GENERALIZE_AT, GENERAL_FROM, u } from '../public/js/logic.js';

const row = (u1, q) => [1, 2, 3, 4, 5].map((k) => cakes(u1, q, k));

test('case 1–4: the five rooms hold u1·q^(k−1) cakes, exactly', () => {
  assert.deepEqual(row(1, 2), [1, 2, 4, 8, 16]);
  assert.deepEqual(row(1, 3), [1, 3, 9, 27, 81]);
  assert.deepEqual(row(2, 3), [2, 6, 18, 54, 162]);
  assert.deepEqual(row(3, 1), [3, 3, 3, 3, 3]);
});

test('case 5: from room 1 to room 1 there are 0 doors and u1 = u1·q⁰', () => {
  assert.equal(doors(1), 0);
  for (const q of [1, 2, 3]) assert.equal(cakes(2, q, 1), 2);
  assert.equal(formulaFor(1, 2, 3), 'u₁ = 2');
});

test('room k is reached through k−1 doors, and the formulas use that exponent', () => {
  assert.deepEqual([2, 3, 4, 5].map(doors), [1, 2, 3, 4]);
  assert.equal(formulaFor(2, 1, 2), 'u₂ = u₁·q¹ = 1·2¹ = 2');
  assert.equal(formulaFor(3, 1, 2), 'u₃ = u₁·q² = 1·2² = 4');
  assert.equal(formulaFor(4, 2, 3), 'u₄ = u₁·q³ = 2·3³ = 54');
  assert.equal(u('n'), 'uₙ');
});

test('more than 12 cakes: 12 drawn and the rest named, so nobody reads 12 as the total', () => {
  assert.deepEqual(drawPlan(8), { drawn: 8, more: 0, total: 8 });
  assert.deepEqual(drawPlan(162), { drawn: 12, more: 150, total: 162 });
});

test('the teacher questions keep their meaning (rooms → cells "ô", doors → rings), with the expected answers', () => {
  assert.deepEqual(questionsFor(2).questions, ['Từ ô thứ 1 sang ô thứ 2, số bánh đi qua bao nhiêu vòng thần kỳ?', 'Vậy số bánh ở ô thứ 2 gấp mấy lần số bánh ban đầu?']);
  assert.equal(questionsFor(2).answerFactor, 'q¹ lần');
  assert.equal(questionsFor(3).answerFactor, 'q² lần');
  assert.equal(questionsFor(5).questions[1], 'Vậy số bánh ở ô thứ 5 gấp mấy lần số bánh ban đầu?');
  assert.equal(questionsFor(4).answerDoors, '3 vòng');
});

test('case 7: every count and formula appears only after its own press; nothing runs ahead', () => {
  assert.equal(STEPS[0].id, 'setup', 'one screen: the game starts on the street, no intro card');
  const askRoom3 = STEPS.findIndex((s) => s.id === 'ask' && s.k === 3);
  assert.equal(roomsShown(askRoom3), 2, 'asking about room 3: room 3 still closed');
  assert.equal(roomsShown(askRoom3 + 1), 3, 'after "mở cửa": room 3 count visible');
  assert.deepEqual(formulasShown(askRoom3 + 1), [2], 'room 3 formula still hidden');
  assert.deepEqual(formulasShown(askRoom3 + 2), [2, 3]);
  assert.equal(nextLabel(askRoom3), 'Đi');
  assert.equal(nextLabel(askRoom3 + 1), 'Hiện công thức');
});

test('the general step comes after room 4 (room 5 optional) and ends on the conclusion', () => {
  assert.deepEqual(STEPS[CAN_GENERALIZE_AT], { id: 'formula', k: 4 });
  assert.equal(STEPS[GENERAL_FROM].id, 'general-ask');
  assert.deepEqual(STEPS.slice(-3).map((s) => s.id), ['general-ask', 'general-hint', 'general-conclusion']);
  assert.equal(nextLabel(STEPS.length - 2), 'Kết luận');
  assert.equal(nextLabel(STEPS.length - 1), null);
});
