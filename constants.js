// ===========================
// 題材のデータの出典と確認日（ここにだけ書く）
// 元素名・年号は時が経っても変わらない事実なので「時点がある値」ではないが、出典を見て確かめた日を 1 か所に持つ
// （youheioonuki.github.io の check-site の古さチェックと、tests の書き忘れチェックが読む）
// ブラウザでは window.Constants、Node（テスト）では module.exports で使う
// ===========================
(function (root) {
  'use strict';

  var CONSTANTS = {
    genso: {
      value: '118 元素（1〜118 番）の記号・英語名・日本語名',
      label: '元素記号・元素名',
      source: 'IUPAC Periodic Table of the Elements（2022-05-04 版）、日本化学会 原子量専門委員会「原子量表（2026）」',
      url: 'https://iupac.org/what-we-do/periodic-table-of-elements/',
      urls: [
        'https://iupac.org/what-we-do/periodic-table-of-elements/',
        'https://iupac.org/wp-content/uploads/2022/05/IUPAC_Periodic_Table-04May22.pdf',
        'https://www.chemistry.or.jp/know/doc/atom_2026.pdf',
        'https://www.chemistry.or.jp/news/113nh.html',
      ],
      checked: '2026-09-25',   // この日に出典を見て、118 件の記号・英語名・日本語名を突き合わせた
    },
    nengo: {
      value: '日本の歴史の出来事 101 件の年',
      label: '歴史の年号',
      source: 'コトバンク（日本大百科全書（ニッポニカ）・改訂新版 世界大百科事典・百科事典マイペディア・山川 日本史小辞典 ほか）の各項目。時代の名前は中学校学習指導要領（平成29年告示）解説 社会編',
      url: 'https://kotobank.jp/',
      urls: [
        'https://kotobank.jp/',
        'https://www.mext.go.jp/component/a_menu/education/micro_detail/__icsFiles/afieldfile/2019/03/18/1387018_003.pdf',
      ],
      checked: '2026-09-25',   // この日に 101 件すべての年を、各項目のページの記述と突き合わせた
    },
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = CONSTANTS;
  else root.Constants = CONSTANTS;
})(this);
