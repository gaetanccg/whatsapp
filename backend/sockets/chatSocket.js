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

                // Check if sender is blocked by any participant (for private conversations)
                if (!conversation.isGroup) {
                    const sender = await User.findById(socket.userId);
                    const otherParticipant = conversation.participants.find(p => p._id.toString() !== socket.userId);

                    if (otherParticipant && otherParticipant.blocked.some(id => id.toString() === socket.userId)) {
                        socket.emit('error', {message: 'Cannot send message to this user'});
                        return;
                    }

                    if (sender && sender.blocked.some(id => id.toString() === otherParticipant._id.toString())) {
                        socket.emit('error', {message: 'Cannot send message to blocked user'});
                        return;
                    }
                }

                const message = await Message.create({
                    conversation: conversationId,
                    sender: socket.userId,
                    content,
                    status: 'sent',
                    statusTimestamps: {
                        sent: new Date()
                    },
                    readBy: [
                        {
                            user: socket.userId,
                            readAt: new Date()
                        }
                    ]
                });

                await message.populate([
                    {
                        path: 'sender',
                        select: '-password'
                    },
                    {path: 'media'}
                ]);

                conversation.lastMessage = message._id;
                conversation.participants.forEach(participant => {
                    const participantId = participant._id.toString();
                    if (participantId !== socket.userId) {
                        const currentCount = conversation.unreadCount.get(participantId) || 0;
                        conversation.unreadCount.set(participantId, currentCount + 1);
                    }
                });
                await conversation.save();

                let deliveredCount = 0;
                const sender = await User.findById(socket.userId);

                for (const participant of conversation.participants) {
                    const participantId = participant._id.toString();
                    const socketId = connectedUsers.get(participantId);

                    // Skip if participant has blocked the sender
                    if (participant.blocked.some(id => id.toString() === socket.userId)) {
                        continue;
                    }

                    // Skip if sender has blocked the participant
                    if (sender && sender.blocked.some(id => id.toString() === participantId)) {
                        continue;
                    }

                    if (socketId) {
                        io.to(socketId).emit('receiveMessage', message);

                        if (participantId !== socket.userId) {
                            deliveredCount++;
                            message.deliveredTo.push({
                                user: participantId,
                                deliveredAt: new Date()
                            });
                            io.to(socketId).emit('newMessageNotification', {
                                conversationId,
                                message,
                                unreadCount: conversation.unreadCount.get(participantId) || 0
                            });
                        }
                    }
                }

                if (deliveredCount > 0 && message.status === 'sent') {
                    message.status = 'delivered';
                    message.statusTimestamps.delivered = new Date();
                    await message.save();

                    conversation.participants.forEach(participant => {
                        const participantId = participant._id.toString();
                        const socketId = connectedUsers.get(participantId);
                        if (socketId) {
                            io.to(socketId).emit('messageStatusUpdate', {
                                messageId: message._id,
                                status: 'delivered',
                                timestamp: message.statusTimestamps.delivered
                            });
                        }
                    });
                }
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

                const readAt = new Date();
                const updatedMessages = await Message.find({
                    conversation: conversationId,
                    sender: {$ne: socket.userId},
                    'readBy.user': {$ne: socket.userId}
                });

                for (const msg of updatedMessages) {
                    msg.readBy.push({ user: socket.userId, readAt });
                    if (msg.status !== 'read') {
                        msg.status = 'read';
                        msg.statusTimestamps.read = readAt;
                    }
                    await msg.save();

                    const conversation = await Conversation.findById(conversationId).populate('participants');
                    conversation.participants.forEach(participant => {
                        const participantId = participant._id.toString();
                        const socketId = connectedUsers.get(participantId);
                        if (socketId) {
                            io.to(socketId).emit('messageStatusUpdate', {
                                messageId: msg._id,
                                status: 'read',
                                timestamp: readAt,
                                userId: socket.userId
                            });
                        }
                    });
                }

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
