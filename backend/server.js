import express from 'express';
import {createServer} from 'http';
import {Server} from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import * as Sentry from '@sentry/node';
import {nodeProfilingIntegration} from '@sentry/profiling-node';
import connectDB from './config/db.js';
import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import conversationRoutes from './routes/conversationRoutes.js';
import messageRoutes from './routes/messageRoutes.js';
import sessionRoutes from './routes/sessionRoutes.js';
import {setupSocket} from './sockets/chatSocket.js';
import proxyRoutes from './routes/proxyRoutes.js';
import {setIo} from './sockets/socketEmitter.js';
import mediaRoutes from './routes/mediaRoutes.js';
import {isFfmpegAvailable} from './utils/mediaProcessing.js';

dotenv.config();

const app = express();
const httpServer = createServer(app);

/* ============================================================
   CORS — simplified for Nginx monolithic deployment
   ------------------------------------------------------------
   In the Docker+Nginx architecture, backend & frontend share
   the same domain → no more cross-domain CORS required.
===============================================================*/

const allowAllCors = true;

const corsOriginHandler = allowAllCors ? true : (origin, callback) => {
    if (!origin) return callback(null, true);
    return callback(null, true);
};

const corsOptions = {
    origin: corsOriginHandler,
    methods: [
        'GET',
        'POST',
        'PUT',
        'PATCH',
        'DELETE',
        'OPTIONS'
    ],
    credentials: true
};

/* ============================================================
   Socket.IO — IMPORTANT
   ------------------------------------------------------------
   Nginx proxies /socket.io/ to this server.
   No CORS needed, everything is same-domain.
=============================================================== */

const io = new Server(httpServer, {
    cors: {
        origin: true,
        credentials: true
    }
});

// register io instance for controllers
setIo(io);

/* ============================================================
   SENTRY
=============================================================== */

if (process.env.SENTRY_DSN && process.env.NODE_ENV !== 'test') {
    const integrations = [];
    try {
        if (typeof nodeProfilingIntegration === 'function') {
            const profiling = nodeProfilingIntegration();
            if (profiling && typeof profiling.setupOnce === 'function') {
                integrations.push(profiling);
            }
        }
    } catch (err) {
        console.warn('Profiling integration failed:', err);
    }

    Sentry.init({
        dsn: process.env.SENTRY_DSN,
        environment: process.env.NODE_ENV || 'development',
        integrations,
        tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
        profilesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0
    });

    app.use(Sentry.Handlers.requestHandler());
    app.use(Sentry.Handlers.tracingHandler());
}

/* ============================================================
   MIDDLEWARES
=============================================================== */

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

app.use(express.json({limit: '10mb'}));
app.use(express.urlencoded({
    extended: true,
    limit: '10mb'
}));

/* ============================================================
   ROUTES
=============================================================== */

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/conversations', conversationRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/proxy', proxyRoutes);
app.use('/api/media', mediaRoutes);

app.get('/', (req, res) => {
    res.json({message: 'WhatsApp Clone API'});
});

app.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        media: {ffmpeg: isFfmpegAvailable()}
    });
});

/* ============================================================
   SENTRY ERROR HANDLER
=============================================================== */

if (process.env.SENTRY_DSN && process.env.NODE_ENV !== 'test') {
    app.use(Sentry.Handlers.errorHandler());
}

/* ============================================================
   ERROR HANDLER
=============================================================== */

app.use((err, req, res, next) => {
    console.error(err.stack);

    if (process.env.SENTRY_DSN && process.env.NODE_ENV !== 'test') {
        Sentry.captureException(err, {
            tags: {
                endpoint: req.path,
                method: req.method
            },
            extra: {
                body: req.body,
                query: req.query,
                params: req.params
            }
        });
    }

    res.status(err.status || 500).json({
        message: err.message || 'Something went wrong!',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

/* ============================================================
   SOCKET SETUP
=============================================================== */

setupSocket(io);

/* ============================================================
   START SERVER — FOR NGINX MONOLITHIC DEPLOY
   ------------------------------------------------------------
   PORT MUST BE 5000 (Nginx reverse proxy requires this)
=============================================================== */

// Respecter la variable d'environnement PORT si fournie (fallback 5000)
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 5000;

const startServer = async() => {
    try {
        await connectDB();

        httpServer.listen(PORT, '0.0.0.0', () => {
            console.log(`Backend running on port ${PORT}`);
        });

    } catch (err) {
        console.error('Failed to start server:', err);
        process.exit(1);
    }
};

if (process.env.NODE_ENV !== 'test') {
    startServer();
}

export {app, httpServer, io};
