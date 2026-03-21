import { Router } from 'express';
import db from '../db.js';
import { authMiddleware } from '../auth.js';

const router = Router();

const STAGES = [
  'prospect', 'initial_contact', 'site_visit_scheduled', 'site_qualified',
  'proposal_sent', 'agreement_signed', 'licensing', 'install_scheduled',
  'live', 'lost', 'archived'
];

// Formspree webhook - NO AUTH (public endpoint)
router.post('/webhook', (req, res) => {
  const body = req.body;
  // Formspree sends form fields directly or nested under _replyto etc.
  const lead = {
    name: body.name || body.Name || '',
    email: body.email || body.Email || body._replyto || '',
    phone: body.phone || body.Phone || '',
    business_name: body.business || body.business_name || body['Business Name'] || '',
    business_type: body.business_type || body['Business Type'] || '',
    city: body.city || body.City || '',
    state: body.state || 'TX',
    interest: body.interest || body['Interest Type'] || '',
    brand_preference: body.brand || body['Preferred Brand'] || '',
    machines_wanted: body.machines || body['Number of Machines'] || '',
    message: body.message || body.Message || '',
    sms_consent: body.sms_consent === 'yes' || body.sms_consent === true ? 1 : 0,
    source: body._source || 'formspree',
    formspree_id: body._id || null,
  };

  if (!lead.name && !lead.email && !lead.phone) {
    return res.status(400).json({ error: 'At least name, email, or phone required' });
  }

  const result = db.prepare(`
    INSERT INTO leads (name, email, phone, business_name, business_type, city, state, interest,
      brand_preference, machines_wanted, message, sms_consent, source, formspree_id, stage)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'prospect')
  `).run(
    lead.name, lead.email, lead.phone, lead.business_name, lead.business_type,
    lead.city, lead.state, lead.interest, lead.brand_preference, lead.machines_wanted,
    lead.message, lead.sms_consent, lead.source, lead.formspree_id
  );

  res.json({ ok: true, id: result.lastInsertRowid });
});

// All routes below require auth
router.use(authMiddleware);

// List leads with optional filters
router.get('/', (req, res) => {
  const { stage, state, assigned_to } = req.query;
  let sql = 'SELECT l.*, u.name as assigned_name FROM leads l LEFT JOIN users u ON l.assigned_to = u.id WHERE 1=1';
  const params = [];
  if (stage) { sql += ' AND l.stage = ?'; params.push(stage); }
  if (state) { sql += ' AND l.state = ?'; params.push(state); }
  if (assigned_to) { sql += ' AND l.assigned_to = ?'; params.push(assigned_to); }
  sql += ' ORDER BY l.updated_at DESC';
  res.json(db.prepare(sql).all(...params));
});

// Get stages list
router.get('/stages', (req, res) => {
  res.json(STAGES);
});

// Get lead counts by stage
router.get('/summary', (req, res) => {
  const rows = db.prepare('SELECT stage, COUNT(*) as count FROM leads GROUP BY stage').all();
  const summary = {};
  for (const s of STAGES) summary[s] = 0;
  for (const r of rows) summary[r.stage] = r.count;
  summary.total = Object.values(summary).reduce((a, b) => a + b, 0);
  res.json(summary);
});

// Create lead manually
router.post('/', (req, res) => {
  const { name, email, phone, business_name, business_type, city, state, interest,
    brand_preference, machines_wanted, message, notes, stage } = req.body;
  if (!name) return res.status(400).json({ error: 'Name is required' });

  const result = db.prepare(`
    INSERT INTO leads (name, email, phone, business_name, business_type, city, state, interest,
      brand_preference, machines_wanted, message, notes, stage, source, assigned_to)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'manual', ?)
  `).run(
    name, email || '', phone || '', business_name || '', business_type || '',
    city || '', state || 'TX', interest || '', brand_preference || '',
    machines_wanted || '', message || '', notes || '', stage || 'prospect',
    req.user.id
  );
  res.json({ id: result.lastInsertRowid });
});

// Update lead
router.put('/:id', (req, res) => {
  const { name, email, phone, business_name, business_type, city, state, interest,
    brand_preference, machines_wanted, notes, stage, assigned_to, follow_up_date } = req.body;
  const updates = [];
  const params = [];

  const fields = { name, email, phone, business_name, business_type, city, state, interest,
    brand_preference, machines_wanted, notes, stage, assigned_to, follow_up_date };
  for (const [key, val] of Object.entries(fields)) {
    if (val !== undefined) { updates.push(`${key} = ?`); params.push(val); }
  }
  if (updates.length === 0) return res.status(400).json({ error: 'Nothing to update' });

  updates.push("updated_at = datetime('now')");
  params.push(req.params.id);
  db.prepare(`UPDATE leads SET ${updates.join(', ')} WHERE id = ?`).run(...params);
  res.json({ ok: true });
});

// Delete lead
router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM leads WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

export default router;
