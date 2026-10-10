// 百人一首の AI の声（yorozu-plans ROADMAP 7.36.1 K140）: 録音がそろっている・大きさが上限内・利用時に AI を呼ばない・ページの最初の読み込みに入らない
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const H = require('../hyakunin-data.js');

const ROOT = path.join(__dirname, '..');
const DIR = path.join(ROOT, 'hyakunin', 'audio');
const INDEX = JSON.parse(fs.readFileSync(path.join(DIR, 'index.json'), 'utf8'));

test('録音: 序歌と 100 首の上の句・下の句（202 個）がそろい、index.json と大きさが合う', () => {
  const want = [0, ...H.poems.map((p) => p.n)].flatMap((n) => ['kami', 'shimo'].map((part) => String(n).padStart(3, '0') + '-' + part));
  assert.equal(want.length, 202);
  assert.deepEqual(Object.keys(INDEX.files).sort(), want.sort());
  for (const k of want) {
    const f = path.join(DIR, k + '.mp3');
    assert.ok(fs.existsSync(f), k);
    assert.equal(fs.statSync(f).size, INDEX.files[k].bytes, k);
    const head = fs.readFileSync(f).subarray(0, 3);
    assert.ok(head.toString('latin1') === 'ID3' || (head[0] === 0xff && (head[1] & 0xe0) === 0xe0), k + ' は mp3');
  }
  assert.equal(INDEX.source, 'hyakunin-data.js の kamiYomi・shimoYomi', '読ませたのは現代の読みの列');
});

test('大きさ: 合計がリポジトリの上限（25 MB）よりずっと小さい', () => {
  const total = Object.values(INDEX.files).reduce((a, x) => a + x.bytes, 0);
  assert.ok(total < 25 * 1024 * 1024, `${(total / 1024 / 1024).toFixed(2)} MB`);
});

test('利用時に AI を呼ばない: 画面の JS に Workers AI・外のサーバーへの送信が無い。録音は相対パスで読む', () => {
  const ui = fs.readFileSync(path.join(ROOT, 'yomiage-ui.js'), 'utf8');
  assert.doesNotMatch(ui, /ai\/run|workers\.dev|api\.cloudflare|fetch\(/);
  assert.match(ui, /new Audio\('audio\/' \+ key \+ '\.mp3'\)/);
});

test('ページの最初の読み込みは変わらない: HTML に audio 要素も mp3 への参照も無い（押したときに Audio で読む）。「現代の読み」の 1 行がある', () => {
  const html = fs.readFileSync(path.join(ROOT, 'hyakunin', 'index.html'), 'utf8');
  assert.doesNotMatch(html, /<audio|\.mp3|rel="preload"/);
  assert.ok(html.includes('読み上げは現代の読みです'));
  assert.ok(html.includes('id="opt-voicekind"'));
});
