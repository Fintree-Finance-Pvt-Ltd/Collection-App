// src/utils/csvUtils.js
import AppDataSource from '../config/database.js';
import { Between } from 'typeorm';
import Payment from '../entities/Payment.js';


const paymentsRepo=AppDataSource.getRepository(Payment);

/**
 * Exports today's embifi receipts to CSV string.
 * Assumes 'createdAt' field exists in the entity for filtering today's data.
 * Filters records where createdAt is between today 00:00:00 and tomorrow 00:00:00 (UTC).
 * @returns {Promise<string>} CSV content as string (empty if no records).
 */
export async function exportToCSV() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const records = await paymentsRepo.find({
    where: {
      createdAt: Between(today, tomorrow)
    }
  });

  if (records.length === 0) {
    return '';
  }

  // Get ordered headers from the first record (assumes consistent structure)
  const headers = Object.keys(records[0]).join(',');
  const rows = records
    .map((record) =>
      Object.values(record)
        .map((value) => `"${String(value).replace(/"/g, '""')}"`) // Escape quotes and wrap in quotes
        .join(',')
    )
    .join('\n');

  return `${headers}\n${rows}`;
}
