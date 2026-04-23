/**
 * BO自動化システム - Google Apps Script
 * タスカル提供スプレッドシートの「マッチング待ち」シートを監視
 */

// n8nのWebhook URL（後で設定）
const N8N_WEBHOOK_URL = 'https://your-n8n-instance.com/webhook/bo-automation';

// 設定
const CONFIG = {
  // 顧客リストシート（SCFG_CMS_ver1）
  CUSTOMER_SHEET_NAME: 'SCFG_CMS_ver1',
  COL_HITOMONO_ID: 1,    // A列：ヒトモノ番号
  COL_INTERVIEW_DATE: 16, // P列：インタビュー日
  COL_INTERVIEW_TIME: 17, // Q列：インタビュー時間

  // マッチング待ちシート（タスカル）
  MATCHING_SHEET_NAME: 'マッチング待ち',
  COL_LAST_NAME: 6,       // F列：氏（姓）
  COL_FIRST_NAME: 7,      // G列：名
  COL_LAST_KANA: 8,       // H列：フリガナ（姓）
  COL_FIRST_KANA: 9,      // I列：フリガナ（名）
  COL_APPOINTMENT: 41,    // AO列：面談確定日

  // 4営業日後に後確
  FOLLOWUP_BUSINESS_DAYS: 4,
};

/**
 * スプレッドシートが編集された時に実行
 * AO列（面談確定日）の変更を検知してn8nに通知
 */
function onEdit(e) {
  const sheet = e.source.getActiveSheet();
  if (sheet.getName() !== CONFIG.SHEET_NAME) return;

  const col = e.range.getColumn();
  if (col !== CONFIG.APPOINTMENT_COL) return;

  const row = e.range.getRow();
  if (row <= 1) return; // ヘッダー行はスキップ

  const rowData = sheet.getRange(row, 1, 1, 50).getValues()[0];
  const appointmentDate = e.value; // 新しい面談日時
  const previousDate = e.oldValue; // 変更前の日時

  const payload = {
    event: appointmentDate && !previousDate ? 'appointment_set' : 'appointment_updated',
    hitomono_id: rowData[CONFIG.COL_HITOMONO_ID - 1],
    last_name: rowData[CONFIG.COL_LAST_NAME - 1],
    first_name: rowData[CONFIG.COL_FIRST_NAME - 1],
    last_name_kana: rowData[CONFIG.COL_LAST_KANA - 1],
    first_name_kana: rowData[CONFIG.COL_FIRST_KANA - 1],
    appointment_date: appointmentDate,
    previous_date: previousDate || null,
    row_number: row,
    timestamp: new Date().toISOString(),
  };

  sendToN8n(payload);
}

/**
 * 毎朝9時に実行：本日後確が必要なリストをBOに通知
 * トリガー設定：時間ベース → 毎日 9:00〜10:00
 *
 * 処理内容：
 * 1. SCFG_CMS_ver1シートからインタビュー日（P列）を取得
 * 2. 4営業日後 = 本日の顧客をリストアップ
 * 3. マッチング待ちシートと照合してFP進捗を付加
 * 4. n8nにWebhookで送信（n8nがLINEでBOに通知）
 */
function dailyFollowUpCheck() {
  const ss = SpreadsheetApp.openById('1AikGKgQH2UtB2Mv3A7NMhQqwH5IEvSD0s_Fu7CyMSlE');

  // 顧客リストシートを取得
  const customerSheet = ss.getSheetByName(CONFIG.CUSTOMER_SHEET_NAME);
  const customerData = customerSheet.getDataRange().getValues();

  // マッチング待ちシートを取得（FP進捗確認用）
  const matchingSheet = ss.getSheetByName(CONFIG.MATCHING_SHEET_NAME);
  const matchingData = matchingSheet.getDataRange().getValues();

  const today = new Date();
  const followUpList = [];

  // 顧客リストをスキャン（2行目から）
  for (let i = 1; i < customerData.length; i++) {
    const row = customerData[i];
    const hitmono_id = String(row[CONFIG.COL_HITOMONO_ID - 1]).trim();
    const interviewDateRaw = row[CONFIG.COL_INTERVIEW_DATE - 1];
    const interviewTimeRaw = row[CONFIG.COL_INTERVIEW_TIME - 1];

    if (!hitmono_id || !interviewDateRaw) continue;

    // インタビュー日のパース
    let interviewDate;
    try {
      interviewDate = new Date(interviewDateRaw);
      if (isNaN(interviewDate.getTime())) continue;
    } catch (e) {
      continue;
    }

    // 4営業日後を計算
    const followUpDate = addBusinessDays(interviewDate, CONFIG.FOLLOWUP_BUSINESS_DAYS);

    if (!isSameDay(followUpDate, today)) continue;

    // マッチング待ちシートからFP進捗を取得
    const fpInfo = getFpInfo(matchingData, hitmono_id);

    followUpList.push({
      hitomono_id: hitmono_id,
      interview_date: Utilities.formatDate(interviewDate, 'Asia/Tokyo', 'yyyy/MM/dd'),
      interview_time: interviewTimeRaw || '',
      fp_last_name: fpInfo.lastName,
      fp_first_name: fpInfo.firstName,
      fp_last_kana: fpInfo.lastKana,
      fp_first_kana: fpInfo.firstKana,
      fp_appointment_date: fpInfo.appointmentDate,
      fp_status: fpInfo.status, // 'confirmed' / 'waiting' / 'not_contacted' / 'unknown'
      row_number: i + 1,
    });
  }

  if (followUpList.length === 0) {
    Logger.log('本日の後確対象者なし');
    return;
  }

  sendToN8n({
    event: 'daily_followup_list',
    date: Utilities.formatDate(today, 'Asia/Tokyo', 'yyyy/MM/dd'),
    count: followUpList.length,
    list: followUpList,
  });

  Logger.log(`後確リスト送信完了: ${followUpList.length}件`);
}

/**
 * マッチング待ちシートからヒトモノ番号に対応するFP情報を取得
 */
function getFpInfo(matchingData, hitomono_id) {
  for (let i = 1; i < matchingData.length; i++) {
    const row = matchingData[i];
    // ヒトモノ番号がどの列かはスプシ確認後に調整
    // 暫定：A列（index 0）にIDが入っていると仮定
    const rowId = String(row[0]).trim();
    if (rowId !== hitomono_id) continue;

    const lastName = row[CONFIG.COL_LAST_NAME - 1] || '';
    const firstName = row[CONFIG.COL_FIRST_NAME - 1] || '';
    const lastKana = row[CONFIG.COL_LAST_KANA - 1] || '';
    const firstKana = row[CONFIG.COL_FIRST_KANA - 1] || '';
    const appointmentDate = row[CONFIG.COL_APPOINTMENT - 1] || '';

    let status = 'waiting';
    if (appointmentDate) {
      status = 'confirmed';
    } else if (!lastName && !firstName) {
      status = 'not_contacted';
    }

    return { lastName, firstName, lastKana, firstKana, appointmentDate, status };
  }

  return {
    lastName: '', firstName: '', lastKana: '', firstKana: '',
    appointmentDate: '', status: 'unknown'
  };
}

/**
 * n日後のリマインダーチェック（毎日実行）
 * 返信なし → 4日後・8日後を自動検知
 */
function reminderCheck() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet()
    .getSheetByName(CONFIG.SHEET_NAME);
  // 実装：BOがワンタップ入力した「後確済み日」列から
  // 返信なしの案件を検出してn8nに通知
  // ※列定義が確定後に実装
}

// ─── ユーティリティ ─────────────────────────────

function addBusinessDays(date, days) {
  const HOLIDAYS = getJapanHolidays(); // 祝日リスト
  let count = 0;
  let current = new Date(date);

  while (count < days) {
    current.setDate(current.getDate() + 1);
    const dayOfWeek = current.getDay();
    const dateStr = Utilities.formatDate(current, 'Asia/Tokyo', 'yyyy/MM/dd');

    if (dayOfWeek !== 0 && dayOfWeek !== 6 && !HOLIDAYS.includes(dateStr)) {
      count++;
    }
  }
  return current;
}

function isSameDay(date1, date2) {
  return date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate();
}

function getJapanHolidays() {
  // 2026年の日本の祝日リスト（毎年更新が必要）
  return [
    '2026/01/01', '2026/01/12', '2026/02/11', '2026/02/23',
    '2026/03/20', '2026/04/29', '2026/05/03', '2026/05/04',
    '2026/05/05', '2026/05/06', '2026/07/20', '2026/08/11',
    '2026/09/21', '2026/09/22', '2026/09/23', '2026/10/12',
    '2026/11/03', '2026/11/23',
  ];
}

function sendToN8n(payload) {
  const options = {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload),
    muteHttpExceptions: true,
  };

  try {
    UrlFetchApp.fetch(N8N_WEBHOOK_URL, options);
  } catch (e) {
    Logger.log('n8n送信エラー: ' + e.toString());
  }
}

// ※ getInterviewDateCol()は不要になりました
// P列（index 15）= CONFIG.COL_INTERVIEW_DATE - 1 を直接使用
