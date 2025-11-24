import mongoose from 'mongoose';

const sessionSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  ip: { type: String },
  userAgent: { type: String },
  jti: { type: String, required: true, unique: true, index: true },
  createdAt: { type: Date, default: Date.now },
  lastActivity: { type: Date, default: Date.now },
  revoked: { type: Boolean, default: false, index: true },
  endedAt: { type: Date, default: null }
});

sessionSchema.index({ user: 1, revoked: 1, endedAt: 1 });
sessionSchema.index({ createdAt: 1 });

const Session = mongoose.model('Session', sessionSchema);
export default Session;

