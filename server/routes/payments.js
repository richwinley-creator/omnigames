import { Router } from 'express';
import db from '../db.js';

const router = Router();

router.get('/', (req, res) => {
  const sql = `
    SELECT p.*, l.name as location_name
    FROM payments p
    JOIN locations l ON l.id = p.location_id
    ORDER BY p.status ASC, p.created_at DESC
  `;
  res.json(db.prepare(sql).all());
});

router.post('/', (req, res) => {
  const { location_id, partner, amount, period } = req.body;
  if (!location_id || !amount) return res.status(400).json({ error: 'location_id and amount required' });
  const result = db.prepare(`
    INSERT INTO payments (location_id, partner, amount, period)
    VALUES (?, ?, ?, ?)
  `).run(location_id, partner, amount, period || '');
  res.json({ id: result.lastInsertRowid });
});

router.put('/:id/pay', (req, res) => {
  db.prepare(`UPDATE payments SET status = 'paid', paid_date = datetime('now') WHERE id = ?`)
    .run(req.params.id);
  res.json({ ok: true });
});

export default router;
