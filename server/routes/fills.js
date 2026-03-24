import { Router } from 'express';
import db from '../db.js';

const router = Router();

// List fills
router.get('/', async (req, res) => {
  const { location_id } = req.query;
  let sql = `SELECT f.*, l.name as location_name, u.name as filled_by_name
    FROM fills f
    LEFT JOIN locations l ON f.location_id = l.id
    LEFT JOIN users u ON f.filled_by = u.id`;
  const params = [];
  if (location_id) { sql += ' WHERE f.location_id = ?'; params.push(location_id); }
  sql += ' ORDER BY f.date DESC';
  res.json(await db.prepare(sql).all(...params));
});

// Create fill
router.post('/', async (req, res) => {
  const { location_id, date, amount, notes } = req.body;
  if (!location_id || !date || !amount) {
    return res.status(400).json({ error: 'location_id, date, and amount required' });
  }
  const result = await db.prepare(
    'INSERT INTO fills (location_id, date, amount, filled_by, notes) VALUES (?, ?, ?, ?, ?) RETURNING id'
  ).run(location_id, date, amount, req.user.id, notes || '');
  res.json({ id: result.lastInsertRowid });
});

// Summary
router.get('/summary', async (req, res) => {
  const total = await db.prepare('SELECT COALESCE(SUM(amount), 0) as total FROM fills').get();
  const byLocation = await db.prepare(`
    SELECT l.name, COALESCE(SUM(f.amount), 0) as total, COUNT(f.id) as fill_count
    FROM fills f JOIN locations l ON f.location_id = l.id
    GROUP BY f.location_id, l.name ORDER BY total DESC
  `).all();
  res.json({ total: total.total, byLocation });
});

export default router;
