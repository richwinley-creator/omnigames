import { Router } from 'express';
import db from '../db.js';

const router = Router();

// Admin only — all payment routes
router.use((req, res, next) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  next();
});

router.get('/', async (req, res) => {
  const sql = `
    SELECT p.*, l.name as location_name
    FROM payments p
    JOIN locations l ON l.id = p.location_id
    ORDER BY p.status ASC, p.created_at DESC
  `;
  res.json(await db.prepare(sql).all());
});

router.post('/', async (req, res) => {
  const { location_id, partner, amount, period } = req.body;
  if (!location_id || !amount) return res.status(400).json({ error: 'location_id and amount required' });
  const result = await db.prepare(`
    INSERT INTO payments (location_id, partner, amount, period)
    VALUES (?, ?, ?, ?) RETURNING id
  `).run(location_id, partner, amount, period || '');
  res.json({ id: result.lastInsertRowid });
});

router.put('/:id/pay', async (req, res) => {
  await db.prepare(`UPDATE payments SET status = 'paid', paid_date = NOW() WHERE id = ?`)
    .run(req.params.id);
  res.json({ ok: true });
});

export default router;
