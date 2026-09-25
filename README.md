# クイズ広場

公開 URL: **https://yorozu-craft.com/quiz-hiroba/**

元素記号・歴史年号・百人一首の決まり字・世界の首都を 4 択と入力（一問一答）で覚える無料クイズ。高齢者向けの昭和クイズ（3 択・広告なし・回想法カード）と、1 台を 2〜4 人で使う早押しボタン（`/hayaoshi/`）もある。一覧で覚える・問題と答えを印刷・同じ問題でちょうせんのリンクつき。百人一首の読み上げ（`/hyakunin/`）も同じリポジトリに置く。
yorozu-craft のツールの1つです（共通ルールは [youheioonuki.github.io の README](https://github.com/YouheiOonuki/youheioonuki.github.io) を参照）。企画は yorozu-plans の `docs/27_クイズ広場.md`（ROADMAP K120・K89・K90）と `docs/30_百人一首と世界の首都.md`（K87、K120 の題材）、`docs/38_クイズ大会と昭和クイズ.md`（K96 早押しボタン・K108 昭和クイズ）。

## 題材

| URL | 題材 | 件数 | データの出典 |
|-----|------|------|-------------|
| `/quiz-hiroba/genso/` | 元素記号クイズ | 118 | IUPAC 周期表（2022-05-04 版）＋日本化学会「原子量表（2026）」 |
| `/quiz-hiroba/nengo/` | 歴史年号クイズ（日本の歴史） | 101 | 出来事の文は自作。年は 1 件ずつコトバンクの項目と突き合わせ |
| `/quiz-hiroba/kimariji/` | 百人一首 決まり字クイズ | 100 | 歌は `hyakunin-data.js`（全日本かるた協会・ウィキソース。先頭の説明）。決まり字は計算 |
| `/quiz-hiroba/showa/` | 昭和クイズ（3 択・大きな字・回想法カード。**広告なし D118**。使い方も `showa/guide.html` で広告なし） | 75 | 出来事: 国立公文書館「公文書にみる日本のあゆみ」ほか／値段: 総務省統計局 小売物価統計調査（東京都区部、昭和25年〜平成22年の表）／歌: 日本作曲家協会 日本レコード大賞 歴代大賞一覧。歌詞は載せない。`topics/showa.js` の先頭 |
| `/quiz-hiroba/shuto/` | 世界の首都クイズ | 191 | 外務省「国・地域」と各国の基礎データ（インターネットアーカイブの保存で確認）。`topics/shuto.js` の先頭に出題しない国と理由 |

## 百人一首 読み上げ（`/quiz-hiroba/hyakunin/`。題材ではなく手で書いたページ）

- 段取り（どの句を読み、どこで何秒止まるか）は `yomiage.js`（純粋関数、`tests/hyakunin.test.js`）。画面・声・画面を消さない設定は `yomiage-ui.js`
- 読み方: ちらし取り（上の句 → 1 秒 → 下の句（2 回も可）→ 間隔）／競技かるた式（上の句 → 取る時間 → 下の句 → 4 秒 → 次の上の句。4 秒は読手テキストの余韻 3.0 秒＋間合い 1.0 秒）。序歌は下の句を 2 回
- 声は Web Speech API の日本語の声（`lang` が ja）。端末の中の声（`localService`）を先に選ぶ。日本語の声が無いときは歌と読み方を大きく出し、「次の札へ」で進める
- 読み上げる文は `hyakunin-data.js` の読み（読手テキストのふりがなから作った現代の音）。句の区切りは読点にして渡す。`onend` が来ない端末のために、目安の 2 倍＋3 秒で次へ進む見張りがある
- 画面を消さない: Screen Wake Lock API（使えない端末ではその旨を出す）
- 保存: `quiz-hiroba_yomiage`（設定と読みかけの続き）。記録のバックアップ（D31）の対象外（設定と続きだけで、消えても困らないため）
- 広告なし（AdSense の meta だけ）。広告は `hyakunin/guide.html` だけ（D122 と同じ）

## 早押しボタン（`/quiz-hiroba/hayaoshi/`。手で書いたページ）

- 判定と得点は `hayaoshi.js`（純粋関数、`tests/hayaoshi.test.js`）: 受付中に最初に押した 1 人だけ受け付けてロック、正解 +1、不正解はお手つき（その問題では押せない。-1 点は設定）、1 つもどす、受付をもどす
- 画面・タッチ・効果音は `hayaoshi-ui.js`。押し始め（`pointerdown`）だけを見る。指ごとに別のイベントなので、同じ瞬間の 2 本の指は先に届いたほうが勝つ。キーボードは Q・P・Z・M（1〜4 ばん）、Enter 正解・X 不正解・N つぎ・D ドラムロール・U もどす
- 効果音は Web Audio で合成（音のファイルは持たない）。問題はクイズ広場の題材から `calc.js` の種で並べ、「読み上げ役の画面」に同じ順で答えつき一覧（印刷可）
- 保存: `quiz-hiroba_hayaoshi`（人数・名前・得点・問題の種）。バックアップ（D31）の対象外。広告: ボタンの画面は meta だけ、`hayaoshi/guide.html` だけ広告（D122）

## 機能（どの題材も同じエンジン）

- 答え方: 4 択（選択肢は並びの近いものから 2 つ＋範囲からばらばらに 1 つ）／入力（一問一答）。4 択だけの向き（年 → 出来事）もある
- 向き（題材ごと）・範囲や時代の絞り込み・問題数（10・20・すべて）・「にがてだけ出す」
- 入力の答え合わせの決まり（`calc.js` の `checkTyped`。使い方ページにも同じ文）: 全角半角・空白・カタカナとひらがなの違いは無視／漢字は登録した表記とよみだけ／元素記号は大文字小文字を区別（大小だけ違えば「おしい」で不正解）／年は数字だけ
- 一覧で覚える（欄をかくして「？」で見る）、問題と答えの 2 枚を印刷（選択肢つきも可。A4、クレジットは `print/` へ）
- 記録: 問題ごとの正解・不正解と「最後にまちがえたもの＝にがて」、条件ごとの自己ベスト（正解数、同じなら時間）。キー `quiz-hiroba_records`・`quiz-hiroba_settings`。書き出し・読み込みは入口のページ
- 共有リンク `#s=`（base64url の JSON: 題材・向き・答え方・絞り込み・問題数・種・送った人の正解数）。同じ問題・同じ選択肢の並びになる。受け取った側の設定は上書きしない
- 広告: 入口・題材のページは AdSense の meta だけ（遊ぶ画面。todofuken-quiz と同じ）、使い方ページ（`guide.html`）だけ広告あり（企画書 27 の D122）
- オフライン対応（`sw.js`、キャッシュ名 `quiz-hiroba-v1`）

## 題材を足す

1. `topics/<題材>.js` を書く（3 択にするなら `choices: 3`、選択肢を同じ組からだけ出すなら向きに `group`、高齢者向けは `page.big`・`page.noAds`・`page.guide`・`page.cards`。見本は `topics/showa.js`。`topics/genso.js` が見本。別のデータファイルを使うときは `page.deps` に並べる。例: `topics/kimariji.js` の `hyakunin-data.js`）。持つもの: `id`・`page`（title・h1・lead 40 字まで・description・hub・icon・order・note）・`items`（`id` が重ならない）・`kinds`（prompt・answer・accept・choice。入力で答えられない向きは `typing: false`、年のように数字で答えるなら `numeric: true`、大小を区別するなら `caseSensitive: true`）・`filters`・`columns`・`order`・`label`・`explain`・`link`・`unit`・`sourceKey`
2. `constants.js` に出典（source・url・checked）を足す
3. `node tools/build-pages.mjs` を実行する（`<題材>/index.html`、入口の一覧、`print/` の一覧、`sitemap.xml`、`sw.js` の最初に取っておくファイルを作り直す）。`tests/data.test.js` がずれを見張る
4. `tests/data.test.js` にデータの確かめ（件数・重なり・見本の値）を足す。`node --test tests/*.test.js`
5. 画面や読み込むファイルの構成を変えたら `sw.js` の `CACHE_NAME` を上げる

## データの作り方と確かめ方（2026-09-25）

- 元素: IUPAC の PDF（2018-12-01 版はテキストを取り出せた。2022-05-04 版は文字が図形なので画像で目視）から原子番号・記号・英語名 118 件、日本化学会「原子量表（2026）」の PDF から日本語名 118 件を取り出し、記号と英語名が 2 つの表で一致することを確かめた。漢字を含む 20 件のよみはコトバンクで確かめた
- 年号: 出来事ごとに見出し語を決め、コトバンクのそのページに「その年」が書かれていることを 1 件ずつ確かめた（見出し語は `topics/nengo.js` の各行の最後）。説が分かれる年（鉄砲の伝来）と『日本書紀』による年（十七条の憲法）は文に書いた。語呂合わせは載せない

## 保守

| 時期 | 確認すること | 直す場所 |
|------|------------|---------|
| 年 1 回（4 月の原子量表の改訂のころ） | 新しい元素の名前が決まっていないか（IUPAC・日本化学会） | `topics/genso.js`、`constants.js` の checked |
| 事実は変わらない（昭和クイズ） | まちがいの報告があったときだけ | `topics/showa.js`、`constants.js` の showa |
| 年 1 回 | 外務省の「国・地域」と基礎データで、国の増減・首都の変更・遷都がないか（インドネシアの首都移転など） | `topics/shuto.js`、`constants.js` の shuto |
| 題材を足したとき | 上の「題材を足す」 | — |

年号・元素名は時が経っても変わらない。直したら `guide.html` の「更新履歴」に 1 行足す。

## ファイル

| ファイル | 役割 |
|---------|------|
| `index.html` / `hub.js` | 入口（題材の一覧・記録の数・記録の書き出しと読み込み） |
| `genso/`・`nengo/`・`kimariji/`・`shuto/` の `index.html` | 題材のページ（`tools/build-pages.mjs` が作る。直接直さない） |
| `hyakunin/index.html` / `yomiage.js` / `yomiage-ui.js` / `hyakunin/guide.html` | 百人一首 読み上げ（手で書いたページ。`tools/build-pages.mjs` の `EXTRA_PAGES` で入口・sitemap・sw.js に入る） |
| `hyakunin-data.js` | 小倉百人一首 100 首と序歌（読み上げと決まり字クイズが使う） |
| `tools/page-template.html` / `tools/build-pages.mjs` | 題材のページのひな形と、それを作るスクリプト |
| `topics/*.js` | 題材のデータ |
| `calc.js` | 出題エンジン（純粋関数）: 出題・4 択・答え合わせ・記録・共有リンク・バックアップ |
| `quiz.js` | 題材のページの画面（メニュー・出題・結果・一覧・印刷） |
| `constants.js` | データの出典と確認日 |
| `guide.html` | 使い方・入力の決まり・出典・よくある質問・注意・更新履歴 |
| `print/index.html` | 印刷物のクレジットの着地ページ（noindex、sitemap に載せない） |
| `style.css` | 見た目（和紙風の配色、ダークモード、印刷） |
| `sw.js` / `manifest.webmanifest` | オフライン対応 |
| `404.html` | ツール配下の 404 |
| `favicon.svg` / `apple-touch-icon.png` / `og-image.png` | アイコン / ホーム画面用 / SNS 共有用（1200×630） |
| `tests/*.test.js` | テスト（`node --test tests/*.test.js`） |

## ライセンス

MIT License（`LICENSE`）。元素名・年号は事実のデータで、出典は上のとおり。出来事の文は運営者が書いたもの。
