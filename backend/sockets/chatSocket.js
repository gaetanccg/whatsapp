import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Message from '../models/Message.js';
import Conversation from '../models/Conversation.js';

const connectedUsers = new Map();

export const setupSocket = (io) => {
    io.use(async(socket, next) => {
        try {
            const token = socket.handshake.auth.token;

            if (!token) {
                return next(new Error('Authentication error'));
            }

            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const user = await User.findById(decoded.id).select('-password');

            if (!user) {
                return next(new Error('User not found'));
            }

            socket.userId = user._id.toString();
            socket.user = user;
            next();
        } catch (error) {
            next(new Error('Authentication error'));
        }
    });

    io.on('connection', async(socket) => {
        console.log(`User connected: ${socket.userId}`);

        connectedUsers.set(socket.userId, socket.id);

        // Join a personal room for user-targeted events (archivage, suppression, etc.)
        socket.join(socket.userId);

        // set user online and capture updated doc
        const updatedOnline = await User.findByIdAndUpdate(socket.userId, {
            isOnline: true,
            socketId: socket.id,
            lastSeen: new Date()
        }, {new: true}).select('-password');

        const onlineUsers = Array.from(connectedUsers.keys());
        // include lastSeen in the emitted status update
        io.emit('userStatusUpdate', {
            userId: socket.userId,
            isOnline: true,
            lastSeen: updatedOnline.lastSeen
        });
        io.emit('onlineUsers', onlineUsers);

        socket.on('sendMessage', async(data) => {
            try {
                const {
                    conversationId,
                    content
                } = data;

                const conversation = await Conversation.findOne({
                    _id: conversationId,
                    participants: socket.userId
                }).populate('participants', '-password');

                if (!conversation) {
                    socket.emit('error', {message: 'Conversation not found'});
                    return;
                }

                const message = await Message.create({
                    conversation: conversationId,
                    sender: socket.userId,
                    content,
                    readBy: [socket.userId]
                });

                await message.populate('sender', '-password');

                conversation.lastMessage = message._id;
                conversation.participants.forEach(participant => {
                    const participantId = participant._id.toString();
                    if (participantId !== socket.userId) {
                        const currentCount = conversation.unreadCount.get(participantId) || 0;
                        conversation.unreadCount.set(participantId, currentCount + 1);
                    }
                });
                await conversation.save();

                conversation.participants.forEach(participant => {
                    const participantId = participant._id.toString();
                    const socketId = connectedUsers.get(participantId);
                    if (socketId) {
                        io.to(socketId).emit('receiveMessage', message);

                        if (participantId !== socket.userId) {
                            io.to(socketId).emit('newMessageNotification', {
                                conversationId,
                                message,
                                unreadCount: conversation.unreadCount.get(participantId) || 0
                            });
                        }
                    }
                });
            } catch (error) {
                console.error('Send message error:', error);
                socket.emit('error', {message: 'Failed to send message'});
            }
        });

        socket.on('typing', (data) => {
            const {
                conversationId,
                isTyping
            } = data;

            socket.to(conversationId).emit('userTyping', {
                userId: socket.userId,
                username: socket.user.username,
                conversationId,
                isTyping
            });
        });

        socket.on('joinConversation', (conversationId) => {
            socket.join(conversationId);
        });

        socket.on('leaveConversation', (conversationId) => {
            socket.leave(conversationId);
        });

        socket.on('markAsRead', async(data) => {
            try {
                const {conversationId} = data;

                await Message.updateMany({
                    conversation: conversationId,
                    sender: {$ne: socket.userId}
                }, {$addToSet: {readBy: socket.userId}});

                const conversation = await Conversation.findById(conversationId);
                if (conversation) {
                    conversation.unreadCount.set(socket.userId, 0);
                    await conversation.save();

                    const socketId = connectedUsers.get(socket.userId);
                    if (socketId) {
                        io.to(socketId).emit('messagesRead', {conversationId});
                    }
                }
            } catch (error) {
                console.error('Mark as read error:', error);
            }
        });

        socket.on('disconnect', async() => {
            console.log(`User disconnected: ${socket.userId}`);

            connectedUsers.delete(socket.userId);

            // set user offline and capture updated doc
            const updatedOffline = await User.findByIdAndUpdate(socket.userId, {
                isOnline: false,
                socketId: null,
                lastSeen: new Date()
            }, {new: true}).select('-password');

            io.emit('userStatusUpdate', {
                userId: socket.userId,
                isOnline: false,
                lastSeen: updatedOffline.lastSeen
            });

            const onlineUsers = Array.from(connectedUsers.keys());
            io.emit('onlineUsers', onlineUsers);
        });
    });
};
