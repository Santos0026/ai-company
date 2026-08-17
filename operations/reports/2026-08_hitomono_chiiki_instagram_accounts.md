# 「ヒトモノチイキ」名義 Instagramアカウント調査

**作成**: 2026-08-17 by Hana（SNSリサーチ担当）
**目的**: Instagram上で「ヒトモノチイキ」を名乗るアカウントの洗い出し（自社アカウント確認・なりすまし/類似名の検知）

---

## 1. 「ヒトモノチイキ」を含むアカウント（該当：1件）

| アカウント名（表示名） | ユーザーネーム | URL | 種別 |
|---|---|---|---|
| ヒトモノチイキ-hitomono- | @hitomono_chiiki | https://www.instagram.com/hitomono_chiiki/ | **自社公式**（BUSINESS_OVERVIEW.md 記載と一致） |

**プロフィール概要（検索結果ベース）**
- フォロワー: 約17K / フォロー: 1,113 / 投稿: 34件
- 自己紹介: 地域応援メディア。「地域の中にある物語」を発信し、ヒト・モノの魅力やこだわりを届ける
- 取材依頼: DMで受付（無料取材の告知投稿あり）
- 公式サイト: https://hitomonochiiki.com/ （「暮らしをつなぐ、情報サイト」）

**確認できた投稿例**
- https://www.instagram.com/p/DNAKQTKvquJ/ — 「【ヒトモノチイキとは】ひと・もの・しごとの、やさしい記録。」
- https://www.instagram.com/p/DMMb8fMRmIC/ — 東京都『Poseidon Akasaka』取材回
- https://www.instagram.com/p/DMpNQshvXlX/ — 無料取材依頼の告知
- https://www.instagram.com/p/DPHRJYNkm15/ — 無料取材依頼の告知

---

## 2. 類似名だが**別物**のアカウント（誤認注意）

いずれも「ヒトモノチイキ」ではなく、名前の一部が似ているだけの無関係アカウント。

| アカウント名 | ユーザーネーム | URL | 備考 |
|---|---|---|---|
| エコイート新座/ひとモノショップ | @hitomono.saifuku | https://www.instagram.com/hitomono.saifuku/ | 「hitomono」表記が共通するだけの別事業 |
| ヒトとモノとウツワ | @hitotomonotoutsuwa_ualtd | https://www.instagram.com/hitotomonotoutsuwa_ualtd/ | 器・雑貨系 |
| ヒトトナリ（curry & bar） | @hitotonari_ | https://www.instagram.com/hitotonari_/ | 飲食店 |
| ヒトトナリ｜福岡市 保育園 | @hitotonari_hoiku | https://www.instagram.com/hitotonari_hoiku/ | 保育・発達支援 |
| ヒトコム｜人材派遣会社 | @hitocom_official1 | https://www.instagram.com/hitocom_official1/ | 人材派遣 |
| HITOKIWA（ひときわ）公式 | @hitokiwa0003 | https://www.instagram.com/hitokiwa0003/ | 別ブランド |

---

## 3. 結論

- **Instagram上で「ヒトモノチイキ」を名乗るアカウントは @hitomono_chiiki の1件のみ**。
- 地域別サブアカウント（例: 大阪版・福岡版）や姉妹アカウントは、公開Web検索の範囲では**存在を確認できず**。
- 現時点で**なりすまし・類似名の便乗アカウントは検出されなかった**。

---

## 4. 調査手法と制約（重要）

- 手法: 公開Web検索（アカウント名・ユーザーネーム・地域名・表記ゆれの組み合わせで計10クエリ）
- **制約**: 本実行環境のネットワークプロキシにより `instagram.com` / `hitomonochiiki.com` / `linktr.ee` への直接アクセスがブロックされたため、**Instagramアプリ内検索による網羅確認は未実施**。数値（フォロワー等）は検索結果スニペット由来で、実値と差異がある可能性あり。
- 推奨: Instagramアプリで「ヒトモノチイキ」「hitomono」をアカウント検索し、本レポートの1件のみであることを目視確認する（月次で再チェック推奨）。

---

## 5. 付随して見つかった要注意情報

Yahoo!知恵袋に「ヒトモノチイキという情報サイトは詐欺ですか？店舗の無料掲載ができると言われLINE追加したら未認証アカウントでした」という質問が投稿されている。

- URL: https://detail.chiebukuro.yahoo.co.jp/qa/question_detail/q14320155249
- **論点**: 公式LINEが「未認証アカウント」であることが不信感の直接原因になっている。
- **提案**: 公式LINEの認証済アカウント化、およびInstagramプロフィール／初回DMでの「運営者・サイトURL・認証状況」の明示。Kai（DM）・Mio（BO品質管理）と連携して初回接触文面を点検すべき。
