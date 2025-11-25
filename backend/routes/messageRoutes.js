import express from 'express';
import { getMessages, sendMessage, editMessage, deleteMessage, reactToMessage } from '../controllers/messageController.js';
import { protect } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.get('/:conversationId', protect, getMessages);
router.post('/', protect, sendMessage);
router.put('/edit', protect, editMessage);
router.delete('/:messageId', protect, deleteMessage);
router.post('/react', protect, reactToMessage);

export default router;
