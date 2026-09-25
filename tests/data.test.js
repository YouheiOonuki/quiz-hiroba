// 題材のデータ（topics/*.js）と、作ったページのテスト: node --test tests/*.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const CONSTANTS = require('../constants.js');
const genso = require('../topics/genso.js');
const nengo = require('../topics/nengo.js');
const kimariji = require('../topics/kimariji.js');
const shuto = require('../topics/shuto.js');
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
  for (const t of [genso, nengo, kimariji, shuto, require('../topics/showa.js')]) {
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
  assert.match(sw, /\$\{CACHE_PREFIX\}v3/);
});

test('首都: 191 か国、国名と首都は重ならず、外務省の表記（括弧・数字を含まない）', () => {
  assert.equal(shuto.items.length, 191);
  assert.equal(new Set(shuto.items.map((it) => it.country)).size, 191);
  assert.equal(new Set(shuto.items.map((it) => it.capital)).size, 191, '首都→国の答えが 1 つに決まる');
  for (const it of shuto.items) {
    assert.ok(it.capital && !/[（()）0-9０-９]/.test(it.capital), it.country + ' の首都 ' + it.capital);
    assert.match(it.snap, /^20(24|25|26)\d{4}$/, it.country + ' の保存日');
    assert.ok(shuto.regions[it.region], it.country + ' の地域');
  }
});

test('首都: 見本（外務省の基礎データの表記）と、出題しない国・地域', () => {
  const cap = (id) => shuto.items.find((it) => it.id === id).capital;
  assert.equal(cap('usa'), 'ワシントンD.C.');
  assert.equal(cap('uk'), 'ロンドン');
  assert.equal(cap('ukraine'), 'キーウ');
  assert.equal(cap('kazakhstan'), 'アスタナ');
  assert.equal(cap('myanmar'), 'ネーピードー');
  assert.equal(cap('srilanka'), 'スリ・ジャヤワルダナプラ・コッテ');
  assert.equal(cap('netherlands'), 'アムステルダム');
  assert.equal(cap('bolivia'), 'ラパス');
  assert.equal(cap('china'), '北京');
  for (const id of ['israel', 'singapore', 'vatican', 'monaco', 'n_korea', 'taiwan', 'plo', 'hongkong', 'macao']) {
    assert.ok(!shuto.items.some((it) => it.id === id), id + ' は出題しない');
  }
  const multi = shuto.items.filter((it) => it.multi).map((it) => it.id).sort();
  assert.equal(multi.length, 17);
  assert.ok(multi.includes('s_africa') && multi.includes('netherlands') && multi.includes('bolivia'));
  assert.match(shuto.explain(shuto.items.find((it) => it.id === 'netherlands')), /ハーグ/);
});

const showa = require('../topics/showa.js');
const Calc = require('../calc.js');

test('昭和クイズ: 75 問（出来事 15・物の値段 10 品目×3 年・レコード大賞 30）、年は昭和の中', () => {
  assert.equal(showa.items.length, 75);
  const n = (c) => showa.items.filter((it) => it.cat === c).length;
  assert.deepEqual([n('dekigoto'), n('nedan'), n('record')], [15, 30, 30]);
  for (const it of showa.items) {
    assert.ok(it.year >= 1926 && it.year <= 1989, it.id);
    assert.ok(it.href && it.src && it.talk, it.id + ' の出典と話のきっかけ');
    assert.match(it.href, /^https:\/\//);
  }
  assert.equal(showa.wareki(1964), '昭和39年（1964年）');
  assert.equal(showa.wareki(1926 + 63 - 1), '昭和63年（1988年）');
});

test('昭和クイズ: 値段は総務省統計局の表の値（見本）', () => {
  const yen = (g, y) => showa.items.find((it) => it.id === 'p-' + g + '-' + y).yen;
  assert.equal(yen('hagaki', 1960), 5);
  assert.equal(yen('hagaki', 1970), 7);
  assert.equal(yen('hagaki', 1980), 20);
  assert.equal(yen('ramen', 1970), 96);
  assert.equal(yen('sento', 1970), 38);
  assert.equal(yen('eiga', 1980), 1357);
  assert.equal(showa.items.find((it) => it.id === 'p-eiga-1980').a, '1,357円');
  // 同じ品目の 3 つの年の値は重ならない（3 択の選択肢がそろう）
  const groups = {};
  for (const it of showa.items.filter((x) => x.cat === 'nedan')) (groups[it.group] = groups[it.group] || []).push(it.yen);
  for (const [g, v] of Object.entries(groups)) { assert.equal(v.length, 3, g); assert.equal(new Set(v).size, 3, g); }
});

test('昭和クイズ: レコード大賞は第1回 1959〜第30回 1988 が 1 年 1 曲。歌詞の欄を持たない', () => {
  const r = showa.items.filter((it) => it.cat === 'record');
  assert.deepEqual(r.map((it) => it.year), Array.from({ length: 30 }, (_, i) => 1959 + i));
  assert.equal(r.find((it) => it.year === 1972).title, '喝采');
  assert.equal(r.find((it) => it.year === 1965).singer, '美空ひばり');
  for (const it of showa.items) assert.ok(!('lyrics' in it) && !('kashi' in it));
  const src = fs.readFileSync(path.join(ROOT, 'topics', 'showa.js'), 'utf8');
  assert.match(src, /歌詞は載せない/);
});

test('昭和クイズ: 3 択。選択肢は同じ組（同じ品目・出来事どうし・歌どうし）からだけ出て、正解が 1 つだけ入る', () => {
  assert.equal(Calc.choiceCount(showa), 3);
  for (let seed = 1; seed <= 30; seed++) {
    const qs = Calc.makeRound(showa, { kind: 'q', mode: 'choice', filters: {}, count: 0, seed });
    assert.equal(qs.length, 75);
    for (const q of qs) {
      const it = Calc.itemById(showa, q.id);
      assert.equal(q.choices.length, 3, it.id);
      assert.equal(new Set(q.choices).size, 3, it.id);
      assert.equal(q.choices.filter((c) => c === it.a).length, 1, it.id);
      const pool = showa.items.filter((x) => x.group === it.group).map((x) => x.a);
      for (const c of q.choices) assert.ok(pool.includes(c), it.id + ' の選択肢 ' + c);
    }
  }
  // 年代で絞っても、値段の選択肢はその品目のほかの年から出る
  const q = Calc.makeRound(showa, { kind: 'q', mode: 'choice', filters: { cat: 'nedan', era: 's20' }, count: 0, seed: 7 });
  assert.equal(q.length, 7);
  const h = q.find((x) => x.id === 'p-hagaki-1960');
  assert.deepEqual(h.choices.slice().sort(), ['20円', '5円', '7円']);
});

test('昭和クイズ: 高齢者向け（D118）のページは広告のスクリプトを読まず、先頭に定型文', () => {
  for (const f of ['showa/index.html', 'showa/guide.html']) {
    const html = fs.readFileSync(path.join(ROOT, f), 'utf8');
    assert.ok(!/adsbygoogle\.js/.test(html), f + ' に AdSense のスクリプトが無い');
    assert.equal((html.match(/name="google-adsense-account"/g) || []).length, 1, f + ' は meta だけ');
    assert.match(html, /このページは広告なし・登録なし・入力は端末の外に出ません。/);
  }
  const page = fs.readFileSync(path.join(ROOT, 'showa/index.html'), 'utf8');
  assert.match(page, /<body data-topic="showa" class="big">/);
  assert.match(page, /href="\.\.\/showa\/guide\.html"/);
  assert.match(page, /id="print-cards"/);
});

test('ほかの題材のページは今までどおり（広告なしの定型文も大きな字も付かない）', () => {
  for (const id of ['genso', 'nengo', 'kimariji', 'shuto']) {
    const html = fs.readFileSync(path.join(ROOT, id, 'index.html'), 'utf8');
    assert.ok(!/class="noads"/.test(html), id);
    assert.match(html, new RegExp('<body data-topic="' + id + '">'));
    assert.match(html, /href="\.\.\/guide\.html"/);
  }
});

test('早押しボタンのページ: AdSense は meta だけ、使い方ページには広告のスクリプト', () => {
  const play = fs.readFileSync(path.join(ROOT, 'hayaoshi/index.html'), 'utf8');
  assert.ok(!/adsbygoogle\.js/.test(play));
  assert.match(play, /name="google-adsense-account"/);
  const guide = fs.readFileSync(path.join(ROOT, 'hayaoshi/guide.html'), 'utf8');
  assert.match(guide, /adsbygoogle\.js/);
  const sw = fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8');
  for (const f of ['./hayaoshi/', './hayaoshi.js', './hayaoshi-ui.js', './showa/', './topics/showa.js', './showa/guide.html']) assert.ok(sw.includes(`'${f}'`), f);
});
