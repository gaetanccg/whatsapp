import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
  conversation: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Conversation',
    required: true
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  content: {
    type: String,
    trim: true,
    required: false
  },
  messageType: {
    type: String,
    enum: ['text', 'image', 'video', 'file', 'system'],
    default: 'text'
  },
  media: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Media'
  }],
  replyTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message',
    default: null
  },
  status: {
    type: String,
    enum: ['pending', 'sent', 'delivered', 'read'],
    default: 'sent'
  },
  statusTimestamps: {
    sent: { type: Date, default: Date.now },
    delivered: { type: Date, default: null },
    read: { type: Date, default: null }
  },
  readBy: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    readAt: { type: Date, default: Date.now }
  }],
  deliveredTo: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    deliveredAt: { type: Date, default: Date.now }
  }],
  edited: {
    type: Boolean,
    default: false
  },
  editedAt: {
    type: Date,
    default: null
  },
  deleted: {
    type: Boolean,
    default: false
  },
  deletedAt: {
    type: Date,
    default: null
  },
  reactions: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    emoji: { type: String },
    reactedAt: { type: Date, default: Date.now }
  }]
}, {
  timestamps: true
});

messageSchema.index({ conversation: 1, createdAt: -1 });
messageSchema.index({ sender: 1 });
messageSchema.index({ content: 'text' });
messageSchema.index({ status: 1 });

const Message = mongoose.model('Message', messageSchema);

export default Message;
