import { defineStore } from 'pinia';
import { authAPI, conversationAPI, messageAPI, userAPI, sessionsAPI } from '../services/api.js';
import socketService from '../services/socket.js';

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: JSON.parse(localStorage.getItem('user')) || null,
    token: localStorage.getItem('token') || null,
    isAuthenticated: !!localStorage.getItem('token'),
    sessions: [],
    history: { items: [], page: 1, limit: 20, total: 0 }
  }),

  actions: {
    patchUser(data) {
      if (!this.user) return;
      this.user = { ...this.user, ...data };
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

    async backendLogout() {
      try {
        await authAPI.logout();
      } catch (err) {
        console.error('Backend logout error:', err.response?.data || err.message);
      }
      this.logout();
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
        this.fetchHistory(1, this.history.limit)
      ]);
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
    error: null
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
      } catch (error) {
        this.error = error.message;
        console.error('Fetch messages error:', error);
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
      await this.fetchMessages(conversation._id);
      socketService.joinConversation(conversation._id);
      socketService.markAsRead(conversation._id);

      const conv = this.conversations.find(c => c._id === conversation._id);
      if (conv) {
        conv.unreadCount = 0;
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
      }

      const conv = this.conversations.find(c => c._id === message.conversation);
      if (conv) {
        conv.lastMessage = message;
        conv.updatedAt = message.createdAt;
      }
    },

    updateOnlineUsers(users) {
      this.onlineUsers = users;
      this.users.forEach(user => {
        user.isOnline = users.includes(user._id);
      });
    },

    updateUserStatus(userId, isOnline, lastSeen = null) {
      const user = this.users.find(u => u._id === userId);
      if (user) {
        user.isOnline = isOnline;
        if (lastSeen) user.lastSeen = lastSeen;
      }

      if (isOnline && !this.onlineUsers.includes(userId)) {
        this.onlineUsers.push(userId);
      } else if (!isOnline) {
        this.onlineUsers = this.onlineUsers.filter(id => id !== userId);
      }

      // If the status change concerns the currently authenticated user, update auth store
      try {
        const authStore = useAuthStore();
        if (authStore.user && authStore.user._id === userId) {
          authStore.patchUser({ isOnline, lastSeen });
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
    }
  }
});
