import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import * as Sentry from '@sentry/node';
import connectDB from './config/db.js';
import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import conversationRoutes from './routes/conversationRoutes.js';
import messageRoutes from './routes/messageRoutes.js';
import { setupSocket } from './sockets/chatSocket.js';

dotenv.config();

const app = express();
const httpServer = createServer(app);

// Determine a valid frontend URL for CORS. If FRONTEND_URL is missing or contains
// a placeholder like "<your-frontend-url-will-add-later>", fall back to localhost:5173
let frontendUrl = process.env.FRONTEND_URL;
if (!frontendUrl || frontendUrl.includes('<') || frontendUrl.trim() === '') {
  frontendUrl = 'http://localhost:5173';
}

if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    tracesSampleRate: 1.0,
  });

  app.use(Sentry.Handlers.requestHandler());
  app.use(Sentry.Handlers.tracingHandler());
}

const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl)
    if (!origin) return callback(null, true);
    // Allow explicit configured frontend URL
    if (origin === frontendUrl) return callback(null, true);
    // Allow any localhost origin on any port for development convenience
    if (origin.startsWith('http://localhost:')) return callback(null, true);
    if (origin.startsWith('http://127.0.0.1:')) return callback(null, true);
    return callback(new Error('Not allowed by CORS'));
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: true,
};

const io = new Server(httpServer, {
  cors: {
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (origin === frontendUrl) return callback(null, true);
      if (origin.startsWith('http://localhost:')) return callback(null, true);
      if (origin.startsWith('http://127.0.0.1:')) return callback(null, true);
      return callback(new Error('Not allowed by CORS'));
    },
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

app.use(cors(corsOptions));
// Ensure preflight requests are handled
app.options('*', cors(corsOptions));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/conversations', conversationRoutes);
app.use('/api/messages', messageRoutes);

app.get('/', (req, res) => {
  res.json({ message: 'WhatsApp Clone API' });
});

app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

if (process.env.SENTRY_DSN) {
  app.use(Sentry.Handlers.errorHandler());
}

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!', error: err.message });
});

setupSocket(io);

// Set default port to 5001 to avoid macOS reserved port conflicts like Control Center on 5000
const PORT = process.env.PORT || 5001;

const startServer = async (port) => {
  try {
    await connectDB();

    return await new Promise((resolve, reject) => {
      const srv = httpServer.listen(port, () => {
        console.log(`Server running on port ${port}`);
        resolve(srv);
      });

      srv.on('error', (err) => {
        reject(err);
      });
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    throw err;
  }
};

if (process.env.NODE_ENV !== 'test') {
  startServer(PORT).catch(async (err) => {
    if (err && err.code === 'EADDRINUSE') {
      const fallbackPort = 5002;
      console.warn(`Port ${PORT} in use, trying ${fallbackPort}...`);
      try {
        await startServer(fallbackPort);
      } catch (err2) {
        console.error('Failed to start on fallback port as well:', err2);
        process.exit(1);
      }
    } else {
      console.error('Server failed to start:', err);
      process.exit(1);
    }
  });
}

export { app, httpServer, io };
