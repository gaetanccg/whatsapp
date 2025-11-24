import express from 'express';
import { getAllUsers, getUserById, searchUsers, getProfile, updateProfile, deleteProfile } from '../controllers/userController.js';
import { protect } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.get('/', protect, getAllUsers);
router.get('/search', protect, searchUsers);
router.get('/profile', protect, getProfile);
router.put('/profile', protect, updateProfile);
router.delete('/profile', protect, deleteProfile);
router.get('/:id', protect, getUserById);

export default router;
