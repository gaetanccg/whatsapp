import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import ChatList from '../ChatList.vue';
import { createVuetify } from 'vuetify';
import * as components from 'vuetify/components';
import * as directives from 'vuetify/directives';

const vuetify = createVuetify({
  components,
  directives,
});

describe('ChatList.vue', () => {
  let wrapper;
  let pinia;

  beforeEach(() => {
    pinia = createPinia();
    setActivePinia(pinia);

    wrapper = mount(ChatList, {
      global: {
        plugins: [pinia, vuetify],
        stubs: {
          'v-card': true,
          'v-list': true,
          'v-list-item': true,
          'v-list-item-title': true,
          'v-list-item-subtitle': true,
          'v-avatar': true,
          'v-badge': true,
          'v-chip': true,
          'v-icon': true,
          'v-divider': true,
          'v-menu': true,
        }
      }
    });
  });

  it('renders the component', () => {
    expect(wrapper.exists()).toBe(true);
  });

  it('displays conversation list', () => {
    expect(wrapper.find('v-list-stub').exists()).toBe(true);
  });

  it('has proper component structure', () => {
    expect(wrapper.find('v-card-stub').exists()).toBe(true);
  });
});
