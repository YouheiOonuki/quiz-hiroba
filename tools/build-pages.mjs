// 題材のデータ（topics/*.js）から、題材のページと一覧を作る
//
//   node tools/build-pages.mjs          作る（ファイルを書き換える）
//   node tools/build-pages.mjs --check  作ったものと今のファイルが同じかだけを確かめる（tests から呼ぶ）
//
// 作るもの:
//   <題材>/index.html            tools/page-template.html に題材の page の値を入れたもの
//   index.html の TOPICS / TOPIC-SCRIPTS の間   入口の一覧と、読み込む題材のファイル
//   print/index.html の TOPICS の間   印刷物のクレジットの着地ページの一覧
//   sitemap.xml                  入口・使い方・各題材
//   sw.js の PRECACHE の間        オフライン用に最初に取っておくファイル
// 題材のほかに、手で書いたページ（EXTRA_PAGES。百人一首の読み上げ /hyakunin/、早押しボタン /hayaoshi/）も入口の一覧・sitemap・sw.js に入れる。
// 題材が別のデータファイルを使うときは page.deps に並べる（例: 決まり字クイズの hyakunin-data.js）。題材のページ・入口・sw.js が読み込む
// 題材の page に big（大きな字）・noAds（広告なしの定型文。D118）・cards（回想法カードの印刷）・guide（題材だけの使い方ページ。sitemap と sw.js にも入る）を書ける（例: 昭和クイズ）
// 題材を足すとき: topics/<題材>.js を書いて、これを実行するだけ（README「題材を足す」）
// 依存パッケージなし（Node 20 以上）
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const CHECK = process.argv.includes('--check');
const BASE = 'https://yorozu-craft.com/quiz-hiroba/';

// 手で書いたページ（題材ではないもの）。入口のカード・sitemap・sw.js の最初に取っておくファイルに入る
export const EXTRA_PAGES = [
  { path: 'hyakunin/', icon: '🎴', h1: '百人一首 読み上げ', hub: '100首を端末の声で。ランダム・番号順・序歌・間隔・残り枚数', order: 2.5,
    files: ['hyakunin-data.js', 'yomiage.js', 'yomiage-ui.js', 'hyakunin/guide.html'] },
  { path: 'hayaoshi/', icon: '🔔', h1: '早押しボタン（クイズ大会セット）', hub: '1台を2〜4人で。正解・不正解の音、ドラムロール、得点。問題も出せる', order: 6,
    files: ['hayaoshi.js', 'hayaoshi-ui.js', 'hayaoshi/guide.html'] },
];

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function loadTopics() {
  return fs.readdirSync(path.join(ROOT, 'topics'))
    .filter((f) => f.endsWith('.js'))
    .map((f) => require(path.join(ROOT, 'topics', f)))
    .sort((a, b) => (a.page.order - b.page.order) || a.id.localeCompare(b.id));
}

function lastmod() {
  // sitemap の日付は、いまの sitemap.xml の値を引き継ぐ（--check で日付だけが違って失敗しないように）
  const s = fs.readFileSync(path.join(ROOT, 'sitemap.xml'), 'utf8');
  const m = /<lastmod>(\d{4}-\d{2}-\d{2})<\/lastmod>/.exec(s);
  return m ? m[1] : new Date().toISOString().slice(0, 10);
}

export function build() {
  const topics = loadTopics();
  const out = {};
  const tpl = fs.readFileSync(path.join(ROOT, 'tools', 'page-template.html'), 'utf8');
  for (const t of topics) {
    if (!/^[a-z0-9-]+$/.test(t.id)) throw new Error('題材の id は英小文字・数字・ハイフンだけ: ' + t.id);
    const ld = {
      '@context': 'https://schema.org',
      '@type': 'WebApplication',
      name: t.page.h1,
      description: t.page.description,
      url: BASE + t.id + '/',
      applicationCategory: 'EducationalApplication',
      operatingSystem: 'All',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'JPY' },
      inLanguage: 'ja',
      isPartOf: { '@type': 'WebSite', name: 'クイズ広場', url: BASE },
    };
    out[t.id + '/index.html'] = tpl
      .replaceAll('{{ID}}', t.id)
      .replaceAll('{{TITLE}}', esc(t.page.title))
      .replaceAll('{{DESC}}', esc(t.page.description))
      .replaceAll('{{H1}}', esc(t.page.h1))
      .replaceAll('{{LEAD}}', esc(t.page.lead))
      .replaceAll('{{NOTE}}', esc(t.page.note || ''))
      .replaceAll('{{ADNOTE}}', t.page.noAds
        ? '<!-- Google AdSense: 高齢者向けのページなので広告なし。meta（サイト所有確認）だけ。使い方（' + t.page.guide + '）も同じ（yorozu-plans D118） -->'
        : '<!-- Google AdSense: 遊ぶ画面なので meta（サイト所有確認）だけ。広告は使い方ページ（guide.html）に出す（todofuken-quiz の D18 と同じ。企画書 27 の D122） -->')
      .replaceAll('{{BODYCLASS}}', t.page.big ? ' class="big"' : '')
      .replaceAll('{{NOADS}}', t.page.noAds ? '\n    <p class="noads">このページは広告なし・登録なし・入力は端末の外に出ません。</p>' : '')
      .replaceAll('{{GUIDE}}', t.page.guide ? '../' + t.page.guide : '../guide.html')
      .replaceAll('{{GUIDETEXT}}', t.page.guide ? '使い方・回想法カードの使い方・出典' : '使い方・入力の決まり・よくある質問')
      .replaceAll('{{CARDS}}', t.page.cards ? '\n        <label class="weak-row"><input type="checkbox" id="print-cards"> 回想法カードにする（1枚に6問。点線で折ると答えがかくれる）</label>' : '')
      .replaceAll('{{DEPS}}', (t.page.deps || []).map((d) => `<script src="../${d}"></script>\n  `).join(''))
      .replaceAll('{{JSONLD}}', JSON.stringify(ld, null, 2).replace(/</g, '\\u003c').split('\n').join('\n  '));
  }

  let hub = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const entries = [
    ...topics.map((t) => ({ order: t.page.order, html: `      <li class="card topic"><a href="./${t.id}/"><span class="topic-icon" aria-hidden="true">${esc(t.page.icon)}</span><span class="topic-name">${esc(t.page.h1)}</span><span class="topic-desc">${esc(t.page.hub)}</span><span class="topic-rec" data-topic="${t.id}"></span></a></li>` })),
    ...EXTRA_PAGES.map((x) => ({ order: x.order, html: `      <li class="card topic"><a href="./${x.path}"><span class="topic-icon" aria-hidden="true">${esc(x.icon)}</span><span class="topic-name">${esc(x.h1)}</span><span class="topic-desc">${esc(x.hub)}</span></a></li>` })),
  ].sort((a, b) => a.order - b.order);
  const cards = entries.map((e) => e.html).join('\n');
  hub = hub.replace(/(<!-- TOPICS-BEGIN -->\n)[\s\S]*?(\s*<!-- TOPICS-END -->)/, `$1    <ul class="topics">\n${cards}\n    </ul>$2`);
  const deps = [...new Set(topics.flatMap((t) => t.page.deps || []))];
  const scripts = [...deps.map((d) => `  <script src="./${d}"></script>`), ...topics.map((t) => `  <script src="./topics/${t.id}.js"></script>`)].join('\n');
  hub = hub.replace(/(<!-- TOPIC-SCRIPTS-BEGIN -->\n)[\s\S]*?([ \t]*<!-- TOPIC-SCRIPTS-END -->)/, `$1${scripts}\n$2`);
  out['index.html'] = hub;

  // 印刷物のクレジットの着地ページ（print/。noindex）にも同じ並びで
  let landing = fs.readFileSync(path.join(ROOT, 'print', 'index.html'), 'utf8');
  const lcards = topics.map((t) => `      <li class="card topic"><a href="../${t.id}/"><span class="topic-icon" aria-hidden="true">${esc(t.page.icon)}</span><span class="topic-name">${esc(t.page.h1)}</span><span class="topic-desc">プリントの続きを画面で</span></a></li>`).join('\n');
  landing = landing.replace(/(<!-- TOPICS-BEGIN -->\n)[\s\S]*?(\s*<!-- TOPICS-END -->)/, `$1    <ul class="topics">\n${lcards}\n    </ul>$2`);
  out['print/index.html'] = landing;

  const lm = lastmod();
  const urls = [['', '1.0'], ...topics.flatMap((t) => [[t.id + '/', '0.9'], ...(t.page.guide ? [[t.page.guide, '0.6']] : [])]), ...EXTRA_PAGES.flatMap((x) => [[x.path, '0.9'], ...x.files.filter((f) => f.endsWith('.html')).map((f) => [f, '0.6'])]), ['guide.html', '0.6']];
  out['sitemap.xml'] = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    urls.map(([u, p]) => `  <url>\n    <loc>${BASE}${u}</loc>\n    <lastmod>${lm}</lastmod>\n    <changefreq>monthly</changefreq>\n    <priority>${p}</priority>\n  </url>\n`).join('') +
    '</urlset>\n';

  let sw = fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8');
  const pre = ['./', './index.html', './guide.html', './style.css', './constants.js', './calc.js', './quiz.js', './hub.js',
    ...[...new Set(topics.flatMap((t) => t.page.deps || []))].map((d) => `./${d}`),
    ...topics.flatMap((t) => [`./${t.id}/`, `./topics/${t.id}.js`, ...(t.page.guide ? [`./${t.page.guide}`] : [])]),
    ...EXTRA_PAGES.flatMap((x) => [`./${x.path}`, ...x.files.filter((f) => !topics.some((t) => (t.page.deps || []).includes(f))).map((f) => `./${f}`)]),
    './manifest.webmanifest', './favicon.svg', './apple-touch-icon.png'];
  sw = sw.replace(/(\/\/ PRECACHE-BEGIN[^\n]*\n)[\s\S]*?([ \t]*\/\/ PRECACHE-END)/, `$1${pre.map((u) => `  '${u}',\n`).join('')}$2`);
  out['sw.js'] = sw;
  return out;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const out = build();
  const diff = [];
  for (const [rel, text] of Object.entries(out)) {
    const p = path.join(ROOT, rel);
    const cur = fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : null;
    if (cur === text) continue;
    diff.push(rel);
    if (!CHECK) { fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, text); }
  }
  if (CHECK && diff.length) { console.error('作り直しが必要: ' + diff.join(', ') + '（node tools/build-pages.mjs）'); process.exit(1); }
  console.log(CHECK ? 'OK: 作ったものと同じです' : (diff.length ? '書き換えた: ' + diff.join(', ') : '変更なし'));
}
