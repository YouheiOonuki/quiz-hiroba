// 首都の「おお」の一言（K122）のための Wikidata（CC0 1.0）の写し（スナップショット）を取る
//
//   node tools/fetch-wikidata-shuto.mjs [YYYY-MM-DD]
//
// ネットワークを使うのはこれだけ。結果は data/wikidata-shuto.json（取得日・各項目の版 lastrevid つき）に書き、コミットする。
// 一言の文（ooh-shuto.js）は tools/build-ooh-shuto.mjs がこの写しだけから機械で作る（ネットワークを使わない。同じ写しなら同じ結果）。
//
// 取るもの:
//   1. 国: ISO 3166-1 の 2 文字（P297。国旗クイズ topics/kokki.js の CODE と同じ）→ 国の Q 番号と、その国の首都（P36）の文（版・開始 P580・終了 P582 つき）
//   2. 首都の候補（1 の P36 の値すべて）: ラベルと別名（ja・en）、P571（創設）・P138（名前の由来）・P206（そばの水域）・P2044（標高）・P1448（公式名）
//      の文（版・修飾子・参照の種類）。項目の版 lastrevid
//   3. 2 が指す項目（名前の由来・水域）: ラベル（ja・en）と P31（何の一種か）
// 使うのは公開のエンドポイント（query.wikidata.org/sparql、www.wikidata.org/w/api.php）。curl で取る（作業環境のプロキシに従う）
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const OUT = path.join(ROOT, 'data/wikidata-shuto.json');
const UA = 'yorozu-craft-quiz-hiroba/1.0 (https://yorozu-craft.com/quiz-hiroba/; snapshot for a quiz)';
const RETRIEVED = process.argv[2] || new Date().toISOString().slice(0, 10);
const CAP_PROPS = ['P571', 'P138', 'P206', 'P2044', 'P1448'];
// 同じ ISO の 2 文字を持つ項目が 2 つあるときの国の Q 番号（キプロスは島の項目 Q644636 にも CY がある）
const COUNTRY_OVERRIDE = { CY: 'Q229' };

function get(url) {
  // 429（混んでいる）のときは curl が待ってやり直す（Retry-After に従う。最大 6 回）
  const out = execFileSync('curl', ['-sS', '--fail', '--retry', '6', '--retry-delay', '20', '-H', 'User-Agent: ' + UA, '-H', 'Accept: application/json', url], { maxBuffer: 1 << 28 });
  return JSON.parse(out.toString('utf8'));
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function sparql(q) {
  return get('https://query.wikidata.org/sparql?format=json&query=' + encodeURIComponent(q)).results.bindings;
}
async function entities(ids, props) {
  const out = {};
  for (let i = 0; i < ids.length; i += 50) {
    const part = ids.slice(i, i + 50);
    const j = get('https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&languages=ja|en&props=' + props + '&ids=' + part.join('|'));
    Object.assign(out, j.entities);
    await sleep(500);
  }
  return out;
}

const qid = (uri) => uri.replace('http://www.wikidata.org/entity/', '');
const timeOf = (v) => v && v.datavalue ? { time: v.datavalue.value.time, precision: v.datavalue.value.precision } : null;

/** 文を小さくする: 値・ランク・修飾子（時間の P580/P582/P585 は値も、ほかは番号だけ）・参照（参照ごとの番号の並び） */
function slimClaim(c) {
  const s = c.mainsnak;
  let value = null;
  if (s.snaktype === 'value') {
    const v = s.datavalue.value;
    switch (s.datatype) {
      case 'wikibase-item': value = v.id; break;
      case 'time': value = { time: v.time, precision: v.precision }; break;
      case 'quantity': value = { amount: v.amount, unit: v.unit.replace('http://www.wikidata.org/entity/', '') }; break;
      case 'monolingualtext': value = { text: v.text, language: v.language }; break;
      default: value = v;
    }
  } else value = { snaktype: s.snaktype };
  const q = c.qualifiers || {};
  const qualifiers = {};
  for (const p of Object.keys(q).sort()) {
    qualifiers[p] = q[p].map((x) => (['P580', 'P582', 'P585'].includes(p) ? timeOf(x) : x.snaktype === 'value' && x.datavalue.value.id ? x.datavalue.value.id : x.snaktype));
  }
  const references = (c.references || []).map((r) => Object.keys(r.snaks).sort());
  return { id: c.id, rank: c.rank, value, qualifiers, references };
}

async function main() {
  const shuto = require(path.join(ROOT, 'topics/shuto.js'));
  const kokki = require(path.join(ROOT, 'topics/kokki.js'));
  const codeOf = Object.fromEntries(kokki.items.map((it) => [it.id, it.code]));
  const iso = Object.fromEntries(shuto.items.map((it) => [it.id, codeOf[it.id].toUpperCase()]));
  const values = [...new Set(Object.values(iso))].sort().map((c) => '"' + c + '"').join(' ');

  // 1. 国と首都の文（P36 の文を SPARQL で 1 回。国の項目は大きいので丸ごとは取らない。版は wbgetentities の info で）
  const T = (v) => `OPTIONAL { ?st pqv:${v} ?${v}v . ?${v}v wikibase:timeValue ?${v} ; wikibase:timePrecision ?${v}p }`;
  const rows = sparql(`SELECT ?iso ?country ?st ?cap ?rank ?P580 ?P580p ?P582 ?P582p WHERE { VALUES ?iso { ${values} } ?country wdt:P297 ?iso . ?country p:P36 ?st . ?st ps:P36 ?cap ; wikibase:rank ?rank . ${T('P580')} ${T('P582')} }`);
  const byIso = {};
  for (const b of rows) (byIso[b.iso.value] = byIso[b.iso.value] || new Set()).add(qid(b.country.value));
  const countryQ = {};
  for (const k of Object.keys(byIso).sort()) countryQ[k] = COUNTRY_OVERRIDE[k] || (byIso[k].size === 1 ? [...byIso[k]][0] : null);
  const cIds = [...new Set(Object.values(countryQ).filter(Boolean))].sort();
  const countryInfo = await entities(cIds, 'info|labels');
  const RANK = { 'http://wikiba.se/ontology#PreferredRank': 'preferred', 'http://wikiba.se/ontology#NormalRank': 'normal', 'http://wikiba.se/ontology#DeprecatedRank': 'deprecated' };
  const tv = (b, p) => b[p] ? { time: (b[p].value.startsWith('-') ? '' : '+') + b[p].value, precision: Number(b[p + 'p'].value) } : null;
  const countries = {};
  for (const c of cIds) {
    const st = rows.filter((b) => qid(b.country.value) === c).map((b) => ({
      id: b.st.value.replace('http://www.wikidata.org/entity/statement/', ''), rank: RANK[b.rank.value], value: qid(b.cap.value),
      start: tv(b, 'P580'), end: tv(b, 'P582') }));
    st.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
    countries[c] = { rev: countryInfo[c].lastrevid, ja: countryInfo[c].labels.ja ? countryInfo[c].labels.ja.value : null,
      en: countryInfo[c].labels.en ? countryInfo[c].labels.en.value : null, P36: st };
  }

  // 2. 首都の候補
  const capIds = [...new Set(Object.values(countries).flatMap((c) => c.P36.map((s) => s.value)).filter((v) => typeof v === 'string'))].sort();
  const capEnt = await entities(capIds, 'info|labels|aliases|claims');
  const capitals = {};
  const linked = new Set();
  for (const q of capIds) {
    const e = capEnt[q];
    const claims = {};
    for (const p of CAP_PROPS) {
      claims[p] = (e.claims && e.claims[p] ? e.claims[p] : []).map(slimClaim);
      if (p === 'P138' || p === 'P206') claims[p].forEach((s) => typeof s.value === 'string' && linked.add(s.value));
    }
    capitals[q] = { rev: e.lastrevid, ja: e.labels.ja ? e.labels.ja.value : null, en: e.labels.en ? e.labels.en.value : null,
      jaAliases: (e.aliases && e.aliases.ja ? e.aliases.ja.map((a) => a.value) : []), claims };
  }

  // 3. 指す先のラベルと P31
  const lIds = [...linked].sort();
  const lEnt = await entities(lIds, 'info|labels|claims');
  const labels = {};
  for (const q of lIds) {
    const e = lEnt[q];
    if (!e || e.missing !== undefined) continue;
    labels[q] = { rev: e.lastrevid, ja: e.labels && e.labels.ja ? e.labels.ja.value : null, en: e.labels && e.labels.en ? e.labels.en.value : null,
      P31: (e.claims && e.claims.P31 ? e.claims.P31 : []).filter((c) => c.mainsnak.snaktype === 'value').map((c) => c.mainsnak.datavalue.value.id).sort() };
  }

  const snap = {
    source: 'Wikidata（https://www.wikidata.org/）。データは CC0 1.0（https://creativecommons.org/publicdomain/zero/1.0/）',
    retrieved: RETRIEVED,
    endpoints: ['https://query.wikidata.org/sparql', 'https://www.wikidata.org/w/api.php'],
    iso,
    countryQ,
    countries,
    capitals,
    labels,
  };
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(snap, null, 1) + '\n');
  console.log('国', cIds.length, '首都の候補', capIds.length, '指す先', Object.keys(labels).length, '→', path.relative(ROOT, OUT));
}

main().catch((e) => { console.error(e); process.exit(1); });
