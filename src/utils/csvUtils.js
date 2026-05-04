// src/utils/csvUtils.js
import AppDataSource from '../config/database.js';
import { Between } from 'typeorm';
import Payment from '../entities/Payment.js';
import DigitalPaymentLogs from '../entities/DigitalPayments.js';


const paymentsRepo = AppDataSource.getRepository(Payment);
const digitalPaymentsRepo = AppDataSource.getRepository(DigitalPaymentLogs);

const easebuzzSuccessPaymentColumns = [
  'id',
  'referenceId',
  'externalReferenceId',
  'lan',
  'emiId',
  'customerName',
  'phone',
  'email',
  'amount',
  'currency',
  'status',
  'createdAt',
  'updatedAt',
];

function getTodayRange() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  return { today, tomorrow };
}

function formatCsvValue(value) {
  if (value === null || value === undefined) return '""';
  if (value instanceof Date) return `"${value.toISOString()}"`;
  if (typeof value === 'object') {
    return `"${JSON.stringify(value).replace(/"/g, '""')}"`;
  }

  return `"${String(value).replace(/"/g, '""')}"`;
}

function recordsToCSV(records, columns = Object.keys(records[0] || {})) {
  if (records.length === 0) {
    return '';
  }

  const headers = columns.join(',');
  const rows = records
    .map((record) => columns.map((column) => formatCsvValue(record[column])).join(','))
    .join('\n');

  return `${headers}\n${rows}`;
}

/**
 * Exports today's payment receipts to CSV string.
 * Assumes 'createdAt' field exists in the entity for filtering today's data.
 * Filters records where createdAt is between local today 00:00:00 and tomorrow 00:00:00.
 * @returns {Promise<string>} CSV content as string (empty if no records).
 */
export async function exportToCSV() {
  const { today, tomorrow } = getTodayRange();

  const records = await paymentsRepo.find({
    where: {
      createdAt: Between(today, tomorrow)
    }
  });

  if (records.length === 0) {
    return '';
  }

  return recordsToCSV(records);
}

/**
 * Builds today's successful Easebuzz online payment report.
 * Counts payments whose latest successful status update happened today.
 * @returns {Promise<{count: number, totalAmount: number, csv: string}>}
 */
export async function getEasebuzzSuccessPaymentsReport() {
  const { today, tomorrow } = getTodayRange();

  const records = await digitalPaymentsRepo.find({
    where: {
      provider: 'easebuzz',
      status: 'success',
      updatedAt: Between(today, tomorrow),
    },
    order: {
      updatedAt: 'ASC',
    },
  });

  const totalAmount = records.reduce((sum, record) => {
    const amount = Number(record.amount || 0);
    return Number.isFinite(amount) ? sum + amount : sum;
  }, 0);

  return {
    count: records.length,
    totalAmount,
    csv: recordsToCSV(records, easebuzzSuccessPaymentColumns),
  };
}
