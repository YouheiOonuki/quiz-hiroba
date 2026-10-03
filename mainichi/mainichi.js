// ===========================
// 毎日 1 問（mainichi/index.html）の画面
// 出題は ../mainichi-calc.js（日付だけで決まる）。答えの記録は localStorage の quiz-hiroba_mainichi だけ
// 記録に入るのは「きょうの問題」だけ（前の日の問題は練習。続けた日数をあとから埋められないように）
// ===========================
(function () {
  'use strict';
  var M = window.Mainichi, Q = window.QuizTopics || {};
  var KEY = 'quiz-hiroba_mainichi';
  function $(id) { return document.getElementById(id); }
  var WD = ['日', '月', '火', '水', '木', '金', '土'];

  var log;
  try { log = M.normalizeLog(JSON.parse(localStorage.getItem(KEY) || 'null')); } catch (e) { log = M.normalizeLog(null); }
  function saveLog() { try { localStorage.setItem(KEY, JSON.stringify(log)); } catch (e) { /* 保存できなくても遊べる */ } }

  var today = M.todayJst();
  var first = M.parseYmd(M.FIRST_DAY);
  var view = today;
  var practice = {};   // 前の日の問題に答えたもの（保存しない）

  function fromHash() {
    var m = /^#d=(\d{4}-\d{2}-\d{2})$/.exec(location.hash);
    var d = m && M.parseYmd(m[1]);
    if (!d || M.dayNumber(d) > M.dayNumber(today) || M.dayNumber(d) < M.dayNumber(first)) return today;
    return d;
  }

  function label(d) {
    var wd = WD[new Date(Date.UTC(d.y, d.m - 1, d.d)).getUTCDay()];
    return d.y + '年' + d.m + '月' + d.d + '日（' + wd + '）' + (M.ymd(d) === M.ymd(today) ? ' きょうの問題' : '');
  }

  var ooh = { list: [], i: 0 };
  function renderOoh() {
    var f = ooh.list[ooh.i];
    $('ooh').hidden = !f;
    if (!f) return;
    $('ooh-text').textContent = f.text;
    $('ooh-src').textContent = '出典: ' + f.src.label;
    $('ooh-src').href = f.src.url;
    $('ooh-more').hidden = ooh.list.length < 2;
    $('ooh-more').textContent = 'もう1つ（' + (ooh.i + 1) + '/' + ooh.list.length + '）';
  }
  $('ooh-more').addEventListener('click', function () { ooh.i = window.Ooh.nextIndex(ooh.i, ooh.list.length); renderOoh(); });

  var q = null;
  function render() {
    q = M.questionFor(view, Q);
    $('mn-date').textContent = label(view);
    $('prev').disabled = M.dayNumber(view) <= M.dayNumber(first);
    $('next-day').disabled = M.dayNumber(view) >= M.dayNumber(today);
    $('feedback').hidden = true;
    if (!q) { $('question').textContent = '問題を読み込めませんでした。'; $('choices').innerHTML = ''; return; }
    $('mn-topic').textContent = q.topic.page.h1 + '・' + q.kind.label;
    $('question').textContent = q.prompt;
    var box = $('choices');
    box.innerHTML = '';
    q.choices.forEach(function (c) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'choice';
      b.textContent = c;
      b.addEventListener('click', function () { answer(c); });
      box.appendChild(b);
    });
    var key = M.ymd(view);
    var done = key === M.ymd(today) ? log.days[key] : practice[key];
    if (done) showResult(done.pick, false);
    renderStats();
  }

  function answer(pick) {
    var key = M.ymd(view);
    var ok = pick === q.answer;
    if (key === M.ymd(today)) {
      if (log.days[key]) return;
      log = M.record(log, key, ok, pick);
      saveLog();
    } else {
      practice[key] = { ok: ok ? 1 : 0, pick: pick };
    }
    showResult(pick, true);
    renderStats();
  }

  function showResult(pick, fresh) {
    var ok = pick === q.answer;
    [].forEach.call($('choices').children, function (b) {
      b.disabled = true;
      if (b.textContent === q.answer) b.classList.add('ok');
      else if (b.textContent === pick) b.classList.add('ng');
    });
    $('fb-title').textContent = ok ? '正解！' : '残念。正解は「' + q.answer + '」';
    $('fb-title').className = 'fb-title ' + (ok ? 'ok' : 'ng');
    $('fb-body').textContent = q.topic.explain ? q.topic.explain(q.item) : '';
    var link = q.topic.link ? q.topic.link(q.item) : null;
    $('fb-link').hidden = !link;
    if (link) { $('fb-link-a').href = link.href; $('fb-link-a').textContent = link.label; }
    $('more-topic').href = '../' + q.topic.id + '/';
    ooh.list = window.Ooh ? window.Ooh.factsFor(q.topic.id, q.item) : [];
    ooh.i = window.Ooh ? window.Ooh.startIndex(ooh.list.length) : 0;
    renderOoh();
    $('feedback').hidden = false;
    if (fresh) $('feedback').scrollIntoView({ block: 'nearest' });
  }

  function renderStats() {
    var s = M.stats(log, today);
    var t = log.days[M.ymd(today)];
    var parts = [];
    parts.push(t ? 'きょうは答えました' : 'きょうはまだです');
    if (s.streak) parts.push('続けて ' + s.streak + ' 日');
    if (s.answered) parts.push('これまで ' + s.answered + ' 日・正解 ' + s.correct);
    if (M.ymd(view) !== M.ymd(today)) parts.push('前の日の問題は記録に入りません');
    $('mn-stats').textContent = parts.join('・');
  }

  function go(d) {
    view = d;
    var h = M.ymd(d) === M.ymd(today) ? '' : '#d=' + M.ymd(d);
    history.replaceState(null, '', location.pathname + h);
    render();
  }
  $('prev').addEventListener('click', function () { go(M.addDays(view, -1)); });
  $('next-day').addEventListener('click', function () { go(M.addDays(view, 1)); });
  window.addEventListener('hashchange', function () { view = fromHash(); render(); });

  view = fromHash();
  render();
})();
