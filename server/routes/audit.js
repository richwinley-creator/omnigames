import { Router } from 'express';
import db from '../db.js';

const router = Router();

// List audit logs
router.get('/', async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  const { entity_type, entity_id, action, limit: lim } = req.query;
  let sql = 'SELECT * FROM audit_log WHERE 1=1';
  const params = [];
  if (entity_type) { sql += ' AND entity_type = ?'; params.push(entity_type); }
  if (entity_id) { sql += ' AND entity_id = ?'; params.push(entity_id); }
  if (action) { sql += ' AND action = ?'; params.push(action); }
  sql += ' ORDER BY created_at DESC LIMIT ?';
  params.push(parseInt(lim) || 200);
  res.json(await db.prepare(sql).all(...params));
});

export default router;
