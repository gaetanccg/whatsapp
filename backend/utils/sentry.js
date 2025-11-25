import * as Sentry from '@sentry/node';

export const captureError = (error, context = {}) => {
  if (!process.env.SENTRY_DSN) return;

  Sentry.captureException(error, {
    tags: context.tags || {},
    extra: context.extra || {},
    level: context.level || 'error',
  });
};

export const addBreadcrumb = (message, category = 'action', data = {}) => {
  if (!process.env.SENTRY_DSN) return;

  Sentry.addBreadcrumb({
    category,
    message,
    level: 'info',
    data,
  });
};

export const setUserContext = (user) => {
  if (!process.env.SENTRY_DSN || !user) return;

  Sentry.setUser({
    id: user._id?.toString(),
    username: user.username,
    email: user.email,
  });
};

export const startTransaction = (name, op = 'http.request') => {
  if (!process.env.SENTRY_DSN) {
    return {
      finish: () => {},
      setStatus: () => {},
    };
  }

  return Sentry.startTransaction({ name, op });
};

export const captureMessage = (message, level = 'info', context = {}) => {
  if (!process.env.SENTRY_DSN) return;

  Sentry.captureMessage(message, {
    level,
    tags: context.tags || {},
    extra: context.extra || {},
  });
};
