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
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip));

    await Message.updateMany(
      { conversation: conversationId, sender: { $ne: req.user._id } },
      { $addToSet: { readBy: req.user._id } }
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
    const { conversationId, content } = req.body;

    if (!conversationId || !content) {
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
      content,
      readBy: [req.user._id]
    });

    await message.populate('sender', '-password');

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
    await message.save();
    await message.populate('sender', '-password');

    // emit socket event
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

    // soft delete: mark as deleted (do not clear content to avoid schema validation errors)
    message.deleted = true;
    await message.save();

    await message.populate('sender', '-password');

    // emit socket event with the updated message
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

    // toggle reaction: if user already reacted with same emoji remove it, otherwise add/update
    const existingIndex = message.reactions.findIndex(r => r.user.toString() === req.user._id.toString());
    if (existingIndex !== -1) {
      // remove if same emoji, otherwise replace
      if (message.reactions[existingIndex].emoji === emoji) {
        message.reactions.splice(existingIndex, 1);
      } else {
        message.reactions[existingIndex].emoji = emoji;
      }
    } else {
      message.reactions.push({ user: req.user._id, emoji });
    }

    await message.save();

    // populate reaction users and sender so clients receive a fully populated message
    await message.populate('reactions.user', '-password');
    await message.populate('sender', '-password');

    // emit socket event
    emitToConversation(message.conversation.toString(), 'messageReaction', message);

    res.json(message);
  } catch (error) {
    console.error('React message error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
