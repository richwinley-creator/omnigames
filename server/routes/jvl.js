import { Router } from 'express';
import db from '../db.js';

const router = Router();

router.get('/', async (req, res) => {
  res.json(await db.prepare('SELECT * FROM jvl_deals ORDER BY updated_at DESC').all());
});

router.post('/', async (req, res) => {
  const { business_name, contact, stage, games, commission, notes } = req.body;
  if (!business_name) return res.status(400).json({ error: 'business_name required' });
  const result = await db.prepare(`
    INSERT INTO jvl_deals (business_name, contact, stage, games, commission, notes)
    VALUES (?, ?, ?, ?, ?, ?) RETURNING id
  `).run(business_name, contact || '', stage || 'new', games || 0, commission || 0, notes || '');
  res.json({ id: result.lastInsertRowid });
});

router.put('/:id', async (req, res) => {
  const { business_name, contact, stage, games, commission, notes } = req.body;
  await db.prepare(`
    UPDATE jvl_deals SET business_name=?, contact=?, stage=?, games=?, commission=?, notes=?, updated_at=NOW()
    WHERE id = ?
  `).run(business_name, contact, stage, games, commission, notes, req.params.id);
  res.json({ ok: true });
});

router.delete('/:id', async (req, res) => {
  await db.prepare('DELETE FROM jvl_deals WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

export default router;
