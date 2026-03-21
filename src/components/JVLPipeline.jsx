import { useState } from 'react';
import { useApi, apiPost, apiPut } from '../hooks/useApi';

const STAGES = ['new', 'qualified', 'site_visit', 'proposal', 'closed', 'lost'];
const STAGE_LABELS = { new: 'New', qualified: 'Qualified', site_visit: 'Site Visit', proposal: 'Proposal', closed: 'Closed', lost: 'Lost' };
const STAGE_COLORS = { new: '#6366f1', qualified: '#0891b2', site_visit: '#d97706', proposal: '#7c3aed', closed: '#059669', lost: '#ef4444' };

const styles = {
  section: { background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' },
  title: { fontSize: 18, fontWeight: 600, margin: '0 0 16px', color: '#1a1a2e' },
  pipeline: { display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 8 },
  column: (color) => ({
    flex: '1 1 200px',
    minWidth: 200,
    background: '#f9fafb',
    borderRadius: 8,
    borderTop: `3px solid ${color}`,
    padding: 12,
  }),
  colTitle: { fontSize: 12, fontWeight: 600, margin: '0 0 8px', textTransform: 'uppercase' },
  card: {
    background: '#fff',
    borderRadius: 6,
    padding: 10,
    marginBottom: 8,
    boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
    fontSize: 13,
  },
  cardName: { fontWeight: 600, marginBottom: 4 },
  cardDetail: { fontSize: 11, color: '#6b7280' },
  btn: { padding: '6px 16px', background: '#4f46e5', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 500, marginBottom: 12 },
  form: { background: '#f9fafb', padding: 16, borderRadius: 8, marginBottom: 16 },
  input: { width: '100%', padding: '6px 10px', border: '1px solid #d1d5db', borderRadius: 4, fontSize: 13, marginBottom: 8, boxSizing: 'border-box' },
  moveBtn: { padding: '2px 8px', border: '1px solid #d1d5db', borderRadius: 4, cursor: 'pointer', fontSize: 10, background: '#fff', marginRight: 4 },
};

export default function JVLPipeline() {
  const { data: deals, refetch } = useApi('/api/jvl');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ business_name: '', contact: '', games: '', commission: '', notes: '' });

  const submit = async (e) => {
    e.preventDefault();
    await apiPost('/api/jvl', { ...form, games: parseInt(form.games) || 0, commission: parseFloat(form.commission) || 0 });
    setForm({ business_name: '', contact: '', games: '', commission: '', notes: '' });
    setShowForm(false);
    refetch();
  };

  const moveStage = async (deal, newStage) => {
    await apiPut(`/api/jvl/${deal.id}`, { ...deal, stage: newStage });
    refetch();
  };

  const list = deals || [];

  return (
    <div style={styles.section}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={styles.title}>JVL Sales Pipeline</h2>
        <button style={styles.btn} onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancel' : '+ Add Deal'}
        </button>
      </div>

      {showForm && (
        <form style={styles.form} onSubmit={submit}>
          <input style={styles.input} placeholder="Business name" value={form.business_name} onChange={e => setForm({ ...form, business_name: e.target.value })} required />
          <input style={styles.input} placeholder="Contact" value={form.contact} onChange={e => setForm({ ...form, contact: e.target.value })} />
          <div style={{ display: 'flex', gap: 8 }}>
            <input style={styles.input} type="number" placeholder="# Games" value={form.games} onChange={e => setForm({ ...form, games: e.target.value })} />
            <input style={styles.input} type="number" step="0.01" placeholder="Commission $" value={form.commission} onChange={e => setForm({ ...form, commission: e.target.value })} />
          </div>
          <input style={styles.input} placeholder="Notes" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
          <button type="submit" style={styles.btn}>Add Deal</button>
        </form>
      )}

      <div style={styles.pipeline}>
        {STAGES.map(stage => {
          const stageDeals = list.filter(d => d.stage === stage);
          const stageIdx = STAGES.indexOf(stage);
          return (
            <div key={stage} style={styles.column(STAGE_COLORS[stage])}>
              <p style={styles.colTitle}>{STAGE_LABELS[stage]} ({stageDeals.length})</p>
              {stageDeals.map(deal => (
                <div key={deal.id} style={styles.card}>
                  <div style={styles.cardName}>{deal.business_name}</div>
                  {deal.contact && <div style={styles.cardDetail}>{deal.contact}</div>}
                  {deal.games > 0 && <div style={styles.cardDetail}>{deal.games} games — ${deal.commission}</div>}
                  {deal.notes && <div style={styles.cardDetail}>{deal.notes}</div>}
                  <div style={{ marginTop: 6 }}>
                    {stageIdx > 0 && stage !== 'lost' && (
                      <button style={styles.moveBtn} onClick={() => moveStage(deal, STAGES[stageIdx - 1])}>← Back</button>
                    )}
                    {stageIdx < STAGES.length - 2 && (
                      <button style={styles.moveBtn} onClick={() => moveStage(deal, STAGES[stageIdx + 1])}>Next →</button>
                    )}
                    {stage !== 'closed' && stage !== 'lost' && (
                      <button style={{ ...styles.moveBtn, color: '#ef4444', borderColor: '#fca5a5' }} onClick={() => moveStage(deal, 'lost')}>Lost</button>
                    )}
                  </div>
                </div>
              ))}
              {stageDeals.length === 0 && (
                <div style={{ fontSize: 11, color: '#9ca3af', textAlign: 'center', padding: 12 }}>No deals</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
