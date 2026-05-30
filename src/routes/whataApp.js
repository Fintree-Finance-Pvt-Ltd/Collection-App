import { Router } from "express";
import axios from "axios";
import AppDataSource from "../config/database2.js";
import { PRODUCT_MAP, normalizeProductKey } from "../utils/index.js";
import { authenticateToken } from "../middleware/auth.js";

const router = Router();

const RAPBOOSTER_API_URL = process.env.RAPBOOSTER_API_URL;
const RAPBOOSTER_AUTH_KEY = process.env.RAPBOOSTER_AUTH_KEY;
const RAPBOOSTER_CHANNEL_ID = process.env.RAPBOOSTER_CHANNEL_ID;

const MESSAGE_TEMPLATE = `Dear Customer, please use our Collection App to manage your loan payments and stay updated. Download it now: https://play.google.com/store/apps/details?id=com.collectionApp - Fintree Finance Pvt Ltd.`;

function cleanMobile(mobile) {
  if (!mobile) return null;
  const digits = String(mobile).replace(/\D/g, "");
  if (digits.length === 10) return `91${digits}`;
  if (digits.length === 12 && digits.startsWith("91")) return digits;
  if (digits.length === 11 && digits.startsWith("1")) return `91${digits.slice(1)}`;
  return digits.length >= 10 ? digits : null;
}

router.get("/finCollect-ad", authenticateToken, async (req, res) => {
  try {
    const { product } = req.query;
    const productKey = req.product || normalizeProductKey(product);

    if (!productKey) {
      return res.status(400).json({ success: false, message: "Product is required in authenticated request" });
    }

    console.log(productKey)
    const config = PRODUCT_MAP[productKey];

    if (!config) {
      return res.status(400).json({ success: false, message: `Invalid product: ${productKey}` });
    }

    if (!RAPBOOSTER_AUTH_KEY || !RAPBOOSTER_CHANNEL_ID || !RAPBOOSTER_API_URL) {
      return res.status(500).json({
        success: false,
        message: "RapBooster API authKey, channelId or API URL is not configured in environment variables",
      });
    }

    const table = config.table;
    const mobileCol = config.cols?.mobileNumber || "mobile_number";

    const rows = await AppDataSource.query(
      `SELECT DISTINCT \`${mobileCol}\` AS mobile FROM \`${table}\` WHERE \`${mobileCol}\` IS NOT NULL AND \`${mobileCol}\` != ''`
    );

    if (!rows || rows.length === 0) {
      return res.status(404).json({ success: false, message: "No mobile numbers found for this product" });
    }

    const results = [];
    let successCount = 0;
    let failureCount = 0;

    for (const row of rows) {
      const cleanedMobile = cleanMobile(row.mobile);
      if (!cleanedMobile) {
        results.push({ mobile: row.mobile, status: "skipped", reason: "Invalid mobile number" });
        failureCount++;
        continue;
      }

      const formData = new URLSearchParams();
      formData.append("channelId", RAPBOOSTER_CHANNEL_ID);
      formData.append("mobile", cleanedMobile);
      formData.append("msg", MESSAGE_TEMPLATE);

      try {
        const response = await axios.post(
          `${RAPBOOSTER_API_URL}?authKey=${RAPBOOSTER_AUTH_KEY}`,
          formData.toString(),
          {
            headers: {
              "Content-Type": "application/x-www-form-urlencoded",
            },
            timeout: 30000,
          }
        );

        console.log(`Successfully sent WhatsApp message to ${cleanedMobile}`);
        results.push({ mobile: cleanedMobile, status: "sent", data: response.data });
        successCount++;
      } catch (error) {
        const errorMessage = error.response?.data?.message || error.message;
        console.error(`Failed to send WhatsApp message to ${cleanedMobile}:`, errorMessage);
        results.push({ mobile: cleanedMobile, status: "failed", error: errorMessage });
        failureCount++;
      }
    }

    return res.status(200).json({
      success: true,
      message: `WhatsApp messages processed. Success: ${successCount}, Failed: ${failureCount}`,
      total: rows.length,
      successCount,
      failureCount,
      results,
    });
  } catch (error) {
    console.error("Error in WhatsApp bulk send:", error);
    return res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
});

export default router;

