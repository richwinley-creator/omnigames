import 'dotenv/config';
import express from 'express';
import cors from 'cors';
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

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Public routes (no auth)
app.use('/api/auth', authRouter);
app.use('/api/leads', leadsRouter);  // webhook endpoint is public, rest uses its own auth
app.use('/api/chat', chatRouter);   // public chatbot endpoint

// Protected API routes
app.use('/api/locations', authMiddleware, locationsRouter);
app.use('/api/readings', authMiddleware, readingsRouter);
app.use('/api/deposits', authMiddleware, depositsRouter);
app.use('/api/payments', authMiddleware, paymentsRouter);
app.use('/api/jvl', authMiddleware, jvlRouter);
app.use('/api/extract', authMiddleware, extractRouter);
app.use('/api/export', authMiddleware, exportRouter);
app.use('/api/fills', fillsRouter);
app.use('/api/service', serviceRouter);

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

// Serve static files
const publicPath = path.join(__dirname, '..', 'public');
const distPath = path.join(__dirname, '..', 'dist');
app.use(express.static(publicPath));
app.use(express.static(distPath));
app.get('/{*splat}', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`GSE API server running on http://localhost:${PORT}`);
});
