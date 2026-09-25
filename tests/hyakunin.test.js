// 百人一首のデータ（hyakunin-data.js）・読み上げの段取り（yomiage.js）・決まり字クイズ（topics/kimariji.js）のテスト
const test = require('node:test');
const assert = require('node:assert/strict');
const H = require('../hyakunin-data.js');
const Y = require('../yomiage.js');
const C = require('../calc.js');
const kimariji = require('../topics/kimariji.js');

const P = (n) => H.poems[n - 1];

test('データ: 1〜100 番がそろい、文・ひらがな・読み・作者がある', () => {
  assert.equal(H.poems.length, 100);
  assert.deepEqual(H.poems.map((p) => p.n), Array.from({ length: 100 }, (_, i) => i + 1));
  for (const p of H.poems) {
    for (const k of ['kami', 'shimo', 'kamiKana', 'shimoKana', 'kamiYomi', 'shimoYomi', 'author', 'src']) assert.ok(p[k], p.n + ' の ' + k);
    // ひらがなは歴史的仮名遣い（ゐ・ゑ・を を含む）。踊り字は開いてある
    assert.match(p.kamiKana + p.shimoKana, /^[ぁ-ゖ ]+$/, p.n + ' のひらがな');
    assert.match(p.kamiYomi + p.shimoYomi, /^[ぁ-ゖ ]+$/, p.n + ' の読み');
    // 読みは現代の音: ゐ・ゑ・ぢ・づ・「てふ」は残らない
    for (const w of (p.kamiYomi + ' ' + p.shimoYomi).split(' ')) assert.doesNotMatch(w, /[ゐゑぢづ]|てふ|けふ/, p.n + ' の読み ' + w);
    // 上の句は 3 句、下の句は 2 句（空白で区切る）
    assert.equal(p.kamiKana.split(' ').length, 3, p.n + ' 上の句の句の数');
    assert.equal(p.shimoKana.split(' ').length, 2, p.n + ' 下の句の句の数');
    assert.equal(p.kamiYomi.split(' ').length, 3, p.n + ' 上の句の読みの句の数');
    assert.equal(p.shimoYomi.split(' ').length, 2, p.n + ' 下の句の読みの句の数');
  }
});

test('データ: 漢字かなまじりの文のかなは、ひらがなの文に同じ順で出てくる（2 つの出典の突き合わせ）', () => {
  for (const p of H.poems) {
    for (const [kan, hira] of [[p.kami, p.kamiKana], [p.shimo, p.shimoKana]]) {
      const h = hira.replace(/ /g, '');
      let pos = 0;
      for (const run of kan.match(/[ぁ-ゖ]+/g) || []) {
        const i = h.indexOf(run, pos);
        assert.ok(i >= 0, p.n + '「' + run + '」が「' + h + '」に無い');
        pos = i + run.length;
      }
    }
  }
});

test('データ: 見本の歌（全日本かるた協会の札のページ・読手テキストと同じ）', () => {
  assert.equal(P(1).kami, '秋の田のかりほの庵の苫をあらみ');
  assert.equal(P(1).shimoYomi, 'わがころもでわ つゆにぬれつつ');
  assert.equal(P(2).shimoYomi, 'ころもほすちょう あまのかぐやま', 'てふ → ちょう');
  assert.equal(P(17).kamiKana, 'ちはやぶる かみよもきかず たつたがは');
  assert.equal(P(17).author, '在原業平朝臣');
  assert.equal(P(44).kami, '逢ふことのたえてしなくばなかなかに', '読手テキストに合わせて「なくば」');
  assert.equal(P(63).shimo, '人づてならで言ふよしもがな', '歴史的仮名遣い「言ふ」');
  assert.equal(P(74).kami, '憂かりける人を初瀬の山おろし', '読手テキストに合わせて「よ」なし');
  assert.equal(P(70).shimoKana, 'いづこもおなじ あきのゆふぐれ');
  assert.equal(P(100).author, '順徳院');
  assert.equal(P(100).kamiYomi, 'ももしきや ふるきのきばの しのぶにも');
});

test('決まり字: 1字 7 首（む・す・め・ふ・さ・ほ・せ）、6字（大山札）6 首、どの札も一意', () => {
  const one = H.poems.filter((p) => p.kimariji.length === 1).map((p) => p.kimariji).sort().join('');
  assert.equal(one, [...'むすめふさほせ'].sort().join(''));
  const six = H.poems.filter((p) => p.kimariji.length === 6).map((p) => p.n).sort((a, b) => a - b);
  assert.deepEqual(six, [11, 15, 31, 50, 64, 76]);
  const counts = {};
  for (const p of H.poems) counts[p.kimariji.length] = (counts[p.kimariji.length] || 0) + 1;
  assert.deepEqual(counts, { 1: 7, 2: 43, 3: 36, 4: 6, 5: 2, 6: 6 });
  // 決まり字はほかの札の上の句の頭と重ならない（音で比べる）、1 字短いと重なる
  for (const p of H.poems) {
    const k = H.sound(p.kimariji);
    for (const q of H.poems) if (q !== p) assert.ok(!H.sound(q.kamiKana).startsWith(k), p.n + ' と ' + q.n);
    if (k.length > 1) assert.ok(H.poems.some((q) => q !== p && H.sound(q.kamiKana).startsWith(k.slice(0, -1))), p.n + ' は最短');
  }
  assert.equal(P(26).kimariji, 'をぐ', '「を」と「お」は同じ音（おく やまに と比べる）');
  assert.equal(P(87).kimariji, 'む');
  assert.equal(P(81).kimariji, 'ほ');
});

test('序歌: 難波津に（読みは読手テキストのふりがな）', () => {
  assert.equal(H.JOKA.kami + H.JOKA.shimo, '難波津に咲くやこの花冬ごもり今を春べと咲くやこの花');
  assert.equal(H.JOKA.kamiYomi, 'なにわずに さくやこのはな ふゆごもり');
});

// --- 読み上げの段取り ---
test('順番: 番号順は 1〜100、ランダムは種が同じなら同じ並びで、100 枚とも 1 回ずつ', () => {
  const all = H.poems.map((p) => p.n);
  assert.deepEqual(Y.makeOrder(all, 'number', 5), all);
  const a = Y.makeOrder(all, 'random', 42), b = Y.makeOrder(all, 'random', 42), c = Y.makeOrder(all, 'random', 43);
  assert.deepEqual(a, b);
  assert.notDeepEqual(a, c);
  assert.deepEqual(a.slice().sort((x, y) => x - y), all);
});

test('段取り: ちらし取り・序歌あり・下の句 2 回', () => {
  const s = Y.buildSteps([7, 3], { style: 'chirashi', joka: true, twice: true });
  const f = (x) => [x.card, x.n, x.part, x.pause, x.again];
  assert.deepEqual(s.map(f), [
    [-1, 0, 'kami', 'short', false], [-1, 0, 'shimo', 'short', false], [-1, 0, 'shimo', 'gap', true],
    [0, 7, 'kami', 'short', false], [0, 7, 'shimo', 'short', false], [0, 7, 'shimo', 'gap', true],
    [1, 3, 'kami', 'short', false], [1, 3, 'shimo', 'short', false], [1, 3, 'shimo', 'end', true],
  ]);
});

test('段取り: 競技かるた式（上の句のあと取る時間、下の句のあと余韻 4 秒で次の上の句）', () => {
  const s = Y.buildSteps([7, 3], { style: 'kyogi', joka: true, twice: true });
  const f = (x) => [x.n, x.part, x.pause];
  assert.deepEqual(s.map(f), [
    [0, 'kami', 'short'], [0, 'shimo', 'short'], [0, 'shimo', 'yoin'],
    [7, 'kami', 'gap'], [7, 'shimo', 'yoin'],
    [3, 'kami', 'gap'], [3, 'shimo', 'end'],
  ]);
  assert.equal(Y.PAUSE.yoin, 4.0, '読手テキストの余韻 3.0 秒＋間合い 1.0 秒');
});

test('段取り: 序歌なし・下の句 1 回', () => {
  const s = Y.buildSteps([5], { style: 'chirashi', joka: false, twice: false });
  assert.deepEqual(s.map((x) => [x.part, x.pause]), [['kami', 'short'], ['shimo', 'end']]);
});

test('残り枚数・読み終わった札・次の札', () => {
  const order = [7, 3, 9];
  const s = Y.buildSteps(order, { style: 'chirashi', joka: true, twice: false });
  // 0-2 序歌, 3-4 札 7, 5-6 札 3, 7-8 札 9
  assert.equal(Y.readCount(s, 2), 0, '序歌は数えない');
  assert.equal(Y.readCount(s, 3), 1);
  assert.equal(Y.readCount(s, 6), 2);
  assert.deepEqual(Y.doneCards(order, s, 5), [7]);
  assert.deepEqual(Y.doneCards(order, s, s.length), [7, 3, 9]);
  assert.equal(Y.nextCardStart(s, 0), 3);
  assert.equal(Y.nextCardStart(s, 3), 5);
  assert.equal(Y.nextCardStart(s, 8), s.length);
});

test('読み上げる文: 句の区切りは読点、見張りの秒数は字数と速さから', () => {
  assert.equal(Y.speechText('あきのたの かりおのいおの とまをあらみ'), 'あきのたの、かりおのいおの、とまをあらみ');
  assert.equal(Y.estimateSeconds('あいうえお', 1), 5 * 0.25 + 1);
  assert.ok(Y.estimateSeconds('あいうえお', 0.5) > Y.estimateSeconds('あいうえお', 1));
});

test('続き: 保存した順番を確かめ、知らない番号や重なりは捨てる', () => {
  const all = H.poems.map((p) => p.n);
  assert.deepEqual(Y.normalizeResume({ order: [3, 1, 2], pos: 4 }, all), { order: [3, 1, 2], pos: 4, at: '' });
  assert.equal(Y.normalizeResume({ order: [3, 3], pos: 0 }, all), null);
  assert.equal(Y.normalizeResume({ order: [101], pos: 0 }, all), null);
  assert.equal(Y.normalizeResume({ order: [], pos: 0 }, all), null);
  assert.equal(Y.normalizeResume('x', all), null);
  assert.equal(Y.normalizeResume({ order: [1], pos: -3 }, all).pos, 0);
});

// --- 決まり字クイズ ---
test('決まり字クイズ: 取り札 → 決まり字を入力（カタカナ・全角も可、「を」は「お」でも可）', () => {
  const tori = C.kindOf(kimariji, 'tori');
  const it26 = C.itemById(kimariji, '26');
  for (const v of ['をぐ', 'おぐ', 'ヲグ', 'オグ']) assert.equal(C.checkTyped(tori, it26, v).ok, true, v);
  assert.equal(C.checkTyped(tori, it26, 'おく').ok, false);
  const it87 = C.itemById(kimariji, '87');
  assert.equal(C.checkTyped(tori, it87, 'む').ok, true);
  assert.equal(C.checkTyped(tori, it87, 'むら').ok, false, '長すぎも不正解');
});

test('決まり字クイズ: 上の句 → 下の句は4択だけで、選択肢に正解が 1 つ、4 つとも別の札', () => {
  const kind = C.kindOf(kimariji, 'kami');
  assert.equal(kind.typing, false);
  const qs = C.makeRound(kimariji, { kind: 'kami', mode: 'typing', filters: {}, count: 20, seed: 7 });
  assert.equal(qs.length, 20);
  for (const q of qs) {
    const it = C.itemById(kimariji, q.id);
    assert.equal(q.choices.length, 4);
    assert.equal(new Set(q.choices).size, 4);
    assert.ok(q.choices.includes(it.shimoKana));
  }
});

test('決まり字クイズ: 一字決まりの絞り込みは 7 首、4 択の選択肢もその 7 首から', () => {
  const pool = C.pool(kimariji, { len: '1' });
  assert.equal(pool.length, 7);
  const shimo = new Set(pool.map((it) => it.shimoKana));
  const qs = C.makeRound(kimariji, { kind: 'kimari', mode: 'choice', filters: { len: '1' }, count: 0, seed: 3 });
  assert.equal(qs.length, 7);
  for (const q of qs) for (const c of q.choices) assert.ok(shimo.has(c));
});
