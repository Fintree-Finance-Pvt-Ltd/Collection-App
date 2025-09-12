import { Router } from 'express';
import AppDataSource from '../config/database.js';
import User from '../entities/User.js';  
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

const userRepo = AppDataSource.getRepository(User);

// GET all users
router.get('/getUser', async (req, res) => {
  try {
    const users = await userRepo.find({
      select: ["name"]  
    });
    console.log(users);
    res.json(users); 
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ message: 'Internal server error' }); 
  }
});

export default router;
