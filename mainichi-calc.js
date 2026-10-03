// ===========================
// 毎日 1 問（/quiz-hiroba/mainichi/。K37）の出題。画面に依存しない純粋関数
// 日付（日本時間）だけで問題が決まる。同じ日なら、だれがどの端末で開いても同じ問題・同じ選択肢
//   - 日の番号 = 2026-01-01 からの日数
//   - 題材は 日の番号 を 題材の数 で割った余りで回す（元素 → 年号 → 首都 → 百人一首 → 元素 …）
//   - 題材の中は、決まった種で並べた順に 1 問ずつ。全部出し終わるまで同じ問題は出ない
//   - 選択肢は calc.js の makeChoices（題材のページの 4 択と同じ作り方）に、日の番号から作った種を渡す
// ブラウザでは window.Mainichi、Node（テスト）では module.exports
// ===========================
(function (root) {
  'use strict';
  var isNode = typeof module !== 'undefined' && module.exports;
  var Calc = isNode ? require('./calc.js') : root.Calc;

  // 出す題材と向き（どの向きも 4 択で答えられるもの）
  var PLAN = [
    { topic: 'genso', kind: 'name' },     // 元素記号 → 名前
    { topic: 'nengo', kind: 'year' },     // 出来事 → 年
    { topic: 'shuto', kind: 'cap' },      // 国 → 首都
    { topic: 'kimariji', kind: 'kami' },  // 上の句 → 下の句
  ];
  var EPOCH = Date.UTC(2026, 0, 1);
  var FIRST_DAY = '2026-10-01';   // これより前の日は見せない（公開前）
  var ORDER_SEED = 20261001;

  function pad(n) { return String(n).padStart(2, '0'); }
  function ymd(o) { return o.y + '-' + pad(o.m) + '-' + pad(o.d); }
  function parseYmd(s) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s || ''));
    if (!m) return null;
    var t = Date.UTC(+m[1], +m[2] - 1, +m[3]);
    var dt = new Date(t);
    if (dt.getUTCMonth() + 1 !== +m[2]) return null;
    return { y: +m[1], m: +m[2], d: +m[3] };
  }
  /** 日本時間のきょう（端末の時計から。時差のある国でも日本の日付で問題を決める） */
  function todayJst(nowMs) {
    var t = new Date((nowMs == null ? Date.now() : nowMs) + 9 * 3600000);
    return { y: t.getUTCFullYear(), m: t.getUTCMonth() + 1, d: t.getUTCDate() };
  }
  function dayNumber(o) { return Math.round((Date.UTC(o.y, o.m - 1, o.d) - EPOCH) / 86400000); }
  function addDays(o, n) {
    var t = new Date(Date.UTC(o.y, o.m - 1, o.d) + n * 86400000);
    return { y: t.getUTCFullYear(), m: t.getUTCMonth() + 1, d: t.getUTCDate() };
  }

  var orderCache = {};
  /** 題材の中の出す順（決まった種で並べる。題材の問題が増えたら並びも変わる） */
  function orderOf(topic) {
    var key = topic.id + ':' + topic.items.length;
    if (!orderCache[key]) orderCache[key] = Calc.shuffle(topic.items.map(function (it) { return it.id; }), Calc.rng(ORDER_SEED + topic.items.length));
    return orderCache[key];
  }

  /**
   * その日の 1 問
   * @param {{y,m,d}} date 日本の日付
   * @param {object} topics { genso: topic, nengo: topic, ... }（topics/*.js）
   * @returns {{date, n, topic, kind, item, prompt, answer, choices, round}|null}
   */
  function questionFor(date, topics) {
    var n = dayNumber(date);
    if (n < 0) return null;
    var p = PLAN[n % PLAN.length];
    var topic = topics[p.topic];
    if (!topic) return null;
    var round = Math.floor(n / PLAN.length);
    var ids = orderOf(topic);
    var item = Calc.itemById(topic, ids[round % ids.length]);
    var kind = Calc.kindOf(topic, p.kind);
    var rand = Calc.rng(1000003 + n * 7919);
    var choices = Calc.makeChoices(topic, kind, item, topic.items, rand, Calc.choiceCount(topic), {});
    return { date: ymd(date), n: n, topic: topic, kind: kind, item: item, prompt: kind.prompt(item), answer: kind.choice(item), choices: choices, round: round };
  }

  // --- 記録（localStorage の quiz-hiroba_mainichi）。{ v: 1, days: { 'YYYY-MM-DD': { ok: 0|1, pick: '選んだ文字' } } } ---
  var KEEP = 400;
  function normalizeLog(raw) {
    var out = { v: 1, days: {} };
    if (!raw || typeof raw !== 'object' || !raw.days || typeof raw.days !== 'object') return out;
    var keys = Object.keys(raw.days).filter(function (k) { return parseYmd(k); }).sort().slice(-KEEP);
    keys.forEach(function (k) {
      var r = raw.days[k] || {};
      out.days[k] = { ok: r.ok === 1 ? 1 : 0, pick: typeof r.pick === 'string' ? r.pick.slice(0, 80) : '' };
    });
    return out;
  }
  function record(log, dateStr, ok, pick) {
    var l = normalizeLog(log);
    if (!l.days[dateStr]) l.days[dateStr] = { ok: ok ? 1 : 0, pick: String(pick || '').slice(0, 80) };
    return normalizeLog(l);
  }
  /** 続けて答えた日数（きょうか、きのうまで続いているもの）と、正解の数・答えた日数 */
  function stats(log, today) {
    var l = normalizeLog(log);
    var days = Object.keys(l.days);
    var streak = 0;
    var d = l.days[ymd(today)] ? today : addDays(today, -1);
    while (l.days[ymd(d)]) { streak++; d = addDays(d, -1); }
    var ok = days.filter(function (k) { return l.days[k].ok; }).length;
    return { streak: streak, answered: days.length, correct: ok };
  }

  var api = { PLAN: PLAN, FIRST_DAY: FIRST_DAY, ymd: ymd, parseYmd: parseYmd, todayJst: todayJst, dayNumber: dayNumber, addDays: addDays, orderOf: orderOf, questionFor: questionFor, normalizeLog: normalizeLog, record: record, stats: stats };
  if (isNode) module.exports = api;
  else root.Mainichi = api;
})(this);
