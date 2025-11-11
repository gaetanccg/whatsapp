# Quick Start Guide

Get the WhatsApp Clone running in 5 minutes!

## Prerequisites

- Node.js 18+ installed
- MongoDB connection (using provided Atlas connection)
- Terminal/Command Line

## Installation Steps

### 1. Install Dependencies

```bash
npm run install:all
```

This will install dependencies for:
- Root monorepo
- Backend
- Frontend

### 2. Environment Variables

The `.env` files are already configured with default values:

**Backend** (`backend/.env`):
- MongoDB connection: Already configured with Atlas
- JWT secret: Set (change in production)
- Port: 5000

**Frontend** (`frontend/.env`):
- API URL: http://localhost:5000/api
- Socket URL: http://localhost:5000

You don't need to change anything for local development!

### 3. Start the Application

```bash
npm run dev
```

This starts both:
- Backend server on http://localhost:5000
- Frontend app on http://localhost:5173

### 4. Use the Application

1. Open browser to http://localhost:5173
2. Click "Register" to create an account
3. Enter username, email, and password
4. After registration, you'll be logged in automatically
5. Click "+" to start a new conversation
6. Open another browser/incognito window
7. Register another user
8. Start chatting in real-time!

## Features to Try

### Real-time Messaging
- Send messages between users
- See messages appear instantly
- Messages persist in MongoDB

### Online Status
- See who's online in the right panel
- Green dot indicates online users
- Click on online users to start chatting

### Typing Indicators
- Start typing in a conversation
- Other user sees "User is typing..."
- Indicator disappears after 2 seconds

### Notifications
- Receive notification when new message arrives
- Unread count shown on conversations
- Badge shows number of unread messages

### Message History
- All messages saved to database
- Scroll to see older messages
- Messages load when opening conversation

## Project Structure

```
/project-root
├── /backend               # Express.js API
│   ├── /config           # Database config
│   ├── /controllers      # Business logic
│   ├── /models           # MongoDB models
│   ├── /routes           # API endpoints
│   ├── /sockets          # Socket.IO handlers
│   ├── /tests            # Test files
│   └── server.js         # Entry point
│
├── /frontend             # Vue.js 3 app
│   ├── /src
│   │   ├── /components   # Reusable components
│   │   ├── /views        # Pages (Login, Register, Chat)
│   │   ├── /router       # Vue Router config
│   │   ├── /store        # Pinia state management
│   │   ├── /services     # API & Socket.IO services
│   │   └── main.js       # Entry point
│   └── vite.config.js
│
└── /.github
    └── /workflows        # CI/CD configuration
```

## Available Scripts

```bash
# Development
npm run dev              # Start both backend and frontend
npm run dev:backend      # Start backend only
npm run dev:frontend     # Start frontend only

# Testing
npm test                 # Run backend tests
npm run test:backend     # Run backend tests with coverage
npm run test:frontend    # Run frontend tests

# Production
npm run build           # Build frontend for production

# Maintenance
npm run install:all     # Install all dependencies
npm run clean           # Remove all node_modules
```

## Testing

Run the test suite:

```bash
npm test
```

Tests cover:
- Authentication (register, login, JWT)
- User management
- Conversations (one-to-one and groups)
- Messages (send, receive, history)
- Socket.IO connections and events

## API Endpoints

### Authentication
```
POST   /api/auth/register     # Register new user
POST   /api/auth/login        # Login user
GET    /api/auth/me          # Get current user
```

### Users
```
GET    /api/users            # Get all users
GET    /api/users/search     # Search users
GET    /api/users/:id        # Get specific user
```

### Conversations
```
GET    /api/conversations    # Get user's conversations
POST   /api/conversations    # Create/get conversation
POST   /api/conversations/group  # Create group chat
```

### Messages
```
GET    /api/messages/:id     # Get conversation messages
POST   /api/messages         # Send message
```

## Socket.IO Events

### Emit (Client → Server)
- `sendMessage` - Send a message
- `typing` - User is typing
- `joinConversation` - Join chat room
- `leaveConversation` - Leave chat room
- `markAsRead` - Mark messages as read

### Listen (Server → Client)
- `receiveMessage` - New message received
- `newMessageNotification` - Notification for new message
- `onlineUsers` - List of online users
- `userStatusUpdate` - User went online/offline
- `userTyping` - Someone is typing
- `messagesRead` - Messages were read

## Troubleshooting

### Backend won't start
```bash
# Check if port 5000 is in use
lsof -i :5000

# Kill process using port 5000
kill -9 <PID>
```

### Frontend won't start
```bash
# Check if port 5173 is in use
lsof -i :5173

# Kill process using port 5173
kill -9 <PID>
```

### Can't connect to MongoDB
- Check internet connection
- Verify MongoDB Atlas cluster is running
- Check connection string in `backend/.env`

### Messages not appearing in real-time
- Check browser console for errors
- Verify backend is running
- Check WebSocket connection in browser dev tools (Network tab)

### Tests failing
```bash
# Clear test database
# Tests use the same MongoDB with test database

# Run tests with verbose output
cd backend && npm test
```

## Next Steps

1. **Customize the UI**: Edit Vue components in `frontend/src/components`
2. **Add Features**: Extend backend controllers and models
3. **Deploy**: Follow `DEPLOYMENT.md` for production deployment
4. **Add Security**: Implement rate limiting, input validation
5. **Optimize**: Add message pagination, image uploads, etc.

## Common Use Cases

### Adding a New API Endpoint
1. Create controller function in `backend/controllers/`
2. Add route in `backend/routes/`
3. Update frontend service in `frontend/src/services/api.js`
4. Write tests in `backend/tests/`

### Adding a New Component
1. Create component in `frontend/src/components/`
2. Import in parent component or view
3. Use component in template

### Adding Socket Event
1. Add event handler in `backend/sockets/chatSocket.js`
2. Add event listener in frontend component
3. Test connection and events

## Resources

- **Documentation**: See `README.md` for full documentation
- **Deployment**: See `DEPLOYMENT.md` for deployment guide
- **Vue.js**: https://vuejs.org/
- **Vuetify**: https://vuetifyjs.com/
- **Socket.IO**: https://socket.io/docs/
- **Express**: https://expressjs.com/
- **MongoDB**: https://docs.mongodb.com/

## Support

For issues or questions:
1. Check the console logs (browser and terminal)
2. Review error messages
3. Check MongoDB Atlas dashboard
4. Verify environment variables
5. Review relevant documentation

## License

MIT - Feel free to use for learning and projects!

---

**Happy Coding!**
