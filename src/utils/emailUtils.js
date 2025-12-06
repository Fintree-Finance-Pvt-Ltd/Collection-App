// src/utils/emailUtils.js
import nodemailer from 'nodemailer';

/**
 * Configures Nodemailer transporter using environment variables.
 * Set these in your .env:
 * SMTP_HOST=your-smtp-host (e.g., smtp.gmail.com)
 * SMTP_PORT=587 (or 465 for SSL)
 * SMTP_USER=your-email@example.com
 * SMTP_PASS=your-app-password
 * FROM_EMAIL=your-sender@example.com
 * TEAM_EMAILS=op-team@example.com,collection-team@example.com (comma-separated for operation and collection teams)
 */
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_PORT === '465', // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

/**
 * Sends daily report email with CSV attachments to operation and collection teams.
 * @param {string} embifiCSV - CSV content for embifi receipts
 * @param {string} malhotraCSV - CSV content for malhotra receipts
 * @returns {Promise<void>}
 */
export async function sendDailyReportEmail(embifiCSV, malhotraCSV) {
  const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
  const teamEmails = process.env.TEAM_EMAILS.split(',').map((email) => email.trim());

  const attachments = [];
  if (embifiCSV) {
    attachments.push({
      filename: `embifi_receipts_${date}.csv`,
      content: embifiCSV,
      contentType: 'text/csv',
    });
  }
  if (malhotraCSV) {
    attachments.push({
      filename: `malhotra_receipts_${date}.csv`,
      content: malhotraCSV,
      contentType: 'text/csv',
    });
  }

  const mailOptions = {
    from: `"Receipts Bot" <${process.env.FROM_EMAIL}>`,
    to: teamEmails,
    subject: `Daily Receipts Report - ${date}`,
    text: `Hello,\n\nPlease find attached the daily receipts data for Embifi and Malhotra  (records created today).\n\nIf no attachments are present, there were no new records today.\n\nBest regards,\nReceipts Automation`,
    attachments,
  };

  await transporter.sendMail(mailOptions);
  console.log(`Daily report email sent successfully for ${date}`);
}