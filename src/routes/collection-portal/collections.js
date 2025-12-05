// src/routes/web/collection.js
import { Router } from "express";
import PDFDocument from "pdfkit";
import AppDataSource from "../../config/database.js";

import embifiReceipt from "../../entities/embifiReceipt.js";
import malhotraReceipt from "../../entities/malhotraReceipt.js";

import embifiImage from "../../entities/embifiImage.js";
import malhotraImage from "../../entities/malhotraImage.js";
import { authenticateToken } from "../../middleware/auth.js";
import { sendPaymentToLms } from "../../utils/index.js"
import { drawHorizontalTable } from "../../utils/index.js"

const router = Router();
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// NOW you can use __dirname safely
const logoPath = join(__dirname, '../../assets/FinTree-Logo.jpg');
function addRow(doc, label, value, y) {
    const labelX = 50;
    const valueX = 200;

    doc.font("Helvetica-Bold").text(label, labelX, y);
    doc.font("Helvetica").text(value, valueX, y);
}


/* ------------------ Repo Map (Entity Based) ------------------ */
const REPO_MAP = {
    embifi: {
        repo: AppDataSource.getRepository(embifiReceipt),
        imageRepo: AppDataSource.getRepository(embifiImage),
    },
    malhotra: {
        repo: AppDataSource.getRepository(malhotraReceipt),
        imageRepo: AppDataSource.getRepository(malhotraImage),
    }
};

/* ------------------ 1. Collection List API ------------------ */
// router.get("/collection", async (req, res) => {
//     try {
//         const {
//             partner,
//             page = 1,
//             limit = 10,
//             collectedBy,
//             customerName,
//             startDate,
//             endDate,
//         } = req.query;

//         if (!REPO_MAP[partner]) {
//             return res.status(400).json({ message: "Invalid partner selected" });
//         }

//         const { repo,imageRepo } = REPO_MAP[partner];
//         const skip = (page - 1) * limit;

//         let qb = repo
//             .createQueryBuilder("p")
//             .leftJoin(imageRepo, "img", "img.paymentId = p.id") // works because table exists
//             .select([
//                 "p.id AS id",
//                 "p.customerName AS customerName",
//                 "p.vehicleNumber AS vehicleNumber",
//                 "p.contactNumber AS contactNumber",
//                 "p.paymentDate AS paymentDate",
//                 "p.paymentMode AS paymentMode",
//                 "p.paymentRef AS paymentRef",
//                 "p.amount AS amount",
//                 "p.collectedBy AS collectedBy",
//                 "p.createdAt AS createdAt",

//                 // Flags only — NO BLOB
//                 "CASE WHEN img.image1 IS NOT NULL THEN true ELSE false END AS image1Present",
//                 "CASE WHEN img.image2 IS NOT NULL THEN true ELSE false END AS image2Present",
//                 "CASE WHEN img.selfie IS NOT NULL THEN true ELSE false END AS selfiePresent"
//             ]);

//         // ---------------- Filters ----------------
//         if (collectedBy) {
//             const collectors = collectedBy.split(",").map(c => c.trim());
//             qb.andWhere("p.collectedBy IN (:...collectors)", { collectors });
//         }

//         if (customerName) {
//             qb.andWhere("p.customerName LIKE :name", { name: `%${customerName}%` });
//         }

//         if (startDate && endDate) {
//             qb.andWhere("p.paymentDate BETWEEN :s AND :e", {
//                 s: startDate,
//                 e: endDate
//             });
//         } else if (startDate) {
//             qb.andWhere("p.paymentDate >= :s", { s: startDate });
//         } else if (endDate) {
//             qb.andWhere("p.paymentDate <= :e", { e: endDate });
//         }

//         // ---------------- Count ----------------
//         const total = await qb.getCount();

//         // ---------------- Paginated Records ----------------
//         const rows = await qb
//             .orderBy("p.createdAt", "DESC")
//             .offset(skip)
//             .limit(limit)
//             .getRawMany();

//         // Add status logic
//         const formatted = rows.map(r => {
//             const isCash = (r.paymentMode || "").toLowerCase() === "cash";
//             const status = isCash && !r.image2Present ? "Incomplete" : "Completed";
//             return { ...r, status };
//         });

//         res.json({
//             partner,
//             total,
//             page: Number(page),
//             limit: Number(limit),
//             totalPages: Math.ceil(total / limit),
//             data: formatted
//         });

//     } catch (err) {
//         console.error("Collection API Error:", err);
//         res.status(500).json({ message: "Error fetching data", error: err.message });
//     }
// });


// router.get("/collection", async (req, res) => {
//     try {
//         const {
//             partner,
//             page = 1,
//             limit = 10,
//             collectedBy,
//             customerName,
//             startDate,
//             endDate,
//         } = req.query;
//         if (!REPO_MAP[partner]) {
//             return res.status(400).json({ message: "Invalid partner selected" });
//         }
//         const { repo, imageRepo } = REPO_MAP[partner];
//         const skip = (page - 1) * limit;

//         // Extract the table name from the imageRepo metadata (dynamic per partner)
//         const imageTableName = imageRepo.metadata.tableName;

//         let qb = repo
//             .createQueryBuilder("p")
//             .leftJoin(imageTableName, "img", "img.paymentId = p.id")  // Fixed: Use string table name
//             .select([
//                 "p.id AS id",
//                 "p.loanId as loanId",
//                 "p.customerName AS customerName",
//                 "p.vehicleNumber AS vehicleNumber",
//                 "p.contactNumber AS contactNumber",
//                 "p.paymentDate AS paymentDate",
//                 "p.paymentMode AS paymentMode",
//                 "p.paymentRef AS paymentRef",
//                 "p.amount AS amount",
//                 "p.collectedBy AS collectedBy",
//                 "p.createdAt AS createdAt",
//                 // Flags only — NO BLOB
//                 "CASE WHEN img.image1 IS NOT NULL THEN true ELSE false END AS image1Present",
//                 "CASE WHEN img.image2 IS NOT NULL THEN true ELSE false END AS image2Present",
//                 "CASE WHEN img.selfie IS NOT NULL THEN true ELSE false END AS selfiePresent"
//             ]);
//         // ---------------- Filters ----------------
//         if (collectedBy) {
//             const collectors = collectedBy.split(",").map(c => c.trim());
//             qb.andWhere("p.collectedBy IN (:...collectors)", { collectors });
//         }
//         if (customerName) {
//             qb.andWhere("p.customerName LIKE :name", { name: `%${customerName}%` });
//         }
//         if (startDate && endDate) {
//             qb.andWhere("p.paymentDate BETWEEN :s AND :e", {
//                 s: startDate,
//                 e: endDate
//             });
//         } else if (startDate) {
//             qb.andWhere("p.paymentDate >= :s", { s: startDate });
//         } else if (endDate) {
//             qb.andWhere("p.paymentDate <= :e", { e: endDate });
//         }
//         // ---------------- Count ----------------
//         const total = await qb.getCount();
//         // ---------------- Paginated Records ----------------
//         const rows = await qb
//             .orderBy("p.createdAt", "DESC")
//             .offset(skip)
//             .limit(limit)
//             .getRawMany();
//         // Add status logic
//         const formatted = rows.map(r => {
//             const isCash = (r.paymentMode || "").toLowerCase() === "cash";
//             const status = isCash && !r.image2Present ? "Incomplete" : "Completed";
//             return { ...r, status };
//         });
//         res.json({
//             partner,
//             total,
//             page: Number(page),
//             limit: Number(limit),
//             totalPages: Math.ceil(total / limit),
//             data: formatted
//         });
//     } catch (err) {
//         console.error("Collection API Error:", err);
//         res.status(500).json({ message: "Error fetching data", error: err.message });
//     }
// });


router.get("/collection", authenticateToken, async (req, res) => {
    try {
        const {
            partner,
            page = 1,
            limit = 10,
            collectedBy,
            customerName,
            startDate,
            endDate,
        } = req.query;

        const userRole = req.user.role;
        console.log(userRole)
        let partners = [];

        // -----------------------------------------
        // ROLE BASED PARTNER SELECTION LOGIC
        // -----------------------------------------

        if (userRole === "superadmin") {
            // Superadmin ALWAYS fetches all partners
            partners = Object.keys(REPO_MAP);
        } else {
            // OLD behavior → only one partner allowed from query
            if (!partner || !REPO_MAP[partner]) {
                return res.status(400).json({ message: "Invalid or missing partner" });
            }
            partners = [partner];
        }

        const finalRows = [];
        console.log(partners)
        for (const p of partners) {
            const { repo, imageRepo } = REPO_MAP[p];
            const imageTableName = imageRepo.metadata.tableName;

            let qb = repo
                .createQueryBuilder("p")
                .leftJoin(imageTableName, "img", "img.paymentId = p.id")
                .leftJoin("users", "u", "u.id = p.approved_by")
                .select([
                    "p.id AS id",
                    "p.loanId as loanId",
                    "p.customerName AS customerName",
                    "p.vehicleNumber AS vehicleNumber",
                    "p.contactNumber AS contactNumber",
                    "p.paymentDate AS paymentDate",
                    "p.paymentMode AS paymentMode",
                    "p.paymentRef AS paymentRef",
                    "p.amount AS amount",
                    "p.collectedBy AS collectedBy",
                    "p.approved AS approved",
                     "u.name AS approved_by",
                    "p.createdAt AS createdAt",
                    "CASE WHEN img.image1 IS NOT NULL THEN true ELSE false END AS image1Present",
                    "CASE WHEN img.image2 IS NOT NULL THEN true ELSE false END AS image2Present",
                    "CASE WHEN img.selfie IS NOT NULL THEN true ELSE false END AS selfiePresent"
                ]);

            // ---------------- Filters ----------------
            if (collectedBy) {
                const collectors = collectedBy.split(",").map(c => c.trim());
                qb.andWhere("p.collectedBy IN (:...collectors)", { collectors });
            }

            if (customerName) {
                qb.andWhere("p.customerName LIKE :name", { name: `%${customerName}%` });
            }

            if (startDate && endDate) {
                qb.andWhere("p.paymentDate BETWEEN :s AND :e", {
                    s: startDate,
                    e: endDate
                });
            } else if (startDate) {
                qb.andWhere("p.paymentDate >= :s", { s: startDate });
            } else if (endDate) {
                qb.andWhere("p.paymentDate <= :e", { e: endDate });
            }

            const rows = await qb.getRawMany();

            rows.forEach(r => (r.partner = p)); // tag partner for UI

            finalRows.push(...rows);
        }

        // -----------------------------------------
        // MERGE + PAGINATE
        // -----------------------------------------

        finalRows.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        const total = finalRows.length;
        const offset = (page - 1) * limit;
        const paginated = finalRows.slice(offset, offset + Number(limit));

        const formatted = paginated.map(r => {
            const isCash = (r.paymentMode || "").toLowerCase() === "cash";
            const status = isCash && !r.image2Present ? "Incomplete" : "Completed";
            return { ...r, status };
        });

        res.json({
            role: userRole,
            partnersUsed: partners,
            total,
            page: Number(page),
            limit: Number(limit),
            totalPages: Math.ceil(total / limit),
            data: formatted
        });

    } catch (err) {
        console.error("Collection API Error:", err);
        res.status(500).json({ message: "Error fetching data", error: err.message });
    }
});

/* ------------------ 2. Load Single Payment Images ------------------ */
router.get("/collection/:id/images", async (req, res) => {
    try {
        const { partner, type } = req.query;
        const { id } = req.params;

        if (!REPO_MAP[partner]) {
            return res.status(400).json({ message: "Invalid partner selected" });
        }

        const { imageRepo } = REPO_MAP[partner];

        const imageRow = await imageRepo
            .createQueryBuilder("img")
            .where("img.paymentId = :id", { id })
            .getOne();

        if (!imageRow) {
            return res.json({ image: null });
        }

        let fieldName = null;

        if (type === "image1") fieldName = "image1";
        else if (type === "image2") fieldName = "image2";
        else if (type === "selfie") fieldName = "selfie";
        else {
            return res.status(400).json({ message: "Invalid image type" });
        }

        const buffer = imageRow[fieldName];

        res.json({
            image: buffer ? buffer.toString("base64") : null,
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Error loading image" });
    }
});



/**
 * Approve a single payment:
 * 1) Find payment in our DB
 * 2) Call LMS to approve the payment
 * 3) If LMS OK → update `approved`, `approved_by` in DB
 */
// router.post("/collection/:id/approve", authenticateToken, async (req, res) => {
//     try {
//         const { id } = req.params;
//         const { partner} = req.body; // from frontend
//         console.log(id)
//         if (!partner || !REPO_MAP[partner]) {
//             return res.status(400).json({ message: "Invalid or missing partner" });
//         }


//         const { repo } = REPO_MAP[partner];
    
//         // 1) Load payment from DB
//         const payment = await repo.findOne({
//             where: { id },
//         });
//         console.log(payment)
//         if (!payment) {
//             return res.status(404).json({ message: "Payment not found" });
//         }

//         if (payment.approved) {
//             return res.status(400).json({ message: "Payment already approved" });
//         }

//        // 2) Call LMS first
//         let lmsResult;
//         try {
//             lmsResult = await sendPaymentToLms(partner, payment);
//             console.log("lmsResult",lmsResult)
//         } catch (err) {
//             console.error("LMS approval error:", err);
//             return res.status(502).json({
//                 message: "Failed to approve payment in LMS",
//                 error: err.message,
//             });
//         }

//         if (!lmsResult.success) {
//             // LMS did not approve — DO NOT update our DB
//             return res.status(400).json({
//                 message: "LMS did not approve this payment",
//                 lmsResponse: lmsResult.raw,
//             });
//         }

//         //3) LMS approved → mark approved in DB
//         payment.approved = true;
//         payment.approved_by =
//              req.user?.id || req.user?.username || null;

//         await repo.save(payment);

//         return res.json({
//             message: "Payment approved successfully",
//             data: {
//                 id: payment.id,
//                 approved: payment.approved,
//                 approved_by: payment.approved_by,
//             },
//         });
//     } catch (err) {
//         console.error("Approve payment error:", err);
//         res.status(500).json({ message: "Error approving payment", error: err.message });
//     }
// });

// ------------------ 3. Generate Receipt PDF ------------------
// At the top of your file, add these imports:
// import { fileURLToPath } from 'url';
// import { dirname, join } from 'path';
// const __filename = fileURLToPath(import.meta.url);
// const __dirname = dirname(__filename);


router.post("/collection/:id/approve", authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { partner, bankDate } = req.body; // 👇 Receive bankDate from frontend
        console.log(id)
        if (!partner || !REPO_MAP[partner]) {
            return res.status(400).json({ message: "Invalid or missing partner" });
        }


        const { repo } = REPO_MAP[partner];
    
        // 1) Load payment from DB
        const payment = await repo.findOne({
            where: { id },
        });
        console.log(payment)
        if (!payment) {
            return res.status(404).json({ message: "Payment not found" });
        }

        if (payment.approved) {
            return res.status(400).json({ message: "Payment already approved" });
        }

       // 2) Call LMS first (augment payment with bankDate)
        const augmentedPayment = { ...payment, bankDate };
        let lmsResult;
        try {
            lmsResult = await sendPaymentToLms(partner, augmentedPayment);
            console.log("lmsResult",lmsResult)
        } catch (err) {
            console.error("LMS approval error:", err);
            return res.status(502).json({
                message: "Failed to approve payment in LMS",
                error: err.message,
            });
        }

        if (!lmsResult.success) {
            // LMS did not approve — DO NOT update our DB
            return res.status(400).json({
                message: "LMS did not approve this payment",
                lmsResponse: lmsResult.raw,
            });
        }

        //3) LMS approved → mark approved in DB
        payment.approved = true;
        payment.approved_by =
             req.user?.id || req.user?.username || null;

        await repo.save(payment);

        return res.json({
            message: "Payment approved successfully",
            data: {
                id: payment.id,
                approved: payment.approved,
                approved_by: payment.approved_by,
            },
        });
    } catch (err) {
        console.error("Approve payment error:", err);
        res.status(500).json({ message: "Error approving payment", error: err.message });
    }
});
router.get("/collection/:id/receipt", authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { partner } = req.query;

        if (!partner || !REPO_MAP[partner]) {
            return res.status(400).json({ message: "Invalid or missing partner" });
        }

        const { repo } = REPO_MAP[partner];

        const payment = await repo.findOne({ where: { id } });

        if (!payment) {
            return res.status(404).json({ message: "Payment not found" });
        }

        if (!payment.approved) {
            return res
                .status(400)
                .json({ message: "Payment is not approved. Cannot generate receipt." });
        }

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
            const suffix = day === 1 || day === 21 || day === 31 ? "st" :
                day === 2 || day === 22 ? "nd" :
                    day === 3 || day === 23 ? "rd" : "th";
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
            margins: { top: 50, bottom: 60, left: 50, right: 50 }
        });

        // Headers for download
        const fileName = `receipt_${loanId || id}.pdf`;
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader(
            "Content-Disposition",
            `attachment; filename="${fileName}"`
        );

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

        doc
            .font("Helvetica")
            .fontSize(10)
            .text(certificationText, {
                align: "left",
                lineGap: 2
            });

        doc.moveDown(4);


        let tableY = doc.y + 20;

        // Title
        doc
            .font("Helvetica-Bold")
            .fontSize(12)
            .text("Payment Details", 50, tableY);

        tableY += 25;

        // Horizontal Table
        tableY = drawHorizontalTable(doc, tableY, [
            { label: "Customer", value: customerName },
            { label: "Loan ID", value: loanId },
            { label: "Payment Date", value: paymentDateStr },
            { label: "Mode", value: paymentMode },
            { label: "Transaction ID", value: txnId || "N/A" },
            { label: "Amount Paid", value: amountFormatted }
        ]);

        doc.moveDown(2);


        // Move cursor after table
        doc.moveDown(2);


        // --- Footer note (centered, italics) ---
        doc
            .font("Helvetica-Oblique")
            .fontSize(8)
            .text(
                "*This is system generated letter and not require signature*",
                50,
                doc.y,
                {
                    align: "center",
                    width: 495
                }
            );

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
                    lineGap: 1   // Optional: make spacing tighter
                }
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
