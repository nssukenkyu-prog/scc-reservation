/**
 * Google Apps Script (GAS) 用の管理者通知メール送信コード
 * 
 * 現在のスプレッドシートに関連付けられているGASプロジェクトに
 * 以下の関数を追加してください。
 */

function sendAdminNotification(reservationData) {
    // 管理者のメールアドレス
    const adminEmail = 'nssu.scc@gmail.com';

    const subject = '【SCC予約システム】新規予約が入りました';

    // メールの本文
    // reservationData は、予約された行のデータから取得したオブジェクトを想定しています。
    // 既存の患者様向けメール送信処理（onFormSubmit や onChange トリガー内の処理）で
    // 取得している変数（name, date, startTime, visitType, phone など）を渡してください。
    const body = `
管理者 様

新しい予約が入りました。

--------------------------------------------------
■予約日時
${reservationData.date} ${reservationData.startTime}

■来院区分
${reservationData.visitType}

■お名前
${reservationData.name} 様

■電話番号
${reservationData.phone}
--------------------------------------------------

Googleスプレッドシートをご確認ください。
https://docs.google.com/spreadsheets/d/1O5r-jE2d2z... (スプレッドシートのURL)
  `;

    // メール送信実行
    MailApp.sendEmail({
        to: adminEmail,
        subject: subject,
        body: body
    });
}

/**
 * 実装のヒント:
 * 
 * 既存のGASコードの中に、以下のような患者様へのメール送信処理があるはずです。
 * 
 *    GmailApp.sendEmail(patientEmail, subject, body);
 *    // または
 *    MailApp.sendEmail(patientEmail, subject, body);
 * 
 * その処理の直後に、上記の関数を呼び出すコードを追加してください。
 * 
 * 例:
 *    // ... (既存の処理)
 *    sendAdminNotification({
 *      name: name,
 *      date: date,
 *      startTime: startTime,
 *      visitType: visitType,
 *      phone: phone
 *    });
 * 
 */
