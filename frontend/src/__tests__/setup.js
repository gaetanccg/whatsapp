import {vi} from 'vitest';
import {config} from '@vue/test-utils';

// Mock localStorage with an in-memory store
const _store = {};
const localStorageMock = {
    getItem: vi.fn((key) => {
        // Return null to mimic browser localStorage when the key doesn't exist
        const val = Object.prototype.hasOwnProperty.call(_store, key) ? _store[key] : null;
        return val;
    }),
    setItem: vi.fn((key, value) => {
        _store[key] = String(value);
    }),
    removeItem: vi.fn((key) => {
        delete _store[key];
    }),
    clear: vi.fn(() => {
        Object.keys(_store).forEach(k => delete _store[k]);
    })
};

global.localStorage = localStorageMock;

// Register global stubs for common Vuetify components used in the app/tests
const vuetifyStubs = [
    'v-card',
    'v-card-text',
    'v-card-title',
    'v-card-actions',
    'v-list',
    'v-list-item',
    'v-list-item-content',
    'v-list-item-title',
    'v-list-item-subtitle',
    'v-list-item-action',
    'v-avatar',
    'v-badge',
    'v-chip',
    'v-icon',
    'v-divider',
    'v-menu',
    'v-btn',
    'v-text-field',
    'v-select',
    'v-dialog',
    'v-spacer',
    'v-progress-circular',
    'v-form'
];

// Components we want to allow rendering from Vuetify instead of stubbing
const allowRender = new Set([
    'v-text-field',
    'v-btn',
    'v-list',
    'v-list-item',
    'v-list-item-content',
    'v-list-item-title',
    'v-list-item-subtitle',
    'v-list-item-action'
]);

// Helper to convert kebab-case to PascalCase (v-list -> VList)
const toPascalCase = (kebab) => kebab.split('-').map(part => part.charAt(0).toUpperCase() + part.slice(1)).join('');

vuetifyStubs.forEach(name => {
    if (allowRender.has(name)) return; // don't stub these, let vuetify render them
    // kebab-case stub (v-card)
    config.global.stubs[name] = true;
    // PascalCase stub (VCard) - handle leading 'v' prefix specially
    const pascal = toPascalCase(name);
    config.global.stubs[pascal] = true;
});

// Mock window.location
delete window.location;
window.location = {
    href: '',
    pathname: '/',
    search: '',
    hash: ''
};

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation(query => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn()
    }))
});

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver
{
    constructor() {
    }

    disconnect() {
    }

    observe() {
    }

    takeRecords() {
        return [];
    }

    unobserve() {
    }
};

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver
{
    constructor() {
    }

    disconnect() {
    }

    observe() {
    }

    unobserve() {
    }
};
