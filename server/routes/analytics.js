import { Router } from 'express';
import db from '../db.js';

const router = Router();

// Lead conversion funnel
router.get('/lead-funnel', async (req, res) => {
  const stages = ['prospect', 'initial_contact', 'site_visit_scheduled', 'site_qualified',
    'proposal_sent', 'agreement_signed', 'licensing', 'install_scheduled', 'live', 'lost'];
  const counts = {};
  for (const s of stages) {
    const row = await db.prepare('SELECT COUNT(*) as c FROM leads WHERE stage = ?').get(s);
    counts[s] = row.c;
  }
  const totalRow = await db.prepare('SELECT COUNT(*) as c FROM leads').get();
  const total = totalRow.c;
  const liveCount = counts.live || 0;
  const lostCount = counts.lost || 0;
  const conversionRate = total > 0 ? ((liveCount / total) * 100).toFixed(1) : 0;
  const winRate = (liveCount + lostCount) > 0 ? ((liveCount / (liveCount + lostCount)) * 100).toFixed(1) : 0;
  res.json({ stages: counts, total, conversionRate, winRate });
});

// Time in stage (avg days leads spend in each stage)
router.get('/time-in-stage', async (req, res) => {
  const stages = await db.prepare(`
    SELECT a.body as from_stage,
      AVG(EXTRACT(EPOCH FROM (a.created_at -
        COALESCE((SELECT MAX(a2.created_at) FROM activities a2
          WHERE a2.entity_type = 'lead' AND a2.entity_id = a.entity_id
          AND a2.type = 'stage_change' AND a2.created_at < a.created_at), a.created_at)
      )) / 86400) as avg_days,
      COUNT(*) as transitions
    FROM activities a
    WHERE a.type = 'stage_change' AND a.entity_type = 'lead'
    GROUP BY a.body
  `).all();
  res.json(stages);
});

// Revenue trending by month
router.get('/revenue-trend', async (req, res) => {
  const months = req.query.months || 12;
  const data = await db.prepare(`
    SELECT TO_CHAR(r.date::date, 'YYYY-MM') as month,
      SUM(r.net) as total_net,
      SUM(r.net * l.gse_pct / 100.0) as gse_share,
      SUM(r.net * l.partner_pct / 100.0) as partner_share,
      COUNT(DISTINCT r.location_id) as locations
    FROM readings r
    JOIN locations l ON r.location_id = l.id
    GROUP BY TO_CHAR(r.date::date, 'YYYY-MM')
    ORDER BY month DESC
    LIMIT ?
  `).all(months);
  res.json(data.reverse());
});

// Revenue by location with date range
router.get('/revenue-by-location', async (req, res) => {
  const { start, end } = req.query;
  const params = [];
  let joinCondition = 'r.location_id = l.id';
  if (start) { joinCondition += ' AND r.date >= ?'; params.push(start); }
  if (end) { joinCondition += ' AND r.date <= ?'; params.push(end); }
  const sql = `
    SELECT l.name, l.gse_pct, l.partner, l.partner_pct, l.machines,
      COALESCE(SUM(r.net), 0) as total_net,
      COALESCE(SUM(r.net * l.gse_pct / 100.0), 0) as gse_share,
      COUNT(DISTINCT r.date) as reading_dates
    FROM locations l
    LEFT JOIN readings r ON ${joinCondition}
    GROUP BY l.id, l.name, l.gse_pct, l.partner, l.partner_pct, l.machines ORDER BY total_net DESC`;
  res.json(await db.prepare(sql).all(...params));
});

// JVL pipeline win/loss analysis
router.get('/jvl-analysis', async (req, res) => {
  const byStage = await db.prepare('SELECT stage, COUNT(*) as count, SUM(commission) as total_commission FROM jvl_deals GROUP BY stage').all();
  const totalDeals = (await db.prepare('SELECT COUNT(*) as c FROM jvl_deals').get()).c;
  const closed = (await db.prepare("SELECT COUNT(*) as c FROM jvl_deals WHERE stage = 'closed'").get()).c;
  const lost = (await db.prepare("SELECT COUNT(*) as c FROM jvl_deals WHERE stage = 'lost'").get()).c;
  const winRate = (closed + lost) > 0 ? ((closed / (closed + lost)) * 100).toFixed(1) : 0;
  const avgDeal = await db.prepare("SELECT AVG(commission) as avg FROM jvl_deals WHERE stage = 'closed'").get();
  res.json({ byStage, totalDeals, winRate, avgDealSize: avgDeal?.avg || 0 });
});

// Deposit trending
router.get('/deposit-trend', async (req, res) => {
  const data = await db.prepare(`
    SELECT TO_CHAR(date::date, 'YYYY-MM') as month,
      SUM(amount) as total, COUNT(*) as count
    FROM deposits
    GROUP BY TO_CHAR(date::date, 'YYYY-MM')
    ORDER BY month DESC LIMIT 12
  `).all();
  res.json(data.reverse());
});

// Weekly revenue breakdown
router.get('/revenue-weekly', async (req, res) => {
  const weeks = parseInt(req.query.weeks) || 12;
  const locationId = req.query.location_id;
  let sql = `
    SELECT
      DATE_TRUNC('week', r.date::date)::date as week_start,
      (DATE_TRUNC('week', r.date::date) + INTERVAL '6 days')::date as week_end,
      SUM(r.net) as total_net,
      SUM(r.net * l.gse_pct / 100.0) as gse_share,
      SUM(r.net * l.partner_pct / 100.0) as partner_share,
      COUNT(DISTINCT r.location_id) as locations,
      COUNT(*) as readings
    FROM readings r
    JOIN locations l ON r.location_id = l.id
  `;
  const params = [];
  if (locationId) { sql += ' WHERE r.location_id = ?'; params.push(locationId); }
  sql += ' GROUP BY DATE_TRUNC(\'week\', r.date::date) ORDER BY week_start DESC LIMIT ?';
  params.push(weeks);
  const data = await db.prepare(sql).all(...params);
  res.json(data.reverse());
});

// Revenue per reading date (granular)
router.get('/revenue-by-date', async (req, res) => {
  const { start, end, location_id } = req.query;
  let sql = `
    SELECT r.date, l.name as location_name, l.id as location_id,
      SUM(r.net) as total_net, SUM(r.net * l.gse_pct / 100.0) as gse_share,
      COUNT(*) as machine_count
    FROM readings r JOIN locations l ON r.location_id = l.id WHERE 1=1
  `;
  const params = [];
  if (start) { sql += ' AND r.date >= ?'; params.push(start); }
  if (end) { sql += ' AND r.date <= ?'; params.push(end); }
  if (location_id) { sql += ' AND r.location_id = ?'; params.push(location_id); }
  sql += ' GROUP BY r.date, l.id, l.name ORDER BY r.date DESC, total_net DESC';
  res.json(await db.prepare(sql).all(...params));
});

// Overview stats
router.get('/overview', async (req, res) => {
  const totalLeads = (await db.prepare('SELECT COUNT(*) as c FROM leads').get()).c;
  const activeLeads = (await db.prepare("SELECT COUNT(*) as c FROM leads WHERE stage NOT IN ('lost', 'archived', 'live')").get()).c;
  const liveLeads = (await db.prepare("SELECT COUNT(*) as c FROM leads WHERE stage = 'live'").get()).c;
  const openTickets = (await db.prepare("SELECT COUNT(*) as c FROM service_tickets WHERE status != 'resolved'").get()).c;
  const overdueTaskCount = (await db.prepare("SELECT COUNT(*) as c FROM tasks WHERE due_date::date < CURRENT_DATE AND status NOT IN ('completed', 'cancelled')").get()).c;
  const totalRevenue = (await db.prepare('SELECT COALESCE(SUM(net), 0) as s FROM readings').get()).s;
  const thisMonth = (await db.prepare("SELECT COALESCE(SUM(net), 0) as s FROM readings WHERE TO_CHAR(date::date, 'YYYY-MM') = TO_CHAR(CURRENT_DATE, 'YYYY-MM')").get()).s;
  const lastMonth = (await db.prepare("SELECT COALESCE(SUM(net), 0) as s FROM readings WHERE TO_CHAR(date::date, 'YYYY-MM') = TO_CHAR(CURRENT_DATE - INTERVAL '1 month', 'YYYY-MM')").get()).s;
  res.json({ totalLeads, activeLeads, liveLeads, openTickets, overdueTaskCount, totalRevenue, thisMonth, lastMonth });
});

// Pipeline forecast
router.get('/forecast', async (req, res) => {
  // Stage probabilities (% chance of becoming live)
  const STAGE_PROB = {
    prospect: 0.05,
    initial_contact: 0.15,
    site_visit_scheduled: 0.30,
    site_qualified: 0.45,
    proposal_sent: 0.60,
    agreement_signed: 0.80,
    licensing: 0.85,
    install_scheduled: 0.92,
    live: 1.0,
    lost: 0,
    archived: 0,
  };
  // Avg monthly net per machine (~$1,500 net, GSE gets 40-60% depending on split)
  const AVG_NET_PER_MACHINE = 1500;
  const AVG_GSE_PCT = 0.50; // blended across splits

  const leads = await db.prepare(`
    SELECT stage, num_games, revenue_split, approval_status
    FROM leads WHERE stage NOT IN ('lost', 'archived')
  `).all();

  const byStage = {};
  for (const [stage, prob] of Object.entries(STAGE_PROB)) {
    if (prob === 0) continue;
    byStage[stage] = { stage, prob, count: 0, machines: 0, monthlyGseRaw: 0, monthlyGseWeighted: 0 };
  }

  for (const lead of leads) {
    const s = byStage[lead.stage];
    if (!s) continue;
    const machines = lead.num_games || 3; // default 3 if not set
    const splitParts = (lead.revenue_split || '60/40').split('/');
    const gsePct = parseInt(splitParts[0]) / 100;
    const monthlyGse = machines * AVG_NET_PER_MACHINE * gsePct;
    s.count++;
    s.machines += machines;
    s.monthlyGseRaw += monthlyGse;
    s.monthlyGseWeighted += monthlyGse * s.prob;
  }

  const stages = Object.values(byStage).sort((a, b) => b.prob - a.prob);
  const totalWeightedMonthly = stages.reduce((sum, s) => sum + s.monthlyGseWeighted, 0);
  const totalRawMonthly = stages.reduce((sum, s) => sum + s.monthlyGseRaw, 0);
  const pendingApprovals = leads.filter(l => l.approval_status === 'pending').length;

  res.json({ stages, totalWeightedMonthly, totalRawMonthly, pendingApprovals });
});

// Pending approvals count
router.get('/approvals', async (req, res) => {
  const rows = await db.prepare(`
    SELECT l.*, u.name as assigned_name FROM leads l
    LEFT JOIN users u ON l.assigned_to = u.id
    WHERE l.approval_status = 'pending'
    ORDER BY l.updated_at DESC
  `).all();
  res.json(rows);
});

// Reconciliation — per-location: net revenue, gse share, last fill, last payment, outstanding
router.get('/reconciliation', async (req, res) => {
  const data = await db.prepare(`
    SELECT
      l.id, l.name, l.gse_pct, l.partner_pct, l.partner, l.machines, l.status,
      COALESCE(rev.total_net, 0) as net_revenue,
      COALESCE(rev.total_net * l.gse_pct / 100.0, 0) as gse_share,
      COALESCE(rev.total_net * l.partner_pct / 100.0, 0) as partner_share,
      f.last_fill_date,
      COALESCE(f.total_collected, 0) as total_collected,
      pay.last_payment_date,
      COALESCE(pay.total_paid, 0) as total_paid,
      pay.last_payment_status
    FROM locations l
    LEFT JOIN (
      SELECT location_id, SUM(net) as total_net
      FROM readings GROUP BY location_id
    ) rev ON rev.location_id = l.id
    LEFT JOIN (
      SELECT location_id, MAX(date) as last_fill_date, SUM(amount) as total_collected
      FROM fills GROUP BY location_id
    ) f ON f.location_id = l.id
    LEFT JOIN (
      SELECT DISTINCT ON (location_id) location_id,
        created_at as last_payment_date, status as last_payment_status,
        total_paid
      FROM (
        SELECT p.location_id, p.created_at, p.status,
          SUM(p.amount) OVER (PARTITION BY p.location_id) as total_paid
        FROM payments p
      ) sub
      ORDER BY location_id, created_at DESC
    ) pay ON pay.location_id = l.id
    WHERE l.status = 'active'
    ORDER BY COALESCE(rev.total_net, 0) DESC
  `).all();
  res.json(data);
});

// Location summary — revenue by week, total fills, total payments for single location
router.get('/location-summary/:id', async (req, res) => {
  const locationId = req.params.id;

  const location = await db.prepare(`
    SELECT l.*,
      COALESCE(r.total_net, 0) as net,
      COALESCE(r.total_net * l.gse_pct / 100.0, 0) as gse_share,
      COALESCE(r.total_net * l.partner_pct / 100.0, 0) as partner_share,
      r.last_read_date, r.reading_count
    FROM locations l
    LEFT JOIN (
      SELECT location_id, SUM(net) as total_net, MAX(date) as last_read_date, COUNT(*) as reading_count
      FROM readings GROUP BY location_id
    ) r ON r.location_id = l.id
    WHERE l.id = ?
  `).get(locationId);

  if (!location) return res.status(404).json({ error: 'Location not found' });

  const weeklyRevenue = await db.prepare(`
    SELECT
      DATE_TRUNC('week', r.date::date)::date as week_start,
      SUM(r.net) as total_net,
      SUM(r.net * l.gse_pct / 100.0) as gse_share,
      COUNT(*) as readings
    FROM readings r
    JOIN locations l ON r.location_id = l.id
    WHERE r.location_id = ?
    GROUP BY DATE_TRUNC('week', r.date::date)
    ORDER BY week_start DESC
    LIMIT 12
  `).all(locationId);

  const fills = await db.prepare(`
    SELECT f.*, u.name as filled_by_name
    FROM fills f LEFT JOIN users u ON f.filled_by = u.id
    WHERE f.location_id = ? ORDER BY f.date DESC
  `).all(locationId);

  const payments = await db.prepare(`
    SELECT * FROM payments WHERE location_id = ? ORDER BY created_at DESC
  `).all(locationId);

  const totalCollected = fills.reduce((s, f) => s + (f.amount || 0), 0);
  const totalPaid = payments.reduce((s, p) => s + (p.amount || 0), 0);
  const lastFillDate = fills.length > 0 ? fills[0].date : null;
  const lastPaymentDate = payments.length > 0 ? payments[0].created_at : null;

  res.json({
    location,
    weeklyRevenue: weeklyRevenue.reverse(),
    fills,
    payments,
    totalCollected,
    totalPaid,
    lastFillDate,
    lastPaymentDate,
  });
});

export default router;
