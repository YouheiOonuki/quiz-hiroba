// 共有される結果（yorozu-plans K124・企画書 60）の着地ページを作る（クイズ広場の題材ごとに 1 つ）
//   node tools/build-share.mjs          作る（<題材>/s/index.html）
//   node tools/build-share.mjs --check  今のファイルと同じかだけを確かめる（tests から呼ぶ）
// 結果の種類 = 題材（6 つ。12 以内）。OG 画像（<題材>/s/og.png）は tools/make-share-og.mjs（Playwright）で作る
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { stubHtml, ogHtml, writeAll } from './share-stub.mjs';
import { loadTopics } from './build-pages.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SITE = 'https://yorozu-craft.com/quiz-hiroba/';

export function pages() {
  return loadTopics().map((t) => ({
    file: `${t.id}/s/index.html`, image: `${t.id}/s/og.png`,
    stub: stubHtml({
      title: `${t.page.h1}に挑戦｜クイズ広場`, desc: `${t.page.h1}の同じ問題でちょうせん。送った人の正解数と比べられます。`,
      url: `${SITE}${t.id}/s/`, image: `${SITE}${t.id}/s/og.png`, back: '../', canonical: `${SITE}${t.id}/`, open: `${t.page.h1}を開く`,
    }),
    og: ogHtml({ kicker: 'クイズ広場', big: t.page.h1, small: '同じ問題でちょうせん', url: `yorozu-craft.com/quiz-hiroba/${t.id}/`,
      bg: '#fff8e7', fg: '#3b2f1e', accent: '#b5491f', bigSize: 80 }),
  }));
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const check = process.argv.includes('--check');
  const diff = writeAll(ROOT, Object.fromEntries(pages().map((p) => [p.file, p.stub])), check);
  if (check && diff.length) { console.error('作り直しが要る: ' + diff.join(', ')); process.exit(1); }
  console.log(check ? 'OK' : `書いた ${diff.length} 件`);
}
