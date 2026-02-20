

// src/routes/web/collection.js
import { Router } from "express";
import PDFDocument from "pdfkit";
import AppDataSource from "../../config/database.js";

import Payment from "../../entities/Payment.js";
import PaymentImage from "../../entities/PaymentImage.js";
import { authenticateToken } from "../../middleware/auth.js";
import { sendPaymentToLms } from "../../utils/index.js";
import { drawHorizontalTable } from "../../utils/index.js";

import { fileURLToPath } from "url";
import { dirname, join } from "path";

const router = Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const signaturePath = join(__dirname, "../../assets/signature.png");
const logoPath = join(__dirname, "../../assets/FinTree-Logo.jpg");

// helper
function addRow(doc, label, value, y) {
  doc.font("Helvetica-Bold").text(label, 50, y);
  doc.font("Helvetica").text(value, 200, y);
}

// --------------------------------------------
// UNIFIED REPOSITORY (after migration)
// --------------------------------------------
const paymentRepo = AppDataSource.getRepository(Payment);
const imageRepo = AppDataSource.getRepository(PaymentImage);

/* ============================================================
   GET COLLECTION LIST (Unified after migration)
============================================================ */
router.get("/collection", authenticateToken, async (req, res) => {
  try {
    const {
      partner, // embifi / malhotra / future
      page = 1,
      limit = 10,
      collectedBy,
      lanId,
      approved,
      customerName,
      startDate,
      endDate,
    } = req.query;

    const userRole = req.user.role;

    // ---- SUPERADMIN → sees all partners
    let partners = [];
    if (userRole === "superadmin") {
      partners = ["embifi", "malhotra", "heyev"]; // dynamic later
    } else {
      if (!partner)
        return res.status(400).json({ message: "Partner required" });
      partners = [partner];
    }

    let finalRows = [];

    for (const p of partners) {
      let qb = paymentRepo
        .createQueryBuilder("p")
        .leftJoin(PaymentImage, "img", "img.paymentId = p.id")
        .leftJoin("users", "u", "u.id = p.approved_by")
        .leftJoin("users", "c", "c.id = p.collectedBy")
        .select([
          "p.id AS id",
          "p.product AS partner",
          "p.loanId AS loanId",
          "p.customerName AS customerName",
          "p.vehicleNumber AS vehicleNumber",
          "p.contactNumber AS contactNumber",
          "p.paymentDate AS paymentDate",
          "p.paymentMode AS paymentMode",
          "p.paymentRef AS paymentRef",
          "p.remark AS remark",
          "p.insurance AS insurance",
          "p.amount AS amount",
          "c.name AS collectedBy",
          "p.approved AS approved",
          "u.name AS approved_by",
          "p.createdAt AS createdAt",
          "CASE WHEN img.image1 IS NOT NULL THEN TRUE ELSE FALSE END AS image1Present",
          "CASE WHEN img.image2 IS NOT NULL THEN TRUE ELSE FALSE END AS image2Present",
          "CASE WHEN img.selfie IS NOT NULL THEN TRUE ELSE FALSE END AS selfiePresent",
        ])
        .where("p.product = :prt", { prt: p });

      if (collectedBy) {
        const collectorIds = collectedBy
          .split(",")
          .map((x) => Number(x))
          .filter((x) => !isNaN(x));

        if (collectorIds.length) {
          qb.andWhere("p.collectedBy IN (:...collectors)", {
            collectors: collectorIds,
          });
        }
      }

      if (customerName) {
        qb.andWhere("p.customerName LIKE :nm", { nm: `%${customerName}%` });
      }
      if (lanId) {
        qb.andWhere("p.loanId = :loanId", { loanId: `${lanId}` });
      }
      if (approved !== undefined) {
        qb.andWhere("p.approved = :approved", {
          approved: approved === "true",
        });
      }

      if (startDate && endDate) {
        qb.andWhere("p.paymentDate BETWEEN :s AND :e", {
          s: startDate,
          e: endDate,
        });
      } else if (startDate) {
        qb.andWhere("p.paymentDate >= :s", { s: startDate });
      } else if (endDate) {
        qb.andWhere("p.paymentDate <= :e", { e: endDate });
      }

      const rows = await qb.getRawMany();
      finalRows.push(...rows);
    }

    // ---- Sorting + Pagination ----
    finalRows.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const offset = (page - 1) * limit;
    const paginated = finalRows.slice(offset, offset + Number(limit));

    const formatted = paginated.map((r) => {
      const isCash = (r.paymentMode || "").toLowerCase() === "cash";
      const status = isCash && !r.image2Present ? "Incomplete" : "Completed";
      return { ...r, status };
    });

    res.json({
      role: userRole,
      partnersUsed: partners,
      total: finalRows.length,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(finalRows.length / limit),
      data: formatted,
    });
  } catch (err) {
    console.error("Collection API Error:", err);
    return res.status(500).json({ message: "Error fetching data" });
  }
});

/* ============================================================
   LOAD SINGLE PAYMENT IMAGE (Unified)
============================================================ */
router.get("/collection/:id/images", async (req, res) => {
  try {
    const { type } = req.query;
    const { id } = req.params;

    const imageRow = await imageRepo.findOne({
      where: { paymentId: id },
    });

    if (!imageRow) return res.json({ image: null });

    const map = {
      image1: "image1",
      image2: "image2",
      selfie: "selfie",
    };

    if (!map[type]) {
      return res.status(400).json({ message: "Invalid image type" });
    }

    const buffer = imageRow[map[type]];

    return res.json({
      image: buffer ? buffer.toString("base64") : null,
    });
  } catch (err) {
    console.error("Image load error:", err);
    return res.status(500).json({ message: "Error loading image" });
  }
});


router.post("/collection/:id/approve", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { bankDate, bankUtr, amount, paymentRef } = req.body; // 👈 Add amount here

    const payment = await paymentRepo.findOne({ where: { id } });

    if (!payment) return res.status(404).json({ message: "Payment not found" });
    if (payment.approved)
      return res.status(400).json({ message: "Already approved" });

    // 👈 Parse and validate amount if provided
    let numAmount = payment.amount; // Default to original
    if (amount !== undefined && amount !== null && amount !== "") {
      numAmount = parseFloat(amount);
      if (isNaN(numAmount) || numAmount <= 0) {
        return res.status(400).json({ message: "Invalid amount provided" });
      }
      // Update DB amount only if changed
      if (numAmount !== payment.amount) {
        payment.amount = numAmount;
      }
    }

    let finalPaymentRef = payment.paymentRef;
    if (paymentRef !== undefined && paymentRef !== null && paymentRef !== "") {
      finalPaymentRef = paymentRef;
      if (finalPaymentRef !== payment.paymentRef) {
        payment.paymentRef = finalPaymentRef;
      }
    }

    // Send to LMS with updated amount if edited
    const augmented = {
      ...payment,
      bankDate,
      bankUtr,
      amount: numAmount, // 👈 Always use the (potentially updated) amount
      paymentRef: finalPaymentRef,
    };
    const lmsResult = await sendPaymentToLms(payment.partner, augmented);

    if (!lmsResult.success) {
      return res.status(400).json({
        message: "LMS did not approve this payment",
        lmsResponse: lmsResult.raw,
      });
    }

    // Mark approved (DB amount already updated if needed)
    payment.approved = true;
    payment.approved_by = req.user?.id;
    await paymentRepo.save(payment);

    res.json({
      message: "Payment approved successfully",
      data: {
        id: payment.id,
        approved: true,
        approved_by: payment.approved_by,
        amount: numAmount, // 👈 Include updated amount in response
        paymentRef: finalPaymentRef,
      },
    });
  } catch (err) {
    console.error("Approve error:", err);
    return res.status(500).json({ message: "Approval error" });
  }
});

/* ============================================================
   PDF RECEIPT GENERATION (unchanged logic, but unified)
============================================================ */

router.get("/collection/:id/receipt", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const payment = await paymentRepo.findOne({ where: { id } });

    if (!payment) return res.status(404).json({ message: "Payment not found" });

    // if (!payment.approved) {
    //     return res
    //         .status(400)
    //         .json({ message: "Payment is not approved. Cannot generate receipt." });
    // }

    // Prepare values
    const now = new Date();
    const formatDate = (d) =>
      d
        ? new Date(d).toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "2-digit",
            year: "2-digit",
          })
        : "";

    const formatDateFull = (d) => {
      if (!d) return "";
      const date = new Date(d);
      const day = date.getDate();
      const suffix =
        day === 1 || day === 21 || day === 31
          ? "st"
          : day === 2 || day === 22
            ? "nd"
            : day === 3 || day === 23
              ? "rd"
              : "th";
      const month = date.toLocaleDateString("en-US", { month: "long" });
      const year = date.getFullYear();
      return `${day}${suffix} ${month} ${year}`;
    };

    const headerDate = formatDate(now);
    const paymentDateStr = formatDateFull(payment.paymentDate);
    const amount = payment.amount || 0;
    const amountFormatted = `Rs.${amount}/-`;

    const customerName = payment.customerName || "";
    const loanId = payment.loanId || "";
    const txnId = payment.paymentRef || "";
    const paymentMode = payment.paymentMode || "";

    // ----------------- PDF Generation -----------------
    const doc = new PDFDocument({
      size: "A4",
      margins: { top: 50, bottom: 60, left: 50, right: 50 },
    });

    // Headers for download
    const fileName = `receipt_${loanId || id}.pdf`;
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);

    doc.pipe(res);

    // --- LOGO at top right ---
    // For ES6 modules, use this to add your logo:
    // import { fileURLToPath } from 'url';
    // import { dirname, join } from 'path';
    // const __filename = fileURLToPath(import.meta.url);
    // const __dirname = dirname(__filename);
    // const logoPath = join(__dirname, '../assets/fintree-logo.png');
    doc.image(logoPath, 450, 40, { width: 100 });

    // For now, adding placeholder text for logo position
    // doc
    //   .fontSize(16)
    //   .font("Helvetica-Bold")
    //   .text("FinTree", 450, 40, { width: 100, align: "center" });

    // doc
    //   .fontSize(8)
    //   .font("Helvetica")
    //   .text("Fintree Finance Pvt. Ltd.", 450, 60, { width: 100, align: "center" });

    // doc
    //   .fontSize(7)
    //   .text("Empowering SME Growth", 450, 72, { width: 100, align: "center" });

    doc.moveDown(3);

    // --- Date (left aligned) ---
    doc
      .font("Helvetica")
      .fontSize(10)
      .text(`Date: ${headerDate}`, 50, 120, { align: "left" });

    doc.moveDown(1.5);

    // --- To section ---
    doc
      .font("Helvetica")
      .fontSize(10)
      .text("To,", 50, doc.y, { align: "left" });

    doc.moveDown(0.3);

    // Customer name
    doc
      .font("Helvetica-Bold")
      .fontSize(10)
      .text(`Mr. ${customerName.toUpperCase()}`, { align: "left" });

    doc.moveDown(0.2);

    // Loan ID
    // if (loanId) {
    //     doc
    //         .font("Helvetica")
    //         .fontSize(10)
    //         .text(loanId, { align: "left" });
    // }

    doc.moveDown(1);

    // --- Main certification text ---
    const certificationText = `This is to certify that your payment of ${amountFormatted} has been received on ${paymentDateStr}, via ${paymentMode} having transaction ID ${txnId}`;

    doc.font("Helvetica").fontSize(10).text(certificationText, {
      align: "left",
      lineGap: 2,
    });

    doc.moveDown(4);

    let tableY = doc.y + 20;

    // Title
    doc.font("Helvetica-Bold").fontSize(12).text("Payment Details", 50, tableY);

    tableY += 25;

    // Horizontal Table
    tableY = drawHorizontalTable(doc, tableY, [
      { label: "Customer", value: customerName },
      { label: "Loan ID", value: loanId },
      { label: "Payment Date", value: paymentDateStr },
      { label: "Mode", value: paymentMode },
      { label: "Transaction ID", value: txnId || "N/A" },
      { label: "Amount Paid", value: amountFormatted },
    ]);

    doc.moveDown(2);

    // Move cursor after table
    doc.moveDown(2);
    if (signaturePath) {
      // Reserve vertical space, then draw signature on the right
      doc.moveDown(1);

      const sigWidth = 120; // desired signature width in px
      const sigX = doc.page.width - doc.page.margins.right - sigWidth; // right side
      const sigY = doc.y; // current y

      try {
        // Use file system path, same as logo
        doc.image(signaturePath, sigX, sigY, { width: sigWidth });
      } catch (e) {
        console.warn("Could not render signature image:", e.message || e);
      }

      // label under the signature (centered under the image)
      const labelY = sigY + sigWidth * 0.35 + 8; // heuristic for vertical placement
      doc
        .font("Helvetica")
        .fontSize(9)
        .text("Authorised Signatory", sigX, labelY, {
          width: sigWidth,
          align: "center",
        });

      // move doc.y below signature area so footer doesn't overlap
      doc.y = labelY + 20;
      doc.moveDown(1);
    }

    // --- Footer note (centered, italics) ---
    doc
      .font("Helvetica-Oblique")
      .fontSize(8)
      .text("*This is system generated letter*", 50, doc.y, {
        align: "center",
        width: 495,
      });

    // --- FOOTER (at bottom of page) ---
    const footerY = doc.page.height - 80; // 60px from bottom

    // Top border line
    doc
      .moveTo(50, footerY - 10)
      .lineTo(doc.page.width - 50, footerY - 10)
      .strokeColor("#000000")
      .lineWidth(0.5)
      .stroke();

    // Footer text - split into two lines like your screenshot
    doc
      .font("Helvetica")
      .fontSize(7)
      .text(
        "Registered Office: 4th Floor, Engineering Centre, Opera House, 9 Matthew Road, Mumbai-400004, Maharashtra\n" +
          "Website: www.fintreefinance.com | CIN: U65923MH2015PTC264997 | Tel: +91 22 3511 1832 | Email ID: cs@fintreefinance.com",
        50,
        footerY,
        {
          align: "center",
          width: doc.page.width - 50,
          lineGap: 1, // Optional: make spacing tighter
        },
      );

    doc.end();
  } catch (err) {
    console.error("Receipt generation error:", err);
    if (!res.headersSent) {
      res
        .status(500)
        .json({ message: "Error generating receipt", error: err.message });
    }
  }
});

export default router;
