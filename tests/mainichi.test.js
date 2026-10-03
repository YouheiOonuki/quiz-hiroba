'use strict';
// 毎日 1 問（mainichi/）のテスト: 日本時間の日付・題材の回り方・題材の中で重ならない・同じ日は同じ問題・選択肢・記録と続けた日数
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const M = require('../mainichi-calc.js');

const T = {};
for (const id of ['genso', 'nengo', 'shuto', 'kimariji']) T[id] = require('../topics/' + id + '.js');
const D = (s) => M.parseYmd(s);

test('日本時間のきょう: UTC 15:00 で日付が変わる', () => {
  assert.equal(M.ymd(M.todayJst(Date.UTC(2026, 9, 2, 14, 59))), '2026-10-02');
  assert.equal(M.ymd(M.todayJst(Date.UTC(2026, 9, 2, 15, 0))), '2026-10-03');
  assert.equal(M.ymd(M.todayJst(Date.UTC(2026, 11, 31, 15, 0))), '2027-01-01');
});

test('日の番号と日付の足し引き・読み取り', () => {
  assert.equal(M.dayNumber(D('2026-01-01')), 0);
  assert.equal(M.dayNumber(D('2026-10-03')), 275);
  assert.equal(M.dayNumber(D('2027-01-01')), 365);
  assert.equal(M.ymd(M.addDays(D('2028-02-28'), 1)), '2028-02-29');
  assert.equal(M.parseYmd('2026-02-30'), null);
  assert.equal(M.parseYmd('x'), null);
});

test('題材は 元素 → 年号 → 首都 → 百人一首 の順に 1 日ずつ', () => {
  const ids = [];
  let d = D('2026-01-01');
  for (let i = 0; i < 8; i++) { ids.push(M.questionFor(d, T).topic.id); d = M.addDays(d, 1); }
  assert.deepEqual(ids, ['genso', 'nengo', 'shuto', 'kimariji', 'genso', 'nengo', 'shuto', 'kimariji']);
  assert.equal(M.questionFor(D('2025-12-31'), T), null);
});

test('題材の中は、全部出るまで同じ問題が出ない（元素 118 日分）', () => {
  const seen = new Set();
  let d = D('2026-01-01');
  for (let i = 0; i < 118; i++) {
    const q = M.questionFor(d, T);
    assert.equal(q.topic.id, 'genso');
    assert.ok(!seen.has(q.item.id), 'repeat ' + q.item.id);
    seen.add(q.item.id);
    d = M.addDays(d, 4);
  }
  assert.equal(seen.size, 118);
});

test('同じ日は同じ問題・同じ選択肢。選択肢は 4 つで重ならず、正解を含む', () => {
  let d = D('2026-10-01');
  for (let i = 0; i < 120; i++) {
    const a = M.questionFor(d, T), b = M.questionFor(d, T);
    assert.equal(a.item.id, b.item.id);
    assert.deepEqual(a.choices, b.choices);
    assert.equal(a.choices.length, 4);
    assert.equal(new Set(a.choices).size, 4);
    assert.ok(a.choices.includes(a.answer));
    assert.ok(a.prompt.length > 0);
    d = M.addDays(d, 1);
  }
});

test('2026-10-03 の問題（見本）: 百人一首「おほけなく」の下の句', () => {
  const q = M.questionFor(D('2026-10-03'), T);
  assert.equal(q.topic.id, 'kimariji');
  assert.equal(q.answer, 'わがたつそまに すみぞめのそで');
});

test('記録: 同じ日は 1 回だけ、続けた日数・正解数、400 日まで', () => {
  let log = M.normalizeLog(null);
  log = M.record(log, '2026-10-01', true, 'a');
  log = M.record(log, '2026-10-02', false, 'b');
  log = M.record(log, '2026-10-02', true, 'c'); // 2 回目は無視
  assert.deepEqual(log.days['2026-10-02'], { ok: 0, pick: 'b' });
  assert.deepEqual(M.stats(log, D('2026-10-03')), { streak: 2, answered: 2, correct: 1 }); // きのうまで続いている
  log = M.record(log, '2026-10-03', true, 'd');
  assert.equal(M.stats(log, D('2026-10-03')).streak, 3);
  assert.equal(M.stats(log, D('2026-10-05')).streak, 0);
  const big = { days: {} };
  let d = D('2025-01-01');
  for (let i = 0; i < 450; i++) { big.days[M.ymd(d)] = { ok: 1, pick: 'x' }; d = M.addDays(d, 1); }
  big.days['bad'] = { ok: 1 };
  const n = M.normalizeLog(big);
  assert.equal(Object.keys(n.days).length, 400);
  assert.ok(!n.days['2025-01-01']);
  assert.deepEqual(M.normalizeLog({ days: { '2026-10-01': { ok: 'yes', pick: 5 } } }).days['2026-10-01'], { ok: 0, pick: '' });
});

test('ページの決まり: 答える画面は広告の script なし・消すボタン・使い方は自動広告', () => {
  const root = path.join(__dirname, '..');
  const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
  const html = read('mainichi/index.html');
  assert.ok(!html.includes('adsbygoogle.js'));
  assert.ok(html.includes('name="google-adsense-account"'));
  assert.ok(html.includes('data-reset-storage="quiz-hiroba_mainichi"'));
  assert.match(read('mainichi/mainichi.js'), /var KEY = 'quiz-hiroba_mainichi';/);
  assert.ok(read('mainichi/guide.html').includes('adsbygoogle.js'));
  // 子どもが使う画面に外部リンクを置かない（REVIEW C7 R7）: 答える画面の静的な HTML に http の a が無い
  assert.ok(!/<a [^>]*href="https?:/.test(html));
});
