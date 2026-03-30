import { Router } from 'express';
import db from '../db.js';

const router = Router();

// GET /api/inventory/orders — orders with deployed/available counts
router.get('/orders', async (req, res) => {
  const orders = await db.prepare(`
    SELECT o.*,
      COUNT(i.id) FILTER (WHERE i.type = 'machine') as items_machines,
      COUNT(i.id) FILTER (WHERE i.type = 'kiosk') as items_kiosks,
      COUNT(i.id) FILTER (WHERE i.status = 'deployed') as deployed_count,
      COUNT(i.id) FILTER (WHERE i.status = 'available') as available_count,
      COUNT(i.id) FILTER (WHERE i.status = 'maintenance') as maintenance_count
    FROM inventory_orders o
    LEFT JOIN inventory_items i ON i.order_id = o.id
    GROUP BY o.id
    ORDER BY o.id ASC
  `).all();
  res.json(orders);
});

// POST /api/inventory/orders
router.post('/orders', async (req, res) => {
  const { sales_order, promissory_note, vendor, machines_qty, kiosks_qty, received_at, notes } = req.body;
  if (!sales_order) return res.status(400).json({ error: 'sales_order required' });
  const row = await db.prepare(
    `INSERT INTO inventory_orders (sales_order, promissory_note, vendor, machines_qty, kiosks_qty, received_at, notes)
     VALUES (?,?,?,?,?,?,?) RETURNING *`
  ).get(sales_order, promissory_note || null, vendor || 'Banilla', machines_qty || 0, kiosks_qty || 0, received_at || null, notes || null);
  res.json(row);
});

// PUT /api/inventory/orders/:id
router.put('/orders/:id', async (req, res) => {
  const { sales_order, promissory_note, vendor, machines_qty, kiosks_qty, received_at, notes } = req.body;
  await db.prepare(
    `UPDATE inventory_orders SET sales_order=COALESCE(?,sales_order), promissory_note=COALESCE(?,promissory_note),
     vendor=COALESCE(?,vendor), machines_qty=COALESCE(?,machines_qty), kiosks_qty=COALESCE(?,kiosks_qty),
     received_at=COALESCE(?,received_at), notes=COALESCE(?,notes) WHERE id=?`
  ).run(sales_order || null, promissory_note || null, vendor || null, machines_qty ?? null, kiosks_qty ?? null, received_at || null, notes || null, req.params.id);
  res.json({ ok: true });
});

// DELETE /api/inventory/orders/:id
router.delete('/orders/:id', async (req, res) => {
  await db.prepare('DELETE FROM inventory_orders WHERE id=?').run(req.params.id);
  res.json({ ok: true });
});

// GET /api/inventory/items
router.get('/items', async (req, res) => {
  const { order_id, type, status, location_id } = req.query;
  const conditions = [];
  const params = [];
  if (order_id) { conditions.push('i.order_id = ?'); params.push(order_id); }
  if (type) { conditions.push('i.type = ?'); params.push(type); }
  if (status) { conditions.push('i.status = ?'); params.push(status); }
  if (location_id) { conditions.push('i.location_id = ?'); params.push(location_id); }
  const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
  const items = await db.prepare(`
    SELECT i.*, o.sales_order, o.promissory_note, o.vendor, l.name as location_name
    FROM inventory_items i
    LEFT JOIN inventory_orders o ON i.order_id = o.id
    LEFT JOIN locations l ON i.location_id = l.id
    ${where}
    ORDER BY i.order_id ASC, i.type ASC, i.id ASC
  `).all(...params);
  res.json(items);
});

// POST /api/inventory/items
router.post('/items', async (req, res) => {
  const { order_id, type, model, serial_number, asset_tag, status, location_id, deployed_at, notes } = req.body;
  if (!type) return res.status(400).json({ error: 'type required (machine|kiosk)' });
  const row = await db.prepare(
    `INSERT INTO inventory_items (order_id, type, model, serial_number, asset_tag, status, location_id, deployed_at, notes)
     VALUES (?,?,?,?,?,?,?,?,?) RETURNING *`
  ).get(order_id || null, type, model || (type === 'kiosk' ? 'PT Kiosk Redemption - Silver' : 'Banilla Cabinet'),
    serial_number || null, asset_tag || null, status || 'available',
    location_id || null, deployed_at || null, notes || null);
  res.json(row);
});

// PUT /api/inventory/items/:id
router.put('/items/:id', async (req, res) => {
  const { type, model, serial_number, asset_tag, status, location_id, deployed_at, notes, order_id } = req.body;
  const updates = [];
  const params = [];
  if (type !== undefined) { updates.push('type=?'); params.push(type); }
  if (model !== undefined) { updates.push('model=?'); params.push(model); }
  if (serial_number !== undefined) { updates.push('serial_number=?'); params.push(serial_number); }
  if (asset_tag !== undefined) { updates.push('asset_tag=?'); params.push(asset_tag); }
  if (status !== undefined) { updates.push('status=?'); params.push(status); }
  if (location_id !== undefined) { updates.push('location_id=?'); params.push(location_id || null); }
  if (deployed_at !== undefined) { updates.push('deployed_at=?'); params.push(deployed_at || null); }
  if (notes !== undefined) { updates.push('notes=?'); params.push(notes); }
  if (order_id !== undefined) { updates.push('order_id=?'); params.push(order_id || null); }
  if (!updates.length) return res.json({ ok: true });
  updates.push('updated_at=NOW()');
  params.push(req.params.id);
  await db.prepare(`UPDATE inventory_items SET ${updates.join(',')} WHERE id=?`).run(...params);
  res.json({ ok: true });
});

// DELETE /api/inventory/items/:id
router.delete('/items/:id', async (req, res) => {
  await db.prepare('DELETE FROM inventory_items WHERE id=?').run(req.params.id);
  res.json({ ok: true });
});

// GET /api/inventory/summary
router.get('/summary', async (req, res) => {
  const orders = await db.prepare('SELECT SUM(machines_qty) as total_machines, SUM(kiosks_qty) as total_kiosks FROM inventory_orders').get();
  const items = await db.prepare(`
    SELECT
      COUNT(*) as total_tagged,
      COUNT(*) FILTER (WHERE type='machine') as tagged_machines,
      COUNT(*) FILTER (WHERE type='kiosk') as tagged_kiosks,
      COUNT(*) FILTER (WHERE status='available') as available,
      COUNT(*) FILTER (WHERE status='deployed') as deployed,
      COUNT(*) FILTER (WHERE status='maintenance') as maintenance,
      COUNT(*) FILTER (WHERE status='retired') as retired
    FROM inventory_items
  `).get();
  const totalMachines = parseInt(orders.total_machines) || 0;
  const totalKiosks = parseInt(orders.total_kiosks) || 0;
  const totalOrdered = totalMachines + totalKiosks;
  const totalTagged = parseInt(items.total_tagged) || 0;
  res.json({
    totalOrdered,
    totalMachinesOrdered: totalMachines,
    totalKiosksOrdered: totalKiosks,
    total_tagged: totalTagged,
    available: parseInt(items.available) || 0,
    deployed: parseInt(items.deployed) || 0,
    maintenance: parseInt(items.maintenance) || 0,
    retired: parseInt(items.retired) || 0,
    untagged: totalOrdered - totalTagged,
  });
});

export default router;
