// 国旗クイズ（K88）のテスト: 国名が首都クイズと同じ、旗のファイルとライセンス、レベルの選択肢の作り方
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Calc = require('../calc.js');
const kokki = require('../topics/kokki.js');
const shuto = require('../topics/shuto.js');
const ROOT = path.join(__dirname, '..');
const byId = (id) => kokki.items.find((x) => x.id === id);

test('196 か国。id・国名・ISO の 2 文字が重ならない', () => {
  assert.equal(kokki.items.length, 196);
  for (const k of ['id', 'country', 'code']) assert.equal(new Set(kokki.items.map((x) => x[k])).size, 196, k);
  for (const it of kokki.items) assert.match(it.code, /^[a-z]{2}$/, it.id);
});

test('国名と地域は世界の首都クイズ（外務省の表記）と同じ。足したのは 4 か国と日本だけ', () => {
  for (const s of shuto.items) {
    const k = byId(s.id);
    assert.ok(k, s.id);
    assert.equal(k.country, s.country, s.id);
    assert.equal(k.region, s.region, s.id);
  }
  const extra = kokki.items.filter((x) => !shuto.items.some((s) => s.id === x.id)).map((x) => x.country).sort();
  assert.deepEqual(extra, ['イスラエル国', 'シンガポール共和国', 'バチカン市国', 'モナコ公国', '日本'].sort());
  for (const bad of ['台湾', '北朝鮮', 'パレスチナ', '香港', 'マカオ']) assert.ok(!kokki.items.some((x) => x.country.includes(bad)), bad);
});

test('見本の ISO の 2 文字（外務省の URL の名前と flag-icons の英語名を突き合わせたもの）', () => {
  const want = { japan: 'jp', usa: 'us', uk: 'gb', korea: 'kr', congokyo: 'cg', congomin: 'cd', c_dominica: 'dm', dominican_r: 'do', guinea_b: 'gw', eq_guinea: 'gq', niger: 'ne', nigeria: 'ng', kosovo: 'xk', cook: 'ck', niue: 'nu', vatican: 'va', easttimor: 'tl', scn: 'kn', svg: 'vc', s_sudan: 'ss', sudan: 'sd' };
  for (const [id, c] of Object.entries(want)) assert.equal(byId(id).code, c, id);
});

test('旗の SVG は使う 196 枚だけを入れ、MIT のライセンスと版がある', () => {
  const dir = path.join(ROOT, 'flags', '4x3');
  const files = fs.readdirSync(dir).sort();
  assert.deepEqual(files, kokki.items.map((x) => x.code + '.svg').sort());
  for (const f of files) {
    const svg = fs.readFileSync(path.join(dir, f), 'utf8');
    assert.match(svg, /^<svg[^>]*viewBox="0 0 640 480"/, f + ' は 4:3');
    assert.ok(!/<script/i.test(svg), f + ' にスクリプトが無い');
  }
  const lic = fs.readFileSync(path.join(ROOT, 'flags', 'LICENSE'), 'utf8');
  assert.match(lic, /The MIT License/);
  assert.match(lic, /Panayiotis Lipiridis/);
  assert.match(fs.readFileSync(path.join(ROOT, 'flags', 'VERSION'), 'utf8'), /flag-icons 7\.5\.0/);
});

test('レベル: 小学生 30・激ムズは似た旗の組の国だけ。組と小学生の国はすべて実在の id', () => {
  const pool = (lv) => Calc.pool(kokki, { lv });
  assert.equal(pool('kids').length, 30);
  assert.equal(pool('normal').length, 196);
  assert.equal(pool('hard').length, 196);
  for (const id of kokki.kidsIds) assert.ok(byId(id), id);
  const seen = {};
  for (const [name, ids] of kokki.similar) {
    assert.ok(ids.length >= 2, name);
    for (const id of ids) { assert.ok(byId(id), id); assert.ok(!seen[id], id + ' が 2 つの組に'); seen[id] = true; }
  }
  assert.equal(pool('extreme').length, Object.keys(seen).length);
});

test('選択肢: 小学生は 30 か国から、難しいは同じ地域から、激ムズは似た旗の組から先に', () => {
  const kind = 'flag';
  for (let seed = 1; seed <= 30; seed++) {
    const kids = Calc.makeRound(kokki, { kind, mode: 'choice', filters: { lv: 'kids' }, count: 10, seed });
    for (const q of kids) for (const c of q.choices) assert.ok(kokki.items.find((x) => x.country === c).kids, c);
    const hard = Calc.makeRound(kokki, { kind, mode: 'choice', filters: { lv: 'hard' }, count: 10, seed });
    for (const q of hard) {
      const it = byId(q.id);
      const sameRegion = kokki.items.filter((x) => x.region === it.region).length;
      const n = q.choices.filter((c) => kokki.items.find((x) => x.country === c).region === it.region).length;
      assert.equal(n, Math.min(4, sameRegion), it.country);
    }
    const ex = Calc.makeRound(kokki, { kind, mode: 'choice', filters: { lv: 'extreme' }, count: 10, seed });
    for (const q of ex) {
      const it = byId(q.id);
      assert.equal(q.choices.length, 4);
      assert.equal(new Set(q.choices).size, 4);
      const groupSize = kokki.similar[it.sim][1].length;
      const n = q.choices.filter((c) => kokki.items.find((x) => x.country === c).sim === it.sim).length;
      assert.equal(n, Math.min(4, groupSize), it.country + ' の組の国が選択肢に入る');
    }
  }
});

test('国 → 旗: 選択肢の旗の絵はどれも入れたファイル。旗 → 国: 問題の旗の絵もある', () => {
  const pick = kokki.kinds.find((k) => k.key === 'pick');
  const flag = kokki.kinds.find((k) => k.key === 'flag');
  const q = Calc.makeRound(kokki, { kind: 'pick', mode: 'choice', filters: { lv: 'normal' }, count: 0, seed: 3 });
  assert.equal(q.length, 196);
  for (const x of q) for (const c of x.choices) {
    const u = pick.choiceImg(c);
    assert.match(u, /^\.\.\/flags\/4x3\/[a-z]{2}\.svg$/);
    assert.ok(fs.existsSync(path.join(ROOT, u.slice(3))), u);
  }
  for (const it of kokki.items) assert.ok(fs.existsSync(path.join(ROOT, flag.img(it).slice(3))), it.id);
  assert.equal(pick.typing, false);
  assert.equal(flag.typing, false);
});

test('説明と出典のリンク: 似た旗の組を出す。日本は外務省の国のページが無いのでリンクなし', () => {
  assert.equal(kokki.explain(byId('chad')), 'チャド共和国の旗（アフリカ）。似ている旗（青・黄・赤のたて3色）: ルーマニア・アンドラ公国・モルドバ共和国。');
  assert.equal(kokki.explain(byId('kenya')), 'ケニア共和国の旗（アフリカ）。');
  assert.equal(kokki.link(byId('japan')), null);
  assert.equal(kokki.link(byId('france')).href, 'https://www.mofa.go.jp/mofaj/area/france/data.html');
});

test('国旗のページ: AdSense は meta だけ。首都クイズのデータを先に読む。旗は最初に取っておかない', () => {
  const html = fs.readFileSync(path.join(ROOT, 'kokki/index.html'), 'utf8');
  assert.ok(!/adsbygoogle\.js/.test(html));
  assert.equal((html.match(/name="google-adsense-account"/g) || []).length, 1);
  assert.ok(html.indexOf('../topics/shuto.js') < html.indexOf('../topics/kokki.js'));
  const sw = fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8');
  assert.ok(sw.includes("'./kokki/'") && sw.includes("'./topics/kokki.js'"));
  assert.ok(!sw.includes('flags/'), '旗の絵は問題に出たときに読む');
  assert.equal((sw.match(/'\.\/topics\/shuto\.js'/g) || []).length, 1, 'shuto.js は 1 回だけ');
  const hub = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  assert.equal((hub.match(/topics\/shuto\.js/g) || []).length, 1);
  assert.ok(hub.indexOf('topics/shuto.js') < hub.indexOf('topics/kokki.js'));
});
