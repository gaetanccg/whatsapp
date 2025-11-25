import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import MessageInput from '../MessageInput.vue';
import { createVuetify } from 'vuetify';
import * as components from 'vuetify/components';
import * as directives from 'vuetify/directives';

const vuetify = createVuetify({
  components,
  directives,
});

describe('MessageInput.vue', () => {
  let wrapper;
  let pinia;

  beforeEach(() => {
    pinia = createPinia();
    setActivePinia(pinia);

    wrapper = mount(MessageInput, {
      global: {
        plugins: [pinia, vuetify],
        stubs: {
          'v-card': true,
          'v-card-text': true,
          'v-form': true,
          'v-text-field': true,
          'v-btn': true,
          'v-icon': true,
          'v-progress-circular': true,
        }
      }
    });
  });

  it('renders the component', () => {
    expect(wrapper.exists()).toBe(true);
  });

  it('has message text field', () => {
    expect(wrapper.find('v-text-field-stub').exists()).toBe(true);
  });

  it('has send button', () => {
    const buttons = wrapper.findAll('v-btn-stub');
    expect(buttons.length).toBeGreaterThan(0);
  });

  it('initializes with empty message text', () => {
    expect(wrapper.vm.messageText).toBe('');
  });

  it('has file input for attachments', () => {
    expect(wrapper.find('input[type="file"]').exists()).toBe(true);
  });
});
