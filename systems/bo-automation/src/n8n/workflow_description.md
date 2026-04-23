# n8nワークフロー設計書

**n8nインスタンス**: https://scfg2026.app.n8n.cloud

---

## ワークフロー①：毎朝9時 後確リスト通知

**トリガー**: Schedule（毎日9:00 JST）

```
[Schedule: 毎日9:00]
    ↓
[HTTP Request] GASの dailyFollowUpCheck() を呼び出す
    ↓
[Webhook受信] GASからのリスト
    ↓
[Split In Batches] 顧客ごとに処理
    ↓
[Code Node] BOへの通知メッセージを生成
    「📋 本日の後確リスト（○件）
     
     1. A0185 山田太郎様
        FP状況：マッチング済み・連絡待ち
     
     2. A0186 佐藤花子様
        FP状況：FP未連絡
     
     ↓ダッシュボードで結果入力:
     https://bo-dashboard.vercel.app」
    ↓
[LINE: BOのLINEグループor個人に送信]
```

---

## ワークフロー②：BOが電話結果をワンタップ入力

**トリガー**: Webhook（ダッシュボードからPOST）

```
[Webhook: /call-result]
    ↓
[Switch] result_type で分岐
    ↓
┌── confirmed（日程確定）────────────────────────────┐
│ [Google Sheets] AO列に面談日時を自動入力           │
│ [LINE] 確定メッセージ + 注意事項を送信             │
│ ※「完了報告アンケートフォーム」提携文テキストも送信│
└────────────────────────────────────────────────────┘

┌── undecided（未定）────────────────────────────────┐
│ [Google Sheets] ステータスを「未定」に更新         │
│ [LINE] 未定メッセージを送信                        │
│ [Schedule] 4日後にリマインダーをセット             │
└────────────────────────────────────────────────────┘

┌── fp_none（FP未連絡）──────────────────────────────┐
│ [Google Sheets] ステータスを「FP未連絡」に更新     │
│ [LINE] 未連絡メッセージを送信                      │
│ [Schedule] 4日後にリマインダーをセット             │
└────────────────────────────────────────────────────┘

┌── mismatch（名前不一致）───────────────────────────┐
│ [Google Sheets] ステータスを「要確認」に更新       │
│ [LINE] 名前確認メッセージを送信                    │
│ [Claude AI] 返信を待って名前を記録するフローへ     │
└────────────────────────────────────────────────────┘
```

---

## ワークフロー③：LINEからの返信を処理

**トリガー**: LINE Webhook（顧客からのメッセージ）

```
[LINE Webhook]
    ↓
[Claude API] メッセージを分類
    - 「日時が書いてある」→ appointment_date
    - 「まだ決まってない」→ still_undecided
    - 「掲載いつ？」系の質問 → publication_inquiry
    - その他の質問 → general_inquiry
    ↓
[Switch] 分類結果で分岐

appointment_date:
    → [Google Sheets] AO列に日時を自動入力
    → [LINE] 確定メッセージ + 注意事項 + アンケートフォーム送信

still_undecided:
    → [Schedule] 4日後にリマインダー再セット
    → [LINE] 「承知しました、決まりましたらご連絡ください」

publication_inquiry:
    → [Google Sheets] 該当顧客のステータスを確認
    → [Claude API] 状況に応じた返信文を生成
    → [LINE] 自動返信

general_inquiry:
    → [Claude API] 適切な返信を生成（判断できない場合はBOに転送）
    → [LINE] 自動返信 or BOへの転送通知
```

---

## ワークフロー④：リマインダー（Day8・Day12）

**トリガー**: Schedule（毎日チェック）

```
[Schedule: 毎日10:00]
    ↓
[Google Sheets] ステータスが「未定」「未連絡」で
               後確からN日経過した顧客を抽出
    ↓
[Switch] 経過日数で分岐

Day8（4日後リマインダー）:
    → [LINE] 「その後いかがでしょうか」送信

Day12（キャンセルポリシー）:
    → [LINE] キャンセルポリシー送信
    → [Google Sheets] ステータスを「催促済み」に更新
    → [LINE: BOに通知] 「○○様にキャンセル警告を送信しました」
```

---

## 環境変数（n8nのCredentialsに設定）

| 変数名 | 値 |
|--------|-----|
| LINE_CHANNEL_ACCESS_TOKEN | .envを参照 |
| CLAUDE_API_KEY | .envを参照 |
| SPREADSHEET_ID | 1AikGKgQH2UtB2Mv3A7NMhQqwH5IEvSD0s_Fu7CyMSlE |

---

## 実装順序

1. LINE Credentialsを設定
2. Google Sheets Credentialsを設定（GASのサービスアカウント）
3. Claude API Credentialsを設定
4. ワークフロー①（朝の通知）を構築・テスト
5. ワークフロー②（電話結果入力）を構築・テスト
6. ワークフロー③（返信処理）を構築・テスト
7. ワークフロー④（リマインダー）を構築・テスト

*作成: 2026-04-17 by Jobs*
