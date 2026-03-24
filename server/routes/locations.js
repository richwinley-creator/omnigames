import { Router } from 'express';
import db from '../db.js';

const router = Router();

// GET /api/locations — list all with aggregated revenue
router.get('/', async (req, res) => {
  const locations = await db.prepare(`
    SELECT l.*,
      COALESCE(r.total_net, 0) as net,
      COALESCE(r.total_net * l.gse_pct / 100.0, 0) as gse_share,
      COALESCE(r.total_net * l.partner_pct / 100.0, 0) as partner_share,
      r.last_read_date,
      r.reading_count
    FROM locations l
    LEFT JOIN (
      SELECT location_id,
        SUM(net) as total_net,
        MAX(date) as last_read_date,
        COUNT(*) as reading_count
      FROM readings
      GROUP BY location_id
    ) r ON r.location_id = l.id
    ORDER BY COALESCE(r.total_net, 0) DESC
  `).all();

  res.json(locations);
});

// PUT /api/locations/:id — update status
router.put('/:id', async (req, res) => {
  const { status } = req.body;
  await db.prepare('UPDATE locations SET status = ? WHERE id = ?').run(status, req.params.id);
  res.json({ ok: true });
});

// POST /api/locations — add new location
router.post('/', async (req, res) => {
  const { name, sheet_name, machines, gse_pct, partner, partner_pct, machine_type } = req.body;
  const result = await db.prepare(`
    INSERT INTO locations (name, sheet_name, machines, gse_pct, partner, partner_pct, machine_type)
    VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING id
  `).run(name, sheet_name, machines, gse_pct, partner, partner_pct, machine_type || 'Banilla');
  res.json({ id: result.lastInsertRowid });
});

export default router;
