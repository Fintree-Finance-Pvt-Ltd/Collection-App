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
 * @param {string} paymentsCSV - CSV content for payment receipts
 * @param {{count?: number, totalAmount?: number, csv?: string}} easebuzzSuccessReport - Today's successful Easebuzz payment summary
 * @returns {Promise<void>}
 */
export async function sendDailyReportEmail(paymentsCSV, easebuzzSuccessReport = {}) {
  const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
  const teamEmails = process.env.TEAM_EMAILS.split(',').map((email) => email.trim());
  const easebuzzCount = Number(easebuzzSuccessReport.count || 0);
  const easebuzzTotalAmount = Number(easebuzzSuccessReport.totalAmount || 0);

  const attachments = [];
  if (paymentsCSV) {
    attachments.push({
      filename: `payments_receipts_${date}.csv`,
      content: paymentsCSV,
      contentType: 'text/csv',
    });
  }
  if (easebuzzSuccessReport.csv) {
    attachments.push({
      filename: `easebuzz_success_payments_${date}.csv`,
      content: easebuzzSuccessReport.csv,
      contentType: 'text/csv',
    });
  }

  const mailOptions = {
    from: `"Receipts Bot" <${process.env.FROM_EMAIL}>`,
    to: teamEmails,
    subject: `Daily Receipts Report - ${date}`,
    text: `Hello,\n\nPlease find attached the daily receipts data for all products (records created today).\n\nEasebuzz online payments today with success status:\nCount: ${easebuzzCount}\nTotal Amount: Rs. ${easebuzzTotalAmount.toFixed(2)}\n\nIf no attachments are present, there were no new records today.\n\nBest regards,\nReceipts Automation`,
    attachments,
  };

  await transporter.sendMail(mailOptions);
  console.log(`Daily report email sent successfully for ${date}`);
}
