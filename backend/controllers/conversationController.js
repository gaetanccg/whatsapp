import Conversation from '../models/Conversation.js';
import Message from '../models/Message.js';

export const getConversations = async (req, res) => {
  try {
    const conversations = await Conversation.find({
      participants: req.user._id
    })
      .populate('participants', '-password')
      .populate('lastMessage')
      .sort({ updatedAt: -1 });

    const conversationsWithUnread = conversations.map(conv => {
      const unreadCount = conv.unreadCount.get(req.user._id.toString()) || 0;
      return {
        ...conv.toObject(),
        unreadCount
      };
    });

    res.json(conversationsWithUnread);
  } catch (error) {
    console.error('Get conversations error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const getOrCreateConversation = async (req, res) => {
  try {
    const { participantId } = req.body;

    if (!participantId) {
      return res.status(400).json({ message: 'Participant ID is required' });
    }

    let conversation = await Conversation.findOne({
      isGroup: false,
      participants: { $all: [req.user._id, participantId] }
    }).populate('participants', '-password');

    if (!conversation) {
      conversation = await Conversation.create({
        participants: [req.user._id, participantId],
        isGroup: false
      });

      conversation = await conversation.populate('participants', '-password');
    }

    res.json(conversation);
  } catch (error) {
    console.error('Get or create conversation error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const createGroupConversation = async (req, res) => {
  try {
    const { participantIds, groupName } = req.body;

    if (!participantIds || participantIds.length < 2) {
      return res.status(400).json({ message: 'At least 2 participants are required' });
    }

    if (!groupName) {
      return res.status(400).json({ message: 'Group name is required' });
    }

    const participants = [...participantIds, req.user._id];

    const conversation = await Conversation.create({
      participants,
      isGroup: true,
      groupName
    });

    await conversation.populate('participants', '-password');

    res.status(201).json(conversation);
  } catch (error) {
    console.error('Create group conversation error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
