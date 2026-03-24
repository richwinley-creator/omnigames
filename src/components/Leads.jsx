import { useState } from 'react';
import { useApi, apiPost, apiPut, apiDelete } from '../hooks/useApi';

const STAGES = [
  { key: 'prospect', label: 'Prospect', color: '#6b7280' },
  { key: 'initial_contact', label: 'Contacted', color: '#3b82f6' },
  { key: 'site_visit_scheduled', label: 'Site Visit', color: '#8b5cf6' },
  { key: 'site_qualified', label: 'Qualified', color: '#06b6d4' },
  { key: 'proposal_sent', label: 'Proposal', color: '#f59e0b' },
  { key: 'agreement_signed', label: 'Signed', color: '#10b981' },
  { key: 'licensing', label: 'Licensing', color: '#ec4899' },
  { key: 'install_scheduled', label: 'Install', color: '#14b8a6' },
  { key: 'live', label: 'Live', color: '#22c55e' },
  { key: 'lost', label: 'Lost', color: '#ef4444' },
  { key: 'archived', label: 'Archived', color: '#9ca3af' },
];

const STAGE_MAP = Object.fromEntries(STAGES.map(s => [s.key, s]));

const styles = {
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 },
  h2: { margin: 0, fontSize: 20, fontWeight: 700 },
  pills: { display: 'flex', gap: 6, flexWrap: 'wrap' },
  pill: (active) => ({
    padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 500, cursor: 'pointer', border: 'none',
    background: active ? '#4f46e5' : '#e5e7eb', color: active ? '#fff' : '#374151',
  }),
  addBtn: {
    padding: '8px 16px', background: '#4f46e5', color: '#fff', border: 'none', borderRadius: 8,
    fontSize: 13, fontWeight: 600, cursor: 'pointer',
  },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 13 },
  th: { textAlign: 'left', padding: '10px 12px', borderBottom: '2px solid #e5e7eb', fontWeight: 600, color: '#374151', fontSize: 12 },
  td: { padding: '10px 12px', borderBottom: '1px solid #f3f4f6', verticalAlign: 'top' },
  badge: (color) => ({
    display: 'inline-block', padding: '2px 10px', borderRadius: 12, fontSize: 11, fontWeight: 600,
    background: color + '18', color: color,
  }),
  card: { background: '#fff', borderRadius: 10, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' },
  modal: {
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
  },
  modalCard: { background: '#fff', borderRadius: 12, padding: 28, width: 500, maxHeight: '85vh', overflow: 'auto' },
  input: {
    width: '100%', padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: 6,
    fontSize: 13, marginBottom: 12, boxSizing: 'border-box',
  },
  select: {
    width: '100%', padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: 6,
    fontSize: 13, marginBottom: 12, boxSizing: 'border-box', background: '#fff',
  },
  label: { display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 3 },
  row: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 },
  actionBtn: (color) => ({
    padding: '4px 10px', borderRadius: 4, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 600,
    background: color + '18', color: color, marginRight: 4,
  }),
  stats: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: 8, marginBottom: 20 },
  statCard: (color) => ({
    background: color + '10', borderRadius: 8, padding: '10px 14px', textAlign: 'center',
    borderLeft: `3px solid ${color}`,
  }),
  statNum: { fontSize: 22, fontWeight: 700 },
  statLabel: { fontSize: 10, color: '#6b7280', textTransform: 'uppercase' },
};

export default function Leads({ user }) {
  const isAdmin = user?.role === 'admin';
  const [filter, setFilter] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [editLead, setEditLead] = useState(null);
  const { data: leads, refetch } = useApi('/api/leads');
  const { data: users } = useApi(isAdmin ? '/api/auth/users' : null);
  const { data: summary, refetch: refetchSummary } = useApi('/api/leads/summary');

  const filtered = (leads || []).filter(l => {
    if (filter === 'all') return l.stage !== 'archived';
    return l.stage === filter;
  });

  const refresh = () => { refetch(); refetchSummary(); };

  const handleStageChange = async (lead, newStage) => {
    await apiPut(`/api/leads/${lead.id}`, { stage: newStage });
    refresh();
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this lead?')) return;
    await apiDelete(`/api/leads/${id}`);
    refresh();
  };

  const PIPELINE = STAGES.filter(s => s.key !== 'lost' && s.key !== 'archived');
  const pipeIdx = (stage) => PIPELINE.findIndex(s => s.key === stage);
  const nextStage = (stage) => { const i = pipeIdx(stage); return i >= 0 && i < PIPELINE.length - 1 ? PIPELINE[i + 1].key : null; };
  const prevStage = (stage) => { const i = pipeIdx(stage); return i > 0 ? PIPELINE[i - 1].key : null; };

  return (
    <div>
      {/* Stats row */}
      {summary && (
        <div style={styles.stats}>
          {STAGES.filter(s => s.key !== 'lost').map(s => (
            <div key={s.key} style={styles.statCard(s.color)}>
              <div style={{ ...styles.statNum, color: s.color }}>{summary[s.key] || 0}</div>
              <div style={styles.statLabel}>{s.label}</div>
            </div>
          ))}
        </div>
      )}

      <div style={styles.card}>
        <div style={styles.header}>
          <h2 style={styles.h2}>Leads Pipeline</h2>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button style={styles.addBtn} onClick={() => { setEditLead(null); setShowForm(true); }}>+ Add Lead</button>
          </div>
        </div>

        {/* Filter pills */}
        <div style={{ ...styles.pills, marginBottom: 16 }}>
          <button style={styles.pill(filter === 'all')} onClick={() => setFilter('all')}>
            All ({(leads || []).filter(l => l.stage !== 'archived').length})
          </button>
          {STAGES.map(s => {
            const cnt = (leads || []).filter(l => l.stage === s.key).length;
            return cnt > 0 ? (
              <button key={s.key} style={styles.pill(filter === s.key)} onClick={() => setFilter(s.key)}>
                {s.label} ({cnt})
              </button>
            ) : null;
          })}
        </div>

        {/* Table */}
        <div style={{ overflowX: 'auto' }}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Name / Business</th>
                <th style={styles.th}>Contact</th>
                <th style={styles.th}>City</th>
                <th style={styles.th}>Interest</th>
                <th style={styles.th}>Stage</th>
                <th style={styles.th}>Source</th>
                <th style={styles.th}>Follow Up</th>
                <th style={styles.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(lead => {
                const stage = STAGE_MAP[lead.stage] || STAGE_MAP.prospect;
                return (
                  <tr key={lead.id}>
                    <td style={styles.td}>
                      <div style={{ fontWeight: 600 }}>{lead.name}</div>
                      {lead.business_name && <div style={{ fontSize: 11, color: '#6b7280' }}>{lead.business_name}</div>}
                      {lead.business_type && <div style={{ fontSize: 11, color: '#9ca3af' }}>{lead.business_type}</div>}
                    </td>
                    <td style={styles.td}>
                      <div>{lead.phone}</div>
                      <div style={{ fontSize: 11, color: '#6b7280' }}>{lead.email}</div>
                    </td>
                    <td style={styles.td}>{lead.city}{lead.state && lead.state !== 'TX' ? `, ${lead.state}` : ''}</td>
                    <td style={styles.td}>{lead.interest}</td>
                    <td style={styles.td}><span style={styles.badge(stage.color)}>{stage.label}</span></td>
                    <td style={styles.td}><span style={{ fontSize: 11, color: '#6b7280' }}>{lead.source}</span></td>
                    <td style={styles.td}>{lead.follow_up_date || '—'}</td>
                    <td style={styles.td}>
                      {prevStage(lead.stage) && (
                        <button style={styles.actionBtn('#6b7280')} onClick={() => handleStageChange(lead, prevStage(lead.stage))}>Back</button>
                      )}
                      {nextStage(lead.stage) && (
                        <button style={styles.actionBtn('#4f46e5')} onClick={() => handleStageChange(lead, nextStage(lead.stage))}>Next</button>
                      )}
                      <button style={styles.actionBtn('#f59e0b')} onClick={() => { setEditLead(lead); setShowForm(true); }}>Edit</button>
                      {lead.stage !== 'lost' && lead.stage !== 'live' && lead.stage !== 'archived' && (
                        <button style={styles.actionBtn('#ef4444')} onClick={() => handleStageChange(lead, 'lost')}>Lost</button>
                      )}
                      {lead.stage !== 'archived' && lead.stage !== 'live' && (
                        <button style={styles.actionBtn('#9ca3af')} onClick={() => handleStageChange(lead, 'archived')}>Archive</button>
                      )}
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={8} style={{ ...styles.td, textAlign: 'center', color: '#9ca3af', padding: 40 }}>
                  No leads found. Add one or connect your Formspree webhook.
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showForm && (
        <LeadForm
          lead={editLead}
          users={users || []}
          onClose={() => { setShowForm(false); setEditLead(null); }}
          onSave={refresh}
        />
      )}
    </div>
  );
}

function LeadForm({ lead, users, onClose, onSave }) {
  const [form, setForm] = useState({
    name: lead?.name || '',
    email: lead?.email || '',
    phone: lead?.phone || '',
    business_name: lead?.business_name || '',
    business_type: lead?.business_type || '',
    city: lead?.city || '',
    state: lead?.state || 'TX',
    interest: lead?.interest || '',
    brand_preference: lead?.brand_preference || '',
    machines_wanted: lead?.machines_wanted || '',
    notes: lead?.notes || '',
    stage: lead?.stage || 'prospect',
    assigned_to: lead?.assigned_to || '',
    follow_up_date: lead?.follow_up_date || '',
  });
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (lead) {
        await apiPut(`/api/leads/${lead.id}`, form);
      } else {
        await apiPost('/api/leads', form);
      }
      onSave();
      onClose();
    } catch (e) {
      alert(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={styles.modal} onClick={onClose}>
      <form style={styles.modalCard} onClick={e => e.stopPropagation()} onSubmit={handleSave}>
        <h3 style={{ margin: '0 0 20px', fontSize: 18 }}>{lead ? 'Edit Lead' : 'Add Lead'}</h3>
        <div style={styles.row}>
          <div><label style={styles.label}>Name *</label><input style={styles.input} value={form.name} onChange={e => set('name', e.target.value)} required /></div>
          <div><label style={styles.label}>Phone</label><input style={styles.input} value={form.phone} onChange={e => set('phone', e.target.value)} /></div>
        </div>
        <div style={styles.row}>
          <div><label style={styles.label}>Email</label><input style={styles.input} value={form.email} onChange={e => set('email', e.target.value)} /></div>
          <div><label style={styles.label}>Business Name</label><input style={styles.input} value={form.business_name} onChange={e => set('business_name', e.target.value)} /></div>
        </div>
        <div style={styles.row}>
          <div>
            <label style={styles.label}>Business Type</label>
            <select style={styles.select} value={form.business_type} onChange={e => set('business_type', e.target.value)}>
              <option value="">Select...</option>
              <option>Bar</option><option>Restaurant</option><option>Convenience Store</option>
              <option>Game Room</option><option>Truck Stop</option><option>Gas Station</option>
              <option>Hotel</option><option>Other</option>
            </select>
          </div>
          <div><label style={styles.label}>City</label><input style={styles.input} value={form.city} onChange={e => set('city', e.target.value)} /></div>
        </div>
        <div style={styles.row}>
          <div>
            <label style={styles.label}>Interest</label>
            <select style={styles.select} value={form.interest} onChange={e => set('interest', e.target.value)}>
              <option value="">Select...</option>
              <option>Revenue Share</option><option>Buy JVL</option><option>Online Gaming</option><option>General Question</option>
            </select>
          </div>
          <div>
            <label style={styles.label}>Brand Preference</label>
            <select style={styles.select} value={form.brand_preference} onChange={e => set('brand_preference', e.target.value)}>
              <option value="">No Preference</option>
              <option>Banilla</option><option>JVL</option><option>Primero</option><option>Multiple</option>
            </select>
          </div>
        </div>
        <div style={styles.row}>
          <div>
            <label style={styles.label}>Machines Wanted</label>
            <select style={styles.select} value={form.machines_wanted} onChange={e => set('machines_wanted', e.target.value)}>
              <option value="">Not Sure</option>
              <option>1-2</option><option>3-5</option><option>6-10</option><option>10+</option>
            </select>
          </div>
          <div>
            <label style={styles.label}>Stage</label>
            <select style={styles.select} value={form.stage} onChange={e => set('stage', e.target.value)}>
              {STAGES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
            </select>
          </div>
        </div>
        <div style={styles.row}>
          <div>
            <label style={styles.label}>Assigned To</label>
            <select style={styles.select} value={form.assigned_to} onChange={e => set('assigned_to', e.target.value ? Number(e.target.value) : '')}>
              <option value="">Unassigned</option>
              {users.filter(u => u.active).map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          </div>
          <div><label style={styles.label}>Follow Up Date</label><input style={styles.input} type="date" value={form.follow_up_date} onChange={e => set('follow_up_date', e.target.value)} /></div>
        </div>
        <label style={styles.label}>Notes</label>
        <textarea style={{ ...styles.input, height: 60, resize: 'vertical' }} value={form.notes} onChange={e => set('notes', e.target.value)} />
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
          <button type="button" style={{ ...styles.addBtn, background: '#e5e7eb', color: '#374151' }} onClick={onClose}>Cancel</button>
          <button style={{ ...styles.addBtn, opacity: saving ? 0.7 : 1 }} disabled={saving}>{saving ? 'Saving...' : 'Save Lead'}</button>
        </div>
      </form>
    </div>
  );
}
