import express from 'express';
import { protect } from '../middlewares/authMiddleware.js';
import { mediaUploadMiddleware } from '../middlewares/uploadMiddleware.js';
import { uploadMedia, downloadMedia, deleteMedia, getThumbnail, streamMedia } from '../controllers/mediaController.js';

const router = express.Router();

router.post('/', protect, mediaUploadMiddleware, uploadMedia);
router.get('/:id/raw', protect, streamMedia);
router.get('/:id', protect, downloadMedia);
router.get('/:id/thumbnail', protect, getThumbnail);
router.delete('/:id', protect, deleteMedia);

export default router;
