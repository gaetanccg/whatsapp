import Message from '../models/Message.js';
import Conversation from '../models/Conversation.js';
import { emitToConversation } from '../sockets/socketEmitter.js';

export const getMessages = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { limit = 50, skip = 0 } = req.query;

    const conversation = await Conversation.findOne({
      _id: conversationId,
      participants: req.user._id
    });

    if (!conversation) {
      return res.status(404).json({ message: 'Conversation not found' });
    }

    const messages = await Message.find({ conversation: conversationId })
      .populate('sender', '-password')
      .populate('media')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip));

    await Message.updateMany(
      { conversation: conversationId, sender: { $ne: req.user._id } },
      { $addToSet: { readBy: { user: req.user._id, readAt: new Date() } } }
    );

    conversation.unreadCount.set(req.user._id.toString(), 0);
    await conversation.save();

    res.json(messages.reverse());
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const sendMessage = async (req, res) => {
  try {
    const { conversationId, content, mediaIds } = req.body;

    if (!conversationId) {
      return res.status(400).json({ message: 'Conversation ID and content are required' });
    }

    if ((!content || !content.trim()) && (!mediaIds || mediaIds.length === 0)) {
      return res.status(400).json({ message: 'Conversation ID and content are required' });
    }

    const conversation = await Conversation.findOne({
      _id: conversationId,
      participants: req.user._id
    });

    if (!conversation) {
      return res.status(404).json({ message: 'Conversation not found' });
    }

    const message = await Message.create({
      conversation: conversationId,
      sender: req.user._id,
      content: content && content.trim() ? content.trim() : '',
      readBy: [{ user: req.user._id, readAt: new Date() }]
    });

    if (Array.isArray(mediaIds) && mediaIds.length > 0) {
      message.media.push(...mediaIds);
      if (!content || !content.trim()) {
        message.messageType = 'file';
      }
    }

    await message.populate([
      { path: 'sender', select: '-password' },
      { path: 'media' }
    ]);

    conversation.lastMessage = message._id;
    conversation.participants.forEach(participantId => {
      if (participantId.toString() !== req.user._id.toString()) {
        const currentCount = conversation.unreadCount.get(participantId.toString()) || 0;
        conversation.unreadCount.set(participantId.toString(), currentCount + 1);
      }
    });
    await conversation.save();

    res.status(201).json(message);
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const editMessage = async (req, res) => {
  try {
    const { messageId, content } = req.body;
    if (!messageId || content == null) return res.status(400).json({ message: 'Message ID and new content required' });

    const message = await Message.findById(messageId).populate('sender', '-password');
    if (!message) return res.status(404).json({ message: 'Message not found' });

    if (message.sender._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to edit this message' });
    }

    message.content = content;
    message.edited = true;
    message.editedAt = new Date();
    await message.save();
    await message.populate('sender', '-password');

    emitToConversation(message.conversation.toString(), 'messageEdited', message);

    res.json(message);
  } catch (error) {
    console.error('Edit message error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const deleteMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const message = await Message.findById(messageId).populate('sender', '-password');
    if (!message) return res.status(404).json({ message: 'Message not found' });

    if (message.sender._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to delete this message' });
    }

    message.deleted = true;
    message.deletedAt = new Date();
    await message.save();

    await message.populate('sender', '-password');

    emitToConversation(message.conversation.toString(), 'messageDeleted', message);

    res.json(message);
  } catch (error) {
    console.error('Delete message error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const reactToMessage = async (req, res) => {
  try {
    const { messageId, emoji } = req.body;
    if (!messageId || !emoji) return res.status(400).json({ message: 'Message ID and emoji required' });

    const message = await Message.findById(messageId);
    if (!message) return res.status(404).json({ message: 'Message not found' });

    const existingIndex = message.reactions.findIndex(r => r.user.toString() === req.user._id.toString());
    if (existingIndex !== -1) {
      if (message.reactions[existingIndex].emoji === emoji) {
        message.reactions.splice(existingIndex, 1);
      } else {
        message.reactions[existingIndex].emoji = emoji;
        message.reactions[existingIndex].reactedAt = new Date();
      }
    } else {
      message.reactions.push({ user: req.user._id, emoji, reactedAt: new Date() });
    }

    await message.save();

    await message.populate('reactions.user', '-password');
    await message.populate('sender', '-password');

    emitToConversation(message.conversation.toString(), 'messageReaction', message);

    res.json(message);
  } catch (error) {
    console.error('React message error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const searchMessages = async (req, res) => {
  try {
    const { query, conversationId, senderId, limit = 50, skip = 0 } = req.query;

    if (!query) {
      return res.status(400).json({ message: 'Search query is required' });
    }

    const searchQuery = {
      deleted: false,
      $text: { $search: query }
    };

    if (conversationId) {
      const conversation = await Conversation.findOne({
        _id: conversationId,
        participants: req.user._id
      });
      if (!conversation) {
        return res.status(404).json({ message: 'Conversation not found' });
      }
      searchQuery.conversation = conversationId;
    } else {
      const userConversations = await Conversation.find({
        participants: req.user._id,
        deletedAt: null
      }).select('_id');
      searchQuery.conversation = { $in: userConversations.map(c => c._id) };
    }

    if (senderId) {
      searchQuery.sender = senderId;
    }

    const messages = await Message.find(searchQuery)
      .populate('sender', '-password')
      .populate('conversation')
      .populate('media')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip));

    res.json(messages);
  } catch (error) {
    console.error('Search messages error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const updateMessageStatus = async (req, res) => {
  try {
    const { messageId, status } = req.body;

    if (!messageId || !status) {
      return res.status(400).json({ message: 'Message ID and status are required' });
    }

    if (!['pending', 'sent', 'delivered', 'read'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    message.status = status;

    if (status === 'delivered' && !message.statusTimestamps.delivered) {
      message.statusTimestamps.delivered = new Date();
      if (!message.deliveredTo.some(d => d.user.toString() === req.user._id.toString())) {
        message.deliveredTo.push({ user: req.user._id, deliveredAt: new Date() });
      }
    }

    if (status === 'read' && !message.statusTimestamps.read) {
      message.statusTimestamps.read = new Date();
      if (!message.readBy.some(r => r.user.toString() === req.user._id.toString())) {
        message.readBy.push({ user: req.user._id, readAt: new Date() });
      }
    }

    await message.save();
    await message.populate('sender', '-password');

    emitToConversation(message.conversation.toString(), 'messageStatusUpdated', message);

    res.json(message);
  } catch (error) {
    console.error('Update message status error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const replyToMessage = async (req, res) => {
  try {
    const { conversationId, content, replyTo, mediaIds } = req.body;

    if (!conversationId || !replyTo) {
      return res.status(400).json({ message: 'Conversation ID and reply target are required' });
    }

    if ((!content || !content.trim()) && (!mediaIds || mediaIds.length === 0)) {
      return res.status(400).json({ message: 'Content or media is required' });
    }

    const conversation = await Conversation.findOne({
      _id: conversationId,
      participants: req.user._id
    });

    if (!conversation) {
      return res.status(404).json({ message: 'Conversation not found' });
    }

    const originalMessage = await Message.findById(replyTo);
    if (!originalMessage) {
      return res.status(404).json({ message: 'Original message not found' });
    }

    const message = await Message.create({
      conversation: conversationId,
      sender: req.user._id,
      content: content && content.trim() ? content.trim() : '',
      replyTo: replyTo,
      readBy: [{ user: req.user._id, readAt: new Date() }]
    });

    if (Array.isArray(mediaIds) && mediaIds.length > 0) {
      message.media.push(...mediaIds);
      if (!content || !content.trim()) {
        message.messageType = 'file';
      }
    }

    await message.populate([
      { path: 'sender', select: '-password' },
      { path: 'media' },
      { path: 'replyTo', populate: { path: 'sender', select: '-password' } }
    ]);

    conversation.lastMessage = message._id;
    conversation.participants.forEach(participantId => {
      if (participantId.toString() !== req.user._id.toString()) {
        const currentCount = conversation.unreadCount.get(participantId.toString()) || 0;
        conversation.unreadCount.set(participantId.toString(), currentCount + 1);
      }
    });
    await conversation.save();

    res.status(201).json(message);
  } catch (error) {
    console.error('Reply to message error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
