import express from 'express';
import {
  getMessages,
  sendMessage,
  editMessage,
  deleteMessage,
  reactToMessage,
  searchMessages,
  updateMessageStatus,
  replyToMessage
} from '../controllers/messageController.js';
import { protect } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.get('/search', protect, searchMessages);
router.get('/:conversationId', protect, getMessages);
router.post('/', protect, sendMessage);
router.post('/reply', protect, replyToMessage);
router.put('/edit', protect, editMessage);
router.delete('/:messageId', protect, deleteMessage);
router.post('/react', protect, reactToMessage);
router.patch('/status', protect, updateMessageStatus);

export default router;
