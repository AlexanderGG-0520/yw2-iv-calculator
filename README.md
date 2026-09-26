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



## AI / WebMCP / MCP

このアプリは、人間向けUIと同じ計算エンジンをAIエージェントから直接利用できるように、WebMCPとリモートMCPの両方を公開します。

### WebMCP

WebMCP対応ブラウザでページを開くと、`document.modelContext.registerTool()` を使って次の4ツールを登録します。

| Tool | 用途 |
| --- | --- |
| `yw2_search_yokai` | 名前・番号・species IDから妖怪を検索 |
| `yw2_list_score_profiles` | 役割別のIV評価軸を取得 |
| `yw2_calculate_stats` | IVから表示ステータスを順計算 |
| `yw2_reverse_search` | 実機ステータスからIV候補を逆算 |

`yw2_calculate_stats` と `yw2_reverse_search` をWebMCPから実行した場合は、返り値を返すだけでなく、ページ上の順計算・逆算フォームと結果表示も同じ状態へ同期します。これによりブラウザエージェントがユーザーの代わりにサイトを操作した結果を、そのまま画面でも確認できます。

WebMCP未対応ブラウザでは通常のWebアプリとして動作し、WebMCP部分だけが無効になります。

### リモートMCP

本番サーバーは同一originの `/mcp` にStreamable HTTP MCP endpointを公開します。

```text
https://<PUBLIC_ORIGIN>/mcp
```

MCP `2026-07-28` のstateless protocolに対応し、`server/discover`、`tools/list`、`tools/call` を実装しています。既存クライアント向けに2025系の `initialize` フローも受け付けます。

2026-07-28形式のdiscovery例:

```sh
curl -sS https://<PUBLIC_ORIGIN>/mcp \
  -H 'Content-Type: application/json' \
  -H 'MCP-Protocol-Version: 2026-07-28' \
  -H 'Mcp-Method: server/discover' \
  --data '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "server/discover",
    "params": {
      "_meta": {
        "io.modelcontextprotocol/protocolVersion": "2026-07-28",
        "io.modelcontextprotocol/clientCapabilities": {},
        "io.modelcontextprotocol/clientInfo": {
          "name": "curl",
          "version": "1.0.0"
        }
      }
    }
  }'
```

MCPサーバーとWebMCPは `src/agent/tools.ts` の同一ツール実装を共有するため、ブラウザと外部AIで計算結果が分岐しない構成です。

### MCP認証

計算・検索ツールはゲームやアカウントを書き換えないため、デフォルトでは `/mcp` は認証なしで利用できます。公開先を限定したい場合は、runtimeに `MCP_BEARER_TOKEN` を設定するとBearer認証が有効になります。

```sh
MCP_BEARER_TOKEN='replace-me' npm start
```

その場合、クライアントは次を送信します。

```text
Authorization: Bearer replace-me
```

### ローカルでMCP込みのproduction runtimeを起動

```sh
npm run build
npm start
```

デフォルトでは `http://localhost:8080/` がUI、`http://localhost:8080/mcp` がMCP endpoint、`http://localhost:8080/healthz` がhealth checkです。

## GitOps / Argo CD

本番用manifestは `infra/kubernetes`、Argo CD Application定義は `infra/argocd/application.yaml` に置いています。

mainへpushされたコミットでは次の順に更新されます。

1. テストとproduction build
2. `ghcr.io/alexandergg-0520/yw2-iv-calculator:<commit SHA>` をpublish
3. `infra/kubernetes/app.yaml` のimage tagを同じcommit SHAへ自動更新
4. GitHub Actions botがdeployment revisionをmainへcommit
5. Argo CDがmainの `infra/kubernetes` を検知して自動sync

Argo CD側は `automated.prune=true` と `automated.selfHeal=true` です。

Application自体はclusterへ一度bootstrapする必要があります。その後のアプリ更新にはclusterへの直接操作は不要です。

## Dependabot

`.github/dependabot.yml` で次を毎週月曜09:00 JSTに確認します。

- npm
- GitHub Actions
- Docker base image

同一ecosystemの更新はまとめてPR化します。

## 非公式ツール

このプロジェクトはファン制作の非公式ツールです。

株式会社レベルファイブ、任天堂株式会社、その他の「妖怪ウォッチ」関連の権利者による公式プロジェクトではなく、各社との提携・承認・後援関係もありません。

ゲームROM、実行コード、画像・音声などの公式ゲームアセットは配布しません。

## License

プロジェクト独自のコードは [MIT License](LICENSE) です。

外部資料・データの出典については [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) と [docs/source-notes.md](docs/source-notes.md) を参照してください。
