// ===========================
// クイズ広場 — 出題エンジン（画面から切り離した純粋関数）
// どの題材（topics/*.js）でも同じ関数で、出題・答え合わせ・記録・共有リンクを扱う。
// DOM や localStorage に触らない。tests/*.test.js から node --test で確かめる
// ブラウザでは window.Calc、Node（テスト）では module.exports で使う
// ===========================
(function (root) {
  'use strict';

  // --- 乱数（種が同じなら同じ並び。共有リンクで同じ問題を出すため） ---
  function rng(seed) {
    var a = (seed >>> 0) || 1;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function shuffle(list, rand) {
    var a = list.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(rand() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }
  /** 新しい種（1〜999999。共有リンクに入るので短く） */
  function newSeed(rand) { return 1 + Math.floor((rand || Math.random)() * 999999); }

  // --- 入力の答え合わせ（一問一答） ---
  // 規則（guide.html の「入力で答えるときの決まり」と同じ）
  //  1. 全角・半角の違いは無視する（NFKC。「Ｎａ」→「Na」、半角カナ → 全角カナ）
  //  2. 空白は無視する
  //  3. カタカナとひらがなの違いは無視する（「ナトリウム」＝「なとりうむ」、「ヨウ素」＝「よう素」＝「ようそ」）
  //  4. 漢字は登録した表記だけを正解にする（「水素」「すいそ」は正解、ほかの字は不正解）
  //  5. 元素記号は大文字・小文字を区別する（Co と CO は別のもの）。大小だけが違うときは「おしい」と出して不正解
  //  6. 年は数字だけを見る（「1192」「１１９２」「1192年」はどれも同じ）
  function toHira(s) {
    return s.replace(/[ァ-ヶ]/g, function (c) { return String.fromCharCode(c.charCodeAt(0) - 0x60); });
  }
  function normalizeText(s) {
    return toHira(String(s == null ? '' : s).normalize('NFKC').replace(/\s+/g, ''));
  }
  function normalizeYear(s) {
    var t = String(s == null ? '' : s).normalize('NFKC').replace(/\s+/g, '').replace(/年$/, '');
    return /^\d{1,4}$/.test(t) ? Number(t) : NaN;
  }

  /**
   * 入力した答えを確かめる
   * @returns {{ok: boolean, empty?: boolean, near?: 'case'}}
   */
  function checkTyped(kind, item, input) {
    if (String(input == null ? '' : input).trim() === '') return { ok: false, empty: true };
    var accept = kind.accept(item);
    if (kind.numeric) {
      var y = normalizeYear(input);
      return { ok: accept.some(function (a) { return Number(a) === y; }) };
    }
    var v = normalizeText(input);
    var ok = accept.some(function (a) { return normalizeText(a) === v; });
    if (ok) return { ok: true };
    if (kind.caseSensitive && accept.some(function (a) { return normalizeText(a).toLowerCase() === v.toLowerCase(); })) {
      return { ok: false, near: 'case' };
    }
    return { ok: false };
  }

  // --- 出題 ---

  /** 絞り込みの値を、その題材で使える値にそろえる（知らない値は既定に） */
  function normalizeFilters(topic, f) {
    var out = {};
    (topic.filters || []).forEach(function (flt) {
      var v = f && f[flt.key];
      out[flt.key] = flt.options.some(function (o) { return o.v === v; }) ? v : flt.def;
    });
    return out;
  }

  /** 絞り込みに合う問題の元（items） */
  function pool(topic, filters) {
    var f = normalizeFilters(topic, filters);
    return topic.items.filter(function (it) {
      return (topic.filters || []).every(function (flt) {
        var opt = flt.options.filter(function (o) { return o.v === f[flt.key]; })[0];
        return opt.test(it);
      });
    });
  }

  function kindOf(topic, key) {
    return topic.kinds.filter(function (k) { return k.key === key; })[0] || topic.kinds[0];
  }

  /**
   * 4 択（題材が choices: 3 なら 3 択）の選択肢: 正解 1 つ＋まぎらわしいもの
   * まぎらわしさ: 題材の並び（原子番号・年）が近いものから 2 つ、残りは範囲の中からばらばらに。
   * 範囲が足りなければ全体から選ぶ。同じ文字の選択肢は出さない。
   * 向きに group があれば、同じ group の問題からだけ選ぶ（昭和クイズ: はがきの値段の選択肢は、ほかの年のはがきの値段だけ）
   */
  function choiceCount(topic) { return topic.choices === 3 ? 3 : 4; }
  /**
   * 絞り込みの選んだ値が持つ、選択肢の作り方（国旗クイズのレベル）
   *   group: 選択肢をこの組（地域・似た旗の組）から先に選ぶ。足りなければ範囲の中からばらばらに足す
   *   near: false なら「並びの近いもの」を使わず、ばらばらに選ぶ
   */
  function choiceStyle(topic, filters) {
    var f = normalizeFilters(topic, filters);
    var st = {};
    (topic.filters || []).forEach(function (flt) {
      var opt = flt.options.filter(function (o) { return o.v === f[flt.key]; })[0];
      if (opt && opt.group) st.group = opt.group;
      if (opt && opt.near === false) st.near = false;
    });
    return st;
  }
  function makeChoices(topic, kind, item, candidates, rand, n, style) {
    n = n || 4;
    style = style || {};
    var src = candidates.length >= n ? candidates : topic.items;
    if (kind.group) {
      var g = kind.group(item);
      var same = function (list) { return list.filter(function (x) { return kind.group(x) === g; }); };
      src = same(candidates).length >= n ? same(candidates) : same(topic.items);
    }
    var right = kind.choice(item);
    var seen = {}; seen[right] = true;
    function distinct(list) {
      return list.filter(function (x) {
        var c = kind.choice(x);
        if (x === item || seen[c]) return false;
        seen[c] = true;
        return true;
      });
    }
    var pick;
    if (style.group) {
      // 同じ組（地域・似た旗）から先に。足りなければ範囲の中から、それでも足りなければ全体からばらばらに
      var sg = style.group(item);
      var mates = distinct(candidates.filter(function (x) { return style.group(x) === sg; }));
      pick = shuffle(mates, rand).slice(0, n - 1);
      if (pick.length < n - 1) pick = pick.concat(shuffle(distinct(candidates), rand).slice(0, n - 1 - pick.length));
      if (pick.length < n - 1) pick = pick.concat(shuffle(distinct(topic.items), rand).slice(0, n - 1 - pick.length));
      return shuffle([right].concat(pick.map(function (x) { return kind.choice(x); })), rand);
    }
    var others = distinct(src);
    if (style.near === false) {
      pick = shuffle(others, rand).slice(0, n - 1);
      if (pick.length < n - 1) pick = pick.concat(shuffle(distinct(topic.items), rand).slice(0, n - 1 - pick.length));
      return shuffle([right].concat(pick.map(function (x) { return kind.choice(x); })), rand);
    }
    var ord = topic.order;
    var near = others.slice().sort(function (a, b) { return Math.abs(ord(a) - ord(item)) - Math.abs(ord(b) - ord(item)); }).slice(0, 6);
    pick = shuffle(near, rand).slice(0, Math.min(2, n - 1));
    var rest = shuffle(others.filter(function (x) { return pick.indexOf(x) < 0; }), rand);
    pick = pick.concat(rest.slice(0, n - 1 - pick.length));
    return shuffle([right].concat(pick.map(function (x) { return kind.choice(x); })), rand);
  }

  /**
   * 1 回分の問題を作る
   * opt = { kind: 'sym', mode: 'choice' | 'typing', filters: {...}, count: 10（0 ならすべて）, seed, only: [id...]（にがてだけ） }
   * 問題: { id, choices?: [文字列 4 つ（3 択の題材は 3 つ）] }
   * 同じ opt（seed を含む）なら同じ問題と選択肢になる（共有リンクの「同じ問題でちょうせん」）
   */
  function makeRound(topic, opt) {
    var rand = rng(opt.seed || 1);
    var kind = kindOf(topic, opt.kind);
    var candidates = pool(topic, opt.filters);
    var base = candidates;
    if (opt.only && opt.only.length) {
      base = candidates.filter(function (it) { return opt.only.indexOf(it.id) >= 0; });
    }
    var count = opt.count > 0 ? Math.min(opt.count, base.length) : base.length;
    var picked = shuffle(base, rand).slice(0, count);
    var mode = opt.mode === 'typing' && kind.typing !== false ? 'typing' : 'choice';
    var style = choiceStyle(topic, opt.filters);
    return picked.map(function (it) {
      var q = { id: it.id };
      if (mode === 'choice') q.choices = makeChoices(topic, kind, it, candidates, rand, choiceCount(topic), style);
      return q;
    });
  }

  function itemById(topic, id) {
    for (var i = 0; i < topic.items.length; i++) if (topic.items[i].id === id) return topic.items[i];
    return null;
  }

  // --- 記録（ブラウザに保存するもの） ---
  // records = { <題材>: { items: { <id>: { ok, ng, last: 1|0 } }, best: { <条件のキー>: { c, n, ms, at } } } }
  // 「にがて」= 最後に答えたとき まちがえたもの（正解すれば外れる）

  /** 自己ベストのキー: 出題の向き・答え方・範囲・問題数（同じ条件どうしで比べる） */
  function bestKey(topic, opt) {
    var f = normalizeFilters(topic, opt.filters);
    var fs = Object.keys(f).sort().map(function (k) { return k + '=' + f[k]; }).join(',');
    var kind = kindOf(topic, opt.kind);
    var mode = opt.mode === 'typing' && kind.typing !== false ? 'typing' : 'choice';
    return [kind.key, mode, fs, opt.count > 0 ? opt.count : 'all'].join('|');
  }

  function topicRec(records, topicId) {
    var r = records && records[topicId];
    return { items: Object.assign({}, r && r.items), best: Object.assign({}, r && r.best) };
  }

  function recordAnswer(records, topicId, itemId, ok) {
    var out = Object.assign({}, records);
    var t = topicRec(records, topicId);
    var r = Object.assign({ ok: 0, ng: 0, last: 0 }, t.items[itemId]);
    if (ok) r.ok += 1; else r.ng += 1;
    r.last = ok ? 1 : 0;
    t.items[itemId] = r;
    out[topicId] = t;
    return out;
  }

  /** 正解数が多いほう、同じなら時間が短いほうを自己ベストにする。{records, isBest, prev} を返す */
  function recordBest(records, topicId, key, correct, total, ms, at) {
    var out = Object.assign({}, records);
    var t = topicRec(records, topicId);
    var prev = t.best[key];
    var isBest = !prev || correct > prev.c || (correct === prev.c && ms < prev.ms);
    if (isBest) t.best[key] = { c: correct, n: total, ms: Math.round(ms), at: at };
    out[topicId] = t;
    return { records: out, isBest: isBest, prev: prev || null };
  }

  function weakIds(records, topic) {
    var items = (records && records[topic.id] && records[topic.id].items) || {};
    return topic.items.filter(function (it) { return items[it.id] && items[it.id].last === 0; }).map(function (it) { return it.id; });
  }

  /** ファイルや保存から読んだ記録を今の形にそろえる（知っている題材と問題だけ、0 以上の整数だけ残す） */
  function normalizeRecords(data, topics) {
    var out = {};
    if (!data || typeof data !== 'object' || Array.isArray(data)) return out;
    function nat(x) { var v = Math.floor(Number(x)); return v > 0 && isFinite(v) ? v : 0; }
    (topics || []).forEach(function (topic) {
      var r = data[topic.id];
      if (!r || typeof r !== 'object') return;
      var t = { items: {}, best: {} };
      var ids = {};
      topic.items.forEach(function (it) { ids[it.id] = true; });
      if (r.items && typeof r.items === 'object') {
        Object.keys(r.items).forEach(function (id) {
          var x = r.items[id];
          if (!ids[id] || !x || typeof x !== 'object') return;
          t.items[id] = { ok: nat(x.ok), ng: nat(x.ng), last: x.last === 1 ? 1 : 0 };
        });
      }
      if (r.best && typeof r.best === 'object') {
        Object.keys(r.best).slice(0, 500).forEach(function (k) {
          var b = r.best[k];
          if (!b || typeof b !== 'object' || k.length > 200) return;
          var n = nat(b.n), c = Math.min(nat(b.c), n);
          if (!n) return;
          t.best[k] = { c: c, n: n, ms: nat(b.ms), at: typeof b.at === 'string' ? b.at.slice(0, 10) : '' };
        });
      }
      out[topic.id] = t;
    });
    return out;
  }

  // --- 共有リンク（#s=）: 同じ問題でちょうせん ---
  // 中身: { t: 題材, k: 向き, m: 答え方, f: 絞り込み, n: 問題数, s: 種, p?: 送った人の正解数 }
  // base64url の JSON。「#」以降なのでサーバーには届かない
  function b64urlEncode(str) {
    var b64 = typeof Buffer !== 'undefined' ? Buffer.from(str, 'utf8').toString('base64')
      : btoa(String.fromCharCode.apply(null, new TextEncoder().encode(str)));
    return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
  function b64urlDecode(s) {
    var b64 = s.replace(/-/g, '+').replace(/_/g, '/');
    while (b64.length % 4) b64 += '=';
    if (typeof Buffer !== 'undefined') return Buffer.from(b64, 'base64').toString('utf8');
    var bin = atob(b64), bytes = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new TextDecoder().decode(bytes);
  }
  function toShareHash(ch) { return '#s=' + b64urlEncode(JSON.stringify(ch)); }

  /** リンクの中身を確かめ、その題材で使える形にそろえる。使えなければ null */
  function fromShareHash(hash, topic) {
    var m = /^#s=([A-Za-z0-9_-]{1,2000})$/.exec(hash || '');
    if (!m) return null;
    var o;
    try { o = JSON.parse(b64urlDecode(m[1])); } catch (e) { return null; }
    if (!o || typeof o !== 'object' || o.t !== topic.id) return null;
    var seed = Math.floor(Number(o.s));
    if (!(seed >= 1 && seed <= 999999)) return null;
    var kind = kindOf(topic, o.k);
    var n = Math.floor(Number(o.n));
    var out = {
      kind: kind.key,
      mode: o.m === 'typing' && kind.typing !== false ? 'typing' : 'choice',
      filters: normalizeFilters(topic, o.f),
      count: n > 0 && n <= topic.items.length ? n : 0,
      seed: seed,
    };
    var p = Math.floor(Number(o.p));
    if (o.p != null && p >= 0) out.score = p;
    return out;
  }

  function challengeToLink(topic, opt, score) {
    var o = { t: topic.id, k: opt.kind, m: opt.mode, f: normalizeFilters(topic, opt.filters), n: opt.count || 0, s: opt.seed };
    if (score != null) o.p = score;
    return toShareHash(o);
  }

  /** 経過時間を「1分05秒」の形に */
  function formatMs(ms) {
    var s = Math.max(0, Math.round(ms / 1000));
    var m = Math.floor(s / 60);
    return (m ? m + '分' : '') + String(s % 60).padStart(m ? 2 : 1, '0') + '秒';
  }

  // --- バックアップファイル（README「ツールを追加するとき」20。決定 D31） ---
  // 形式: { tool, version, exportedAt, data }。data はブラウザに保存しているものと同じ形
  var BACKUP_VERSION = 1;

  /** 書き出すファイル名: <ツール名>-backup-YYYYMMDD.json（日付は端末の時計） */
  function backupFileName(tool, date) {
    var d = date || new Date();
    return tool + '-backup-' + d.getFullYear() + String(d.getMonth() + 1).padStart(2, '0') + String(d.getDate()).padStart(2, '0') + '.json';
  }

  /** 書き出す中身 */
  function buildBackup(tool, data, date) {
    return { tool: tool, version: BACKUP_VERSION, exportedAt: (date || new Date()).toISOString(), data: data };
  }

  /**
   * 読み込んだファイルの文字列を確かめる。中身の正規化は normalizeRecords で行う
   * @returns {{ok: true, data: object} | {ok: false, error: string}} error は画面にそのまま出す文
   */
  function parseBackup(text, tool, requiredKeys) {
    var o;
    try { o = JSON.parse(text); } catch (e) { o = null; }
    if (!o || typeof o !== 'object' || Array.isArray(o) || typeof o.tool !== 'string') {
      return { ok: false, error: 'ファイルを読み取れませんでした。このツールの「ファイルに書き出す」で作った .json ファイルを選んでください。' };
    }
    if (o.tool !== tool) {
      return { ok: false, error: 'ほかのツール（' + o.tool.slice(0, 40) + '）のファイルです。このツールで書き出したファイルを選んでください。' };
    }
    if (o.version !== BACKUP_VERSION) {
      return { ok: false, error: typeof o.version === 'number' && o.version > BACKUP_VERSION
        ? '新しい版のツールで書き出したファイルのため読み込めません。ページを再読み込みしてから、もう一度お試しください。'
        : 'ファイルの形式が正しくないため読み込めません。' };
    }
    var data = o.data;
    var missing = !data || typeof data !== 'object' || Array.isArray(data) ||
      (requiredKeys || []).some(function (k) { return data[k] === undefined || data[k] === null; });
    if (missing) return { ok: false, error: 'ファイルの中身が足りないため読み込めません。' };
    return { ok: true, data: data };
  }

  var api = {
    rng: rng, shuffle: shuffle, newSeed: newSeed,
    toHira: toHira, normalizeText: normalizeText, normalizeYear: normalizeYear, checkTyped: checkTyped,
    normalizeFilters: normalizeFilters, pool: pool, kindOf: kindOf, choiceCount: choiceCount, choiceStyle: choiceStyle, makeChoices: makeChoices, makeRound: makeRound, itemById: itemById,
    bestKey: bestKey, recordAnswer: recordAnswer, recordBest: recordBest, weakIds: weakIds, normalizeRecords: normalizeRecords,
    toShareHash: toShareHash, fromShareHash: fromShareHash, challengeToLink: challengeToLink, formatMs: formatMs,
    backupFileName: backupFileName, buildBackup: buildBackup, parseBackup: parseBackup,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Calc = api;
})(this);
