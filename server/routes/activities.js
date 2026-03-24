import { Router } from 'express';
import db from '../db.js';

const router = Router();

// List activities for an entity
router.get('/', async (req, res) => {
  const { entity_type, entity_id, type } = req.query;
  let sql = `SELECT a.*, u.name as created_by_name FROM activities a
    LEFT JOIN users u ON a.created_by = u.id WHERE 1=1`;
  const params = [];
  if (entity_type) { sql += ' AND a.entity_type = ?'; params.push(entity_type); }
  if (entity_id) { sql += ' AND a.entity_id = ?'; params.push(entity_id); }
  if (type) { sql += ' AND a.type = ?'; params.push(type); }
  sql += ' ORDER BY a.created_at DESC';
  res.json(await db.prepare(sql).all(...params));
});

// Create activity
router.post('/', async (req, res) => {
  const { entity_type, entity_id, type, subject, body, outcome, duration_mins } = req.body;
  if (!entity_type || !entity_id || !type) {
    return res.status(400).json({ error: 'entity_type, entity_id, and type required' });
  }
  const result = await db.prepare(`
    INSERT INTO activities (entity_type, entity_id, type, subject, body, outcome, duration_mins, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?) RETURNING id
  `).run(entity_type, entity_id, type, subject || '', body || '', outcome || '', duration_mins || null, req.user.id);
  res.json({ id: Number(result.lastInsertRowid) });
});

// Activity summary for an entity
router.get('/summary', async (req, res) => {
  const { entity_type, entity_id } = req.query;
  const counts = await db.prepare(`
    SELECT type, COUNT(*) as count FROM activities
    WHERE entity_type = ? AND entity_id = ?
    GROUP BY type
  `).all(entity_type, entity_id);
  const last = await db.prepare(`
    SELECT type, MAX(created_at) as last_at FROM activities
    WHERE entity_type = ? AND entity_id = ?
    GROUP BY type
  `).all(entity_type, entity_id);
  res.json({ counts, last });
});

export default router;
