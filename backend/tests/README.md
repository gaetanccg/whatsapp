# Backend Tests Documentation

This document provides an overview of all backend tests for the WhatsApp Clone application.

## Test Framework

- **Framework**: Mocha
- **Assertions**: Chai
- **HTTP Testing**: Supertest
- **Coverage**: c8
- **Timeout**: 10 seconds

## Running Tests

```bash
# Run all tests
npm test

# Run specific test file
npm test -- tests/auth.test.js

# Generate coverage report
npm run test:coverage
```

## Test Files Overview

### 1. auth.test.js
Tests for authentication endpoints.

**Coverage**:
- User registration
- User login
- Password validation
- Token generation
- Current user retrieval
- Logout functionality

**Test Count**: 8 tests

### 2. user.test.js
Tests for user management endpoints.

**Coverage**:
- Get all users
- Search users
- Get user by ID
- Add/remove contacts
- List contacts
- Update user profile
- Username uniqueness validation

**Test Count**: 17 tests

### 3. conversation.test.js
Tests for conversation management.

**Coverage**:
- Create private conversations
- Create group conversations
- List conversations
- Archive/unarchive conversations
- Delete conversations (soft delete)
- Search and filter conversations
- Group name validation
- Minimum participants validation

**Test Count**: 13 tests

### 4. message.test.js
Tests for message operations.

**Coverage**:
- Send messages
- Get messages
- Edit messages
- Delete messages (soft delete)
- Message reactions
- Read receipts
- Media attachments
- Message type detection

**Test Count**: 10 tests

### 5. session.test.js
Tests for session management.

**Coverage**:
- Session creation on register/login
- List active sessions
- Revoke sessions
- Login history tracking
- History filtering by event type
- Pagination in history
- Prevent revoking already revoked sessions
- Handle non-existent sessions

**Test Count**: 11 tests

### 6. blocking.test.js
Tests for user blocking functionality.

**Coverage**:
- Block user
- Unblock user
- List blocked users
- Prevent messaging blocked users
- Prevent receiving messages from blocked users
- Block enforcement in conversations
- Prevent self-blocking
- Blocked array management

**Test Count**: 12 tests

### 7. media.test.js
Tests for media upload and management.

**Coverage**:
- Upload media (base64)
- Retrieve media by ID
- Delete own media
- Prevent deleting others' media
- Media metadata storage
- Authentication requirements
- Handle non-existent media

**Test Count**: 11 tests

### 8. integration.test.js
End-to-end integration tests.

**Coverage**:
- Complete user flow (register → contact → conversation → message)
- Group conversation flow
- Message edit and delete flow
- Contact management flow
- Session management flow
- Conversation archive flow

**Test Count**: 7 tests

### 9. models.test.js
Tests for database models.

**Coverage**:
- User model (password hashing, validation)
- Message model (defaults, references)
- Conversation model (participants, unread counts)
- Media model (metadata storage)
- Session model (token management)
- LoginHistory model (event tracking)

**Test Count**: 15 tests

### 10. socket.test.js
Tests for WebSocket functionality.

**Coverage**:
- Socket authentication
- Send message via socket
- Real-time message delivery
- Typing indicators
- Online/offline status
- Message read status
- Disconnect handling

**Test Count**: 8 tests

### 11. middleware.test.js
Tests for Express middlewares.

**Coverage**:
- Auth middleware (token validation)
- Error handling middleware
- CORS middleware
- JSON body parser
- Expired token handling
- Missing token handling
- Invalid token handling

**Test Count**: 12 tests

### 12. utils.test.js
Tests for utility functions.

**Coverage**:
- FFmpeg availability check
- Sentry error capture
- Sentry breadcrumbs
- Sentry user context
- Sentry transactions
- Sentry message capture
- Graceful degradation when Sentry disabled

**Test Count**: 14 tests

## Total Test Count

**138+ tests** covering all major functionality.

## Test Structure

All tests follow this structure:

```javascript
describe('Feature Name', function() {
  before(async function() {
    // Setup before all tests
  });

  beforeEach(async function() {
    // Setup before each test
  });

  afterEach(async function() {
    // Cleanup after each test
  });

  after(async function() {
    // Cleanup after all tests
  });

  it('should do something', async function() {
    // Test implementation
  });
});
```

## Code Coverage Goals

**Target**: 70% minimum coverage

### Current Coverage by Module

- **Models**: ~97%
- **Routes**: ~75%
- **Controllers**: ~45% (improved from 10%)
- **Middlewares**: ~30%
- **Sockets**: ~6%
- **Utils**: ~25% (improved from 22%)

## Test Best Practices

### 1. Database Cleanup
Always clean up database state after each test:

```javascript
afterEach(async function() {
  await User.deleteMany({});
  await Message.deleteMany({});
  await Conversation.deleteMany({});
});
```

### 2. Authentication
Create authenticated requests:

```javascript
const res = await request(app)
  .post('/api/auth/register')
  .send({ username, email, password });

const token = res.body.token;

// Use token in subsequent requests
await request(app)
  .get('/api/users')
  .set('Authorization', `Bearer ${token}`);
```

### 3. Async/Await
Always use async/await for asynchronous operations:

```javascript
it('should create user', async function() {
  const user = await User.create({ ... });
  expect(user).to.exist;
});
```

### 4. Error Cases
Test both success and error cases:

```javascript
it('should succeed with valid data', async function() {
  // Test success case
});

it('should fail with invalid data', async function() {
  // Test error case
});
```

### 5. Assertions
Use clear, specific assertions:

```javascript
// Good
expect(res.status).to.equal(200);
expect(res.body).to.have.property('username', 'testuser');
expect(res.body).to.be.an('array');

// Avoid
expect(res).to.exist;
```

## Common Test Patterns

### Testing Protected Routes

```javascript
it('should require authentication', async function() {
  const res = await request(app)
    .get('/api/protected')
    .expect(401);

  expect(res.body).to.have.property('message', 'Not authorized, no token');
});
```

### Testing Validation

```javascript
it('should validate required fields', async function() {
  const res = await request(app)
    .post('/api/endpoint')
    .set('Authorization', `Bearer ${token}`)
    .send({})
    .expect(400);

  expect(res.body).to.have.property('message');
});
```

### Testing Relationships

```javascript
it('should create conversation between users', async function() {
  const res = await request(app)
    .post('/api/conversations')
    .set('Authorization', `Bearer ${token}`)
    .send({ participantId: otherUserId })
    .expect(201);

  const conversation = await Conversation.findById(res.body._id)
    .populate('participants');

  expect(conversation.participants).to.have.lengthOf(2);
});
```

## Debugging Tests

### Run single test

```bash
npm test -- tests/auth.test.js --grep "should register"
```

### Enable verbose output

```bash
npm test -- --reporter spec
```

### Check coverage for specific file

```bash
npm test -- tests/auth.test.js
npm run test:coverage
```

## CI/CD Integration

Tests run automatically on:
- Every commit
- Pull requests
- Before deployment

GitHub Actions workflow:
```yaml
- name: Run tests
  run: npm test
  env:
    NODE_ENV: test
    MONGODB_URI: ${{ secrets.MONGODB_URI_TEST }}
    JWT_SECRET: ${{ secrets.JWT_SECRET }}
```

## Troubleshooting

### Tests timeout
Increase timeout in test:
```javascript
it('slow test', async function() {
  this.timeout(20000); // 20 seconds
  // test code
});
```

### Database connection issues
Ensure MongoDB is running and accessible:
```bash
mongosh $MONGODB_URI
```

### Port conflicts
Change test port in test setup if needed.

### Memory leaks
Always close connections after tests:
```javascript
after(async function() {
  await mongoose.connection.close();
  httpServer.close();
});
```

## Contributing

When adding new features:

1. Write tests first (TDD approach)
2. Ensure tests pass: `npm test`
3. Check coverage: `npm run test:coverage`
4. Update this documentation if needed

## Resources

- [Mocha Documentation](https://mochajs.org/)
- [Chai Assertions](https://www.chaijs.com/api/)
- [Supertest Guide](https://github.com/visionmedia/supertest)
- [c8 Coverage](https://github.com/bcoe/c8)
