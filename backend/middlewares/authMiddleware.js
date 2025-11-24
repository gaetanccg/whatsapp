import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Session from '../models/Session.js';

export const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      req.user = await User.findById(decoded.id).select('-password');

      if (!req.user) {
        return res.status(401).json({ message: 'User not found' });
      }

      // Validate session via jti
      if (!decoded.jti) {
        return res.status(401).json({ message: 'Invalid token (missing jti)' });
      }
      const session = await Session.findOne({ jti: decoded.jti, user: req.user._id, revoked: false, endedAt: null });
      if (!session) {
        return res.status(401).json({ message: 'Session not found or revoked' });
      }
      // Update lastActivity (throttle optional: only if >60s gap)
      const now = Date.now();
      if (!session.lastActivity || now - session.lastActivity.getTime() > 60000) {
        session.lastActivity = new Date(now);
        await session.save();
      }
      req.session = session;
      next();
    } catch (error) {
      console.error('Auth middleware error:', error);
      return res.status(401).json({ message: 'Not authorized, token failed' });
    }
  }

  if (!token) {
    return res.status(401).json({ message: 'Not authorized, no token' });
  }
};
