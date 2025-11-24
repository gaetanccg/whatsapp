import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
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
  searchUsers: (query) => api.get(`/users/search?query=${query}`)
};

export const conversationAPI = {
  getConversations: () => api.get('/conversations'),
  getOrCreateConversation: (participantId) => api.post('/conversations', { participantId }),
  createGroupConversation: (participantIds, groupName) =>
    api.post('/conversations/group', { participantIds, groupName })
};

export const messageAPI = {
  getMessages: (conversationId, limit = 50, skip = 0) =>
    api.get(`/messages/${conversationId}?limit=${limit}&skip=${skip}`),
  sendMessage: (conversationId, content) =>
    api.post('/messages', { conversationId, content })
};

export const sessionsAPI = {
  list: () => api.get('/sessions'),
  revoke: (id) => api.delete(`/sessions/${id}`),
  history: (page = 1, limit = 20) => api.get(`/sessions/history?page=${page}&limit=${limit}`)
};

export default api;
