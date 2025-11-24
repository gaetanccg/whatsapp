import express from 'express';
import { protect } from '../middlewares/authMiddleware.js';
import { listSessions, revokeSession, listHistory } from '../controllers/sessionController.js';

const router = express.Router();

router.get('/', protect, listSessions);
router.get('/active', protect, listSessions);
router.delete('/:id', protect, revokeSession);
router.get('/history', protect, listHistory);

export default router;
