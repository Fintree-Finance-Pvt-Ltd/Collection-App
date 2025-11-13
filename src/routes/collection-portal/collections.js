import { Router } from "express";
import AppDataSource from "../../config/database.js";
import embifiReceipt from "../../entities/embifiReceipt.js";
import malhotraReceipt from "../../entities/malhotraReceipt.js";

const router = Router();

const REPO_MAP = {
    embifi: {
        repo: AppDataSource.getRepository(embifiReceipt),
        imageTable: "embifi_images",
    },
    malhotra: {
        repo: AppDataSource.getRepository(malhotraReceipt),
        imageTable: "malhotra_images",
    }
};

router.get("/collection", async (req, res) => {
    try {
        const {
            partner ,   // default Embifi
            page = 1,
            limit = 10,
            collectedBy,
            customerName,
            startDate,
            endDate,
        } = req.query;
  console.log("call api collection")
         if (!REPO_MAP[partner]) {
            return res.status(400).json({ message: "Invalid partner selected" });
        }

        const { repo, imageTable } = REPO_MAP[partner];

        const skip = (page - 1) * limit;

        let qb = repo
            .createQueryBuilder("p")
            .leftJoin(imageTable, "img", "img.paymentId = p.id")
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
                "img.image1 AS image1",
                "img.image2 AS image2"
            ]);

        // Filters
        if (collectedBy) {
            const collectors = collectedBy.split(",").map(c => c.trim());
            qb.andWhere("p.collectedBy IN (:...collectors)", { collectors });
        }

        if (customerName) {
            qb.andWhere("p.customerName LIKE :name", { name: `%${customerName}%` });
        }

        if (startDate && endDate) {
            qb.andWhere("p.paymentDate BETWEEN :s AND :e", { s: startDate, e: endDate });
        } else if (startDate) {
            qb.andWhere("p.paymentDate >= :s", { s: startDate });
        } else if (endDate) {
            qb.andWhere("p.paymentDate <= :e", { e: endDate });
        }

        // Count
        const total = await qb.getCount();

        // Paginated rows
        const rows = await qb
            .orderBy("p.createdAt", "DESC")
            .offset(skip)
            .limit(limit)
            .getRawMany();

        // Status logic
        const formatted = rows.map(r => {
            const isCash = r.paymentMode?.toLowerCase() === "cash";
            const status = isCash && !r.image2 ? "Incomplete" : "Completed";
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

export default router;
