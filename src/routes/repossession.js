// routes/repossession.js
import { Router } from 'express';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs/promises'; // Using fs/promises for async operations

import { upload } from '../utils/upload.js';
import AppDataSource from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';
import Repossession from '../entities/Repossession.js';
import RepossessionPhoto from '../entities/RepossessionPhoto.js';


const router = Router();

function ensureArray(val) {
  if (val === undefined || val === null) return [];
  if (Array.isArray(val)) return val;
  return typeof val === 'string' ? [val] : [];
}

router.post(
  '/repossession',
  authenticateToken,
  upload.array('photos', 20),
  async (req, res) => {
    // Early validation
 
    const files = req.files || [];
    const {
      partnerLoanId,
      vehicleNumber,
      repoReason,
      repoPlace,
      vehicleCondition,
      repoDate,
    } = req.body;
   console.log(req.body)
    if (!partnerLoanId?.trim() && !vehicleNumber?.trim()) {
      return res.status(400).json({ error: 'partnerLoanId or vehicleNumber required' });
    }
    if (!repoReason || !repoPlace || !vehicleCondition) {
      return res.status(400).json({ error: 'repoReason, repoPlace, and vehicleCondition are required' });
    }
    if (!files.length) {
      return res.status(400).json({ error: 'At least one photo is required' });
    }
    if (files.length > 20) {
      return res.status(400).json({ error: 'Maximum 20 photos allowed' });
    }
   const labels = ensureArray(req.body['photoLabels[]'] || req.body.photoLabels);
    const types = ensureArray(req.body['photoTypes[]'] || req.body.photoTypes);


    const filePaths = files.map((f) => f.path).filter(Boolean); // Store paths for cleanup

    try {
      const savedRepo = await AppDataSource.manager.transaction(async (tx) => {
        const repoRepo = tx.getRepository(Repossession);
        const photoRepo = tx.getRepository(RepossessionPhoto);

        // Create repossession entity
        const repo = repoRepo.create({
          mobile: req.body.mobile,
          panNumber: req.body.panNumber || null,
          customerName: req.body.customerName,
          partnerLoanId: partnerLoanId || null,
          vehicleNumber: vehicleNumber || null,
          makeModel: req.body.makeModel || null,
          regNo: req.body.regNo || null,
          chassisNo: req.body.chassisNo || null,
          engineNo: req.body.engineNo || null,
          batteryNo: req.body.batteryNo || null,
          repoDate: repoDate ? new Date(repoDate) : null,
          repoReason: repoReason || null,
          agency: req.body.agency || null,
          fieldOfficer: req.body.fieldOfficer || null,
          repoPlace: repoPlace || null,
          vehicleCondition: vehicleCondition || null,
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

        const saved = await repoRepo.save(repo);

        // Batch create photo entities
        const photos = await Promise.all(
          files.map(async (f, i) => {
            const buffer = f?.buffer ?? (f?.path ? await fs.readFile(f.path) : null);
            if (!buffer) throw new Error(`File upload missing buffer/path for ${f.originalname}`);

            return photoRepo.create({
              repossession: saved,
              fileData: buffer,
              originalName: f.originalname || null,
              mimeType: f.mimetype || null,
              photoType: types[i] || 'PRE',
              label: labels[i] ?? null,
              orderIndex: i,
            });
          })
        );

        await photoRepo.save(photos); // Batch save photos

        return saved;
      });

      return res.status(201).json({ success: true, id: savedRepo.id });
    } catch (err) {
      console.error('Error saving repossession:', err);
      return res.status(500).json({ error: 'Server error', details: err?.message });
    } finally {
      // Clean up files from disk (if using disk storage)
      if (filePaths.length > 0) {
        for (const filePath of filePaths) {
          try {
            await fs.unlink(filePath);
          } catch (err) {
            console.error(`Failed to delete file ${filePath}:`, err);
          }
        }
      }
    }
  }
);

export default router;