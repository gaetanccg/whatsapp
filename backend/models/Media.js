import mongoose from 'mongoose';

const mediaSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  conversation: { type: mongoose.Schema.Types.ObjectId, ref: 'Conversation', required: true },
  message: { type: mongoose.Schema.Types.ObjectId, ref: 'Message', required: true },
  type: { type: String, enum: ['image', 'video', 'doc'], required: true },
  originalFilename: { type: String, required: true },
  storedFilename: { type: String, required: true },
  sizeBytes: { type: Number, required: true },
  mimeType: { type: String, required: true },
  width: { type: Number },
  height: { type: Number },
  durationSeconds: { type: Number },
  thumbnailFilename: { type: String },
  thumbnailWidth: { type: Number },
  thumbnailHeight: { type: Number },
  compressionApplied: { type: Boolean, default: false },
  deletedAt: { type: Date, default: null }
}, { timestamps: true });

mediaSchema.index({ conversation: 1, createdAt: -1 });

const Media = mongoose.model('Media', mediaSchema);
export default Media;

