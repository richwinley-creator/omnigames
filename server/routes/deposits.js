import { Router } from 'express';
import db from '../db.js';

const router = Router();

router.get('/', (req, res) => {
  res.json(db.prepare('SELECT * FROM deposits ORDER BY date DESC').all());
});

router.post('/', (req, res) => {
  const { date, amount, bank, ref } = req.body;
  if (!date || !amount) return res.status(400).json({ error: 'date and amount required' });
  const result = db.prepare('INSERT INTO deposits (date, amount, bank, ref) VALUES (?, ?, ?, ?)')
    .run(date, amount, bank || 'Bank of America', ref || '');
  res.json({ id: result.lastInsertRowid });
});

export default router;
