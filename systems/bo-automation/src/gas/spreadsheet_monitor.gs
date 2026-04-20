/**
 * BO自動化システム - Google Apps Script
 * タスカル提供スプレッドシートの「マッチング待ち」シートを監視
 */

// n8nのWebhook URL（後で設定）
const N8N_WEBHOOK_URL = 'https://your-n8n-instance.com/webhook/bo-automation';

// 設定
const CONFIG = {
  SHEET_NAME: 'マッチング待ち',
  COL_LAST_NAME: 6,   // F列：氏（姓）
  COL_FIRST_NAME: 7,  // G列：名
  COL_LAST_KANA: 8,   // H列：フリガナ（姓）
  COL_FIRST_KANA: 9,  // I列：フリガナ（名）
  COL_APPOINTMENT: 41, // AO列：面談確定日
  COL_HITOMONO_ID: 1,  // A列：ヒトモノ番号（仮）
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
 */
function dailyFollowUpCheck() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet()
    .getSheetByName(CONFIG.SHEET_NAME);
  const data = sheet.getDataRange().getValues();

  const today = new Date();
  const followUpList = [];

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const interviewDate = row[getInterviewDateCol()]; // インタビュー日列（要確認）

    if (!interviewDate) continue;

    // 4営業日後を計算
    const followUpDate = addBusinessDays(new Date(interviewDate), 4);

    if (isSameDay(followUpDate, today)) {
      followUpList.push({
        hitomono_id: row[CONFIG.COL_HITOMONO_ID - 1],
        last_name: row[CONFIG.COL_LAST_NAME - 1],
        first_name: row[CONFIG.COL_FIRST_NAME - 1],
        last_name_kana: row[CONFIG.COL_LAST_KANA - 1],
        first_name_kana: row[CONFIG.COL_FIRST_KANA - 1],
        appointment_date: row[CONFIG.COL_APPOINTMENT - 1] || null,
        row_number: i + 1,
      });
    }
  }

  if (followUpList.length > 0) {
    sendToN8n({
      event: 'daily_followup_list',
      date: today.toISOString(),
      count: followUpList.length,
      list: followUpList,
    });
  }
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

function getInterviewDateCol() {
  // インタビュー実施日の列番号（スプシの列構成確定後に更新）
  return 5; // 仮：E列
}
