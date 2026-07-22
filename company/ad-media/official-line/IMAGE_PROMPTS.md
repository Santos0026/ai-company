# 案件カード 画像生成プロンプト＆レイアウト指示

**用途**: エルメのカルーセル案件カード用の画像を、AI生成 → Canvaで清書するための素材集。
**画像サイズ**: 1024×678px（比率 1.51:1 ／ Midjourneyは `--ar 3:2`）
**作成**: 2026-07-22

> ポイント：**主役の写真/イラストはAIで生成 → Canvaで「バッジ・ロゴ・オレンジ帯・文字」を重ねる**。
> 4案件すべて同じフォーマットで作ると統一感が出て信頼感につながる。

---

## 使い方（3ステップ）
1. 下のプロンプトをAI画像ツールに貼る（Midjourney / DALL·E / Canva「マジック生成」/ Stable Diffusion）
2. 生成画像から良い1枚を選ぶ（**文字が写り込んでいない・右側に余白がある**ものが理想）
3. Canvaで下の「レイアウト指示」に沿ってバッジ・帯・文字を重ねる

---

## ① C001 就活オンライン面談（メインカード）

### 写真風（推奨・信頼感が出る）
**英語（Midjourney / DALL·E 用）**
```
Photorealistic photo of a cheerful young Japanese university student in their early 20s,
sitting at a bright tidy desk at home, smiling warmly while having an online video interview
on a laptop, wearing clean smart-casual clothes, soft natural window light, minimal cozy room,
shallow depth of field, bright and inviting mood, generous empty copy space on the right,
high quality, photorealistic --ar 3:2 --style raw
```
**除外（Negative / 避けたい要素）**: text, letters, watermark, logo, dark mood, stiff corporate suit, cluttered background

**Canva「マジック生成」用（日本語）**
```
明るく片付いた部屋で、ノートパソコンに向かって笑顔でオンライン面談をする日本の大学生（20代前半）。
ナチュラルな採光、清潔感、右側にコピースペースの余白、写真風、高品質
```

### イラスト風（親しみ重視・ブランドと合わせやすい）
```
Flat vector illustration in a warm orange color palette, a friendly Japanese university student
smiling during an online interview on a laptop at home, simple clean modern shapes,
plenty of empty copy space on the right, cheerful and approachable --ar 3:2
```

---

## ② アンケート回答（5,000円〜）
```
Photorealistic photo of a young Japanese university student smiling while answering a survey
on a smartphone at a bright cafe, casual student outfit, natural light, relaxed mood,
copy space on the right, high quality --ar 3:2 --style raw
```
日本語(Canva)：`明るいカフェでスマホでアンケートに答える笑顔の日本の大学生、自然光、リラックス、右に余白、写真風`

## ③ インタビュー参加（対面/オンライン）
```
Photorealistic photo of a young Japanese university student having a friendly casual interview
with an interviewer at a bright cafe, both smiling and talking, relaxed warm atmosphere,
natural light, copy space, high quality --ar 3:2 --style raw
```
日本語(Canva)：`明るいカフェで和やかにインタビューを受ける笑顔の日本の大学生、対話シーン、自然光、右に余白、写真風`

## ④ アプリモニター（数日利用でOK）
```
Photorealistic close-up photo of a young Japanese student's hands holding and using a smartphone app
at a bright desk, clean modern setting, soft natural light, positive mood, copy space, high quality --ar 3:2 --style raw
```
日本語(Canva)：`明るいデスクでスマホアプリを操作する大学生の手元アップ、清潔感、自然光、右に余白、写真風`

---

## Canva レイアウト指示（全カード共通フォーマット）

キャンバス **1024 × 678px** を作成し、生成画像を全面に配置。その上に以下を重ねる：

```
┌────────────────────────────┐
│ [左上] 白い角丸ピル           [右上] 黄バッジ  │
│  🎓ガクチカ協賛              最大20,000円     │
│                                        │
│         （主役の写真：右側は余白）          │
│                                        │
│ ▁▁▁▁▁ オレンジ帯（下部・高さ約110px）▁▁▁▁▁ │
│  🎯 就活オンライン面談                      │  ← 白・太字
└────────────────────────────┘
```

| 要素 | 指定 |
|------|------|
| 下部オレンジ帯 | 色 `#F57C20`（不透明度85%）／高さ約110px／角丸なし |
| 帯のタイトル文字 | 白・太字・22〜26px（例「🎯 就活オンライン面談」） |
| 右上バッジ | 塗り `#FFC93C`／文字 濃茶 `#5A3D00` 太字／角丸ピル型／例「最大20,000円」 |
| 左上ロゴピル | 白背景／文字オレンジ／「🎓 ガクチカ協賛」小さめ |
| 全体 | 明るさ・清潔感を保つ。文字が読みにくければ画像に薄い暗幕を10%重ねる |

> ※ 説明文（報酬の詳細・ボタン）は**カード画像ではなく、エルメのカルーセル側のテキスト/ボタン欄**に入れる。
> 画像に文字を詰め込みすぎない（タイトル＋バッジ＋ロゴまで）。

---

## 案件ブランドの扱い（重要）
- **「JobPassport（ジョブパス）」は C001 の正式サービス名（提携案件先）**。画像に入れてOK・むしろ正しい。
- 除去が必要なのは、**案件と無関係な文字・透かし**が勝手に入った場合のみ。
  - Midjourney：末尾に `--no watermark, random gibberish text`
  - Canva：不要な文字だけトリミング/上書き

## 割り当てメモ（生成済み素材）
- ノートPCで面談する学生（JobPassport表記あり）→ **C001 就活オンライン面談＝JobPassport案件** ✅
- スマホを操作する学生 → **アプリモニター / アンケート**（smartphone操作）

## コンプラ（Mio観点・画像でも守る）
- 画像内に「必ず稼げる」等の誇大コピーを入れない
- 報酬額は正確に（最大20,000円＝5,000円×4件の条件つき）
- 実在人物と誤認させる加工はしない（モデル/AI生成であること）

---

*次: 画像ができたら Canvaで清書 → エルメのカルーセルに登録 → 送客先URLを紐付け。*
