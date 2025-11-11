import express from 'express';
import { getMessages, sendMessage } from '../controllers/messageController.js';
import { protect } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.get('/:conversationId', protect, getMessages);
router.post('/', protect, sendMessage);

export default router;
