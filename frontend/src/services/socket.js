import {io} from 'socket.io-client';

class SocketService
{
    constructor() {
        this.socket = null;
        this.connected = false;
    }

    connect(token) {
        if (this.socket?.connected) {
            return this.socket;
        }

        const socketUrl = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5001';

        this.socket = io(socketUrl, {
            auth: {token},
            reconnection: true,
            reconnectionDelay: 1000,
            reconnectionAttempts: 5
        });

        this.socket.on('connect', () => {
            console.log('Socket connected');
            this.connected = true;
        });

        this.socket.on('disconnect', () => {
            console.log('Socket disconnected');
            this.connected = false;
        });

        this.socket.on('connect_error', (error) => {
            console.error('Socket connection error:', error);
            this.connected = false;
        });

        return this.socket;
    }

    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
            this.connected = false;
        }
    }

    emit(event, data) {
        if (this.socket && this.connected) {
            this.socket.emit(event, data);
        }
    }

    on(event, callback) {
        if (this.socket) {
            this.socket.on(event, callback);
        }
    }

    off(event, callback) {
        if (this.socket) {
            this.socket.off(event, callback);
        }
    }

    joinConversation(conversationId) {
        this.emit('joinConversation', conversationId);
    }

    leaveConversation(conversationId) {
        this.emit('leaveConversation', conversationId);
    }

    sendMessage(conversationId, content) {
        this.emit('sendMessage',
            {
                conversationId,
                content
            }
        );
    }

    markAsRead(conversationId) {
        this.emit('markAsRead', {conversationId});
    }

    sendTyping(conversationId, isTyping) {
        this.emit('typing',
            {
                conversationId,
                isTyping
            }
        );
    }
}

export default new SocketService();
