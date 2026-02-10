// utils/myVisitUploadSelfi.js
import multer from "multer";
import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";

const ensureDir = (dir) => fs.mkdirSync(dir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Get rmId from authenticated user
    const rmId = req.user?.id || req.user?.rmId || req.user?.userId;

    if (!rmId) {
      return cb(new Error("Cannot determine RM ID for file upload"));
    }

    // Folder structure: uploads/myvisits/selfies/{rmId}/
    const dir = path.join("uploads", "MyvisitsSelfies", String(rmId));
    ensureDir(dir);

    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || "");
    const filename = `${randomUUID()}${ext}`;
    cb(null, filename);
  },
});

const allowed = new Set(["image/jpeg", "image/png", "image/webp"]);

function fileFilter(req, file, cb) {
  if (!allowed.has(file.mimetype)) {
    return cb(new Error("Only JPEG, PNG and WebP images are allowed"));
  }
  cb(null, true);
}

export const uploadSelfie = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});