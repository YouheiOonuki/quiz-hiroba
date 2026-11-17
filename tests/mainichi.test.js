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
  // 使い方ページは AdSense 審査中（2026-10-04）なので広告 script を外し meta だけ。通ったら自動広告に戻す
  assert.ok(!read('mainichi/guide.html').includes('adsbygoogle.js'));
  assert.equal((read('mainichi/guide.html').match(/name="google-adsense-account"/g) || []).length, 1);
  // 子どもが使う画面に外部リンクを置かない（REVIEW C7 R7）: 答える画面の静的な HTML に http の a が無い
  assert.ok(!/<a [^>]*href="https?:/.test(html));
});

// K178: ホーム画面に置いたクイズ広場の長押しから「毎日 1 問」へ（manifest の shortcuts。yorozu-plans ROADMAP 7.70）
test('manifest の shortcuts に毎日 1 問があり、その URL のページがある', () => {
  const m = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'manifest.webmanifest'), 'utf8'));
  const s = (m.shortcuts || []).find((x) => x.url === './mainichi/');
  assert.ok(s, 'shortcuts に ./mainichi/ が無い');
  assert.equal(s.name, '毎日 1 問');
  assert.ok(fs.existsSync(path.join(__dirname, '..', 'mainichi', 'index.html')));
  for (const i of s.icons) assert.ok(fs.existsSync(path.join(__dirname, '..', i.src)), i.src);
});

// Q-311: 答えた後の画面の、直近 28 日の升目（7 列 × 4 行。右下がきょう）
test('升目: 記録 0 日・きょうがまだ → 28 升とも空、右下がきょう', () => {
  const g = M.grid(null, D('2026-11-17'));
  assert.equal(g.length, 28);
  assert.equal(M.GRID_DAYS, 28);
  assert.ok(g.every((c) => c.state === 'none'));
  assert.deepEqual(g.map((c) => c.today), Array.from({ length: 28 }, (_, i) => i === 27));
  assert.equal(g[27].date, '2026-11-17');
  assert.equal(g[0].date, '2026-10-21');
  assert.equal(g[27].label, '11 月 17 日 答えていない');
});

test('升目: 記録 1 日（きょう正解）・外れた日・答えていない日', () => {
  let log = M.record(null, '2026-11-17', true, 'a');
  assert.deepEqual(M.grid(log, D('2026-11-17')).filter((c) => c.state !== 'none').map((c) => [c.date, c.state]), [['2026-11-17', 'ok']]);
  log = M.record(log, '2026-11-15', false, 'b');
  const g = M.grid(log, D('2026-11-17'));
  assert.equal(g[25].state, 'ng');
  assert.equal(g[25].label, '11 月 15 日 不正解');
  assert.equal(g[26].state, 'none');
  assert.equal(g[27].label, '11 月 17 日 正解');
});

test('升目: 28 日ぜんぶ答えた・29 日前は入らない・月をまたぐ', () => {
  const days = {};
  for (let i = 0; i < 29; i++) days[M.ymd(M.addDays(D('2026-11-03'), -i))] = { ok: i % 2 ? 0 : 1, pick: '' };
  const g = M.grid({ days }, D('2026-11-03'));
  assert.equal(g.filter((c) => c.state !== 'none').length, 28);
  assert.equal(g[0].date, '2026-10-07');
  assert.deepEqual(g.slice(24).map((c) => c.label), ['10 月 31 日 不正解', '11 月 1 日 正解', '11 月 2 日 不正解', '11 月 3 日 正解']);
  // 年をまたぐ
  const y = M.grid(M.record(null, '2026-12-31', true, ''), D('2027-01-02'));
  assert.equal(y[25].label, '12 月 31 日 正解');
  assert.equal(y[27].date, '2027-01-02');
});

test('升目: 記録 400 日でも直近 28 日だけ。きょうがまだならきょうの升は空', () => {
  const days = {};
  for (let i = 1; i <= 400; i++) days[M.ymd(M.addDays(D('2026-11-17'), -i))] = { ok: 1, pick: '' };
  const g = M.grid({ days }, D('2026-11-17'));
  assert.equal(g.length, 28);
  assert.equal(g.filter((c) => c.state === 'ok').length, 27);
  assert.equal(g[27].state, 'none');
  assert.equal(g[27].today, true);
});

test('升目は画面に字を足さない: ● ○ 空 だけで、aria-label を 1 升ずつ持つ', () => {
  const js = fs.readFileSync(path.join(__dirname, '..', 'mainichi', 'mainichi.js'), 'utf8');
  assert.match(js, /setAttribute\('aria-label', c\.label\)/);
  assert.match(js, /c\.state === 'ok' \? '●' : c\.state === 'ng' \? '○' : ''/);
  assert.match(fs.readFileSync(path.join(__dirname, '..', 'mainichi', 'index.html'), 'utf8'), /<div id="mn-grid" class="mn-grid" hidden><\/div>/);
});
