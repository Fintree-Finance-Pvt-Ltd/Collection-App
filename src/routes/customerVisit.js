import { Router } from 'express';
import { AppDataSource } from '../config/database.js';
import CustomerVisit from '../entities/MyVisits.js';
import { uploadSelfie } from '../utils/myVisitUploadSelfi.js';
import {authenticateToken }from '../middleware/auth.js';

const router = Router();

/**
 * POST /my-visits
 * Create a new visit (selfie upload)
 * rmId comes from authenticated user — not from body
 */
// In your POST /my-visits route
router.post(
  '/my-visits',
  authenticateToken,
  uploadSelfie.single('selfie'),
  async (req, res) => {
    try {
      const rmId = req.user?.id; // from token

      if (!rmId) {
        return res.status(401).json({ success: false, message: 'Authentication required' });
      }

      const {
        loanId,
        customerName,
        mobileNumber,
        lender,
        visitType,
        notPaidReason,
        latitude,
        longitude,
        visitAt,
      } = req.body;

      if (!loanId || !visitType || !visitAt) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: loanId, visitType, visitAt',
        });
      }

      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'Selfie image is required',
        });
      }

      // This will now be something like:
      // /uploads/myvisits/selfies/12345/xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx.jpg
      const selfiePath = '/' + req.file.path.replace(/\\/g, '/');
  
      const repo = AppDataSource.getRepository(CustomerVisit);

      const visit = repo.create({
        rmId,                   // from token
        loanId,
        customerName: customerName || null,
        mobileNumber: mobileNumber || null,
        lender: lender || null,
        visitType,
        notPaidReason: notPaidReason || null,
        latitude: latitude ? parseFloat(latitude) : null,
        longitude: longitude ? parseFloat(longitude) : null,
        selfieUri: selfiePath,// contains rmId in path
        visitAt: new Date(visitAt),
      });

      await repo.save(visit);

      return res.status(201).json({
        success: true,
        message: 'Visit recorded successfully',
        visitId: visit.id,
        selfiePath,
      });
    } catch (error) {
      console.error('Error saving visit:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to save visit',
        error: error.message,
      });
    }
  }
);

/**
 * GET /my-visits/rm/me
 * Get all visits for the currently authenticated RM
 * Also supports ?product=xxx filter (if you add product field later)
 */
router.get(
  '/my-visits/rm/me',
  authenticateToken,
  async (req, res) => {
    try {
      const rmId = req.user?.id; // ← from authenticated user

      if (!rmId) {
        return res.status(401).json({
          success: false,
          message: 'User not authenticated or invalid token',
        });
      }

      const { product } = req.query;

      const repo = AppDataSource.getRepository(CustomerVisit);

      const queryBuilder = repo.createQueryBuilder('visit')
        .where('visit.rmId = :rmId', { rmId })
        .orderBy('visit.visitAt', 'DESC');

      // Optional: filter by product (uncomment if you add product column)
      // if (product) {
      //   queryBuilder.andWhere('visit.product = :product', { product });
      // }

      const visits = await queryBuilder.getMany();
      const total = visits.length;

      const formattedVisits = visits.map(v => ({
        id: v.id,
        rmId: v.rmId,
        loanId: v.loanId,
        customerName: v.customerName,
        mobileNumber: v.mobileNumber,
        lender: v.lender,
        visitType: v.visitType,
        notPaidReason: v.notPaidReason,
        latitude: v.latitude,
        longitude: v.longitude,
        selfieUrl: v.selfiePath,
        // selfieUrl: `${process.env.BASE_URL}${v.selfiePath}`, // optional full URL
        visitAt: v.visitAt.toISOString(),
        createdAt: v.createdAt?.toISOString(),
      }));

      return res.json({
        success: true,
        total,
        count: total,
        visits: formattedVisits,
      });
    } catch (error) {
      console.error('Error fetching RM visits:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch visits',
        error: error.message,
      });
    }
  }
);

// Optional: keep the old endpoint for admin/debug (with auth)
router.get('/my-visits/rm/:rmId', authenticateToken, async (req, res) => {
  try {
    const { rmId } = req.params;
    const currentUserId = req.user?.id;

    // Optional: only admin can see other RMs' visits
    // if (currentUserId !== rmId && !req.user.isAdmin) {
    //   return res.status(403).json({ success: false, message: 'Forbidden' });
    // }

    const { product } = req.query;

    const repo = AppDataSource.getRepository(CustomerVisit);

    const queryBuilder = repo.createQueryBuilder('visit')
      .where('visit.rmId = :rmId', { rmId })
      .orderBy('visit.visitAt', 'DESC');

    // if (product) { ... }

    const visits = await queryBuilder.getMany();
    const total = visits.length;

    const formattedVisits = visits.map(v => ({
      ...v,
      selfieUrl: v.selfiePath,
      visitAt: v.visitAt.toISOString(),
      createdAt: v.createdAt?.toISOString(),
    }));

    return res.json({
      success: true,
      total,
      count: total,
      visits: formattedVisits,
    });
  } catch (error) {
    console.error('Error fetching visits:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch visits',
    });
  }
});

export default router;