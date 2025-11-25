import express from 'express';
import {
  getConversations,
  getOrCreateConversation,
  createGroupConversation,
  archiveConversation,
  unarchiveConversation,
  deleteConversation,
  updateGroupInfo,
  addGroupMembers,
  removeGroupMember,
  promoteToAdmin,
  updateNotificationSettings
} from '../controllers/conversationController.js';
import { protect } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.get('/', protect, getConversations);
router.post('/', protect, getOrCreateConversation);
router.post('/group', protect, createGroupConversation);
router.patch('/:id/archive', protect, archiveConversation);
router.patch('/:id/unarchive', protect, unarchiveConversation);
router.delete('/:id', protect, deleteConversation);
router.patch('/:id/group-info', protect, updateGroupInfo);
router.post('/:id/members', protect, addGroupMembers);
router.delete('/:id/members/:memberId', protect, removeGroupMember);
router.patch('/:id/members/:memberId/promote', protect, promoteToAdmin);
router.patch('/:id/notifications', protect, updateNotificationSettings);

export default router;
