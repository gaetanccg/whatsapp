import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useAuthStore } from '../index.js';

vi.mock('../../services/api.js', () => ({
  authAPI: {
    register: vi.fn(),
    login: vi.fn(),
    getMe: vi.fn(),
  },
  conversationAPI: {},
  messageAPI: {},
  userAPI: {
    getContacts: vi.fn(),
  },
  sessionsAPI: {
    list: vi.fn(),
    revoke: vi.fn(),
    history: vi.fn(),
  },
}));

vi.mock('../../services/socket.js', () => ({
  default: {
    connect: vi.fn(),
    disconnect: vi.fn(),
  },
}));

describe('Auth Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    localStorage.clear();
  });

  it('initializes with default state', () => {
    const store = useAuthStore();
    expect(store.user).toBeNull();
    expect(store.token).toBeNull();
    expect(store.isAuthenticated).toBe(false);
  });

  it('sets authentication state', () => {
    const store = useAuthStore();
    const authData = {
      token: 'test-token',
      _id: '123',
      username: 'testuser',
      email: 'test@example.com',
    };

    store.setAuth(authData);

    expect(store.user).toEqual(authData);
    expect(store.token).toBe('test-token');
    expect(store.isAuthenticated).toBe(true);
  });

  it('clears authentication on logout', () => {
    const store = useAuthStore();
    const authData = {
      token: 'test-token',
      _id: '123',
      username: 'testuser',
    };

    store.setAuth(authData);
    store.logout();

    expect(store.user).toBeNull();
    expect(store.token).toBeNull();
    expect(store.isAuthenticated).toBe(false);
  });

  it('patches user data', () => {
    const store = useAuthStore();
    store.user = {
      _id: '123',
      username: 'oldname',
      email: 'old@example.com',
    };

    store.patchUser({ username: 'newname' });

    expect(store.user.username).toBe('newname');
    expect(store.user.email).toBe('old@example.com');
  });
});
