import { useState } from 'react';
import { useApi, apiPost } from '../hooks/useApi';

const styles = {
  card: { background: '#fff', borderRadius: 10, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  h2: { margin: 0, fontSize: 20, fontWeight: 700 },
  addBtn: { padding: '8px 16px', background: '#4f46e5', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 13 },
  th: { textAlign: 'left', padding: '10px 12px', borderBottom: '2px solid #e5e7eb', fontWeight: 600, color: '#374151', fontSize: 12 },
  td: { padding: '10px 12px', borderBottom: '1px solid #f3f4f6' },
  summaryRow: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12, marginBottom: 20 },
  summaryCard: { background: '#f0fdf4', borderRadius: 8, padding: '14px 18px', borderLeft: '3px solid #22c55e' },
  modal: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modalCard: { background: '#fff', borderRadius: 12, padding: 28, width: 420 },
  input: { width: '100%', padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13, marginBottom: 12, boxSizing: 'border-box' },
  select: { width: '100%', padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13, marginBottom: 12, boxSizing: 'border-box', background: '#fff' },
  label: { display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 3 },
};

const fmt = (n) => '$' + (n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function Fills() {
  const [showForm, setShowForm] = useState(false);
  const { data: fills, refetch } = useApi('/api/fills');
  const { data: summary } = useApi('/api/fills/summary');
  const { data: locations } = useApi('/api/locations');

  return (
    <div>
      {/* Summary cards */}
      <div style={styles.summaryRow}>
        <div style={styles.summaryCard}>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#22c55e' }}>{fmt(summary?.total)}</div>
          <div style={{ fontSize: 11, color: '#6b7280' }}>TOTAL FILLS</div>
        </div>
        {(summary?.byLocation || []).slice(0, 4).map(loc => (
          <div key={loc.name} style={{ ...styles.summaryCard, background: '#eff6ff', borderColor: '#3b82f6' }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#3b82f6' }}>{fmt(loc.total)}</div>
            <div style={{ fontSize: 11, color: '#6b7280' }}>{loc.name} ({loc.fill_count} fills)</div>
          </div>
        ))}
      </div>

      <div style={styles.card}>
        <div style={styles.header}>
          <h2 style={styles.h2}>Kiosk Fills</h2>
          <button style={styles.addBtn} onClick={() => setShowForm(true)}>+ Record Fill</button>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Date</th>
                <th style={styles.th}>Location</th>
                <th style={styles.th}>Amount</th>
                <th style={styles.th}>Filled By</th>
                <th style={styles.th}>Notes</th>
              </tr>
            </thead>
            <tbody>
              {(fills || []).map(f => (
                <tr key={f.id}>
                  <td style={styles.td}>{f.date}</td>
                  <td style={styles.td}>{f.location_name}</td>
                  <td style={{ ...styles.td, fontWeight: 600, color: '#22c55e' }}>{fmt(f.amount)}</td>
                  <td style={styles.td}>{f.filled_by_name || '—'}</td>
                  <td style={styles.td}>{f.notes || '—'}</td>
                </tr>
              ))}
              {(fills || []).length === 0 && (
                <tr><td colSpan={5} style={{ ...styles.td, textAlign: 'center', color: '#9ca3af', padding: 40 }}>No fills recorded yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showForm && (
        <FillForm
          locations={locations || []}
          onClose={() => setShowForm(false)}
          onSave={() => { refetch(); setShowForm(false); }}
        />
      )}
    </div>
  );
}

function FillForm({ locations, onClose, onSave }) {
  const [form, setForm] = useState({ location_id: '', date: new Date().toISOString().slice(0, 10), amount: '', notes: '' });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await apiPost('/api/fills', { ...form, location_id: Number(form.location_id), amount: Number(form.amount) });
      onSave();
    } catch (e) { alert(e.message); } finally { setSaving(false); }
  };

  return (
    <div style={styles.modal} onClick={onClose}>
      <form style={styles.modalCard} onClick={e => e.stopPropagation()} onSubmit={handleSave}>
        <h3 style={{ margin: '0 0 20px', fontSize: 18 }}>Record Kiosk Fill</h3>
        <label style={styles.label}>Location *</label>
        <select style={styles.select} value={form.location_id} onChange={e => set('location_id', e.target.value)} required>
          <option value="">Select location...</option>
          {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
        </select>
        <label style={styles.label}>Date *</label>
        <input style={styles.input} type="date" value={form.date} onChange={e => set('date', e.target.value)} required />
        <label style={styles.label}>Amount ($) *</label>
        <input style={styles.input} type="number" step="0.01" value={form.amount} onChange={e => set('amount', e.target.value)} required placeholder="0.00" />
        <label style={styles.label}>Notes</label>
        <input style={styles.input} value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Optional notes..." />
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
          <button type="button" style={{ ...styles.addBtn, background: '#e5e7eb', color: '#374151' }} onClick={onClose}>Cancel</button>
          <button style={{ ...styles.addBtn, opacity: saving ? 0.7 : 1 }} disabled={saving}>{saving ? 'Saving...' : 'Save Fill'}</button>
        </div>
      </form>
    </div>
  );
}
