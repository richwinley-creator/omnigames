import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import db from '../db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadsDir = path.join(__dirname, '..', '..', 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const ALLOWED_MIME_TYPES = [
  'image/png', 'image/jpeg', 'image/gif', 'image/webp',
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'text/csv',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`File type ${file.mimetype} not allowed`), false);
  }
};

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter,
});

const router = Router();

// Upload file
router.post('/', upload.single('file'), async (req, res) => {
  const { entity_type, entity_id } = req.body;
  if (!entity_type || !entity_id || !req.file) {
    return res.status(400).json({ error: 'entity_type, entity_id, and file required' });
  }
  const result = await db.prepare(`
    INSERT INTO attachments (entity_type, entity_id, filename, original_name, mime_type, size, uploaded_by)
    VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING id
  `).run(entity_type, entity_id, req.file.filename, req.file.originalname,
    req.file.mimetype, req.file.size, req.user.id);
  res.json({ id: Number(result.lastInsertRowid), filename: req.file.filename });
});

// List attachments for entity
router.get('/', async (req, res) => {
  const { entity_type, entity_id } = req.query;
  let sql = `SELECT a.*, u.name as uploaded_by_name FROM attachments a
    LEFT JOIN users u ON a.uploaded_by = u.id WHERE 1=1`;
  const params = [];
  if (entity_type) { sql += ' AND a.entity_type = ?'; params.push(entity_type); }
  if (entity_id) { sql += ' AND a.entity_id = ?'; params.push(entity_id); }
  sql += ' ORDER BY a.created_at DESC';
  res.json(await db.prepare(sql).all(...params));
});

// Download file — path traversal protected
router.get('/download/:filename', (req, res) => {
  const filename = path.basename(req.params.filename);
  const filePath = path.join(uploadsDir, filename);
  const resolvedPath = path.resolve(filePath);
  if (!resolvedPath.startsWith(path.resolve(uploadsDir))) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'File not found' });
  res.download(filePath);
});

// Delete attachment
router.delete('/:id', async (req, res) => {
  const att = await db.prepare('SELECT * FROM attachments WHERE id = ?').get(req.params.id);
  if (!att) return res.status(404).json({ error: 'Not found' });
  const filePath = path.join(uploadsDir, path.basename(att.filename));
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  await db.prepare('DELETE FROM attachments WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

export default router;
