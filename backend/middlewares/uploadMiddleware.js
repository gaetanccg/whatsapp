import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

const IMAGE_EXT = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
const VIDEO_EXT = ['.mp4', '.webm'];
const DOC_EXT = ['.pdf'];

const IMAGE_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const VIDEO_MIME = ['video/mp4', 'video/webm'];
const DOC_MIME = ['application/pdf'];

const IMAGE_MAX = parseInt(process.env.IMAGE_MAX_BYTES || 5 * 1024 * 1024, 10); // 5MB
const VIDEO_MAX = parseInt(process.env.VIDEO_MAX_BYTES || 50 * 1024 * 1024, 10); // 50MB
const DOC_MAX = parseInt(process.env.DOC_MAX_BYTES || 10 * 1024 * 1024, 10); // 10MB
const GLOBAL_MAX = parseInt(process.env.MEDIA_GLOBAL_MAX_BYTES || 100 * 1024 * 1024, 10); // 100MB

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const conversationId = req.body.conversationId || req.query.conversationId;
    if (!conversationId) {
      return cb(new Error('Missing conversationId for media upload'));
    }
    const baseDir = path.join(process.cwd(), 'backend', 'uploads', 'original', conversationId);
    ensureDir(baseDir);
    cb(null, baseDir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, uuidv4() + ext);
  }
});

function classify(file) {
  const ext = path.extname(file.originalname).toLowerCase();
  const mime = file.mimetype;
  if (IMAGE_EXT.includes(ext) && IMAGE_MIME.includes(mime)) return 'image';
  if (VIDEO_EXT.includes(ext) && VIDEO_MIME.includes(mime)) return 'video';
  if (DOC_EXT.includes(ext) && DOC_MIME.includes(mime)) return 'doc';
  return 'unknown';
}

const fileFilter = (req, file, cb) => {
  const type = classify(file);
  if (type === 'unknown') {
    return cb(new Error('Type de fichier non supporté')); 
  }
  cb(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: Math.max(IMAGE_MAX, VIDEO_MAX, DOC_MAX) // multer limit upper bound; we do per-type check later
  }
});

export function mediaUploadMiddleware(req, res, next) {
  const handler = upload.array('files', parseInt(process.env.MAX_MEDIA_FILES || '10', 10));
  handler(req, res, function (err) {
    if (err) {
      return res.status(400).json({ message: err.message });
    }

    // Per-type & global size checks
    let total = 0;
    for (const file of req.files || []) {
      total += file.size;
      const type = classify(file);
      if (type === 'image' && file.size > IMAGE_MAX) {
        return res.status(413).json({ message: 'Image trop grande' });
      }
      if (type === 'video' && file.size > VIDEO_MAX) {
        return res.status(413).json({ message: 'Vidéo trop grande' });
      }
      if (type === 'doc' && file.size > DOC_MAX) {
        return res.status(413).json({ message: 'Document trop grand' });
      }
    }
    if (total > GLOBAL_MAX) {
      return res.status(413).json({ message: 'Taille totale des fichiers trop grande' });
    }

    next();
  });
}

export { classify };

