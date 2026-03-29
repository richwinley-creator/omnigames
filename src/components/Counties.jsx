import { useState } from 'react';
import { useApi, apiPost, apiPut, apiDelete } from '../hooks/useApi';

const STATUSES = [
  { key: 'approved', label: 'Approved', color: '#16a34a', bg: '#dcfce7', border: '#bbf7d0', dot: '#22c55e' },
  { key: 'restricted', label: 'Restricted', color: '#dc2626', bg: '#fef2f2', border: '#fecaca', dot: '#ef4444' },
  { key: 'unknown', label: 'Unknown', color: '#92400e', bg: '#fffbeb', border: '#fde68a', dot: '#f59e0b' },
];
const STATUS_MAP = Object.fromEntries(STATUSES.map(s => [s.key, s]));

export function CountyBadge({ county, state = 'TX', counties = [] }) {
  if (!county) return null;
  const match = counties.find(c => c.name.toLowerCase() === county.toLowerCase() && c.state.toLowerCase() === (state || 'TX').toLowerCase());
  const status = match ? STATUS_MAP[match.status] || STATUS_MAP.unknown : STATUS_MAP.unknown;
  const label = match ? status.label : 'Unknown';
  return (
    <span title={match?.regulations || (match ? '' : 'County not yet researched')} style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '2px 9px', borderRadius: 10, fontSize: 11, fontWeight: 600,
      background: status.bg, color: status.color, border: `1px solid ${status.border}`,
      cursor: 'default',
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: status.dot, flexShrink: 0 }} />
      {county} · {label}
    </span>
  );
}

const st = {
  addBtn: { padding: '9px 18px', background: '#b8943d', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  modal: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modalCard: { background: '#fff', borderRadius: 12, padding: 28, width: 'min(500px, calc(100vw - 32px))', maxHeight: '85vh', overflow: 'auto' },
  input: { width: '100%', padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13, marginBottom: 12, boxSizing: 'border-box' },
  select: { width: '100%', padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13, marginBottom: 12, boxSizing: 'border-box', background: '#fff' },
  label: { display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 3 },
  row: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 },
};

export default function Counties() {
  const { data: counties, refetch } = useApi('/api/counties');
  const [showForm, setShowForm] = useState(false);
  const [editCounty, setEditCounty] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');

  const filtered = (counties || []).filter(c => filterStatus === 'all' || c.status === filterStatus);

  const handleDelete = async (id) => {
    if (!confirm('Remove this county?')) return;
    await apiDelete(`/api/counties/${id}`);
    refetch();
  };

  const counts = (counties || []).reduce((acc, c) => { acc[c.status] = (acc[c.status] || 0) + 1; return acc; }, {});

  return (
    <div>
      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 20 }}>
        {STATUSES.map(s => (
          <div key={s.key} style={{
            background: '#fff', borderRadius: 12, padding: '16px 20px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.07)', borderLeft: `4px solid ${s.dot}`,
            cursor: 'pointer', opacity: filterStatus !== 'all' && filterStatus !== s.key ? 0.5 : 1,
          }} onClick={() => setFilterStatus(filterStatus === s.key ? 'all' : s.key)}>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{s.label}</div>
            <div style={{ fontSize: 30, fontWeight: 800, color: s.color, marginTop: 4 }}>{counts[s.key] || 0}</div>
            <div style={{ fontSize: 11, color: '#9ca3af' }}>counties</div>
          </div>
        ))}
        <div style={{
          background: '#fff', borderRadius: 12, padding: '16px 20px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.07)', borderLeft: '4px solid #b8943d',
        }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Total</div>
          <div style={{ fontSize: 30, fontWeight: 800, color: '#b8943d', marginTop: 4 }}>{(counties || []).length}</div>
          <div style={{ fontSize: 11, color: '#9ca3af' }}>tracked</div>
        </div>
      </div>

      <div style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>County Registry</h2>
          <button style={st.addBtn} onClick={() => { setEditCounty(null); setShowForm(true); }}>+ Add County</button>
        </div>

        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 48, color: '#9ca3af' }}>
            No counties yet. Add the counties you operate in to track legal status.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 12 }}>
            {filtered.map(c => {
              const s = STATUS_MAP[c.status] || STATUS_MAP.unknown;
              return (
                <div key={c.id} style={{
                  borderRadius: 10, padding: '16px 18px', border: `1px solid ${s.border}`,
                  background: s.bg, borderLeft: `4px solid ${s.dot}`,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 8 }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 15, color: '#111827' }}>{c.name} County</div>
                      <div style={{ fontSize: 12, color: '#6b7280' }}>{c.state}</div>
                    </div>
                    <span style={{
                      fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 10,
                      background: '#fff', color: s.color, border: `1px solid ${s.border}`,
                      display: 'flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap',
                    }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: s.dot }} />
                      {s.label}
                    </span>
                  </div>
                  {c.regulations && (
                    <div style={{ fontSize: 12, color: s.color, marginBottom: 8, lineHeight: 1.4 }}>{c.regulations}</div>
                  )}
                  <div style={{ display: 'flex', gap: 8, fontSize: 11, color: '#6b7280', flexWrap: 'wrap', marginBottom: 10 }}>
                    {c.contact_name && <span>👤 {c.contact_name}</span>}
                    {c.contact_phone && <span>📞 {c.contact_phone}</span>}
                    {c.website && <a href={c.website} target="_blank" rel="noreferrer" style={{ color: '#b8943d' }}>🔗 Website</a>}
                  </div>
                  {c.notes && <div style={{ fontSize: 11, color: '#9ca3af', fontStyle: 'italic', marginBottom: 10 }}>{c.notes}</div>}
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={() => { setEditCounty(c); setShowForm(true); }} style={{
                      padding: '5px 12px', borderRadius: 6, border: '1px solid #e5e7eb', cursor: 'pointer',
                      fontSize: 12, fontWeight: 500, background: '#fff', color: '#374151',
                    }}>Edit</button>
                    <button onClick={() => handleDelete(c.id)} style={{
                      padding: '5px 12px', borderRadius: 6, border: 'none', cursor: 'pointer',
                      fontSize: 12, fontWeight: 500, background: 'rgba(239,68,68,0.1)', color: '#ef4444',
                    }}>Remove</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showForm && (
        <CountyForm
          county={editCounty}
          onClose={() => { setShowForm(false); setEditCounty(null); }}
          onSave={refetch}
        />
      )}
    </div>
  );
}

function CountyForm({ county, onClose, onSave }) {
  const [form, setForm] = useState({
    name: county?.name || '',
    state: county?.state || 'TX',
    status: county?.status || 'unknown',
    regulations: county?.regulations || '',
    contact_name: county?.contact_name || '',
    contact_phone: county?.contact_phone || '',
    website: county?.website || '',
    notes: county?.notes || '',
  });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (county) await apiPut(`/api/counties/${county.id}`, form);
      else await apiPost('/api/counties', form);
      onSave();
      onClose();
    } catch (e) { alert(e.message); }
    finally { setSaving(false); }
  };

  return (
    <div style={st.modal} onClick={onClose}>
      <form style={st.modalCard} onClick={e => e.stopPropagation()} onSubmit={handleSave}>
        <h3 style={{ margin: '0 0 20px', fontSize: 18 }}>{county ? 'Edit County' : 'Add County'}</h3>

        <div style={st.row}>
          <div>
            <label style={st.label}>County Name *</label>
            <input style={st.input} value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Nueces" required />
          </div>
          <div>
            <label style={st.label}>State</label>
            <input style={st.input} value={form.state} onChange={e => set('state', e.target.value)} placeholder="TX" />
          </div>
        </div>

        <label style={st.label}>Legal Status *</label>
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          {STATUSES.map(s => (
            <button
              key={s.key}
              type="button"
              onClick={() => set('status', s.key)}
              style={{
                flex: 1, padding: '10px 0', borderRadius: 8, border: `2px solid ${form.status === s.key ? s.dot : '#e5e7eb'}`,
                cursor: 'pointer', fontSize: 12, fontWeight: 600,
                background: form.status === s.key ? s.bg : '#fff',
                color: form.status === s.key ? s.color : '#6b7280',
              }}
            >
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: s.dot, margin: '0 auto 4px' }} />
              {s.label}
            </button>
          ))}
        </div>

        <label style={st.label}>Regulations / Rules</label>
        <textarea style={{ ...st.input, height: 70, resize: 'vertical' }} value={form.regulations} onChange={e => set('regulations', e.target.value)} placeholder="What's allowed or restricted in this county..." />

        <div style={st.row}>
          <div>
            <label style={st.label}>Contact Name</label>
            <input style={st.input} value={form.contact_name} onChange={e => set('contact_name', e.target.value)} placeholder="DA's office, city clerk..." />
          </div>
          <div>
            <label style={st.label}>Contact Phone</label>
            <input style={st.input} value={form.contact_phone} onChange={e => set('contact_phone', e.target.value)} />
          </div>
        </div>

        <label style={st.label}>Official Website</label>
        <input style={st.input} value={form.website} onChange={e => set('website', e.target.value)} placeholder="https://..." />

        <label style={st.label}>Notes (who you spoke with, etc.)</label>
        <textarea style={{ ...st.input, height: 60, resize: 'vertical' }} value={form.notes} onChange={e => set('notes', e.target.value)} />

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
          <button type="button" style={{ ...st.addBtn, background: '#e5e7eb', color: '#374151' }} onClick={onClose}>Cancel</button>
          <button style={{ ...st.addBtn, opacity: saving ? 0.7 : 1 }} disabled={saving}>{saving ? 'Saving...' : 'Save County'}</button>
        </div>
      </form>
    </div>
  );
}
