import { useState } from 'react';
import { useApi, apiPost, apiPut } from '../hooks/useApi';

const ISSUE_TYPES = ['Bill Acceptor', 'Display', 'Software', 'Network', 'Power', 'Vandalism', 'Payout', 'Other'];
const PRIORITIES = [
  { key: 'urgent', label: 'Urgent', color: '#dc2626' },
  { key: 'high', label: 'High', color: '#f59e0b' },
  { key: 'normal', label: 'Normal', color: '#3b82f6' },
  { key: 'low', label: 'Low', color: '#6b7280' },
];
const STATUSES = ['open', 'in_progress', 'resolved'];
const PRIORITY_MAP = Object.fromEntries(PRIORITIES.map(p => [p.key, p]));

const styles = {
  card: { background: '#fff', borderRadius: 10, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 },
  h2: { margin: 0, fontSize: 20, fontWeight: 700 },
  addBtn: { padding: '8px 16px', background: '#4f46e5', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 13 },
  th: { textAlign: 'left', padding: '10px 12px', borderBottom: '2px solid #e5e7eb', fontWeight: 600, color: '#374151', fontSize: 12 },
  td: { padding: '10px 12px', borderBottom: '1px solid #f3f4f6' },
  badge: (color) => ({ display: 'inline-block', padding: '2px 10px', borderRadius: 12, fontSize: 11, fontWeight: 600, background: color + '18', color }),
  statusBadge: (status) => {
    const colors = { open: '#ef4444', in_progress: '#f59e0b', resolved: '#22c55e' };
    const c = colors[status] || '#6b7280';
    return { display: 'inline-block', padding: '2px 10px', borderRadius: 12, fontSize: 11, fontWeight: 600, background: c + '18', color: c };
  },
  actionBtn: (color) => ({ padding: '4px 10px', borderRadius: 4, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 600, background: color + '18', color, marginRight: 4 }),
  modal: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modalCard: { background: '#fff', borderRadius: 12, padding: 28, width: 'min(460px, calc(100vw - 32px))', maxHeight: '80vh', overflow: 'auto' },
  input: { width: '100%', padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13, marginBottom: 12, boxSizing: 'border-box' },
  select: { width: '100%', padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13, marginBottom: 12, boxSizing: 'border-box', background: '#fff' },
  label: { display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 3 },
  pills: { display: 'flex', gap: 6, marginBottom: 16 },
  pill: (active) => ({ padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 500, cursor: 'pointer', border: 'none', background: active ? '#4f46e5' : '#e5e7eb', color: active ? '#fff' : '#374151' }),
  summaryRow: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 },
  summaryCard: (color) => ({ background: color + '10', borderRadius: 8, padding: '12px 16px', textAlign: 'center', borderLeft: `3px solid ${color}` }),
};

export default function Service() {
  const [filter, setFilter] = useState('open');
  const [showForm, setShowForm] = useState(false);
  const { data: tickets, refetch } = useApi('/api/service');
  const { data: locations } = useApi('/api/locations');
  const { data: users } = useApi('/api/auth/users');

  const filtered = (tickets || []).filter(t => filter === 'all' || t.status === filter);
  const openCount = (tickets || []).filter(t => t.status === 'open').length;
  const inProgressCount = (tickets || []).filter(t => t.status === 'in_progress').length;
  const urgentCount = (tickets || []).filter(t => t.priority === 'urgent' && t.status !== 'resolved').length;
  const resolvedCount = (tickets || []).filter(t => t.status === 'resolved').length;

  const handleStatusChange = async (id, status) => {
    await apiPut(`/api/service/${id}`, { status });
    refetch();
  };

  return (
    <div>
      <div style={styles.summaryRow}>
        <div style={styles.summaryCard('#ef4444')}><div style={{ fontSize: 24, fontWeight: 700, color: '#ef4444' }}>{openCount}</div><div style={{ fontSize: 11, color: '#6b7280' }}>OPEN</div></div>
        <div style={styles.summaryCard('#f59e0b')}><div style={{ fontSize: 24, fontWeight: 700, color: '#f59e0b' }}>{inProgressCount}</div><div style={{ fontSize: 11, color: '#6b7280' }}>IN PROGRESS</div></div>
        <div style={styles.summaryCard('#dc2626')}><div style={{ fontSize: 24, fontWeight: 700, color: '#dc2626' }}>{urgentCount}</div><div style={{ fontSize: 11, color: '#6b7280' }}>URGENT</div></div>
        <div style={styles.summaryCard('#22c55e')}><div style={{ fontSize: 24, fontWeight: 700, color: '#22c55e' }}>{resolvedCount}</div><div style={{ fontSize: 11, color: '#6b7280' }}>RESOLVED</div></div>
      </div>

      <div style={styles.card}>
        <div style={styles.header}>
          <h2 style={styles.h2}>Service Tickets</h2>
          <button style={styles.addBtn} onClick={() => setShowForm(true)}>+ New Ticket</button>
        </div>
        <div style={styles.pills}>
          {['all', 'open', 'in_progress', 'resolved'].map(s => (
            <button key={s} style={styles.pill(filter === s)} onClick={() => setFilter(s)}>
              {s === 'all' ? 'All' : s === 'in_progress' ? 'In Progress' : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Location</th>
                <th style={styles.th}>Machine</th>
                <th style={styles.th}>Issue</th>
                <th style={styles.th}>Priority</th>
                <th style={styles.th}>Status</th>
                <th style={styles.th}>Assigned</th>
                <th style={styles.th}>Created</th>
                <th style={styles.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(t => {
                const pri = PRIORITY_MAP[t.priority] || PRIORITY_MAP.normal;
                return (
                  <tr key={t.id}>
                    <td style={styles.td}>{t.location_name}</td>
                    <td style={styles.td}>{t.machine_name || '—'}</td>
                    <td style={styles.td}>
                      <div style={{ fontWeight: 500 }}>{t.issue_type}</div>
                      {t.description && <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>{t.description}</div>}
                    </td>
                    <td style={styles.td}><span style={styles.badge(pri.color)}>{pri.label}</span></td>
                    <td style={styles.td}><span style={styles.statusBadge(t.status)}>{t.status === 'in_progress' ? 'In Progress' : t.status.charAt(0).toUpperCase() + t.status.slice(1)}</span></td>
                    <td style={styles.td}>{t.assigned_name || '—'}</td>
                    <td style={styles.td}>{t.created_at?.slice(0, 10)}</td>
                    <td style={styles.td}>
                      {t.status === 'open' && <button style={styles.actionBtn('#f59e0b')} onClick={() => handleStatusChange(t.id, 'in_progress')}>Start</button>}
                      {t.status === 'in_progress' && <button style={styles.actionBtn('#22c55e')} onClick={() => handleStatusChange(t.id, 'resolved')}>Resolve</button>}
                      {t.status === 'resolved' && <button style={styles.actionBtn('#6b7280')} onClick={() => handleStatusChange(t.id, 'open')}>Reopen</button>}
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={8} style={{ ...styles.td, textAlign: 'center', color: '#9ca3af', padding: 40 }}>No tickets found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showForm && (
        <TicketForm
          locations={locations || []}
          users={users || []}
          onClose={() => setShowForm(false)}
          onSave={() => { refetch(); setShowForm(false); }}
        />
      )}
    </div>
  );
}

function TicketForm({ locations, users, onClose, onSave }) {
  const [form, setForm] = useState({ location_id: '', machine_name: '', issue_type: '', description: '', priority: 'normal', assigned_to: '' });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await apiPost('/api/service', { ...form, location_id: Number(form.location_id), assigned_to: form.assigned_to ? Number(form.assigned_to) : null });
      onSave();
    } catch (e) { alert(e.message); } finally { setSaving(false); }
  };

  return (
    <div style={styles.modal} onClick={onClose}>
      <form style={styles.modalCard} onClick={e => e.stopPropagation()} onSubmit={handleSave}>
        <h3 style={{ margin: '0 0 20px', fontSize: 18 }}>New Service Ticket</h3>
        <label style={styles.label}>Location *</label>
        <select style={styles.select} value={form.location_id} onChange={e => set('location_id', e.target.value)} required>
          <option value="">Select location...</option>
          {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
        </select>
        <label style={styles.label}>Machine Name</label>
        <input style={styles.input} value={form.machine_name} onChange={e => set('machine_name', e.target.value)} placeholder="e.g. Machine 1" />
        <label style={styles.label}>Issue Type *</label>
        <select style={styles.select} value={form.issue_type} onChange={e => set('issue_type', e.target.value)} required>
          <option value="">Select...</option>
          {ISSUE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <label style={styles.label}>Description</label>
        <textarea style={{ ...styles.input, height: 60, resize: 'vertical' }} value={form.description} onChange={e => set('description', e.target.value)} />
        <label style={styles.label}>Priority</label>
        <select style={styles.select} value={form.priority} onChange={e => set('priority', e.target.value)}>
          {PRIORITIES.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}
        </select>
        <label style={styles.label}>Assign To</label>
        <select style={styles.select} value={form.assigned_to} onChange={e => set('assigned_to', e.target.value)}>
          <option value="">Unassigned</option>
          {users.filter(u => u.active).map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
        </select>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
          <button type="button" style={{ ...styles.addBtn, background: '#e5e7eb', color: '#374151' }} onClick={onClose}>Cancel</button>
          <button style={{ ...styles.addBtn, opacity: saving ? 0.7 : 1 }} disabled={saving}>{saving ? 'Saving...' : 'Create Ticket'}</button>
        </div>
      </form>
    </div>
  );
}
