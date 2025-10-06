import { Router } from 'express';
import AppDataSource from '../config/database.js';
import User from '../entities/User.js';  
import { authenticateToken } from '../middleware/auth.js';
import paymentsDetails from '../entities/paymentsDetails.js';
import Repossession from '../entities/Repossession.js';
import Embifi from '../entities/Embifi.js';

const router = Router();

const userRepo = AppDataSource.getRepository(User);
const paymentRepo=AppDataSource.getRepository(paymentsDetails);
const repossessionRepo=AppDataSource.getRepository(Repossession);
const embifiRepo=AppDataSource.getRepository(Embifi)
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
router.get('/getUsers', async (req, res) => {
  try {
    const users = await userRepo.find({
    });
    console.log(users);
    res.json(users); 
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ message: 'Internal server error' }); 
  }
});




export default router;
