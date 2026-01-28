import { Router } from 'express';
import { AppDataSource } from '../config/database.js';
import CustomerVisit from '../entities/CustomerVisit.js';

const router = Router();

router.post('/customer-visits', async (req, res) => {
  try {
    const {
      rmId,
      loanId,
      customerName,
      mobileNumber,
      lender,
      visitType,
      notPaidReason,
      latitude,
      longitude,
      selfieUri,
      visitAt,
    } = req.body;
    console.log(req.body)

    // ✅ validation
    if (!rmId || !loanId || !visitType || !selfieUri || !visitAt) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields',
      });
    }

    const repo = AppDataSource.getRepository(CustomerVisit);

    const visit = repo.create({
      rmId,
      loanId,
      customerName,
      mobileNumber,
      lender,
      visitType,
      notPaidReason,
      latitude,
      longitude,
      selfieUri,
      visitAt: new Date(visitAt),
    });

    await repo.save(visit);

    return res.status(201).json({
      success: true,
      message: 'Customer visit stored successfully',
      id: visit.id,
    });
  } catch (error) {
    console.error('❌ Error saving visit:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

export default router;
