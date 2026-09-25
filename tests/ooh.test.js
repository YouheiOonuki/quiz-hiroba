// 「おお」の一言（K122）のテスト: うそにならない規則（ooh.js の先頭）をデータ全体で確かめる
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Ooh = require('../ooh.js');
const data = require('../ooh-genso.js');
const genso = require('../topics/genso.js');
const nengo = require('../topics/nengo.js');
const ROOT = path.join(__dirname, '..');
const SET = { genso: data };

test('元素: 118 件すべてに事実があり、どの事実にも出典（名前と https の URL）がある', () => {
  assert.equal(data.rows.length, 118);
  assert.deepEqual(data.rows.map((r) => r[0]), Array.from({ length: 118 }, (_, i) => i + 1));
  let n = 0;
  for (const it of genso.items) {
    const built = Ooh.builders.genso(data, it);
    const facts = Ooh.factsFor('genso', it, SET);
    assert.equal(facts.length, built.length, it.n + ': 規則に合わず捨てられた事実がある');
    assert.ok(facts.length >= 2, it.n + ' は 2 つ以上');
    for (const f of facts) {
      assert.ok(f.src && f.src.label, it.n + ' の出典の名前');
      assert.match(f.src.url, /^https:\/\/(www\.ciaaw\.org|periodic\.lanl\.gov|iupac\.org|pubchem\.ncbi\.nlm\.nih\.gov)\//, it.n + ' の出典の URL');
    }
    n += facts.length;
  }
  assert.ok(n >= 350, '事実の数 ' + n);
});

test('1 文 40 字以内（「。」で区切った 1 文ずつ）', () => {
  for (const it of genso.items) {
    for (const f of Ooh.builders.genso(data, it)) {
      for (const s of Ooh.sentences(f.text)) assert.ok(s.length <= 40, it.n + ': ' + s + '（' + s.length + '字）');
    }
  }
});

test('変わるもの・記録の語（人口・生産・最大・最古・現在 など）を含まない。例外は理由つきだけ', () => {
  for (const w of ['人口', '生産', '最大', '最古', '現在']) assert.ok(Ooh.BANNED.includes(w), w);
  for (const [k, why] of Object.entries(Ooh.WHITELIST)) assert.ok(typeof why === 'string' && why.length >= 5, k + ' の理由');
  for (const it of genso.items) {
    Ooh.builders.genso(data, it).forEach((f, i) => {
      if (Ooh.WHITELIST['genso:' + it.id + ':' + i]) return;
      for (const w of Ooh.BANNED) assert.ok(!f.text.includes(w), it.n + ': 「' + w + '」 ' + f.text);
    });
  }
});

test('自由文は 1 元素に 1 つまで。行の出典は c・l・i16 のどれか', () => {
  for (const r of data.rows) {
    assert.ok(['c', 'l', 'i16'].includes(r[1]), r[0] + ' の出典');
    assert.ok(r[5] === null || typeof r[5] === 'string', r[0] + ' の自由文は 1 つの文字列か null');
  }
  for (const it of genso.items) {
    assert.ok(Ooh.factsFor('genso', it, SET).filter((f) => f.kind === 'free').length <= 1, it.n);
  }
});

test('発見の年は昔の年（未来の年や 2016 年より後は無い）。型の書き方どおりの文になる', () => {
  for (const r of data.rows) {
    if (!r[4]) continue;
    const [y, who, type] = r[4];
    assert.ok(['f', 'c', 'i', 'p', 'r', 'm', 'rep', 'a'].includes(type), r[0] + ' の型');
    if (type === 'a') { assert.equal(y, null); continue; }
    assert.ok(Number.isInteger(y) && y >= 1600 && y <= 2016, r[0] + ' の年 ' + y);
    if (type !== 'f') assert.ok(who, r[0] + ' のだれ');
  }
  assert.equal(Ooh.foundSentence([1766, 'イギリスの物理学者キャベンディッシュ', 'f']), '1766年、イギリスの物理学者キャベンディッシュが発見した。');
  assert.equal(Ooh.foundSentence([1774, 'イギリスのプリーストリー', 'c']), '発見者とされるのはイギリスのプリーストリー（1774年）。');
  assert.equal(Ooh.foundSentence([1952, null, 'f']), '1952年に発見された。');
  assert.equal(Ooh.foundSentence([null, null, 'a']), '大昔から知られていた。');
});

test('周期と族は原子番号だけで決まる（IUPAC の周期表の並び）', () => {
  const pg = (n) => [Ooh.period(n), Ooh.group(n)];
  assert.deepEqual(pg(1), [1, 1]);
  assert.deepEqual(pg(2), [1, 18]);
  assert.deepEqual(pg(5), [2, 13]);
  assert.deepEqual(pg(10), [2, 18]);
  assert.deepEqual(pg(13), [3, 13]);
  assert.deepEqual(pg(21), [4, 3]);
  assert.deepEqual(pg(26), [4, 8]);
  assert.deepEqual(pg(54), [5, 18]);
  assert.deepEqual(pg(56), [6, 2]);
  assert.deepEqual(pg(57), [6, 0]);
  assert.deepEqual(pg(71), [6, 0]);
  assert.deepEqual(pg(72), [6, 4]);
  assert.deepEqual(pg(86), [6, 18]);
  assert.deepEqual(pg(89), [7, 0]);
  assert.deepEqual(pg(104), [7, 4]);
  assert.deepEqual(pg(113), [7, 13]);
  assert.deepEqual(pg(118), [7, 18]);
  const t = (n) => Ooh.factsFor('genso', genso.items[n - 1], SET).find((f) => f.kind === 'table').text;
  assert.equal(t(8), '周期表では第2周期・16族。');
  assert.equal(t(60), '周期表では第6周期のランタノイド（57〜71番）の1つ。');
  assert.equal(t(92), '周期表では第7周期のアクチノイド（89〜103番）の1つ。');
});

test('見本: 水素・ヘリウム・ニホニウム・水銀', () => {
  const texts = (n) => Ooh.factsFor('genso', genso.items[n - 1], SET).map((f) => f.text);
  assert.ok(texts(1).includes('1766年、イギリスの物理学者キャベンディッシュが発見した。'));
  assert.ok(texts(1).includes('ふつうの温度と圧力では気体。'));
  assert.ok(texts(2).includes('日食のときに、太陽の光を調べて見つかった。'));
  assert.ok(texts(113).includes('名前は日本語の「にほん」から。'));
  assert.ok(texts(113).includes('2016年11月28日、IUPAC がこの名前に正式に決めた。'));
  assert.ok(texts(80).includes('ふつうの温度と圧力では液体。'));
  assert.ok(texts(80).includes('記号 Hg はギリシャ語の「液体の銀」から。'));
});

test('出典の無い事実・長すぎる文・変わるものの語は factsFor が捨てる', () => {
  assert.equal(Ooh.problem({ text: '名前は水から。', src: null }), '出典がない');
  assert.equal(Ooh.problem({ text: '名前は水から。', src: { label: 'x', url: 'http://example.com/' } }), '出典がない');
  assert.match(Ooh.problem({ text: 'あ'.repeat(41) + '。', src: { label: 'x', url: 'https://example.com/' } }), /40字/);
  assert.match(Ooh.problem({ text: '現在の生産量は多い。', src: { label: 'x', url: 'https://example.com/' } }), /変わるもの/);
  assert.equal(Ooh.problem({ text: '名前は水から。', src: { label: 'x', url: 'https://example.com/' } }), '');
  const fake = { genso: { rows: [[1, 'zz', '出典の無い文。', null, null, null]], named2016: [], gas: [], liquid: [] } };
  const f = Ooh.factsFor('genso', genso.items[0], fake);
  assert.ok(f.every((x) => x.kind === 'table'), '出典の分からない行の文は出さない（周期表の型の事実だけが残る）');
});

test('データの無い題材では何も出さない。「もう1つ」は最後まで行くと最初に戻る', () => {
  assert.deepEqual(Ooh.factsFor('nengo', nengo.items[0], SET), []);
  assert.equal(Ooh.nextIndex(0, 3), 1);
  assert.equal(Ooh.nextIndex(2, 3), 0);
  assert.equal(Ooh.startIndex(3, () => 0.99), 2);
  assert.equal(Ooh.startIndex(0, () => 0.5), 0);
});

test('元素のページは ooh.js と ooh-genso.js を題材より先に読む。ほかの題材のページは読まない', () => {
  const html = fs.readFileSync(path.join(ROOT, 'genso/index.html'), 'utf8');
  const a = html.indexOf('../ooh.js'), b = html.indexOf('../ooh-genso.js'), c = html.indexOf('../topics/genso.js');
  assert.ok(a > 0 && a < b && b < c);
  assert.match(html, /id="ooh-more"/);
  assert.ok(!fs.readFileSync(path.join(ROOT, 'nengo/index.html'), 'utf8').includes('ooh-genso.js'));
});

test('使い方ページに「おお」の一言の出典の一覧がある', () => {
  const g = fs.readFileSync(path.join(ROOT, 'guide.html'), 'utf8');
  for (const u of ['https://www.ciaaw.org/', 'https://periodic.lanl.gov/', 'https://iupac.org/iupac-announces-the-names-of-the-elements-113-115-117-and-118/', 'https://pubchem.ncbi.nlm.nih.gov/periodic-table/']) {
    assert.ok(g.includes(u), u);
  }
});
