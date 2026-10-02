// 公開データ（CC0）の書き出し: 「おお」の一言（元素・世界の首都）を data/genso.json と data/shuto.json にする（yorozu-plans ROADMAP 7.17 の K133）
//   node tools/build-data.mjs          書き出す
//   node tools/build-data.mjs --check  書き出した結果とファイルが違えば終了コード 1（tests/opendata.test.js と同じ確認）
// data/genso.json・data/shuto.json は手で直さない。文は ooh.js が ooh-genso.js・ooh-shuto.js から作ったもの（画面と同じ関数 factsFor）を、
// 名前は topics/genso.js・topics/shuto.js を、出典と確認日は constants.js と各データファイルを使う。
// generated（生成日。ACCEPTANCE 7.10.3 e）: 中身（generated を除く）が今のファイルと同じなら、今のファイルの generated をそのまま使う。
//   中身が変わったときだけ、その日（日本時間。環境変数 GENERATED=YYYY-MM-DD で指定もできる）になる（seido-keisan の tools/build-data.mjs と同じ決まり）
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const require = createRequire(import.meta.url);
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const Ooh = require(join(root, 'ooh.js'));
const C = require(join(root, 'constants.js'));
const GENSO = require(join(root, 'ooh-genso.js'));
const SHUTO = require(join(root, 'ooh-shuto.js'));
const gensoTopic = require(join(root, 'topics/genso.js'));
const shutoTopic = require(join(root, 'topics/shuto.js'));

const SITE = 'https://yorozu-craft.com/quiz-hiroba/';
const DATA_URL = SITE + 'data/';
const REPO_URL = 'https://github.com/YouheiOonuki/quiz-hiroba';
const SET = { genso: GENSO, shuto: SHUTO };
const head = (title, file, page) => ({
  title,
  license: 'CC0-1.0',
  license_url: 'https://creativecommons.org/publicdomain/zero/1.0/deed.ja',
  publisher: 'yorozu-craft（Youhei Oonuki）',
  homepage: SITE + page,
  data_url: DATA_URL + file,
  repository: REPO_URL,
});
const fact = f => ({ kind: f.kind, text: f.text, source: { label: f.src.label, url: f.src.url } });
const uniq = a => [...new Set(a)];

// 日本時間の今日（YYYY-MM-DD）。GENERATED があればそれ
export function today() {
  const g = process.env.GENERATED;
  if (g && /^\d{4}-\d{2}-\d{2}$/.test(g)) return g;
  return new Date(Date.now() + 9 * 3600000).toISOString().slice(0, 10);
}

export function buildGenso(generated = today()) {
  const items = gensoTopic.items.map(it => ({
    n: it.n, symbol: it.sym, ja: it.ja, ...(it.yomi ? { yomi: it.yomi } : {}), en: it.en,
    period: Ooh.period(it.n), group: Ooh.group(it.n) || null,
    facts: Ooh.factsFor('genso', it, SET).map(fact),
  }));
  const factUrls = items.flatMap(it => it.facts.map(f => f.source.url));
  const data = {
    ...head('元素の「おお」の一言（118 元素の名前の由来・発見・周期表の位置）', 'genso.json', 'genso/'),
    generated_from: 'ooh-genso.js（事実と出典）・ooh.js（文にする規則）・topics/genso.js（記号と名前）を tools/build-data.mjs で書き出し',
    checked: [GENSO.checked, C.genso.checked].sort().at(-1),
    generated,
    source: uniq([...C.genso.urls, ...factUrls.map(u => u.replace(/^(https:\/\/[^/]+\/).*$/, (m, h) => (/ciaaw|lanl/.test(h) ? h : m)))]),
    note: '名前・記号は IUPAC の周期表と日本化学会「原子量表（2026）」。一言は各行の source の原文に書いてあることだけを短い日本語にしたもの（1 文 40 字以内、人口・順位など変わるものは書かない）。group はランタノイド・アクチノイドで null。',
    items,
  };
  return JSON.stringify(data, null, 2) + '\n';
}

export function buildShuto(generated = today()) {
  const byId = Object.fromEntries(SHUTO.rows.map(r => [r[0], r]));
  const items = shutoTopic.items.map(it => {
    const r = byId[it.id];
    return {
      id: it.id, country: it.country, capital: it.capital,
      ...(r ? { wikidata: r[1], wikidata_revision: r[2] } : {}),
      facts: Ooh.factsFor('shuto', it, SET).map(fact),
    };
  });
  const data = {
    ...head('世界の首都の「おお」の一言（名前の由来・創設の年・そばの水域・昔の公式名）', 'shuto.json', 'shuto/'),
    generated_from: 'data/wikidata-shuto.json（Wikidata の写し）→ ooh-shuto.js（tools/build-ooh-shuto.mjs）→ ooh.js の文の規則を tools/build-data.mjs で書き出し',
    checked: SHUTO.retrieved,
    checked_detail: { wikidata_retrieved: SHUTO.retrieved, country_and_capital_names: C.shuto.checked },
    generated,
    source: ['https://www.wikidata.org/', C.shuto.url],
    note: '一言は Wikidata（CC0）の値から機械で作った文（各 fact の source が Q 番号と属性）。国名・首都の表記は外務省「国・地域」の基礎データのまま。Wikidata の首都と外務省の表記が突き合わせられない国（unmatched）は一言なし。人口・面積など変わるものは入れない。',
    unmatched: SHUTO.unmatched,
    items,
  };
  return JSON.stringify(data, null, 2) + '\n';
}

// 今のファイルの generated（無ければ null）
export function generatedOf(text) {
  const m = text && text.match(/"generated": "(\d{4}-\d{2}-\d{2})"/);
  return m ? m[1] : null;
}
// 中身が同じなら今の generated を残し、変わったときだけ今日にする
export function stamp(build, now) {
  const prev = generatedOf(now);
  if (prev && build(prev) === now) return now;
  return build(today());
}
const read = rel => { const f = join(root, rel); return existsSync(f) ? readFileSync(f, 'utf8') : null; };
export function outputs() {
  return {
    'data/genso.json': stamp(buildGenso, read('data/genso.json')),
    'data/shuto.json': stamp(buildShuto, read('data/shuto.json')),
  };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const check = process.argv.includes('--check');
  let bad = 0;
  for (const [rel, body] of Object.entries(outputs())) {
    const now = read(rel);
    if (now === body) { console.log(rel + ': 変更なし'); continue; }
    if (check) { console.error(rel + ' が元のデータと合っていない。node tools/build-data.mjs を実行する'); bad++; }
    else { writeFileSync(join(root, rel), body); console.log(rel + ' を書き出した'); }
  }
  if (bad) process.exit(1);
}
