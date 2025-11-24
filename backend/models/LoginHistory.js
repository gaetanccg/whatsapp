import mongoose from 'mongoose';

const loginHistorySchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  ip: { type: String },
  userAgent: { type: String },
  eventType: { type: String, enum: ['login', 'logout'], required: true },
  timestamp: { type: Date, default: Date.now },
  sessionRef: { type: mongoose.Schema.Types.ObjectId, ref: 'Session' }
});

loginHistorySchema.index({ user: 1, timestamp: -1 });

const LoginHistory = mongoose.model('LoginHistory', loginHistorySchema);
export default LoginHistory;

