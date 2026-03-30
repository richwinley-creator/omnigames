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

export default router;
