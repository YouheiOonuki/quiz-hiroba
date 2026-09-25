// ===========================
// 題材: 昭和クイズ（回想法のきっかけ用。3 択・大きな字）
// 高齢者向けのページ（yorozu-plans D118）: 広告なし。遊ぶ画面も使い方（showa/guide.html）も AdSense は meta だけ
// 問題はすべて公的な資料・主催者の一覧にある事実だけで作る。歌詞は載せない（題名・歌った人・年だけ）
//
// 出来事: 国立公文書館「公文書にみる日本のあゆみ」の各ページの題（年と月）。
//         昭和33年の東京タワーは日本電波塔株式会社の会社年表、一万円札は日本銀行「一万円券」の発行開始日、
//         青函トンネルは鉄道・運輸機構の「青函トンネル」のページ（昭和63年に津軽海峡線として開業）
// 物の値段: 総務省統計局「小売物価統計調査（動向編）」の「主要品目の東京都区部小売価格：昭和25年(1950年)〜平成22年(2010年)」
//         （kubu_chouki.xls）の年平均。東京23区の値。行の 2 つ目は品目の番号（表の列の見出し）。
//         同じ品目の 3 つの年を 1 組にし、3 択の選択肢はその組の値だけにする（向きの group）
// レコード大賞: 公益社団法人 日本作曲家協会「日本レコード大賞 歴代大賞一覧」の大賞（第1回 1959〜第30回 1988）
// 確かめた日: 2026-09-25（constants.js の showa）
// ===========================
(function (root) {
  'use strict';

  function wareki(y) { return '昭和' + (y - 1925) + '年（' + y + '年）'; }

  var AYUMI = 'https://www.archives.go.jp/ayumi/kobetsu/';
  // [id, 年, 月, 出来事の文（出典の題のまま、または出典の文から）, 出典のリンク, 出典の名前]
  var EVENTS = [
    ['yukawa', 1949, 11, '湯川秀樹にノーベル物理学賞が授与される', AYUMI + 's24_1949_04.html', '国立公文書館「日本のあゆみ」'],
    ['tv', 1953, 2, 'テレビ放送が始まる', AYUMI + 's28_1953_01.html', '国立公文書館「日本のあゆみ」'],
    ['nankyoku', 1956, 11, '南極観測が始まる', AYUMI + 's31_1956_04.html', '国立公文書館「日本のあゆみ」'],
    ['kokuren', 1956, 12, '日本が国際連合に加盟する', AYUMI + 's32_1956_04.html', '国立公文書館「日本のあゆみ」'],
    ['tower', 1958, 0, '東京タワーが営業を始める', 'https://www.tokyotower.co.jp/company/', '東京タワー「会社概要」の会社年表'],
    ['shotoku', 1958, 12, '聖徳太子の一万円札が発行される', 'https://www.boj.or.jp/note_tfjgs/note/valid/past_issue/pbn_10000.htm', '日本銀行「一万円券」'],
    ['shinkansen', 1964, 10, '東海道新幹線が開通する', AYUMI + 's39_1964_03.html', '国立公文書館「日本のあゆみ」'],
    ['tokyo64', 1964, 10, '東京オリンピックが開かれる', AYUMI + 's39_1964_04.html', '国立公文書館「日本のあゆみ」'],
    ['ogasawara', 1968, 6, '小笠原諸島が返還される', AYUMI + 's43_1968_01.html', '国立公文書館「日本のあゆみ」'],
    ['eisei', 1970, 2, '日本で初めての人工衛星が打ち上げられる', AYUMI + 's45_1970_01.html', '国立公文書館「日本のあゆみ」'],
    ['banpaku', 1970, 3, '大阪で日本万国博覧会が開かれる', AYUMI + 's45_1970_02.html', '国立公文書館「日本のあゆみ」'],
    ['sapporo', 1972, 2, '札幌オリンピックが開かれる', AYUMI + 's47_1972_01.html', '国立公文書館「日本のあゆみ」'],
    ['okinawa', 1972, 5, '沖縄が返還される', AYUMI + 's47_1972_02.html', '国立公文書館「日本のあゆみ」'],
    ['fukuzawa', 1984, 11, '福沢諭吉の一万円札が発行される', 'https://www.boj.or.jp/note_tfjgs/note/valid/past_issue/pbn_10000.htm', '日本銀行「一万円券」'],
    ['seikan', 1988, 0, '青函トンネルが開業する（津軽海峡線）', 'https://www.jrtt.go.jp/construction/outline/seikan-tunnel.html', '鉄道・運輸機構「青函トンネル」'],
  ];

  // [組, 品目の番号, 問いの品目, [[年, 円], …], 話のきっかけ]
  var PRICES = [
    ['hagaki', '7401', 'はがき1枚の郵便料金', [[1960, 5], [1970, 7], [1980, 20]], 'そのころ、はがきをよく出した相手はどなたですか。'],
    ['fusho', '7402', '封書（手紙）1通の郵便料金', [[1960, 10], [1970, 15], [1980, 50]], '心に残っている手紙はありますか。'],
    ['ramen', '2102', 'ラーメン（中華そば）1杯', [[1970, 96], [1975, 211], [1980, 311]], 'よく行ったお店や、好きだった味はありますか。'],
    ['coffee', '2162', '喫茶店のコーヒー1杯', [[1970, 95], [1975, 194], [1980, 247]], '行きつけの喫茶店はありましたか。'],
    ['curry', '2133', 'お店のカレーライス1皿', [[1970, 136], [1975, 284], [1980, 401]], '家のカレーとお店のカレー、どちらが好きでしたか。'],
    ['eiga', '9341', '映画館の入場料（大人1回）', [[1960, 119], [1970, 351], [1980, 1357]], '思い出に残っている映画や映画館はありますか。'],
    ['sento', '9501', '銭湯の入浴料（大人1回）', [[1960, 17], [1970, 38], [1980, 195]], '近所の銭湯の名前を覚えていますか。'],
    ['rihatsu', '9511', '床屋さんの散髪代（大人1回）', [[1960, 163], [1970, 555], [1980, 2227]], 'そのころ、はやっていた髪形はどんな形でしたか。'],
    ['shinbun', '9202', '新聞代（朝刊・夕刊、1か月）', [[1960, 390], [1970, 750], [1980, 1800]], '新聞で毎日読んでいた欄はどこですか。'],
    ['taxi', '7061', 'タクシーの初乗り運賃', [[1960, 70], [1970, 130], [1980, 380]], 'タクシーに乗ったのは、どんなときでしたか。'],
  ];

  // [回, 年, 題名, 歌った人]（日本作曲家協会の一覧の表記のまま。「／」で区切られた歌手は「・」でつなぐ）
  var RECORDS = [
    [1, 1959, '黒い花びら', '水原弘'],
    [2, 1960, '誰より君を愛す', '松尾和子・和田弘とマヒナスターズ'],
    [3, 1961, '君恋し', 'フランク永井'],
    [4, 1962, 'いつでも夢を', '橋幸夫・吉永小百合'],
    [5, 1963, 'こんにちは赤ちゃん', '梓みちよ'],
    [6, 1964, '愛と死をみつめて', '青山和子'],
    [7, 1965, '柔', '美空ひばり'],
    [8, 1966, '霧氷', '橋幸夫'],
    [9, 1967, 'ブルー・シャトウ', 'ジャッキー吉川とブルー・コメッツ'],
    [10, 1968, '天使の誘惑', '黛ジュン'],
    [11, 1969, 'いいじゃないの幸せならば', '佐良直美'],
    [12, 1970, '今日でお別れ', '菅原洋一'],
    [13, 1971, 'また逢う日まで', '尾崎紀世彦'],
    [14, 1972, '喝采', 'ちあきなおみ'],
    [15, 1973, '夜空', '五木ひろし'],
    [16, 1974, '襟裳岬', '森進一'],
    [17, 1975, 'シクラメンのかほり', '布施明'],
    [18, 1976, '北の宿から', '都はるみ'],
    [19, 1977, '勝手にしやがれ', '沢田研二'],
    [20, 1978, 'UFO', 'ピンク・レディー'],
    [21, 1979, '魅せられて', 'ジュディ・オング'],
    [22, 1980, '雨の慕情', '八代亜紀'],
    [23, 1981, 'ルビーの指輪', '寺尾聰'],
    [24, 1982, '北酒場', '細川たかし'],
    [25, 1983, '矢切の渡し', '細川たかし'],
    [26, 1984, '長良川艶歌', '五木ひろし'],
    [27, 1985, 'ミ・アモーレ', '中森明菜'],
    [28, 1986, 'DESIRE', '中森明菜'],
    [29, 1987, '愚か者', '近藤真彦'],
    [30, 1988, 'パラダイス銀河', '光GENJI'],
  ];

  var STAT_URL = 'https://www.stat.go.jp/data/kouri/doukou/3.html';
  var RECORD_URL = 'https://www.jacompa.or.jp/record/';
  var CATS = { dekigoto: '出来事', nedan: '物の値段', record: 'レコード大賞' };
  var TALK = {
    dekigoto: 'そのころ、どこで、どんな暮らしをしていましたか。',
    record: 'この歌を、どこで聞いたか覚えていますか。',
  };

  var items = [];
  EVENTS.forEach(function (r) {
    items.push({
      id: 'e-' + r[0], cat: 'dekigoto', year: r[1], group: 'dekigoto',
      q: '「' + r[3] + '」のは、いつ？',
      a: wareki(r[1]),
      text: wareki(r[1]) + (r[2] ? r[2] + '月' : '') + '　' + r[3],
      href: r[4], src: r[5], talk: TALK.dekigoto,
    });
  });
  PRICES.forEach(function (r) {
    var line = r[3].map(function (p) { return wareki(p[0]) + ' ' + p[1].toLocaleString('ja-JP') + '円'; }).join(' → ');
    r[3].forEach(function (p) {
      items.push({
        id: 'p-' + r[0] + '-' + p[0], cat: 'nedan', year: p[0], group: 'p-' + r[0], code: r[1], yen: p[1], what: r[2],
        q: wareki(p[0]) + 'の、' + r[2] + 'は？',
        a: p[1].toLocaleString('ja-JP') + '円',
        text: r[2] + '（東京23区の年平均）: ' + line,
        href: STAT_URL, src: '総務省統計局「小売物価統計調査」', talk: r[4],
      });
    });
  });
  RECORDS.forEach(function (r) {
    items.push({
      id: 'r-' + r[1], cat: 'record', year: r[1], group: 'record', title: r[2], singer: r[3],
      q: wareki(r[1]) + 'の日本レコード大賞は？',
      a: r[2] + '（' + r[3] + '）',
      text: '第' + r[0] + '回 ' + wareki(r[1]) + '　' + r[2] + '／' + r[3],
      href: RECORD_URL, src: '日本作曲家協会「日本レコード大賞 歴代大賞一覧」', talk: TALK.record,
    });
  });

  function inRange(a, b) { return function (it) { return it.year >= a && it.year <= b; }; }

  var topic = {
    id: 'showa',
    choices: 3,
    page: {
      title: '昭和クイズ（高齢者向け・3択・印刷）｜出来事・物の値段・レコード大賞',
      h1: '昭和クイズ（回想法カード）',
      lead: '昭和の出来事・物の値段・歌の題名を3択で。',
      description: '高齢者向けの昭和クイズ（3択・75問）。昭和の出来事の年、はがき・銭湯・ラーメンなどの値段、日本レコード大賞の曲。大きな字、問題と答えの印刷、折って使う回想法カードつき。出典つき。広告なし・登録不要・無料。',
      hub: '昭和の出来事・物の値段・レコード大賞。3択・大きな字・回想法カード',
      icon: '📻',
      order: 5,
      big: true,
      noAds: true,
      cards: true,
      guide: 'showa/guide.html',
      note: '出来事は国立公文書館などの公的な資料、値段は総務省統計局の小売物価統計調査（東京23区の年平均）、歌は日本作曲家協会の日本レコード大賞の一覧から作りました。歌詞は載せていません。',
    },
    unit: '問',
    order: function (it) { return it.year; },
    label: function (it) { return it.q + ' ' + it.a; },
    items: items,
    kinds: [
      {
        key: 'q', label: '3択', typing: false,
        prompt: function (it) { return it.q; },
        answer: function (it) { return it.a; },
        accept: function (it) { return [it.a]; },
        choice: function (it) { return it.a; },
        group: function (it) { return it.group; },
      },
    ],
    filters: [
      {
        key: 'cat', label: 'しゅるい', def: 'all',
        options: [{ v: 'all', label: 'すべて', test: function () { return true; } }].concat(Object.keys(CATS).map(function (k) {
          return { v: k, label: CATS[k], test: function (it) { return it.cat === k; } };
        })),
      },
      {
        key: 'era', label: '年代', def: 'all',
        options: [
          { v: 'all', label: 'すべて', test: function () { return true; } },
          { v: 's20', label: '昭和20〜30年代', test: inRange(1945, 1964) },
          { v: 's40', label: '昭和40年代', test: inRange(1965, 1974) },
          { v: 's50', label: '昭和50〜60年代', test: inRange(1975, 1989) },
        ],
      },
    ],
    columns: [
      { label: 'しゅるい', get: function (it) { return CATS[it.cat]; } },
      { label: '問題', get: function (it) { return it.q; } },
      { label: '答え', get: function (it) { return it.a; }, hide: true },
    ],
    explain: function (it) { return it.text; },
    link: function (it) { return { href: it.href, label: it.src }; },
    talk: function (it) { return it.talk; },
    cats: CATS,
    wareki: wareki,
    sourceKey: 'showa',
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = topic;
  else { root.QuizTopics = root.QuizTopics || {}; root.QuizTopics[topic.id] = topic; }
})(this);
