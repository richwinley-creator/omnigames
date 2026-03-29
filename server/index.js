import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import morgan from 'morgan';
import path from 'path';
import { fileURLToPath } from 'url';

import locationsRouter from './routes/locations.js';
import readingsRouter from './routes/readings.js';
import depositsRouter from './routes/deposits.js';
import paymentsRouter from './routes/payments.js';
import jvlRouter from './routes/jvl.js';
import extractRouter from './routes/extract.js';
import exportRouter from './routes/export.js';
import authRouter from './routes/auth-routes.js';
import leadsRouter from './routes/leads.js';
import fillsRouter from './routes/fills.js';
import serviceRouter from './routes/service.js';
import { authMiddleware } from './auth.js';
import chatRouter from './routes/chat.js';
import activitiesRouter from './routes/activities.js';
import tasksRouter from './routes/tasks.js';
import analyticsRouter from './routes/analytics.js';
import auditRouter from './routes/audit.js';
import attachmentsRouter from './routes/attachments.js';
import searchRouter from './routes/search.js';
import notificationsRouter from './routes/notifications.js';
import bulkRouter from './routes/bulk.js';
import countiesRouter from './routes/counties.js';
import contractRouter from './routes/contract.js';

// --- Env validation ---
const requiredEnvVars = ['JWT_SECRET'];
for (const key of requiredEnvVars) {
  if (!process.env[key]) {
    console.error(`FATAL: Missing required environment variable: ${key}`);
    process.exit(1);
  }
}
if (process.env.JWT_SECRET.includes('change') || process.env.JWT_SECRET.length < 32) {
  console.warn('WARNING: JWT_SECRET is weak or a placeholder. Use a strong random secret (32+ chars) in production.');
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3001;
const isProd = process.env.NODE_ENV === 'production';

// --- Security headers ---
app.use(helmet({
  contentSecurityPolicy: isProd ? undefined : false, // disable CSP in dev (Vite needs inline scripts)
}));

// --- CORS ---
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(s => s.trim())
  : ['http://localhost:5173', 'http://localhost:3001'];
app.use(cors({
  origin: isProd ? allowedOrigins : true, // permissive in dev, strict in prod
  credentials: true,
}));

// --- Request logging ---
app.use(morgan(isProd ? 'combined' : 'dev'));

// --- Body parsing ---
app.use(express.json({ limit: '50mb' }));

// --- Rate limiters ---
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later' },
});
app.use('/api/', globalLimiter);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20, // 20 login attempts per 15 min
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts, please try again later' },
});

const chatLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 messages per minute per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Chat rate limit exceeded, please slow down' },
});

const webhookLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30, // 30 webhook hits per minute
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Webhook rate limit exceeded' },
});

// --- Public routes (no auth, but rate-limited) ---
app.use('/api/auth', authLimiter, authRouter);
app.use('/api/leads', webhookLimiter, leadsRouter); // webhook is public, rest uses internal auth
app.use('/api/chat', chatLimiter, chatRouter);

// --- Protected API routes (all require auth) ---
app.use('/api/locations', authMiddleware, locationsRouter);
app.use('/api/readings', authMiddleware, readingsRouter);
app.use('/api/deposits', authMiddleware, depositsRouter);
app.use('/api/payments', authMiddleware, paymentsRouter);
app.use('/api/jvl', authMiddleware, jvlRouter);
app.use('/api/extract', authMiddleware, extractRouter);
app.use('/api/export', authMiddleware, exportRouter);
app.use('/api/fills', authMiddleware, fillsRouter);
app.use('/api/service', authMiddleware, serviceRouter);
app.use('/api/activities', authMiddleware, activitiesRouter);
app.use('/api/tasks', authMiddleware, tasksRouter);
app.use('/api/analytics', authMiddleware, analyticsRouter);
app.use('/api/audit', authMiddleware, auditRouter);
app.use('/api/attachments', authMiddleware, attachmentsRouter);
app.use('/api/search', authMiddleware, searchRouter);
app.use('/api/notifications', authMiddleware, notificationsRouter);
app.use('/api/bulk', authMiddleware, bulkRouter);
app.use('/api/counties', authMiddleware, countiesRouter);
app.use('/api/contract', authMiddleware, contractRouter);

// --- Health check ---
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

// --- Serve uploads (authenticated only) ---
const uploadsPath = path.join(__dirname, '..', 'uploads');
app.use('/uploads', authMiddleware, express.static(uploadsPath));

// --- Serve static files ---
const publicPath = path.join(__dirname, '..', 'public');
const distPath = path.join(__dirname, '..', 'dist');
app.use(express.static(publicPath));
app.use(express.static(distPath));
app.get('/{*splat}', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

// --- Global error handler ---
app.use((err, req, res, next) => {
  console.error(`[ERROR] ${req.method} ${req.path}:`, err.message);
  if (!isProd) console.error(err.stack);
  res.status(err.status || 500).json({
    error: isProd ? 'Internal server error' : err.message,
  });
});

app.listen(PORT, () => {
  console.log(`GSE API server running on http://localhost:${PORT} [${isProd ? 'production' : 'development'}]`);
});
