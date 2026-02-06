import { Router } from 'express';
import AppDataSource from '../config/database.js';
import User from '../entities/User.js';  


const router = Router();

const userRepo = AppDataSource.getRepository(User);
// GET all users
router.get('/getUser', async (req, res) => {
  try {
    const users = await userRepo.find({
      select: ["name"]  
    });
    
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
   
    res.json(users); 
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ message: 'Internal server error' }); 
  }
});




export default router;
