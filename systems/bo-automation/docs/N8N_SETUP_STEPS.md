# n8nセットアップ手順書

**n8nインスタンス**: https://scfg2026.app.n8n.cloud

---

## STEP 1：Credentialsの設定

n8nダッシュボード → 「Credentials」→ 以下を追加：

### LINE API
- Name: `LINE Messaging API`
- Channel Access Token: `.envのLINE_CHANNEL_ACCESS_TOKEN`

### Google Sheets
- Name: `Google Sheets`
- 認証方式: OAuth2（Googleアカウントで認証）

### Anthropic (Claude)
- Name: `Anthropic API`
- API Key: `.envのCLAUDE_API_KEY`

---

## STEP 2：ワークフローのインポート

n8nダッシュボード → 「Workflows」→ 「Import」

以下の4ファイルを順番にインポート：
1. `workflow_01_daily_notification.json`
2. `workflow_02_call_result.json`
3. `workflow_03_reminder.json`
4. `workflow_04_line_reply.json`

---

## STEP 3：環境変数の設定

n8nダッシュボード → 「Settings」→ 「Variables」

| 変数名 | 値 |
|--------|-----|
| SPREADSHEET_ID | 1AikGKgQH2UtB2Mv3A7NMhQqwH5IEvSD0s_Fu7CyMSlE |
| BO_LINE_USER_ID | BOのLINEユーザーID（要確認） |
| GAS_DEPLOY_ID | GASをデプロイ後に取得 |

---

## STEP 4：LINE WebhookをLINE Developersに設定

LINE Developers → チャンネル → Messaging API設定 → Webhook URL:
```
https://scfg2026.app.n8n.cloud/webhook/line-webhook
```

---

## STEP 5：GASをスプレッドシートに設置

1. スプレッドシートを開く
2. 拡張機能 → Apps Script
3. `spreadsheet_monitor.gs`の内容をコピペ
4. `N8N_WEBHOOK_URL`をn8nのWebhook URLに更新
5. 「デプロイ」→「新しいデプロイ」→ウェブアプリとして公開
6. デプロイIDを取得してn8nの環境変数`GAS_DEPLOY_ID`に設定

トリガー設定：
- `dailyFollowUpCheck`：時間ベース → 毎日9:00〜10:00
- `onEdit`：スプレッドシートから → 編集時

---

## STEP 6：BOダッシュボードのデプロイ

1. `src/dashboard/index.html`をVercelにデプロイ
2. URLをn8nの通知メッセージ内に設定

---

## STEP 7：動作テスト

1. テスト顧客のインタビュー日をスプシに入力
2. 翌朝9時に後確通知が届くことを確認
3. ダッシュボードで結果を入力してLINEが届くことを確認

---

*完成後、BOの電話以外の作業は90%削減されます。*
