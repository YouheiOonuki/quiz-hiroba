// 百人一首の読み上げの音声を作る（yorozu-plans ROADMAP 7.36.1 K140、企画書 84）。
//   npm i --no-save lamejs@1.2.1 && node tools/build-hyakunin-audio.mjs          … 全部（序歌＋100 首の上の句・下の句 = 202 個）
//   node tools/build-hyakunin-audio.mjs --only 1,4,17                              … 指定の番号だけ作り直す
// 読ませるのは hyakunin-data.js の「読み」の列（kamiYomi・shimoYomi。読手テキストのふりがなから作った現代の読み）。
// 出力: hyakunin/audio/NNN-kami.mp3・NNN-shimo.mp3（NNN は 000 が序歌）と hyakunin/audio/index.json（大きさ・秒・作った日）
import { writeFileSync, readFileSync, mkdirSync, existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { speakMp3, pool } from './tts-mp3.mjs';

const KU_GAP = 0.4; // 句の間の無音（秒）。0.5 は「気持ち長い」（オーナーの耳 2026-10-11）。ページの初期の速さ 0.75 では約 0.45 秒に伸びる
const H = createRequire(import.meta.url)('../hyakunin-data.js');
const dir = new URL('../hyakunin/audio/', import.meta.url);
mkdirSync(dir, { recursive: true });
const onlyArg = process.argv.indexOf('--only');
const only = onlyArg > 0 ? new Set(process.argv[onlyArg + 1].split(',').map(Number)) : null;
const poems = [H.JOKA, ...H.poems].filter((p) => !only || only.has(p.n));
const jobs = poems.flatMap((p) => ['kami', 'shimo'].map((part) => ({ key: String(p.n).padStart(3, '0') + '-' + part, text: p[part + 'Yomi'] })));

const idxFile = new URL('index.json', dir);
const index = existsSync(idxFile) ? JSON.parse(readFileSync(idxFile, 'utf8')) : { model: '@cf/myshell-ai/melotts', format: 'mp3 32kbps 16kHz mono', source: 'hyakunin-data.js の kamiYomi・shimoYomi', files: {} };
await pool(jobs, 4, async (j) => {
  // 句ごとに読ませて、句の間に KU_GAP 秒の間（5・7・5 と 7・7 の区切り。オーナーの耳 2026-10-11: 区切りが無いのはどうか）
  const { mp3, seconds } = await speakMp3(j.text.split(/\s+/), KU_GAP);
  writeFileSync(new URL(j.key + '.mp3', dir), mp3);
  index.files[j.key] = { bytes: mp3.length, seconds: Math.round(seconds * 10) / 10 };
  process.stdout.write('.');
});
index.made = new Date().toISOString().slice(0, 10);
index.files = Object.fromEntries(Object.entries(index.files).sort());
writeFileSync(idxFile, JSON.stringify(index, null, 1) + '\n');
const total = Object.values(index.files).reduce((a, x) => a + x.bytes, 0);
console.log(`\n${jobs.length} 個を作った。全部で ${Object.keys(index.files).length} 個、${(total / 1024 / 1024).toFixed(2)} MB`);
