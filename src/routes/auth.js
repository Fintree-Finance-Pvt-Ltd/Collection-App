import { Router } from 'express';
import AppDataSource from '../config/database.js';
// auth.js (ESM compatible)
import User from '../entities/User.js'; // include extension in ESM
import jwt from 'jsonwebtoken';

const router = Router();
const userRepository = AppDataSource.getRepository(User);

router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email, and password are required' });
    }

    const existingUser = await userRepository.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

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
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password required' });
    }

    const user = await userRepository.findOne({ where: { email } });
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }

    if (password !== user.password) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

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

export default router;