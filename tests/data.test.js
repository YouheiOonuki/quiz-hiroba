// 題材のデータ（topics/*.js）と、作ったページのテスト: node --test tests/*.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const CONSTANTS = require('../constants.js');
const genso = require('../topics/genso.js');
const nengo = require('../topics/nengo.js');
const ROOT = path.join(__dirname, '..');

test('元素: 1〜118 番がそろい、記号と名前が重ならない', () => {
  assert.equal(genso.items.length, 118);
  assert.deepEqual(genso.items.map((it) => it.n), Array.from({ length: 118 }, (_, i) => i + 1));
  assert.equal(new Set(genso.items.map((it) => it.sym)).size, 118);
  assert.equal(new Set(genso.items.map((it) => it.ja)).size, 118);
  assert.equal(new Set(genso.items.map((it) => it.en)).size, 118);
  for (const it of genso.items) {
    assert.match(it.sym, /^[A-Z][a-z]?$/, it.sym);
    assert.match(it.en, /^[a-z]+$/, it.en);
  }
});

test('元素: 2016 年に決まった 4 つの名前（IUPAC 2016-11-28・日本化学会 2016-11-30）', () => {
  const pick = (n) => { const it = genso.items[n - 1]; return [it.sym, it.en, it.ja]; };
  assert.deepEqual(pick(113), ['Nh', 'nihonium', 'ニホニウム']);
  assert.deepEqual(pick(115), ['Mc', 'moscovium', 'モスコビウム']);
  assert.deepEqual(pick(117), ['Ts', 'tennessine', 'テネシン']);
  assert.deepEqual(pick(118), ['Og', 'oganesson', 'オガネソン']);
});

test('元素: 漢字を含む名前にはひらがなのよみがあり、カタカナだけの名前には無い', () => {
  for (const it of genso.items) {
    const hasKanji = /[一-鿿]/.test(it.ja);
    if (hasKanji) assert.match(it.yomi || '', /^[ぁ-ゖ]+$/, it.ja);
    else { assert.equal(it.yomi, null, it.ja); assert.match(it.ja, /^[ァ-ー]+$/, it.ja); }
  }
  assert.equal(genso.items.filter((it) => it.yomi).length, 20);
});

test('元素: 見本の値（原子量表 2026 と IUPAC の表から）', () => {
  const want = { 1: ['H', '水素'], 6: ['C', '炭素'], 11: ['Na', 'ナトリウム'], 19: ['K', 'カリウム'], 26: ['Fe', '鉄'], 47: ['Ag', '銀'], 50: ['Sn', 'スズ'], 55: ['Cs', 'セシウム'], 74: ['W', 'タングステン'], 78: ['Pt', '白金'], 79: ['Au', '金'], 80: ['Hg', '水銀'], 82: ['Pb', '鉛'], 92: ['U', 'ウラン'], 104: ['Rf', 'ラザホージウム'], 110: ['Ds', 'ダームスタチウム'] };
  for (const [n, [s, ja]] of Object.entries(want)) {
    assert.equal(genso.items[n - 1].sym, s, n);
    assert.equal(genso.items[n - 1].ja, ja, n);
  }
});

test('年号: 101 件、年は重ならず昇順、時代の順も崩れない', () => {
  assert.equal(nengo.items.length, 101);
  const ys = nengo.items.map((it) => it.year);
  assert.deepEqual(ys, ys.slice().sort((a, b) => a - b));
  assert.equal(new Set(ys).size, 101, '年→出来事の答えが 1 つに決まる');
  const ord = ['kodai', 'chusei', 'kinsei', 'kindai', 'gendai'];
  let last = 0;
  for (const it of nengo.items) {
    const i = ord.indexOf(it.per);
    assert.ok(i >= last, it.year + ' の時代');
    last = i;
    assert.ok(it.text.length <= 40, it.text);
    assert.ok(it.term && it.term.length <= 20, it.year);
  }
  assert.equal(nengo.items.filter((it) => it.kihon).length, 44);
});

test('年号: 語呂合わせを載せていない（「語呂」「覚え方」の文字が無い）', () => {
  const src = fs.readFileSync(path.join(ROOT, 'topics', 'nengo.js'), 'utf8');
  const rows = src.slice(src.indexOf('var ROWS'), src.indexOf('];', src.indexOf('var ROWS')));
  assert.ok(!/語呂|ごろ合わせ|覚え方/.test(rows));
});

test('題材: どの題材も必要な部品を持つ', () => {
  for (const t of [genso, nengo]) {
    for (const k of ['id', 'page', 'order', 'label', 'items', 'kinds', 'filters', 'columns', 'explain', 'link', 'sourceKey', 'unit']) assert.ok(t[k] != null, t.id + ' の ' + k);
    for (const k of ['title', 'h1', 'lead', 'description', 'hub', 'icon', 'order']) assert.ok(t.page[k] != null, t.id + ' の page.' + k);
    assert.ok(t.page.lead.length <= 40, t.id + ' の冒頭は 40 字まで（WRITING 1 章）');
    assert.ok(CONSTANTS[t.sourceKey], t.id + ' の出典');
    assert.equal(new Set(t.items.map((it) => it.id)).size, t.items.length, t.id + ' の id が重ならない');
    for (const f of t.filters) assert.ok(f.options.some((o) => o.v === f.def), t.id + ' の ' + f.key + ' の既定');
  }
});

test('constants: すべての出典に名前・URL・確認日がある', () => {
  for (const [key, c] of Object.entries(CONSTANTS)) {
    assert.ok(c.source && c.url && c.checked, `${key} に source / url / checked が無い`);
    assert.match(c.checked, /^\d{4}-\d{2}-\d{2}$/, `${key} の checked は YYYY-MM-DD`);
  }
});

test('ページ: 題材のページ・入口・sitemap・sw.js が topics/*.js と食い違っていない', () => {
  const out = execFileSync(process.execPath, [path.join(ROOT, 'tools', 'build-pages.mjs'), '--check'], { encoding: 'utf8' });
  assert.match(out, /OK/);
});

test('sw.js: キャッシュ名は quiz-hiroba- で始まる', () => {
  const sw = fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8');
  assert.match(sw, /const CACHE_PREFIX = 'quiz-hiroba-';/);
  assert.match(sw, /\$\{CACHE_PREFIX\}v1/);
});
