// ===========================
// 百人一首の読み上げ（/quiz-hiroba/hyakunin/）— 読む順番と「何を・どこで止まるか」の段取り（画面から切り離した純粋関数）
// 画面（音声合成・タイマー・Wake Lock）は yomiage-ui.js。tests/yomiage.test.js から node --test で確かめる
// ブラウザでは window.Yomiage、Node（テスト）では module.exports で使う
//
// 読み方は 2 つ（hyakunin/guide.html にも同じ説明）
//  - ちらし取り（家庭・学校）: 上の句 → 1 秒 → 下の句（→ 1 秒 → 下の句をもう一度）→ 間隔 → 次の札の上の句
//  - 競技かるた式: 序歌 → 余韻 → 1 枚目の上の句 → 間隔（取る時間）→ 1 枚目の下の句 → 余韻 → 2 枚目の上の句 → …
//    全日本かるた協会『競技かるた読手テキスト（改訂版）』の「5・3・1・6 方式」（下の句 5 秒程度・余韻 3.0 秒・間合い 1.0 秒・上の句 6 秒程度）の
//    余韻と間合いを足した 4 秒を、下の句と次の上の句の間に置く。序歌は下の句を 2 回読む（同協会の読手講習の資料）
// ===========================
(function (root) {
  'use strict';

  // 止まる長さ（秒）。GAP は利用者が決める「間隔」（0 ならタップで次へ）
  var PAUSE = { short: 1.0, yoin: 4.0 };

  // --- 乱数（calc.js と同じ。種が同じなら同じ並び） ---
  function rng(seed) {
    var a = (seed >>> 0) || 1;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /** 読む札の順番。nums: 使う札の番号、order: 'random' | 'number' */
  function makeOrder(nums, order, seed) {
    var a = nums.slice().sort(function (x, y) { return x - y; });
    if (order !== 'random') return a;
    var rand = rng(seed || 1);
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(rand() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  /**
   * 段取り: 読む句を 1 つずつ並べたもの
   * opt = { style: 'chirashi' | 'kyogi', joka: true/false, twice: true/false（ちらし取りで下の句を 2 回） }
   * 1 つの段: { card: 札の位置（序歌は -1）, n: 札の番号（序歌は 0）, part: 'kami' | 'shimo', again: 2 回目なら true, pause: 'short' | 'yoin' | 'gap' | 'end' }
   * pause は「その句を読み終えたあとに止まる長さ」
   */
  function buildSteps(order, opt) {
    opt = opt || {};
    var kyogi = opt.style === 'kyogi';
    var s = [];
    function add(card, n, part, pause, again) { s.push({ card: card, n: n, part: part, again: !!again, pause: pause }); }
    if (opt.joka) {
      add(-1, 0, 'kami', 'short');
      add(-1, 0, 'shimo', 'short');
      add(-1, 0, 'shimo', kyogi ? 'yoin' : 'gap', true);   // 序歌は下の句を 2 回
    }
    order.forEach(function (n, i) {
      if (kyogi) {
        add(i, n, 'kami', 'gap');                            // 上の句を読んで、取る時間
        add(i, n, 'shimo', i + 1 < order.length ? 'yoin' : 'end');
      } else {
        add(i, n, 'kami', 'short');
        if (opt.twice) {
          add(i, n, 'shimo', 'short');
          add(i, n, 'shimo', 'gap', true);
        } else {
          add(i, n, 'shimo', 'gap');
        }
      }
    });
    if (s.length) s[s.length - 1].pause = 'end';
    return s;
  }

  /** いまの段までに「読み始めた札」の数（上の句を読み始めた札を読んだ札と数える） */
  function readCount(steps, pos) {
    var seen = {};
    var c = 0;
    for (var i = 0; i <= pos && i < steps.length; i++) {
      var st = steps[i];
      if (st.card >= 0 && !seen[st.card]) { seen[st.card] = true; c += 1; }
    }
    return c;
  }

  /** 読み終わった札の番号（読んだ順）。いま読んでいる札は含めない */
  function doneCards(order, steps, pos) {
    var cur = pos >= 0 && pos < steps.length ? steps[pos].card : order.length;
    var n = pos >= steps.length ? order.length : Math.max(0, cur);
    return order.slice(0, n);
  }

  /** 次の札の最初の段（「次の札へ」ボタン）。無ければ steps.length */
  function nextCardStart(steps, pos) {
    var cur = pos >= 0 && pos < steps.length ? steps[pos].card : -2;
    for (var i = pos + 1; i < steps.length; i++) {
      if (steps[i].card !== cur && steps[i].card >= 0) return i;
    }
    return steps.length;
  }

  /** 読み上げる文（音声合成に渡す）: 句の区切りの空白を読点に */
  function speechText(yomi) { return String(yomi).trim().split(/\s+/).join('、'); }

  /** 声がない端末・声が止まったときの目安の秒数（1 字 0.25 秒を速さで割る＋1 秒）。onend が来ないときの見張りに使う */
  function estimateSeconds(text, rate) {
    var n = String(text).replace(/[\s、]/g, '').length;
    return n * 0.25 / (rate > 0 ? rate : 1) + 1;
  }

  /** 保存していた続きを確かめる（知らない番号・重なり・範囲外は捨てる）。使えなければ null */
  function normalizeResume(o, validNums) {
    if (!o || typeof o !== 'object' || !Array.isArray(o.order)) return null;
    var ok = {};
    validNums.forEach(function (n) { ok[n] = true; });
    var seen = {};
    var order = [];
    for (var i = 0; i < o.order.length && i < 200; i++) {
      var n = Math.floor(Number(o.order[i]));
      if (!ok[n] || seen[n]) return null;
      seen[n] = true;
      order.push(n);
    }
    if (!order.length) return null;
    var pos = Math.floor(Number(o.pos));
    if (!(pos >= 0)) pos = 0;
    return { order: order, pos: pos, at: typeof o.at === 'string' ? o.at.slice(0, 20) : '' };
  }

  var api = {
    PAUSE: PAUSE, rng: rng, makeOrder: makeOrder, buildSteps: buildSteps, readCount: readCount, doneCards: doneCards,
    nextCardStart: nextCardStart, speechText: speechText, estimateSeconds: estimateSeconds, normalizeResume: normalizeResume,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Yomiage = api;
})(this);
