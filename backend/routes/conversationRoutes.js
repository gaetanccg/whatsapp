import express from 'express';
import { getConversations, getOrCreateConversation, createGroupConversation, archiveConversation, unarchiveConversation, deleteConversation } from '../controllers/conversationController.js';
import { protect } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.get('/', protect, getConversations);
router.post('/', protect, getOrCreateConversation);
router.post('/group', protect, createGroupConversation);
router.patch('/:id/archive', protect, archiveConversation);
router.patch('/:id/unarchive', protect, unarchiveConversation);
router.delete('/:id', protect, deleteConversation);

export default router;
