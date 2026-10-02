// 公開データ（data/genso.json・data/shuto.json。CC0）のテスト: node --test tests/*.test.js
// 画面と同じ関数（ooh.js の factsFor）から機械で書き出すもの。ファイルが書き出しの結果と同じか、
// license・checked・generated・source（ACCEPTANCE 7.10.3 e の規則）があるか、一言ごとに出典があるかを確かめる
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Ooh = require('../ooh.js');
const genso = require('../topics/genso.js');
const shuto = require('../topics/shuto.js');

const root = path.join(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const load = () => import(path.join(root, 'tools', 'build-data.mjs'));

test('data/genso.json・data/shuto.json が元のデータから書き出した結果と同じ（node tools/build-data.mjs）', async () => {
  const B = await load();
  const out = B.outputs();
  assert.equal(read('data/genso.json'), out['data/genso.json']);
  assert.equal(read('data/shuto.json'), out['data/shuto.json']);
});

test('頭に license（CC0）・checked・generated・source', () => {
  for (const f of ['data/genso.json', 'data/shuto.json']) {
    const d = JSON.parse(read(f));
    assert.equal(d.license, 'CC0-1.0', f);
    assert.match(d.checked, /^\d{4}-\d{2}-\d{2}$/, f);
    assert.match(d.generated, /^\d{4}-\d{2}-\d{2}$/, f);
    assert.ok(d.generated >= d.checked, f);
    assert.ok(d.source.length > 0, f);
    for (const u of d.source) assert.match(u, /^https:\/\//, f);
  }
});

test('generated は中身が変わったときだけ変わる', async () => {
  const B = await load();
  const json = read('data/genso.json');
  assert.equal(B.stamp(B.buildGenso, json), json);
  process.env.GENERATED = '2099-01-01';
  try {
    assert.match(B.stamp(B.buildGenso, json.replace('"title": "', '"title": "x')), /"generated": "2099-01-01"/);
  } finally { delete process.env.GENERATED; }
});

test('genso.json: 118 元素、一言は画面と同じ（factsFor）で、どれにも出典の URL', () => {
  const d = JSON.parse(read('data/genso.json'));
  assert.equal(d.items.length, 118);
  d.items.forEach((x, i) => {
    const it = genso.items[i];
    assert.deepEqual([x.n, x.symbol, x.ja, x.en], [it.n, it.sym, it.ja, it.en]);
    assert.deepEqual(x.facts.map((f) => f.text), Ooh.factsFor('genso', it, { genso: require('../ooh-genso.js') }).map((f) => f.text));
    assert.ok(x.facts.length >= 2, x.symbol);
    for (const f of x.facts) assert.match(f.source.url, /^https:\/\//, x.symbol);
  });
});

test('shuto.json: 191 か国、一言は Wikidata の Q 番号つき、突き合わせられない国は一言なし', () => {
  const d = JSON.parse(read('data/shuto.json'));
  assert.equal(d.items.length, shuto.items.length);
  for (const x of d.items) {
    if (d.unmatched.includes(x.id)) { assert.equal(x.facts.length, 0, x.id); continue; }
    for (const f of x.facts) assert.match(f.source.url, /^https:\/\/www\.wikidata\.org\/wiki\/Q\d+#P\d+$/, x.id);
    if (x.facts.length) assert.match(x.wikidata, /^Q\d+$/, x.id);
  }
  assert.equal(d.items.reduce((a, x) => a + x.facts.length, 0), 308);
});

test('data/LICENSE は CC0 1.0 の全文、README に CC0 とコードの MIT の区別', () => {
  const lic = read('data/LICENSE');
  assert.match(lic, /CC0 1\.0 Universal/);
  const readme = read('data/README.md');
  assert.match(readme, /CC0 1\.0/);
  assert.match(readme, /MIT License/);
  assert.match(readme, /node tools\/build-data\.mjs/);
});
