import { Router } from 'express';
import db from '../db.js';

const router = Router();

// List tasks
router.get('/', async (req, res) => {
  const { status, assigned_to, entity_type, entity_id, overdue } = req.query;
  let sql = `SELECT t.*, u.name as assigned_name, c.name as created_by_name
    FROM tasks t
    LEFT JOIN users u ON t.assigned_to = u.id
    LEFT JOIN users c ON t.created_by = c.id
    WHERE 1=1`;
  const params = [];
  // Team users only see their own tasks
  if (req.user.role !== 'admin') {
    sql += ' AND (t.assigned_to = ? OR t.created_by = ?)';
    params.push(req.user.id, req.user.id);
  }
  if (status) { sql += ' AND t.status = ?'; params.push(status); }
  if (assigned_to) { sql += ' AND t.assigned_to = ?'; params.push(assigned_to); }
  if (entity_type) { sql += ' AND t.entity_type = ?'; params.push(entity_type); }
  if (entity_id) { sql += ' AND t.entity_id = ?'; params.push(entity_id); }
  if (overdue === 'true') { sql += " AND t.due_date::date < CURRENT_DATE AND t.status NOT IN ('completed', 'cancelled')"; }
  sql += ` ORDER BY
    CASE t.status WHEN 'in_progress' THEN 1 WHEN 'pending' THEN 2 WHEN 'completed' THEN 3 WHEN 'cancelled' THEN 4 END,
    CASE t.priority WHEN 'urgent' THEN 1 WHEN 'high' THEN 2 WHEN 'normal' THEN 3 WHEN 'low' THEN 4 END,
    t.due_date ASC NULLS LAST`;
  res.json(await db.prepare(sql).all(...params));
});

// Create task
router.post('/', async (req, res) => {
  const { title, description, entity_type, entity_id, assigned_to, priority, due_date } = req.body;
  if (!title) return res.status(400).json({ error: 'Title required' });
  const result = await db.prepare(`
    INSERT INTO tasks (title, description, entity_type, entity_id, assigned_to, priority, due_date, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?) RETURNING id
  `).run(title, description || '', entity_type || null, entity_id || null,
    assigned_to || null, priority || 'normal', due_date || null, req.user.id);
  res.json({ id: Number(result.lastInsertRowid) });
});

// Update task
router.put('/:id', async (req, res) => {
  const { title, description, assigned_to, priority, status, due_date } = req.body;
  const updates = [];
  const params = [];
  const fields = { title, description, assigned_to, priority, status, due_date };
  for (const [key, val] of Object.entries(fields)) {
    if (val !== undefined) { updates.push(`${key} = ?`); params.push(val); }
  }
  if (updates.length === 0) return res.status(400).json({ error: 'Nothing to update' });
  if (req.body.status === 'completed') updates.push("completed_at = NOW()");
  updates.push("updated_at = NOW()");
  params.push(req.params.id);
  await db.prepare(`UPDATE tasks SET ${updates.join(', ')} WHERE id = ?`).run(...params);
  res.json({ ok: true });
});

// Delete task
router.delete('/:id', async (req, res) => {
  await db.prepare('DELETE FROM tasks WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

// Task summary
router.get('/summary', async (req, res) => {
  const byStatus = await db.prepare('SELECT status, COUNT(*) as count FROM tasks GROUP BY status').all();
  const overdue = await db.prepare("SELECT COUNT(*) as count FROM tasks WHERE due_date::date < CURRENT_DATE AND status NOT IN ('completed', 'cancelled')").get();
  const dueToday = await db.prepare("SELECT COUNT(*) as count FROM tasks WHERE due_date::date = CURRENT_DATE AND status NOT IN ('completed', 'cancelled')").get();
  const myTasks = await db.prepare("SELECT COUNT(*) as count FROM tasks WHERE assigned_to = ? AND status NOT IN ('completed', 'cancelled')").get(req.user?.id || 0);
  res.json({ byStatus, overdue: overdue.count, dueToday: dueToday.count, myTasks: myTasks.count });
});

export default router;
