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

// Determine a valid frontend URL for CORS. If FRONTEND_URL is missing or contains
// a placeholder like "<your-frontend-url-will-add-later>", fall back to localhost:5173
let frontendUrl = process.env.FRONTEND_URL;
if (!frontendUrl || frontendUrl.includes('<') || frontendUrl.trim() === '') {
    frontendUrl = 'http://localhost:5173';
}

// Allow all CORS in non-production environments or when explicitly enabled
const allowAllCors = process.env.NODE_ENV !== 'production' || process.env.ALLOW_ALL_CORS === 'true';

if (process.env.SENTRY_DSN && process.env.NODE_ENV !== 'test') {
    // Build integrations array carefully: some versions of the profiling package
    // may not return an object compatible with Sentry's integration API.
    const integrations = [];

    try {
        if (typeof nodeProfilingIntegration === 'function') {
            const profiling = nodeProfilingIntegration();
            if (profiling && typeof profiling.setupOnce === 'function') {
                integrations.push(profiling);
            } else {
                console.warn('Profiling integration not compatible with the installed Sentry version — skipping profiling integration.');
            }
        }
    } catch (err) {
        console.warn('Error while initializing profiling integration, skipping it:', err.message || err);
    }

    Sentry.init({
        dsn: process.env.SENTRY_DSN,
        environment: process.env.NODE_ENV || 'development',
        integrations,
        tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
        profilesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
        beforeSend(event, hint) {
            if (process.env.NODE_ENV === 'development') {
                console.log('Sentry Event:', event);
            }
            return event;
        }
    });

    app.use(Sentry.Handlers.requestHandler());
    app.use(Sentry.Handlers.tracingHandler());
}

const corsOriginHandler = allowAllCors ? true : (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl)
    if (!origin) return callback(null, true);
    // Allow explicit configured frontend URL
    if (origin === frontendUrl) return callback(null, true);
    // Allow any localhost origin on any port for development convenience
    if (origin.startsWith('http://localhost:')) return callback(null, true);
    if (origin.startsWith('http://127.0.0.1:')) return callback(null, true);
    return callback(new Error('Not allowed by CORS'));
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

const io = new Server(httpServer, {
    cors: {
        origin: corsOriginHandler,
        methods: [
            'GET',
            'POST',
            'PATCH'
        ],
        credentials: true
    }
});

// register io instance for controllers
setIo(io);

app.use(cors(corsOptions));
// Ensure preflight requests are handled
app.options('*', cors(corsOptions));

app.use(express.json({limit: '10mb'}));
app.use(express.urlencoded({
    extended: true,
    limit: '10mb'
}));

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
        media: {
            ffmpeg: isFfmpegAvailable()
        }
    });
});

if (process.env.SENTRY_DSN && process.env.NODE_ENV !== 'test') {
    app.use(Sentry.Handlers.errorHandler({
        shouldHandleError(error) {
            return true;
        }
    }));
}

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

setupSocket(io);

// Set default port to 5001 to avoid macOS reserved port conflicts like Control Center on 5000
const PORT = process.env.PORT || 5001;

const startServer = async(port) => {
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
    startServer(PORT).catch(async(err) => {
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

export {app, httpServer, io};
