import { useState } from 'react';
import { useApi, apiPost, apiPut, apiDelete } from '../hooks/useApi';
import { CountyBadge } from './Counties';
import { useToast } from './Toast';
import Skeleton from './Skeleton';

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
const PIPELINE = STAGES.filter(s => s.key !== 'lost' && s.key !== 'archived');
const STAGE_MAP = Object.fromEntries(STAGES.map(s => [s.key, s]));

const pipeIdx = (stage) => PIPELINE.findIndex(s => s.key === stage);
const nextStage = (stage) => { const i = pipeIdx(stage); return i >= 0 && i < PIPELINE.length - 1 ? PIPELINE[i + 1].key : null; };
const prevStage = (stage) => { const i = pipeIdx(stage); return i > 0 ? PIPELINE[i - 1].key : null; };

const st = {
  addBtn: { padding: '9px 18px', background: '#b8943d', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  viewToggle: (active) => ({
    padding: '7px 14px', borderRadius: 7, border: '1px solid #e5e7eb', cursor: 'pointer', fontSize: 12, fontWeight: 500,
    background: active ? '#0f172a' : '#fff', color: active ? '#fff' : '#6b7280', transition: 'all 0.15s',
  }),
  stats: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))', gap: 8, marginBottom: 20 },
  statCard: (color) => ({ background: color + '10', borderRadius: 8, padding: '10px 14px', textAlign: 'center', borderLeft: `3px solid ${color}` }),
  statNum: { fontSize: 20, fontWeight: 700 },
  statLabel: { fontSize: 10, color: '#6b7280', textTransform: 'uppercase' },
  modal: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modalCard: { background: '#fff', borderRadius: 12, padding: 28, width: 500, maxHeight: '85vh', overflow: 'auto' },
  input: { width: '100%', padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13, marginBottom: 12, boxSizing: 'border-box' },
  select: { width: '100%', padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13, marginBottom: 12, boxSizing: 'border-box', background: '#fff' },
  label: { display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 3 },
  formRow: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 },
  badge: (color) => ({ display: 'inline-block', padding: '2px 10px', borderRadius: 12, fontSize: 11, fontWeight: 600, background: color + '18', color }),
  th: { textAlign: 'left', padding: '10px 12px', borderBottom: '2px solid #e5e7eb', fontWeight: 600, color: '#374151', fontSize: 12 },
  td: { padding: '10px 12px', borderBottom: '1px solid #f3f4f6', verticalAlign: 'top' },
  actionBtn: (color) => ({ padding: '4px 10px', borderRadius: 5, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 600, background: color + '18', color, marginRight: 4 }),
};

/* ── Kanban card ── */
function KanbanCard({ lead, today, counties, onStageChange, onEdit, onLost }) {
  const stage = STAGE_MAP[lead.stage] || STAGE_MAP.prospect;
  const next = nextStage(lead.stage);
  const isFollowUpDue = lead.follow_up_date && lead.follow_up_date <= today;

  return (
    <div style={{
      background: '#fff', borderRadius: 10, padding: '12px 14px', marginBottom: 8,
      boxShadow: '0 1px 3px rgba(0,0,0,0.08)', cursor: 'default',
      borderTop: `3px solid ${stage.color}`,
    }}>
      <div style={{ fontWeight: 600, fontSize: 13, color: '#111827', marginBottom: 2 }}>{lead.name}</div>
      {lead.business_name && <div style={{ fontSize: 12, color: '#6b7280' }}>{lead.business_name}</div>}
      {lead.city && <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 3 }}>{lead.city}{lead.state && lead.state !== 'TX' ? `, ${lead.state}` : ''}</div>}
      {lead.county && (
        <div style={{ marginTop: 5 }}>
          <CountyBadge county={lead.county} state={lead.state} counties={counties || []} />
        </div>
      )}
      <div style={{ display: 'flex', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
        {lead.num_games && <span style={{ fontSize: 11, color: '#6b7280' }}>🎮 {lead.num_games} games</span>}
        {lead.revenue_split && (
          <span style={{
            fontSize: 11, fontWeight: 700,
            color: lead.revenue_split === '60/40' ? '#059669' : lead.revenue_split === '40/60' ? '#7c3aed' : '#f59e0b',
          }}>{lead.revenue_split}</span>
        )}
        {lead.game_type && <span style={{ fontSize: 11, color: '#9ca3af' }}>{lead.game_type}</span>}
      </div>
      {lead.follow_up_date && (
        <div style={{ fontSize: 11, color: isFollowUpDue ? '#ef4444' : '#9ca3af', marginTop: 4, fontWeight: isFollowUpDue ? 600 : 400 }}>
          {isFollowUpDue ? '⚠️ Follow up: ' : '📅 '}{lead.follow_up_date}
        </div>
      )}
      <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
        {next && (
          <button onClick={() => onStageChange(lead, next)} style={{
            flex: 1, padding: '6px 0', borderRadius: 6, border: 'none', cursor: 'pointer',
            fontSize: 12, fontWeight: 600, background: stage.color, color: '#fff', whiteSpace: 'nowrap',
          }}>
            → {STAGE_MAP[next]?.label}
          </button>
        )}
        <button onClick={() => onEdit(lead)} style={{
          padding: '6px 10px', borderRadius: 6, border: '1px solid #e5e7eb', cursor: 'pointer',
          fontSize: 12, fontWeight: 500, background: '#fff', color: '#374151',
        }}>Edit</button>
        {lead.stage !== 'lost' && lead.stage !== 'live' && (
          <button onClick={() => onLost(lead)} style={{
            padding: '6px 10px', borderRadius: 6, border: 'none', cursor: 'pointer',
            fontSize: 12, fontWeight: 500, background: '#fef2f2', color: '#ef4444',
          }}>Lost</button>
        )}
      </div>
    </div>
  );
}

export default function Leads({ user }) {
  const isAdmin = user?.role === 'admin';
  if (!isAdmin) return <SimpleLeadsView user={user} />;
  const [view, setView] = useState('kanban');
  const [tableFilter, setTableFilter] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [editLead, setEditLead] = useState(null);
  const { data: leads, loading, refetch } = useApi('/api/leads');
  const { data: users } = useApi(isAdmin ? '/api/auth/users' : null);
  const { data: summary, refetch: refetchSummary } = useApi('/api/leads/summary');
  const { data: counties } = useApi('/api/counties');
  const toast = useToast();

  const today = new Date().toISOString().split('T')[0];

  const refresh = () => { refetch(); refetchSummary(); };

  const handleStageChange = async (lead, newStage) => {
    const prevStageLabel = STAGE_MAP[lead.stage]?.label || lead.stage;
    const newStageLabel = STAGE_MAP[newStage]?.label || newStage;
    await apiPut(`/api/leads/${lead.id}`, { stage: newStage });
    refresh();
    if (newStage === 'lost') toast(`${lead.name} marked as Lost`, 'error');
    else toast(`${lead.name} moved to ${newStageLabel}`, 'success');
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this lead?')) return;
    await apiDelete(`/api/leads/${id}`);
    refresh();
  };

  const activeLead = (leads || []).filter(l => l.stage !== 'archived');

  return (
    <div>
      {/* Stats */}
      {summary && (
        <div style={st.stats}>
          {STAGES.filter(s => s.key !== 'lost' && s.key !== 'archived').map(s => (
            <div key={s.key} style={st.statCard(s.color)}>
              <div style={{ ...st.statNum, color: s.color }}>{summary[s.key] || 0}</div>
              <div style={st.statLabel}>{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>Leads Pipeline</h2>
          <span style={{ fontSize: 13, color: '#9ca3af' }}>({activeLead.length})</span>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: 2, background: '#f3f4f6', borderRadius: 8, padding: 3 }}>
            <button style={st.viewToggle(view === 'kanban')} onClick={() => setView('kanban')}>
              ⊞ Pipeline
            </button>
            <button style={st.viewToggle(view === 'table')} onClick={() => setView('table')}>
              ≡ List
            </button>
          </div>
          <button style={st.addBtn} onClick={() => { setEditLead(null); setShowForm(true); }}>+ Add Lead</button>
        </div>
      </div>

      {/* ── Kanban View ── */}
      {view === 'kanban' && (
        <div style={{ overflowX: 'auto', paddingBottom: 12 }}>
          <div style={{ display: 'flex', gap: 12, minWidth: 'max-content' }}>
            {PIPELINE.map(stage => {
              const col = activeLead.filter(l => l.stage === stage.key);
              return (
                <div key={stage.key} style={{ width: 220, flexShrink: 0 }}>
                  {/* Column header */}
                  <div style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '8px 12px', borderRadius: 8, marginBottom: 10,
                    background: stage.color + '12', borderBottom: `2px solid ${stage.color}`,
                  }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: stage.color }}>{stage.label}</span>
                    <span style={{
                      fontSize: 11, fontWeight: 700, minWidth: 20, height: 20, borderRadius: 10,
                      background: stage.color, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>{col.length}</span>
                  </div>
                  {/* Cards */}
                  <div style={{ maxHeight: 'calc(100vh - 320px)', overflowY: 'auto', paddingRight: 2 }}>
                    {col.map(lead => (
                      <KanbanCard
                        key={lead.id}
                        lead={lead}
                        today={today}
                        counties={counties}
                        onStageChange={handleStageChange}
                        onEdit={(l) => { setEditLead(l); setShowForm(true); }}
                        onLost={(l) => handleStageChange(l, 'lost')}
                      />
                    ))}
                    {col.length === 0 && (
                      <div style={{ fontSize: 12, color: '#d1d5db', textAlign: 'center', padding: '20px 0' }}>Empty</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Table View ── */}
      {view === 'table' && (
        <div style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
          {/* Filter pills */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
            <button style={st.actionBtn(tableFilter === 'all' ? '#b8943d' : '#6b7280')} onClick={() => setTableFilter('all')}>
              All ({activeLead.length})
            </button>
            {STAGES.map(s => {
              const cnt = (leads || []).filter(l => l.stage === s.key).length;
              return cnt > 0 ? (
                <button key={s.key} style={st.actionBtn(tableFilter === s.key ? s.color : '#6b7280')} onClick={() => setTableFilter(s.key)}>
                  {s.label} ({cnt})
                </button>
              ) : null;
            })}
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr>
                  <th style={st.th}>Name / Business</th>
                  <th style={st.th}>Contact</th>
                  <th style={st.th}>City</th>
                  <th style={st.th}>County</th>
                  <th style={st.th}>Stage</th>
                  <th style={st.th}>Follow Up</th>
                  <th style={st.th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {(leads || []).filter(l => tableFilter === 'all' ? l.stage !== 'archived' : l.stage === tableFilter).map(lead => {
                  const stage = STAGE_MAP[lead.stage] || STAGE_MAP.prospect;
                  const next = nextStage(lead.stage);
                  const prev = prevStage(lead.stage);
                  return (
                    <tr key={lead.id}>
                      <td style={st.td}>
                        <div style={{ fontWeight: 600 }}>{lead.name}</div>
                        {lead.business_name && <div style={{ fontSize: 11, color: '#6b7280' }}>{lead.business_name}</div>}
                      </td>
                      <td style={st.td}>
                        <div>{lead.phone}</div>
                        <div style={{ fontSize: 11, color: '#6b7280' }}>{lead.email}</div>
                      </td>
                      <td style={st.td}>{lead.city}{lead.state && lead.state !== 'TX' ? `, ${lead.state}` : ''}</td>
                      <td style={st.td}>
                        {lead.county
                          ? <CountyBadge county={lead.county} state={lead.state} counties={counties || []} />
                          : <span style={{ fontSize: 11, color: '#d1d5db' }}>—</span>}
                      </td>
                      <td style={st.td}><span style={st.badge(stage.color)}>{stage.label}</span></td>
                      <td style={{ ...st.td, color: lead.follow_up_date && lead.follow_up_date <= today ? '#ef4444' : '#374151' }}>
                        {lead.follow_up_date || '—'}
                      </td>
                      <td style={st.td}>
                        {prev && <button style={st.actionBtn('#6b7280')} onClick={() => handleStageChange(lead, prev)}>← Back</button>}
                        {next && <button style={st.actionBtn('#b8943d')} onClick={() => handleStageChange(lead, next)}>→ Next</button>}
                        <button style={st.actionBtn('#f59e0b')} onClick={() => { setEditLead(lead); setShowForm(true); }}>Edit</button>
                        {lead.stage !== 'lost' && lead.stage !== 'live' && lead.stage !== 'archived' && (
                          <button style={st.actionBtn('#ef4444')} onClick={() => handleStageChange(lead, 'lost')}>Lost</button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showForm && (
        <LeadForm
          lead={editLead}
          users={users || []}
          counties={counties || []}
          onClose={() => { setShowForm(false); setEditLead(null); }}
          onSave={refresh}
        />
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════
   Activity Timeline per lead
   ═══════════════════════════════════════════════ */
function ActivityTimeline({ leadId }) {
  const [open, setOpen] = useState(false);
  const { data: activities, loading } = useApi(open ? `/api/activities?entity_type=lead&entity_id=${leadId}` : null);

  const fmt = (ts) => {
    if (!ts) return '';
    const d = new Date(ts);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' · ' +
      d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  };

  const TYPE_ICONS = {
    note: '📝', stage_change: '→', follow_up: '📅',
    call: '📞', email: '✉', created: '✨',
  };

  return (
    <div style={{ marginTop: 10 }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: 'none',
          cursor: 'pointer', color: '#9ca3af', fontSize: 12, fontWeight: 500, padding: '2px 0',
        }}
      >
        <span style={{ transform: open ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s', display: 'inline-block' }}>▶</span>
        Activity
      </button>
      {open && (
        <div style={{ marginTop: 8, borderLeft: '2px solid #e5e7eb', paddingLeft: 14 }}>
          {loading ? (
            <Skeleton count={3} height={14} gap={8} />
          ) : (activities || []).length === 0 ? (
            <div style={{ fontSize: 12, color: '#d1d5db', padding: '4px 0' }}>No activity recorded yet.</div>
          ) : (
            [...(activities || [])].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).map((act, i) => (
              <div key={act.id || i} style={{ marginBottom: 10, position: 'relative' }}>
                <div style={{
                  position: 'absolute', left: -19, top: 2,
                  width: 8, height: 8, borderRadius: '50%', background: '#b8943d', border: '2px solid #fff',
                }} />
                <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 2 }}>{fmt(act.created_at)}</div>
                <div style={{ fontSize: 12, color: '#374151', lineHeight: 1.4 }}>
                  <span style={{ marginRight: 5 }}>{TYPE_ICONS[act.activity_type] || '•'}</span>
                  {act.description || act.activity_type}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════
   Simple Team View — call list + quick actions
   ═══════════════════════════════════════════════ */
function SimpleLeadsView({ user }) {
  const { data: leads, loading, refetch } = useApi('/api/leads');
  const [showNotes, setShowNotes] = useState(null);
  const [noteText, setNoteText] = useState('');
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  const today = new Date().toISOString().split('T')[0];

  // Split into actionable groups
  const myLeads = (leads || []).filter(l => l.stage !== 'lost' && l.stage !== 'archived' && l.stage !== 'live');
  const followUps = myLeads.filter(l => l.follow_up_date && l.follow_up_date <= today);
  const newProspects = myLeads.filter(l => l.stage === 'prospect');
  const inProgress = myLeads.filter(l => l.stage !== 'prospect' && (!l.follow_up_date || l.follow_up_date > today));
  const won = (leads || []).filter(l => l.stage === 'live');

  const advanceLead = async (lead) => {
    const next = nextStage(lead.stage);
    if (!next) return;
    await apiPut(`/api/leads/${lead.id}`, { stage: next });
    refetch();
    toast(`${lead.name} moved to ${STAGE_MAP[next]?.label}`, 'success');
  };

  const markLost = async (lead) => {
    await apiPut(`/api/leads/${lead.id}`, { stage: 'lost' });
    refetch();
    toast(`${lead.name} marked as Lost`, 'error');
  };

  const setFollowUp = async (lead, days) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    const dateStr = d.toISOString().split('T')[0];
    await apiPut(`/api/leads/${lead.id}`, { follow_up_date: dateStr });
    refetch();
    const label = days === 1 ? 'tomorrow' : days === 3 ? 'in 3 days' : 'next week';
    toast(`Follow-up set for ${label}`, 'info');
  };

  const saveNote = async (lead) => {
    if (!noteText.trim()) return;
    setSaving(true);
    const existingNotes = lead.notes || '';
    const stamp = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const updated = `[${stamp}] ${noteText.trim()}${existingNotes ? '\n' + existingNotes : ''}`;
    try {
      await apiPut(`/api/leads/${lead.id}`, { notes: updated });
      // Also post to activity log
      try {
        await apiPost('/api/activities', {
          entity_type: 'lead',
          entity_id: lead.id,
          activity_type: 'note',
          description: noteText.trim(),
        });
      } catch (_) { /* activities endpoint optional */ }
      setNoteText('');
      setShowNotes(null);
      refetch();
      toast('Note saved', 'success');
    } catch (e) {
      toast('Failed to save note', 'error');
    } finally {
      setSaving(false);
    }
  };

  const LeadCard = ({ lead, urgent }) => {
    const stage = STAGE_MAP[lead.stage] || STAGE_MAP.prospect;
    const next = nextStage(lead.stage);
    const isOverdue = lead.follow_up_date && lead.follow_up_date < today;
    const isNotesOpen = showNotes === lead.id;

    return (
      <div className="lead-card" style={{
        background: '#fff', borderRadius: 12, padding: '16px 18px', marginBottom: 10,
        boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
        borderLeft: `4px solid ${urgent ? '#ef4444' : stage.color}`,
      }}>
        {/* Name + business */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, color: '#111827' }}>{lead.name}</div>
            {lead.business_name && <div style={{ fontSize: 13, color: '#6b7280' }}>{lead.business_name}</div>}
            {lead.city && <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>{lead.city}{lead.state && lead.state !== 'TX' ? `, ${lead.state}` : ''}</div>}
          </div>
          <span style={{
            padding: '3px 10px', borderRadius: 10, fontSize: 11, fontWeight: 600,
            background: stage.color + '18', color: stage.color,
          }}>{stage.label}</span>
        </div>

        {/* Follow up warning */}
        {lead.follow_up_date && (
          <div style={{
            fontSize: 12, marginBottom: 8, fontWeight: isOverdue ? 700 : 400,
            color: isOverdue ? '#ef4444' : '#6b7280',
          }}>
            {isOverdue ? 'OVERDUE — ' : 'Follow up: '}{lead.follow_up_date}
          </div>
        )}

        {/* Contact buttons */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
          {lead.phone && (
            <a href={`tel:${lead.phone}`} style={{
              padding: '8px 16px', borderRadius: 8, background: '#059669', color: '#fff',
              fontSize: 13, fontWeight: 600, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6,
              minHeight: 44,
            }}>
              📞 Call {lead.phone}
            </a>
          )}
          {lead.phone && (
            <a href={`sms:${lead.phone}`} style={{
              padding: '8px 16px', borderRadius: 8, background: '#3b82f6', color: '#fff',
              fontSize: 13, fontWeight: 600, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6,
              minHeight: 44,
            }}>
              💬 Text
            </a>
          )}
          {lead.email && (
            <a href={`mailto:${lead.email}`} style={{
              padding: '8px 14px', borderRadius: 8, background: '#f3f4f6', color: '#374151',
              fontSize: 13, fontWeight: 500, textDecoration: 'none', display: 'flex', alignItems: 'center',
              minHeight: 44,
            }}>
              ✉ Email
            </a>
          )}
        </div>

        {/* Quick actions */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {next && (
            <button onClick={() => advanceLead(lead)} style={{
              padding: '7px 14px', borderRadius: 7, border: 'none', cursor: 'pointer',
              fontSize: 12, fontWeight: 600, background: '#b8943d', color: '#fff', minHeight: 36,
            }}>
              ✓ Move to {STAGE_MAP[next]?.label}
            </button>
          )}
          <button onClick={() => setFollowUp(lead, 1)} style={{
            padding: '7px 12px', borderRadius: 7, border: '1px solid #e5e7eb', cursor: 'pointer',
            fontSize: 12, fontWeight: 500, background: '#fff', color: '#374151', minHeight: 36,
          }}>Tomorrow</button>
          <button onClick={() => setFollowUp(lead, 3)} style={{
            padding: '7px 12px', borderRadius: 7, border: '1px solid #e5e7eb', cursor: 'pointer',
            fontSize: 12, fontWeight: 500, background: '#fff', color: '#374151', minHeight: 36,
          }}>In 3 Days</button>
          <button onClick={() => setFollowUp(lead, 7)} style={{
            padding: '7px 12px', borderRadius: 7, border: '1px solid #e5e7eb', cursor: 'pointer',
            fontSize: 12, fontWeight: 500, background: '#fff', color: '#374151', minHeight: 36,
          }}>Next Week</button>
          <button onClick={() => { setShowNotes(isNotesOpen ? null : lead.id); setNoteText(''); }} style={{
            padding: '7px 12px', borderRadius: 7, border: '1px solid #e5e7eb', cursor: 'pointer',
            fontSize: 12, fontWeight: 500, background: isNotesOpen ? '#0f172a' : '#fff', color: isNotesOpen ? '#fff' : '#374151',
            minHeight: 36,
          }}>📝 Note</button>
          <button onClick={() => markLost(lead)} style={{
            padding: '7px 12px', borderRadius: 7, border: 'none', cursor: 'pointer',
            fontSize: 12, fontWeight: 500, background: '#fef2f2', color: '#ef4444', minHeight: 36,
          }}>✕ Lost</button>
        </div>

        {/* Notes input */}
        {isNotesOpen && (
          <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
            <input
              value={noteText}
              onChange={e => setNoteText(e.target.value)}
              placeholder="What happened? (called, voicemail, scheduled visit...)"
              style={{
                flex: 1, padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 8,
                fontSize: 13, outline: 'none',
              }}
              autoFocus
              onKeyDown={e => e.key === 'Enter' && saveNote(lead)}
            />
            <button onClick={() => saveNote(lead)} disabled={saving} style={{
              padding: '8px 16px', borderRadius: 8, border: 'none', cursor: 'pointer',
              fontSize: 13, fontWeight: 600, background: '#b8943d', color: '#fff',
              opacity: saving ? 0.7 : 1, minHeight: 44,
            }}>{saving ? '...' : 'Save'}</button>
          </div>
        )}

        {/* Existing notes preview */}
        {lead.notes && !isNotesOpen && (
          <div style={{
            marginTop: 8, padding: '8px 12px', borderRadius: 8, background: '#f9fafb',
            fontSize: 12, color: '#6b7280', whiteSpace: 'pre-line',
            maxHeight: 60, overflow: 'hidden',
          }}>{lead.notes}</div>
        )}

        {/* Activity timeline */}
        <ActivityTimeline leadId={lead.id} />
      </div>
    );
  };

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ margin: '0 0 4px', fontSize: 20, fontWeight: 700 }}>My Leads</h2>
        <p style={{ margin: 0, fontSize: 13, color: '#9ca3af' }}>
          Call, text, or email each lead. Log what happened. Move them forward.
        </p>
      </div>

      {/* Quick stats */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        {[
          { n: followUps.length, label: 'Due Today', color: '#ef4444' },
          { n: newProspects.length, label: 'New Prospects', color: '#b8943d' },
          { n: inProgress.length, label: 'In Progress', color: '#3b82f6' },
          { n: won.length, label: 'Won', color: '#059669' },
        ].map(s => (
          <div key={s.label} style={{
            background: '#fff', borderRadius: 10, padding: '12px 18px', minWidth: 100,
            borderLeft: `3px solid ${s.color}`, boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
          }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: s.color }}>{s.n}</div>
            <div style={{ fontSize: 11, color: '#6b7280', fontWeight: 500 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Loading skeleton */}
      {loading && (
        <div>
          <Skeleton variant="card" style={{ marginBottom: 10 }} />
          <Skeleton variant="card" style={{ marginBottom: 10 }} />
          <Skeleton variant="card" />
        </div>
      )}

      {/* Due Today / Overdue */}
      {!loading && followUps.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: '#ef4444', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
            🔥 Needs Attention ({followUps.length})
          </h3>
          {followUps.map(l => <LeadCard key={l.id} lead={l} urgent />)}
        </div>
      )}

      {/* New Prospects */}
      {!loading && newProspects.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: '#111827', marginBottom: 10 }}>
            New Prospects ({newProspects.length})
          </h3>
          {newProspects.map(l => <LeadCard key={l.id} lead={l} />)}
        </div>
      )}

      {/* In Progress */}
      {!loading && inProgress.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: '#111827', marginBottom: 10 }}>
            In Progress ({inProgress.length})
          </h3>
          {inProgress.map(l => <LeadCard key={l.id} lead={l} />)}
        </div>
      )}

      {/* Empty state — coaching-oriented */}
      {!loading && myLeads.length === 0 && (
        <div style={{
          background: '#fff', borderRadius: 16, padding: '60px 32px',
          textAlign: 'center', boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
        }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🎯</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#111827', marginBottom: 8 }}>
            No leads assigned yet
          </div>
          <div style={{ fontSize: 14, color: '#6b7280', maxWidth: 340, margin: '0 auto 24px', lineHeight: 1.6 }}>
            Every deal starts with a conversation. Once leads are assigned to you, they'll appear here — ready to call, move through the pipeline, and close.
          </div>
          <div style={{
            display: 'inline-flex', flexDirection: 'column', gap: 10, textAlign: 'left',
            background: '#f8fafc', borderRadius: 12, padding: '16px 20px',
            border: '1px solid #e5e7eb',
          }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 4 }}>Your workflow, once leads arrive:</div>
            {[
              '1. Call or text the lead directly from this screen',
              '2. Log a note after every touch',
              '3. Move them forward to the next stage',
              '4. Set a follow-up date so nothing falls through',
            ].map(step => (
              <div key={step} style={{ fontSize: 13, color: '#6b7280', display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                <span style={{ color: '#b8943d', fontWeight: 700, flexShrink: 0 }}>→</span>
                {step.slice(3)}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function LeadForm({ lead, users, counties, onClose, onSave }) {
  const [form, setForm] = useState({
    name: lead?.name || '', email: lead?.email || '', phone: lead?.phone || '',
    business_name: lead?.business_name || '', business_type: lead?.business_type || '',
    address: lead?.address || '',
    city: lead?.city || '', state: lead?.state || 'TX', county: lead?.county || '',
    interest: lead?.interest || '',
    brand_preference: lead?.brand_preference || '',
    machines_wanted: lead?.machines_wanted || '',
    num_games: lead?.num_games || '', num_kiosks: lead?.num_kiosks || '',
    game_type: lead?.game_type || '',
    revenue_split: lead?.revenue_split || '',
    lead_type: lead?.lead_type || 'house',
    notes: lead?.notes || '', stage: lead?.stage || 'prospect',
    assigned_to: lead?.assigned_to || '', follow_up_date: lead?.follow_up_date || '',
  });
  const countyStatus = (counties || []).find(c => c.name.toLowerCase() === form.county.toLowerCase() && c.state.toLowerCase() === form.state.toLowerCase());
  const countyStatusColor = countyStatus ? { approved: '#16a34a', restricted: '#dc2626', unknown: '#92400e' }[countyStatus.status] : null;
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (lead) await apiPut(`/api/leads/${lead.id}`, form);
      else await apiPost('/api/leads', form);
      onSave(); onClose();
    } catch (e) { alert(e.message); }
    finally { setSaving(false); }
  };

  return (
    <div style={st.modal} onClick={onClose}>
      <form style={st.modalCard} onClick={e => e.stopPropagation()} onSubmit={handleSave}>
        <h3 style={{ margin: '0 0 20px', fontSize: 18 }}>{lead ? 'Edit Lead' : 'Add Lead'}</h3>
        <div style={st.formRow}>
          <div><label style={st.label}>Name *</label><input style={st.input} value={form.name} onChange={e => set('name', e.target.value)} required /></div>
          <div><label style={st.label}>Phone</label><input style={st.input} value={form.phone} onChange={e => set('phone', e.target.value)} /></div>
        </div>
        <div style={st.formRow}>
          <div><label style={st.label}>Email</label><input style={st.input} value={form.email} onChange={e => set('email', e.target.value)} /></div>
          <div><label style={st.label}>Business Name</label><input style={st.input} value={form.business_name} onChange={e => set('business_name', e.target.value)} /></div>
        </div>
        <div style={st.formRow}>
          <div>
            <label style={st.label}>Business Type</label>
            <select style={st.select} value={form.business_type} onChange={e => set('business_type', e.target.value)}>
              <option value="">Select...</option>
              <option>Bar</option><option>Restaurant</option><option>Convenience Store</option>
              <option>Game Room</option><option>Truck Stop</option><option>Gas Station</option>
              <option>Hotel</option><option>Other</option>
            </select>
          </div>
          <div><label style={st.label}>City</label><input style={st.input} value={form.city} onChange={e => set('city', e.target.value)} /></div>
        </div>
        <div style={st.formRow}>
          <div>
            <label style={st.label}>County</label>
            <div style={{ position: 'relative' }}>
              <input
                style={{ ...st.input, marginBottom: countyStatus ? 4 : 12, paddingRight: countyStatus ? 90 : undefined }}
                value={form.county}
                onChange={e => set('county', e.target.value)}
                placeholder="e.g. Nueces"
                list="county-list"
              />
              <datalist id="county-list">
                {(counties || []).map(c => <option key={c.id} value={c.name} />)}
              </datalist>
              {countyStatus && (
                <span style={{
                  position: 'absolute', right: 10, top: 9, fontSize: 11, fontWeight: 700,
                  color: countyStatusColor, pointerEvents: 'none',
                }}>
                  {{ approved: '● Approved', restricted: '● Restricted', unknown: '● Unknown' }[countyStatus.status]}
                </span>
              )}
            </div>
            {countyStatus && countyStatus.regulations && (
              <div style={{ fontSize: 11, color: countyStatusColor, marginBottom: 8 }}>{countyStatus.regulations}</div>
            )}
            {form.county && !countyStatus && (
              <div style={{ fontSize: 11, color: '#f59e0b', marginBottom: 8 }}>⚠ County not yet researched — verify before proceeding</div>
            )}
          </div>
          <div><label style={st.label}>State</label><input style={st.input} value={form.state} onChange={e => set('state', e.target.value)} placeholder="TX" /></div>
        </div>
        <div style={st.formRow}>
          <div>
            <label style={st.label}>Interest</label>
            <select style={st.select} value={form.interest} onChange={e => set('interest', e.target.value)}>
              <option value="">Select...</option>
              <option>Revenue Share</option><option>Buy JVL</option><option>Online Gaming</option><option>General Question</option>
            </select>
          </div>
          <div>
            <label style={st.label}>Brand Preference</label>
            <select style={st.select} value={form.brand_preference} onChange={e => set('brand_preference', e.target.value)}>
              <option value="">No Preference</option>
              <option>Banilla</option><option>JVL</option><option>Primero</option><option>Multiple</option>
            </select>
          </div>
        </div>
        <label style={st.label}>Full Address</label>
        <input style={st.input} value={form.address} onChange={e => set('address', e.target.value)} placeholder="123 Main St, City, TX 75001" />

        <div style={st.formRow}>
          <div>
            <label style={st.label}>Revenue Split (Us / Them)</label>
            <select style={st.select} value={form.revenue_split} onChange={e => set('revenue_split', e.target.value)}>
              <option value="">TBD</option>
              <option value="60/40">60/40 — We fill</option>
              <option value="40/60">40/60 — They fill</option>
              <option value="50/50">50/50 — Needs Rich approval</option>
            </select>
          </div>
          <div>
            <label style={st.label}>Lead Type</label>
            <select style={st.select} value={form.lead_type} onChange={e => set('lead_type', e.target.value)}>
              <option value="house">House Lead</option>
              <option value="organic">Organic Lead</option>
            </select>
          </div>
        </div>

        <div style={st.formRow}>
          <div>
            <label style={st.label}># of Games</label>
            <input style={st.input} type="number" min="1" value={form.num_games} onChange={e => set('num_games', e.target.value)} placeholder="e.g. 5" />
          </div>
          <div>
            <label style={st.label}># of Kiosks</label>
            <input style={st.input} type="number" min="0" value={form.num_kiosks} onChange={e => set('num_kiosks', e.target.value)} placeholder="e.g. 1" />
          </div>
        </div>

        <div style={st.formRow}>
          <div>
            <label style={st.label}>Game Type</label>
            <select style={st.select} value={form.game_type} onChange={e => set('game_type', e.target.value)}>
              <option value="">Not Sure</option>
              <option value="Games">Games Only</option>
              <option value="both">Games + JVL/Kiosk</option>
              <option value="JVL">JVL Only</option>
            </select>
          </div>
          <div>
            <label style={st.label}>Stage</label>
            <select style={st.select} value={form.stage} onChange={e => set('stage', e.target.value)}>
              {STAGES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
            </select>
          </div>
        </div>

        <div style={st.formRow}>
          <div>
            <label style={st.label}>Assigned To</label>
            <select style={st.select} value={form.assigned_to} onChange={e => set('assigned_to', e.target.value ? Number(e.target.value) : '')}>
              <option value="">Unassigned</option>
              {users.filter(u => u.active).map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          </div>
          <div><label style={st.label}>Follow Up Date</label><input style={st.input} type="date" value={form.follow_up_date} onChange={e => set('follow_up_date', e.target.value)} /></div>
        </div>
        <label style={st.label}>Notes</label>
        <textarea style={{ ...st.input, height: 60, resize: 'vertical' }} value={form.notes} onChange={e => set('notes', e.target.value)} />
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
          <button type="button" style={{ ...st.addBtn, background: '#e5e7eb', color: '#374151' }} onClick={onClose}>Cancel</button>
          <button style={{ ...st.addBtn, opacity: saving ? 0.7 : 1 }} disabled={saving}>{saving ? 'Saving...' : 'Save Lead'}</button>
        </div>
      </form>
    </div>
  );
}
