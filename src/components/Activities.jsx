import { useState } from 'react';
import { useApi, apiPost } from '../hooks/useApi';

const TYPES = [
  { key: 'call', label: 'Call', icon: '📞', color: '#3b82f6' },
  { key: 'email', label: 'Email', icon: '✉️', color: '#8b5cf6' },
  { key: 'meeting', label: 'Meeting', icon: '🤝', color: '#f59e0b' },
  { key: 'note', label: 'Note', icon: '📝', color: '#6b7280' },
  { key: 'stage_change', label: 'Stage Change', icon: '→', color: '#10b981' },
  { key: 'system', label: 'System', icon: '⚙️', color: '#9ca3af' },
];

const OUTCOMES = ['connected', 'voicemail', 'no_answer', 'email_sent', 'email_opened', 'completed', 'scheduled', 'cancelled'];

const styles = {
  container: { background: '#fff', borderRadius: 10, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  h3: { margin: 0, fontSize: 16, fontWeight: 600 },
  addBtn: { padding: '6px 14px', background: '#b8943d', color: '#fff', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer' },
  timeline: { position: 'relative', paddingLeft: 28 },
  timelineLine: { position: 'absolute', left: 10, top: 0, bottom: 0, width: 2, background: '#e5e7eb' },
  item: { position: 'relative', marginBottom: 20, paddingBottom: 20, borderBottom: '1px solid #f3f4f6' },
  dot: (color) => ({
    position: 'absolute', left: -24, top: 4, width: 14, height: 14, borderRadius: '50%',
    background: color, border: '2px solid #fff', boxShadow: '0 0 0 2px ' + color + '40',
  }),
  itemHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  itemType: (color) => ({ fontSize: 12, fontWeight: 600, color, textTransform: 'uppercase' }),
  itemTime: { fontSize: 11, color: '#9ca3af' },
  itemSubject: { fontSize: 14, fontWeight: 600, marginBottom: 4 },
  itemBody: { fontSize: 13, color: '#6b7280', lineHeight: 1.5 },
  itemMeta: { display: 'flex', gap: 12, marginTop: 6, fontSize: 11, color: '#9ca3af' },
  badge: (color) => ({ display: 'inline-block', padding: '1px 8px', borderRadius: 10, fontSize: 10, fontWeight: 600, background: color + '18', color }),
  form: { background: '#f9fafb', borderRadius: 8, padding: 16, marginBottom: 16 },
  input: { width: '100%', padding: '7px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13, marginBottom: 8, boxSizing: 'border-box' },
  select: { width: '100%', padding: '7px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13, marginBottom: 8, boxSizing: 'border-box', background: '#fff' },
  row: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 },
  label: { display: 'block', fontSize: 11, fontWeight: 600, color: '#374151', marginBottom: 2 },
};

export default function Activities({ entityType, entityId }) {
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState('all');
  const { data: activities, refetch } = useApi(`/api/activities?entity_type=${entityType}&entity_id=${entityId}`);

  const filtered = (activities || []).filter(a => filter === 'all' || a.type === filter);

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h3 style={styles.h3}>Activity Timeline</h3>
        <button style={styles.addBtn} onClick={() => setShowForm(!showForm)}>+ Log Activity</button>
      </div>

      {showForm && (
        <ActivityForm entityType={entityType} entityId={entityId}
          onSave={() => { refetch(); setShowForm(false); }} onCancel={() => setShowForm(false)} />
      )}

      <div style={{ display: 'flex', gap: 4, marginBottom: 16, flexWrap: 'wrap' }}>
        {[{ key: 'all', label: 'All' }, ...TYPES].map(t => (
          <button key={t.key} onClick={() => setFilter(t.key)}
            style={{ padding: '3px 10px', borderRadius: 12, border: 'none', fontSize: 11, fontWeight: 500, cursor: 'pointer',
              background: filter === t.key ? '#b8943d' : '#e5e7eb', color: filter === t.key ? '#fff' : '#374151' }}>
            {t.label}
          </button>
        ))}
      </div>

      <div style={styles.timeline}>
        <div style={styles.timelineLine} />
        {filtered.length === 0 && (
          <p style={{ color: '#9ca3af', fontSize: 13, paddingLeft: 8 }}>No activities yet.</p>
        )}
        {filtered.map(a => {
          const typeInfo = TYPES.find(t => t.key === a.type) || TYPES[3];
          return (
            <div key={a.id} style={styles.item}>
              <div style={styles.dot(typeInfo.color)} />
              <div style={styles.itemHeader}>
                <span style={styles.itemType(typeInfo.color)}>{typeInfo.icon} {typeInfo.label}</span>
                <span style={styles.itemTime}>{new Date(a.created_at).toLocaleString()}</span>
              </div>
              {a.subject && <div style={styles.itemSubject}>{a.subject}</div>}
              {a.body && <div style={styles.itemBody}>{a.body}</div>}
              <div style={styles.itemMeta}>
                {a.outcome && <span style={styles.badge(typeInfo.color)}>{a.outcome}</span>}
                {a.duration_mins && <span>{a.duration_mins} min</span>}
                {a.created_by_name && <span>by {a.created_by_name}</span>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ActivityForm({ entityType, entityId, onSave, onCancel }) {
  const [form, setForm] = useState({ type: 'note', subject: '', body: '', outcome: '', duration_mins: '' });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await apiPost('/api/activities', { ...form, entity_type: entityType, entity_id: entityId,
        duration_mins: form.duration_mins ? parseInt(form.duration_mins) : null });
      onSave();
    } catch (e) { alert(e.message); }
    finally { setSaving(false); }
  };

  return (
    <form style={styles.form} onSubmit={handleSubmit}>
      <div style={styles.row}>
        <div>
          <label style={styles.label}>Type</label>
          <select style={styles.select} value={form.type} onChange={e => set('type', e.target.value)}>
            {TYPES.filter(t => t.key !== 'stage_change' && t.key !== 'system').map(t => (
              <option key={t.key} value={t.key}>{t.icon} {t.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label style={styles.label}>Outcome</label>
          <select style={styles.select} value={form.outcome} onChange={e => set('outcome', e.target.value)}>
            <option value="">None</option>
            {OUTCOMES.map(o => <option key={o} value={o}>{o.replace(/_/g, ' ')}</option>)}
          </select>
        </div>
      </div>
      <label style={styles.label}>Subject</label>
      <input style={styles.input} value={form.subject} onChange={e => set('subject', e.target.value)} placeholder="Brief summary..." />
      <label style={styles.label}>Details</label>
      <textarea style={{ ...styles.input, height: 60, resize: 'vertical' }} value={form.body} onChange={e => set('body', e.target.value)} placeholder="Notes..." />
      <div style={styles.row}>
        <div>
          <label style={styles.label}>Duration (mins)</label>
          <input style={styles.input} type="number" value={form.duration_mins} onChange={e => set('duration_mins', e.target.value)} />
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'flex-end', paddingBottom: 8 }}>
          <button type="submit" style={{ ...styles.addBtn, opacity: saving ? 0.7 : 1 }} disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
          <button type="button" style={{ ...styles.addBtn, background: '#e5e7eb', color: '#374151' }} onClick={onCancel}>Cancel</button>
        </div>
      </div>
    </form>
  );
}
