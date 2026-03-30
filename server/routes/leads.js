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
router.post('/webhook', async (req, res) => {
  const body = req.body;
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

  const result = await db.prepare(`
    INSERT INTO leads (name, email, phone, business_name, business_type, city, state, interest,
      brand_preference, machines_wanted, message, sms_consent, source, formspree_id, stage)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'prospect') RETURNING id
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
// Team users only see leads assigned to them
router.get('/', async (req, res) => {
  const { stage, state, assigned_to } = req.query;
  let sql = 'SELECT l.*, u.name as assigned_name FROM leads l LEFT JOIN users u ON l.assigned_to = u.id WHERE 1=1';
  const params = [];
  if (req.user.role !== 'admin') {
    sql += ' AND l.assigned_to = ?';
    params.push(req.user.id);
  }
  if (stage) { sql += ' AND l.stage = ?'; params.push(stage); }
  if (state) { sql += ' AND l.state = ?'; params.push(state); }
  if (assigned_to) { sql += ' AND l.assigned_to = ?'; params.push(assigned_to); }
  sql += ' ORDER BY l.updated_at DESC';
  res.json(await db.prepare(sql).all(...params));
});

// Get stages list
router.get('/stages', (req, res) => {
  res.json(STAGES);
});

// Get lead counts by stage (scoped to user for team)
router.get('/summary', async (req, res) => {
  const isAdmin = req.user.role === 'admin';
  const baseSql = isAdmin
    ? 'SELECT stage, COUNT(*) as count FROM leads GROUP BY stage'
    : 'SELECT stage, COUNT(*) as count FROM leads WHERE assigned_to = ? GROUP BY stage';
  const rows = isAdmin
    ? await db.prepare(baseSql).all()
    : await db.prepare(baseSql).all(req.user.id);
  const summary = {};
  for (const s of STAGES) summary[s] = 0;
  for (const r of rows) summary[r.stage] = parseInt(r.count);
  summary.total = Object.values(summary).reduce((a, b) => a + b, 0);
  res.json(summary);
});

// Create lead manually
router.post('/', async (req, res) => {
  const { name, email, phone, business_name, business_type, city, state, interest,
    brand_preference, machines_wanted, message, notes, stage } = req.body;
  if (!name) return res.status(400).json({ error: 'Name is required' });

  const result = await db.prepare(`
    INSERT INTO leads (name, email, phone, business_name, business_type, city, state, interest,
      brand_preference, machines_wanted, message, notes, stage, source, assigned_to)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'manual', ?) RETURNING id
  `).run(
    name, email || '', phone || '', business_name || '', business_type || '',
    city || '', state || 'TX', interest || '', brand_preference || '',
    machines_wanted || '', message || '', notes || '', stage || 'prospect',
    req.user.id
  );
  res.json({ id: result.lastInsertRowid });
});

// Update lead
router.put('/:id', async (req, res) => {
  const { name, email, phone, business_name, business_type, city, state, interest,
    brand_preference, machines_wanted, notes, stage, assigned_to, follow_up_date } = req.body;

  // Get old values for audit
  const oldLead = await db.prepare('SELECT * FROM leads WHERE id = ?').get(req.params.id);
  if (!oldLead) return res.status(404).json({ error: 'Lead not found' });

  const { revenue_split, num_games, num_kiosks, game_type, lead_type, county, address } = req.body;

  // Coerce empty strings to null for integer/date columns
  const intFields = new Set(['num_games', 'num_kiosks', 'assigned_to']);
  const dateFields = new Set(['follow_up_date']);
  const coerce = (key, val) => {
    if (val === '' || val === null) {
      if (intFields.has(key) || dateFields.has(key)) return null;
    }
    if (intFields.has(key) && val !== null && val !== undefined) return parseInt(val) || null;
    return val;
  };

  const updates = [];
  const params = [];
  const fields = { name, email, phone, business_name, business_type, city, state, interest,
    brand_preference, machines_wanted, notes, stage, assigned_to, follow_up_date,
    revenue_split, num_games, num_kiosks, game_type, lead_type, county, address };
  for (const [key, val] of Object.entries(fields)) {
    if (val !== undefined) { updates.push(`${key} = ?`); params.push(coerce(key, val)); }
  }

  // Auto-flag 50/50 splits for approval
  const newSplit = revenue_split ?? oldLead.revenue_split;
  if (newSplit === '50/50' && oldLead.approval_status !== 'approved') {
    updates.push('approval_status = ?'); params.push('pending');
  }

  if (updates.length === 0) return res.status(400).json({ error: 'Nothing to update' });

  updates.push("updated_at = NOW()");
  params.push(req.params.id);
  await db.prepare(`UPDATE leads SET ${updates.join(', ')} WHERE id = ?`).run(...params);

  // Log stage change as activity
  if (stage && stage !== oldLead.stage) {
    try {
      await db.prepare(`
        INSERT INTO activities (entity_type, entity_id, type, subject, body, created_by)
        VALUES ('lead', ?, 'stage_change', ?, ?, ?)
      `).run(req.params.id, `Stage: ${oldLead.stage} → ${stage}`, oldLead.stage, req.user.id);
    } catch(e) { /* activities table may not exist yet */ }

    // Auto-reserve inventory when moving to install_scheduled
    if (stage === 'install_scheduled') {
      try {
        const lead = await db.prepare('SELECT num_games, num_kiosks FROM leads WHERE id = ?').get(req.params.id);
        const needed = { machine: lead.num_games || 0, kiosk: lead.num_kiosks || 0 };
        for (const [type, count] of Object.entries(needed)) {
          if (count <= 0) continue;
          const available = await db.prepare(
            `SELECT id FROM inventory_items WHERE status='available' AND type=? AND lead_id IS NULL LIMIT ?`
          ).all(type, count);
          for (const item of available) {
            await db.prepare(`UPDATE inventory_items SET status='reserved', lead_id=?, updated_at=NOW() WHERE id=?`).run(req.params.id, item.id);
          }
        }
      } catch(e) { /* inventory may not exist */ }
    }

    // Auto-deploy reserved inventory when lead goes live
    if (stage === 'live') {
      try {
        const today = new Date().toISOString().slice(0, 10);
        await db.pool.query(
          `UPDATE inventory_items SET status='deployed', deployed_at=$1, updated_at=NOW() WHERE lead_id=$2 AND status='reserved'`,
          [today, req.params.id]
        );
      } catch(e) { /* inventory may not exist */ }
    }

    // Release reserved inventory if lead is lost/archived
    if (stage === 'lost' || stage === 'archived') {
      try {
        await db.prepare(`UPDATE inventory_items SET status='available', lead_id=NULL, updated_at=NOW() WHERE lead_id=? AND status='reserved'`).run(req.params.id);
      } catch(e) { /* inventory may not exist */ }
    }

    // Create follow-up task on certain stages
    if (['proposal_sent', 'agreement_signed', 'site_visit_scheduled'].includes(stage)) {
      try {
        const taskTitle = stage === 'proposal_sent' ? `Follow up on proposal for ${oldLead.name}`
          : stage === 'agreement_signed' ? `Process agreement for ${oldLead.name}`
          : `Prepare site visit for ${oldLead.name}`;
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + (stage === 'proposal_sent' ? 3 : 2));
        await db.prepare(`
          INSERT INTO tasks (title, entity_type, entity_id, assigned_to, priority, due_date, created_by)
          VALUES (?, 'lead', ?, ?, 'high', ?, ?)
        `).run(taskTitle, req.params.id, oldLead.assigned_to || req.user.id,
          dueDate.toISOString().split('T')[0], req.user.id);
      } catch(e) { /* tasks table may not exist yet */ }
    }
  }

  // Audit log
  try {
    for (const [key, val] of Object.entries(fields)) {
      if (val !== undefined && String(val) !== String(oldLead[key])) {
        await db.prepare(`
          INSERT INTO audit_log (entity_type, entity_id, action, field_name, old_value, new_value, user_id, user_name)
          VALUES ('lead', ?, 'update', ?, ?, ?, ?, ?)
        `).run(req.params.id, key, String(oldLead[key] ?? ''), String(val), req.user.id, req.user.name);
      }
    }
  } catch(e) { /* audit_log table may not exist yet */ }

  res.json({ ok: true });
});

// Approve lead (admin only)
router.post('/:id/approve', async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  const { notes } = req.body;
  await db.prepare(`UPDATE leads SET approval_status = 'approved', approval_notes = $1, updated_at = NOW() WHERE id = $2`)
    .run(notes || null, req.params.id);
  try {
    await db.prepare(`INSERT INTO activities (entity_type, entity_id, type, subject, body, created_by)
      VALUES ('lead', $1, 'approval', 'Deal Approved', $2, $3)`)
      .run(req.params.id, notes || 'Approved by ' + req.user.name, req.user.id);
  } catch(e) {}
  res.json({ ok: true });
});

// Reject lead (admin only)
router.post('/:id/reject', async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  const { notes } = req.body;
  await db.prepare(`UPDATE leads SET approval_status = 'rejected', approval_notes = $1, updated_at = NOW() WHERE id = $2`)
    .run(notes || null, req.params.id);
  try {
    await db.prepare(`INSERT INTO activities (entity_type, entity_id, type, subject, body, created_by)
      VALUES ('lead', $1, 'approval', 'Deal Rejected', $2, $3)`)
      .run(req.params.id, notes || 'Rejected by ' + req.user.name, req.user.id);
  } catch(e) {}
  res.json({ ok: true });
});

// Delete lead
router.delete('/:id', async (req, res) => {
  await db.prepare('DELETE FROM leads WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

export default router;
