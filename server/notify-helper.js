import db from './db.js';

export async function notify(userId, { type, title, body, entity_type, entity_id }) {
  await db.prepare(`
    INSERT INTO notifications (user_id, type, title, body, entity_type, entity_id)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(userId, type, title, body || '', entity_type || null, entity_id || null);
}

export async function notifyAll({ type, title, body, entity_type, entity_id }) {
  const users = await db.prepare('SELECT id FROM users WHERE active = 1').all();
  for (const u of users) {
    await db.prepare(`
      INSERT INTO notifications (user_id, type, title, body, entity_type, entity_id)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(u.id, type, title, body || '', entity_type || null, entity_id || null);
  }
}

export async function notifyOverdueTasks() {
  const overdue = await db.prepare(`
    SELECT t.*, u.name as assigned_name FROM tasks t
    LEFT JOIN users u ON t.assigned_to = u.id
    WHERE t.due_date::date < CURRENT_DATE AND t.status NOT IN ('completed', 'cancelled')
    AND t.assigned_to IS NOT NULL
  `).all();

  for (const task of overdue) {
    const existing = await db.prepare(`
      SELECT id FROM notifications
      WHERE user_id = ? AND type = 'task_overdue' AND entity_type = 'task' AND entity_id = ?
      AND created_at::date = CURRENT_DATE
    `).get(task.assigned_to, task.id);
    if (!existing) {
      await notify(task.assigned_to, {
        type: 'task_overdue',
        title: `Overdue: ${task.title}`,
        body: `Task was due ${task.due_date}`,
        entity_type: 'task',
        entity_id: task.id,
      });
    }
  }
}
