import { Router } from 'express';
import db from '../db.js';

const router = Router();

// List notifications for current user
router.get('/', async (req, res) => {
  const limit = parseInt(req.query.limit) || 50;
  const notifications = await db.prepare(`
    SELECT * FROM notifications WHERE user_id = ?
    ORDER BY created_at DESC LIMIT ?
  `).all(req.user.id, limit);
  res.json(notifications);
});

// Unread count
router.get('/unread-count', async (req, res) => {
  const count = await db.prepare('SELECT COUNT(*) as c FROM notifications WHERE user_id = ? AND read = 0').get(req.user.id);
  res.json({ count: count.c });
});

// Mark as read
router.put('/:id/read', async (req, res) => {
  await db.prepare('UPDATE notifications SET read = 1 WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);
  res.json({ ok: true });
});

// Mark all as read
router.put('/read-all', async (req, res) => {
  await db.prepare('UPDATE notifications SET read = 1 WHERE user_id = ? AND read = 0').run(req.user.id);
  res.json({ ok: true });
});

// Delete notification
router.delete('/:id', async (req, res) => {
  await db.prepare('DELETE FROM notifications WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);
  res.json({ ok: true });
});

export default router;
