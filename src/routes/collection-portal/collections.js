// src/routes/web/collection.js
import { Router } from "express";
import AppDataSource from "../../config/database.js";

import embifiReceipt from "../../entities/embifiReceipt.js";
import malhotraReceipt from "../../entities/malhotraReceipt.js";

import embifiImage from "../../entities/embifiImage.js";
import malhotraImage from "../../entities/malhotraImage.js";

const router = Router();

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
router.get("/collection", async (req, res) => {
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

        if (!REPO_MAP[partner]) {
            return res.status(400).json({ message: "Invalid partner selected" });
        }

        const { repo } = REPO_MAP[partner];
        const skip = (page - 1) * limit;

        let qb = repo
            .createQueryBuilder("p")
            .leftJoin("malhotra_images", "img", "img.paymentId = p.id") // works because table exists
            .select([
                "p.id AS id",
                "p.customerName AS customerName",
                "p.vehicleNumber AS vehicleNumber",
                "p.contactNumber AS contactNumber",
                "p.paymentDate AS paymentDate",
                "p.paymentMode AS paymentMode",
                "p.paymentRef AS paymentRef",
                "p.amount AS amount",
                "p.collectedBy AS collectedBy",
                "p.createdAt AS createdAt",

                // Flags only — NO BLOB
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

        // ---------------- Count ----------------
        const total = await qb.getCount();

        // ---------------- Paginated Records ----------------
        const rows = await qb
            .orderBy("p.createdAt", "DESC")
            .offset(skip)
            .limit(limit)
            .getRawMany();

        // Add status logic
        const formatted = rows.map(r => {
            const isCash = (r.paymentMode || "").toLowerCase() === "cash";
            const status = isCash && !r.image2Present ? "Incomplete" : "Completed";
            return { ...r, status };
        });

        res.json({
            partner,
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


export default router;
