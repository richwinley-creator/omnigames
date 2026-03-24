import { Router } from 'express';
import db from '../db.js';

const router = Router();

// Admin only — all deposit routes
router.use((req, res, next) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  next();
});

router.get('/', async (req, res) => {
  res.json(await db.prepare('SELECT * FROM deposits ORDER BY date DESC').all());
});

router.post('/', async (req, res) => {
  const { date, amount, bank, ref } = req.body;
  if (!date || !amount) return res.status(400).json({ error: 'date and amount required' });
  const result = await db.prepare('INSERT INTO deposits (date, amount, bank, ref) VALUES (?, ?, ?, ?) RETURNING id')
    .run(date, amount, bank || 'Bank of America', ref || '');
  res.json({ id: result.lastInsertRowid });
});

export default router;
