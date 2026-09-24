# Yo-kai Watch 2 IV Reverse Calculator

妖怪ウォッチ2の実機ステータスから、成立し得る個体値候補を逆算する非公式Webツールです。

YW1版の `AlexanderGG-0520/yw1-iv-calculator` を設計上のベースにしつつ、YW2で変更された個体値・成長・性格EV・スポーツクラブの仕様に合わせて計算エンジンを作り直しています。

## YW1版との主な違い

YW2では `IV_A / IV_B_1 / IV_B_2` を使いません。

通常個体のIVは次の加重合計40ポイントです。

```text
HP_IV / 2 + ちから_IV + ようりょく_IV + まもり_IV + すばやさ_IV = 40
```

HP IVは0〜80の偶数、その他は0〜40として探索します。

また、YW2には別枠で性格EVとスポーツクラブ補正があります。

```text
HP_EV / 2 + ちから_EV + ようりょく_EV + まもり_EV + すばやさ_EV <= 20
```

スポーツクラブは4種合計5回までです。

## 使い方

1. 対象妖怪とレベルを選択します。
2. 実機の5ステータスを入力します。
3. その個体に蓄積している性格EVを入力します。
4. スポーツクラブの実施回数を入力します。
5. 装備・魂を外せない場合だけ装備補正を入力します。
6. 「逆算」を押します。
7. 加重40ポイント制約を満たす候補だけが表示されます。

現在の性格名だけでは過去に蓄積したEVは一意に決まりません。性格を変更しても、それ以前に獲得したEVが別ステータスへ移動するわけではないため、このツールではEVを数値で入力します。

## スポーツクラブ

1回あたりの補正は次の通りです。

| トレーニング | 加算 | 減算 |
| --- | ---: | ---: |
| ちから | ちから +5 | まもり -2 |
| ようりょく | ようりょく +5 | すばやさ -2 |
| まもり | まもり +5 | すばやさ -2 |
| すばやさ | すばやさ +5 | まもり -2 |

## 計算式

実装は次の公開資料を参照しています。

- とげにゃんWeb「妖怪ウォッチ2 妖怪種族値一覧」
  - https://togenyanweb.appspot.com/Yokai/yw2/yokaiList.html
- Yo-kai Watch Character Database「YW2 stat guide」
  - https://yokaiwatch.github.io/characters/stat-guide-ykw2.html

後者に記載されたfloat32の計算順序を `src/engine/calculationEngine.ts` に実装しています。

このリポジトリ自身がゲーム実行コードを独立にリバースエンジニアリングしたという意味ではありません。公開されている検証結果を実装し、公開されているトゲニャンの計算例をテストfixtureとして固定しています。

## 妖怪データ

`scripts/sync-yokai-data.mjs` が、とげにゃんWebのYW2種族値表からBase A / Base Bを取り込みます。

```sh
npm run sync:yokai
```

通常の `npm run dev` と `npm run build` では同期を試行し、取得できない場合はチェックイン済みのフォールバックデータを使います。

同期時はBase Bが全て0の行を除外します。元テーブルにはボス・特殊データも含まれるため、「データに存在する = 通常入手可能」とは限りません。

## ローカル実行

```sh
npm install
npm run dev
```

テストとビルド:

```sh
npm test
npm run build
```

Docker:

```sh
docker compose --profile local up --build
```

## 非公式ツール

このプロジェクトはファン制作の非公式ツールです。

株式会社レベルファイブ、任天堂株式会社、その他の「妖怪ウォッチ」関連の権利者による公式プロジェクトではなく、各社との提携・承認・後援関係もありません。

ゲームROM、実行コード、画像・音声などの公式ゲームアセットは配布しません。

## License

プロジェクト独自のコードは [MIT License](LICENSE) です。

外部資料・データの出典については [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) と [docs/source-notes.md](docs/source-notes.md) を参照してください。
