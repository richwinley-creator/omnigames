import { Router } from 'express';
import db from '../db.js';

const router = Router();

// GET /api/readings?location_id=&date=
router.get('/', async (req, res) => {
  let sql = `
    SELECT r.*, l.name as location_name, l.gse_pct, l.partner_pct
    FROM readings r
    JOIN locations l ON l.id = r.location_id
  `;
  const params = [];
  const where = [];

  if (req.query.location_id) {
    where.push('r.location_id = ?');
    params.push(req.query.location_id);
  }
  if (req.query.date) {
    where.push('r.date = ?');
    params.push(req.query.date);
  }

  if (where.length) sql += ' WHERE ' + where.join(' AND ');
  sql += ' ORDER BY r.date DESC, r.id DESC';

  if (req.query.limit) {
    sql += ' LIMIT ?';
    params.push(parseInt(req.query.limit));
  }

  res.json(await db.prepare(sql).all(...params));
});

// POST /api/readings — save batch of readings for a location
router.post('/', async (req, res) => {
  const { location_id, date, machines } = req.body;

  if (!location_id || !date || !Array.isArray(machines)) {
    return res.status(400).json({ error: 'location_id, date, and machines[] required' });
  }

  const ids = [];
  for (const m of machines) {
    const result = await db.prepare(`
      INSERT INTO readings (location_id, date, machine_name, prev_in, curr_in, prev_out, curr_out)
      VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING id
    `).run(
      location_id, date, m.machine_name,
      m.prev_in || 0, m.curr_in || 0,
      m.prev_out || 0, m.curr_out || 0
    );
    ids.push(result.lastInsertRowid);
  }
  res.json({ ok: true, count: ids.length, ids });
});

export default router;
