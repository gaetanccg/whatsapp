import express from 'express';
import { getAllUsers, getUserById, searchUsers, getProfile, updateProfile, deleteProfile,
         addContact, removeContact, listContacts, blockContact, unblockContact, listBlockedUsers } from '../controllers/userController.js';
import { protect } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.get('/', protect, getAllUsers);
router.get('/search', protect, searchUsers);
router.get('/profile', protect, getProfile);
router.put('/profile', protect, updateProfile);
router.delete('/profile', protect, deleteProfile);
router.get('/contacts', protect, listContacts);
router.post('/contacts/:id', protect, addContact);
router.delete('/contacts/:id', protect, removeContact);
router.post('/contacts/:id/block', protect, blockContact);
router.delete('/contacts/:id/block', protect, unblockContact);
router.get('/blocked', protect, listBlockedUsers);
router.get('/:id', protect, getUserById);

export default router;
