// ===========================
// 題材: 百人一首 決まり字クイズ（小倉百人一首 100 首）
// 歌のデータ・決まり字の出し方・出典は hyakunin-data.js（読み上げ /hyakunin/ と共通）。出典と確認日は constants.js の hyakunin
// 向き: 取り札（下の句）→ 決まり字（入力もできる。最初の向き）／上の句 → 下の句／決まり字 → 下の句（この 2 つは 4 択だけ）
// 4 択のまぎらわしい選択肢は、上の句のひらがなの並び（五十音）の近い札から出る＝同じ音で始まる札が選択肢に並ぶ
// ===========================
(function (root) {
  'use strict';

  var H = (typeof module !== 'undefined' && module.exports) ? require('../hyakunin-data.js') : root.Hyakunin;

  // 上の句のひらがなの五十音順での位置（4 択の「近い札」に使う）
  var sorted = H.poems.slice().sort(function (a, b) {
    var x = H.sound(a.kamiKana), y = H.sound(b.kamiKana);
    return x < y ? -1 : x > y ? 1 : 0;
  });
  var RANK = {};
  sorted.forEach(function (p, i) { RANK[p.n] = i; });

  var items = H.poems.map(function (p) {
    return {
      id: String(p.n), n: p.n, kami: p.kami, shimo: p.shimo, kamiKana: p.kamiKana, shimoKana: p.shimoKana,
      kimariji: p.kimariji, len: p.kimariji.length, author: p.author,
    };
  });

  var topic = {
    id: 'kimariji',
    page: {
      title: '百人一首 決まり字クイズ｜上の句→下の句・取り札・印刷',
      h1: '百人一首 決まり字クイズ',
      lead: '上の句から下の句、取り札から決まり字を4択で。',
      description: '百人一首の決まり字クイズ。上の句→下の句、決まり字→下の句、取り札→決まり字を4択と入力で。一字決まり（むすめふさほせ）・二字・三字…で絞れて、一覧で覚える・印刷もできる。登録不要・無料。',
      hub: '上の句→下の句、取り札→決まり字。一字決まりから100首まで',
      icon: '🌸',
      order: 3,
      note: '決まり字は、上の句のひらがな（歴史的仮名遣い）で、ほかの99首と区別できる最短の先頭です（「を」と「お」は同じ音として比べます）。入力では「を」を「お」と打っても正解です。',
      deps: ['hyakunin-data.js'],
    },
    unit: '首',
    order: function (it) { return RANK[it.n]; },
    label: function (it) { return it.n + ' ' + it.kami + '（' + it.kimariji + '）'; },
    items: items,
    kinds: [
      {
        key: 'tori', label: '取り札→決まり字', inputHint: '決まり字をひらがなで（「を」は「お」でも正解）',
        prompt: function (it) { return '取り札「' + it.shimoKana + '」の決まり字は？'; },
        answer: function (it) { return it.kimariji; },
        accept: function (it) { var s = H.sound(it.kimariji); return s === it.kimariji ? [it.kimariji] : [it.kimariji, s]; },
        choice: function (it) { return it.kimariji; },
      },
      {
        key: 'kami', label: '上の句→下の句', typing: false,
        prompt: function (it) { return '「' + it.kami + '」の下の句は？'; },
        answer: function (it) { return it.shimoKana; },
        accept: function (it) { return [it.shimoKana]; },
        choice: function (it) { return it.shimoKana; },
      },
      {
        key: 'kimari', label: '決まり字→下の句', typing: false,
        prompt: function (it) { return '決まり字「' + it.kimariji + '」の札の下の句は？'; },
        answer: function (it) { return it.shimoKana; },
        accept: function (it) { return [it.shimoKana]; },
        choice: function (it) { return it.shimoKana; },
      },
    ],
    filters: [
      {
        key: 'len', label: '決まり字', def: 'all',
        options: [
          { v: 'all', label: 'すべて', test: function () { return true; } },
          { v: '1', label: '1字', test: function (it) { return it.len === 1; } },
          { v: '2', label: '2字', test: function (it) { return it.len === 2; } },
          { v: '3', label: '3字', test: function (it) { return it.len === 3; } },
          { v: '4', label: '4〜6字', test: function (it) { return it.len >= 4; } },
        ],
      },
    ],
    columns: [
      { label: '番号', get: function (it) { return it.n; } },
      { label: '決まり字', get: function (it) { return it.kimariji; }, hide: true },
      { label: '上の句', get: function (it) { return it.kami; } },
      { label: '下の句（取り札）', get: function (it) { return it.shimoKana; }, hide: true },
      { label: '作者', get: function (it) { return it.author; } },
    ],
    explain: function (it) { return it.n + '番　' + it.kami + '　' + it.shimo + '（' + it.author + '）　決まり字「' + it.kimariji + '」'; },
    link: function () { return null; },
    sourceKey: 'hyakunin',
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = topic;
  else { root.QuizTopics = root.QuizTopics || {}; root.QuizTopics[topic.id] = topic; }
})(this);
