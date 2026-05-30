// src/routes/auth.js
import { Router } from 'express';
import AppDataSource from '../config/database.js';
import User from '../entities/User.js';
import OTP from '../entities/OTP.js';
import jwt from 'jsonwebtoken';
import CustomerService from '../service/customerService.js';
import { PRODUCT_MAP, normalizeProductKey, sendSms } from '../utils/index.js';

const router = Router();
const userRepository = AppDataSource.getRepository(User);
const otpRepository = AppDataSource.getRepository(OTP);

const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

function parsePermissions(value) {
  if (Array.isArray(value)) return value;
  if (!value) return [];

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function resolveLoginProduct(requestedProduct, permissions, role) {
  const permittedProducts = permissions
    .map(normalizeProductKey)
    .filter((key) => PRODUCT_MAP[key]);

  const requestedKey = normalizeProductKey(requestedProduct);

  if (requestedKey) {
    if (!PRODUCT_MAP[requestedKey]) {
      return { error: 'Invalid product' };
    }

    if (role !== 'ADMIN' && permittedProducts.length && !permittedProducts.includes(requestedKey)) {
      return { error: 'Product not allowed for this user', status: 403 };
    }

    return { productKey: requestedKey };
  }

  return { productKey: permittedProducts.length === 1 ? permittedProducts[0] : '' };
}

async function findLatestCustomerOtp(mobile) {
  return otpRepository.findOne({
    where: { mobile },
    order: { createdAt: 'DESC' },
  });
}

const customerAuthRouter = Router();

customerAuthRouter.post('/send-otp', async (req, res) => {
  try {
    const { mobile, product } = req.body;
    console.log('Received OTP request for mobile:', mobile, product);
    if (!mobile) return res.status(400).json({ success: false, message: 'Mobile number is required' });
    if (!/^\d{10}$/.test(mobile)) return res.status(400).json({ success: false, message: 'Invalid mobile number format' });

    const customer = await CustomerService.findCustomerByMobileAcrossProducts(mobile, product);
    if (!customer) return res.status(404).json({ success: false, message: 'Customer not found with this mobile number' });

    const productKey = customer.productKey;

    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    await otpRepository.save({ mobile, otp, product: productKey, expiresAt });
    console.log(otp);
    try {
    await sendSms(mobile, `OTP for mobile number verification is ${otp}. Do not share this OTP with anyone. Thanks & Regards Fintree Finance Private Limited:`);
    } catch (smsError) {
      console.error('Error sending OTP SMS:', smsError);
      return res.status(500).json({ success: false, message: 'Failed to send OTP SMS' });
    }
    console.log(customer)
    return res.status(200).json({ success: true, message: 'OTP sent successfully' });
  } catch (error) {
    console.error('Error in send-otp:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

customerAuthRouter.post('/login', async (req, res) => {
  try {
    const { mobile, otp, product } = req.body;
    if (!mobile || !otp) return res.status(400).json({ success: false, message: 'Mobile and OTP are required' });

    const storedOtp = await findLatestCustomerOtp(mobile);
    if (!storedOtp) return res.status(400).json({ success: false, message: 'OTP not requested or expired' });
    if (new Date() > new Date(storedOtp.expiresAt)) {
      await otpRepository.delete(storedOtp.id);
      return res.status(400).json({ success: false, message: 'OTP expired' });
    }
    if (storedOtp.otp !== otp) return res.status(400).json({ success: false, message: 'Invalid OTP' });

    await otpRepository.delete(storedOtp.id);

    const storedProductKey = normalizeProductKey(storedOtp.product);
    const customer = await CustomerService.findCustomerByMobileAcrossProducts(mobile, storedProductKey || product);
    if (!customer) return res.status(404).json({ success: false, message: 'Customer not found' });

    const productKey = customer.productKey || storedProductKey;

    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET environment variable is not set');
    }
    const token = jwt.sign(
      { customerId: customer.customerId,lanId:customer?.lan, role: 'CUSTOMER', mobile: customer.mobile, product: productKey },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    console.log('Generated token:', token);
    console.log('Token segments:', token.split('.').length);
    console.log('JWT_SECRET length:', process.env.JWT_SECRET ? process.env.JWT_SECRET.length : 'undefined');
    return res.status(200).json({ success: true, token, customerId: customer.customerId, lanId: customer.lan, role: 'CUSTOMER', product: productKey });
  } catch (error) {
    console.error('Error in login:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.use('/customer', customerAuthRouter);

// Helper: Validate coordinates
const isValidCoordinate = (lat, lon) => {
  if (lat === null || lon === null) return true; // Allow null if geolocation unavailable
  return lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180;
};

// Initialize database if needed
const initializeDataSource = async (res) => {
  if (!AppDataSource.isInitialized) {
    try {
      await AppDataSource.initialize();
    } catch (err) {
      console.error('TypeORM init error:', err);
      return res.status(500).json({ message: 'Database not initialized' });
    }
  }
};

router.post('/register', async (req, res) => {
  await initializeDataSource(res);

  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email, and password are required' });
    }

    const existingUser = await userRepository.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // In production, hash password with bcrypt
    const userRole = role && ['RM', 'ADMIN'].includes(role) ? role : 'RM';
    const user = userRepository.create({ name, email, password, role: userRole });
    const result = await userRepository.save(user);

    return res.status(201).json({ message: 'User registered successfully', userId: result.id });
  } catch (err) {
    console.error('Error in /auth/register:', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

router.post('/login', async (req, res) => {

  try {
    const { email, password,timestamp, product } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password required' });
    }
    // if (!isValidCoordinate(latitude, longitude)) {
    //   return res.status(400).json({ message: 'Invalid latitude or longitude' });
    // }
    // if (timestamp && isNaN(new Date(timestamp).getTime())) {
    //   return res.status(400).json({ message: 'Invalid timestamp format' });
    // }

    const user = await userRepository.findOne({ where: { email } });
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }

    // In production, use bcrypt.compare
    if (password !== user.password) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const permissions = parsePermissions(user.permissions);
    const { productKey, error, status } = resolveLoginProduct(product, permissions, user.role);

    if (error) {
      return res.status(status || 400).json({ message: error });
    }

    // Store AuthEvent for valid credentials
    // const authEvent = authEventRepository.create({
    //   user,
    //   action: 'login',
    //   latitude: latitude ?? null,
    //   longitude: longitude ?? null,
    //   timestamp: timestamp ? new Date(timestamp) : new Date(),
    // });
    // await authEventRepository.save(authEvent);

    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET environment variable is not set');
    }
    const tokenPayload = {
      id: user.id,
      role: user.role,
      permissions,
      dealer: user.dealer,
    };

    if (productKey) {
      tokenPayload.product = productKey;
    }

    const token = jwt.sign(tokenPayload, process.env.JWT_SECRET, {
      expiresIn: '7d',
    });

    res.json({
      message: 'Login successful',
      token,
      product: productKey || null,
      user: { id: user.id, name: user.name, role: user.role, permissions, dealer:user.dealer, product: productKey || null },
    });
  } catch (err) {
    console.error('Error in /auth/login:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/logout', async (req, res) => {
  await initializeDataSource(res);

  try {
    const { latitude, longitude, timestamp } = req.body;
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    if (!isValidCoordinate(latitude, longitude)) {
      return res.status(400).json({ message: 'Invalid latitude or longitude' });
    }
    if (timestamp && isNaN(new Date(timestamp).getTime())) {
      return res.status(400).json({ message: 'Invalid timestamp format' });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(403).json({ message: 'Invalid token' });
    }

    const user = await userRepository.findOne({ where: { id: decoded.id } });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // const authEvent = authEventRepository.create({
    //   user,
    //   action: 'logout',
    //   latitude: latitude ?? null,
    //   longitude: longitude ?? null,
    //   timestamp: timestamp ? new Date(timestamp) : new Date(),
    // });
    // await authEventRepository.save(authEvent);

    res.json({ message: 'Logout successful' });
  } catch (err) {
    console.error('Error in /auth/logout:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Optional: Fetch auth events
// router.get('/auth-events', async (req, res) => {
//   await initializeDataSource(res);

//   try {
//     const token = req.headers.authorization?.split(' ')[1];
//     if (!token) {
//       return res.status(401).json({ message: 'No token provided' });
//     }

//     let decoded;
//     try {
//       decoded = jwt.verify(token, process.env.JWT_SECRET);
//     } catch (err) {
//       return res.status(403).json({ message: 'Invalid token' });
//     }

//     const events = await authEventRepository.find({
//       where: { user: { id: decoded.id } },
//       order: { createdAt: 'DESC' },
//     });

//     res.json({ message: 'Events retrieved', events });
//   } catch (err) {
//     console.error('Error in /auth/auth-events:', err);
//     res.status(500).json({ message: 'Server error' });
//   }
// });

export default router;
