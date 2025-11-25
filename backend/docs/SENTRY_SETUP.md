# Sentry Integration Guide

This document explains the Sentry integration in the WhatsApp Clone backend.

## Configuration

### Environment Variables

Add your Sentry DSN to the `.env` file:

```env
SENTRY_DSN=your_sentry_dsn_here
NODE_ENV=development
```

### Sample Rates

- **Development**: 100% traces and profiles
- **Production**: 10% traces and profiles (configurable in `server.js`)

## Features Implemented

### 1. Error Tracking

All errors are automatically captured and sent to Sentry:

- **Automatic**: Via error handler middleware
- **Manual**: Using `Sentry.captureException()` or helper `captureError()`

Example:
```javascript
import { captureError } from '../utils/sentry.js';

try {
  // your code
} catch (error) {
  captureError(error, {
    tags: { controller: 'message', action: 'send' },
    extra: { userId: req.user._id }
  });
}
```

### 2. User Context

User information is automatically attached to all events when authenticated:

```javascript
Sentry.setUser({
  id: user._id.toString(),
  username: user.username,
  email: user.email,
});
```

This happens in the `authMiddleware.js` for all authenticated requests.

### 3. Breadcrumbs

Breadcrumbs are added throughout the application to track user actions:

```javascript
Sentry.addBreadcrumb({
  category: 'messages',
  message: 'Sending message',
  level: 'info',
  data: { conversationId, hasContent: true }
});
```

### 4. Transaction Tracing

Performance monitoring via transactions:

```javascript
const transaction = Sentry.startTransaction({
  op: 'message.send',
  name: 'POST /api/messages',
});

try {
  // your code
  transaction.setStatus('ok');
} catch (error) {
  transaction.setStatus('internal_error');
} finally {
  transaction.finish();
}
```

### 5. Profiling

Performance profiling is enabled via `@sentry/profiling-node`:

- CPU profiling
- Memory usage tracking
- Function call tracking

## Where It's Implemented

### server.js
- Sentry initialization
- Request handler middleware
- Tracing handler middleware
- Error handler middleware

### authMiddleware.js
- User context setting
- Error capture for auth failures

### messageController.js
- Transaction tracing for message operations
- Breadcrumbs for message actions
- Error capture with context

### chatSocket.js
- Breadcrumbs for socket events
- Error capture for socket errors

### utils/sentry.js
- Helper functions for consistent Sentry usage
- Reusable error capture
- Breadcrumb helpers

## Testing Sentry

### Test Error Capture

Add a test endpoint in `server.js`:

```javascript
app.get('/debug-sentry', function mainHandler(req, res) {
  throw new Error('My first Sentry error!');
});
```

Visit `http://localhost:5001/debug-sentry` to trigger an error.

### Test Transaction

Transactions are automatically created for all HTTP requests when using the tracing handler.

### Test User Context

Make any authenticated API request and check Sentry dashboard for user info.

## Sentry Dashboard

View errors and performance data at: https://sentry.io

### Useful Views

1. **Issues**: All captured errors
2. **Performance**: Transaction traces and slow operations
3. **Releases**: Track errors by deployment
4. **Alerts**: Configure notifications for errors

## Best Practices

1. **Don't log sensitive data**: Avoid logging passwords, tokens, etc.
2. **Use breadcrumbs liberally**: They help debug issues
3. **Set user context**: Always set user info when available
4. **Use tags**: Categorize errors for easier filtering
5. **Set appropriate sample rates**: Don't overload Sentry in production

## Alerting

Configure alerts in Sentry dashboard:

1. Go to **Alerts** > **Create Alert**
2. Choose conditions:
   - First seen issue
   - Issue frequency threshold
   - Error rate increase
3. Configure notifications:
   - Email
   - Slack
   - PagerDuty
   - Webhooks

## Sample Alert Rules

### Critical Errors
- **Condition**: New error first seen
- **Filter**: `level:error`
- **Notify**: Slack + Email

### Performance Degradation
- **Condition**: Transaction duration > 2s
- **Filter**: `transaction.op:http.request`
- **Notify**: Email

### High Error Rate
- **Condition**: Error count > 10 in 5 minutes
- **Filter**: `environment:production`
- **Notify**: PagerDuty

## Troubleshooting

### Events not appearing

1. Check `SENTRY_DSN` is set correctly
2. Verify network connectivity to Sentry
3. Check console logs for Sentry errors
4. Ensure sample rates are > 0

### Too many events

1. Lower `tracesSampleRate` in production
2. Use `beforeSend` to filter events
3. Configure ignore rules in Sentry dashboard

### Missing user context

1. Ensure user is authenticated
2. Check `authMiddleware.js` is being called
3. Verify `Sentry.setUser()` is executed

## Additional Resources

- [Sentry Node.js Docs](https://docs.sentry.io/platforms/node/)
- [Sentry Express Integration](https://docs.sentry.io/platforms/node/guides/express/)
- [Performance Monitoring](https://docs.sentry.io/platforms/node/performance/)
- [Profiling](https://docs.sentry.io/platforms/node/profiling/)
