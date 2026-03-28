import { Router } from 'express';
import db from '../db.js';

const router = Router();

// GET /api/counties — list all counties
router.get('/', async (req, res) => {
  const rows = await db.prepare(
    `SELECT * FROM counties ORDER BY state, name`
  ).all();
  res.json(rows);
});

// GET /api/counties/lookup?name=X&state=Y — check a single county
router.get('/lookup', async (req, res) => {
  const { name, state } = req.query;
  if (!name) return res.json(null);
  const row = await db.prepare(
    `SELECT * FROM counties WHERE LOWER(name) = LOWER(?) AND LOWER(state) = LOWER(?)`
  ).get(name.trim(), (state || 'TX').trim());
  res.json(row || null);
});

// POST /api/counties — create
router.post('/', async (req, res) => {
  const { name, state = 'TX', status = 'unknown', regulations, contact_name, contact_phone, website, notes } = req.body;
  if (!name) return res.status(400).json({ error: 'County name required' });
  const result = await db.prepare(
    `INSERT INTO counties (name, state, status, regulations, contact_name, contact_phone, website, notes, researched_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id`
  ).run(name.trim(), state.trim(), status, regulations || null, contact_name || null, contact_phone || null, website || null, notes || null, req.user?.id || null);
  const row = await db.prepare(`SELECT * FROM counties WHERE id = ?`).get(result.lastInsertRowid);
  res.json(row);
});

// PUT /api/counties/:id — update
router.put('/:id', async (req, res) => {
  const { name, state, status, regulations, contact_name, contact_phone, website, notes } = req.body;
  await db.prepare(
    `UPDATE counties SET
       name = COALESCE(?, name),
       state = COALESCE(?, state),
       status = COALESCE(?, status),
       regulations = ?,
       contact_name = ?,
       contact_phone = ?,
       website = ?,
       notes = ?,
       updated_at = NOW()
     WHERE id = ?`
  ).run(name || null, state || null, status || null, regulations ?? null, contact_name ?? null, contact_phone ?? null, website ?? null, notes ?? null, req.params.id);
  const row = await db.prepare(`SELECT * FROM counties WHERE id = ?`).get(req.params.id);
  res.json(row);
});

// DELETE /api/counties/:id
router.delete('/:id', async (req, res) => {
  await db.prepare(`DELETE FROM counties WHERE id = ?`).run(req.params.id);
  res.json({ ok: true });
});

export default router;
