/**
 * BO自動化システム - Google Apps Script v4（最終確定版）
 *
 * 【確定した構成】
 * CMS（書き込み可）
 *   ID: 1AikGKgQH2UtB2Mv3A7NMhQqwH5IEvSD0s_Fu7CyMSlE
 *   シート名: 顧客リスト
 *   C列: 顧客ID（ヒトモノ番号）
 *   D列: 顧客名
 *   E列: フリガナ
 *   P列: インタビュー日
 *   Q列: インタビュー時間
 *
 * FPスプシ（閲覧のみ）
 *   ID: 1WzdME3BEqFkwHPxGETkkbXR4wzI4YX0dSw-4zNqB2xw
 *   シート名: マッチング待ち
 *   F列: 姓, G列: 名, H列: 姓フリガナ, I列: 名フリガナ
 *   R列: 背景色（白=マッチング待ち、他色=対応済み）
 *
 * 【フロー】
 * GAS（8:55実行）→ 処理結果をCMS「本日の後確」シートに書き込む
 * n8n WF①（9:00実行）→ 「本日の後確」シートを読んでLINE送信
 */

const CMS_ID   = '1AikGKgQH2UtB2Mv3A7NMhQqwH5IEvSD0s_Fu7CyMSlE';
const FP_ID    = '1WzdME3BEqFkwHPxGETkkbXR4wzI4YX0dSw-4zNqB2xw';
const RESULT_SHEET_NAME = '本日の後確'; // GASがここに書き込む → n8nが読む

const HOLIDAYS_2026 = [
  '2026/01/01','2026/01/12','2026/02/11','2026/02/23','2026/03/20',
  '2026/04/29','2026/05/03','2026/05/04','2026/05/05','2026/05/06',
  '2026/07/20','2026/08/11','2026/09/21','2026/09/22','2026/09/23',
  '2026/10/12','2026/11/03','2026/11/23',
];

/**
 * 【毎朝8:55実行】
 * トリガー設定: 時間ベース → 毎日 8:00〜9:00（8:55に実行される）
 *
 * ①CMSの「顧客リスト」からインタビュー4営業日後の顧客を抽出
 * ②FPスプシの「マッチング待ち」でR列が白色の顧客だけ絞り込む
 * ③CMS「本日の後確」シートに結果を書き込む（n8nが9:00に読む）
 */
function prepareFollowUpList() {
  const ss = SpreadsheetApp.openById(CMS_ID);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // ── STEP1: CMSから4営業日後の顧客を抽出 ──
  const cmsSheet = ss.getSheetByName('顧客リスト');
  if (!cmsSheet) {
    Logger.log('ERROR: 「顧客リスト」シートが見つかりません');
    return;
  }

  const cmsData = cmsSheet.getDataRange().getValues();
  const targets = [];

  for (let i = 1; i < cmsData.length; i++) { // 2行目から
    const row = cmsData[i];
    const hitomono_id   = String(row[2] || '').trim();  // C列
    const customer_name = String(row[3] || '').trim();  // D列
    const customer_kana = String(row[4] || '').trim();  // E列
    const interviewDateRaw = row[15];                    // P列
    const interviewTime = String(row[16] || '').trim(); // Q列

    if (!hitomono_id || !interviewDateRaw) continue;

    let intDate;
    try {
      intDate = new Date(interviewDateRaw);
      intDate.setHours(0, 0, 0, 0);
      if (isNaN(intDate.getTime())) continue;
    } catch(e) { continue; }

    const followUpDate = addBusinessDays(intDate, 4);
    followUpDate.setHours(0, 0, 0, 0);
    if (followUpDate.getTime() !== today.getTime()) continue;

    targets.push({ hitomono_id, customer_name, customer_kana, interviewTime,
                   interview_date_fmt: fmtDate(intDate) });
  }

  Logger.log(`4営業日後の対象: ${targets.length}件`);

  // ── STEP2: FPスプシで白色のみ絞り込む ──
  const whiteNames = new Set();
  const whiteKanas = new Set();

  try {
    const fpSheet = SpreadsheetApp.openById(FP_ID)
      .getSheetByName('マッチング待ち');
    const lastRow = fpSheet.getLastRow();

    if (lastRow >= 2) {
      const fpNames  = fpSheet.getRange(2, 6, lastRow - 1, 4).getValues(); // F〜I
      const fpColors = fpSheet.getRange(2, 18, lastRow - 1, 1).getBackgrounds(); // R列

      for (let i = 0; i < fpNames.length; i++) {
        if (!isWhite(fpColors[i][0])) continue; // 白以外スキップ

        const lastName  = String(fpNames[i][0] || '').trim();
        const firstName = String(fpNames[i][1] || '').trim();
        const lastKana  = String(fpNames[i][2] || '').trim();
        const firstKana = String(fpNames[i][3] || '').trim();

        const nameKey = (lastName + firstName).replace(/\s+/g, '');
        const kanaKey = (lastKana + firstKana).replace(/\s+/g, '');
        if (nameKey) whiteNames.add(nameKey);
        if (kanaKey) whiteKanas.add(kanaKey);
      }
    }
    Logger.log(`FPスプシ白色リスト: 名前${whiteNames.size}件・フリガナ${whiteKanas.size}件`);
  } catch(e) {
    Logger.log('FPスプシ読み取りエラー: ' + e.toString());
    Logger.log('→ 全員を後確対象として処理します（フォールバック）');
  }

  // ── STEP3: 白色に一致する顧客だけ絞り込む ──
  const actionList = targets.filter(t => {
    // FPスプシ読み取り失敗時はフォールバック（全員対象）
    if (whiteNames.size === 0 && whiteKanas.size === 0) return true;

    const nameKey = t.customer_name.replace(/\s+/g, '');
    const kanaKey = t.customer_kana.replace(/\s+/g, '');
    return whiteNames.has(nameKey) || whiteKanas.has(kanaKey);
  });

  Logger.log(`後確対象: ${targets.length}件 → 白色該当: ${actionList.length}件`);

  // ── STEP4: CMS「本日の後確」シートに書き込む ──
  let resultSheet = ss.getSheetByName(RESULT_SHEET_NAME);
  if (!resultSheet) {
    resultSheet = ss.insertSheet(RESULT_SHEET_NAME);
  }
  resultSheet.clearContents();

  // ヘッダー行
  resultSheet.getRange(1, 1, 1, 6).setValues([[
    '顧客ID', '顧客名', 'フリガナ', 'インタビュー日', 'インタビュー時間', '処理日'
  ]]);

  if (actionList.length === 0) {
    // 対象なしでも日付だけ記録
    resultSheet.getRange(2, 1, 1, 6).setValues([[
      'なし', '本日の後確対象者はいません', '', fmtDate(today), '', fmtDate(today)
    ]]);
    Logger.log('後確対象者なし → 「本日の後確」シートに記録完了');
    return;
  }

  const rows = actionList.map(c => [
    c.hitomono_id,
    c.customer_name,
    c.customer_kana,
    c.interview_date_fmt,
    c.interviewTime,
    fmtDate(today)
  ]);

  resultSheet.getRange(2, 1, rows.length, 6).setValues(rows);
  Logger.log(`「本日の後確」シートに${actionList.length}件を書き込み完了`);
}

// ── ユーティリティ ──────────────────────────────────────

function isWhite(color) {
  if (!color) return true;
  const c = color.toLowerCase().replace(/\s/g, '');
  return c === '#ffffff' || c === 'white' || c === '';
}

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

/**
 * 【手動テスト用】Apps Scriptエディタから実行して動作確認
 * 実行後、CMSに「本日の後確」シートが作成されていれば成功
 */
function testRun() {
  Logger.log('=== テスト実行開始 ===');
  prepareFollowUpList();
  Logger.log('=== テスト実行完了 ===');

  const ss = SpreadsheetApp.openById(CMS_ID);
  const resultSheet = ss.getSheetByName(RESULT_SHEET_NAME);
  if (resultSheet) {
    const data = resultSheet.getDataRange().getValues();
    Logger.log('「本日の後確」シートの内容:');
    data.forEach(row => Logger.log(row.join(' | ')));
  }
}
