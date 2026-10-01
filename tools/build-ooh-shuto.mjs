// 首都の「おお」の一言（K122）のデータ ooh-shuto.js を、Wikidata の写し data/wikidata-shuto.json だけから機械で作る
//
//   node tools/build-ooh-shuto.mjs          作る（ooh-shuto.js を書き換える）
//   node tools/build-ooh-shuto.mjs --check  作ったものと今のファイルが同じかだけを確かめる（tests/ooh-shuto.test.js から呼ぶ）
//
// ネットワークを使わない。同じ写しからは同じ ooh-shuto.js ができる（並びも固定）。写しを取り直すのは tools/fetch-wikidata-shuto.mjs。
// 文そのものは ooh.js（shutoFacts）が型から作る。ここで決めるのは「どの値を使うか」だけ（規則は下の pick* の注）。
//
// 首都の突き合わせ（うそにしないため、当て推量をしない）:
//   国（外務省の URL の名前）→ ISO の 2 文字（国旗クイズの CODE）→ Wikidata の国（P297）→ その国の首都の文（P36）のうち、
//   終了（P582）が無く・非推奨でないもの → その首都の日本語のラベルか日本語の別名が、外務省の首都の表記と同じもの。
//   「同じ」は、全角半角・中黒・空白・ピリオド・ハイフン・長音「ー」・末尾の「市」と、ヴァ／ヴィ／ヴ → バ／ビ／ブ の違いだけを無視して比べる。
//   合わないもの・終了した首都に当たったものは一言を出さない（UNMATCHED に理由を書く）。
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const CHECK = process.argv.includes('--check');
const OUT = path.join(ROOT, 'ooh-shuto.js');
const MAX_FACTS = 3;

export function norm(x) {
  return String(x || '').normalize('NFKC')
    .replace(/ヴァ/g, 'バ').replace(/ヴィ/g, 'ビ').replace(/ヴェ/g, 'ベ').replace(/ヴォ/g, 'ボ').replace(/ヴ/g, 'ブ')
    .replace(/[・\s.．\-‐=＝ー]/g, '').replace(/市$/, '');
}
/** 最良のランクの文（preferred があればそれだけ、無ければ normal。deprecated は使わない） */
function best(claims) {
  const a = (claims || []).filter((c) => c.rank !== 'deprecated' && c.value && !c.value.snaktype);
  const p = a.filter((c) => c.rank === 'preferred');
  return p.length ? p : a;
}
/** Wikidata の時刻（"+1786-00-00T…"・"-0782-…"）から年。紀元前は負の数（Wikidata の表示と同じく -782 は紀元前 782 年） */
function yearOf(t) { const m = /^([+-])0*(\d+)-/.exec(t.time); return m ? (m[1] === '-' ? -Number(m[2]) : Number(m[2])) : null; }
/** ラベルの末尾の「 (イギリス王)」などの曖昧さ回避の括弧を外す */
function cleanLabel(s) { return String(s).replace(/\s*[（(][^（）()]*[）)]$/, '').trim(); }

// --- 使う値の決まり（どれも「1 つに決まらないものは使わない」） ---

/** P571 創設: 最良のランクの値が 1 つだけ、精度が年以上（9 以上）、修飾子（伝説・おおよそ・最も早い日など）が 1 つも無い */
function pickInception(cap) {
  const a = best(cap.claims.P571);
  if (a.length !== 1) return null;
  const c = a[0];
  if (c.value.precision < 9 || Object.keys(c.qualifiers).length) return null;
  const y = yearOf(c.value);
  return y === null || y === 0 || y > 2026 ? null : ['i', y, 'P571'];
}

/** P138 名前の由来: 最良のランクの値が 1 つだけ、修飾子は言語（P407）のほかに無い（期間つきは昔の名前の由来なので使わない）、指す先に日本語のラベルと P31 がある */
function pickNamedAfter(cap, labels) {
  const a = best(cap.claims.P138);
  if (a.length !== 1) return null;
  const c = a[0];
  if (Object.keys(c.qualifiers).some((p) => p !== 'P407')) return null;
  const t = labels[c.value];
  if (!t || !t.ja || !t.P31.length) return null;
  return ['n', cleanLabel(t.ja), c.value, 'P138'];
}

/** P206 そばの水域: 日本語のラベルの終わりで分ける（川・河 → ほとり、湖 → ほとり、海・洋・湾 → 面している。運河・三角江などは使わない）。種類ごとに 2 つまで、ラベルの無いものは使わない */
function pickWater(cap, labels) {
  const out = [];
  const by = { r: [], s: [] };
  for (const c of best(cap.claims.P206)) {
    if (Object.keys(c.qualifiers).length) continue;
    const t = labels[c.value];
    if (!t || !t.ja) continue;
    const l = cleanLabel(t.ja);
    if (/運河$/.test(l)) continue;
    if (/(川|河|湖)$/.test(l)) by.r.push([l, c.value]);
    else if (/(海|洋|湾)$/.test(l)) by.s.push([l, c.value]);
  }
  for (const k of ['r', 's']) {
    const xs = by[k].slice(0, 2);
    if (xs.length) out.push(['w', k, xs.map((x) => x[0]), xs.map((x) => x[1]), 'P206']);
  }
  return out;
}

// 昔の公式名は、ラテン文字で書く言語のうち日本語の言語名を決めたものだけ（ほかの文字は画面で読めない人が多いので出さない）
export const LANG = { en: '英語', fr: 'フランス語', nl: 'オランダ語', de: 'ドイツ語', es: 'スペイン語', pt: 'ポルトガル語', it: 'イタリア語', la: 'ラテン語' };
/** P1448 公式名で終了（P582）のあるもの: 言語が LANG にある・ラテン文字だけ・終了の精度が年以上・いまの公式名（終了の無いもの）やラベルと違う。いちばん新しく終わった 1 つ */
function pickFormerName(cap) {
  const now = new Set([cap.en, ...best(cap.claims.P1448).filter((c) => !c.qualifiers.P582).map((c) => c.value.text)].filter(Boolean).map((s) => s.toLowerCase()));
  const xs = [];
  for (const c of best(cap.claims.P1448)) {
    const e = c.qualifiers.P582;
    if (!e || e.length !== 1 || !e[0] || e[0].precision < 9) continue;
    if (Object.keys(c.qualifiers).some((p) => !['P580', 'P582'].includes(p))) continue;
    const { text, language } = c.value;
    if (!LANG[language] || !/^[A-Za-zÀ-ɏ' .-]+$/.test(text) || now.has(text.toLowerCase())) continue;
    const y = yearOf(e[0]);
    if (!y || y > 2026) continue;
    xs.push(['f', y, language, text, 'P1448']);
  }
  // いちばん新しく終わったもの。同じ年なら LANG の並び（英語・フランス語・オランダ語…）で先のもの
  const order = Object.keys(LANG);
  xs.sort((a, b) => b[1] - a[1] || order.indexOf(a[2]) - order.indexOf(b[2]) || (a[3] < b[3] ? -1 : 1));
  return xs[0] || null;
}

// 機械の決まりは通るが、使わない値（運営者が目で見て、ほかの資料と食い違う疑いがあり確かめていないもの）。キーは「首都の Q 番号#P 番号」。足すのは外すときだけ
export const SKIP = {
  'Q3787#P571': 'アブジャの創設 1828 年は、1976 年に計画された新しい首都ではなく、古い町（いまのスレジャ）の年と読める',
  'Q34692#P138': 'キングストン（ジャマイカ）の名前の由来がイギリスのキングストン・アポン・テムズになっているが、ほかの資料と照らしていない',
  'Q5838#P571': 'カブールの創設 1200 年は、紀元前からある町の年として誤解を招く',
  'Q1489#P571': 'メキシコ市の創設 1521 年はスペインによる再建の年で、テノチティトラン（1325 年ごろ）を外している',
};

export function build(snap, shuto, sentenceOf, okText) {
  const rows = [];
  const unmatched = [];
  for (const it of shuto.items) {
    const iso = snap.iso[it.id];
    const cq = snap.countryQ[iso];
    const co = cq && snap.countries[cq];
    if (!co) { unmatched.push([it.id, it.capital, 'Wikidata に ISO ' + iso + ' の国が 1 つに決まらない']); continue; }
    const same = (q) => { const c = snap.capitals[q]; return c && [c.ja, ...c.jaAliases].some((l) => l && norm(l) === norm(it.capital)); };
    const live = co.P36.filter((s) => s.rank !== 'deprecated' && same(s.value));
    const open = live.filter((s) => !s.end);
    if (!open.length) {
      const why = live.length ? 'Wikidata では ' + cq + ' の首都としての期間が終わっている（' + live.map((s) => s.value + ' 終了 ' + s.end.time.slice(1, 11)).join('、') + '）'
        : 'Wikidata の ' + cq + ' の首都（P36）に同じ名前が無い（' + co.P36.filter((s) => s.rank !== 'deprecated' && !s.end).map((s) => (snap.capitals[s.value] && snap.capitals[s.value].ja) + ' ' + s.value).join('、') + '）';
      unmatched.push([it.id, it.capital, why]);
      continue;
    }
    const qs = [...new Set(open.map((s) => s.value))];
    if (qs.length !== 1) { unmatched.push([it.id, it.capital, '同じ名前の首都が 2 つ以上ある（' + qs.join('、') + '）']); continue; }
    const q = qs[0];
    const cap = snap.capitals[q];
    const cand = [pickNamedAfter(cap, snap.labels), pickInception(cap), ...pickWater(cap, snap.labels), pickFormerName(cap)].filter(Boolean)
      // 文にして 40 字をこえるもの・禁止語のあるものはここで落とす（ooh.js の problem と同じ決まり）
      .filter((f) => !SKIP[q + '#' + f[f.length - 1]])
      .filter((f) => { const s = sentenceOf(f); return s && okText(s); });
    rows.push([it.id, q, cap.rev, cand.slice(0, MAX_FACTS)]);
  }
  return { rows, unmatched };
}

function render(snap, rows, unmatched) {
  const facts = rows.reduce((n, r) => n + r[3].length, 0);
  const covered = rows.filter((r) => r[3].length).length;
  const lines = [];
  lines.push('// ===========================');
  lines.push('// 「おお」の一言: 世界の首都のデータ（ROADMAP K122。うそにならない規則は ooh.js の先頭）');
  lines.push('// このファイルは tools/build-ooh-shuto.mjs が data/wikidata-shuto.json（Wikidata の写し）から作る。手で書き換えない');
  lines.push('//');
  lines.push('// 出典: Wikidata（https://www.wikidata.org/。データは CC0 1.0）。取得日 ' + snap.retrieved + '。各行に首都の Q 番号と項目の版（lastrevid）、各事実に使った属性（P 番号）');
  lines.push('// 首都の事実だけ（国の事実は書かない）。型の事実だけで、自由文は無い。1 首都に ' + MAX_FACTS + ' つまで（名前の由来 → 創設 → 水域 → 昔の公式名 の順）');
  lines.push('//   n  P138 名前の由来     [\'n\', 指す先の日本語のラベル, 指す先の Q, \'P138\']');
  lines.push('//   i  P571 創設           [\'i\', 年（紀元前は負）, \'P571\']');
  lines.push('//   w  P206 そばの水域     [\'w\', \'r\'（川・湖）か \'s\'（海・洋・湾）, [日本語のラベル], [Q], \'P206\']');
  lines.push('//   f  P1448 昔の公式名    [\'f\', 終わった年, 言語, 名前, \'P1448\']');
  lines.push('// 使わないもの: 人口・面積（変わる）、姉妹都市（変わる）、標高（P2044。町の中で高さが違い、値の多くがウィキペディアからの取り込みで外の出典が無く、');
  lines.push('//   値が 2 つ以上ある首都もある）、首都になった年（国の P36 の開始 P580。前の国の時代の年が入っている項目が多い）');
  lines.push('// 首都 ' + rows.length + '（一言あり ' + covered + '）、一言 ' + facts + '。突き合わせられず一言を出さない首都 ' + unmatched.length + ':');
  for (const u of unmatched) lines.push('//   ' + u[0] + '（' + u[1] + '）: ' + u[2]);
  lines.push('// 機械の決まりは通るが使わない値（tools/build-ooh-shuto.mjs の SKIP）:');
  for (const [k, why] of Object.entries(SKIP)) lines.push('//   ' + k + ': ' + why);
  lines.push('// 行: [外務省の URL の名前, 首都の Q 番号, 項目の版, [事実…]]');
  lines.push('// ===========================');
  lines.push('(function (root) {');
  lines.push("  'use strict';");
  lines.push('');
  lines.push('  var ROWS = [');
  for (const r of rows) lines.push('    ' + JSON.stringify(r) + ',');
  lines.push('  ];');
  lines.push('');
  lines.push('  var data = { topic: \'shuto\', retrieved: ' + JSON.stringify(snap.retrieved) + ', lang: ' + JSON.stringify(LANG) + ', rows: ROWS,');
  lines.push('    unmatched: ' + JSON.stringify(unmatched.map((u) => u[0])) + ' };');
  lines.push("  if (typeof module !== 'undefined' && module.exports) module.exports = data;");
  lines.push('  else { root.OohData = root.OohData || {}; root.OohData.shuto = data; }');
  lines.push('})(this);');
  return lines.join('\n') + '\n';
}

export function generate() {
  const snap = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/wikidata-shuto.json'), 'utf8'));
  const shuto = require(path.join(ROOT, 'topics/shuto.js'));
  const Ooh = require(path.join(ROOT, 'ooh.js'));
  const sentenceOf = (f) => Ooh.shutoSentence(f, { lang: LANG });
  const okText = (text) => !Ooh.problem({ text, src: { label: 'Wikidata', url: 'https://www.wikidata.org/' } });
  const { rows, unmatched } = build(snap, shuto, sentenceOf, okText);
  return { text: render(snap, rows, unmatched), rows, unmatched };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { text, rows, unmatched } = generate();
  if (CHECK) {
    const now = fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8') : '';
    if (now !== text) { console.error('ooh-shuto.js が写しから作ったものと違う。node tools/build-ooh-shuto.mjs を実行する'); process.exit(1); }
    console.log('OK');
  } else {
    fs.writeFileSync(OUT, text);
    console.log('首都', rows.length, '一言あり', rows.filter((r) => r[3].length).length, '一言', rows.reduce((n, r) => n + r[3].length, 0), '突き合わせられず', unmatched.length);
  }
}
