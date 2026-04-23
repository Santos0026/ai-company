/**
 * BO自動化システム - Google Apps Script v3（最終版）
 *
 * 【構成】
 * CMS（書き込み可・GAS設置場所）
 *   ID: 1AikGKgQH2UtB2Mv3A7NMhQqwH5IEvSD0s_Fu7CyMSlE
 *   シート: SCFG_CMS_ver1
 *   C列: 顧客ID（ヒトモノ番号）
 *   D列: 顧客名（漢字）
 *   E列: フリガナ
 *   P列: インタビュー日（2行目から）
 *   Q列: インタビュー時間
 *
 * FPスプシ（閲覧のみ・GAS不可・CMS側のGASが読み取りのみ）
 *   ID: 1WzdME3BEqFkwHPxGETkkbXR4wzI4YX0dSw-4zNqB2xw
 *   シート: マッチング待ち（2行目からデータ）
 *   F列: 姓, G列: 名, H列: 姓フリガナ, I列: 名フリガナ
 *   R列: 連絡状況（背景色）
 *     白（無色）= マッチング待ち → BOがLINEで後追い【アクション対象】
 *     黄・赤・緑 = 対応済み・意思確認中 → スキップ（何もしない）
 */

const CMS_SS_ID = '1AikGKgQH2UtB2Mv3A7NMhQqwH5IEvSD0s_Fu7CyMSlE';
const FP_SS_ID  = '1WzdME3BEqFkwHPxGETkkbXR4wzI4YX0dSw-4zNqB2xw';
const N8N_URL   = 'https://scfg2026.app.n8n.cloud/webhook/gas-followup';
const DASH_URL  = 'https://santos0026.github.io/ai-company/bo-dashboard.html';

const HOLIDAYS_2026 = [
  '2026/01/01','2026/01/12','2026/02/11','2026/02/23','2026/03/20',
  '2026/04/29','2026/05/03','2026/05/04','2026/05/05','2026/05/06',
  '2026/07/20','2026/08/11','2026/09/21','2026/09/22','2026/09/23',
  '2026/10/12','2026/11/03','2026/11/23',
];

/**
 * 【毎朝9時実行】
 * ①CMSからインタビュー4営業日後の顧客を抽出
 * ②FPスプシの「マッチング待ち」シートのR列を確認
 * ③白色（無色）の顧客だけをBOへ通知
 * トリガー: 時間ベース → 毎日 9:00〜10:00
 */
function dailyFollowUpCheck() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // ── STEP1: CMSから4営業日後の顧客を抽出 ──────────────
  const cmsSheet = SpreadsheetApp.openById(CMS_SS_ID)
    .getSheetByName('SCFG_CMS_ver1');
  const cmsData = cmsSheet.getDataRange().getValues();

  const targets = [];

  for (let i = 1; i < cmsData.length; i++) { // 2行目から（i=1）
    const row = cmsData[i];
    const hitomono_id      = String(row[2] || '').trim();  // C列
    const customer_name    = String(row[3] || '').trim();  // D列：顧客名
    const customer_kana    = String(row[4] || '').trim();  // E列：フリガナ
    const interviewDateRaw = row[15];                       // P列：インタビュー日
    const interviewTime    = String(row[16] || '').trim(); // Q列：インタビュー時間

    if (!hitomono_id || !interviewDateRaw) continue;

    let interviewDate;
    try {
      interviewDate = new Date(interviewDateRaw);
      interviewDate.setHours(0, 0, 0, 0);
      if (isNaN(interviewDate.getTime())) continue;
    } catch (e) { continue; }

    const followUpDate = addBusinessDays(interviewDate, 4);
    followUpDate.setHours(0, 0, 0, 0);

    if (followUpDate.getTime() !== today.getTime()) continue;

    targets.push({
      hitomono_id,
      customer_name,
      customer_kana,
      interview_date: fmtDate(interviewDate),
      interview_time: interviewTime,
    });
  }

  if (targets.length === 0) {
    Logger.log('本日の後確対象者なし');
    return;
  }

  // ── STEP2: FPスプシから「白色のみ」のリストを取得 ──────
  const fpSheet = SpreadsheetApp.openById(FP_SS_ID)
    .getSheetByName('マッチング待ち');
  const lastRow = fpSheet.getLastRow();

  if (lastRow < 2) {
    Logger.log('FPスプシにデータなし');
    return;
  }

  const fpNameData = fpSheet.getRange(2, 6, lastRow - 1, 4).getValues(); // F〜I列（2行目から）
  const fpColorData = fpSheet.getRange(2, 18, lastRow - 1, 1).getBackgrounds(); // R列の背景色

  // 白色（無色）の行だけを抽出してインデックス化
  const whiteSet = new Set(); // key: "フリガナ（スペースなし・カタカナ）"
  const whiteNameSet = new Set(); // key: "漢字フルネーム"

  for (let i = 0; i < fpNameData.length; i++) {
    const bg = fpColorData[i][0];
    if (!isWhite(bg)) continue; // 白以外はスキップ

    const lastName  = String(fpNameData[i][0] || '').trim(); // F列
    const firstName = String(fpNameData[i][1] || '').trim(); // G列
    const lastKana  = String(fpNameData[i][2] || '').trim(); // H列
    const firstKana = String(fpNameData[i][3] || '').trim(); // I列

    const kanaKey = (lastKana + firstKana).replace(/\s+/g, '');
    const nameKey = (lastName + firstName).replace(/\s+/g, '');

    if (kanaKey) whiteSet.add(kanaKey);
    if (nameKey) whiteNameSet.add(nameKey);
  }

  // ── STEP3: 白色に一致する顧客だけを絞り込む ────────────
  const actionList = [];

  for (const t of targets) {
    const kanaKey = t.customer_kana.replace(/\s+/g, '');
    const nameKey = t.customer_name.replace(/\s+/g, '');

    const inWhiteList = whiteSet.has(kanaKey) || whiteNameSet.has(nameKey);

    if (inWhiteList) {
      actionList.push(t); // 白色に一致 → BOがLINEで後追いする
    } else {
      Logger.log(`スキップ（白色リストに未一致）: ${t.hitomono_id} ${t.customer_name}`);
    }
  }

  if (actionList.length === 0) {
    Logger.log('白色リスト該当者なし（全員対応済みまたは未照合）');
    // それでも後確対象者をBOに知らせる（参考情報として）
    sendToN8n({
      event: 'daily_followup_list',
      date: fmtDate(today),
      count: 0,
      action_count: 0,
      list: [],
      note: `本日の後確対象: ${targets.length}件 / うち白色該当: 0件（全員対応済みの可能性）`,
      dashboard_url: DASH_URL,
    });
    return;
  }

  Logger.log(`後確対象: ${targets.length}件 → 白色該当: ${actionList.length}件`);

  sendToN8n({
    event: 'daily_followup_list',
    date: fmtDate(today),
    count: targets.length,
    action_count: actionList.length,
    list: actionList,
    dashboard_url: DASH_URL,
  });
}

// ── ユーティリティ ──────────────────────────────────────

/**
 * 背景色が「白色（無色）」かどうかを判定
 */
function isWhite(colorHex) {
  if (!colorHex) return true;
  const c = colorHex.toLowerCase().replace(/\s/g, '');
  return c === '#ffffff' || c === 'white' || c === '' || c === 'null';
}

/**
 * n営業日後の日付を計算（土日・祝日除く）
 */
function addBusinessDays(date, days) {
  let count = 0;
  let d = new Date(date);
  while (count < days) {
    d.setDate(d.getDate() + 1);
    const dow = d.getDay();
    const ds  = Utilities.formatDate(d, 'Asia/Tokyo', 'yyyy/MM/dd');
    if (dow !== 0 && dow !== 6 && !HOLIDAYS_2026.includes(ds)) count++;
  }
  return d;
}

function fmtDate(date) {
  return Utilities.formatDate(date, 'Asia/Tokyo', 'M月d日(EEE)');
}

function sendToN8n(payload) {
  try {
    UrlFetchApp.fetch(N8N_URL, {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify(payload),
      muteHttpExceptions: true,
    });
    Logger.log('n8n送信完了');
  } catch (e) {
    Logger.log('n8n送信エラー: ' + e);
  }
}

/**
 * 【手動テスト用】Apps Scriptエディタから実行して動作確認
 */
function testRun() {
  Logger.log('=== テスト実行開始 ===');
  dailyFollowUpCheck();
  Logger.log('=== テスト実行完了 ===');
}
