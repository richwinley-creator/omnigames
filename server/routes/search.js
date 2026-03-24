import { Router } from 'express';
import db from '../db.js';

const router = Router();

router.get('/', async (req, res) => {
  const { q } = req.query;
  if (!q || q.length < 2) return res.json({ results: [] });
  const term = `%${q}%`;

  const leads = await db.prepare(`
    SELECT id, name as title, business_name as subtitle, 'lead' as type, stage as status
    FROM leads WHERE name ILIKE ? OR business_name ILIKE ? OR email ILIKE ? OR phone ILIKE ?
    LIMIT 10
  `).all(term, term, term, term);

  const locations = await db.prepare(`
    SELECT id, name as title, partner as subtitle, 'location' as type, status
    FROM locations WHERE name ILIKE ? OR partner ILIKE ? OR contact_name ILIKE ?
    LIMIT 10
  `).all(term, term, term);

  const tickets = await db.prepare(`
    SELECT t.id, (l.name || ' - ' || t.issue_type) as title, t.description as subtitle,
      'ticket' as type, t.status
    FROM service_tickets t LEFT JOIN locations l ON t.location_id = l.id
    WHERE t.description ILIKE ? OR t.machine_name ILIKE ? OR l.name ILIKE ?
    LIMIT 10
  `).all(term, term, term);

  const deals = await db.prepare(`
    SELECT id, business_name as title, contact as subtitle, 'deal' as type, stage as status
    FROM jvl_deals WHERE business_name ILIKE ? OR contact ILIKE ? OR notes ILIKE ?
    LIMIT 10
  `).all(term, term, term);

  const tasks = await db.prepare(`
    SELECT id, title, description as subtitle, 'task' as type, status
    FROM tasks WHERE title ILIKE ? OR description ILIKE ?
    LIMIT 10
  `).all(term, term);

  res.json({ results: [...leads, ...locations, ...tickets, ...deals, ...tasks] });
});

export default router;
