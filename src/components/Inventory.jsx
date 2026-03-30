import { useState } from 'react';
import { useApi } from '../hooks/useApi';

const STATUS_COLORS = {
  available: '#059669',
  reserved: '#3b82f6',
  deployed: '#b8943d',
  maintenance: '#f59e0b',
  retired: '#6b7280',
};
const STATUS_BG = {
  available: '#d1fae5',
  reserved: '#dbeafe',
  deployed: '#fef3c7',
  maintenance: '#fff3cd',
  retired: '#f3f4f6',
};

const st = {
  h2: { margin: '0 0 2px', fontSize: 20, fontWeight: 700 },
  sub: { fontSize: 13, color: '#6b7280', margin: 0 },
  card: { background: '#fff', borderRadius: 10, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.08)', marginBottom: 20 },
  row: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 20 },
  btn: (color='#b8943d') => ({ padding: '8px 16px', background: color, color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }),
  btnGhost: { padding: '7px 14px', background: 'transparent', color: '#6b7280', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 12, fontWeight: 500, cursor: 'pointer' },
  badge: (status) => ({ display: 'inline-block', padding: '2px 10px', borderRadius: 12, fontSize: 11, fontWeight: 600, background: STATUS_BG[status] || '#f3f4f6', color: STATUS_COLORS[status] || '#374151' }),
  th: { textAlign: 'left', padding: '10px 12px', borderBottom: '2px solid #e5e7eb', fontWeight: 600, color: '#374151', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.04em' },
  td: { padding: '10px 12px', borderBottom: '1px solid #f3f4f6', fontSize: 13, verticalAlign: 'middle' },
  input: { width: '100%', padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13, marginBottom: 12, boxSizing: 'border-box' },
  select: { width: '100%', padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13, marginBottom: 12, boxSizing: 'border-box', background: '#fff' },
  label: { display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 3 },
  modal: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modalCard: { background: '#fff', borderRadius: 12, padding: 28, width: 'min(500px, calc(100vw - 32px))', maxHeight: '85vh', overflow: 'auto' },
};

function KpiCard({ label, value, sub, color = '#374151', topColor }) {
  return (
    <div className="d-kpi" style={{ borderTopColor: topColor || '#e5e7eb' }}>
      <div className="d-kpi-label">{label}</div>
      <div className="d-kpi-value" style={{ color }}>{value ?? '—'}</div>
      {sub && <div className="d-kpi-sub">{sub}</div>}
    </div>
  );
}

function OrderModal({ order, onClose, onSave }) {
  const [form, setForm] = useState({
    sales_order: order?.sales_order || '',
    promissory_note: order?.promissory_note || '',
    vendor: order?.vendor || 'Banilla',
    machines_qty: order?.machines_qty ?? '',
    kiosks_qty: order?.kiosks_qty ?? '',
    received_at: order?.received_at?.slice(0, 10) || '',
    notes: order?.notes || '',
  });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  async function submit(e) {
    e.preventDefault();
    const token = localStorage.getItem('gse_token');
    const url = order ? `/api/inventory/orders/${order.id}` : '/api/inventory/orders';
    const method = order ? 'PUT' : 'POST';
    await fetch(url, {
      method, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ ...form, machines_qty: parseInt(form.machines_qty) || 0, kiosks_qty: parseInt(form.kiosks_qty) || 0 }),
    });
    onSave();
    onClose();
  }

  return (
    <div style={st.modal} onClick={onClose}>
      <div style={st.modalCard} onClick={e => e.stopPropagation()}>
        <h3 style={{ margin: '0 0 20px', fontSize: 17 }}>{order ? 'Edit Order' : 'New Sales Order'}</h3>
        <form onSubmit={submit}>
          <label style={st.label}>Sales Order #</label>
          <input style={st.input} value={form.sales_order} onChange={e => set('sales_order', e.target.value)} required />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={st.label}>Promissory Note</label>
              <input style={st.input} value={form.promissory_note} onChange={e => set('promissory_note', e.target.value)} placeholder="#1" />
            </div>
            <div>
              <label style={st.label}>Vendor</label>
              <input style={st.input} value={form.vendor} onChange={e => set('vendor', e.target.value)} />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={st.label}>Machines (Cabinets)</label>
              <input style={st.input} type="number" min="0" value={form.machines_qty} onChange={e => set('machines_qty', e.target.value)} />
            </div>
            <div>
              <label style={st.label}>Kiosks</label>
              <input style={st.input} type="number" min="0" value={form.kiosks_qty} onChange={e => set('kiosks_qty', e.target.value)} />
            </div>
          </div>
          <label style={st.label}>Received Date</label>
          <input style={st.input} type="date" value={form.received_at} onChange={e => set('received_at', e.target.value)} />
          <label style={st.label}>Notes</label>
          <textarea style={{ ...st.input, height: 70, resize: 'vertical' }} value={form.notes} onChange={e => set('notes', e.target.value)} />
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
            <button type="button" style={st.btnGhost} onClick={onClose}>Cancel</button>
            <button type="submit" style={st.btn()}>Save</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ItemModal({ item, orders, locations, onClose, onSave }) {
  const [form, setForm] = useState({
    order_id: item?.order_id || orders[0]?.id || '',
    type: item?.type || 'machine',
    model: item?.model || '',
    serial_number: item?.serial_number || '',
    asset_tag: item?.asset_tag || '',
    status: item?.status || 'available',
    location_id: item?.location_id || '',
    deployed_at: item?.deployed_at?.slice(0, 10) || '',
    notes: item?.notes || '',
  });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  async function submit(e) {
    e.preventDefault();
    const token = localStorage.getItem('gse_token');
    const url = item ? `/api/inventory/items/${item.id}` : '/api/inventory/items';
    const method = item ? 'PUT' : 'POST';
    await fetch(url, {
      method, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        ...form,
        order_id: form.order_id || null,
        location_id: form.location_id || null,
        model: form.model || (form.type === 'kiosk' ? 'PT Kiosk Redemption - Silver' : 'Banilla Cabinet'),
      }),
    });
    onSave();
    onClose();
  }

  return (
    <div style={st.modal} onClick={onClose}>
      <div style={st.modalCard} onClick={e => e.stopPropagation()}>
        <h3 style={{ margin: '0 0 20px', fontSize: 17 }}>{item ? 'Edit Item' : 'Add Item'}</h3>
        <form onSubmit={submit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={st.label}>Type</label>
              <select style={st.select} value={form.type} onChange={e => set('type', e.target.value)}>
                <option value="machine">Machine (Cabinet)</option>
                <option value="kiosk">Kiosk</option>
              </select>
            </div>
            <div>
              <label style={st.label}>Sales Order</label>
              <select style={st.select} value={form.order_id} onChange={e => set('order_id', e.target.value)}>
                <option value="">— unassigned —</option>
                {orders.map(o => <option key={o.id} value={o.id}>{o.sales_order} (PN {o.promissory_note})</option>)}
              </select>
            </div>
          </div>
          <label style={st.label}>Model</label>
          <input style={st.input} value={form.model} onChange={e => set('model', e.target.value)}
            placeholder={form.type === 'kiosk' ? 'PT Kiosk Redemption - Silver' : 'Banilla Cabinet'} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={st.label}>Serial Number</label>
              <input style={st.input} value={form.serial_number} onChange={e => set('serial_number', e.target.value)} />
            </div>
            <div>
              <label style={st.label}>Asset Tag</label>
              <input style={st.input} value={form.asset_tag} onChange={e => set('asset_tag', e.target.value)} />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={st.label}>Status</label>
              <select style={st.select} value={form.status} onChange={e => set('status', e.target.value)}>
                <option value="available">Available</option>
                <option value="deployed">Deployed</option>
                <option value="maintenance">Maintenance</option>
                <option value="retired">Retired</option>
              </select>
            </div>
            <div>
              <label style={st.label}>Location (if deployed)</label>
              <select style={st.select} value={form.location_id} onChange={e => set('location_id', e.target.value)}>
                <option value="">— none —</option>
                {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </div>
          </div>
          {form.status === 'deployed' && (
            <>
              <label style={st.label}>Deployed Date</label>
              <input style={st.input} type="date" value={form.deployed_at} onChange={e => set('deployed_at', e.target.value)} />
            </>
          )}
          <label style={st.label}>Notes</label>
          <textarea style={{ ...st.input, height: 60, resize: 'vertical' }} value={form.notes} onChange={e => set('notes', e.target.value)} />
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
            <button type="button" style={st.btnGhost} onClick={onClose}>Cancel</button>
            <button type="submit" style={st.btn()}>Save</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Inventory() {
  const [view, setView] = useState('orders'); // orders | items
  const [filterStatus, setFilterStatus] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterOrder, setFilterOrder] = useState('');
  const [orderModal, setOrderModal] = useState(null); // null | {} (new) | order obj
  const [itemModal, setItemModal] = useState(null);

  const { data: summary, refetch: refetchSummary } = useApi('/api/inventory/summary');
  const { data: orders, refetch: refetchOrders } = useApi('/api/inventory/orders');
  const { data: locations } = useApi('/api/locations');
  const { data: demand, refetch: refetchDemand } = useApi(view === 'demand' ? '/api/inventory/demand' : null);

  const itemQuery = [
    filterStatus && `status=${filterStatus}`,
    filterType && `type=${filterType}`,
    filterOrder && `order_id=${filterOrder}`,
  ].filter(Boolean).join('&');
  const { data: items, refetch: refetchItems } = useApi(`/api/inventory/items${itemQuery ? '?' + itemQuery : ''}`);

  const refresh = () => { refetchSummary(); refetchOrders(); refetchItems(); refetchDemand(); };

  async function reserveForLead(leadId, machines, kiosks) {
    const token = localStorage.getItem('gse_token');
    const errors = [];
    if (machines > 0) {
      const r = await fetch('/api/inventory/reserve', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ lead_id: leadId, type: 'machine', count: machines }) });
      const d = await r.json();
      if (d.error) errors.push(d.error);
    }
    if (kiosks > 0) {
      const r = await fetch('/api/inventory/reserve', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ lead_id: leadId, type: 'kiosk', count: kiosks }) });
      const d = await r.json();
      if (d.error) errors.push(d.error);
    }
    if (errors.length) alert(errors.join('\n'));
    refresh();
  }

  async function unreserveForLead(leadId) {
    const token = localStorage.getItem('gse_token');
    await fetch('/api/inventory/unreserve', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ lead_id: leadId }) });
    refresh();
  }

  async function deleteOrder(id) {
    if (!confirm('Delete this order? Items linked to it will become unassigned.')) return;
    const token = localStorage.getItem('gse_token');
    await fetch(`/api/inventory/orders/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
    refresh();
  }

  async function deleteItem(id) {
    if (!confirm('Remove this item from inventory?')) return;
    const token = localStorage.getItem('gse_token');
    await fetch(`/api/inventory/items/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
    refresh();
  }

  const totalOrdered = summary?.totalOrdered ?? 0;
  const tagged = summary?.total_tagged ?? 0;
  const untagged = totalOrdered - tagged;

  return (
    <div>
      {/* Header */}
      <div style={st.row}>
        <div>
          <h2 style={st.h2}>Inventory</h2>
          <p style={st.sub}>Equipment tracking across all sales orders</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button style={st.btn()} onClick={() => view === 'orders' ? setOrderModal({}) : setItemModal({})}>
            {view === 'orders' ? '+ New Order' : '+ Add Item'}
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="d-kpi-grid" style={{ marginBottom: 20 }}>
        <KpiCard label="Total Ordered" value={totalOrdered} sub="101 machines + kiosks" topColor="#b8943d" />
        <KpiCard label="Machines" value={summary?.totalMachinesOrdered} sub="80 across 4 orders" topColor="#3b82f6" />
        <KpiCard label="Kiosks" value={summary?.totalKiosksOrdered} sub="PT Kiosk Redemption" topColor="#8b5cf6" />
        <KpiCard label="Tagged / Serialized" value={`${tagged} / ${totalOrdered}`} sub={`${untagged} not yet tagged`} topColor="#f59e0b" />
        <KpiCard label="Available" value={summary?.available ?? 0} color="#059669" topColor="#059669" />
        <KpiCard label="Reserved" value={summary?.reserved ?? 0} color="#3b82f6" sub="committed to leads" topColor="#3b82f6" />
        <KpiCard label="Deployed" value={summary?.deployed ?? 0} color="#b8943d" topColor="#b8943d" />
        <KpiCard label="In Maintenance" value={summary?.maintenance ?? 0} color="#f59e0b" topColor="#f59e0b" />
      </div>

      {/* View toggle */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
        {[['orders','Sales Orders'],['demand','Pipeline Demand'],['items','Item Tracker']].map(([v,label]) => (
          <button key={v} onClick={() => setView(v)} style={{
            padding: '6px 16px', borderRadius: 20, border: 'none', fontSize: 13, fontWeight: 500, cursor: 'pointer',
            background: view === v ? '#b8943d' : '#f1f5f9', color: view === v ? '#fff' : '#374151',
          }}>
            {label}
            {v === 'demand' && demand?.shortfallMachines > 0 && (
              <span style={{ marginLeft: 6, background: '#ef4444', color: '#fff', borderRadius: 10, padding: '0 6px', fontSize: 11, fontWeight: 700 }}>!</span>
            )}
          </button>
        ))}
      </div>

      {/* ── Sales Orders view ── */}
      {view === 'orders' && (
        <div style={st.card}>
          <div className="d-table-wrap">
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr>
                  {['Sales Order', 'Prom. Note', 'Vendor', 'Ordered', 'Tagged', 'Deployed', 'Available', 'Maintenance', 'Received', ''].map(h => (
                    <th key={h} style={st.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(orders || []).map(o => {
                  const ordTotal = (o.machines_qty || 0) + (o.kiosks_qty || 0);
                  const tagged = parseInt(o.items_machines || 0) + parseInt(o.items_kiosks || 0);
                  return (
                    <tr key={o.id} style={{ cursor: 'pointer' }} onDoubleClick={() => setOrderModal(o)}>
                      <td style={st.td}><strong>{o.sales_order}</strong></td>
                      <td style={st.td}>{o.promissory_note || '—'}</td>
                      <td style={st.td}>{o.vendor}</td>
                      <td style={st.td}>
                        <span style={{ fontWeight: 600 }}>{ordTotal}</span>
                        <span style={{ fontSize: 11, color: '#9ca3af', marginLeft: 6 }}>({o.machines_qty} machines, {o.kiosks_qty} kiosks)</span>
                      </td>
                      <td style={st.td}>
                        <span style={{ color: tagged === ordTotal ? '#059669' : tagged > 0 ? '#f59e0b' : '#9ca3af' }}>
                          {tagged}/{ordTotal}
                        </span>
                      </td>
                      <td style={st.td}><span style={{ color: '#3b82f6', fontWeight: 600 }}>{o.deployed_count || 0}</span></td>
                      <td style={st.td}><span style={{ color: '#059669', fontWeight: 600 }}>{o.available_count || 0}</span></td>
                      <td style={st.td}><span style={{ color: '#f59e0b' }}>{o.maintenance_count || 0}</span></td>
                      <td style={st.td}>{o.received_at ? new Date(o.received_at).toLocaleDateString() : '—'}</td>
                      <td style={st.td}>
                        <button style={{ ...st.btnGhost, padding: '3px 10px', fontSize: 11, marginRight: 4 }} onClick={() => setOrderModal(o)}>Edit</button>
                        <button style={{ ...st.btnGhost, padding: '3px 10px', fontSize: 11, color: '#ef4444', borderColor: '#fecaca' }} onClick={() => deleteOrder(o.id)}>Del</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr style={{ background: '#f8f9fa' }}>
                  <td style={{ ...st.td, fontWeight: 700 }} colSpan={3}>TOTAL</td>
                  <td style={{ ...st.td, fontWeight: 700 }}>
                    {totalOrdered}
                    <span style={{ fontSize: 11, color: '#9ca3af', marginLeft: 6 }}>
                      ({(orders || []).reduce((s, o) => s + (o.machines_qty || 0), 0)} machines, {(orders || []).reduce((s, o) => s + (o.kiosks_qty || 0), 0)} kiosks)
                    </span>
                  </td>
                  <td style={st.td}>{tagged}/{totalOrdered}</td>
                  <td style={{ ...st.td, color: '#3b82f6', fontWeight: 700 }}>{summary?.deployed ?? 0}</td>
                  <td style={{ ...st.td, color: '#059669', fontWeight: 700 }}>{summary?.available ?? 0}</td>
                  <td style={{ ...st.td, color: '#f59e0b', fontWeight: 700 }}>{summary?.maintenance ?? 0}</td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* ── Pipeline Demand view ── */}
      {view === 'demand' && (
        <div>
          {/* Stock summary bar */}
          {demand && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12, marginBottom: 20 }}>
              {[
                { label: 'Available Machines', value: demand.availableMachines, color: '#059669', bg: '#d1fae5' },
                { label: 'Reserved Machines', value: demand.reservedMachines, color: '#3b82f6', bg: '#dbeafe' },
                { label: 'Available Kiosks', value: demand.availableKiosks, color: '#059669', bg: '#d1fae5' },
                { label: 'Reserved Kiosks', value: demand.reservedKiosks, color: '#3b82f6', bg: '#dbeafe' },
                { label: 'Machine Shortfall', value: demand.shortfallMachines, color: demand.shortfallMachines > 0 ? '#ef4444' : '#059669', bg: demand.shortfallMachines > 0 ? '#fee2e2' : '#d1fae5' },
                { label: 'Kiosk Shortfall', value: demand.shortfallKiosks, color: demand.shortfallKiosks > 0 ? '#ef4444' : '#059669', bg: demand.shortfallKiosks > 0 ? '#fee2e2' : '#d1fae5' },
              ].map(s => (
                <div key={s.label} style={{ background: s.bg, borderRadius: 10, padding: '12px 16px' }}>
                  <div style={{ fontSize: 11, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4 }}>{s.label}</div>
                  <div style={{ fontSize: 26, fontWeight: 700, color: s.color }}>{s.value}</div>
                </div>
              ))}
            </div>
          )}

          <div style={st.card}>
            <div className="d-table-wrap">
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr>
                    {['Lead', 'Stage', 'Needs', 'Reserved', 'Still Needed', ''].map(h => (
                      <th key={h} style={st.th}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(demand?.leads || []).sort((a, b) => {
                    const stageOrder = { install_scheduled: 0, agreement_signed: 1, licensing: 2, proposal_sent: 3, site_qualified: 4, site_visit_scheduled: 5, initial_contact: 6, prospect: 7 };
                    return (stageOrder[a.stage] ?? 9) - (stageOrder[b.stage] ?? 9);
                  }).map(l => {
                    const fullyReserved = l.machines_needed === 0 && l.kiosks_needed === 0;
                    const partiallyReserved = (l.reserved_machines > 0 || l.reserved_kiosks > 0) && !fullyReserved;
                    return (
                      <tr key={l.id} style={{ background: l.stage === 'install_scheduled' ? '#fffbeb' : '#fff' }}>
                        <td style={{ ...st.td, fontWeight: 600 }}>{l.name}</td>
                        <td style={st.td}>
                          <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 10, background: l.stage === 'install_scheduled' ? '#fef3c7' : '#f3f4f6', color: l.stage === 'install_scheduled' ? '#92400e' : '#374151', fontWeight: 600 }}>
                            {l.stage.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td style={st.td}>
                          {l.num_games > 0 && <span style={{ marginRight: 8 }}>🎰 {l.num_games}</span>}
                          {l.num_kiosks > 0 && <span>📟 {l.num_kiosks}</span>}
                        </td>
                        <td style={st.td}>
                          {fullyReserved ? (
                            <span style={{ color: '#059669', fontWeight: 600 }}>✓ All reserved</span>
                          ) : partiallyReserved ? (
                            <span style={{ color: '#f59e0b' }}>🎰 {l.reserved_machines} / 📟 {l.reserved_kiosks}</span>
                          ) : (
                            <span style={{ color: '#9ca3af' }}>—</span>
                          )}
                        </td>
                        <td style={st.td}>
                          {!fullyReserved ? (
                            <span style={{ color: '#ef4444', fontWeight: 600 }}>
                              {l.machines_needed > 0 && `🎰 ${l.machines_needed} `}
                              {l.kiosks_needed > 0 && `📟 ${l.kiosks_needed}`}
                            </span>
                          ) : (
                            <span style={{ color: '#059669' }}>0</span>
                          )}
                        </td>
                        <td style={st.td}>
                          {!fullyReserved && (
                            <button style={{ ...st.btn(), padding: '4px 12px', fontSize: 11 }}
                              onClick={() => reserveForLead(l.id, l.machines_needed, l.kiosks_needed)}>
                              Reserve
                            </button>
                          )}
                          {(l.reserved_machines > 0 || l.reserved_kiosks > 0) && (
                            <button style={{ ...st.btnGhost, padding: '4px 10px', fontSize: 11, marginLeft: 4, color: '#ef4444', borderColor: '#fecaca' }}
                              onClick={() => unreserveForLead(l.id)}>
                              Release
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 12 }}>
              Moving a lead to <strong>Install Scheduled</strong> auto-reserves inventory. Moving to <strong>Live</strong> auto-deploys. Moving to <strong>Lost</strong> releases reservations back to available.
            </p>
          </div>
        </div>
      )}

      {/* ── Item Tracker view ── */}
      {view === 'items' && (
        <div style={st.card}>
          {/* Filters */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
            <select style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 12, background: '#fff' }}
              value={filterOrder} onChange={e => setFilterOrder(e.target.value)}>
              <option value="">All Orders</option>
              {(orders || []).map(o => <option key={o.id} value={o.id}>{o.sales_order}</option>)}
            </select>
            <select style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 12, background: '#fff' }}
              value={filterType} onChange={e => setFilterType(e.target.value)}>
              <option value="">All Types</option>
              <option value="machine">Machines</option>
              <option value="kiosk">Kiosks</option>
            </select>
            <select style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 12, background: '#fff' }}
              value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
              <option value="">All Statuses</option>
              <option value="available">Available</option>
              <option value="deployed">Deployed</option>
              <option value="maintenance">Maintenance</option>
              <option value="retired">Retired</option>
            </select>
            <span style={{ fontSize: 12, color: '#9ca3af', marginLeft: 4 }}>{(items || []).length} items</span>
          </div>

          {items && items.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: '#9ca3af' }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>📦</div>
              <div style={{ fontWeight: 600, marginBottom: 6 }}>No items tagged yet</div>
              <div style={{ fontSize: 13 }}>Add items as you assign serial numbers and deploy machines.</div>
              <button style={{ ...st.btn(), marginTop: 16 }} onClick={() => setItemModal({})}>+ Add First Item</button>
            </div>
          ) : (
            <div className="d-table-wrap">
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr>
                    {['#', 'Type', 'Model', 'Serial #', 'Asset Tag', 'Order', 'Status', 'Location', 'Deployed', ''].map(h => (
                      <th key={h} style={st.th}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(items || []).map(item => (
                    <tr key={item.id}>
                      <td style={{ ...st.td, color: '#9ca3af' }}>{item.id}</td>
                      <td style={st.td}>
                        <span style={{ fontWeight: 600 }}>{item.type === 'machine' ? '🎰 Machine' : '📟 Kiosk'}</span>
                      </td>
                      <td style={{ ...st.td, color: '#6b7280' }}>{item.model || '—'}</td>
                      <td style={st.td}>{item.serial_number || <span style={{ color: '#d1d5db' }}>not set</span>}</td>
                      <td style={st.td}>{item.asset_tag || '—'}</td>
                      <td style={{ ...st.td, color: '#6b7280' }}>{item.sales_order || '—'}</td>
                      <td style={st.td}><span style={st.badge(item.status)}>{item.status}</span></td>
                      <td style={st.td}>{item.location_name || '—'}</td>
                      <td style={{ ...st.td, color: '#6b7280' }}>{item.deployed_at ? new Date(item.deployed_at).toLocaleDateString() : '—'}</td>
                      <td style={st.td}>
                        <button style={{ ...st.btnGhost, padding: '3px 10px', fontSize: 11, marginRight: 4 }} onClick={() => setItemModal(item)}>Edit</button>
                        <button style={{ ...st.btnGhost, padding: '3px 10px', fontSize: 11, color: '#ef4444', borderColor: '#fecaca' }} onClick={() => deleteItem(item.id)}>Del</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      {orderModal !== null && (
        <OrderModal order={orderModal.id ? orderModal : null} onClose={() => setOrderModal(null)} onSave={refresh} />
      )}
      {itemModal !== null && (
        <ItemModal item={itemModal.id ? itemModal : null} orders={orders || []} locations={locations || []}
          onClose={() => setItemModal(null)} onSave={refresh} />
      )}
    </div>
  );
}
