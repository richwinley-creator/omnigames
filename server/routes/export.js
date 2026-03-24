import { Router } from 'express';
import * as XLSX from 'xlsx';
import db from '../db.js';

const router = Router();

// GET /api/export/excel — download COAM_Dashboard.xlsx
router.get('/excel', async (req, res) => {
  const locations = await db.prepare('SELECT * FROM locations ORDER BY id').all();
  const wb = XLSX.utils.book_new();

  for (const loc of locations) {
    const readings = await db.prepare(`
      SELECT machine_name, prev_in, curr_in, total_in, prev_out, curr_out, total_out, net
      FROM readings WHERE location_id = ? ORDER BY date DESC, id
    `).all(loc.id);

    const header = ['Machine', 'Company', 'Previous In', 'Current In', 'Total In', 'Previous Out', 'Current Out', 'Total Out', 'Total (Net)'];

    const rows = readings.length > 0
      ? readings.map(r => [r.machine_name, loc.machine_type, r.prev_in, r.curr_in, r.total_in, r.prev_out, r.curr_out, r.total_out, r.net])
      : [['No readings yet', '', '', '', '', '', '', '', '']];

    // Summary rows
    if (readings.length > 0) {
      const totalIn = readings.reduce((s, r) => s + r.total_in, 0);
      const totalOut = readings.reduce((s, r) => s + r.total_out, 0);
      const totalNet = readings.reduce((s, r) => s + r.net, 0);
      rows.push([]);
      rows.push(['Total In', '', '', '', totalIn, '', '', '', '']);
      rows.push(['Total Out', '', '', '', '', '', '', totalOut, '']);
      rows.push(['Total Left (Net)', '', '', '', '', '', '', '', totalNet]);
      rows.push([`GSE ${loc.gse_pct}%`, '', '', '', '', '', '', '', (totalNet * loc.gse_pct / 100).toFixed(2)]);
      rows.push([`${loc.partner} ${loc.partner_pct}%`, '', '', '', '', '', '', '', (totalNet * loc.partner_pct / 100).toFixed(2)]);
    }

    const ws = XLSX.utils.aoa_to_sheet([header, ...rows]);
    ws['!cols'] = header.map(() => ({ wch: 14 }));
    XLSX.utils.book_append_sheet(wb, ws, loc.sheet_name);
  }

  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename="COAM_Dashboard.xlsx"');
  res.send(buf);
});

export default router;
