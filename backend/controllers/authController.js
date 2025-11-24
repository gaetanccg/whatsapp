import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Session from '../models/Session.js';
import LoginHistory from '../models/LoginHistory.js';
import { v4 as uuidv4 } from 'uuid';

const generateToken = (id, jti) => {
  return jwt.sign({ id, jti }, process.env.JWT_SECRET, {
    expiresIn: '30d'
  });
};

export const register = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ message: 'Please provide all fields' });
    }

    const userExists = await User.findOne({ $or: [{ email }, { username }] });

    if (userExists) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const user = await User.create({
      username,
      email,
      password
    });

    if (user) {
      const jti = uuidv4();
      const ip = req.ip || req.connection.remoteAddress;
      const userAgent = req.get('User-Agent');
      const session = await Session.create({ user: user._id, ip, userAgent, jti });
      console.log('[SESSION][register] created', session._id, jti, ip, userAgent);
      await LoginHistory.create({ user: user._id, ip, userAgent, eventType: 'login', sessionRef: session._id });
      console.log('[HISTORY][register] login event stored');

      res.status(201).json({
        _id: user._id,
        username: user.username,
        email: user.email,
        token: generateToken(user._id, jti)
      });
    } else {
      res.status(400).json({ message: 'Invalid user data' });
    }
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Please provide email and password' });
    }

    const user = await User.findOne({ email });

    if (user && (await user.matchPassword(password))) {
      const jti = uuidv4();
      const ip = req.ip || req.connection.remoteAddress;
      const userAgent = req.get('User-Agent');
      const session = await Session.create({ user: user._id, ip, userAgent, jti });
      console.log('[SESSION][login] created', session._id, jti, ip, userAgent);
      await LoginHistory.create({ user: user._id, ip, userAgent, eventType: 'login', sessionRef: session._id });
      console.log('[HISTORY][login] login event stored');

      res.json({
        _id: user._id,
        username: user.username,
        email: user.email,
        token: generateToken(user._id, jti)
      });
    } else {
      res.status(401).json({ message: 'Invalid email or password' });
    }
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const logout = async (req, res) => {
  try {
    const session = req.session;
    if (!session) {
      return res.status(400).json({ message: 'No active session' });
    }
    session.revoked = true;
    session.endedAt = new Date();
    await session.save();
    console.log('[SESSION][logout] revoked', session._id);
    const ip = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent');
    await LoginHistory.create({ user: req.user._id, ip, userAgent, eventType: 'logout', sessionRef: session._id });
    console.log('[HISTORY][logout] logout event stored');
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    res.json(user);
  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
