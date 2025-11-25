import { describe, it, expect, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import MessageList from '../components/MessageList.vue';
import { createVuetify } from 'vuetify';
import * as components from 'vuetify/components';
import * as directives from 'vuetify/directives';

const vuetify = createVuetify({
  components,
  directives,
});

describe('Performance Tests', () => {
  let pinia;

  beforeEach(() => {
    pinia = createPinia();
    setActivePinia(pinia);
  });

  describe('Component Mounting', () => {
    it('mounts MessageList within acceptable time', () => {
      const start = performance.now();

      const wrapper = mount(MessageList, {
        global: {
          plugins: [pinia, vuetify],
          stubs: {
            'v-card': true,
            'v-card-text': true,
            'v-list': true,
            'v-list-item': true,
            'v-avatar': true,
            'v-chip': true,
            'v-menu': true,
            'v-btn': true,
            'v-icon': true,
            'v-img': true,
            'v-progress-circular': true,
          }
        }
      });

      const end = performance.now();
      const duration = end - start;

      expect(wrapper.exists()).toBe(true);
      expect(duration).toBeLessThan(200);
    });

    it('handles large message lists efficiently', () => {
      const wrapper = mount(MessageList, {
        global: {
          plugins: [pinia, vuetify],
          stubs: {
            'v-card': true,
            'v-card-text': true,
            'v-list': true,
            'v-list-item': true,
            'v-avatar': true,
            'v-chip': true,
            'v-menu': true,
            'v-btn': true,
            'v-icon': true,
            'v-img': true,
            'v-progress-circular': true,
          }
        }
      });

      const start = performance.now();

      const messages = Array.from({ length: 100 }, (_, i) => ({
        _id: `msg-${i}`,
        content: `Message ${i}`,
        sender: { username: `user${i}` },
        createdAt: new Date().toISOString(),
      }));

      wrapper.vm.messages = messages;

      const end = performance.now();
      const duration = end - start;

      expect(wrapper.vm.messages.length).toBe(100);
      expect(duration).toBeLessThan(100);
    });
  });

  describe('Store Performance', () => {
    it('updates store state quickly', async () => {
      const { useAuthStore } = await import('../store/index.js');
      const store = useAuthStore();

      const start = performance.now();

      store.patchUser({ username: 'newname' });

      const end = performance.now();
      const duration = end - start;

      expect(duration).toBeLessThan(20);
    });
  });

  describe('Date Formatting Performance', () => {
    it('formats dates quickly', async () => {
      const { formatRelativeTime } = await import('../utils/date.js');

      const dates = Array.from({ length: 1000 }, () =>
        new Date(Date.now() - Math.random() * 86400000).toISOString()
      );

      const start = performance.now();

      dates.forEach((date) => formatRelativeTime(date));

      const end = performance.now();
      const duration = end - start;

      expect(duration).toBeLessThan(150);
    });
  });
});
