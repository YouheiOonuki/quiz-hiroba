// 首都の「おお」の一言（K122）のテスト: Wikidata（CC0）の写しから機械で作ったこと、うそにならない規則（ooh.js の先頭）
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const Ooh = require('../ooh.js');
const data = require('../ooh-shuto.js');
const shuto = require('../topics/shuto.js');
const kokki = require('../topics/kokki.js');
const genso = require('../topics/genso.js');
const ROOT = path.join(__dirname, '..');
const SNAP = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/wikidata-shuto.json'), 'utf8'));
const SET = { shuto: data };
const byId = (id) => shuto.items.find((it) => it.id === id);
const texts = (id) => Ooh.factsFor('shuto', byId(id), SET).map((f) => f.text);

test('写しから作り直すと ooh-shuto.js と同じになる（決まった手順で、ネットワークを使わずに作れる）', () => {
  const out = execFileSync(process.execPath, [path.join(ROOT, 'tools/build-ooh-shuto.mjs'), '--check'], { encoding: 'utf8' });
  assert.match(out, /OK/);
});

test('写しに出典・ライセンス・取得日があり、ooh-shuto.js の取得日と同じ', () => {
  assert.match(SNAP.source, /Wikidata/);
  assert.match(SNAP.source, /CC0/);
  assert.match(SNAP.retrieved, /^\d{4}-\d{2}-\d{2}$/);
  assert.equal(data.retrieved, SNAP.retrieved);
  // 国旗クイズの ISO の 2 文字と同じものを使っている
  for (const it of shuto.items) assert.equal(SNAP.iso[it.id], kokki.items.find((k) => k.id === it.id).code.toUpperCase(), it.id);
});

test('191 か国すべてが「一言あり／一言なし（行はある）／突き合わせられず」のどれか 1 つ', () => {
  const rows = new Set(data.rows.map((r) => r[0]));
  const un = new Set(data.unmatched);
  for (const it of shuto.items) assert.ok(rows.has(it.id) !== un.has(it.id), it.id);
  assert.equal(rows.size + un.size, shuto.items.length);
  assert.equal(data.rows.length, rows.size, '行が重ならない');
  // 突き合わせられない首都には一言を出さない（当て推量をしない）
  for (const id of data.unmatched) assert.deepEqual(Ooh.factsFor('shuto', byId(id), SET), [], id);
});

test('行の首都は、その国の Wikidata の首都（P36、終了なし）で、日本語のラベルか別名が外務省の表記と同じ', () => {
  const { norm } = require('../tools/build-ooh-shuto.mjs');
  for (const [id, q, rev] of data.rows) {
    const it = byId(id);
    const co = SNAP.countries[SNAP.countryQ[SNAP.iso[id]]];
    assert.ok(co.P36.some((s) => s.value === q && !s.end && s.rank !== 'deprecated'), id + ' の首都 ' + q);
    const cap = SNAP.capitals[q];
    assert.ok([cap.ja, ...cap.jaAliases].some((l) => norm(l) === norm(it.capital)), id + ': ' + cap.ja + ' と ' + it.capital);
    assert.equal(rev, cap.rev, id + ' の版');
  }
});

test('どの一言にも出典がある: Wikidata の Q 番号・P 番号・取得日（https のリンク）', () => {
  let n = 0;
  for (const it of shuto.items) {
    const row = data.rows.find((r) => r[0] === it.id);
    for (const f of Ooh.factsFor('shuto', it, SET)) {
      assert.match(f.src.url, /^https:\/\/www\.wikidata\.org\/wiki\/Q\d+#P\d+$/, it.id);
      assert.ok(f.src.url.includes('/' + row[1] + '#'), it.id + ' の Q 番号');
      assert.match(f.src.label, /Q\d+（P\d+。\d{4}-\d{2}-\d{2} 取得。CC0）/, it.id);
      assert.ok(f.src.label.includes(data.retrieved));
      n++;
    }
  }
  assert.ok(n >= 250, '一言の数 ' + n);
});

test('作った一言はどれも規則に合い、捨てられたものが無い。1 首都 3 つまで。1 つの一言は 1 文で 40 字以内', () => {
  for (const r of data.rows) {
    assert.ok(r[3].length <= 3, r[0]);
    const facts = Ooh.factsFor('shuto', byId(r[0]), SET);
    assert.equal(facts.length, r[3].length, r[0] + ': 規則に合わず捨てられた一言がある');
    for (const f of facts) {
      assert.equal(Ooh.sentences(f.text).length, 1, f.text);
      assert.ok(f.text.replace(/。$/, '').length <= 40, f.text + '（' + f.text.length + '字）');
    }
  }
});

test('変わるもの・順位の語（人口・最大・最古・現在・面積・順位）を含まない', () => {
  for (const w of ['人口', '最大', '最古', '現在', '面積', '順位']) assert.ok(Ooh.BANNED.includes(w), w);
  for (const it of shuto.items) {
    for (const f of Ooh.factsFor('shuto', it, SET)) for (const w of Ooh.BANNED) assert.ok(!f.text.includes(w), it.id + ': ' + f.text);
    // 生データにも無い（factsFor が捨てたのではなく、最初から作っていない）
    const row = data.rows.find((r) => r[0] === it.id);
    if (row) for (const f of row[3]) for (const w of Ooh.BANNED) assert.ok(!JSON.stringify(f).includes(w), it.id);
  }
});

test('使う属性は 4 つだけ（P138・P571・P206・P1448）。人口 P1082・面積 P2046・標高 P2044・姉妹都市 P190 は使わない。自由文は無い', () => {
  const props = new Set(data.rows.flatMap((r) => r[3].map((f) => f[f.length - 1])));
  for (const p of props) assert.ok(['P138', 'P571', 'P206', 'P1448'].includes(p), p);
  for (const it of shuto.items) assert.ok(Ooh.factsFor('shuto', it, SET).every((f) => f.kind !== 'free'), it.id);
});

test('値は写しの値そのもの（創設の年・水域・名前の由来の Q 番号）', () => {
  for (const [id, q, , facts] of data.rows) {
    const cl = SNAP.capitals[q].claims;
    for (const f of facts) {
      if (f[0] === 'i') assert.ok(cl.P571.some((c) => c.value.time && Number(c.value.time.slice(0, 5)) === f[1]), id + ' P571 ' + f[1]);
      if (f[0] === 'n') assert.ok(cl.P138.some((c) => c.value === f[2]), id + ' P138');
      if (f[0] === 'w') for (const w of f[3]) assert.ok(cl.P206.some((c) => c.value === w), id + ' P206 ' + w);
      if (f[0] === 'f') assert.ok(cl.P1448.some((c) => c.value.text === f[3] && c.value.language === f[2] && c.qualifiers.P582), id + ' P1448');
    }
  }
});

test('見本: ジャカルタ・モンロビア・エレバン・ローマ', () => {
  assert.ok(texts('indonesia').includes('1949年までの公式名はオランダ語で「Batavia」。'));
  assert.ok(texts('liberia').includes('名前は「ジェームズ・モンロー」にちなむとされる。'));
  assert.ok(texts('armenia').includes('創設は紀元前782年とされる。'));
  // ローマの創設（紀元前 753 年）は Wikidata で「伝説」などの修飾子つきなので使わない
  assert.ok(texts('italy').every((t) => !t.startsWith('創設')));
  assert.ok(texts('italy').includes('テヴェレ川とアニエーネ川のほとりにある。'));
});

test('突き合わせられないもの（タラワ・グアテマラ市・マルキョク・シウダ・デ・ラ・パス）は一言を出さない', () => {
  for (const id of ['kiribati', 'guatemala', 'palau', 'eq_guinea']) {
    assert.ok(data.unmatched.includes(id), id);
    assert.deepEqual(texts(id), []);
  }
});

test('首都クイズのページは ooh.js と ooh-shuto.js を題材より先に読む。元素のページは ooh-shuto.js を読まない', () => {
  const html = fs.readFileSync(path.join(ROOT, 'shuto/index.html'), 'utf8');
  const a = html.indexOf('../ooh.js'), b = html.indexOf('../ooh-shuto.js'), c = html.indexOf('../topics/shuto.js');
  assert.ok(a > 0 && a < b && b < c);
  assert.match(html, /id="ooh-more"/);
  assert.ok(!fs.readFileSync(path.join(ROOT, 'genso/index.html'), 'utf8').includes('ooh-shuto.js'));
  // 元素の一言は変わらない
  assert.ok(Ooh.factsFor('genso', genso.items[0], { genso: require('../ooh-genso.js') }).length >= 2);
});

test('使い方ページと README に Wikidata・CC0・取得日', () => {
  const g = fs.readFileSync(path.join(ROOT, 'guide.html'), 'utf8');
  assert.ok(g.includes('https://www.wikidata.org/'));
  assert.ok(g.includes('CC0'));
  assert.ok(g.includes('2026-10-01'));
  const r = fs.readFileSync(path.join(ROOT, 'README.md'), 'utf8');
  assert.match(r, /Wikidata[^\n]*CC0/);
});
