import { createApp } from 'vue';
import { createPinia } from 'pinia';
import * as Sentry from '@sentry/vue';
import App from './App.vue';
import router from './router/index.js';

import 'vuetify/styles';
import { createVuetify } from 'vuetify';
import * as components from 'vuetify/components';
import * as directives from 'vuetify/directives';
import '@mdi/font/css/materialdesignicons.css';

// Install fetch proxy in dev to transparently proxy requests to blocked hosts
if (import.meta.env.DEV) {
  try {
    await import('./services/fetchProxy.js');
  } catch (err) {
    console.warn('Failed to load fetch proxy:', err);
  }
}

const vuetify = createVuetify({
  components,
  directives,
  theme: {
    defaultTheme: 'light',
    themes: {
      light: {
        colors: {
          primary: '#075e54',
          secondary: '#128c7e',
          accent: '#25d366',
          error: '#d32f2f',
          success: '#4caf50'
        }
      }
    }
  }
});

const pinia = createPinia();
const app = createApp(App);

if (import.meta.env.VITE_SENTRY_DSN) {
  Sentry.init({
    app,
    dsn: import.meta.env.VITE_SENTRY_DSN,
    integrations: [
      Sentry.browserTracingIntegration({ router }),
      Sentry.replayIntegration()
    ],
    tracesSampleRate: 1.0,
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0
  });
}

app.use(pinia);
app.use(router);
app.use(vuetify);
app.mount('#app');
