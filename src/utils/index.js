

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

  // Helper function to format ISO date to DD-MMM-YY
  const formatDate = (isoDate) => {
    if (!isoDate) return '';
    const date = new Date(isoDate);
    if (isNaN(date.getTime())) return ''; // Invalid date fallback
    const day = String(date.getDate()).padStart(2, '0');
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = monthNames[date.getMonth()];
    const year = String(date.getFullYear()).slice(-2);
    return `${day}-${month}-${year}`;
  };

  const row = {
    "LAN": payment.loanId,
    "Bank Date": formatDate(payment.bankDate), // Formats e.g., "2025-12-27" to "27-Dec-25"
    "UTR": payment.paymentRef,
    "Payment Date": formatDate(payment.paymentDate), // Formats e.g., "2025-12-27" to "27-Dec-25"
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

// export async function sendPaymentToLms(partner, payment) {
//   const url = `${process.env.LMS_BASE_URL}/api/repayments/upload-json`;
//   // console.log("paymenst",payment)

//   // Helper function to format ISO date to DD-MMM-YY
//   const formatDate = (isoDate) => {
//     if (!isoDate) return '';
//     const date = new Date(isoDate);
//     if (isNaN(date.getTime())) return ''; // Invalid date fallback
//     const day = String(date.getDate()).padStart(2, '0');
//     const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
//     const month = monthNames[date.getMonth()];
//     const year = String(date.getFullYear()).slice(-2);
//     return `${day}-${month}-${year}`;
//   };

//   const row = {
//     "LAN": payment.loanId,
//     "Bank Date": formatDate(payment.bankDate), // Formats e.g., "2025-12-27" to "27-Dec-25"
//     "UTR": payment.paymentRef,
//     "Payment Date": formatDate(payment.paymentDate), // Formats e.g., "2025-12-27" to "27-Dec-25"
//     "Payment Id": payment.paymentRef,
//     "Payment Mode": payment.paymentMode, 
//     "Transfer Amount": payment.amount,
//   };

//   const payload = {
//     rows: [row],
//   };

//   console.log("payload", payload);
//   const { data, status } = await axios.post(url, payload);

//   const success = status === 200 && (data.success === true || data.code === "APPROVED");

//   return {
//     success,
//     raw: data,
//   };
// }

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



