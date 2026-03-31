import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import app from './app.js';
import { authMiddleware } from './auth.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3001;
const isProd = process.env.NODE_ENV === 'production';

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

app.listen(PORT, () => {
  console.log(`GSE API server running on http://localhost:${PORT} [${isProd ? 'production' : 'development'}]`);
});
