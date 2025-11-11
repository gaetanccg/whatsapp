import express from 'express';
import { getConversations, getOrCreateConversation, createGroupConversation } from '../controllers/conversationController.js';
import { protect } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.get('/', protect, getConversations);
router.post('/', protect, getOrCreateConversation);
router.post('/group', protect, createGroupConversation);

export default router;
