import axios from 'axios';

const api = axios.create({
    baseURL: `${import.meta.env.VITE_API_URL}/api`,
    headers: {
        'Content-Type': 'application/json'
    }
});

api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
}, (error) => {
    return Promise.reject(error);
});

api.interceptors.response.use((response) => response, (error) => {
    if (error.response?.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
    }
    return Promise.reject(error);
});

export const authAPI = {
    register: (userData) => api.post('/auth/register', userData),
    login: (credentials) => api.post('/auth/login', credentials),
    getMe: () => api.get('/auth/me'),
    logout: () => api.post('/auth/logout'),
    forgotPassword: (email) => api.post('/auth/forgot-password', {email}),
    resetPassword: (token, password) => api.post('/auth/reset-password', {
        token,
        password
    })
};

export const userAPI = {
    getAllUsers: () => api.get('/users'),
    getUserById: (id) => api.get(`/users/${id}`),
    searchUsers: (query) => api.get(`/users/search?query=${query}`), // Profile endpoints
    getProfile: () => api.get('/users/profile'),
    updateProfile: (data) => api.put('/users/profile', data),
    deleteProfile: () => api.delete('/users/profile'), // Contacts
    listContacts: () => api.get('/users/contacts'),
    addContact: (id) => api.post(`/users/contacts/${id}`),
    removeContact: (id) => api.delete(`/users/contacts/${id}`),
    blockContact: (id) => api.post(`/users/contacts/${id}/block`),
    unblockContact: (id) => api.delete(`/users/contacts/${id}/block`), // Blocked users listing
    getBlockedUsers: () => api.get('/users/blocked'), // Convenience: toggle block server-side (tries block then if already blocked, unblocks)
    toggleBlock: async(id) => {
        try {
            return await api.post(`/users/contacts/${id}/block`);
        } catch (err) {
            // If user is already blocked, try to unblock
            if (err.response && err.response.status === 400 && (err.response.data?.message || '').toLowerCase().includes('already blocked')) {
                return await api.delete(`/users/contacts/${id}/block`);
            }
            throw err;
        }
    }
};

// Proxy helper to forward requests to allowed external hosts via the backend
export const proxyAPI = {
    forward: ({
                  url,
                  method = 'GET',
                  headers = {},
                  body = null
              }) => api.post('/proxy/forward', {
        url,
        method,
        headers,
        body
    })
};

export const conversationAPI = {
    getConversations: (params = {}) => {
        const searchParams = new URLSearchParams();
        Object.entries(params).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== '') {
                searchParams.append(key, value);
            }
        });
        const queryString = searchParams.toString();
        return api.get(`/conversations${queryString ? `?${queryString}` : ''}`);
    },
    getOrCreateConversation: (participantId) => api.post('/conversations', {participantId}),
    createGroupConversation: (data) => api.post('/conversations/group', data),
    archiveConversation: (id) => api.patch(`/conversations/${id}/archive`),
    unarchiveConversation: (id) => api.patch(`/conversations/${id}/unarchive`),
    deleteConversation: (id) => api.delete(`/conversations/${id}`),
    updateGroupInfo: (id, data) => api.patch(`/conversations/${id}/group-info`, data),
    addGroupMembers: (id, userIds) => api.post(`/conversations/${id}/members`, {userIds}),
    removeGroupMember: (id, memberId) => api.delete(`/conversations/${id}/members/${memberId}`),
    promoteToAdmin: (id, memberId) => api.patch(`/conversations/${id}/members/${memberId}/promote`),
    updateNotificationSettings: (id, settings) => api.patch(`/conversations/${id}/notifications`, settings)
};

export const messageAPI = {
    getMessages: (conversationId, limit = 50, skip = 0) => api.get(`/messages/${conversationId}?limit=${limit}&skip=${skip}`),
    sendMessage: (conversationId, content, mediaIds) => api.post('/messages', {
        conversationId,
        content,
        mediaIds
    }),
    replyToMessage: (conversationId, content, replyTo, mediaIds) => api.post('/messages/reply', {
        conversationId,
        content,
        replyTo,
        mediaIds
    }),
    editMessage: (messageId, content) => api.put('/messages/edit', {
        messageId,
        content
    }),
    deleteMessage: (messageId) => api.delete(`/messages/${messageId}`),
    reactMessage: (messageId, emoji) => api.post('/messages/react', {
        messageId,
        emoji
    }),
    searchMessages: (params = {}) => {
        const searchParams = new URLSearchParams();
        Object.entries(params).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== '') {
                searchParams.append(key, value);
            }
        });
        const queryString = searchParams.toString();
        return api.get(`/messages/search${queryString ? `?${queryString}` : ''}`);
    },
    updateMessageStatus: (messageId, status) => api.patch('/messages/status', {
        messageId,
        status
    })
};

export const sessionsAPI = {
    list: () => api.get('/sessions'),
    revoke: (id) => api.delete(`/sessions/${id}`),
    history: (page = 1, limit = 20) => api.get(`/sessions/history?page=${page}&limit=${limit}`)
};

export const mediaAPI = {
    upload: (conversationId, files, content = '', options = {}) => {
        const form = new FormData();
        form.append('conversationId', conversationId);
        if (content) form.append('content', content);
        files.forEach(f => form.append('files', f));
        return api.post('/media', form, {
            headers: {'Content-Type': 'multipart/form-data'},
            signal: options.signal,
            onUploadProgress: options.onUploadProgress
        });
    },
    download: (mediaId) => api.get(`/media/${mediaId}`, {responseType: 'blob'}),
    thumbnail: (mediaId) => api.get(`/media/${mediaId}/thumbnail`, {responseType: 'blob'}),
    view: (mediaId) => api.get(`/media/${mediaId}/raw`, {responseType: 'blob'}),
    delete: (mediaId) => api.delete(`/media/${mediaId}`),
    getConversationMedia: (conversationId, params = {}) => {
        const searchParams = new URLSearchParams();
        if (params.limit) searchParams.append('limit', params.limit);
        if (params.skip) searchParams.append('skip', params.skip);
        return api.get(`/media/conversation/${conversationId}${searchParams.toString() ? `?${searchParams.toString()}` : ''}`);
    }
};

export default api;
