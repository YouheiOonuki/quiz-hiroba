// ===========================
// クイズ大会セット（早押しボタン）— 画面・タッチ・効果音
// 判定と得点は hayaoshi.js（純粋関数）。問題はクイズ広場の題材（topics/*.js）から calc.js で出す
// ===========================
(function () {
  'use strict';

  var H = window.Hayaoshi;
  var Calc = window.Calc;
  var TOPICS = window.QuizTopics || {};

  // --- 保存（README「ツールを追加するとき」12。キーは quiz-hiroba_ で始める） ---
  var KEY = 'quiz-hiroba_hayaoshi';
  function load() { try { var v = localStorage.getItem(KEY); return v ? JSON.parse(v) : null; } catch (e) { return null; } }
  function save() {
    try {
      localStorage.setItem(KEY, JSON.stringify({ settings: settings, game: { n: game.n, scores: game.scores, q: game.q, seed: seed } }));
    } catch (e) { /* 保存できなくても続ける */ }
  }

  function $(id) { return document.getElementById(id); }
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function show(id) {
    ['scr-menu', 'scr-play', 'scr-result', 'scr-reader'].forEach(function (s) { $(s).hidden = s !== id; });
    document.body.classList.toggle('playing-full', id === 'scr-play');
    document.body.classList.toggle('print-reader', id === 'scr-reader');
    window.scrollTo(0, 0);
  }

  var saved = load() || {};
  var settings = H.normalizeSettings(saved.settings);
  var seed = saved.game && saved.game.seed >= 1 && saved.game.seed <= 999999 ? Math.floor(saved.game.seed) : Calc.newSeed();
  var game = H.newGame(settings.n, settings.penalty, saved.game && saved.game.n === settings.n ? saved.game.scores : null);
  if (saved.game && saved.game.n === settings.n && saved.game.q > 1) game.q = Math.floor(saved.game.q);

  // --- 問題（読み上げ役に出す）。題材の最初の向きで、絞り込みは既定、全部の問題を種で並べる ---
  var TOPIC_ORDER = ['showa', 'nengo', 'genso', 'shuto', 'kimariji'];
  function topicList() { return TOPIC_ORDER.filter(function (id) { return TOPICS[id]; }).map(function (id) { return TOPICS[id]; }); }
  function questions() {
    var t = TOPICS[settings.topic];
    if (!t) return null;
    var kind = t.kinds[0];
    var qs = Calc.makeRound(t, { kind: kind.key, mode: 'choice', filters: {}, count: 0, seed: seed });
    return qs.map(function (q) {
      var it = Calc.itemById(t, q.id);
      return { prompt: kind.prompt(it), answer: kind.answer(it), choices: kind.typing === false ? q.choices : null };
    });
  }
  function currentQ() {
    var qs = questions();
    if (!qs || !qs.length) return null;
    return qs[(game.q - 1) % qs.length];
  }

  // --- 効果音（Web Audio で合成。音のファイルは持たない） ---
  var Snd = {
    ctx: null, drum: null,
    ensure: function () {
      if (!settings.sound) return null;
      try {
        if (!this.ctx) { var AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null; this.ctx = new AC(); }
        if (this.ctx.state === 'suspended') this.ctx.resume();
      } catch (e) { return null; }
      return this.ctx;
    },
    tone: function (freq, type, t0, dur, vol) {
      var c = this.ctx, o = c.createOscillator(), g = c.createGain();
      o.type = type; o.frequency.value = freq;
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(vol, t0 + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      o.connect(g); g.connect(c.destination);
      o.start(t0); o.stop(t0 + dur + 0.02);
    },
    noise: function (t0, dur, vol, filterType, freq) {
      var c = this.ctx, len = Math.max(1, Math.floor(c.sampleRate * dur));
      var buf = c.createBuffer(1, len, c.sampleRate), d = buf.getChannelData(0);
      for (var i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      var src = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
      src.buffer = buf; f.type = filterType; f.frequency.value = freq;
      g.gain.setValueAtTime(vol, t0);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      src.connect(f); f.connect(g); g.connect(c.destination);
      src.start(t0); src.stop(t0 + dur + 0.02);
    },
    /** 押した音: 高い音を短く 2 回 */
    buzz: function () {
      if (!this.ensure()) return;
      var t = this.ctx.currentTime;
      this.tone(1480, 'square', t, 0.09, 0.18);
      this.tone(1480, 'square', t + 0.11, 0.16, 0.18);
    },
    /** 正解: 高い音から少し低い音へ（ピンポーン） */
    ok: function () {
      if (!this.ensure()) return;
      var t = this.ctx.currentTime;
      this.tone(1318.5, 'sine', t, 0.45, 0.35);
      this.tone(1046.5, 'sine', t + 0.32, 1.0, 0.35);
    },
    /** 不正解: 低いにごった音を 2 回（ブッブー） */
    ng: function () {
      if (!this.ensure()) return;
      var t = this.ctx.currentTime;
      this.tone(130, 'sawtooth', t, 0.26, 0.28);
      this.tone(130, 'sawtooth', t + 0.34, 0.5, 0.28);
    },
    /** ドラムロール: 雑音を小刻みに鳴らし続ける。止めるとシンバル（ジャン） */
    drumStart: function () {
      if (!this.ensure() || this.drum) return;
      var self = this, next = this.ctx.currentTime + 0.02, k = 0;
      this.drum = setInterval(function () {
        var until = self.ctx.currentTime + 0.25;
        while (next < until) {
          var v = Math.min(0.5, 0.18 + k * 0.003);
          self.noise(next, 0.045, v * (0.8 + Math.random() * 0.4), 'bandpass', 1900);
          next += 0.048; k++;
        }
      }, 100);
    },
    drumStop: function (crash) {
      if (!this.drum) return false;
      clearInterval(this.drum); this.drum = null;
      if (crash && this.ctx) {
        var t = this.ctx.currentTime + 0.05;
        this.noise(t, 1.6, 0.5, 'highpass', 4500);
        this.tone(90, 'sine', t, 0.35, 0.45);
      }
      return true;
    },
  };

  function vibrate(ms) { try { if (navigator.vibrate) navigator.vibrate(ms); } catch (e) { /* 使えない端末 */ } }

  // --- 画面を消さない（遊んでいる間だけ） ---
  var wake = null;
  function keepAwake(on) {
    if (on && 'wakeLock' in navigator && !wake) {
      navigator.wakeLock.request('screen').then(function (w) { wake = w; w.addEventListener('release', function () { wake = null; }); }).catch(function () {});
    } else if (!on && wake) { wake.release().catch(function () {}); wake = null; }
  }
  document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'visible' && !$('scr-play').hidden) keepAwake(true); });

  // --- 準備の画面 ---
  function radio(box, name, options, value, onChange) {
    box.textContent = '';
    options.forEach(function (o) {
      var lab = el('label', 'seg-item'), inp = document.createElement('input');
      inp.type = 'radio'; inp.name = name; inp.value = o.v; inp.checked = o.v === value;
      inp.addEventListener('change', function () { onChange(o.v); });
      lab.appendChild(inp); lab.appendChild(document.createTextNode(' ' + o.label));
      box.appendChild(lab);
    });
  }
  function renderMenu() {
    radio($('opt-n'), 'n', [2, 3, 4].map(function (n) { return { v: n, label: n + '人' }; }), settings.n, function (v) {
      settings.n = v; game = H.newGame(v, settings.penalty); save(); renderMenu();
    });
    var sel = $('opt-topic');
    sel.textContent = '';
    var none = el('option', null, '読み上げ役が用意する（画面に問題を出さない）'); none.value = ''; sel.appendChild(none);
    topicList().forEach(function (t) { var o = el('option', null, 'クイズ広場の「' + t.page.h1 + '」から出す'); o.value = t.id; sel.appendChild(o); });
    sel.value = settings.topic;
    $('opt-sound').checked = settings.sound;
    $('opt-penalty').checked = settings.penalty === 1;
    var names = $('names');
    names.textContent = '';
    for (var i = 0; i < settings.n; i++) {
      var row = el('div', 'opt-row'), lab = el('label', 'opt-label', (i + 1) + 'ばんの名前'), inp = document.createElement('input');
      inp.type = 'text'; inp.id = 'name-' + i; inp.maxLength = 12; inp.value = settings.names[i]; inp.className = 'name-input';
      lab.htmlFor = inp.id;
      (function (i, inp) { inp.addEventListener('change', function () { settings.names[i] = inp.value; settings.names = H.normalizeNames(settings.names, H.MAX_PLAYERS); inp.value = settings.names[i]; save(); renderMenu(); }); })(i, inp);
      row.appendChild(lab); row.appendChild(inp); names.appendChild(row);
    }
    $('names-state').textContent = settings.names.slice(0, settings.n).join('・') + (settings.penalty ? '／お手つき −1点' : '');
    $('open-reader').disabled = !settings.topic;
    var played = game.scores.some(function (v) { return v !== 0; }) || game.q > 1;
    $('resume-box').hidden = !played;
    if (played) $('resume-text').textContent = game.scores.map(function (v, p) { return settings.names[p] + ' ' + v + '点'; }).join('・') + '・' + game.q + '問目';
  }
  $('opt-topic').addEventListener('change', function (e) { settings.topic = e.target.value; seed = Calc.newSeed(); game = H.newGame(settings.n, settings.penalty, game.scores); game.q = 1; save(); renderMenu(); });
  $('opt-sound').addEventListener('change', function (e) { settings.sound = e.target.checked; save(); });
  $('opt-penalty').addEventListener('change', function (e) { settings.penalty = e.target.checked ? 1 : 0; game.penalty = settings.penalty; save(); renderMenu(); });
  $('resume').addEventListener('click', startPlay);
  $('resume-drop').addEventListener('click', function () { game = H.resetScores(game); seed = Calc.newSeed(); save(); renderMenu(); });
  $('start').addEventListener('click', startPlay);

  // --- 早押しの画面 ---
  var zones = [];
  var revealed = 0;   // 答えを見た問題の番号（つぎの問題に進むとかくれる）
  function buildZones() {
    var box = $('zones');
    box.textContent = '';
    box.className = 'zones';
    $('scr-play').className = 'screen play-full n' + game.n;
    zones = [];
    for (var p = 0; p < game.n; p++) {
      var z = el('button', 'zone z' + p);
      z.type = 'button';
      z.setAttribute('aria-label', settings.names[p] + 'のボタン');
      var inner = el('span', 'zone-inner');
      inner.appendChild(el('span', 'zone-name', settings.names[p]));
      inner.appendChild(el('span', 'zone-score', ''));
      inner.appendChild(el('span', 'zone-state', ''));
      z.appendChild(inner);
      (function (p) {
        // 押し始め（pointerdown）だけを見る。指ごとに別のイベントが来るので、複数の指で同時に押しても 1 人ずつ判定できる
        z.addEventListener('pointerdown', function (e) { e.preventDefault(); onPress(p); }, { passive: false });
        // キーボード・スクリーンリーダーでのボタン操作（pointerdown が無いとき）
        z.addEventListener('click', function (e) { if (e.detail === 0) onPress(p); });
      })(p);
      z.addEventListener('contextmenu', function (e) { e.preventDefault(); });
      box.appendChild(z);
      zones.push(z);
    }
  }
  function onPress(p) {
    var r = H.press(game, p);
    if (!r.accepted) return;
    game = r.state;
    Snd.drumStop(false);
    Snd.buzz();
    vibrate(80);
    renderPlay();
  }
  function judge(ok) {
    if (game.phase !== 'locked') return;
    var drum = Snd.drumStop(false);
    game = ok ? H.correct(game) : H.wrong(game);
    if (ok) Snd.ok(); else Snd.ng();
    if (drum) renderDrum();
    save();
    renderPlay();
  }
  function nextQ() {
    Snd.drumStop(false);
    game = H.next(game);
    save();
    renderDrum();
    renderPlay();
  }
  function renderPlay() {
    for (var p = 0; p < game.n; p++) {
      var z = zones[p];
      var win = game.winner === p, out = game.out.indexOf(p) >= 0;
      var doneWin = game.right === p;
      z.className = 'zone z' + p + (win ? ' win' : '') + (out ? ' out' : '') + (game.phase === 'locked' && !win ? ' locked' : '') + (doneWin ? ' right' : '');
      z.querySelector('.zone-score').textContent = game.scores[p] + '点';
      z.querySelector('.zone-state').textContent = win ? 'はやい！' : doneWin ? '○ 正解' : out ? 'お手つき' : '';
    }
    $('h-ok').disabled = game.phase !== 'locked';
    $('h-ng').disabled = game.phase !== 'locked';
    $('h-release').disabled = game.phase !== 'locked';
    $('h-undo').disabled = !game.history.length;
    var hq = $('host-q');
    hq.textContent = '';
    var head = el('p', 'hq-head', '第' + game.q + '問' + (game.phase === 'locked' ? '　' + settings.names[game.winner] + 'が押しました' : game.phase === 'done' ? '　おしまい（つぎの問題へ）' : '　受付中'));
    hq.appendChild(head);
    var q = currentQ();
    if (q) {
      hq.appendChild(el('p', 'hq-text', q.prompt));
      if (q.choices) hq.appendChild(el('p', 'hq-choices', q.choices.map(function (c, i) { return ['ア', 'イ', 'ウ', 'エ'][i] + ' ' + c; }).join('　')));
      var a = el('button', 'hq-answer', revealed === game.q ? '答え: ' + q.answer : '答えを見る');
      a.type = 'button';
      a.disabled = revealed === game.q;
      a.addEventListener('click', function () { revealed = game.q; a.textContent = '答え: ' + q.answer; a.disabled = true; });
      hq.appendChild(a);
    }
  }
  function renderDrum() { $('h-drum').textContent = Snd.drum ? 'ジャン（止める）' : 'ドラムロール'; }

  function startPlay() {
    Snd.ensure();   // 音はボタンを押した操作の中で準備する（iPhone などは操作の中でしか音を出せない）
    game.penalty = settings.penalty;
    $('host-more').hidden = true;
    $('h-more').setAttribute('aria-expanded', 'false');
    buildZones();
    show('scr-play');
    renderPlay();
    renderDrum();
    keepAwake(true);
  }

  $('h-ok').addEventListener('click', function () { judge(true); });
  $('h-ng').addEventListener('click', function () { judge(false); });
  $('h-next').addEventListener('click', nextQ);
  $('h-drum').addEventListener('click', function () {
    if (Snd.drum) Snd.drumStop(true); else Snd.drumStart();
    renderDrum();
  });
  $('h-more').addEventListener('click', function () {
    var box = $('host-more'); box.hidden = !box.hidden;
    $('h-more').setAttribute('aria-expanded', String(!box.hidden));
  });
  $('h-undo').addEventListener('click', function () { game = H.undo(game); save(); renderPlay(); });
  $('h-release').addEventListener('click', function () { game = H.release(game); renderPlay(); });
  $('h-end').addEventListener('click', showResult);

  // キーボード（PC）: 早押しと読み上げ役の操作
  document.addEventListener('keydown', function (e) {
    if ($('scr-play').hidden || e.ctrlKey || e.metaKey || e.altKey) return;
    var p = H.keyToPlayer(e.key, game.n, e.repeat);
    if (p >= 0) { e.preventDefault(); onPress(p); return; }
    if (e.repeat) return;
    var k = e.key.toLowerCase();
    if (k === 'enter') { e.preventDefault(); judge(true); }
    else if (k === 'x') judge(false);
    else if (k === 'n') nextQ();
    else if (k === 'd') $('h-drum').click();
    else if (k === 'u') $('h-undo').click();
  });

  // --- 順位 ---
  function showResult() {
    Snd.drumStop(false);
    keepAwake(false);
    var ol = $('r-list');
    ol.textContent = '';
    H.ranking(game).forEach(function (r) { ol.appendChild(el('li', null, r.rank + '位　' + settings.names[r.p] + '　' + r.score + '点')); });
    $('r-q').textContent = game.q + '問目まで';
    show('scr-result');
  }
  $('r-back').addEventListener('click', startPlay);
  $('r-reset').addEventListener('click', function () { game = H.resetScores(game); seed = Calc.newSeed(); save(); startPlay(); });
  $('r-menu').addEventListener('click', function () { renderMenu(); show('scr-menu'); });

  // --- 読み上げ役の画面（問題と答えの一覧。ボタンの画面と同じ順番） ---
  $('open-reader').addEventListener('click', function () {
    var t = TOPICS[settings.topic], qs = questions();
    if (!t || !qs) return;
    var n = Math.min(qs.length, 50);
    $('reader-h').textContent = t.page.h1 + '　読み上げ役の一覧（第1問〜第' + n + '問）';
    $('reader-desc').textContent = 'ボタンの画面の「第◯問」と同じ順番です。出典は「' + t.page.h1 + '」のページの「出典と確認日」にあります。';
    var ol = $('reader-list');
    ol.textContent = '';
    qs.slice(0, n).forEach(function (q) {
      var li = el('li');
      li.appendChild(el('span', 'rq', q.prompt));
      if (q.choices) li.appendChild(el('span', 'rc', q.choices.map(function (c, i) { return ['ア', 'イ', 'ウ', 'エ'][i] + ' ' + c; }).join('　')));
      li.appendChild(el('span', 'ra', '答え: ' + q.answer));
      ol.appendChild(li);
    });
    show('scr-reader');
  });
  $('reader-back').addEventListener('click', function () { renderMenu(); show('scr-menu'); });
  $('reader-print').addEventListener('click', function () { window.print(); });

  renderMenu();
  show('scr-menu');
  document.documentElement.classList.remove('js-loading');

  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
    addEventListener('load', function () { navigator.serviceWorker.register('../sw.js').catch(function () {}); });
  }
})();
