import Session from '../models/Session.js';
import LoginHistory from '../models/LoginHistory.js';

export const listSessions = async (req, res) => {
  try {
    const sessions = await Session.find({ user: req.user._id, revoked: false, endedAt: null })
      .sort({ createdAt: -1 })
      .select('_id ip userAgent createdAt lastActivity');
    res.json(sessions);
  } catch (err) {
    console.error('List sessions error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

export const revokeSession = async (req, res) => {
  try {
    const { id } = req.params;
    const session = await Session.findOne({ _id: id, user: req.user._id });
    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }
    if (session.revoked || session.endedAt) {
      return res.status(400).json({ message: 'Session already ended' });
    }
    session.revoked = true;
    session.endedAt = new Date();
    await session.save();
    const ip = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent');
    await LoginHistory.create({ user: req.user._id, ip, userAgent, eventType: 'logout', sessionRef: session._id });
    res.json({ message: 'Session revoked' });
  } catch (err) {
    console.error('Revoke session error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

export const listHistory = async (req, res) => {
  try {
    const { page = 1, limit = 20, eventType } = req.query;
    const query = { user: req.user._id };
    if (eventType) {
      query.eventType = eventType;
    }
    const skip = (Number(page) - 1) * Number(limit);
    const [items, total] = await Promise.all([
      LoginHistory.find(query)
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(Number(limit))
        .select('_id eventType ip userAgent timestamp sessionRef'),
      LoginHistory.countDocuments(query)
    ]);
    res.json({ page: Number(page), limit: Number(limit), total, items });
  } catch (err) {
    console.error('List history error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

