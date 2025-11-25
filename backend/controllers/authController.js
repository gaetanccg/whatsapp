import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import User from '../models/User.js';
import Session from '../models/Session.js';
import LoginHistory from '../models/LoginHistory.js';
import {v4 as uuidv4} from 'uuid';

const generateToken = (id, jti) => {
    return jwt.sign({
        id,
        jti
    }, process.env.JWT_SECRET, {
        expiresIn: '30d'
    });
};

// Simple sanitizer: remove all HTML tags (including <script>);
// returns null for non-strings
const sanitizeString = (v) => {
    if (typeof v !== 'string') return null;
    // Remove any HTML tags
    return v.replace(/<[^>]*>/g, '').trim();
};

export const register = async(req, res) => {
    try {
        const {
            username,
            email,
            password
        } = req.body;

        // Basic type checks to avoid NoSQL injection (objects in payload)
        if (typeof username !== 'string' || typeof email !== 'string' || typeof password !== 'string') {
            return res.status(400).json({message: 'Please provide valid string values for username, email and password'});
        }

        const cleanUsername = sanitizeString(username);
        const cleanEmail = email.trim().toLowerCase();

        if (!cleanUsername || !cleanEmail || !password) {
            return res.status(400).json({message: 'Please provide all fields'});
        }

        // enforce minimal username length after sanitization
        if (cleanUsername.length < 3) {
            return res.status(400).json({message: 'Username must be at least 3 characters'});
        }

        const userExists = await User.findOne({
            $or: [
                {email: cleanEmail},
                {username: cleanUsername}
            ]
        });

        if (userExists) {
            return res.status(400).json({message: 'User already exists'});
        }

        const user = await User.create({
            username: cleanUsername,
            email: cleanEmail,
            password
        });

        if (user) {
            const jti = uuidv4();
            const ip = req.ip || req.connection.remoteAddress;
            const userAgent = req.get('User-Agent');
            const session = await Session.create({
                user: user._id,
                ip,
                userAgent,
                jti
            });
            console.log('[SESSION][register] created', session._id, jti, ip, userAgent);
            await LoginHistory.create({
                user: user._id,
                ip,
                userAgent,
                eventType: 'login',
                sessionRef: session._id
            });
            console.log('[HISTORY][register] login event stored');

            res.status(201).json({
                _id: user._id,
                username: user.username,
                email: user.email,
                token: generateToken(user._id, jti)
            });
        } else {
            res.status(400).json({message: 'Invalid user data'});
        }
    } catch (error) {
        console.error('Register error:', error);
        res.status(500)
           .json({
               message: 'Server error',
               error: error.message
           });
    }
};

export const login = async(req, res) => {
    try {
        const {
            email,
            password
        } = req.body;

        // Basic type checks to avoid NoSQL injection (objects in payload)
        if (typeof email !== 'string' || typeof password !== 'string') {
            return res.status(400).json({message: 'Please provide valid email and password'});
        }

        const cleanEmail = email.trim().toLowerCase();

        if (!cleanEmail || !password) {
            return res.status(400).json({message: 'Please provide email and password'});
        }

        const user = await User.findOne({email: cleanEmail});

        if (user && (await user.matchPassword(password))) {
            const jti = uuidv4();
            const ip = req.ip || req.connection.remoteAddress;
            const userAgent = req.get('User-Agent');
            const session = await Session.create({
                user: user._id,
                ip,
                userAgent,
                jti
            });
            console.log('[SESSION][login] created', session._id, jti, ip, userAgent);
            await LoginHistory.create({
                user: user._id,
                ip,
                userAgent,
                eventType: 'login',
                sessionRef: session._id
            });
            console.log('[HISTORY][login] login event stored');

            res.json({
                _id: user._id,
                username: user.username,
                email: user.email,
                token: generateToken(user._id, jti)
            });
        } else {
            res.status(401).json({message: 'Invalid email or password'});
        }
    } catch (error) {
        console.error('Login error:', error);
        res.status(500)
           .json({
               message: 'Server error',
               error: error.message
           });
    }
};

export const logout = async(req, res) => {
    try {
        const session = req.session;
        if (!session) {
            return res.status(400).json({message: 'No active session'});
        }
        session.revoked = true;
        session.endedAt = new Date();
        await session.save();
        console.log('[SESSION][logout] revoked', session._id);
        const ip = req.ip || req.connection.remoteAddress;
        const userAgent = req.get('User-Agent');
        await LoginHistory.create({
            user: req.user._id,
            ip,
            userAgent,
            eventType: 'logout',
            sessionRef: session._id
        });
        console.log('[HISTORY][logout] logout event stored');
        res.json({message: 'Logged out successfully'});
    } catch (error) {
        console.error('Logout error:', error);
        res.status(500)
           .json({
               message: 'Server error',
               error: error.message
           });
    }
};

export const getMe = async(req, res) => {
    try {
        const user = await User.findById(req.user._id).select('-password');
        // sanitize username before returning to avoid reflecting raw HTML
        if (user && user.username && typeof user.username === 'string') {
            user.username = user.username.replace(/<[^>]*>/g, '').trim();
        }
        res.json(user);
    } catch (error) {
        console.error('Get me error:', error);
        res.status(500)
           .json({
               message: 'Server error',
               error: error.message
           });
    }
};

export const forgotPassword = async(req, res) => {
    try {
        const {email} = req.body;

        if (typeof email !== 'string') {
            return res.status(400).json({message: 'Please provide a valid email'});
        }

        if (!email) {
            return res.status(400).json({message: 'Please provide an email'});
        }

        const user = await User.findOne({email});

        if (!user) {
            return res.status(200).json({message: 'If the email exists, a reset link will be sent'});
        }

        const resetToken = crypto.randomBytes(32).toString('hex');
        const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');

        user.resetPasswordToken = resetTokenHash;
        user.resetPasswordExpire = Date.now() + 3600000;
        await user.save();

        console.log(`[PASSWORD RESET] Token generated for ${email}: ${resetToken}`);

        res.status(200).json({
            message: 'If the email exists, a reset link will be sent',
            resetToken
        });
    } catch (error) {
        console.error('Forgot password error:', error);
        res.status(500)
           .json({
               message: 'Server error',
               error: error.message
           });
    }
};

export const resetPassword = async(req, res) => {
    try {
        const {
            token,
            password
        } = req.body;

        if (!token || !password) {
            return res.status(400).json({message: 'Please provide token and password'});
        }

        if (password.length < 6) {
            return res.status(400).json({message: 'Password must be at least 6 characters'});
        }

        const resetTokenHash = crypto.createHash('sha256').update(token).digest('hex');

        const user = await User.findOne({
            resetPasswordToken: resetTokenHash,
            resetPasswordExpire: {$gt: Date.now()}
        });

        if (!user) {
            return res.status(400).json({message: 'Invalid or expired reset token'});
        }

        user.password = password;
        user.resetPasswordToken = undefined;
        user.resetPasswordExpire = undefined;
        await user.save();

        console.log(`[PASSWORD RESET] Password reset successful for user ${user.email}`);

        res.status(200).json({message: 'Password reset successful'});
    } catch (error) {
        console.error('Reset password error:', error);
        res.status(500)
           .json({
               message: 'Server error',
               error: error.message
           });
    }
};
