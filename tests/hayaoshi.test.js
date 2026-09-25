// 早押しボタン（hayaoshi.js）の判定と得点: node --test tests/*.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const H = require('../hayaoshi.js');

test('最初に押した 1 人だけが受け付けられ、ほかはロックされる', () => {
  let g = H.newGame(4, 0);
  let r = H.press(g, 2);
  assert.equal(r.accepted, true);
  g = r.state;
  assert.equal(g.winner, 2);
  assert.equal(g.phase, 'locked');
  for (const p of [0, 1, 3, 2]) {
    const x = H.press(g, p);
    assert.equal(x.accepted, false, p + ' はロック');
    assert.equal(x.reason, 'locked');
    assert.equal(x.state, g, '状態は変わらない');
  }
});

test('同じ瞬間に届いた押しは、届いた順（press を呼んだ順）で先の人が勝つ', () => {
  // 画面は指ごとに pointerdown を 1 つずつ知らせる。同じフレームの 2 本の指も、先に処理したほうが勝ち
  let g = H.newGame(2, 0);
  const order = [1, 0];
  const results = order.map((p) => { const r = H.press(g, p); g = r.state; return r.accepted; });
  assert.deepEqual(results, [true, false]);
  assert.equal(g.winner, 1);
});

test('正解で +1、その問題はおしまい。つぎの問題で受付を再開', () => {
  let g = H.press(H.newGame(3, 0), 1).state;
  g = H.correct(g);
  assert.deepEqual(g.scores, [0, 1, 0]);
  assert.equal(g.phase, 'done');
  assert.equal(g.right, 1);
  assert.equal(g.winner, null);
  assert.equal(H.press(g, 0).accepted, false, 'おしまいの問題は押せない');
  g = H.next(g);
  assert.equal(g.right, null);
  assert.equal(g.q, 2);
  assert.equal(g.phase, 'open');
  assert.equal(H.press(g, 0).accepted, true);
});

test('不正解はお手つき: その人はもう押せず、ほかの人の受付を再開。全員お手つきでおしまい', () => {
  let g = H.press(H.newGame(3, 0), 0).state;
  g = H.wrong(g);
  assert.deepEqual(g.out, [0]);
  assert.equal(g.phase, 'open');
  assert.deepEqual(g.scores, [0, 0, 0], '減点なしが既定');
  assert.equal(H.press(g, 0).reason, 'out');
  g = H.wrong(H.press(g, 1).state);
  g = H.wrong(H.press(g, 2).state);
  assert.equal(g.phase, 'done');
  g = H.next(g);
  assert.deepEqual(g.out, [], 'つぎの問題でお手つきは解ける');
});

test('お手つき -1 点を選んだとき', () => {
  let g = H.press(H.newGame(2, 1), 1).state;
  g = H.wrong(g);
  assert.deepEqual(g.scores, [0, -1]);
});

test('1つもどす: 判定のまちがいを直せる。受付をもどす: 判定せずに受付を再開', () => {
  let g = H.press(H.newGame(2, 0), 0).state;
  g = H.correct(g);
  assert.deepEqual(g.scores, [1, 0]);
  g = H.undo(g);
  assert.deepEqual(g.scores, [0, 0]);
  assert.equal(g.phase, 'locked');
  assert.equal(g.winner, 0);
  g = H.wrong(g);
  assert.deepEqual(g.out, [0]);
  g = H.undo(H.undo(g));
  assert.equal(g.phase, 'open');
  assert.equal(g.winner, null);
  assert.equal(H.undo(H.newGame(2, 0)).phase, 'open', '戻す先が無ければそのまま');
  const r = H.release(H.press(H.newGame(2, 0), 1).state);
  assert.equal(r.phase, 'open');
  assert.deepEqual(r.out, [], '受付をもどしてもお手つきにしない');
});

test('キーボード: Q・P・Z・M が 1〜4 ばん。人数の外と押しっぱなしの繰り返しは数えない', () => {
  assert.equal(H.keyToPlayer('q', 4, false), 0);
  assert.equal(H.keyToPlayer('P', 4, false), 1);
  assert.equal(H.keyToPlayer('m', 4, false), 3);
  assert.equal(H.keyToPlayer('m', 2, false), -1);
  assert.equal(H.keyToPlayer('q', 2, true), -1);
  assert.equal(H.keyToPlayer('a', 4, false), -1);
});

test('順位は得点の高い順、同点は同じ順位', () => {
  const g = H.newGame(4, 0, [3, 5, 3, 0]);
  assert.deepEqual(H.ranking(g).map((r) => [r.p, r.rank]), [[1, 1], [0, 2], [2, 2], [3, 4]]);
});

test('設定の正規化: 人数は 2〜4、名前は空なら既定、12 字まで', () => {
  const s = H.normalizeSettings({ n: 9, names: ['  たろう ', '', 'あいうえおかきくけこさしすせそ'], sound: false, penalty: 1, topic: '<x>' });
  assert.equal(s.n, 2);
  assert.deepEqual(s.names, ['たろう', '2ばん', 'あいうえおかきくけこさし', '4ばん']);
  assert.equal(s.sound, false);
  assert.equal(s.penalty, 1);
  assert.equal(s.topic, '');
  assert.equal(H.normalizeSettings(null).n, 2);
  assert.equal(H.newGame(3, 0, ['x', 2]).scores.join(','), '0,2,0');
});
