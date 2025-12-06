// src/cron/dailyReport.js
import cron from 'node-cron';
import { exportEmbifiToCSV, exportMalhotraToCSV } from '../utils/csvUtils.js';
import { sendDailyReportEmail } from '../utils/emailUtils.js';

/**
 * Starts the cron job to run every day at 5 PM (17:00) Monday through Saturday (skips Sunday).
 * Import and call startDailyCron() in your main app.js or server.js after AppDataSource.initialize().
 * Example: import './cron/dailyReport.js'; startDailyCron();
 */
export function startDailyCron() {
  // Cron schedule: '0 17 * * 1-6' = 5 PM daily, Mon-Sat (1=Monday, 6=Saturday, skips 0=Sunday)
  cron.schedule('0 17 * * 1-6', async () => {
    console.log('Starting daily receipts report cron job...');
    try {
      const [embifiCSV, malhotraCSV] = await Promise.all([
        exportEmbifiToCSV(),
        exportMalhotraToCSV(),
      ]);
      await sendDailyReportEmail(embifiCSV, malhotraCSV);
    } catch (error) {
      console.error('Error in daily report cron job:', error);
      // Optionally, send error notification email here
    }
  }, {
    scheduled: true,
    timezone: 'Asia/Kolkata', // Adjust to your timezone if needed (e.g., 'America/New_York')
  });

  console.log('Daily cron job scheduled (5 PM Mon-Sat).');
}
