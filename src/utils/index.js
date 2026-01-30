

import fs from "fs/promises";
import axios from "axios";
export function normalizeTosmsDate(input) {
  if (!input) return null;

  // if already Date object
  if (input instanceof Date) {
    return input.toLocaleDateString("en-GB"); // dd/mm/yyyy
  }

  // if string in yyyy-mm-dd format
  if (/^\d{4}-\d{2}-\d{2}$/.test(input)) {
    const [y, m, d] = input.split("-");
    return `${d}-${m}-${y}`;
  }

  return input; // fallback
}
export function cleanupFiles(files) {
  if (!files?.length) return;
  for (const f of files) {
    if (f?.path && fs.existsSync(f.path)) {
      try {
        fs.unlinkSync(f.path);
      } catch (err) {
        console.error("Error deleting file:", f.path, err);
      }
    }
  }
}


export async function fetchMalhotraActiveLoans() {
  try {
    const apiURL = process.env.MALHOTRA_API_URL + "/loans/active/count";
    const res = await axios.get(apiURL);
    return res.data.count || 0;
  } catch (err) {
    console.error("Malhotra active loan API failed");
    return 0;
  }
}
export async function sendPaymentToLms(partner, payment) {
  const url = `${process.env.LMS_BASE_URL}/api/repayments/upload-json`;
  // console.log("paymenst",payment)

  // Convert JS date string (YYYY-MM-DD) → Excel serial number
  const dateToExcelSerial = (dateStr) => {
    if (!dateStr) return null;

    // Convert to JS Date
    const date = new Date(dateStr);

    if (isNaN(date.getTime())) return null;

    // Excel epoch starts Jan 1, 1900
    const excelEpoch = new Date(Date.UTC(1899, 11, 30));

    // Difference in ms → convert to days
    const diffInMs = date - excelEpoch;
    const serial = diffInMs / 86400000;

    return Math.floor(serial); // Excel stores as whole number
  };

  const row = {
    "LAN": payment.loanId,
    "Bank Date": dateToExcelSerial(payment.bankDate), // Formats e.g., "2025-12-27" to "27-Dec-25"
    "UTR": payment.bankUtr,
    "Payment Date": dateToExcelSerial(payment.paymentDate), // Formats e.g., "2025-12-27" to "27-Dec-25"
    "Payment Id": payment.paymentRef,
    "Payment Mode": payment.paymentMode,
    "Transfer Amount": payment.amount,
  };

  const payload = {
    rows: [row],
  };

  console.log("payload", payload);
  const { data, status } = await axios.post(url, payload);

  // 👇 Updated: Check for actual success indicators in LMS response
  const success = status === 200 &&
    (data.inserted_rows > 0 ||
      (data.success_rows && data.success_rows.length > 0) ||
      (data.failed_rows === 0 && data.row_errors.length === 0));

  return {
    success,
    raw: data,
  };
}


//pdf making
export function drawHorizontalTable(doc, startY, data) {
  const startX = 50;
  const tableWidth = doc.page.width - 100;
  const colWidth = tableWidth / data.length;
  const rowHeight = 30;          // header
  const dataRowHeight = 30;      // data row
  const totalHeight = rowHeight + dataRowHeight;

  // Thin border for whole table
  doc.lineWidth(0.2);

  // 1) Outer rectangle (one stroke)
  doc
    .rect(startX, startY, tableWidth, totalHeight)
    .stroke();

  // 2) Vertical lines between columns (one per column boundary)
  for (let i = 1; i < data.length; i++) {
    const x = startX + i * colWidth;
    doc
      .moveTo(x, startY)
      .lineTo(x, startY + totalHeight)
      .stroke();
  }

  // 3) Horizontal line between header row and data row
  const headerBottomY = startY + rowHeight;
  doc
    .moveTo(startX, headerBottomY)
    .lineTo(startX + tableWidth, headerBottomY)
    .stroke();

  // 4) Header text
  data.forEach((col, i) => {
    const x = startX + i * colWidth;
    doc
      .font("Helvetica-Bold")
      .fontSize(10)
      .text(col.label, x + 5, startY + 7, {
        width: colWidth - 10,
        align: "left",
      });
  });

  // 5) Data text
  const dataY = headerBottomY;
  data.forEach((col, i) => {
    const x = startX + i * colWidth;
    doc
      .font("Helvetica")
      .fontSize(10)
      .text(col.value, x + 5, dataY + 7, {
        width: colWidth - 10,
        align: "left",
      });
  });

  return startY + totalHeight + 10; // next Y position
}





export const PRODUCT_MAP = {
  embifi: {
    table: 'loan_booking_embifi',
    cols: {
      partnerLoanId: 'partner_loan_id',
      lan: 'lan',
      customerName: 'customer_name',
      mobileNumber: 'mobile_number',
      panNumber: 'pan_number',
      approvedLoanAmount: 'approved_loan_amount',
      emiAmount: 'emi_amount',
      address: 'applicant_address',
      city: 'district',
      state: 'applicant_state',
      product: 'product',
      lender: 'lender'
    },
    manual: {
      table: 'manual_rps_embifi_loan'
    }

  },
  malhotra: {
    table: 'loan_booking_ev',
    cols: {
      partnerLoanId: 'partner_loan_id',
      lan: 'lan',
      customerName: 'customer_name',
      mobileNumber: 'mobile_number',
      panNumber: 'pan_card',
      approvedLoanAmount: 'loan_amount',
      emiAmount: 'emi_amount',
      address: "CONCAT_WS(' ', address_line_1, address_line_2)",
      city: 'village',
      state: 'state',
      product: 'product',
      lender: 'lender'
    },
    manual: {
      table: 'manual_rps_ev_loan'
    }
  },
  heyev: {
    table: 'loan_booking_hey_ev',
    cols: {
      partnerLoanId: 'partner_loan_id',
      lan: 'lan',
      customerName: 'customer_name',
      mobileNumber: 'mobile_number',
      panNumber: 'pan_card',
      approvedLoanAmount: 'loan_amount',
      emiAmount: 'emi_amount',
      address: "CONCAT_WS(' ', address_line_1, address_line_2)",
      city: 'village',
      state: 'state',
      product: 'product',
      lender: 'lender'
    },
    manual: {
      table: 'manual_rps_hey_ev'
    }
  },
  heyev_battery: {
  table: 'loan_booking_hey_ev_battery',
  cols: {
    partnerLoanId: 'partner_loan_id',
    lan: 'lan',
    customerName: 'customer_name',
    mobileNumber: 'mobile_number',
    panNumber: 'borrower_pan_card',
    approvedLoanAmount: 'loan_amount',
    emiAmount: 'emi_amount',
    address: "CONCAT_WS(' ', address_line_1, address_line_2)",
    city: 'village',
    state: 'state',
    product: 'product',
    lender: 'lender'
  },
  manual: {
    table: 'manual_rps_hey_ev_battery'
  }
}

};





