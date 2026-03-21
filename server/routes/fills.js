import { Router } from 'express';
import db from '../db.js';
import { authMiddleware } from '../auth.js';

const router = Router();
router.use(authMiddleware);

// List fills
router.get('/', (req, res) => {
  const { location_id } = req.query;
  let sql = `SELECT f.*, l.name as location_name, u.name as filled_by_name
    FROM fills f
    LEFT JOIN locations l ON f.location_id = l.id
    LEFT JOIN users u ON f.filled_by = u.id`;
  const params = [];
  if (location_id) { sql += ' WHERE f.location_id = ?'; params.push(location_id); }
  sql += ' ORDER BY f.date DESC';
  res.json(db.prepare(sql).all(...params));
});

// Create fill
router.post('/', (req, res) => {
  const { location_id, date, amount, notes } = req.body;
  if (!location_id || !date || !amount) {
    return res.status(400).json({ error: 'location_id, date, and amount required' });
  }
  const result = db.prepare(
    'INSERT INTO fills (location_id, date, amount, filled_by, notes) VALUES (?, ?, ?, ?, ?)'
  ).run(location_id, date, amount, req.user.id, notes || '');
  res.json({ id: result.lastInsertRowid });
});

// Summary
router.get('/summary', (req, res) => {
  const total = db.prepare('SELECT COALESCE(SUM(amount), 0) as total FROM fills').get();
  const byLocation = db.prepare(`
    SELECT l.name, COALESCE(SUM(f.amount), 0) as total, COUNT(f.id) as fill_count
    FROM fills f JOIN locations l ON f.location_id = l.id
    GROUP BY f.location_id ORDER BY total DESC
  `).all();
  res.json({ total: total.total, byLocation });
});

export default router;
