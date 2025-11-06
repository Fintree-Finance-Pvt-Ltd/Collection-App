import embifiReceipt from "../../entities/embifiReceipt.js";
import { Router } from "express";
import AppDataSource from "../../config/database.js";

const router = Router();
const embifiRepository = AppDataSource.getRepository(embifiReceipt);

router.get("/collection", async (req, res) => {
    try {
        const {
            page = 1,
            limit = 10,
            collectedBy,
            customerName,
            startDate,
            endDate,
        } = req.query;
        console.log(collectedBy)
        const skip = (page - 1) * limit;

        const baseQuery = embifiRepository
            .createQueryBuilder("p")
            .leftJoin("embifi_images", "img", "img.paymentId = p.id")
            .select([
                "p.id AS id", // 👈 include id always
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
                "img.image2 AS image2",
            ]);

        // Apply filters dynamically
        if (collectedBy) {
            const collectors = collectedBy.split(",").map((c) => c.trim());
            console.log(collectors)
            baseQuery.andWhere("p.collectedBy IN (:...collectors)", { collectors });
        }

        if (customerName) {
            baseQuery.andWhere("p.customerName LIKE :customerName", {
                customerName: `%${customerName}%`,
            });
        }

        if (startDate && endDate) {
            baseQuery.andWhere("p.paymentDate BETWEEN :startDate AND :endDate", {
                startDate,
                endDate,
            });
        } else if (startDate) {
            baseQuery.andWhere("p.paymentDate >= :startDate", { startDate });
        } else if (endDate) {
            baseQuery.andWhere("p.paymentDate <= :endDate", { endDate });
        }

        // Count total
        const total = await baseQuery.getCount();

        // Fetch paginated data
        const data = await baseQuery
            .orderBy("p.createdAt", "DESC")
            .offset(skip)
            .limit(limit)
            .getRawMany();

        // Compute status
        const result = data.map((row) => {
            const isCash = row.paymentMode?.toLowerCase() === "cash";
            const hasImage2 = !!row.image2;
            const status = isCash && !hasImage2 ? "Incomplete" : "Completed";
            return { ...row, status };
        });

        res.json({
            total,
            page: Number(page),
            limit: Number(limit),
            totalPages: Math.ceil(total / limit),
            data: result,
        });
    } catch (err) {
        console.error("Error fetching payments:", err);
        res.status(500).json({
            message: "Error fetching payments",
            error: err.message,
        });
    }
});


export default router;
