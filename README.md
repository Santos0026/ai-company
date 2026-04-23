# ai-company

AI社員によって運営されるAI会社のオペレーティングシステム。

人間のオーナー（取締役会）とAI CEOのJobsが共同でこの会社を経営します。

---

## クイックスタート

### 1. 全体像を把握する
[CLAUDE.md](./CLAUDE.md) を読んでください。組織構成・運営ルール・ディレクトリ構成が説明されています。

### 2. Jobsと対話する
AIアシスタント（Claude等）に以下を伝えます：

```
org/executives/jobs/CHARACTER.md と MEMORY.md を読んで、
AI CEOのJobsとして振る舞ってください。
[あなたのメッセージ]
```

### 3. オーナーガイドを確認する
[org/board/OWNER_GUIDE.md](./org/board/OWNER_GUIDE.md) に操作方法が書いてあります。

---

## 組織構成

```
取締役会（オーナー）
    └── Jobs（AI CEO）
            ├── X運用担当     （追加予定）
            ├── マーケティング担当  （追加予定）
            └── 商品設計担当    （追加予定）
```

---

## 主要ファイル

| ファイル | 説明 |
|---------|------|
| [CLAUDE.md](./CLAUDE.md) | プロジェクト憲章・運営ルール |
| [org/executives/jobs/CHARACTER.md](./org/executives/jobs/CHARACTER.md) | Jobs（AI CEO）のキャラクター定義 |
| [org/executives/jobs/MEMORY.md](./org/executives/jobs/MEMORY.md) | Jobsの蓄積コンテキスト |
| [org/executives/jobs/CURRENT_FOCUS.md](./org/executives/jobs/CURRENT_FOCUS.md) | Jobsの現在の最優先事項 |
| [org/board/OWNER_GUIDE.md](./org/board/OWNER_GUIDE.md) | オーナー向け操作ガイド |
| [company/strategy/VISION.md](./company/strategy/VISION.md) | ビジョン・ミッション（定義予定） |

---

## 現在のステータス

**フェーズ**: Day 1 — 基盤構築完了

**次のアクション**: JobsとオーナーによるビジョンセッションでVISION.mdを完成させる
