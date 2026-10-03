# クイズ広場の「おお」の一言のデータ（CC0）

[クイズ広場](https://yorozu-craft.com/quiz-hiroba/)の答えのあとに出る「おお」の一言（元素・世界の首都）を、ほかの道具で使える形で置いています。

| ファイル | URL | 中身 |
|---------|-----|------|
| `genso.json` | https://yorozu-craft.com/quiz-hiroba/data/genso.json | 118 元素の番号・記号・日本語名・英語名・周期・族と、一言（名前の由来・記号の由来・発見・気体か液体か・周期表の位置など）。一言ごとに出典（`source.label`・`source.url`） |
| `shuto.json` | https://yorozu-craft.com/quiz-hiroba/data/shuto.json | 191 か国の国名・首都（外務省の表記）と、首都の一言（名前の由来・創設の年・そばの水域・昔の公式名）。一言ごとに Wikidata の Q 番号と属性 |
| `wikidata-shuto.json` | https://yorozu-craft.com/quiz-hiroba/data/wikidata-shuto.json | 首都の一言の元になる Wikidata の写し（取得日・項目の版つき） |

## ライセンス

このフォルダのデータは **CC0 1.0**（パブリック・ドメイン提供）です。全文は `LICENSE`。表示の義務はありませんが、使うときに次のように書いてもらえると、どこで使われているかが分かって助かります。

```
出典: クイズ広場（yorozu-craft） https://yorozu-craft.com/quiz-hiroba/
```

- 首都の一言は Wikidata（CC0 1.0）の値から機械で作った文です。
- 元素の一言は、各行の出典（IUPAC CIAAW・ロスアラモス国立研究所・IUPAC・PubChem）に書いてあることだけを短い日本語にした文です（出典の文は写していません）。
- このリポジトリのコード（`*.js`・`tools/` など）は MIT License（リポジトリ直下の `LICENSE`）のままです。

## 項目

| 項目 | 意味 |
|------|------|
| `license` | `CC0-1.0` |
| `checked` | 出典を最後に確かめた日（首都は Wikidata の取得日。`checked_detail` に国名・首都の表記を確かめた日） |
| `generated` | このファイルの中身が変わった日（YYYY-MM-DD）。中身が同じなら書き出し直しても変わらない |
| `source` | 使った出典の URL の一覧（一言ごとの出典は `items[].facts[].source`） |
| `items[].facts[].kind` | 元素: `name`（名前の由来）・`symbol`（記号の由来）・`found`（発見）・`named`（命名）・`state`（気体・液体）・`table`（周期表の位置）・`free`（自由文）。首都: `name`・`founded`・`water`・`former` |
| `unmatched`（shuto） | Wikidata の首都と外務省の表記が突き合わせられず、一言を出さない国 |

## 注意

- 一言は 1 文 40 字以内で、人口・面積・順位など変わるものは書いていません（決まりは `ooh.js` の先頭）。
- 首都の扱いが資料によって分かれる国があります。国名・首都の表記は外務省のままです。

## 作り方（保守）

`genso.json`・`shuto.json` は手で直しません。元のデータ（`ooh-genso.js`・`ooh-shuto.js`・`topics/*.js`・`constants.js`）を直して、次で書き出します。テスト（`tests/opendata.test.js`）が、書き出した結果とファイルが同じかを確かめます。

```
node tools/build-data.mjs
```
