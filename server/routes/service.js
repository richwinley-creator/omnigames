import { Router } from 'express';
import db from '../db.js';
import { authMiddleware } from '../auth.js';

const router = Router();
router.use(authMiddleware);

// List tickets
router.get('/', (req, res) => {
  const { status, location_id, priority } = req.query;
  let sql = `SELECT t.*, l.name as location_name, u.name as assigned_name
    FROM service_tickets t
    LEFT JOIN locations l ON t.location_id = l.id
    LEFT JOIN users u ON t.assigned_to = u.id
    WHERE 1=1`;
  const params = [];
  if (status) { sql += ' AND t.status = ?'; params.push(status); }
  if (location_id) { sql += ' AND t.location_id = ?'; params.push(location_id); }
  if (priority) { sql += ' AND t.priority = ?'; params.push(priority); }
  sql += ' ORDER BY CASE t.priority WHEN \'urgent\' THEN 1 WHEN \'high\' THEN 2 WHEN \'normal\' THEN 3 WHEN \'low\' THEN 4 END, t.created_at DESC';
  res.json(db.prepare(sql).all(...params));
});

// Create ticket
router.post('/', (req, res) => {
  const { location_id, machine_name, issue_type, description, priority, assigned_to } = req.body;
  if (!location_id || !issue_type) {
    return res.status(400).json({ error: 'location_id and issue_type required' });
  }
  const result = db.prepare(`
    INSERT INTO service_tickets (location_id, machine_name, issue_type, description, priority, assigned_to)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(location_id, machine_name || '', issue_type, description || '', priority || 'normal', assigned_to || null);
  res.json({ id: result.lastInsertRowid });
});

// Update ticket
router.put('/:id', (req, res) => {
  const { status, priority, assigned_to, resolution_notes } = req.body;
  const updates = [];
  const params = [];
  if (status) { updates.push('status = ?'); params.push(status); }
  if (priority) { updates.push('priority = ?'); params.push(priority); }
  if (assigned_to !== undefined) { updates.push('assigned_to = ?'); params.push(assigned_to); }
  if (resolution_notes) { updates.push('resolution_notes = ?'); params.push(resolution_notes); }
  if (status === 'resolved') { updates.push("resolved_at = datetime('now')"); }
  updates.push("updated_at = datetime('now')");
  params.push(req.params.id);
  db.prepare(`UPDATE service_tickets SET ${updates.join(', ')} WHERE id = ?`).run(...params);
  res.json({ ok: true });
});

// Summary
router.get('/summary', (req, res) => {
  const byStatus = db.prepare('SELECT status, COUNT(*) as count FROM service_tickets GROUP BY status').all();
  const byPriority = db.prepare("SELECT priority, COUNT(*) as count FROM service_tickets WHERE status != 'resolved' GROUP BY priority").all();
  res.json({ byStatus, byPriority });
});

export default router;
