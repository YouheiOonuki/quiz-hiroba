// ===========================
// 題材: 国旗クイズ（196 か国。ROADMAP K88）
// 国名・地域: 世界の首都クイズ（topics/shuto.js）の 191 か国と同じ外務省の表記・地域をそのまま使う（ここで書き直さない）。
//   それに、外務省「国・地域」の一覧にあって首都クイズでは出さない 4 か国（イスラエル国・シンガポール共和国・バチカン市国・モナコ公国。
//   首都の欄の扱いで外した国で、旗には問題が無い）と、日本を足した。国名の表記は topics/shuto.js の先頭の説明と同じ外務省の一覧（2026-09-16 の保存）。
//   「その他の地域」（北朝鮮・台湾・パレスチナ・香港・マカオ）は首都クイズと同じく出さない。
// 旗の絵: lipis/flag-icons 7.5.0（MIT License。flags/LICENSE・flags/VERSION）の flags/4x3/<ISO 3166-1 の 2 文字>.svg。
//   外務省の URL の名前 → ISO の 2 文字は、flag-icons の country.json の英語名と 1 つずつ突き合わせて決めた（下の CODE。テストで 196 件・重なりなし・ファイルがあることを確かめる）
// レベル（運営者が決めた規則。どれも「覚えやすさ」の調査ではない）:
//   小学生  運営者が選んだ 30 か国（KIDS）。選択肢もその 30 か国から
//   ふつう  196 か国すべて。選択肢はばらばら
//   難しい  196 か国すべて。選択肢は同じ地域（外務省の分け方）の国から
//   激ムズ  運営者が「似ている」と決めた旗の組（SIMILAR。色と並びがほぼ同じで、紋章・星・色の順・向きだけが違うもの）にある国だけ。選択肢は同じ組から
// 旗の絵は、問題に出たとき・一覧でその行が見えたときに読み込む（最初に取っておくファイル（sw.js）には入れない）
// ===========================
(function (root) {
  'use strict';

  var shuto = (typeof module !== 'undefined' && module.exports) ? require('./shuto.js') : root.QuizTopics.shuto;

  // 外務省の URL の名前 → ISO 3166-1 alpha-2（flag-icons のファイル名）
  var CODE = {
    iceland: 'is', ireland: 'ie', azerbaijan: 'az', afghanistan: 'af', usa: 'us', uae: 'ae', algeria: 'dz', argentine: 'ar', albania: 'al', armenia: 'am',
    angola: 'ao', antigua: 'ag', andorra: 'ad', yemen: 'ye', italy: 'it', iraq: 'iq', iran: 'ir', india: 'in', indonesia: 'id', uganda: 'ug',
    ukraine: 'ua', uzbekistan: 'uz', uruguay: 'uy', uk: 'gb', ecuador: 'ec', egypt: 'eg', estonia: 'ee', eswatini: 'sz', ethiopia: 'et', eritrea: 'er',
    elsalvador: 'sv', australia: 'au', austria: 'at', oman: 'om', netherlands: 'nl', ghana: 'gh', capeverde: 'cv', guyana: 'gy', kazakhstan: 'kz', qatar: 'qa',
    canada: 'ca', gabon: 'ga', cameroon: 'cm', gambia: 'gm', cambodia: 'kh', macedonia: 'mk', guinea: 'gn', guinea_b: 'gw', cyprus: 'cy', cuba: 'cu',
    greece: 'gr', kiribati: 'ki', kyrgyz: 'kg', guatemala: 'gt', kuwait: 'kw', cook: 'ck', grenada: 'gd', croatia: 'hr', kenya: 'ke', cote_d: 'ci',
    costarica: 'cr', kosovo: 'xk', comoros: 'km', colombia: 'co', congokyo: 'cg', congomin: 'cd', saudi: 'sa', samoa: 'ws', stp: 'st', zambia: 'zm',
    sanmarino_r: 'sm', s_leone: 'sl', djibouti: 'dj', jamaica: 'jm', georgia: 'ge', syria: 'sy', zimbabwe: 'zw', switzerland: 'ch', sweden: 'se', sudan: 'sd',
    spain: 'es', suriname: 'sr', srilanka: 'lk', slovak: 'sk', slovenia: 'si', seychelles: 'sc', eq_guinea: 'gq', senegal: 'sn', serbia: 'rs', scn: 'kn',
    svg: 'vc', s_lucia: 'lc', somali: 'so', solomon: 'sb', thailand: 'th', korea: 'kr', tajikistan: 'tj', tanzania: 'tz', czech: 'cz', chad: 'td',
    car: 'cf', china: 'cn', tunisia: 'tn', chile: 'cl', tuvalu: 'tv', denmark: 'dk', germany: 'de', togo: 'tg', c_dominica: 'dm', dominican_r: 'do',
    trinidad: 'tt', turkmenistan: 'tm', turkey: 'tr', tonga: 'to', nigeria: 'ng', nauru: 'nr', namibia: 'na', niue: 'nu', nicaragua: 'ni', niger: 'ne',
    nz: 'nz', nepal: 'np', norway: 'no', bahrain: 'bh', haiti: 'ht', pakistan: 'pk', panama: 'pa', vanuatu: 'vu', bahama: 'bs', png: 'pg',
    palau: 'pw', paraguay: 'py', barbados: 'bb', hungary: 'hu', bangladesh: 'bd', easttimor: 'tl', fiji: 'fj', philippines: 'ph', finland: 'fi', bhutan: 'bt',
    brazil: 'br', france: 'fr', bulgaria: 'bg', burkina: 'bf', brunei: 'bn', brundi: 'bi', vietnam: 'vn', benin: 'bj', venezuela: 've', belarus: 'by',
    belize: 'bz', peru: 'pe', belgium: 'be', poland: 'pl', bosnia_h: 'ba', botswana: 'bw', bolivia: 'bo', portugal: 'pt', honduras: 'hn', marshall: 'mh',
    madagascar: 'mg', malawi: 'mw', mali: 'ml', malta: 'mt', malaysia: 'my', micronesia: 'fm', s_africa: 'za', s_sudan: 'ss', myanmar: 'mm', mexico: 'mx',
    mauritius: 'mu', mauritania: 'mr', mozambique: 'mz', maldives: 'mv', moldova: 'md', morocco: 'ma', mongolia: 'mn', montenegro: 'me', jordan: 'jo', laos: 'la',
    latvia: 'lv', lithuania: 'lt', libya: 'ly', liechtenstein: 'li', liberia: 'lr', romania: 'ro', luxembourg: 'lu', rwanda: 'rw', lesotho: 'ls', lebanon: 'lb',
    russia: 'ru',
    israel: 'il', singapore: 'sg', vatican: 'va', monaco: 'mc', japan: 'jp',
  };

  // 首都クイズに無い 5 か国: [外務省の URL の名前（日本は japan）, 国名, 地域, 外務省の五十音の並びで直前にくる国]
  var EXTRA = [
    ['israel', 'イスラエル国', 'mideast', 'yemen'],
    ['singapore', 'シンガポール共和国', 'asia', 'syria'],
    ['vatican', 'バチカン市国', 'europe', 'pakistan'],
    ['monaco', 'モナコ公国', 'europe', 'mozambique'],
    ['japan', '日本', 'asia', 'niger'],
  ];

  // 小学生: 運営者が選んだ 30 か国（日本と近くの国、各地域でよく名前が出る国。似た旗どうしはなるべく入れない）
  var KIDS = ['japan', 'korea', 'china', 'mongolia', 'india', 'thailand', 'vietnam', 'philippines', 'saudi', 'turkey',
    'uk', 'france', 'germany', 'italy', 'spain', 'switzerland', 'sweden', 'greece', 'russia', 'portugal',
    'usa', 'canada', 'mexico', 'brazil', 'argentine', 'australia', 'egypt', 's_africa', 'kenya', 'jamaica'];

  // 激ムズ: 運営者が「似ている」と決めた旗の組
  var SIMILAR = [
    ['青・黄・赤のたて3色', ['chad', 'romania', 'andorra', 'moldova']],
    ['赤と白の横2色（上下が逆のものも）', ['indonesia', 'monaco', 'poland', 'singapore']],
    ['赤・白・青の横3色', ['netherlands', 'luxembourg', 'paraguay', 'croatia']],
    ['緑・白・だいだい（赤）のたて3色（順が逆のものも）', ['ireland', 'cote_d', 'italy']],
    ['青地に英国の旗と南十字星', ['australia', 'nz']],
    ['北欧の十字', ['norway', 'iceland', 'denmark', 'sweden', 'finland']],
    ['緑・黄・赤のたて3色（順がちがうものも）', ['senegal', 'mali', 'guinea', 'cameroon']],
    ['赤・白・黒の横3色', ['yemen', 'egypt', 'iraq']],
    ['青と赤の横2色', ['haiti', 'liechtenstein']],
    ['黄・青・赤の横', ['colombia', 'ecuador', 'venezuela']],
    ['青・白・青の横3本', ['honduras', 'nicaragua', 'elsalvador']],
    ['白・青・赤の横3色（順が逆のものも）', ['slovenia', 'slovak', 'russia', 'serbia']],
    ['白と赤（えんじ）のぎざぎざ', ['qatar', 'bahrain']],
    ['赤・緑・白・黒の4色', ['uae', 'kuwait', 'jordan', 'sudan']],
    ['赤地に白い三日月と星', ['turkey', 'tunisia']],
    ['赤・黄・緑の横3色（順がちがうものも）', ['ghana', 'bolivia', 'lithuania', 'ethiopia']],
    ['赤・白・赤の横3本', ['austria', 'latvia']],
    ['だいだい・白・緑の横3色と丸', ['india', 'niger']],
    ['赤・白・緑の横3色（順がちがうものも）', ['hungary', 'bulgaria', 'iran']],
    ['赤・白・赤のたて3本', ['peru', 'canada']],
    ['赤と白のしま', ['usa', 'malaysia', 'liberia']],
    ['黒・黄・赤の3色', ['belgium', 'germany']],
    ['丸が1つ', ['japan', 'bangladesh', 'palau', 'laos']],
  ];
  var SIM_OF = {};
  SIMILAR.forEach(function (g, k) { g[1].forEach(function (id) { SIM_OF[id] = k; }); });

  var REGION_NAME = shuto.regions;
  var REGION_ORDER = ['asia', 'mideast', 'europe', 'africa', 'namerica', 'latin', 'oceania'];

  // 並び: 首都クイズと同じ外務省の五十音の順に、5 か国を差し込む
  var list = shuto.items.map(function (it) { return { id: it.id, country: it.country, region: it.region }; });
  EXTRA.forEach(function (x) {
    var at = list.findIndex(function (it) { return it.id === x[3]; });
    list.splice(at + 1, 0, { id: x[0], country: x[1], region: x[2] });
  });
  var items = list.map(function (it, i) {
    return { id: it.id, country: it.country, region: it.region, code: CODE[it.id], i: i, kids: KIDS.indexOf(it.id) >= 0, sim: it.id in SIM_OF ? SIM_OF[it.id] : -1 };
  });
  var ORD = {};
  items.slice().sort(function (a, b) { return (REGION_ORDER.indexOf(a.region) - REGION_ORDER.indexOf(b.region)) || (a.i - b.i); })
    .forEach(function (it, k) { ORD[it.id] = k; });
  var BY_COUNTRY = {};
  items.forEach(function (it) { BY_COUNTRY[it.country] = it; });

  /** 旗の絵の場所（題材のページ /quiz-hiroba/kokki/ から見て） */
  function flagUrl(it) { return '../flags/4x3/' + it.code + '.svg'; }

  var topic = {
    id: 'kokki',
    page: {
      title: '国旗クイズ 196か国｜小学生〜激ムズ・4択・印刷',
      h1: '国旗クイズ（196か国）',
      lead: '旗を見て国を、国名から旗を4択で。小学生〜激ムズ。',
      description: '国旗クイズ。外務省の国名で196か国。旗→国、国→旗を4択で。小学生（30か国）・ふつう・難しい（同じ地域）・激ムズ（似ている旗）の4段階。一覧で覚える・問題と答えを印刷もできる。登録不要・無料。',
      hub: '旗→国、国→旗。小学生〜激ムズの4段階',
      icon: '🚩',
      order: 4.5,
      deps: ['topics/shuto.js'],
      note: '国名は外務省「国・地域」の表記です（世界の首都クイズと同じ191か国に、イスラエル・シンガポール・バチカン・モナコと日本を足しました）。旗の絵は flag-icons（MIT License）です。レベルの分け方は運営者が決めたもので、「似ている旗」の組も運営者の判断です。',
    },
    unit: 'か国',
    order: function (it) { return ORD[it.id]; },
    label: function (it) { return it.country; },
    items: items,
    kinds: [
      {
        key: 'flag', label: '旗 → 国', typing: false,
        prompt: function () { return 'この旗の国は？'; },
        img: flagUrl,
        answer: function (it) { return it.country; },
        accept: function (it) { return [it.country]; },
        choice: function (it) { return it.country; },
      },
      {
        key: 'pick', label: '国 → 旗', typing: false,
        prompt: function (it) { return '「' + it.country + '」の旗は？'; },
        answer: function (it) { return it.country; },
        accept: function (it) { return [it.country]; },
        choice: function (it) { return it.country; },
        // 選択肢は国名ではなく旗の絵を出す（国名は答えたあとに出す）
        choiceImg: function (country) { var it = BY_COUNTRY[country]; return it ? flagUrl(it) : ''; },
      },
    ],
    filters: [
      {
        key: 'lv', label: 'レベル', def: 'kids',
        options: [
          { v: 'kids', label: '小学生', near: false, test: function (it) { return it.kids; } },
          { v: 'normal', label: 'ふつう', near: false, test: function () { return true; } },
          { v: 'hard', label: '難しい', near: false, group: function (it) { return it.region; }, test: function () { return true; } },
          { v: 'extreme', label: '激ムズ', near: false, group: function (it) { return it.sim; }, test: function (it) { return it.sim >= 0; } },
        ],
      },
    ],
    columns: [
      { label: '旗', get: function (it) { return flagUrl(it); }, img: true },
      { label: '国名', get: function (it) { return it.country; }, hide: true },
      { label: '地域', get: function (it) { return REGION_NAME[it.region]; } },
    ],
    explain: function (it) {
      var s = it.country + 'の旗（' + REGION_NAME[it.region] + '）。';
      if (it.sim >= 0) {
        var g = SIMILAR[it.sim];
        var others = g[1].filter(function (id) { return id !== it.id; }).map(function (id) { return items.filter(function (x) { return x.id === id; })[0].country; });
        s += '似ている旗（' + g[0] + '）: ' + others.join('・') + '。';
      }
      return s;
    },
    link: function (it) {
      return it.id === 'japan' ? null : { href: 'https://www.mofa.go.jp/mofaj/area/' + it.id + '/data.html', label: '外務省「' + it.country + '基礎データ」' };
    },
    answerImg: flagUrl,
    regions: REGION_NAME,
    similar: SIMILAR,
    kidsIds: KIDS,
    sourceKey: 'kokki',
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = topic;
  else { root.QuizTopics = root.QuizTopics || {}; root.QuizTopics[topic.id] = topic; }
})(this);
