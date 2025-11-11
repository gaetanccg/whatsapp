import Message from '../models/Message.js';
import Conversation from '../models/Conversation.js';

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
