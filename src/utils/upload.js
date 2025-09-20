import multer from "multer";
import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";

// Ensure directory exists
const ensureDir = (dir) => fs.mkdirSync(dir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const dir = path.join("uploads", "paymentsProof");
    ensureDir(dir);
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || "");
    cb(null, `${randomUUID()}${ext}`);
  },
});

const allowed = new Set(["image/jpeg", "image/png", "image/webp"]);
function fileFilter(req, file, cb) {
  if (!allowed.has(file.mimetype)) {
    return cb(new Error("Unsupported file type"));
  }
  cb(null, true);
}

export const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});