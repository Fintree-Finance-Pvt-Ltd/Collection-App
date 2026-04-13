import axios from 'axios';
import crypto from 'crypto';

const EASYCOLLECT_BASE_URL =
  process.env.EASYCOLLECT_BASE_URL;

const EASYCOLLECT_TIMEOUT = Number(process.env.EASYCOLLECT_TIMEOUT || 15000);

const easyCollectClient = axios.create({
  baseURL: EASYCOLLECT_BASE_URL,
  timeout: EASYCOLLECT_TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
});

function sha512(value) {
  return crypto.createHash('sha512').update(value).digest('hex');
}

function buildEasyCollectHash({
  key,
  merchant_txn = '',
  name = '',
  email = '',
  phone = '',
  amount = '',
  udf1 = '',
  udf2 = '',
  udf3 = '',
  udf4 = '',
  udf5 = '',
  message = '',
  salt,
}) {
  const hashString = [
    key,
    merchant_txn,
    name,
    email,
    phone,
    amount,
    udf1,
    udf2,
    udf3,
    udf4,
    udf5,
    message,
    salt,
  ].join('|');

  return sha512(hashString);
}

export function generateMerchantTxn(prefix = 'EC') {
  return `${prefix}_${Date.now()}_${Math.random()
    .toString(36)
    .slice(2, 8)
    .toUpperCase()}`;
}

export async function createEasyCollectLink({
  name,
  phone,
  amount,
  email = '',
  merchant_txn,
  message = '',
  udf1 = '',
  udf2 = '',
  udf3 = '',
  udf4 = '',
  udf5 = '',
  expiry_date = '',
  operation = [],
  update = false,
  active = true,
  token = '',
}) {
  if (!name) throw new Error('name is required');
  if (!phone) throw new Error('phone is required');
  if (!amount) throw new Error('amount is required');

  const finalMerchantTxn = merchant_txn || generateMerchantTxn();

  const payload = {
    name: String(name).trim(),
    phone: String(phone).trim(),
    amount: String(amount).trim(),
    email: String(email || '').trim(),
    merchant_txn: String(finalMerchantTxn).trim(),
    message: String(message || '').trim(),
    udf1: String(udf1 || '').trim(),
    udf2: String(udf2 || '').trim(),
    udf3: String(udf3 || '').trim(),
    udf4: String(udf4 || '').trim(),
    udf5: String(udf5 || '').trim(),
    update: Boolean(update),
    active: Boolean(active),
  };

  if (expiry_date) {
    payload.expiry_date = String(expiry_date).trim();
  }

  if (Array.isArray(operation) && operation.length > 0) {
    payload.operation = operation.map((item) => ({
      type: String(item.type || '').trim(),
      template: String(item.template || '').trim(),
    }));
  }

  if (token) {
    payload.token = String(token).trim();
  } else {
    const key = String(process.env.EASEBUZZ_KEY || '').trim();
    const salt = String(process.env.EASEBUZZ_SALT || '').trim();

    if (!key) throw new Error('Missing EASEBUZZ_KEY');
    if (!salt) throw new Error('Missing EASEBUZZ_SALT');

    payload.key = key;
    payload.hash = buildEasyCollectHash({
      key,
      merchant_txn: payload.merchant_txn,
      name: payload.name,
      email: payload.email,
      phone: payload.phone,
      amount: payload.amount,
      udf1: payload.udf1,
      udf2: payload.udf2,
      udf3: payload.udf3,
      udf4: payload.udf4,
      udf5: payload.udf5,
      message: payload.message,
      salt,
    });
  }

  try {
    console.log('EasyCollect request payload:', {
      ...payload,
      hash: payload.hash ? 'HASH_GENERATED' : undefined,
    });

    const response = await easyCollectClient.post(
      '/easycollect/v1/create',
      payload
    );

    return {
      success: Boolean(response?.data?.status),
      message: response?.data?.message || 'EasyCollect response received',
      data: response?.data?.data || null,
      raw: response?.data || null,
    };
  } catch (error) {
    const apiError = error?.response?.data || null;

    console.error('EasyCollect API error response:', apiError);

    throw new Error(
      apiError?.message ||
      apiError?.error ||
      error.message ||
      'EasyCollect create link failed'
    );
  }
}