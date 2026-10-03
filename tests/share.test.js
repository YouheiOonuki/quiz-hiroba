// 共有される結果（yorozu-plans K124・企画書 60、ACCEPTANCE 3 章「束 B」）
// ちょうせんのリンク（#s=）に日時を足す、題材ごとの着地ページと OG 画像（6 枚、12 以内）、結果カードの部品
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const Calc = require('../calc.js');
const ShareCard = require('../share-card.js');

const ROOT = path.join(__dirname, '..');
const read = (r) => fs.readFileSync(path.join(ROOT, r), 'utf8');
const TOPICS = fs.readdirSync(path.join(ROOT, 'topics')).filter((f) => f.endsWith('.js')).map((f) => require(path.join(ROOT, 'topics', f)));
const AT = Date.parse('2026-10-02T12:04:00Z');

test('ちょうせんのリンク: 日時（UNIX 秒）が入り、読むと同じ日時。範囲の外の日時は捨てる', () => {
  const t = TOPICS.find((x) => x.id === 'genso');
  const opt = { kind: t.kinds[0].key, mode: 'choice', filters: {}, count: 10, seed: 1234 };
  const h = Calc.challengeToLink(t, opt, 8, AT);
  const o = Calc.fromShareHash(h, t);
  assert.equal(o.score, 8);
  assert.equal(o.at, AT);
  assert.equal(o.seed, 1234);
  // 日時なし（前からのリンク）も読める
  assert.equal(Calc.fromShareHash(Calc.challengeToLink(t, opt, 8), t).at, undefined);
  const bad = '#s=' + Buffer.from(JSON.stringify({ t: 'genso', k: opt.kind, n: 10, s: 5, p: 3, d: 12 })).toString('base64url');
  assert.equal(Calc.fromShareHash(bad, t).at, undefined);
  // 中身は題材・出し方・種・正解数・日時だけ（名前・答えは入らない）
  const json = JSON.parse(Buffer.from(h.slice(3), 'base64url').toString());
  assert.deepEqual(Object.keys(json).sort(), ['d', 'f', 'k', 'm', 'n', 'p', 's', 't']);
});

test('着地ページと OG 画像: 題材ごとに 1 つ（12 以内）、1200×630、noindex・広告スクリプトなし・すぐ題材の画面へ', () => {
  assert.ok(TOPICS.length <= 12);
  for (const t of TOPICS) {
    assert.deepEqual(fs.readdirSync(path.join(ROOT, t.id, 's')).sort(), ['index.html', 'og.png']);
    const b = fs.readFileSync(path.join(ROOT, t.id, 's', 'og.png'));
    assert.deepEqual([b.readUInt32BE(16), b.readUInt32BE(20)], [1200, 630]);
    const s = read(t.id + '/s/index.html');
    assert.match(s, /<meta name="robots" content="noindex">/);
    assert.ok(s.includes(`<meta property="og:image" content="https://yorozu-craft.com/quiz-hiroba/${t.id}/s/og.png">`));
    assert.ok(s.includes('<script>location.replace("../" + location.hash);</script>'));
    assert.doesNotMatch(s, /adsbygoogle|pagead2|github\.com|x\.com|note\.com/);
    assert.equal((s.match(/beacon\.min\.js/g) || []).length, 1);
    assert.ok(!read('sitemap.xml').includes(`${t.id}/s/`), 'sitemap に載せない');
    const page = read(t.id + '/index.html');
    assert.ok(page.includes('<script src="../share-card.js"></script>') && page.includes('id="share-host"') && page.includes('id="challenge-card"'), t.id);
  }
  execFileSync(process.execPath, [path.join(ROOT, 'tools', 'build-share.mjs'), '--check']);
});

test('結果カードの部品: 外向きの要求なし・演出は 1 つで reduced-motion で止まる', () => {
  const s = read('share-card.js');
  assert.doesNotMatch(s, /https?:\/\//);
  assert.doesNotMatch(s, /\bfetch\(|XMLHttpRequest|sendBeacon|<script|\.src\s*=/);
  assert.equal((s.match(/@keyframes/g) || []).length, 1);
  assert.match(s, /@media \(prefers-reduced-motion:reduce\)\{\.share-card\{animation:none\}\}/);
  assert.equal(ShareCard.fmtWhen(AT, 'Asia/Tokyo'), '2026年10月2日 21:04');
  assert.match(read('quiz.js'), /https:\/\/yorozu-craft\.com\/quiz-hiroba\/' \+ TOPIC\.id \+ '\/s\/'/);
});
