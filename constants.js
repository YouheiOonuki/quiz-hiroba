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
    hyakunin: {
      value: '小倉百人一首 100 首の文・読み・決まり字',
      label: '百人一首の歌と読み',
      source: '全日本かるた協会「小倉百人一首フェスティバル 2020 in Tokyo」の札のページ（歌・作者・所載歌集）と『競技かるた読手テキスト（改訂版）HP 掲載用抜粋版』（読み方・序歌）、ウィキソース「小倉百人一首」（歴史的仮名遣いのひらがな）',
      url: 'https://www.karuta.or.jp/2020/karuta2020/special/card/index.html@number=.html',
      urls: [
        'https://www.karuta.or.jp/2020/karuta2020/special/card/index.html@number=.html',
        'https://www.karuta.or.jp/karuta/reading/',
        'https://www.karuta.or.jp/karuta/first-time/',
        'https://ja.wikisource.org/wiki/%E5%B0%8F%E5%80%89%E7%99%BE%E4%BA%BA%E4%B8%80%E9%A6%96',
      ],
      checked: '2026-09-25',   // この日に 100 首を 3 つの出典で突き合わせた（hyakunin-data.js の先頭の説明）
    },
    shuto: {
      value: '191 か国の国名・首都・地域',
      label: '世界の首都',
      source: '外務省「国・地域」の国名の一覧と各国の「基礎データ」の首都の欄（インターネットアーカイブに保存された外務省のページで確認。保存日は国ごとに topics/shuto.js）。首都の扱いが分かれる国の印は英語版ウィキペディア「List of national capitals」',
      url: 'https://www.mofa.go.jp/mofaj/area/index.html',
      urls: [
        'https://www.mofa.go.jp/mofaj/area/index.html',
        'https://web.archive.org/web/20260916115143/https://www.mofa.go.jp/mofaj/area/index.html',
        'https://en.wikipedia.org/wiki/List_of_national_capitals',
      ],
      checked: '2026-09-25',   // この日に 200 の国・地域の基礎データ（保存されたもの）を読み、首都の欄を取り出した
    },
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = CONSTANTS;
  else root.Constants = CONSTANTS;
})(this);
