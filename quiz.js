// ===========================
// クイズ広場 — 題材のページの画面（genso/・nengo/ など、どの題材でも同じ）
// 題材のデータは topics/<題材>.js（window.QuizTopics）、出題は calc.js（純粋関数）
// ページは <body data-topic="genso"> で題材を選ぶ
// ===========================
(function () {
  'use strict';

  var Calc = window.Calc;
  var TOPIC = window.QuizTopics[document.body.getAttribute('data-topic')];
  var SRC = (window.Constants || {})[TOPIC.sourceKey] || null;
  var CH = Calc.choiceCount(TOPIC) + '択';   // 4択（昭和クイズは 3択）
  // 向きが 1 つで入力できない題材（昭和クイズ）は、「答え方」「向き」の行を出さない（選べるものが無いので）
  var ONLY_CHOICE = TOPIC.kinds.length === 1 && TOPIC.kinds[0].typing === false;

  // --- ブラウザへの保存（README「ツールを追加するとき」12）。キーは必ず "quiz-hiroba_" で始める ---
  var KEY_PREFIX = 'quiz-hiroba_';
  var store = {
    get: function (name, fallback) {
      try {
        var v = localStorage.getItem(KEY_PREFIX + name);
        return v === null ? fallback : JSON.parse(v);
      } catch (e) { return fallback; }
    },
    set: function (name, value) {
      try { localStorage.setItem(KEY_PREFIX + name, JSON.stringify(value)); } catch (e) { /* 保存できなくても続ける */ }
    },
  };

  function $(id) { return document.getElementById(id); }
  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  function show(id) {
    ['scr-menu', 'scr-play', 'scr-result', 'scr-list', 'scr-print'].forEach(function (s) { $(s).hidden = s !== id; });
    document.body.classList.toggle('print-mode', id === 'scr-print');
    document.body.classList.toggle('playing', id === 'scr-play');
    window.scrollTo(0, 0);
  }

  // --- 設定（題材ごと） ---
  var COUNTS = [10, 20, 0];
  function normalizeSettings(s) {
    s = s || {};
    var kind = Calc.kindOf(TOPIC, s.kind);
    return {
      kind: kind.key,
      mode: s.mode === 'typing' ? 'typing' : 'choice',
      filters: Calc.normalizeFilters(TOPIC, s.filters),
      count: COUNTS.indexOf(s.count) >= 0 ? s.count : 10,
      weak: s.weak === true,
    };
  }
  var allSettings = store.get('settings', {}) || {};
  var settings = normalizeSettings(allSettings[TOPIC.id]);
  var records = Calc.normalizeRecords(store.get('records', {}), [TOPIC]);
  function saveSettings() {
    var all = store.get('settings', {}) || {};
    all[TOPIC.id] = settings;
    store.set('settings', all);
  }
  function saveRecords() {
    // ほかの題材の記録は触らない（このページは自分の題材だけを読み込んでいる）
    var all = store.get('records', {}) || {};
    all[TOPIC.id] = records[TOPIC.id];
    store.set('records', all);
  }

  var challenge = Calc.fromShareHash(location.hash, TOPIC);   // 共有リンクで開いたとき

  // --- メニュー ---
  function radioGroup(box, name, options, value, onChange) {
    box.textContent = '';
    options.forEach(function (o) {
      var lab = el('label', 'seg-item');
      var inp = document.createElement('input');
      inp.type = 'radio'; inp.name = name; inp.value = o.v; inp.checked = o.v === value;
      if (o.disabled) inp.disabled = true;
      inp.addEventListener('change', function () { onChange(o.v); });
      lab.appendChild(inp);
      lab.appendChild(document.createTextNode(' ' + o.label));
      box.appendChild(lab);
    });
  }

  function currentOpt() {
    var weak = settings.weak ? weakInPool() : [];
    return { kind: settings.kind, mode: settings.mode, filters: settings.filters, count: settings.count, only: weak };
  }
  function weakInPool() {
    var ids = Calc.weakIds(records, TOPIC);
    var inPool = {};
    Calc.pool(TOPIC, settings.filters).forEach(function (it) { inPool[it.id] = true; });
    return ids.filter(function (id) { return inPool[id]; });
  }

  function changed() {
    if (challenge) { challenge = null; history.replaceState(null, '', location.pathname); }
    saveSettings();
    renderMenu();
  }

  function renderMenu() {
    var kind = Calc.kindOf(TOPIC, settings.kind);
    radioGroup($('opt-mode'), 'mode', [
      { v: 'choice', label: CH },
      { v: 'typing', label: '入力（一問一答）', disabled: kind.typing === false },
    ], kind.typing === false ? 'choice' : settings.mode, function (v) { settings.mode = v; changed(); });
    $('mode-note').textContent = 'この向きは' + CH + 'だけです。';
    $('mode-note').hidden = kind.typing !== false || ONLY_CHOICE;
    $('opt-mode').parentNode.hidden = ONLY_CHOICE;
    $('opt-kind').parentNode.hidden = ONLY_CHOICE;
    radioGroup($('opt-kind'), 'kind', TOPIC.kinds.map(function (k) { return { v: k.key, label: k.label }; }), settings.kind,
      function (v) { settings.kind = v; changed(); });
    var fbox = $('opt-filters');
    fbox.textContent = '';
    (TOPIC.filters || []).forEach(function (flt) {
      var row = el('div', 'opt-row');
      row.appendChild(el('span', 'opt-label', flt.label));
      var g = el('div', 'seg');
      row.appendChild(g);
      fbox.appendChild(row);
      radioGroup(g, 'f-' + flt.key, flt.options.map(function (o) { return { v: o.v, label: o.label }; }), settings.filters[flt.key],
        function (v) { settings.filters[flt.key] = v; changed(); });
    });
    var n = Calc.pool(TOPIC, settings.filters).length;
    radioGroup($('opt-count'), 'count', COUNTS.map(function (c) { return { v: String(c), label: c ? c + '問' : 'すべて（' + n + '問）' }; }),
      String(settings.count), function (v) { settings.count = Number(v); changed(); });
    var weak = weakInPool();
    $('opt-weak').checked = settings.weak && weak.length > 0;
    $('opt-weak').disabled = weak.length === 0;
    $('weak-count').textContent = weak.length ? '（' + weak.length + '問）' : '（まだありません）';

    // 自己ベスト（同じ条件どうし）
    var key = Calc.bestKey(TOPIC, currentOpt());
    var best = records[TOPIC.id] && records[TOPIC.id].best[key];
    $('best-line').textContent = best ? 'この条件の自己ベスト: ' + best.n + '問中 ' + best.c + '問（' + Calc.formatMs(best.ms) + '）' : '';

    // 共有されたちょうせん
    var box = $('challenge');
    box.hidden = !challenge;
    if (challenge) {
      $('challenge-text').textContent = describe(challenge) + (challenge.score != null ? '。送った人は ' + challenge.score + '問 正解' : '');
    }
    renderRecords();
  }

  function describe(o) {
    var kind = Calc.kindOf(TOPIC, o.kind);
    var f = Calc.normalizeFilters(TOPIC, o.filters);
    var parts = ONLY_CHOICE ? [] : [kind.label, o.mode === 'typing' ? '入力' : CH];
    (TOPIC.filters || []).forEach(function (flt) {
      var opt = flt.options.filter(function (x) { return x.v === f[flt.key]; })[0];
      parts.push(opt.label);
    });
    var n = o.count > 0 ? Math.min(o.count, Calc.pool(TOPIC, f).length) : Calc.pool(TOPIC, f).length;
    parts.push(n + '問');
    return parts.join('・');
  }

  $('opt-weak').addEventListener('change', function (e) { settings.weak = e.target.checked; changed(); });

  // 記録の折りたたみ: にがての一覧と、記録を消すボタン
  function renderRecords() {
    var weak = Calc.weakIds(records, TOPIC);
    var bests = records[TOPIC.id] ? Object.keys(records[TOPIC.id].best).length : 0;
    $('rec-state').textContent = 'にがて ' + weak.length + '問・自己ベスト ' + bests + '件';
    var ul = $('weak-list');
    ul.textContent = '';
    weak.slice(0, 200).forEach(function (id) { ul.appendChild(el('li', null, TOPIC.label(Calc.itemById(TOPIC, id)))); });
    $('weak-empty').hidden = weak.length > 0;
  }
  $('rec-reset').addEventListener('click', function () {
    if (!window.confirm('この題材の記録（にがて・自己ベスト）をすべて消しますか？')) return;
    records = {};
    records[TOPIC.id] = { items: {}, best: {} };
    saveRecords();
    renderMenu();
  });

  // --- 出題 ---
  var round = null;   // { opt, qs, i, score, miss: [], t0, answered, fromChallenge }

  function start(opt, fromChallenge) {
    var qs = Calc.makeRound(TOPIC, opt);
    if (!qs.length) return;
    round = { opt: opt, qs: qs, i: 0, score: 0, miss: [], t0: Date.now(), fromChallenge: !!fromChallenge };
    show('scr-play');
    ask();
  }
  $('start').addEventListener('click', function () {
    var o = currentOpt();
    o.seed = Calc.newSeed();
    start(o, false);
  });
  $('challenge-start').addEventListener('click', function () {
    var o = Object.assign({}, challenge, { only: [] });
    start(o, true);
  });

  function modeOf(opt) {
    return opt.mode === 'typing' && Calc.kindOf(TOPIC, opt.kind).typing !== false ? 'typing' : 'choice';
  }

  function ask() {
    var q = round.qs[round.i];
    var it = Calc.itemById(TOPIC, q.id);
    var kind = Calc.kindOf(TOPIC, round.opt.kind);
    round.answered = false;
    $('progress').textContent = (round.i + 1) + ' / ' + round.qs.length;
    $('score').textContent = '正解 ' + round.score;
    $('question').textContent = kind.prompt(it);
    $('feedback').hidden = true;
    var choices = $('choices');
    choices.textContent = '';
    var typing = modeOf(round.opt) === 'typing';
    $('type-form').hidden = !typing;
    if (typing) {
      var inp = $('answer');
      inp.value = '';
      inp.readOnly = false;
      inp.setAttribute('inputmode', kind.numeric ? 'numeric' : 'text');
      inp.setAttribute('autocapitalize', kind.caseSensitive ? 'sentences' : 'off');
      $('answer-hint').textContent = kind.inputHint || '';
      $('answer-btn').disabled = false;
      $('skip-btn').disabled = false;
      inp.focus();
    } else {
      q.choices.forEach(function (c) {
        var b = el('button', 'choice', c);
        b.type = 'button';
        b.addEventListener('click', function () { answer(c === kind.choice(it), c, b); });
        choices.appendChild(b);
      });
    }
  }

  $('type-form').addEventListener('submit', function (e) {
    e.preventDefault();
    if (round && round.answered) { next(); return; }
    typed(false);
  });
  // 答えたあとの Enter でつぎへ（「答える」ボタンは止めてあるので、フォームの送信では進まない）。
  // 日本語入力の変換を確定する Enter（isComposing）では進まない
  $('answer').addEventListener('keydown', function (e) {
    if (e.key !== 'Enter' || e.isComposing || e.keyCode === 229) return;
    if (round && round.answered) { e.preventDefault(); next(); }
  });
  $('skip-btn').addEventListener('click', function () { typed(true); });

  function typed(skip) {
    if (!round || round.answered) return;
    var q = round.qs[round.i];
    var it = Calc.itemById(TOPIC, q.id);
    var kind = Calc.kindOf(TOPIC, round.opt.kind);
    var v = $('answer').value;
    var r = skip ? { ok: false } : Calc.checkTyped(kind, it, v);
    if (r.empty) { $('answer').focus(); return; }
    answer(r.ok, v, null, r.near);
  }

  function answer(ok, given, btn, near) {
    if (round.answered) return;
    round.answered = true;
    var q = round.qs[round.i];
    var it = Calc.itemById(TOPIC, q.id);
    var kind = Calc.kindOf(TOPIC, round.opt.kind);
    records = Calc.recordAnswer(records, TOPIC.id, it.id, ok);
    saveRecords();
    if (ok) round.score += 1; else round.miss.push({ id: it.id, given: given });
    $('score').textContent = '正解 ' + round.score;
    document.querySelectorAll('#choices .choice').forEach(function (b) {
      b.disabled = true;
      if (b.textContent === kind.choice(it)) b.classList.add('ok');
      else if (b === btn) b.classList.add('ng');
    });
    if (modeOf(round.opt) === 'typing') {
      $('answer').readOnly = true;
      $('answer-btn').disabled = true;
      $('skip-btn').disabled = true;
    }
    $('fb-title').textContent = ok ? '○ 正解' : '× 答えは ' + kind.answer(it);
    $('fb-title').className = 'fb-title ' + (ok ? 'ok' : 'ng');
    $('fb-near').hidden = near !== 'case';
    $('fb-body').textContent = TOPIC.explain(it);
    if (TOPIC.talk) talkLine().textContent = '話のきっかけ: ' + TOPIC.talk(it);
    var link = TOPIC.link(it);
    $('fb-link').hidden = !link;
    if (link) { $('fb-link-a').href = link.href; $('fb-link-a').textContent = '出典: ' + link.label; }
    $('next').textContent = round.i + 1 < round.qs.length ? 'つぎへ' : '結果を見る';
    $('feedback').hidden = false;
    if (modeOf(round.opt) === 'typing') $('answer').focus();   // スマホのキーボードを閉じない。Enter でつぎへ
    else $('next').focus();
  }

  // 話のきっかけ（昭和クイズ。回想法カードと同じ問いかけ）を答えの説明の下に出す
  function talkLine() {
    var p = $('fb-talk');
    if (!p) { p = el('p', 'fb-talk'); p.id = 'fb-talk'; $('fb-body').insertAdjacentElement('afterend', p); }
    return p;
  }

  function next() {
    round.i += 1;
    if (round.i < round.qs.length) ask(); else finish();
  }
  $('next').addEventListener('click', next);
  $('quit').addEventListener('click', function () { round = null; renderMenu(); show('scr-menu'); });

  function today() {
    var d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  function finish() {
    var n = round.qs.length, s = round.score, ms = Date.now() - round.t0;
    round.ms = ms;
    $('r-score').textContent = n + '問中 ' + s + '問 正解';
    $('r-time').textContent = 'かかった時間 ' + Calc.formatMs(ms);
    var msgs = [];
    // にがてだけ出した回は、条件がそろわないので自己ベストに入れない
    if (!(round.opt.only && round.opt.only.length)) {
      var rb = Calc.recordBest(records, TOPIC.id, Calc.bestKey(TOPIC, round.opt), s, n, ms, today());
      records = rb.records;
      saveRecords();
      if (rb.isBest && rb.prev) msgs.push('自己ベストを更新しました（前は ' + rb.prev.c + '問・' + Calc.formatMs(rb.prev.ms) + '）。');
      else if (rb.prev) msgs.push('この条件の自己ベストは ' + rb.prev.c + '問・' + Calc.formatMs(rb.prev.ms) + '。');
    }
    if (round.fromChallenge && challenge && challenge.score != null) {
      msgs.push('送った人は ' + challenge.score + '問 正解でした。');
    }
    $('r-msg').textContent = msgs.join(' ');
    var miss = $('r-miss');
    miss.textContent = '';
    var kind = Calc.kindOf(TOPIC, round.opt.kind);
    if (round.miss.length) {
      miss.appendChild(el('p', null, 'まちがえた問題'));
      var ul = el('ul');
      round.miss.forEach(function (m) {
        var it = Calc.itemById(TOPIC, m.id);
        ul.appendChild(el('li', null, kind.prompt(it) + ' → ' + kind.answer(it)));
      });
      miss.appendChild(ul);
    } else {
      miss.appendChild(el('p', null, 'ぜんぶ正解です。'));
    }
    $('r-weak').hidden = !round.miss.length;
    // にがてだけの回は種と条件で再現できないので、共有リンクを出さない
    var sharable = !(round.opt.only && round.opt.only.length);
    $('share-box').hidden = !sharable;
    $('share-url').value = '';
    $('share-msg').textContent = '';
    show('scr-result');
  }

  $('again').addEventListener('click', function () {
    var o = Object.assign({}, round.opt, { seed: Calc.newSeed() });
    start(o, false);
  });
  $('r-weak').addEventListener('click', function () {
    var o = Object.assign({}, round.opt, { seed: Calc.newSeed(), only: round.miss.map(function (m) { return m.id; }), count: 0 });
    start(o, false);
  });
  $('to-menu').addEventListener('click', function () { renderMenu(); show('scr-menu'); });
  $('share').addEventListener('click', function () {
    var url = location.origin + location.pathname + Calc.challengeToLink(TOPIC, round.opt, round.score);
    $('share-url').value = url;
    var done = function () { $('share-msg').textContent = 'リンクをコピーしました。開いた人は同じ問題・同じ選択肢で遊べます。'; };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(done, function () { $('share-msg').textContent = '下のリンクをコピーして送ってください。'; });
    } else {
      $('share-msg').textContent = '下のリンクをコピーして送ってください。';
    }
    $('share-url').select();
  });

  // --- 一覧で覚える ---
  var hidden = {};
  $('open-list').addEventListener('click', function () { renderList(); show('scr-list'); });
  $('list-back').addEventListener('click', function () { renderMenu(); show('scr-menu'); });
  function renderList() {
    var items = Calc.pool(TOPIC, settings.filters).slice().sort(function (a, b) { return TOPIC.order(a) - TOPIC.order(b); });
    $('list-title').textContent = '一覧（' + describeFilters() + '・' + items.length + TOPIC.unit + '）';
    var tg = $('list-toggles');
    tg.textContent = '';
    TOPIC.columns.forEach(function (c, i) {
      if (!c.hide) return;
      var lab = el('label', 'seg-item');
      var cb = document.createElement('input');
      cb.type = 'checkbox'; cb.checked = !!hidden[i];
      cb.addEventListener('change', function () { hidden[i] = cb.checked; renderList(); });
      lab.appendChild(cb);
      lab.appendChild(document.createTextNode(' ' + c.label + 'をかくす'));
      tg.appendChild(lab);
    });
    var table = $('list-table');
    table.textContent = '';
    var thead = el('thead'), tr = el('tr');
    TOPIC.columns.forEach(function (c) { var th = el('th', null, c.label); th.scope = 'col'; tr.appendChild(th); });
    thead.appendChild(tr);
    table.appendChild(thead);
    var tbody = el('tbody');
    items.forEach(function (it) {
      var row = el('tr');
      TOPIC.columns.forEach(function (c, i) {
        var td = el('td');
        if (hidden[i]) {
          var b = el('button', 'reveal', '？');
          b.type = 'button';
          b.setAttribute('aria-label', c.label + 'を見る');
          b.addEventListener('click', function () { td.textContent = String(c.get(it)); });
          td.appendChild(b);
        } else {
          td.textContent = String(c.get(it));
        }
        row.appendChild(td);
      });
      tbody.appendChild(row);
    });
    table.appendChild(tbody);
  }
  function describeFilters() {
    var f = settings.filters;
    return (TOPIC.filters || []).map(function (flt) {
      return flt.options.filter(function (x) { return x.v === f[flt.key]; })[0].label;
    }).join('・');
  }

  // --- 印刷（問題と答えの 2 枚） ---
  var printSeed = Calc.newSeed();
  $('open-print').addEventListener('click', function () { printSeed = Calc.newSeed(); renderPrint(); show('scr-print'); });
  $('print-back').addEventListener('click', function () { renderMenu(); show('scr-menu'); });
  $('print-new').addEventListener('click', function () { printSeed = Calc.newSeed(); renderPrint(); });
  $('print-go').addEventListener('click', function () { window.print(); });
  $('print-choices').addEventListener('change', renderPrint);
  $('print-choices-label').textContent = CH + 'の選択肢をつける';
  if ($('print-cards')) $('print-cards').addEventListener('change', renderPrint);
  function renderPrint() {
    var kind = Calc.kindOf(TOPIC, settings.kind);
    var cards = !!($('print-cards') && $('print-cards').checked);
    var withChoices = $('print-choices').checked || cards;
    var opt = { kind: settings.kind, mode: withChoices ? 'choice' : 'typing', filters: settings.filters, count: settings.count, seed: printSeed };
    if (kind.typing === false) opt.mode = 'choice';   // 4択だけの向き（年 → 出来事）は選択肢をつける
    $('print-choices').disabled = kind.typing === false;
    if (kind.typing === false) $('print-choices').checked = true;
    var qs = Calc.makeRound(TOPIC, opt);
    var head = ONLY_CHOICE ? describeFilters() : kind.label + '・' + describeFilters();
    $('print-desc').textContent = head + '・' + qs.length + '問（問題番号 ' + printSeed + '）' + (cards ? '。答えは逆さまに印刷されます（点線で後ろへ折り、裏返すと読めます）' : '');
    var box = $('sheets');
    box.textContent = '';
    var credit = 'yorozu-craft.com/quiz-hiroba/print/ で作成　問題番号 ' + printSeed;
    var mark = ['ア', 'イ', 'ウ', 'エ'];
    if (cards) { renderCards(box, kind, qs, mark, credit); return; }
    function sheet(title, fill) {
      var s = el('section', 'sheet');
      var h = el('div', 'sheet-head');
      h.appendChild(el('h2', null, TOPIC.page.h1 + '　' + title));
      h.appendChild(el('p', 'sheet-meta', head + '・' + qs.length + '問'));
      var nm = el('p', 'sheet-name');
      nm.appendChild(el('span', 'nm', 'なまえ'));
      nm.appendChild(el('span', 'pt', 'てん　　　／ ' + qs.length));
      h.appendChild(nm);
      s.appendChild(h);
      var ol = el('ol', 'sheet-list');
      qs.forEach(function (q) { var li = el('li'); fill(li, q); ol.appendChild(li); });
      s.appendChild(ol);
      s.appendChild(el('p', 'sheet-credit', credit));
      box.appendChild(s);
    }
    sheet('問題', function (li, q) {
      var it = Calc.itemById(TOPIC, q.id);
      li.appendChild(el('span', 'q', kind.prompt(it)));
      if (q.choices) {
        var cs = el('span', 'cs');
        q.choices.forEach(function (c, i) { cs.appendChild(el('span', null, mark[i] + ' ' + c)); });
        li.appendChild(cs);
      } else {
        li.appendChild(el('span', 'blank', ''));
      }
    });
    sheet('答え', function (li, q) {
      var it = Calc.itemById(TOPIC, q.id);
      var ans = kind.answer(it);
      if (q.choices) ans = mark[q.choices.indexOf(kind.choice(it))] + '　' + ans;
      li.appendChild(el('span', 'q', kind.prompt(it)));
      li.appendChild(el('span', 'a', ans));
    });
  }

  // 回想法カード（昭和クイズ）: A4 に 6 枚（2 列×3 段）。上が問題と選択肢、点線の下が答え・説明・話のきっかけ。
  // 答えは 180 度回して印刷する（点線で後ろへ折り、本のページのように裏返すと正しい向きで読める）
  function renderCards(box, kind, qs, mark, credit) {
    for (var i = 0; i < qs.length; i += 6) {
      var s = el('section', 'sheet cards-sheet');
      var grid = el('div', 'card-grid');
      qs.slice(i, i + 6).forEach(function (q, j) {
        var it = Calc.itemById(TOPIC, q.id);
        var c = el('div', 'qcard');
        var front = el('div', 'qc-front');
        front.appendChild(el('p', 'qc-head', (i + j + 1) + '　' + (TOPIC.cats ? TOPIC.cats[it.cat] : '')));
        front.appendChild(el('p', 'qc-q', kind.prompt(it)));
        var ol = el('ul', 'qc-cs');
        q.choices.forEach(function (ch, k) { ol.appendChild(el('li', null, mark[k] + '　' + ch)); });
        front.appendChild(ol);
        c.appendChild(front);
        c.appendChild(el('p', 'qc-fold', '山折り'));
        var back = el('div', 'qc-back');
        back.appendChild(el('p', 'qc-a', '答え　' + mark[q.choices.indexOf(kind.choice(it))] + '　' + kind.answer(it)));
        back.appendChild(el('p', 'qc-ex', TOPIC.explain(it)));
        if (TOPIC.talk) back.appendChild(el('p', 'qc-talk', '話のきっかけ: ' + TOPIC.talk(it)));
        c.appendChild(back);
        grid.appendChild(c);
      });
      s.appendChild(grid);
      s.appendChild(el('p', 'sheet-credit', credit + '（出典は画面の「出典と確認日」）'));
      box.appendChild(s);
    }
  }

  // 出典の折りたたみ
  if (SRC) {
    $('src-text').textContent = SRC.source + '。最終確認日 ' + SRC.checked + '。';
    var ul = $('src-links');
    (SRC.urls || [SRC.url]).forEach(function (u) {
      var li = el('li'), a = el('a', null, u);
      a.href = u; a.rel = 'noopener'; a.target = '_blank';
      li.appendChild(a); ul.appendChild(li);
    });
  }

  if (challenge) {
    settings = normalizeSettings(Object.assign({}, challenge, { weak: false }));
  }
  renderMenu();
  show('scr-menu');
  document.documentElement.classList.remove('js-loading');

  // PWA: オフラインでも遊べるように（登録は ../sw.js。scope はツールの直下。README「ツールを追加するとき」13）
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
    addEventListener('load', function () { navigator.serviceWorker.register('../sw.js').catch(function () {}); });
  }
})();
