import sharp from 'sharp';
import ffmpeg from 'fluent-ffmpeg';
import fs from 'fs';
import path from 'path';
import { classify } from '../middlewares/uploadMiddleware.js';

const FFMPEG_DISABLED = process.env.FFMPEG_DISABLED === 'true';
let FFMPEG_AVAILABLE = false;

function checkFfmpeg() {
  return new Promise(resolve => {
    if (FFMPEG_DISABLED) return resolve(false);
    try {
      ffmpeg.getAvailableFormats(() => {
        resolve(true);
      });
    } catch (e) {
      resolve(false);
    }
  });
}

(async () => {
  FFMPEG_AVAILABLE = await checkFfmpeg();
  // eslint-disable-next-line no-console
  console.log('[mediaProcessing] ffmpeg available:', FFMPEG_AVAILABLE);
})();

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

export async function processMediaFiles(files, conversationId) {
  const results = [];
  for (const file of files) {
    const type = classify(file);
    const originalPath = file.path;
    let width, height, durationSeconds, thumbnailFilename, thumbnailWidth, thumbnailHeight, compressionApplied = false;

    if (type === 'image') {
      // Read metadata
      const img = sharp(originalPath);
      const metadata = await img.metadata();
      width = metadata.width;
      height = metadata.height;
      // Compression resize if needed
      if (width > 1280 || height > 1280) {
        const resized = sharp(originalPath).resize({ width: 1280, height: 1280, fit: 'inside' }).jpeg({ quality: 80 });
        await resized.toFile(originalPath + '.tmp');
        fs.renameSync(originalPath + '.tmp', originalPath);
        compressionApplied = true;
        const meta2 = await sharp(originalPath).metadata();
        width = meta2.width;
        height = meta2.height;
      }
      // Thumbnail 200x200 cover
      const thumbsDir = path.join(process.cwd(), 'backend', 'uploads', 'thumbs', conversationId);
      ensureDir(thumbsDir);
      thumbnailFilename = path.basename(file.filename, path.extname(file.filename)) + '_thumb.jpg';
      const thumbnailPath = path.join(thumbsDir, thumbnailFilename);
      await sharp(originalPath).resize(200, 200, { fit: 'cover' }).jpeg({ quality: 80 }).toFile(thumbnailPath);
      thumbnailWidth = 200;
      thumbnailHeight = 200;
    } else if (type === 'video') {
      if (FFMPEG_AVAILABLE) {
        const thumbsDir = path.join(process.cwd(), 'backend', 'uploads', 'thumbs', conversationId);
        ensureDir(thumbsDir);
        thumbnailFilename = path.basename(file.filename, path.extname(file.filename)) + '_thumb.jpg';
        const thumbnailPath = path.join(thumbsDir, thumbnailFilename);
        // Extract frame at 1s and resize
        await new Promise((resolve, reject) => {
          ffmpeg(originalPath)
            .on('error', reject)
            .on('end', resolve)
            .screenshots({
              count: 1,
              timemarks: ['00:00:01.000'],
              filename: 'frame-%i.png',
              folder: thumbsDir
            });
        });
        // Find generated frame
        const frameName = fs.readdirSync(thumbsDir).find(f => f.startsWith('frame-'));
        if (frameName) {
          const framePath = path.join(thumbsDir, frameName);
          await sharp(framePath).resize(200, 200, { fit: 'cover' }).jpeg({ quality: 80 }).toFile(thumbnailPath);
          fs.unlinkSync(framePath);
          thumbnailWidth = 200;
          thumbnailHeight = 200;
        }
        // Get duration
        await new Promise((resolve, reject) => {
          ffmpeg.ffprobe(originalPath, (err, data) => {
            if (err) return reject(err);
            durationSeconds = Math.round(data.format.duration || 0);
            resolve();
          });
        });
      }
    } else if (type === 'doc') {
      // no processing
    }

    results.push({
      file,
      type,
      width,
      height,
      durationSeconds,
      thumbnailFilename,
      thumbnailWidth,
      thumbnailHeight,
      compressionApplied
    });
  }
  return results;
}

export function isFfmpegAvailable() { return FFMPEG_AVAILABLE && !FFMPEG_DISABLED; }
