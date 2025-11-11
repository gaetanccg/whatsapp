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
  }
}, {
  timestamps: true
});

conversationSchema.index({ participants: 1 });

const Conversation = mongoose.model('Conversation', conversationSchema);

export default Conversation;
