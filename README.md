# WhatsApp Clone - Full Stack Chat Application

A real-time messaging application inspired by WhatsApp, built with Vue.js 3, Express.js, MongoDB, and Socket.IO.

## Features

- JWT Authentication (Register/Login)
- Real-time one-to-one and group messaging
- Online/offline user status tracking
- Typing indicators
- Unread message notifications
- Message history
- Responsive design with Vuetify
- Comprehensive test coverage
- CI/CD with GitHub Actions
- Error tracking with Sentry

## Tech Stack

### Frontend

- Vue.js 3
- Vuetify (Material Design)
- Pinia (State Management)
- Socket.IO Client
- Axios
- Vue Router
- Vite

### Backend

- Express.js
- MongoDB with Mongoose
- Socket.IO
- JWT Authentication
- Bcrypt.js

### Testing

- Mocha + Chai + Supertest (Backend)
- Vitest (Frontend)
- C8 (Code Coverage)

## Project Structure

```
/project-root
├── /backend                 # Express.js backend
│   ├── /config             # Database configuration
│   ├── /controllers        # Route controllers
│   ├── /models             # Mongoose models
│   ├── /routes             # API routes
│   ├── /middlewares        # Authentication middleware
│   ├── /sockets            # Socket.IO handlers
│   ├── /tests              # Backend tests
│   └── server.js           # Entry point
│
├── /frontend               # Vue.js frontend
│   ├── /src
│   │   ├── /components     # Vue components
│   │   ├── /views          # Page views
│   │   ├── /router         # Vue Router
│   │   ├── /store          # Pinia stores
│   │   └── /services       # API and Socket services
│   └── vite.config.js
│
└── /.github
    └── /workflows          # CI/CD workflows
```

## Installation

### Prerequisites

- Node.js 18+
- MongoDB instance (or MongoDB Atlas account)
- npm or yarn

### 1. Clone the repository

```bash
git clone <repository-url>
cd whatsapp-clone
```

### 2. Install dependencies

```bash
npm run install:all
```

Or install individually:

```bash
# Root
npm install

# Backend
cd backend && npm install

# Frontend
cd frontend && npm install
```

### 3. Configure environment variables

**Backend (.env)**

```env
PORT=5000
MONGODB_URI=mongodb+srv://gaetan6942_db_user:<user_db_password>@cluster0.mw2cay3.mongodb.net/whatsapp-clone?retryWrites=true&w=majority&appName=Cluster0
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
SENTRY_DSN=
```

**Frontend (.env)**

```env
VITE_API_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
VITE_SENTRY_DSN=
```

## Running the Application

### Development Mode (Both servers)

```bash
npm run dev
```

This will start:

- Backend: http://localhost:5000
- Frontend: http://localhost:5173

### Run separately

**Backend only:**

```bash
npm run dev:backend
```

**Frontend only:**

```bash
npm run dev:frontend
```

## Testing

### Run backend tests

```bash
npm run test:backend
```

### Run frontend tests

```bash
npm run test:frontend
```

### Run all tests

```bash
npm test
```

## Building for Production

### Build frontend

```bash
npm run build
```

## API Endpoints

### Authentication

- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user

### Users

- `GET /api/users` - Get all users
- `GET /api/users/search?query=` - Search users
- `GET /api/users/:id` - Get user by ID

### Conversations

- `GET /api/conversations` - Get user's conversations
- `POST /api/conversations` - Create/get one-to-one conversation
- `POST /api/conversations/group` - Create group conversation

### Messages

- `GET /api/messages/:conversationId` - Get messages
- `POST /api/messages` - Send message

## Socket.IO Events

### Client → Server

- `sendMessage` - Send a message
- `typing` - Broadcast typing status
- `joinConversation` - Join conversation room
- `leaveConversation` - Leave conversation room
- `markAsRead` - Mark messages as read

### Server → Client

- `receiveMessage` - Receive new message
- `newMessageNotification` - New message notification
- `onlineUsers` - List of online users
- `userStatusUpdate` - User online/offline status
- `userTyping` - User typing indicator
- `messagesRead` - Messages marked as read

## Deployment

### GitHub Secrets Required

- `MONGODB_URI` - MongoDB connection string
- `JWT_SECRET` - JWT secret key
- `RENDER_API_KEY` - Render API key
- `RENDER_BACKEND_SERVICE_ID` - Render backend service ID
- `RENDER_FRONTEND_SERVICE_ID` - Render frontend service ID
- `SENTRY_AUTH_TOKEN` - Sentry authentication token
- `SENTRY_ORG` - Sentry organization
- `VITE_API_URL` - Production API URL
- `VITE_SOCKET_URL` - Production Socket URL
- `VITE_SENTRY_DSN` - Sentry DSN for frontend

### CI/CD Workflow

- **CI:** Runs on push/PR to main/develop branches
    - Tests backend and frontend
    - Generates coverage reports
    - Lints code

- **Deploy:** Runs on push to main branch
    - Deploys backend to Render
    - Deploys frontend to Render
    - Notifies Sentry of deployment

## Scripts

```bash
npm run dev              # Run both backend and frontend
npm run dev:backend      # Run backend only
npm run dev:frontend     # Run frontend only
npm test                 # Run backend tests
npm run test:backend     # Run backend tests
npm run test:frontend    # Run frontend tests
npm run build            # Build frontend
npm run install:all      # Install all dependencies
npm run clean            # Remove all node_modules
```

## License

MIT

## Author

Created for educational purposes
