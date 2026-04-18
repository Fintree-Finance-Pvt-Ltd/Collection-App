import express from 'express';
import lms from '../config/database2.js';
import AppDataSource from '../config/database.js';
import { createEasyCollectLink, generateMerchantTxn } from '../service/easyCollectService.js';
import { PRODUCT_MAP } from '../utils/index.js';
import DigitalPaymentLogs from '../entities/DigitalPayments.js';
import { authenticateToken } from '../middleware/auth.js';
const router = express.Router();
const digitalPaymentLogsRepo = AppDataSource.getRepository(DigitalPaymentLogs);
import {sendPaymentToLms} from '../utils/index.js';

const allowProducts = ["malhotra","embifi"]
router.post('/easebuzz/collect', authenticateToken, async (req, res) => {
  try {
    const { emiId, product } = req.body;
    
    if (!emiId || !product) {
      return res.status(400).json({
        success: false,
        error: 'emiId and product are required',
      });
    }
    console.log("collection initiated")
    console.log(emiId,product)
    const key = String(product).toLowerCase();
    console.log("Collection initiated → Product:", product, "| Cleaned key:", key);
    if(!allowProducts.includes(key)){
      console.log("product is not allowed",key)
      return res.status(400).json({
        success: false,
        error: 'product not allowed for collection',
      });
    }
    const mapping = PRODUCT_MAP[key];

    if (!mapping?.table || !mapping?.manual?.table) {
      return res.status(400).json({
        success: false,
        error: 'invalid product mapping',
      });
    }

    const emiRows = await lms.query(
      `SELECT * FROM ${mapping.manual.table} WHERE id = ? LIMIT 1`,
      [emiId]
    );

    const emiData = emiRows?.[0];

    if (!emiData) {
      return res.status(404).json({
        success: false,
        error: 'EMI data not found',
      });
    }

    const amount = Number(emiData.remaining_emi);

    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'invalid remaining EMI amount',
      });
    }

    const loanRows = await lms.query(
      `SELECT * FROM ${mapping.table} WHERE lan = ? LIMIT 1`,
      [emiData.lan]
    );

    const loan = loanRows?.[0];

    if (!loan) {
      return res.status(404).json({
        success: false,
        error: 'loan not found',
      });
    }

    const customerName =
      loan?.customer_name ||
      loan?.name ||
      loan?.full_name ||
      'Customer';

    const customerPhone =
      loan?.mobile_number ||
      loan?.phone ||
      loan?.mobile ||
      loan?.mobile_no;

    const customerEmail =
      loan?.email ||
      loan?.customer_email ||
      '';

    if (!customerPhone) {
      return res.status(400).json({
        success: false,
        error: 'customer phone number not found',
      });
    }

    const merchantTxn = generateMerchantTxn('COLL');

    const result = await createEasyCollectLink({
      name: customerName,
      phone: String(customerPhone),
      email: String(customerEmail),
      amount: amount.toFixed(2),
      merchant_txn: merchantTxn,
      message: `Payment collection for EMI ${emiId}`,
      udf1: String(emiId),
      udf2: String(loan?.lan || ''),
      udf3: String(product),
      udf4: '',
      udf5: '',
      operation: [
        { type: 'sms', template: 'Default sms template' },
        { type: 'email', template: 'Default email template' },
      ],
    });

    await digitalPaymentLogsRepo.save({
      provider: 'easebuzz',
      module: 'collection',
      eventType: 'create_link',
      direction: 'outbound',
      status: result.success ? 'created' : 'failed',
      referenceId: merchantTxn,
      externalReferenceId: result?.data?.id ? String(result.data.id) : null,
      lan: String(loan?.lan || ''),
      emiId: String(emiId),
      customerName: String(customerName),
      email: String(customerEmail || ''),
      phone: String(customerPhone),
      amount: amount.toFixed(2),
      currency: 'INR',
      message: result?.message || null,
      source: 'easebuzz-create-link',
      httpMethod: 'POST',
      endpoint: '/easycollect/v1/create',
      httpStatusCode: result.success ? 200 : 400,
      requestPayload: {
        emiId,
        product,
        merchantTxn,
      },
      responsePayload: result.raw || result,
      meta: {
        paymentUrl: result?.data?.payment_url || null,
      },
    });

    return res.status(result.success ? 200 : 400).json({
      success: result.success,
      message: result.message,
      merchant_txn: merchantTxn,
      payment_url: result?.data?.payment_url || null,
      status: result.success ? 'created' : 'failed',
    });
  } catch (error) {
    console.error('[Collection] easycollect error', {
      error: error.message,
    });

    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
    });
  }
});

router.get('/easebuzz/payment-status/:merchantTxn', authenticateToken, async (req, res) => {
  try {
    const { merchantTxn } = req.params;

    if (!merchantTxn) {
      return res.status(400).json({
        success: false,
        error: 'merchantTxn is required',
      });
    }

    const log = await digitalPaymentLogsRepo.findOne({
      where: {
        provider: 'easebuzz',
        referenceId: merchantTxn,
      },
      order: {
        id: 'DESC',
      },
    });

    if (!log) {
      return res.status(404).json({
        success: false,
        error: 'payment record not found',
      });
    }

    const status = String(log.status || '').toLowerCase();

    return res.status(200).json({
      success: true,
      merchant_txn: log.referenceId,
      external_reference_id: log.externalReferenceId,
      status,
      payment_done: status === 'success',
      amount: log.amount,
      customer_name: log.customerName,
      phone: log.phone,
      email: log.email,
      lan: log.lan,
      emiId: log.emiId,
      payment_url: log?.meta?.paymentUrl || null,
      message: log.message || null,
      updated_at: log.updatedAt,
      created_at: log.createdAt,
    });
  } catch (error) {
    console.error('[Payment status] error', error.message);

    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
    });
  }
});

router.post('/easebuzz/webhook', async (req, res) => {
  try {
    const body = req.body || {};
    console.log('raw body parsed:', body);

    const merchantTxn = 
      body.merchant_txn || 
      body.txnid || 
      body.referenceId || 
      null;

    const easebuzzId = 
      body.easebuzzid || 
      body.payment_id || 
      body.transaction_id || 
      body.easepayid || null;   // added easepayid

    const paymentStatus = String(body.status || '').toLowerCase();
    let normalizedStatus = 'received';

    if (['success', 'successful', 'captured', 'paid'].includes(paymentStatus)) {
      normalizedStatus = 'success';
    } else if (['failure', 'failed', 'error'].includes(paymentStatus)) {
      normalizedStatus = 'failed';
    } else if (['pending', 'processing'].includes(paymentStatus)) {
      normalizedStatus = 'processing';
    }

    // === Log Handling ===
    const existingLog = merchantTxn
      ? await digitalPaymentLogsRepo.findOne({
          where: { referenceId: merchantTxn },
          order: { id: 'DESC' },
        })
      : null;

    if (existingLog) {
      await digitalPaymentLogsRepo.update(existingLog.id, {
        status: normalizedStatus,
        externalReferenceId: easebuzzId ? String(easebuzzId) : existingLog.externalReferenceId,
        message: body.error_Message || body.message || existingLog.message,
        responsePayload: body,
        meta: {
          ...(existingLog.meta || {}),
          webhookReceived: true,
          webhookStatus: paymentStatus,
          udf1: body.udf1 || null,
          udf2: body.udf2 || null,
        },
      });
    } else {
      await digitalPaymentLogsRepo.save({
        provider: 'easebuzz',
        module: 'collection',
        eventType: 'webhook',
        direction: 'inbound',
        status: normalizedStatus,
        referenceId: merchantTxn,
        externalReferenceId: easebuzzId ? String(easebuzzId) : null,
        lan: body.udf2 || null,
        emiId: body.udf1 || null,
        customerName: body.firstname || body.name || null,   // ← Fixed
        email: body.email || null,
        phone: body.phone || null,
        amount: body.amount ? Number(body.amount) : null,
        currency: 'INR',
        message: body.error_Message || body.message || null,
        source: 'easebuzz-webhook',
        httpMethod: req.method,
        endpoint: req.originalUrl,
        httpStatusCode: 200,
        requestHeaders: req.headers,
        requestPayload: body,
        responsePayload: body,
        meta: { webhookReceived: true },
      });
    }

    // ==================== FIXED PAYMENT OBJECT ====================
    const payment = {
      loanId: body.udf2 || null,
      bankDate: body.addedon ? body.addedon.split(' ')[0] : null,
      bankUtr: body.bank_ref_num || null,
      paymentDate: body.addedon ? body.addedon.split(' ')[0] : null,
      paymentRef: body.bank_ref_num || body.txnid || null,
      paymentMode: body.mode || 'UPI',
      amount: body.amount ? Number(body.amount) : 0,
    };

    const partner = {
      name: body.firstname || body.name || 'Easebuzz',
    };

    console.log("🚀 Sending to LMS:", payment);

    const result = await sendPaymentToLms(partner, payment);
    console.log("result",result)
    if (result.success) {
      console.log("✅ SUCCESS: Payment successfully updated in LMS", {
        loanId: payment.loanId,
        utr: payment.bankUtr,
        amount: payment.amount,
        lmsResponse: result.raw || result
      });
    } else {
      console.error("❌ FAILED: Payment NOT updated in LMS", {
        loanId: payment.loanId,
        utr: payment.bankUtr,
        amount: payment.amount,
        reason: result.error || result.raw || "Unknown error from LMS",
        fullResponse: result.raw || result
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Webhook processed and payment sent to LMS',
      lmsStatus: result.success,
    });
  } catch (error) {
    console.error('[Easebuzz webhook] error:', error.message);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
    });
  }
});

export default router;