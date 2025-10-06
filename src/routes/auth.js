// src/routes/auth.js
import { Router } from 'express';
import AppDataSource from '../config/database.js';
import User from '../entities/User.js';
import AuthEvent from '../entities/AuthEvent.js';
import jwt from 'jsonwebtoken';

const router = Router();
const userRepository = AppDataSource.getRepository(User);
// const authEventRepository = AppDataSource.getRepository(AuthEvent);

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
    const { email, password,timestamp } = req.body;

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

    // Store AuthEvent for valid credentials
    // const authEvent = authEventRepository.create({
    //   user,
    //   action: 'login',
    //   latitude: latitude ?? null,
    //   longitude: longitude ?? null,
    //   timestamp: timestamp ? new Date(timestamp) : new Date(),
    // });
    // await authEventRepository.save(authEvent);

    const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, {
      expiresIn: '2h',
    });

    res.json({
      message: 'Login successful',
      token,
      user: { id: user.id, name: user.name, role: user.role },
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