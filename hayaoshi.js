// ===========================
// クイズ大会セット（早押しボタン）— 判定と得点の決まり（画面・音から切り離した純粋関数）
// 1 台の端末を 2〜4 人で囲んで使う。画面は hayaoshi-ui.js、テストは tests/hayaoshi.test.js
// ブラウザでは window.Hayaoshi、Node（テスト）では module.exports で使う
//
// 決まり（hayaoshi/guide.html の「判定の決まり」と同じ）
//  1. 受付中に最初に押した 1 人だけが答える権利を得る。そのあとの押しは、判定が済むまで受け付けない（ロック）
//  2. 「正解」: その人に +1 点。その問題はおしまい（「つぎの問題」で受付を再開）
//  3. 「不正解」: その人はその問題ではもう押せない（お手つき）。ほかの人の受付を再開する。
//     「お手つきは -1 点」を選んだときは 1 点引く。全員がお手つきになったら、その問題はおしまい
//  4. 同じ瞬間の押しは区別しない。画面（ブラウザ）が先に知らせた押しを先にする（press を呼んだ順）
//  5. 押しっぱなしは 1 回と数える（押し始めだけを見る）。キーボードの押しっぱなしの繰り返しも数えない
// ===========================
(function (root) {
  'use strict';

  var MIN_PLAYERS = 2, MAX_PLAYERS = 4;
  var DEFAULT_NAMES = ['1ばん', '2ばん', '3ばん', '4ばん'];

  function clampPlayers(n) {
    n = Math.floor(Number(n));
    return n >= MIN_PLAYERS && n <= MAX_PLAYERS ? n : 2;
  }

  /** 名前をそろえる（空なら「1ばん」、12 字まで） */
  function normalizeNames(names, n) {
    var out = [];
    for (var i = 0; i < n; i++) {
      var s = names && typeof names[i] === 'string' ? names[i].replace(/\s+/g, ' ').trim().slice(0, 12) : '';
      out.push(s || DEFAULT_NAMES[i]);
    }
    return out;
  }

  /**
   * 新しい大会
   * state = { n, scores: [..], phase: 'open' | 'locked' | 'done', winner: null | 番号, right: 正解した番号 | null, out: [お手つきの番号], q: 問題の番号（1 から）, penalty: 0 | 1, history: [] }
   */
  function newGame(n, penalty, scores) {
    n = clampPlayers(n);
    var sc = [];
    for (var i = 0; i < n; i++) sc.push(scores && Number.isFinite(Number(scores[i])) ? Math.trunc(Number(scores[i])) : 0);
    return { n: n, scores: sc, phase: 'open', winner: null, right: null, out: [], q: 1, penalty: penalty === 1 ? 1 : 0, history: [] };
  }

  function snapshot(s) {
    return { scores: s.scores.slice(), phase: s.phase, winner: s.winner, right: s.right, out: s.out.slice(), q: s.q };
  }
  function withHistory(s) {
    var h = s.history.concat([snapshot(s)]);
    if (h.length > 50) h = h.slice(h.length - 50);
    return h;
  }
  function copy(s, patch) {
    return Object.assign({}, s, { scores: s.scores.slice(), out: s.out.slice() }, patch);
  }

  /** p 番（0 から）が押した。受け付けたら accepted: true */
  function press(s, p) {
    if (!(p >= 0 && p < s.n)) return { state: s, accepted: false, reason: 'range' };
    if (s.phase !== 'open') return { state: s, accepted: false, reason: s.phase };
    if (s.out.indexOf(p) >= 0) return { state: s, accepted: false, reason: 'out' };
    return { state: copy(s, { phase: 'locked', winner: p, history: withHistory(s) }), accepted: true };
  }

  /** 答えた人が正解 */
  function correct(s) {
    if (s.phase !== 'locked') return s;
    var t = copy(s, { phase: 'done', winner: null, right: s.winner, history: withHistory(s) });
    t.scores[s.winner] += 1;
    return t;
  }

  /** 答えた人が不正解（お手つき）。ほかの人の受付を再開する */
  function wrong(s) {
    if (s.phase !== 'locked') return s;
    var t = copy(s, { winner: null, history: withHistory(s) });
    t.out.push(s.winner);
    if (s.penalty) t.scores[s.winner] -= 1;
    t.phase = t.out.length >= s.n ? 'done' : 'open';
    return t;
  }

  /** 受付をやり直す（答えた人がいても判定しない。押しまちがいのとき） */
  function release(s) {
    if (s.phase !== 'locked') return s;
    return copy(s, { phase: 'open', winner: null, history: withHistory(s) });
  }

  /** つぎの問題（お手つきを解いて受付を再開） */
  function next(s) {
    return copy(s, { phase: 'open', winner: null, right: null, out: [], q: s.q + 1, history: withHistory(s) });
  }

  /** 1 つ前にもどす（判定のまちがいを直す） */
  function undo(s) {
    if (!s.history.length) return s;
    var prev = s.history[s.history.length - 1];
    return Object.assign({}, s, prev, { scores: prev.scores.slice(), out: prev.out.slice(), history: s.history.slice(0, -1) });
  }

  /** 得点を 0 に（問題の番号も 1 から） */
  function resetScores(s) {
    return newGame(s.n, s.penalty);
  }

  /** 順位（同点は同じ順位）。[{ p, score, rank }] を得点の高い順に */
  function ranking(s) {
    var rows = s.scores.map(function (v, p) { return { p: p, score: v }; });
    rows.sort(function (a, b) { return b.score - a.score || a.p - b.p; });
    rows.forEach(function (r, i) { r.rank = i && rows[i - 1].score === r.score ? rows[i - 1].rank : i + 1; });
    return rows;
  }

  // キーボード（PC）: 1〜4 番の早押しキー。離れた位置のキーにして、手がぶつからないように
  var PLAYER_KEYS = ['q', 'p', 'z', 'm'];
  /** 押されたキーが何番の人か（無ければ -1）。押しっぱなしの繰り返し（repeat）は数えない */
  function keyToPlayer(key, n, repeat) {
    if (repeat) return -1;
    var i = PLAYER_KEYS.indexOf(String(key || '').toLowerCase());
    return i >= 0 && i < n ? i : -1;
  }

  /** 保存する設定をそろえる */
  function normalizeSettings(o) {
    o = o && typeof o === 'object' ? o : {};
    var n = clampPlayers(o.n);
    return {
      n: n,
      names: normalizeNames(o.names, MAX_PLAYERS),
      sound: o.sound !== false,
      penalty: o.penalty === 1 ? 1 : 0,
      topic: typeof o.topic === 'string' && /^[a-z0-9-]{0,20}$/.test(o.topic) ? o.topic : '',
    };
  }

  var api = {
    MIN_PLAYERS: MIN_PLAYERS, MAX_PLAYERS: MAX_PLAYERS, PLAYER_KEYS: PLAYER_KEYS,
    clampPlayers: clampPlayers, normalizeNames: normalizeNames, normalizeSettings: normalizeSettings,
    newGame: newGame, press: press, correct: correct, wrong: wrong, release: release, next: next, undo: undo,
    resetScores: resetScores, ranking: ranking, keyToPlayer: keyToPlayer,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Hayaoshi = api;
})(this);
