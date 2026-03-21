import { Router } from 'express';
import db from '../db.js';

const router = Router();

router.get('/', (req, res) => {
  res.json(db.prepare('SELECT * FROM jvl_deals ORDER BY updated_at DESC').all());
});

router.post('/', (req, res) => {
  const { business_name, contact, stage, games, commission, notes } = req.body;
  if (!business_name) return res.status(400).json({ error: 'business_name required' });
  const result = db.prepare(`
    INSERT INTO jvl_deals (business_name, contact, stage, games, commission, notes)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(business_name, contact || '', stage || 'new', games || 0, commission || 0, notes || '');
  res.json({ id: result.lastInsertRowid });
});

router.put('/:id', (req, res) => {
  const { business_name, contact, stage, games, commission, notes } = req.body;
  db.prepare(`
    UPDATE jvl_deals SET business_name=?, contact=?, stage=?, games=?, commission=?, notes=?, updated_at=datetime('now')
    WHERE id = ?
  `).run(business_name, contact, stage, games, commission, notes, req.params.id);
  res.json({ ok: true });
});

router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM jvl_deals WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

export default router;
