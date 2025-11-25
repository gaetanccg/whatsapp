import {defineStore} from 'pinia';
import {authAPI, conversationAPI, messageAPI, userAPI, sessionsAPI} from '../services/api.js';
import socketService from '../services/socket.js';

const deletionTimers = new Map();

export const useAuthStore = defineStore('auth', {
    state: () => ({
        user: JSON.parse(localStorage.getItem('user')) || null,
        token: localStorage.getItem('token') || null,
        isAuthenticated: !!localStorage.getItem('token'),
        sessions: [],
        history: {
            items: [],
            page: 1,
            limit: 20,
            total: 0
        },
        contacts: []
    }),

    actions: {
        patchUser(data) {
            if (!this.user) return;
            this.user = {...this.user, ...data};
            localStorage.setItem('user', JSON.stringify(this.user));
        },
        async register(userData) {
            const response = await authAPI.register(userData);
            this.setAuth(response.data);
            await this.postAuthLoad();
            return response.data;
        },

        async login(credentials) {
            const response = await authAPI.login(credentials);
            this.setAuth(response.data);
            await this.postAuthLoad();
            return response.data;
        },

        async fetchUser() {
            const response = await authAPI.getMe();
            this.user = response.data;
            localStorage.setItem('user', JSON.stringify(response.data));
        },

        setAuth(data) {
            this.user = data;
            this.token = data.token;
            this.isAuthenticated = true;
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data));
            socketService.connect(data.token);
        },

        logout() {
            this.user = null;
            this.token = null;
            this.isAuthenticated = false;
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            socketService.disconnect();
        },

        async fetchSessions() {
            try {
                const res = await sessionsAPI.list();
                this.sessions = res.data;
            } catch (err) {
                console.error('Fetch sessions error:', err.response?.data || err.message);
            }
        },

        async revokeSession(id) {
            try {
                await sessionsAPI.revoke(id);
                this.sessions = this.sessions.filter(s => s._id !== id);
            } catch (err) {
                console.error('Revoke session error:', err.response?.data || err.message);
            }
        },

        async fetchHistory(page = 1, limit = 20) {
            try {
                const res = await sessionsAPI.history(page, limit);
                this.history = res.data;
            } catch (err) {
                console.error('Fetch history error:', err.response?.data || err.message);
            }
        },

        async postAuthLoad() {
            await Promise.all([
                this.fetchSessions(),
                this.fetchHistory(1, this.history.limit),
                this.loadContacts()
            ]);
        },

        async loadContacts() {
            try {
                const res = await userAPI.listContacts();
                this.contacts = res.data;
            } catch (err) {
                console.error('Load contacts error:', err.response?.data || err.message);
            }
        },

        async addContact(userId) {
            try {
                await userAPI.addContact(userId);
                await this.loadContacts();
            } catch (err) {
                console.error('Add contact error:', err.response?.data || err.message);
                throw err;
            }
        },

        async removeContact(userId) {
            try {
                await userAPI.removeContact(userId);
                await this.loadContacts();
            } catch (err) {
                console.error('Remove contact error:', err.response?.data || err.message);
                throw err;
            }
        },

        async blockContact(userId) {
            try {
                await userAPI.blockContact(userId);
                await this.loadContacts();
                await this.fetchUser();
            } catch (err) {
                console.error('Block contact error:', err.response?.data || err.message);
                throw err;
            }
        },

        async unblockContact(userId) {
            try {
                await userAPI.unblockContact(userId);
                await this.loadContacts();
                await this.fetchUser();
            } catch (err) {
                console.error('Unblock contact error:', err.response?.data || err.message);
                throw err;
            }
        }
    }
});

export const useChatStore = defineStore('chat', {
    state: () => ({
        conversations: [],
        currentConversation: null,
        messages: [],
        users: [],
        onlineUsers: [],
        typingUsers: {},
        loading: false,
        error: null,
        editingMessage: null,
        searchTerm: '',
        filter: null,
        sort: 'updatedAt',
        sortOrder: 'desc'
    }),

    getters: {
        sortedConversations: (state) => {
            return [...state.conversations].sort((a, b) => {
                const aTime = a.lastMessage?.createdAt || a.updatedAt;
                const bTime = b.lastMessage?.createdAt || b.updatedAt;
                return new Date(bTime) - new Date(aTime);
            });
        },

        unreadCount: (state) => {
            return state.conversations.reduce((total, conv) => total + (conv.unreadCount || 0), 0);
        }
    },

    actions: {
        _scheduleRemoval(messageId, delayMs = 5000) {
            if (!messageId) return;
            if (deletionTimers.has(messageId)) return;
            const timer = setTimeout(() => {
                try {
                    this.removeMessageFromStore(messageId);
                } finally {
                    deletionTimers.delete(messageId);
                }
            }, delayMs);
            deletionTimers.set(messageId, timer);
        },

        _cancelScheduledRemoval(messageId) {
            if (!messageId) return;
            const timer = deletionTimers.get(messageId);
            if (timer) {
                clearTimeout(timer);
                deletionTimers.delete(messageId);
            }
        },

        async fetchConversations() {
            try {
                this.loading = true;
                const response = await conversationAPI.getConversations();
                this.conversations = response.data;
            } catch (error) {
                this.error = error.message;
                console.error('Fetch conversations error:', error);
            } finally {
                this.loading = false;
            }
        },

        async fetchMessages(conversationId) {
            try {
                this.loading = true;
                const response = await messageAPI.getMessages(conversationId);
                this.messages = response.data;
                (this.messages || []).forEach(m => {
                    if (m && m._id && m.deleted) this._scheduleRemoval(m._id);
                });
                // Émettre un événement pour signaler que tous les messages de la conversation sont chargés
                try {
                    window.dispatchEvent(new CustomEvent('conversationMessagesLoaded', { detail: { conversationId } }));
                } catch {}
            } catch (error) {
                this.error = error.message;
                console.error('Fetch messages error:', error);

                if (error.response?.status === 403) {
                    this.messages = [];
                }
                throw error;
            } finally {
                this.loading = false;
            }
        },

        async fetchUsers() {
            try {
                const response = await userAPI.getAllUsers();
                this.users = response.data;
            } catch (error) {
                this.error = error.message;
                console.error('Fetch users error:', error);
            }
        },

        async selectConversation(conversation) {
            this.currentConversation = conversation;
            try {
                await this.fetchMessages(conversation._id);
                socketService.joinConversation(conversation._id);
                socketService.markAsRead(conversation._id);

                const conv = this.conversations.find(c => c._id === conversation._id);
                if (conv) {
                    conv.unreadCount = 0;
                }
            } catch (error) {
                if (error.response?.status === 403) {
                    console.log('Cannot access blocked conversation');
                }
            }
        },

        async createOrGetConversation(userId) {
            try {
                const response = await conversationAPI.getOrCreateConversation(userId);
                const conversation = response.data;

                const existingIndex = this.conversations.findIndex(c => c._id === conversation._id);
                if (existingIndex === -1) {
                    this.conversations.push(conversation);
                }

                await this.selectConversation(conversation);
                return conversation;
            } catch (error) {
                this.error = error.message;
                console.error('Create conversation error:', error);
            }
        },

        addMessage(message) {
            if (this.currentConversation?._id === message.conversation) {
                this.messages.push(message);
                try {
                    window.dispatchEvent(new CustomEvent('messageAppended', { detail: { message } }));
                } catch {}
            }

            const conv = this.conversations.find(c => c._id === message.conversation);
            if (conv) {
                conv.lastMessage = message;
                conv.updatedAt = message.createdAt;
            }

            // If the incoming message is already marked deleted, schedule removal
            if (message && message._id && message.deleted) {
                this._scheduleRemoval(message._id);
            }
        },

        updateOnlineUsers(users) {
            const normalized = (users || []).map(u => (u == null ? null : String(u)));
            this.onlineUsers = normalized;
            this.users.forEach(user => {
                user.isOnline = normalized.includes(String(user._id));
            });
        },

        updateUserStatus(userId, isOnline, lastSeen = null) {
            const user = this.users.find(u => u._id === userId);
            if (user) {
                user.isOnline = isOnline;
                if (lastSeen) user.lastSeen = lastSeen;
            }

            const sId = userId == null ? null : String(userId);
            if (isOnline && !this.onlineUsers.includes(sId)) {
                this.onlineUsers.push(sId);
            } else if (!isOnline) {
                this.onlineUsers = this.onlineUsers.filter(id => id !== sId);
            }

            // If the status change concerns the currently authenticated user, update auth store
            try {
                const authStore = useAuthStore();
                if (authStore.user && authStore.user._id === userId) {
                    authStore.patchUser({
                        isOnline,
                        lastSeen
                    });
                }
            } catch (e) {
                // in some contexts useAuthStore may not be available; ignore
            }
        },

        incrementUnreadCount(conversationId) {
            const conv = this.conversations.find(c => c._id === conversationId);
            if (conv && this.currentConversation?._id !== conversationId) {
                conv.unreadCount = (conv.unreadCount || 0) + 1;
            }
        },

        setTyping(userId, username, conversationId, isTyping) {
            if (this.currentConversation?._id === conversationId) {
                if (isTyping) {
                    this.typingUsers[userId] = username;
                } else {
                    delete this.typingUsers[userId];
                }
            }
        },

        setEditingMessage(message) {
            this.editingMessage = message;
        },

        clearEditingMessage() {
            this.editingMessage = null;
        },

        updateMessageInStore(updatedMessage) {
            const idx = this.messages.findIndex(m => m._id === updatedMessage._id);
            if (idx !== -1) {
                this.messages.splice(idx, 1, updatedMessage);
            }

            const conv = this.conversations.find(c => c._id === updatedMessage.conversation);
            if (conv && conv.lastMessage?._id === updatedMessage._id) {
                conv.lastMessage = updatedMessage;
            }

            if (updatedMessage.deleted) {
                this._scheduleRemoval(updatedMessage._id);
            } else {
                this._cancelScheduledRemoval(updatedMessage._id);
            }
        },

        removeMessageFromStore(messageId) {
            this._cancelScheduledRemoval(messageId);
            this.messages = this.messages.filter(m => m._id !== messageId);

            this.conversations.forEach(conv => {
                if (conv.lastMessage && conv.lastMessage._id === messageId) {
                    conv.lastMessage = null;
                }
            });
        },

        reactMessageInStore(message) {
            if (!message || !message._id) return;

            const idx = this.messages.findIndex(m => m._id === message._id);
            if (idx !== -1) {
                const existing = this.messages[idx] || {};
                const merged = {
                    ...existing, ...message, // ensure nested arrays/objects are replaced by server data when provided
                    reactions: message.reactions || existing.reactions || [],
                    sender: message.sender || existing.sender
                };
                this.messages.splice(idx, 1, merged);
            } else {
                this.messages.push(message);
            }

            const conv = this.conversations.find(c => c._id === message.conversation);
            if (conv && conv.lastMessage?._id === message._id) {
                conv.lastMessage = message;
            }
        },

        setSearchTerm(term) {
            this.searchTerm = term;
        },

        setFilter(filter) {
            this.filter = filter;
        },

        setSort(field, order = 'desc') {
            this.sort = field;
            this.sortOrder = order;
        },

        async archiveConversation(conversationId) {
            try {
                const res = await conversationAPI.archiveConversation(conversationId);
                const conv = this.conversations.find(c => c._id === conversationId);
                if (conv) conv.archived = true;
                return res.data;
            } catch (err) {
                console.error('Archive conversation error:', err.response?.data || err.message);
                throw err;
            }
        },

        async unarchiveConversation(conversationId) {
            try {
                const res = await conversationAPI.unarchiveConversation(conversationId);
                const conv = this.conversations.find(c => c._id === conversationId);
                if (conv) conv.archived = false;
                return res.data;
            } catch (err) {
                console.error('Unarchive conversation error:', err.response?.data || err.message);
                throw err;
            }
        },

        async deleteConversation(conversationId) {
            try {
                const res = await conversationAPI.deleteConversation(conversationId);
                // remove conversation locally
                this.conversations = this.conversations.filter(c => c._id !== conversationId);
                // if currentConversation was deleted, clear messages/currentConversation
                if (this.currentConversation?._id === conversationId) {
                    this.currentConversation = null;
                    this.messages = [];
                }
                return res.data;
            } catch (err) {
                console.error('Delete conversation error:', err.response?.data || err.message);
                throw err;
            }
        },

        async toggleBlockUser(userId) {
            try {
                const auth = useAuthStore();
                const isBlocked = auth.user?.blocked?.includes(userId);
                if (isBlocked) {
                    const res = await auth.unblockContact(userId);

                    const current = this.currentConversation;
                    if (current && !current.isGroup) {
                        const other = current.participants?.find(p => (typeof p === 'string' ? p !== auth.user._id : (p._id !== auth.user._id)));
                        const otherId = other ? (typeof other === 'string' ? other : other._id) : null;
                        if (otherId && String(otherId) === String(userId)) {
                            await this.fetchMessages(current._id);
                            this.currentConversation = {...current};
                        }
                    }

                    return res;
                } else {
                    const res = await auth.blockContact(userId);

                    const current = this.currentConversation;
                    if (current && !current.isGroup) {
                        const other = current.participants?.find(p => (typeof p === 'string' ? p !== auth.user._id : (p._id !== auth.user._id)));
                        const otherId = other ? (typeof other === 'string' ? other : other._id) : null;
                        if (otherId && String(otherId) === String(userId)) {
                            this.messages = [];

                            const conv = this.conversations.find(c => c._id === current._id);
                            if (conv) conv.unreadCount = 0;

                            this.currentConversation = {...current};
                        }
                    }

                    return res;
                }
            } catch (err) {
                console.error('Toggle block user error:', err.response?.data || err.message);
                throw err;
            }
        }
    }
});
