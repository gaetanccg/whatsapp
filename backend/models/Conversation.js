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
  groupDescription: {
    type: String,
    default: null
  },
  groupAvatar: {
    type: String,
    default: null
  },
  creator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  admins: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  moderators: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
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
  notificationSettings: {
    type: Map,
    of: {
      muted: { type: Boolean, default: false },
      muteUntil: { type: Date, default: null }
    },
    default: {}
  },
  archivedBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
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
