// ===========================
// クイズ広場 — 入口のページ（題材の一覧に記録の数を出す・記録のファイルへの書き出しと読み込み）
// ===========================
(function () {
  'use strict';

  var Calc = window.Calc;
  var TOPICS = Object.keys(window.QuizTopics || {}).map(function (k) { return window.QuizTopics[k]; });
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

  function renderRecords() {
    var records = Calc.normalizeRecords(store.get('records', {}), TOPICS);
    document.querySelectorAll('.topic-rec[data-topic]').forEach(function (e) {
      var t = window.QuizTopics[e.getAttribute('data-topic')];
      var r = t && records[t.id];
      var weak = t ? Calc.weakIds(records, t).length : 0;
      var done = r ? Object.keys(r.items).length : 0;
      e.textContent = done ? '答えた ' + done + t.unit + ' ／ にがて ' + weak : '';
    });
  }

  // 設定を今の形にそろえる（知っている題材のものだけ。中身の細かい確かめは題材のページが読むときに行う）
  function normalizeSettings(s) {
    var out = {};
    if (!s || typeof s !== 'object' || Array.isArray(s)) return out;
    TOPICS.forEach(function (t) {
      var x = s[t.id];
      if (!x || typeof x !== 'object') return;
      out[t.id] = {
        kind: Calc.kindOf(t, x.kind).key,
        mode: x.mode === 'typing' ? 'typing' : 'choice',
        filters: Calc.normalizeFilters(t, x.filters),
        count: [10, 20, 0].indexOf(x.count) >= 0 ? x.count : 10,
        weak: x.weak === true,
      };
    });
    return out;
  }

  // --- ファイルへの書き出し・読み込み（README「ツールを追加するとき」20。決定 D31） ---
  var TOOL = 'quiz-hiroba';
  $('backup-export').addEventListener('click', function () {
    var data = { records: Calc.normalizeRecords(store.get('records', {}), TOPICS), settings: normalizeSettings(store.get('settings', {})) };
    var blob = new Blob([JSON.stringify(Calc.buildBackup(TOOL, data), null, 2)], { type: 'application/json' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = Calc.backupFileName(TOOL);
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
    $('backup-msg').textContent = 'ファイルに書き出しました。機種変更のときは、このファイルを新しい端末に移して「ファイルから読み込む」を押してください。';
  });
  $('backup-import').addEventListener('click', function () { $('backup-file').click(); });
  $('backup-file').addEventListener('change', function () {
    var file = this.files && this.files[0];
    this.value = '';
    if (!file) return;
    if (file.size > 1024 * 1024) { $('backup-msg').textContent = 'ファイルが大きすぎます。このツールで書き出したファイルを選んでください。'; return; }
    file.text().then(function (text) {
      var r = Calc.parseBackup(text, TOOL, ['records']);
      if (!r.ok) { $('backup-msg').textContent = r.error; return; }
      if (!window.confirm('記録と設定を、ファイルの内容で置き換えます。よろしいですか？')) return;
      store.set('records', Calc.normalizeRecords(r.data.records, TOPICS));
      store.set('settings', normalizeSettings(r.data.settings));
      renderRecords();
      $('backup-msg').textContent = 'ファイルから読み込みました。';
    }, function () { $('backup-msg').textContent = 'ファイルを読み取れませんでした。'; });
  });

  renderRecords();

  // PWA: オフラインでも遊べるように（登録は './sw.js' だけ。scope: '/' を指定しない。README「ツールを追加するとき」13）
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
    addEventListener('load', function () { navigator.serviceWorker.register('./sw.js').catch(function () {}); });
  }
})();
