// // routes/repossession.js
// import { Router } from 'express';
// import { fileURLToPath } from 'url';
// import path from 'path';
// import fs from 'fs/promises'; // Using fs/promises for async operations

// import { upload } from '../utils/upload.js';
// import AppDataSource from '../config/database.js';
// import { authenticateToken } from '../middleware/auth.js';
// import EmbifiRepossession from '../entities/EmbifiRepossession.js';
// import EmbifiRepoPhoto from '../entities/EmbifiRepoPhoto.js';
// import MalhotraRepossession from '../entities/malhotraRepossession.js'; // Assuming this entity exists
// import MalhotraRepoPhoto from '../entities/malhotraRepoPhoto.js'; // Assuming this entity exists

// const router = Router();

// function ensureArray(val) {
//   if (val === undefined || val === null) return [];
//   if (Array.isArray(val)) return val;
//   return typeof val === 'string' ? [val] : [];
// }

// router.post(
//   '/repossession',
//   authenticateToken,
//   upload.array('photos', 20),
//   async (req, res) => {
//     // Early validation
//     // Store the data according to the product wise which is embifi or malhotra
//     // if malhotra product then store it to malhotra if embifi then embifi
//     const files = req.files || [];
//     const {
//       partnerLoanId,
//       vehicleNumber,
//       repoReason,
//       repoPlace,
//       vehicleCondition,
//       repoDate,
//       product, // Assuming 'product' field in req.body to determine embifi or malhotra
//     } = req.body;
//     //console.log(req.body);
//     console.log(product)
//     const normalizedProduct = product?.toLowerCase().trim();
//     if (!['embifi', 'malhotra'].includes(normalizedProduct)) {
//       return res.status(400).json({ error: 'product must be "embifi" or "malhotra"' });
//     }

//     if (!partnerLoanId?.trim() && !vehicleNumber?.trim()) {
//       return res.status(400).json({ error: 'partnerLoanId or vehicleNumber required' });
//     }
//     if (!repoReason || !repoPlace || !vehicleCondition) {
//       return res.status(400).json({ error: 'repoReason, repoPlace, and vehicleCondition are required' });
//     }
//     if (!files.length) {
//       return res.status(400).json({ error: 'At least one photo is required' });
//     }
//     if (files.length > 20) {
//       return res.status(400).json({ error: 'Maximum 20 photos allowed' });
//     }

//     const labels = ensureArray(req.body['photoLabels[]'] || req.body.photoLabels);
//     const types = ensureArray(req.body['photoTypes[]'] || req.body.photoTypes);

//     const filePaths = files.map((f) => f.path).filter(Boolean); // Store paths for cleanup

//     try {
//       const savedRepo = await AppDataSource.manager.transaction(async (tx) => {
//         let repoRepo, photoRepo, RepoEntity, PhotoEntity;

//         // Set repositories and entities based on product
//         if (normalizedProduct === 'embifi') {
//           repoRepo = tx.getRepository(EmbifiRepossession);
//           photoRepo = tx.getRepository(EmbifiRepoPhoto);
//           RepoEntity = EmbifiRepossession;
//           PhotoEntity = EmbifiRepoPhoto;
//         } else { // malhotra
//           repoRepo = tx.getRepository(MalhotraRepossession);
//           photoRepo = tx.getRepository(MalhotraRepoPhoto);
//           RepoEntity = MalhotraRepossession;
//           PhotoEntity = MalhotraRepoPhoto;
//         }

//         // Create repossession entity (assuming fields are identical across entities)
//         const repo = repoRepo.create({
//           mobile: req.body.mobile,
//           panNumber: req.body.panNumber || null,
//           customerName: req.body.customerName,
//           partnerLoanId: partnerLoanId || null,
//           vehicleNumber: vehicleNumber || null,
//           makeModel: req.body.makeModel || null,
//           regNo: req.body.regNo || null,
//           chassisNo: req.body.chassisNo || null,
//           engineNo: req.body.engineNo || null,
//           batteryNo: req.body.batteryNo || null,
//           repoDate: repoDate ? new Date(repoDate) : null,
//           repoReason: repoReason || null,
//           agency: req.body.agency || null,
//           fieldOfficer: req.body.fieldOfficer || null,
//           repoPlace: repoPlace || null,
//           vehicleCondition: vehicleCondition || null,
//           inventory: req.body.inventory || null,
//           remarks: req.body.remarks || null,
//           postRemarks: req.body.postRemarks || null,
//           yardLocation: req.body.yardLocation || null,
//           yardIncharge: req.body.yardIncharge || null,
//           yardContact: req.body.yardContact || null,
//           yardReceipt: req.body.yardReceipt || null,
//           latitude: req.body.latitude ? parseFloat(req.body.latitude) : null,
//           longitude: req.body.longitude ? parseFloat(req.body.longitude) : null,
//         });

//         const saved = await repoRepo.save(repo);

//         // Batch create photo entities (assuming fields are identical across entities)
//         const photos = await Promise.all(
//           files.map(async (f, i) => {
//             const buffer = f?.buffer ?? (f?.path ? await fs.readFile(f.path) : null);
//             if (!buffer) throw new Error(`File upload missing buffer/path for ${f.originalname}`);

//             return photoRepo.create({
//               repossession: saved,
//               fileData: buffer,
//               originalName: f.originalname || null,
//               mimeType: f.mimetype || null,
//               photoType: types[i] || 'PRE',
//               label: labels[i] ?? null,
//               orderIndex: i,
//             });
//           })
//         );

//         await photoRepo.save(photos); // Batch save photos

//         return saved;
//       });

//       return res.status(201).json({ success: true, id: savedRepo.id });
//     } catch (err) {
//       console.error('Error saving repossession:', err);
//       return res.status(500).json({ error: 'Server error', details: err?.message });
//     } finally {
//       // Clean up files from disk (if using disk storage)
//       if (filePaths.length > 0) {
//         for (const filePath of filePaths) {
//           try {
//             await fs.unlink(filePath);
//           } catch (err) {
//             console.error(`Failed to delete file ${filePath}:`, err);
//           }
//         }
//       }
//     }
//   }
// );

// export default router;




// routes/repossession.js
import { Router } from "express";
import fs from "fs/promises";
import { upload } from "../utils/upload.js";
import AppDataSource from "../config/database.js";
import { authenticateToken } from "../middleware/auth.js";

import Repossession from "../entities/Repossession.js";
import RepoPhoto from "../entities/RepossessionPhoto.js";

const router = Router();

/** Ensures array format for labels/types */
function ensureArray(val) {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  return [val];
}

/* ============================================================
    CREATE A NEW REPOSSESSION ENTRY (UNIFIED TABLE)
============================================================ */
router.post(
  "/repossession",
  authenticateToken,
  upload.array("photos", 20),
  async (req, res) => {
    const files = req.files || [];
    const {
      partnerLoanId,
      vehicleNumber,
      repoReason,
      repoPlace,
      vehicleCondition,
      repoDate,
      product,
    } = req.body;

    /** ---------------- BASIC VALIDATIONS ------------------- */
    const prod = product?.toLowerCase().trim();
    if (!["embifi", "malhotra"].includes(prod)) {
      return res.status(400).json({
        error: `Invalid product. Use "embifi" or "malhotra"`,
      });
    }

    if (!partnerLoanId?.trim() && !vehicleNumber?.trim()) {
      return res.status(400).json({
        error: "partnerLoanId or vehicleNumber is required",
      });
    }

    if (!repoReason || !repoPlace || !vehicleCondition) {
      return res.status(400).json({
        error: "repoReason, repoPlace & vehicleCondition are required",
      });
    }

    if (!files.length) {
      return res.status(400).json({
        error: "At least 1 photo is required",
      });
    }

    if (files.length > 20) {
      return res.status(400).json({
        error: "Maximum 20 photos allowed",
      });
    }

    /** Extract labels & photo types */
    const labels = ensureArray(req.body["photoLabels[]"] || req.body.photoLabels);
    const types = ensureArray(req.body["photoTypes[]"] || req.body.photoTypes);
    const filePaths = files.map((f) => f.path).filter(Boolean); // cleanup later

    try {
      /** MAIN INSERT OPERATION (transaction safe) */
      const savedRepo = await AppDataSource.manager.transaction(
        async (tx) => {
          const repoRepository = tx.getRepository(Repossession);
          const photoRepository = tx.getRepository(RepoPhoto);

          /** ---------------- CREATE REPOSSESSION ROW ---------------- */
          const repoEntity = repoRepository.create({
            product: prod,
            mobile: req.body.mobile,
            customerName: req.body.customerName,
            panNumber: req.body.panNumber || null,
            partnerLoanId: partnerLoanId || null,
            vehicleNumber: vehicleNumber || null,

            makeModel: req.body.makeModel || null,
            regNo: req.body.regNo || null,
            chassisNo: req.body.chassisNo || null,
            engineNo: req.body.engineNo || null,
            batteryNo: req.body.batteryNo || null,

            repoDate: repoDate ? new Date(repoDate) : null,
            repoReason,
            agency: req.body.agency || null,
            fieldOfficer: req.body.fieldOfficer || null,
            repoPlace,
            vehicleCondition,
            inventory: req.body.inventory || null,
            remarks: req.body.remarks || null,
            postRemarks: req.body.postRemarks || null,

            yardLocation: req.body.yardLocation || null,
            yardIncharge: req.body.yardIncharge || null,
            yardContact: req.body.yardContact || null,
            yardReceipt: req.body.yardReceipt || null,

            latitude: req.body.latitude ? parseFloat(req.body.latitude) : null,
            longitude: req.body.longitude ? parseFloat(req.body.longitude) : null,
          });

          const saved = await repoRepository.save(repoEntity);

          /** ---------------- SAVE PHOTOS ---------------- */
          const photoRows = await Promise.all(
            files.map(async (f, i) => {
              const buffer =
                f.buffer ?? (f.path ? await fs.readFile(f.path) : null);

              if (!buffer) {
                throw new Error(
                  `Photo upload error: cannot read file ${f.originalname}`
                );
              }

              return photoRepository.create({
                repossessionId: saved.id,
                fileData: buffer,
                originalName: f.originalname,
                mimeType: f.mimetype,
                label: labels[i] || null,
                photoType: types[i] || "PRE",
                orderIndex: i,
              });
            })
          );

          await photoRepository.save(photoRows);
          return saved;
        }
      );

      return res.status(201).json({
        success: true,
        id: savedRepo.id,
        message: "Repossession saved successfully",
      });
    } catch (err) {
      console.error("Error saving repossession:", err);
      return res.status(500).json({
        error: "Server error",
        details: err.message,
      });
    } finally {
      /** ALWAYS CLEAN UP TEMP FILES */
      for (const fp of filePaths) {
        try {
          await fs.unlink(fp);
        } catch (_) {}
      }
    }
  }
);

export default router;
