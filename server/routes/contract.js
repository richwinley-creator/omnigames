import { Router } from 'express';
import db from '../db.js';

const router = Router();

router.get('/:id', async (req, res) => {
  const lead = await db.prepare('SELECT l.*, u.name as assigned_name FROM leads l LEFT JOIN users u ON l.assigned_to = u.id WHERE l.id = ?').get(req.params.id);
  if (!lead) return res.status(404).json({ error: 'Lead not found' });

  const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const split = lead.revenue_split || '60/40';
  const [gsePct, locPct] = split.split('/');
  const machines = lead.num_games || '___';
  const kiosks = lead.num_kiosks || '___';

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Revenue Share Agreement — ${lead.name || lead.business_name}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: Georgia, 'Times New Roman', serif; font-size: 11pt; color: #1a1a1a; line-height: 1.65; background: #fff; }
  .page { max-width: 760px; margin: 0 auto; padding: 60px 60px 80px; }
  .header { text-align: center; border-bottom: 2px solid #b8943d; padding-bottom: 24px; margin-bottom: 32px; }
  .company-name { font-size: 22pt; font-weight: 700; letter-spacing: 2px; color: #1a1a1a; }
  .doc-title { font-size: 14pt; font-weight: 400; color: #5a5347; margin-top: 6px; letter-spacing: 1px; text-transform: uppercase; }
  .doc-date { font-size: 10pt; color: #8a8278; margin-top: 8px; }
  .section { margin-bottom: 24px; }
  .section-title { font-size: 10pt; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #b8943d; margin-bottom: 8px; border-bottom: 1px solid #e8e2d8; padding-bottom: 4px; }
  .parties-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 32px; margin-bottom: 24px; }
  .party-block { background: #f8f6f2; border-radius: 6px; padding: 16px 20px; }
  .party-label { font-size: 9pt; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: #8a8278; margin-bottom: 8px; }
  .party-name { font-size: 12pt; font-weight: 700; color: #1a1a1a; }
  .party-detail { font-size: 10pt; color: #5a5347; margin-top: 2px; }
  .terms-table { width: 100%; border-collapse: collapse; margin: 12px 0; }
  .terms-table td { padding: 10px 14px; border-bottom: 1px solid #e8e2d8; font-size: 11pt; }
  .terms-table td:first-child { font-weight: 600; width: 45%; color: #374151; }
  .terms-table td:last-child { color: #1a1a1a; }
  .highlight-row td { background: #fffbeb; }
  .split-display { display: flex; gap: 24px; margin: 16px 0; }
  .split-box { flex: 1; text-align: center; padding: 16px; border-radius: 8px; }
  .split-box.gse { background: #f0fdf4; border: 2px solid #bbf7d0; }
  .split-box.loc { background: #f8f6f2; border: 2px solid #e8e2d8; }
  .split-pct { font-size: 28pt; font-weight: 800; }
  .split-box.gse .split-pct { color: #059669; }
  .split-box.loc .split-pct { color: #5a5347; }
  .split-label { font-size: 9pt; text-transform: uppercase; letter-spacing: 0.06em; color: #8a8278; margin-top: 4px; }
  .clause { margin-bottom: 14px; }
  .clause p { font-size: 10.5pt; color: #374151; }
  .clause-num { font-weight: 700; color: #1a1a1a; }
  .sig-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 48px; margin-top: 48px; }
  .sig-block { padding-top: 12px; }
  .sig-line { border-top: 1px solid #1a1a1a; margin-bottom: 8px; }
  .sig-name { font-size: 10pt; font-weight: 700; }
  .sig-detail { font-size: 9.5pt; color: #8a8278; margin-top: 2px; }
  .footer { text-align: center; margin-top: 48px; padding-top: 16px; border-top: 1px solid #e8e2d8; font-size: 9pt; color: #8a8278; }
  @media print {
    body { font-size: 10.5pt; }
    .page { padding: 40px 48px 60px; }
    @page { margin: 0.75in; }
  }
</style>
</head>
<body>
<div class="page">

  <div class="header">
    <div class="company-name">GLOBAL SKILL ENTERTAINMENT</div>
    <div class="doc-title">Skill Game Revenue Share Agreement</div>
    <div class="doc-date">Effective Date: ${today}</div>
  </div>

  <div class="parties-grid">
    <div class="party-block">
      <div class="party-label">Operator</div>
      <div class="party-name">Global Skill Entertainment (GSE)</div>
      <div class="party-detail">Texas Skill Game Operator</div>
    </div>
    <div class="party-block">
      <div class="party-label">Location Partner</div>
      <div class="party-name">${lead.name || '___'}${lead.business_name ? `<br><span style="font-weight:400;font-size:10pt">${lead.business_name}</span>` : ''}</div>
      <div class="party-detail">${lead.address || lead.city || '___'}</div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Equipment</div>
    <table class="terms-table">
      <tr><td>Number of Skill Game Machines</td><td><strong>${machines}</strong></td></tr>
      <tr><td>Number of Kiosks</td><td><strong>${kiosks}</strong></td></tr>
      <tr><td>Game Type</td><td>${lead.game_type || 'Skill Games'}</td></tr>
      <tr><td>Location</td><td>${lead.address || lead.city || 'As agreed'}, ${lead.state || 'TX'}</td></tr>
    </table>
  </div>

  <div class="section">
    <div class="section-title">Revenue Split</div>
    <div class="split-display">
      <div class="split-box gse">
        <div class="split-pct">${gsePct}%</div>
        <div class="split-label">GSE Share</div>
      </div>
      <div class="split-box loc">
        <div class="split-pct">${locPct}%</div>
        <div class="split-label">Location Partner Share</div>
      </div>
    </div>
    <p style="font-size:10pt;color:#5a5347">Net revenue is calculated after all machine payouts. GSE's share covers machine ownership, maintenance, refills, compliance, and kiosk services. Location partner's share is paid on a mutually agreed schedule.</p>
  </div>

  <div class="section">
    <div class="section-title">Terms &amp; Conditions</div>
    <div class="clause"><p><span class="clause-num">1. Equipment Ownership.</span> All skill game machines and kiosks remain the sole property of GSE at all times. Location partner grants GSE permission to install and operate equipment on the premises.</p></div>
    <div class="clause"><p><span class="clause-num">2. Revenue Calculation.</span> Net revenue is the total amount collected from machines less cash paid out to players. Revenue is reported and reconciled on a mutually agreed schedule (weekly or bi-weekly).</p></div>
    <div class="clause"><p><span class="clause-num">3. Maintenance &amp; Compliance.</span> GSE is responsible for all machine maintenance, software updates, and regulatory compliance. Location partner is responsible for the safety and security of the premises where machines are located.</p></div>
    <div class="clause"><p><span class="clause-num">4. Term.</span> This agreement begins on the installation date and continues month-to-month unless either party provides 30 days written notice of termination.</p></div>
    <div class="clause"><p><span class="clause-num">5. Location Obligations.</span> Location partner agrees to maintain a safe operating environment, provide adequate power and space, and not to allow any competing skill game machines on the premises without GSE's written consent.</p></div>
    <div class="clause"><p><span class="clause-num">6. Removal.</span> Upon termination, GSE will remove all equipment within 14 business days. Location partner is liable for any damage to equipment beyond normal wear and tear.</p></div>
    <div class="clause"><p><span class="clause-num">7. Governing Law.</span> This agreement shall be governed by the laws of the State of Texas.</p></div>
  </div>

  <div class="sig-grid">
    <div class="sig-block">
      <div class="sig-line"></div>
      <div class="sig-name">Global Skill Entertainment</div>
      <div class="sig-detail">Authorized Representative</div>
      <div class="sig-detail" style="margin-top:16px">Date: _______________</div>
    </div>
    <div class="sig-block">
      <div class="sig-line"></div>
      <div class="sig-name">${lead.name || 'Location Partner'}</div>
      <div class="sig-detail">${lead.business_name || 'Location Partner'}</div>
      <div class="sig-detail" style="margin-top:16px">Date: _______________</div>
    </div>
  </div>

  <div class="footer">
    Global Skill Entertainment &nbsp;·&nbsp; Texas Skill Game Operator &nbsp;·&nbsp; Generated ${today}
    <br>This document is confidential. Print and sign both copies — one for each party.
    <br><br><button onclick="window.print()" style="margin-top:8px;padding:8px 20px;background:#b8943d;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:11pt;font-family:inherit">Print / Save as PDF</button>
  </div>

</div>
</body>
</html>`;

  res.setHeader('Content-Type', 'text/html');
  res.send(html);
});

export default router;
