// ===========================
// クイズ広場 — 「おお」の一言（ROADMAP K122）。答えの直後に、その題材の短い事実を 1 つ出す
// DOM に触らない純粋関数。データは ooh-<題材>.js（window.OohData）。tests/ooh.test.js が確かめる
//
// うそにならない規則（K122）:
//   1. 事実は 2 層。型の事実は構造化したデータから機械で文にする。自由文は 1 題材（1 問）に 1 つまで、出典つきで人が書く
//   2. 1 事実 1 出典（src）。出典の無い事実は出さない（factsFor が捨てる。テストでも 0 件を確かめる）
//   3. 変わるもの（人口・生産量・最大最古の記録・現職）は書かない。BANNED の語を含む文はテストで落とす
//   4. 1 文 40 字以内（「。」で区切った 1 文ずつ）。断定は出典が断定しているものだけ
// ブラウザでは window.Ooh、Node（テスト）では module.exports で使う
// ===========================
(function (root) {
  'use strict';

  var MAX_SENTENCE = 40;
  // 変わるもの・記録の語。自由文にも型の事実にも入れない（WHITELIST に理由つきで足したものだけ例外）
  var BANNED = ['人口', '生産', '最大', '最古', '現在', '最も', '世界一', '一番', 'いちばん', '現職', '今も', 'いまも'];
  var WHITELIST = {};   // 例: { 'genso:26:0': '理由' }。いまは無い

  // --- 元素 ---
  var GENSO_SRC = {
    c: function (it) { return { label: 'IUPAC 原子量および同位体存在度委員会（CIAAW）「' + it.en + '」', url: 'https://www.ciaaw.org/' + it.en + '.htm' }; },
    l: function (it) { return { label: 'ロスアラモス国立研究所（米国エネルギー省）周期表「' + it.en + '」', url: 'https://periodic.lanl.gov/' + it.n + '.shtml' }; },
    i16: function () { return { label: 'IUPAC「IUPAC Announces the Names of the Elements 113, 115, 117, and 118」（2016年）', url: 'https://iupac.org/iupac-announces-the-names-of-the-elements-113-115-117-and-118/' }; },
    pt: function () { return { label: 'IUPAC 周期表（Periodic Table of the Elements）', url: 'https://iupac.org/what-we-do/periodic-table-of-elements/' }; },
    pc: function () { return { label: 'PubChem（米国国立医学図書館）の周期表', url: 'https://pubchem.ncbi.nlm.nih.gov/periodic-table/' }; },
  };

  /** 周期（1〜7）。原子番号だけで決まる */
  function period(n) {
    var ends = [2, 10, 18, 36, 54, 86, 118];
    for (var i = 0; i < ends.length; i++) if (n <= ends[i]) return i + 1;
    return 0;
  }
  /** 族（1〜18）。ランタノイド（57〜71）・アクチノイド（89〜103）は 0（IUPAC の周期表では 3 族の欄に「57-71 lanthanoids」「89-103 actinoids」とまとめて書かれる） */
  function group(n) {
    if ((n >= 57 && n <= 71) || (n >= 89 && n <= 103)) return 0;
    if (n === 1) return 1;
    if (n === 2) return 18;
    var p = period(n);
    var start = [0, 1, 3, 11, 19, 37, 55, 87][p];
    var k = n - start;           // 周期の中での位置（0 から）
    if (p <= 3) return k < 2 ? k + 1 : k + 11;           // 2・3 周期: 1, 2, 13〜18
    if (p <= 5) return k + 1;                            // 4・5 周期: 1〜18
    if (k < 2) return k + 1;                             // 6・7 周期: 1, 2、（ランタノイド・アクチノイドの 15 個を飛ばす）
    return k - 14 + 1;                                   // 72 番 → 4 族 … 86 番 → 18 族
  }

  function foundSentence(f) {
    var y = f[0], who = f[1], type = f[2];
    switch (type) {
      case 'a': return '大昔から知られていた。';
      case 'f': return who ? y + '年、' + who + 'が発見した。' : y + '年に発見された。';
      case 'c': return '発見者とされるのは' + who + '（' + y + '年）。';
      case 'i': return y + '年、' + who + 'が初めて取り出した。';
      case 'p': return y + '年、' + who + 'が純粋な金属を初めて取り出した。';
      case 'r': return y + '年、' + who + 'が元素だと見分けた。';
      case 'm': return y + '年、' + who + 'が人工的に作った。';
      case 'rep': return y + '年、' + who + 'が最初に報告した。';
      default: return null;
    }
  }

  function gensoFacts(data, it) {
    var row = null;
    for (var i = 0; i < data.rows.length; i++) if (data.rows[i][0] === it.n) { row = data.rows[i]; break; }
    var out = [];
    var src = row && GENSO_SRC[row[1]] ? GENSO_SRC[row[1]](it) : null;
    if (row && src) {
      if (row[2]) out.push({ kind: 'name', text: row[2], src: src });
      if (row[3]) out.push({ kind: 'symbol', text: row[3], src: src });
      if (row[4]) { var s = foundSentence(row[4]); if (s) out.push({ kind: 'found', text: s, src: src }); }
    }
    if (data.named2016.indexOf(it.n) >= 0) out.push({ kind: 'named', text: '2016年11月28日、IUPAC がこの名前に正式に決めた。', src: GENSO_SRC.i16() });
    if (data.gas.indexOf(it.n) >= 0) out.push({ kind: 'state', text: 'ふつうの温度と圧力では気体。', src: GENSO_SRC.pc() });
    if (data.liquid.indexOf(it.n) >= 0) out.push({ kind: 'state', text: 'ふつうの温度と圧力では液体。', src: GENSO_SRC.pc() });
    var g = group(it.n), p = period(it.n);
    out.push({ kind: 'table', text: g ? '周期表では第' + p + '周期・' + g + '族。' : '周期表では第' + p + '周期の' + (it.n < 89 ? 'ランタノイド（57〜71番）' : 'アクチノイド（89〜103番）') + 'の1つ。', src: GENSO_SRC.pt() });
    if (row && src && row[5]) out.push({ kind: 'free', text: row[5], src: src });
    return out;
  }

  var BUILDERS = { genso: gensoFacts };

  /** 文を「。」で区切る（空は除く） */
  function sentences(text) {
    return String(text).split('。').map(function (s) { return s.trim(); }).filter(Boolean);
  }
  /** 規則に合うか: 出典（label と https の url）がある・1 文 40 字以内・禁止語なし。合わなければ理由の文字列 */
  function problem(fact, key) {
    if (!fact || !fact.text) return '文がない';
    if (!fact.src || !fact.src.label || !/^https:\/\//.test(fact.src.url || '')) return '出典がない';
    var long = sentences(fact.text).filter(function (s) { return s.length > MAX_SENTENCE; });
    if (long.length) return '40字をこえる: ' + long[0];
    if (!(key && WHITELIST[key])) {
      var bad = BANNED.filter(function (w) { return fact.text.indexOf(w) >= 0; });
      if (bad.length) return '変わるもの・記録の語: ' + bad.join('、');
    }
    return '';
  }

  /**
   * その問題の「おお」の一言の一覧（規則に合わないものは捨てる）
   * @returns {Array<{kind, text, src: {label, url}}>}
   */
  function factsFor(topicId, item, dataSet) {
    var all = dataSet || (root && root.OohData) || {};
    var data = all[topicId];
    var build = BUILDERS[topicId];
    if (!data || !build || !item) return [];
    return build(data, item).filter(function (f, i) { return !problem(f, topicId + ':' + item.id + ':' + i); });
  }

  /** 最初に出す 1 つ（ランダム）と「もう 1 つ」の順番: 最初の番号から 1 つずつ進み、最後まで行ったら最初に戻る */
  function startIndex(n, rand) { return n > 0 ? Math.floor((rand || Math.random)() * n) % n : 0; }
  function nextIndex(i, n) { return n > 0 ? (i + 1) % n : 0; }

  var api = { MAX_SENTENCE: MAX_SENTENCE, BANNED: BANNED, WHITELIST: WHITELIST, period: period, group: group, foundSentence: foundSentence,
    sentences: sentences, problem: problem, factsFor: factsFor, startIndex: startIndex, nextIndex: nextIndex, builders: BUILDERS };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Ooh = api;
})(this);
