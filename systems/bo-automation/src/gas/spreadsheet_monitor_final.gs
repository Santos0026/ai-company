/**
 * BO自動化システム - Google Apps Script（最終版）
 * スプレッドシートID: 1AikGKgQH2UtB2Mv3A7NMhQqwH5IEvSD0s_Fu7CyMSlE
 * シート: SCFG_CMS_ver1（P列:インタビュー日, Q列:インタビュー時間）
 * シート: マッチング待ち（F/G列:氏名, H/I列:フリガナ, AO列:面談確定日）
 */

const N8N_WEBHOOK_URL = 'https://scfg2026.app.n8n.cloud/webhook/gas-followup';
const SPREADSHEET_ID = '1AikGKgQH2UtB2Mv3A7NMhQqwH5IEvSD0s_Fu7CyMSlE';
const DASHBOARD_URL = 'https://santos0026.github.io/ai-company/bo-dashboard.html';

// 日本の祝日2026
const HOLIDAYS_2026 = [
  '2026/01/01','2026/01/12','2026/02/11','2026/02/23','2026/03/20',
  '2026/04/29','2026/05/03','2026/05/04','2026/05/05','2026/05/06',
  '2026/07/20','2026/08/11','2026/09/21','2026/09/22','2026/09/23',
  '2026/10/12','2026/11/03','2026/11/23'
];

/**
 * 【毎朝9時に実行】後確が必要な顧客リストをn8nに送る
 * トリガー: 時間ベース → 毎日 9:00〜10:00
 */
function dailyFollowUpCheck() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const customerSheet = ss.getSheetByName('SCFG_CMS_ver1');
  const matchingSheet = ss.getSheetByName('マッチング待ち');

  const customerData = customerSheet.getDataRange().getValues();
  const matchingData = matchingSheet.getDataRange().getValues();

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const followUpList = [];

  for (let i = 1; i < customerData.length; i++) {
    const row = customerData[i];
    const hitmono_id = String(row[0]).trim(); // A列
    const interviewDateRaw = row[15]; // P列（index 15）
    const interviewTimeRaw = row[16]; // Q列（index 16）

    if (!hitmono_id || !interviewDateRaw) continue;

    let interviewDate;
    try {
      interviewDate = new Date(interviewDateRaw);
      interviewDate.setHours(0, 0, 0, 0);
      if (isNaN(interviewDate.getTime())) continue;
    } catch (e) { continue; }

    // 4営業日後を計算
    const followUpDate = addBusinessDays(interviewDate, 4);
    followUpDate.setHours(0, 0, 0, 0);

    if (followUpDate.getTime() !== today.getTime()) continue;

    // マッチング待ちシートからFP進捗を取得
    const fp = getFpInfoById(matchingData, hitmono_id);

    followUpList.push({
      hitomono_id: hitmono_id,
      interview_date: Utilities.formatDate(interviewDate, 'Asia/Tokyo', 'M月d日'),
      interview_time: interviewTimeRaw || '',
      fp_last_name: fp.lastName,
      fp_first_name: fp.firstName,
      fp_last_kana: fp.lastKana,
      fp_first_kana: fp.firstKana,
      fp_appointment_date: fp.appointmentDate,
      fp_status: fp.status,
      fp_status_label: fp.statusLabel,
      row_number: i + 1
    });
  }

  const dateStr = Utilities.formatDate(today, 'Asia/Tokyo', 'M月d日(EEE)');
  const dashboardUrl = DASHBOARD_URL;

  sendToN8n({
    event: 'daily_followup_list',
    date: dateStr,
    count: followUpList.length,
    list: followUpList,
    dashboard_url: dashboardUrl
  });

  Logger.log(`後確リスト送信: ${followUpList.length}件`);
}

/**
 * マッチング待ちシートからIDに対応するFP情報を取得
 */
function getFpInfoById(matchingData, hitomono_id) {
  // マッチング待ちシートのIDがどの列かを確認して調整
  // 現在の実装: A列（index 0）にヒトモノ番号があると仮定
  for (let i = 1; i < matchingData.length; i++) {
    const row = matchingData[i];
    const rowId = String(row[0]).trim();
    if (rowId !== hitomono_id) continue;

    const lastName = String(row[5] || '').trim();    // F列
    const firstName = String(row[6] || '').trim();   // G列
    const lastKana = String(row[7] || '').trim();    // H列
    const firstKana = String(row[8] || '').trim();   // I列
    const appointmentDate = row[40] || '';            // AO列

    let status, statusLabel;
    if (appointmentDate) {
      status = 'confirmed';
      const d = new Date(appointmentDate);
      statusLabel = '✅ 面談確定: ' + Utilities.formatDate(d, 'Asia/Tokyo', 'M月d日 HH:mm');
    } else if (lastName || firstName) {
      status = 'waiting';
      statusLabel = '⏳ マッチング済み・連絡待ち';
    } else {
      status = 'not_contacted';
      statusLabel = '❌ FP未連絡';
    }

    return { lastName, firstName, lastKana, firstKana, appointmentDate, status, statusLabel };
  }

  return {
    lastName: '', firstName: '', lastKana: '', firstKana: '',
    appointmentDate: '', status: 'unknown', statusLabel: '⚠️ 要確認'
  };
}

/**
 * n営業日後の日付を返す（土日・祝日除く）
 */
function addBusinessDays(date, days) {
  let count = 0;
  let current = new Date(date);
  while (count < days) {
    current.setDate(current.getDate() + 1);
    const dow = current.getDay();
    const ds = Utilities.formatDate(current, 'Asia/Tokyo', 'yyyy/MM/dd');
    if (dow !== 0 && dow !== 6 && !HOLIDAYS_2026.includes(ds)) {
      count++;
    }
  }
  return current;
}

/**
 * n8nのWebhookにデータを送信
 */
function sendToN8n(payload) {
  const options = {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };
  try {
    const response = UrlFetchApp.fetch(N8N_WEBHOOK_URL, options);
    Logger.log('n8n応答: ' + response.getResponseCode());
  } catch (e) {
    Logger.log('n8n送信エラー: ' + e.toString());
  }
}

/**
 * 【手動実行用】今日の後確リストをテスト送信
 */
function testFollowUpCheck() {
  Logger.log('テスト実行開始...');
  dailyFollowUpCheck();
  Logger.log('テスト実行完了');
}
