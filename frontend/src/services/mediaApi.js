import api from './api.js';

export const mediaAPI = {
  upload: (conversationId, files, content = '', options = {}) => {
    const form = new FormData();
    form.append('conversationId', conversationId);
    if (content) form.append('content', content);
    files.forEach(f => form.append('files', f));
    return api.post('/media', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      signal: options.signal,
      onUploadProgress: options.onUploadProgress
    });
  },
  download: (mediaId) => api.get(`/media/${mediaId}`, { responseType: 'blob' }),
  thumbnail: (mediaId) => api.get(`/media/${mediaId}/thumbnail`, { responseType: 'blob' }),
  view: (mediaId) => api.get(`/media/${mediaId}/raw`, { responseType: 'blob' }),
  delete: (mediaId) => api.delete(`/media/${mediaId}`)
};

export default mediaAPI;
