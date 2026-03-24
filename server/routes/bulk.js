import { Router } from 'express';
import db from '../db.js';

const router = Router();

// Bulk import leads from CSV data (JSON array)
router.post('/leads', async (req, res) => {
  const { leads } = req.body;
  if (!Array.isArray(leads) || leads.length === 0) {
    return res.status(400).json({ error: 'leads array required' });
  }

  let imported = 0;
  let errors = [];
  for (let i = 0; i < leads.length; i++) {
    const l = leads[i];
    if (!l.name && !l.email && !l.phone) {
      errors.push({ row: i + 1, error: 'Missing name, email, and phone' });
      continue;
    }
    try {
      await db.prepare(`
        INSERT INTO leads (name, email, phone, business_name, business_type, city, state,
          interest, brand_preference, machines_wanted, notes, stage, source, assigned_to)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'csv_import', ?)
      `).run(
        l.name || '', l.email || '', l.phone || '', l.business_name || '',
        l.business_type || '', l.city || '', l.state || 'TX', l.interest || '',
        l.brand_preference || '', l.machines_wanted || '', l.notes || '',
        l.stage || 'prospect', req.user.id
      );
      imported++;
    } catch (e) {
      errors.push({ row: i + 1, error: e.message });
    }
  }
  res.json({ imported, errors, total: leads.length });
});

// Bulk import deposits
router.post('/deposits', async (req, res) => {
  const { deposits } = req.body;
  if (!Array.isArray(deposits) || deposits.length === 0) {
    return res.status(400).json({ error: 'deposits array required' });
  }

  let imported = 0;
  let errors = [];
  for (let i = 0; i < deposits.length; i++) {
    const d = deposits[i];
    if (!d.date || !d.amount) {
      errors.push({ row: i + 1, error: 'Missing date or amount' });
      continue;
    }
    try {
      await db.prepare('INSERT INTO deposits (date, amount, bank, ref) VALUES (?, ?, ?, ?)').run(
        d.date, parseFloat(d.amount), d.bank || 'Bank of America', d.ref || ''
      );
      imported++;
    } catch (e) {
      errors.push({ row: i + 1, error: e.message });
    }
  }
  res.json({ imported, errors, total: deposits.length });
});

// Bulk update payments
router.put('/payments/mark-paid', async (req, res) => {
  const { ids } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: 'ids array required' });
  }
  // Build parameterized placeholders for Postgres
  const placeholders = ids.map((_, i) => `$${i + 1}`).join(',');
  const result = await db.pool.query(
    `UPDATE payments SET status = 'paid', paid_date = NOW()
     WHERE id IN (${placeholders}) AND status = 'unpaid'`,
    ids
  );
  res.json({ updated: result.rowCount });
});

// Auto-generate payments from readings
router.post('/generate-payments', async (req, res) => {
  const { period } = req.body;
  if (!period) return res.status(400).json({ error: 'period required (e.g. 2026-03)' });

  const locations = await db.prepare(`
    SELECT l.id, l.name, l.partner, l.partner_pct,
      SUM(r.net) as total_net,
      SUM(r.net * l.partner_pct / 100.0) as partner_share
    FROM locations l
    JOIN readings r ON r.location_id = l.id
    WHERE TO_CHAR(r.date::date, 'YYYY-MM') = ?
    AND l.status = 'active'
    GROUP BY l.id, l.name, l.partner, l.partner_pct
    HAVING SUM(r.net) > 0
  `).all(period);

  const existing = await db.prepare('SELECT location_id FROM payments WHERE period = ?').all(period);
  const existingIds = new Set(existing.map(e => e.location_id));

  let created = 0;
  let skipped = 0;
  for (const loc of locations) {
    if (existingIds.has(loc.id)) { skipped++; continue; }
    await db.prepare(`
      INSERT INTO payments (location_id, partner, amount, period, status)
      VALUES (?, ?, ?, ?, 'unpaid')
    `).run(loc.id, loc.partner, Math.round(loc.partner_share * 100) / 100, period);
    created++;
  }
  res.json({ created, skipped, total: locations.length });
});

export default router;
