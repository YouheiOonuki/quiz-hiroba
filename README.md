# クイズ広場

公開 URL: **https://yorozu-craft.com/quiz-hiroba/**

元素記号・歴史年号などを 4 択と入力（一問一答）で覚える無料クイズ。一覧で覚える・問題と答えを印刷・同じ問題でちょうせんのリンクつき。
yorozu-craft のツールの1つです（共通ルールは [youheioonuki.github.io の README](https://github.com/YouheiOonuki/youheioonuki.github.io) を参照）。企画は yorozu-plans の `docs/27_クイズ広場.md`（ROADMAP K120・K89・K90）。

## 題材

| URL | 題材 | 件数 | データの出典 |
|-----|------|------|-------------|
| `/quiz-hiroba/genso/` | 元素記号クイズ | 118 | IUPAC 周期表（2022-05-04 版）＋日本化学会「原子量表（2026）」 |
| `/quiz-hiroba/nengo/` | 歴史年号クイズ（日本の歴史） | 101 | 出来事の文は自作。年は 1 件ずつコトバンクの項目と突き合わせ |

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

1. `topics/<題材>.js` を書く（`topics/genso.js` が見本）。持つもの: `id`・`page`（title・h1・lead 40 字まで・description・hub・icon・order・note）・`items`（`id` が重ならない）・`kinds`（prompt・answer・accept・choice。入力で答えられない向きは `typing: false`、年のように数字で答えるなら `numeric: true`、大小を区別するなら `caseSensitive: true`）・`filters`・`columns`・`order`・`label`・`explain`・`link`・`unit`・`sourceKey`
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
| 題材を足したとき | 上の「題材を足す」 | — |

年号・元素名は時が経っても変わらない。直したら `guide.html` の「更新履歴」に 1 行足す。

## ファイル

| ファイル | 役割 |
|---------|------|
| `index.html` / `hub.js` | 入口（題材の一覧・記録の数・記録の書き出しと読み込み） |
| `genso/index.html`・`nengo/index.html` | 題材のページ（`tools/build-pages.mjs` が作る。直接直さない） |
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
