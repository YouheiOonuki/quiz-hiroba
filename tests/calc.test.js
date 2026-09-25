// 出題エンジン（calc.js）のテスト: node --test tests/*.test.js
// （.github/workflows/test.yml で push・PR のたびに自動実行される）
const test = require('node:test');
const assert = require('node:assert/strict');
const C = require('../calc.js');
const genso = require('../topics/genso.js');
const nengo = require('../topics/nengo.js');
const TOPICS = [genso, nengo];

// --- 入力の答え合わせ（guide.html「入力で答えるときの決まり」） ---
const sym = C.kindOf(genso, 'sym');
const name = C.kindOf(genso, 'name');
const year = C.kindOf(nengo, 'year');
const Na = C.itemById(genso, '11');
const H = C.itemById(genso, '1');
const I = C.itemById(genso, '53');
const Co = C.itemById(genso, '27');

test('入力: 元素記号は大文字・小文字を区別し、大小だけ違えば「おしい」', () => {
  assert.equal(C.checkTyped(sym, Na, 'Na').ok, true);
  assert.equal(C.checkTyped(sym, Na, 'Ｎａ').ok, true, '全角');
  assert.equal(C.checkTyped(sym, Na, ' Na ').ok, true, '空白');
  assert.deepEqual(C.checkTyped(sym, Na, 'NA'), { ok: false, near: 'case' });
  assert.deepEqual(C.checkTyped(sym, Co, 'CO'), { ok: false, near: 'case' });
  assert.deepEqual(C.checkTyped(sym, Na, 'Ne'), { ok: false });
  assert.deepEqual(C.checkTyped(sym, Na, ''), { ok: false, empty: true });
});

test('入力: 名前はカタカナ・ひらがな・全角半角の違いを許し、漢字は登録した表記とよみだけ', () => {
  for (const v of ['ナトリウム', 'なとりうむ', 'ﾅﾄﾘｳﾑ', 'ナトリ ウム']) assert.equal(C.checkTyped(name, Na, v).ok, true, v);
  for (const v of ['水素', 'すいそ', 'スイソ']) assert.equal(C.checkTyped(name, H, v).ok, true, v);
  for (const v of ['ヨウ素', 'よう素', 'ようそ', 'ヨウソ']) assert.equal(C.checkTyped(name, I, v).ok, true, v);
  for (const v of ['沃素', 'ナトリウ', 'ソジウム', 'sodium']) assert.equal(C.checkTyped(name, v === '沃素' ? I : Na, v).ok, false, v);
});

test('入力: 年は数字だけを見る', () => {
  const it = C.itemById(nengo, '1221');
  for (const v of ['1221', '１２２１', '1221年', ' 1221 ']) assert.equal(C.checkTyped(year, it, v).ok, true, v);
  for (const v of ['1222', '12210', '承久3', '千二百二十一']) assert.equal(C.checkTyped(year, it, v).ok, false, v);
});

// --- 出題 ---
test('makeRound: 同じ種なら同じ問題と選択肢、違う種なら違う並び', () => {
  const opt = { kind: 'sym', mode: 'choice', filters: { range: '36' }, count: 10, seed: 12345 };
  assert.deepEqual(C.makeRound(genso, opt), C.makeRound(genso, opt));
  assert.notDeepEqual(C.makeRound(genso, opt).map((q) => q.id), C.makeRound(genso, Object.assign({}, opt, { seed: 54321 })).map((q) => q.id));
});

test('makeRound: 範囲の中から重ならずに出し、4 択は正解を含む別々の 4 つ', () => {
  for (const topic of TOPICS) {
    for (const kind of topic.kinds) {
      for (const flt of topic.filters) {
        for (const o of flt.options) {
          const filters = {}; filters[flt.key] = o.v;
          const pool = C.pool(topic, filters);
          for (let seed = 1; seed <= 20; seed++) {
            const qs = C.makeRound(topic, { kind: kind.key, mode: 'choice', filters, count: 20, seed });
            assert.equal(qs.length, Math.min(20, pool.length));
            assert.equal(new Set(qs.map((q) => q.id)).size, qs.length, '重ならない');
            for (const q of qs) {
              const it = C.itemById(topic, q.id);
              assert.ok(pool.includes(it), '範囲の中から');
              assert.equal(q.choices.length, 4);
              assert.equal(new Set(q.choices).size, 4, '選択肢が別々');
              assert.ok(q.choices.includes(kind.choice(it)), '正解を含む');
            }
          }
        }
      }
    }
  }
});

test('makeRound: 4 択の選択肢は範囲の中から選ぶ（1〜20番なら 20 番までの記号だけ）', () => {
  const in20 = new Set(C.pool(genso, { range: '20' }).map((it) => it.sym));
  for (let seed = 1; seed <= 30; seed++) {
    for (const q of C.makeRound(genso, { kind: 'sym', mode: 'choice', filters: { range: '20' }, count: 0, seed })) {
      for (const c of q.choices) assert.ok(in20.has(c), c);
    }
  }
});

test('makeRound: 入力のときは選択肢を作らない。4択だけの向きは入力にしない', () => {
  const qs = C.makeRound(genso, { kind: 'name', mode: 'typing', filters: {}, count: 5, seed: 3 });
  assert.equal(qs.length, 5);
  assert.ok(qs.every((q) => !q.choices));
  const ev = C.makeRound(nengo, { kind: 'event', mode: 'typing', filters: {}, count: 5, seed: 3 });
  assert.ok(ev.every((q) => q.choices && q.choices.length === 4));
});

test('makeRound: 問題数 0 はすべて、にがてだけ（only）は範囲との重なりだけ', () => {
  assert.equal(C.makeRound(genso, { kind: 'sym', mode: 'typing', filters: { range: 'all' }, count: 0, seed: 1 }).length, 118);
  const only = ['1', '2', '100'];
  const qs = C.makeRound(genso, { kind: 'sym', mode: 'choice', filters: { range: '20' }, count: 10, seed: 1, only });
  assert.deepEqual(qs.map((q) => q.id).sort(), ['1', '2']);
});

test('normalizeFilters: 知らない値は既定に', () => {
  assert.deepEqual(C.normalizeFilters(genso, { range: '999' }), { range: '20' });
  assert.deepEqual(C.normalizeFilters(nengo, { per: 'kinsei', lv: 'x' }), { lv: 'kihon', per: 'kinsei' });
});

// --- 共有リンク ---
test('共有リンク: 往復すると同じ問題になり、送った人の正解数も届く', () => {
  const opt = { kind: 'year', mode: 'typing', filters: { lv: 'all', per: 'kindai' }, count: 10, seed: 777 };
  const hash = C.challengeToLink(nengo, opt, 7);
  assert.match(hash, /^#s=[A-Za-z0-9_-]+$/);
  const back = C.fromShareHash(hash, nengo);
  assert.deepEqual(back, { kind: 'year', mode: 'typing', filters: { lv: 'all', per: 'kindai' }, count: 10, seed: 777, score: 7 });
  assert.deepEqual(C.makeRound(nengo, back), C.makeRound(nengo, opt));
});

test('共有リンク: ほかの題材・壊れたもの・範囲外の種は受け取らない', () => {
  const g = C.challengeToLink(genso, { kind: 'sym', mode: 'choice', filters: {}, count: 10, seed: 5 });
  assert.equal(C.fromShareHash(g, nengo), null);
  for (const h of ['', '#s=', '#s=@@@', '#s=' + Buffer.from('{"t":"genso","s":0}').toString('base64url'), '#x=abc', '#s=' + Buffer.from('null').toString('base64url')]) {
    assert.equal(C.fromShareHash(h, genso), null, h);
  }
  // 知らない向き・答え方は既定にそろえる
  const odd = '#s=' + Buffer.from(JSON.stringify({ t: 'nengo', k: 'zzz', m: 'typing', f: { per: 'x' }, n: 5, s: 9 })).toString('base64url');
  assert.deepEqual(C.fromShareHash(odd, nengo), { kind: 'year', mode: 'typing', filters: { lv: 'kihon', per: 'all' }, count: 5, seed: 9 });
  const ev = '#s=' + Buffer.from(JSON.stringify({ t: 'nengo', k: 'event', m: 'typing', n: 5, s: 9 })).toString('base64url');
  assert.equal(C.fromShareHash(ev, nengo).mode, 'choice', '年→出来事は 4 択だけ');
});

// --- 記録 ---
test('記録: 正解・不正解を数え、最後にまちがえたものが「にがて」', () => {
  let r = {};
  r = C.recordAnswer(r, 'genso', '1', false);
  r = C.recordAnswer(r, 'genso', '2', false);
  r = C.recordAnswer(r, 'genso', '2', true);
  assert.deepEqual(r.genso.items['1'], { ok: 0, ng: 1, last: 0 });
  assert.deepEqual(r.genso.items['2'], { ok: 1, ng: 1, last: 1 });
  assert.deepEqual(C.weakIds(r, genso), ['1']);
});

test('記録: 自己ベストは正解数、同じなら時間で比べる', () => {
  const key = C.bestKey(genso, { kind: 'sym', mode: 'choice', filters: { range: '20' }, count: 10 });
  assert.equal(key, 'sym|choice|range=20|10');
  let x = C.recordBest({}, 'genso', key, 7, 10, 60000, '2026-09-25');
  assert.equal(x.isBest, true);
  x = C.recordBest(x.records, 'genso', key, 6, 10, 10000, '2026-09-25');
  assert.equal(x.isBest, false);
  x = C.recordBest(x.records, 'genso', key, 7, 10, 50000, '2026-09-26');
  assert.equal(x.isBest, true);
  assert.deepEqual(x.records.genso.best[key], { c: 7, n: 10, ms: 50000, at: '2026-09-26' });
});

test('normalizeRecords: 知らない題材・問題・おかしな数は落とす', () => {
  const raw = {
    genso: { items: { '1': { ok: 2, ng: '3', last: 1 }, '999': { ok: 1 }, '2': { ok: -5, ng: 'x', last: 0 } }, best: { 'sym|choice|range=20|10': { c: 12, n: 10, ms: 1000, at: '2026-09-25T00' }, bad: { c: 1, n: 0 } } },
    other: { items: { '1': { ok: 1 } } },
  };
  assert.deepEqual(C.normalizeRecords(raw, TOPICS), {
    genso: { items: { '1': { ok: 2, ng: 3, last: 1 }, '2': { ok: 0, ng: 0, last: 0 } }, best: { 'sym|choice|range=20|10': { c: 10, n: 10, ms: 1000, at: '2026-09-25' } } },
  });
  assert.deepEqual(C.normalizeRecords(null, TOPICS), {});
  assert.deepEqual(C.normalizeRecords([], TOPICS), {});
});

test('formatMs', () => {
  assert.equal(C.formatMs(4400), '4秒');
  assert.equal(C.formatMs(65000), '1分05秒');
});
