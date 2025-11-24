import mongoose from 'mongoose';

const conversationSchema = new mongoose.Schema({
  participants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }],
  isGroup: {
    type: Boolean,
    default: false
  },
  groupName: {
    type: String,
    default: null
  },
  lastMessage: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message',
    default: null
  },
  unreadCount: {
    type: Map,
    of: Number,
    default: {}
  },
  // Users who have archived this conversation (per-user archivage)
  archivedBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  // Soft delete timestamp; if non-null conversation considered deleted
  deletedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

conversationSchema.index({ participants: 1 });
// Optimize listing sorted by update time for a participant
conversationSchema.index({ participants: 1, updatedAt: -1 });
// Index archivedBy for faster archived queries
conversationSchema.index({ archivedBy: 1 });
// Text index on groupName for search (only groups)
conversationSchema.index({ groupName: 'text' });
// Allow filtering non-deleted quickly
conversationSchema.index({ deletedAt: 1 });

const Conversation = mongoose.model('Conversation', conversationSchema);

export default Conversation;
