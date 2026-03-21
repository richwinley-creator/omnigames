import { Router } from 'express';
import { compareSync, hashSync } from 'bcryptjs';
import db from '../db.js';
import { createToken, authMiddleware } from '../auth.js';

const router = Router();

// Login
router.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }
  const user = db.prepare('SELECT * FROM users WHERE username = ? AND active = 1').get(username);
  if (!user || !compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  const token = createToken(user);
  res.json({ token, user: { id: user.id, username: user.username, name: user.name, role: user.role } });
});

// Get current user
router.get('/me', authMiddleware, (req, res) => {
  res.json({ user: req.user });
});

// List team members (admin only)
router.get('/users', authMiddleware, (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  const users = db.prepare('SELECT id, username, name, role, active, created_at FROM users').all();
  res.json(users);
});

// Create user (admin only)
router.post('/users', authMiddleware, (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  const { username, password, name, role } = req.body;
  if (!username || !password || !name) {
    return res.status(400).json({ error: 'Username, password, and name required' });
  }
  try {
    const result = db.prepare('INSERT INTO users (username, password_hash, name, role) VALUES (?, ?, ?, ?)').run(
      username, hashSync(password, 10), name, role || 'team'
    );
    res.json({ id: result.lastInsertRowid, username, name, role: role || 'team' });
  } catch (e) {
    if (e.message.includes('UNIQUE')) return res.status(409).json({ error: 'Username already exists' });
    throw e;
  }
});

// Update user (admin only)
router.put('/users/:id', authMiddleware, (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  const { name, role, active, password } = req.body;
  const updates = [];
  const params = [];
  if (name) { updates.push('name = ?'); params.push(name); }
  if (role) { updates.push('role = ?'); params.push(role); }
  if (active !== undefined) { updates.push('active = ?'); params.push(active ? 1 : 0); }
  if (password) { updates.push('password_hash = ?'); params.push(hashSync(password, 10)); }
  if (updates.length === 0) return res.status(400).json({ error: 'Nothing to update' });
  params.push(req.params.id);
  db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).run(...params);
  res.json({ ok: true });
});

export default router;
