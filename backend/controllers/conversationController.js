import Conversation from '../models/Conversation.js';
import mongoose from 'mongoose';
import { io } from '../server.js';

export const getConversations = async (req, res) => {
  try {
    const { search, sort = 'updatedAt', order = 'desc', filter } = req.query;
    const userId = req.user._id;

    // Base query: participant & not soft-deleted
    const query = {
      participants: userId,
      deletedAt: null
    };

    // Handle archived filter
    if (filter === 'archived') {
      query.archivedBy = { $in: [userId] };
    } else if (filter === 'unarchived') {
      query.archivedBy = { $nin: [userId] };
    }

    // Additional filter types (group/direct)
    if (filter === 'group') {
      query.isGroup = true;
    } else if (filter === 'direct') {
      query.isGroup = false;
    }

    // Search: groupName text or other participant username (post-filter)
    let conversations = await Conversation.find(query)
      .populate('participants', '-password')
      .populate('lastMessage')
      .sort({ [sort]: order === 'asc' ? 1 : -1 });

    if (search) {
      const lower = search.toLowerCase();
      conversations = conversations.filter(conv => {
        if (conv.isGroup && conv.groupName) {
          return conv.groupName.toLowerCase().includes(lower);
        }
        // direct: search other participant username
        if (!conv.isGroup) {
          const other = conv.participants.find(p => p._id.toString() !== userId.toString());
          return other && other.username.toLowerCase().includes(lower);
        }
        return false;
      });
    }

    // Unread filtering (filter=unread)
    if (filter === 'unread') {
      conversations = conversations.filter(conv => (conv.unreadCount.get(userId.toString()) || 0) > 0);
    }

    const conversationsWithUnread = conversations.map(conv => {
      const unreadCount = conv.unreadCount.get(userId.toString()) || 0;
      const archived = conv.archivedBy.some(u => u.toString() === userId.toString());
      return {
        ...conv.toObject(),
        unreadCount,
        archived
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
      participants: { $all: [req.user._id, participantId] },
      deletedAt: null
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

export const archiveConversation = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid conversation id' });
    }
    const userId = req.user._id;

    const conversation = await Conversation.findOne({ _id: id, participants: userId, deletedAt: null });
    if (!conversation) {
      return res.status(404).json({ message: 'Conversation not found' });
    }

    if (conversation.archivedBy.some(u => u.toString() === userId.toString())) {
      return res.status(200).json({ message: 'Already archived', archived: true }); // idempotent
    }

    conversation.archivedBy.push(userId);
    await conversation.save();

    // Notify participants (only this user's archive state changes, but others may refresh if desired)
    conversation.participants.forEach(p => {
      io.to(p.toString()).emit('conversationArchived', { conversationId: id, userId: userId.toString() });
    });

    res.json({ message: 'Conversation archived', archived: true });
  } catch (error) {
    console.error('Archive conversation error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const unarchiveConversation = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid conversation id' });
    }
    const userId = req.user._id;

    const conversation = await Conversation.findOne({ _id: id, participants: userId, deletedAt: null });
    if (!conversation) {
      return res.status(404).json({ message: 'Conversation not found' });
    }

    const before = conversation.archivedBy.length;
    conversation.archivedBy = conversation.archivedBy.filter(u => u.toString() !== userId.toString());
    const after = conversation.archivedBy.length;

    if (before === after) {
      return res.status(200).json({ message: 'Already unarchived', archived: false }); // idempotent
    }

    await conversation.save();

    conversation.participants.forEach(p => {
      io.to(p.toString()).emit('conversationUnarchived', { conversationId: id, userId: userId.toString() });
    });

    res.json({ message: 'Conversation unarchived', archived: false });
  } catch (error) {
    console.error('Unarchive conversation error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const deleteConversation = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid conversation id' });
    }
    const userId = req.user._id;

    const conversation = await Conversation.findOne({ _id: id, participants: userId, deletedAt: null });
    if (!conversation) {
      return res.status(404).json({ message: 'Conversation not found' });
    }

    conversation.deletedAt = new Date();
    await conversation.save();

    conversation.participants.forEach(p => {
      io.to(p.toString()).emit('conversationDeleted', { conversationId: id });
    });

    res.json({ message: 'Conversation deleted' });
  } catch (error) {
    console.error('Delete conversation error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
