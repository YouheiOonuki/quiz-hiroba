// ===========================
// 百人一首 読み上げ — 画面（/quiz-hiroba/hyakunin/）
// 段取りは yomiage.js（純粋関数）、歌は hyakunin-data.js。声は Web Speech API（speechSynthesis）の日本語の声
// 日本語の声が無い端末では、歌を大きく出して「次の札へ」で進める（読み手が声に出して読む）
// ===========================
(function () {
  'use strict';

  var Y = window.Yomiage;
  var H = window.Hyakunin;
  var SRC = (window.Constants || {}).hyakunin || null;
  var BY_N = {};
  H.poems.forEach(function (p) { BY_N[p.n] = p; });
  var ALL = H.poems.map(function (p) { return p.n; });

  // --- 保存（キーは必ず "quiz-hiroba_" で始める。README「ツールを追加するとき」12） ---
  var KEY = 'quiz-hiroba_yomiage';
  function load() { try { return JSON.parse(localStorage.getItem(KEY) || 'null') || {}; } catch (e) { return {}; } }
  function save(o) { try { localStorage.setItem(KEY, JSON.stringify(o)); } catch (e) { /* 保存できなくても続ける */ } }

  var GAPS = [0, 5, 10, 15, 20, 30];
  function normalizeSettings(s) {
    s = s || {};
    var rate = Number(s.rate);
    return {
      order: s.order === 'number' ? 'number' : 'random',
      gap: GAPS.indexOf(s.gap) >= 0 ? s.gap : 10,
      style: s.style === 'kyogi' ? 'kyogi' : 'chirashi',
      joka: s.joka !== false,
      twice: s.twice !== false,
      hide: s.hide === true,
      voice: typeof s.voice === 'string' ? s.voice.slice(0, 200) : '',
      rate: rate >= 0.5 && rate <= 1.2 ? rate : 0.85,
    };
  }
  var stored = load();
  var settings = normalizeSettings(stored.settings);
  var resume = Y.normalizeResume(stored.resume, ALL);
  function persist() { save({ settings: settings, resume: resume }); }

  function $(id) { return document.getElementById(id); }
  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  function show(id) {
    ['scr-menu', 'scr-play', 'scr-end'].forEach(function (s) { $(s).hidden = s !== id; });
    document.body.classList.toggle('playing', id === 'scr-play');
    window.scrollTo(0, 0);
  }

  // --- 声（Web Speech API） ---
  var synth = window.speechSynthesis || null;
  var jaVoices = [];
  function loadVoices() {
    if (!synth) return;
    jaVoices = synth.getVoices().filter(function (v) { return /^ja(-|_|$)/i.test(v.lang); });
    renderVoices();
  }
  function currentVoice() {
    for (var i = 0; i < jaVoices.length; i++) if (jaVoices[i].voiceURI === settings.voice) return jaVoices[i];
    // 選んでいなければ、端末の中で読む声（localService）を先に。無ければ最初の日本語の声
    return jaVoices.filter(function (v) { return v.localService !== false; })[0] || jaVoices[0] || null;
  }
  function hasVoice() { return !!(synth && typeof window.SpeechSynthesisUtterance === 'function' && jaVoices.length); }
  function renderVoices() {
    var sel = $('opt-voice');
    sel.textContent = '';
    jaVoices.forEach(function (v) {
      var o = el('option', null, v.name + '（' + v.lang + (v.localService === false ? '・ネット' : '') + '）');
      o.value = v.voiceURI;
      sel.appendChild(o);
    });
    var cur = currentVoice();
    if (cur) sel.value = cur.voiceURI;
    sel.disabled = !jaVoices.length;
    $('test-voice').disabled = !jaVoices.length;
    $('voice-line').textContent = hasVoice()
      ? '声: ' + cur.name + '（くわしい設定で変えられます）'
      : 'この端末（ブラウザ）には日本語の声が見つかりません。歌を画面に大きく出すので、読み手が声に出して読み、「次の札へ」で進めてください。';
    $('voice-line').classList.toggle('warn', !hasVoice());
    renderMoreState();
  }

  var speakTimer = null;
  /** 1 句を読む。読み終わったら done()。声が無いときは読まずにすぐ done（呼ぶ側で扱う） */
  function speak(text, done) {
    clearTimeout(speakTimer);
    var finished = false;
    function end() { if (finished) return; finished = true; clearTimeout(speakTimer); done(); }
    var u = new window.SpeechSynthesisUtterance(Y.speechText(text));
    var v = currentVoice();
    if (v) u.voice = v;
    u.lang = v ? v.lang : 'ja-JP';
    u.rate = settings.rate;
    u.onend = end;
    u.onerror = end;
    synth.speak(u);
    // onend が来ない端末（途中で止まる・画面が消えた）のための見張り: 目安の 2 倍＋3 秒で次へ
    speakTimer = setTimeout(end, Y.estimateSeconds(text, settings.rate) * 2000 + 3000);
  }
  function hush() {
    clearTimeout(speakTimer);
    if (synth) { try { synth.cancel(); } catch (e) { /* 止められなくても続ける */ } }
  }

  // --- 画面を消さない（Screen Wake Lock API） ---
  var wake = null;
  function wakeOn() {
    if (!('wakeLock' in navigator)) { $('wake-line').textContent = 'この端末では画面を消さない設定が使えません。画面が消えると読み上げが止まることがあります。'; return; }
    navigator.wakeLock.request('screen').then(function (w) {
      wake = w;
      $('wake-line').textContent = '読み上げ中は画面を消さないようにしています。';
      w.addEventListener('release', function () { wake = null; });
    }).catch(function () {
      $('wake-line').textContent = '画面を消さない設定が使えませんでした。画面が消えると読み上げが止まることがあります。';
    });
  }
  function wakeOff() { if (wake) { wake.release().catch(function () {}); wake = null; } }
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'visible' && play && play.phase !== 'paused' && play.phase !== 'done') wakeOn();
  });

  // --- メニュー ---
  function radioGroup(box, name, options, value, onChange) {
    box.textContent = '';
    options.forEach(function (o) {
      var lab = el('label', 'seg-item');
      var inp = document.createElement('input');
      inp.type = 'radio'; inp.name = name; inp.value = String(o.v); inp.checked = o.v === value;
      inp.addEventListener('change', function () { onChange(o.v); });
      lab.appendChild(inp);
      lab.appendChild(document.createTextNode(' ' + o.label));
      box.appendChild(lab);
    });
  }
  function changed() { persist(); renderMenu(); }
  function renderMoreState() {
    var parts = [settings.joka ? '序歌あり' : '序歌なし'];
    if (settings.style === 'chirashi') parts.push(settings.twice ? '下の句2回' : '下の句1回');
    if (settings.hide) parts.push('歌をかくす');
    parts.push('速さ ' + settings.rate.toFixed(2));
    $('more-state').textContent = parts.join('・');
  }
  function renderMenu() {
    radioGroup($('opt-order'), 'order', [{ v: 'random', label: 'ランダム' }, { v: 'number', label: '番号順（1〜100）' }], settings.order,
      function (v) { settings.order = v; changed(); });
    radioGroup($('opt-gap'), 'gap', GAPS.map(function (g) { return { v: g, label: g ? g + '秒' : 'タップで次へ' }; }), settings.gap,
      function (v) { settings.gap = v; changed(); });
    radioGroup($('opt-style'), 'style', [{ v: 'chirashi', label: '上の句→下の句（ちらし取り）' }, { v: 'kyogi', label: '競技かるた式' }], settings.style,
      function (v) { settings.style = v; changed(); });
    $('opt-joka').checked = settings.joka;
    $('opt-twice').checked = settings.twice;
    $('opt-twice').disabled = settings.style === 'kyogi';
    $('opt-hide').checked = settings.hide;
    $('opt-rate').value = String(settings.rate);
    $('rate-val').textContent = settings.rate.toFixed(2);
    renderMoreState();
    $('resume-box').hidden = !resume;
    if (resume) {
      var steps = Y.buildSteps(resume.order, resume.opt || settings);
      var read = Y.readCount(steps, Math.min(resume.pos, steps.length - 1));
      $('resume-text').textContent = resume.order.length + '枚中 ' + read + '枚目まで・残り ' + (resume.order.length - read) + '枚';
    }
  }
  $('opt-joka').addEventListener('change', function (e) { settings.joka = e.target.checked; changed(); });
  $('opt-twice').addEventListener('change', function (e) { settings.twice = e.target.checked; changed(); });
  $('opt-hide').addEventListener('change', function (e) { settings.hide = e.target.checked; changed(); });
  $('opt-voice').addEventListener('change', function (e) { settings.voice = e.target.value; changed(); renderVoices(); });
  $('opt-rate').addEventListener('input', function (e) { settings.rate = Number(e.target.value); $('rate-val').textContent = settings.rate.toFixed(2); renderMoreState(); });
  $('opt-rate').addEventListener('change', function () { persist(); });
  $('test-voice').addEventListener('click', function () {
    if (!hasVoice()) return;
    hush();
    speak(BY_N[1].kamiYomi, function () {});
  });

  // --- 読み上げ ---
  // play = { order, opt, steps, pos, phase: 'speaking' | 'waiting' | 'manual' | 'paused' | 'done', textOnly }
  var play = null;
  var waitTimer = null, tickTimer = null;

  function optFromSettings() { return { style: settings.style, joka: settings.joka, twice: settings.twice }; }

  function begin(order, opt, pos) {
    hush();
    play = { order: order, opt: opt, steps: Y.buildSteps(order, opt), pos: pos || 0, phase: 'speaking', textOnly: !hasVoice() };
    resume = { order: order, opt: opt, pos: play.pos, at: new Date().toISOString().slice(0, 16) };
    persist();
    show('scr-play');
    wakeOn();
    if (play.textOnly) {
      // 声が無い: 札ごとに全文を大きく出し、「次の札へ」で進める
      play.phase = 'manual';
      render();
      return;
    }
    step();
  }

  $('start').addEventListener('click', function () {
    var order = Y.makeOrder(ALL, settings.order, 1 + Math.floor(Math.random() * 999999));
    begin(order, optFromSettings(), 0);
  });
  $('resume').addEventListener('click', function () {
    if (!resume) return;
    var steps = Y.buildSteps(resume.order, resume.opt || optFromSettings());
    // 続きは、止めた札の最初（上の句）から
    var pos = Math.min(resume.pos, steps.length - 1);
    while (pos > 0 && steps[pos - 1].card === steps[pos].card) pos -= 1;
    begin(resume.order, resume.opt || optFromSettings(), pos);
  });
  $('resume-drop').addEventListener('click', function () { resume = null; persist(); renderMenu(); });

  function clearTimers() { clearTimeout(waitTimer); clearInterval(tickTimer); }

  function step() {
    clearTimers();
    if (play.pos >= play.steps.length) { finish(); return; }
    var st = play.steps[play.pos];
    play.phase = 'speaking';
    resume.pos = play.pos; persist();
    render();
    var p = st.card < 0 ? H.JOKA : BY_N[st.n];
    speak(st.part === 'kami' ? p.kamiYomi : p.shimoYomi, afterSpeak);
  }

  function afterSpeak() {
    if (!play || play.phase !== 'speaking') return;
    var st = play.steps[play.pos];
    if (st.pause === 'end') { play.pos += 1; finish(); return; }
    if (st.pause === 'gap' && settings.gap === 0) {
      play.phase = 'manual';
      render();
      return;
    }
    var sec = st.pause === 'gap' ? settings.gap : Y.PAUSE[st.pause];
    play.phase = 'waiting';
    var until = Date.now() + sec * 1000;
    function tick() {
      var left = Math.max(0, Math.ceil((until - Date.now()) / 1000));
      var toShimo = play.opt.style === 'kyogi' && st.part === 'kami' && st.card >= 0;
      $('yomi-status').textContent = st.pause === 'gap' ? (toShimo ? '下の句まで ' : '次の札まで ') + left + '秒' : '';
    }
    render();
    tick();
    if (st.pause === 'gap') tickTimer = setInterval(tick, 250);
    waitTimer = setTimeout(function () { play.pos += 1; step(); }, sec * 1000);
  }

  function nextCard() {
    if (!play) return;
    clearTimers();
    hush();
    var i = Y.nextCardStart(play.steps, play.pos);
    if (play.textOnly) {
      if (i >= play.steps.length) { play.pos = play.steps.length; finish(); return; }
      play.pos = i;
      resume.pos = i; persist();
      render();
      return;
    }
    // 競技かるた式で「上の句のあとの取る時間」に押したときは、その札の下の句から続ける
    var st = play.steps[play.pos];
    if (play.opt.style === 'kyogi' && st && st.part === 'kami' && play.steps[play.pos + 1] && play.steps[play.pos + 1].card === st.card) {
      play.pos += 1;
    } else {
      play.pos = i;
    }
    step();
  }
  $('next').addEventListener('click', nextCard);
  $('yomi-card').addEventListener('click', function () { if (play && (play.phase === 'manual')) nextCard(); });

  $('again').addEventListener('click', function () {
    if (!play || play.textOnly) return;
    clearTimers();
    hush();
    var pos = Math.min(play.pos, play.steps.length - 1);
    while (pos > 0 && play.steps[pos - 1].card === play.steps[pos].card) pos -= 1;
    play.pos = pos;
    step();
  });

  $('pause').addEventListener('click', function () {
    if (!play) return;
    if (play.phase === 'paused') {
      $('pause').textContent = '一時停止';
      wakeOn();
      if (play.textOnly) { play.phase = 'manual'; render(); } else step();   // 止めた句の頭から読み直す
      return;
    }
    clearTimers();
    hush();
    play.phase = 'paused';
    $('pause').textContent = '再開';
    wakeOff();
    render();
  });
  $('quit').addEventListener('click', function () {
    clearTimers(); hush(); wakeOff();
    play = null;
    $('pause').textContent = '一時停止';
    renderMenu();
    show('scr-menu');
  });

  function poemLine(n) {
    var p = BY_N[n];
    return n + '　' + p.kami + '　' + p.shimo + '（決まり字 ' + p.kimariji + '）';
  }

  function render() {
    var st = play.steps[Math.min(play.pos, play.steps.length - 1)];
    var total = play.order.length;
    var read = play.textOnly ? Math.max(0, st.card + 1) : Y.readCount(play.steps, play.pos);
    $('count').textContent = '読んだ ' + read + '／' + total + '枚・残り ' + (total - read) + '枚';
    var p = st.card < 0 ? H.JOKA : BY_N[st.n];
    $('yomi-label').textContent = st.card < 0 ? '序歌（百人一首ではありません）' : (st.card + 1) + '枚目　' + p.n + '番　' + p.author;
    var hidden = settings.hide && st.card >= 0 && !play.textOnly;
    $('yomi-body').hidden = hidden;
    $('yomi-hidden').hidden = !hidden;
    $('yomi-kami').textContent = p.kami;
    $('yomi-shimo').textContent = p.shimo;
    // 声が無いときは、読み手のために読み方（声に出す音）を出す。競技かるた式で上の句を読んでいる間は下の句を出さない
    var kyogiKami = !play.textOnly && play.opt.style === 'kyogi' && st.part === 'kami' && st.card >= 0;
    $('yomi-kana').textContent = play.textOnly ? '読み方: ' + p.kamiYomi + '　' + p.shimoYomi
      : kyogiKami ? p.kamiKana : p.kamiKana + '　' + p.shimoKana;
    // 読んでいる句を濃く。読んでいないとき（待ち・一時停止・声なし）は両方とも濃く
    var speaking = !play.textOnly && play.phase === 'speaking';
    var speakingKami = !speaking || st.part === 'kami';
    var speakingShimo = !speaking || st.part === 'shimo';
    $('yomi-kami').classList.toggle('now', speakingKami);
    $('yomi-shimo').classList.toggle('now', speakingShimo);
    // 競技かるた式で上の句を読んでいる間は、まだ下の句を見せない
    $('yomi-shimo').classList.toggle('dim', kyogiKami);
    var status = '';
    if (play.phase === 'speaking') status = st.part === 'kami' ? '上の句を読んでいます' : (st.again ? '下の句（2回目）を読んでいます' : '下の句を読んでいます');
    else if (play.phase === 'manual') status = play.textOnly ? '声に出して読んだら「次の札へ」（歌を押しても進みます）' : '「次の札へ」を押すと続きを読みます';
    else if (play.phase === 'paused') status = '一時停止中。「再開」でこの句の頭から読み直します';
    $('yomi-status').textContent = status;
    $('again').hidden = play.textOnly;
    $('next').textContent = play.textOnly || play.opt.style !== 'kyogi' ? '次の札へ' : (st.part === 'kami' && st.card >= 0 ? '下の句へ' : '次の札へ');
    var done = Y.doneCards(play.order, play.steps, play.pos);
    var ol = $('done-list');
    ol.textContent = '';
    done.forEach(function (n) { ol.appendChild(el('li', null, poemLine(n))); });
    $('done-state').textContent = done.length + '枚';
  }

  function finish() {
    clearTimers();
    hush();
    wakeOff();
    var order = play ? play.order : [];
    play = null;
    resume = null;
    persist();
    $('end-title').textContent = order.length + '枚すべて読みました';
    var ol = $('end-list');
    ol.textContent = '';
    order.forEach(function (n) { ol.appendChild(el('li', null, poemLine(n))); });
    $('pause').textContent = '一時停止';
    show('scr-end');
  }
  $('end-again').addEventListener('click', function () {
    var order = Y.makeOrder(ALL, settings.order, 1 + Math.floor(Math.random() * 999999));
    begin(order, optFromSettings(), 0);
  });
  $('end-menu').addEventListener('click', function () { renderMenu(); show('scr-menu'); });

  // 出典の折りたたみ
  if (SRC) {
    $('src-text').textContent = SRC.source + '。最終確認日 ' + SRC.checked + '。';
    (SRC.urls || [SRC.url]).forEach(function (u) {
      var li = el('li'), a = el('a', null, u);
      a.href = u; a.rel = 'noopener'; a.target = '_blank';
      li.appendChild(a); $('src-links').appendChild(li);
    });
  }

  renderMenu();
  loadVoices();
  if (synth && typeof synth.addEventListener === 'function') synth.addEventListener('voiceschanged', loadVoices);
  else if (synth) synth.onvoiceschanged = loadVoices;
  renderVoices();
  show('scr-menu');
  document.documentElement.classList.remove('js-loading');

  // PWA: オフラインでも開けるように（登録は ../sw.js。scope はツールの直下）
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
    addEventListener('load', function () { navigator.serviceWorker.register('../sw.js').catch(function () {}); });
  }
})();
