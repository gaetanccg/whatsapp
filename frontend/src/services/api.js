import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5001/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  register: (userData) => api.post('/auth/register', userData),
  login: (credentials) => api.post('/auth/login', credentials),
  getMe: () => api.get('/auth/me'),
  logout: () => api.post('/auth/logout')
};

export const userAPI = {
  getAllUsers: () => api.get('/users'),
  getUserById: (id) => api.get(`/users/${id}`),
  searchUsers: (query) => api.get(`/users/search?query=${query}`),
  // Profile endpoints
  getProfile: () => api.get('/users/profile'),
  updateProfile: (data) => api.put('/users/profile', data),
  deleteProfile: () => api.delete('/users/profile'),
  // Contacts
  listContacts: () => api.get('/users/contacts'),
  addContact: (id) => api.post(`/users/contacts/${id}`),
  removeContact: (id) => api.delete(`/users/contacts/${id}`),
  blockContact: (id) => api.post(`/users/contacts/${id}/block`),
  unblockContact: (id) => api.delete(`/users/contacts/${id}/block`)
};

// Proxy helper to forward requests to allowed external hosts via the backend
export const proxyAPI = {
  forward: ({ url, method = 'GET', headers = {}, body = null }) =>
    api.post('/proxy/forward', { url, method, headers, body })
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
  getOrCreateConversation: (participantId) => api.post('/conversations', { participantId }),
  createGroupConversation: (participantIds, groupName) =>
    api.post('/conversations/group', { participantIds, groupName }),
  archiveConversation: (id) => api.patch(`/conversations/${id}/archive`),
  unarchiveConversation: (id) => api.patch(`/conversations/${id}/unarchive`),
  deleteConversation: (id) => api.delete(`/conversations/${id}`)
};

export const messageAPI = {
  getMessages: (conversationId, limit = 50, skip = 0) =>
    api.get(`/messages/${conversationId}?limit=${limit}&skip=${skip}`),
  sendMessage: (conversationId, content) =>
    api.post('/messages', { conversationId, content }),
  editMessage: (messageId, content) =>
    api.put('/messages/edit', { messageId, content }),
  deleteMessage: (messageId) =>
    api.delete(`/messages/${messageId}`),
  reactMessage: (messageId, emoji) =>
    api.post('/messages/react', { messageId, emoji })
};

export const sessionsAPI = {
  list: () => api.get('/sessions'),
  revoke: (id) => api.delete(`/sessions/${id}`),
  history: (page = 1, limit = 20) => api.get(`/sessions/history?page=${page}&limit=${limit}`)
};

export default api;
