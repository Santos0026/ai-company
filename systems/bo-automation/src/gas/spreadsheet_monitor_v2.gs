/**
 * BO自動化システム - Google Apps Script v2
 *
 * 【2スプレッドシート構成】
 *
 * ①CMS（書き込み可）
 *   ID: 1AikGKgQH2UtB2Mv3A7NMhQqwH5IEvSD0s_Fu7CyMSlE
 *   シート: SCFG_CMS_ver1
 *   P列: インタビュー日
 *   Q列: インタビュー時間
 *   → インタビュー日から4営業日後になった全顧客を後確対象にする
 *
 * ②FPスプシ（閲覧のみ）
 *   ID: 1WzdME3BEqFkwHPxGETkkbXR4wzI4YX0dSw-4zNqB2xw
 *   シート: マッチング待ち
 *   F列: 姓, G列: 名, H列: 姓フリガナ, I列: 名フリガナ
 *   R列: 連絡状況（背景色で判定）
 *     白:  マッチング待ち（FP連絡済みだが顧客が未反応）
 *     黄色: マッチング完了
 *     赤色: 面談意思なし
 *     緑色: 意思確認が不安
 *
 * 【後確フロー】
 * 4営業日後になった顧客を全員抽出
 * → FPスプシのR列の色を確認
 * → 色に応じてBOへの通知メッセージとLINE送信内容を切り替える
 */

// ── 設定 ──────────────────────────────────────────
const CMS_SPREADSHEET_ID = '1AikGKgQH2UtB2Mv3A7NMhQqwH5IEvSD0s_Fu7CyMSlE';
const FP_SPREADSHEET_ID  = '1WzdME3BEqFkwHPxGETkkbXR4wzI4YX0dSw-4zNqB2xw';
const N8N_WEBHOOK_URL    = 'https://scfg2026.app.n8n.cloud/webhook/gas-followup';
const DASHBOARD_URL      = 'https://santos0026.github.io/ai-company/bo-dashboard.html';

// R列の背景色 → ステータスマッピング
// ※実際の色コードはスプシを目視で確認後に微調整
const COLOR_STATUS_MAP = {
  WHITE:  { status: 'white',  label: '⬜ マッチング待ち（白）',  bo_action: 'LINE後追い必要' },
  YELLOW: { status: 'yellow', label: '🟡 マッチング完了（黄）',  bo_action: '面談日程を確認' },
  RED:    { status: 'red',    label: '🔴 面談意思なし（赤）',   bo_action: '対応確認が必要' },
  GREEN:  { status: 'green',  label: '🟢 意思確認が不安（緑）', bo_action: '丁寧なフォロー' },
};

// 色判定のしきい値（RGB値の範囲で判定）
function getColorStatus(hexColor) {
  if (!hexColor || hexColor === '#ffffff' || hexColor === 'white' || hexColor === null) {
    return 'white';
  }
  const h = hexColor.replace('#', '').toLowerCase();
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);

  // 黄色判定: R高・G高・B低
  if (r > 200 && g > 200 && b < 100) return 'yellow';
  // 赤色判定: R高・G低・B低
  if (r > 200 && g < 100 && b < 100) return 'red';
  // 緑色判定: R低・G高・B低
  if (r < 100 && g > 150 && b < 100) return 'green';

  return 'white'; // 判定できない場合はwhiteとして扱う
}

// ── メイン処理 ───────────────────────────────────────

/**
 * 【毎朝9時実行】4営業日後の顧客をリストアップしてn8nに送信
 * トリガー: 時間ベース → 毎日 9:00〜10:00
 */
function dailyFollowUpCheck() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // ── CMSから対象顧客を抽出 ──
  const cmsSheet = SpreadsheetApp.openById(CMS_SPREADSHEET_ID)
    .getSheetByName('SCFG_CMS_ver1');
  const cmsData = cmsSheet.getDataRange().getValues();

  const targets = [];

  for (let i = 1; i < cmsData.length; i++) {
    const row = cmsData[i];
    const hitmono_id = String(row[0]).trim();  // A列
    const interviewDateRaw = row[15];           // P列（index 15）
    const interviewTimeRaw = String(row[16] || '').trim(); // Q列

    if (!hitmono_id || !interviewDateRaw) continue;

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
      hitomono_id: hitmono_id,
      interview_date_fmt: formatDate(interviewDate),
      interview_time: interviewTimeRaw,
      cms_row: i + 1,
    });
  }

  if (targets.length === 0) {
    Logger.log('本日の後確対象者なし');
    return;
  }

  // ── FPスプシから状態を取得 ──
  const fpSheet = SpreadsheetApp.openById(FP_SPREADSHEET_ID)
    .getSheetByName('マッチング待ち');
  const fpData = fpSheet.getDataRange().getValues();
  const fpRange = fpSheet.getDataRange();
  // R列のbackgroundcolorを取得（index 17 = R列）
  const fpBgColors = fpSheet.getRange(1, 18, fpRange.getNumRows(), 1).getBackgrounds();

  // FPデータをヒトモノ番号でインデックス化
  // ※FPスプシのどの列にヒトモノ番号があるかを確認して調整
  // 暫定: A列（index 0）にヒトモノ番号
  const fpIndex = {};
  for (let i = 1; i < fpData.length; i++) {
    const fpId = String(fpData[i][0]).trim();
    if (!fpId) continue;
    const lastName  = String(fpData[i][5] || '').trim(); // F列
    const firstName = String(fpData[i][6] || '').trim(); // G列
    const lastKana  = String(fpData[i][7] || '').trim(); // H列
    const firstKana = String(fpData[i][8] || '').trim(); // I列
    const rColor    = fpBgColors[i][0];                  // R列の背景色
    const colorStatus = getColorStatus(rColor);

    fpIndex[fpId] = {
      lastName, firstName, lastKana, firstKana,
      rColor, colorStatus,
      statusInfo: COLOR_STATUS_MAP[colorStatus.toUpperCase()] || COLOR_STATUS_MAP.WHITE
    };
  }

  // ── 対象顧客にFP情報を付加 ──
  const followUpList = targets.map(t => {
    const fp = fpIndex[t.hitomono_id] || {
      lastName: '', firstName: '', lastKana: '', firstKana: '',
      colorStatus: 'white',
      statusInfo: COLOR_STATUS_MAP.WHITE
    };

    return {
      ...t,
      fp_last_name:  fp.lastName,
      fp_first_name: fp.firstName,
      fp_last_kana:  fp.lastKana,
      fp_first_kana: fp.firstKana,
      fp_color_status: fp.colorStatus,
      fp_status_label: fp.statusInfo.label,
      fp_bo_action:    fp.statusInfo.bo_action,
    };
  });

  const dateStr = Utilities.formatDate(today, 'Asia/Tokyo', 'M月d日(EEE)');

  sendToN8n({
    event: 'daily_followup_list',
    date: dateStr,
    count: followUpList.length,
    list: followUpList,
    dashboard_url: DASHBOARD_URL,
  });

  Logger.log(`後確リスト送信完了: ${followUpList.length}件`);
}

// ── ユーティリティ ────────────────────────────────────

const HOLIDAYS_2026 = [
  '2026/01/01','2026/01/12','2026/02/11','2026/02/23','2026/03/20',
  '2026/04/29','2026/05/03','2026/05/04','2026/05/05','2026/05/06',
  '2026/07/20','2026/08/11','2026/09/21','2026/09/22','2026/09/23',
  '2026/10/12','2026/11/03','2026/11/23',
];

function addBusinessDays(date, days) {
  let count = 0;
  let current = new Date(date);
  while (count < days) {
    current.setDate(current.getDate() + 1);
    const dow = current.getDay();
    const ds  = Utilities.formatDate(current, 'Asia/Tokyo', 'yyyy/MM/dd');
    if (dow !== 0 && dow !== 6 && !HOLIDAYS_2026.includes(ds)) count++;
  }
  return current;
}

function formatDate(date) {
  return Utilities.formatDate(date, 'Asia/Tokyo', 'M月d日(EEE)');
}

function sendToN8n(payload) {
  const options = {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload),
    muteHttpExceptions: true,
  };
  try {
    const res = UrlFetchApp.fetch(N8N_WEBHOOK_URL, options);
    Logger.log('n8n応答: ' + res.getResponseCode());
  } catch (e) {
    Logger.log('n8n送信エラー: ' + e.toString());
  }
}

/**
 * 【手動テスト用】今日の後確リストをテスト実行
 * Apps Scriptエディタから手動実行して動作確認する
 */
function testRun() {
  Logger.log('テスト実行開始...');
  dailyFollowUpCheck();
  Logger.log('完了');
}
