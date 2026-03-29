import { useState } from 'react';
import { useApi, apiPost, apiPut } from '../hooks/useApi';

const ACTIVITY_TYPES = [
  { key: 'call', label: 'Call', icon: '📞', color: '#3b82f6' },
  { key: 'note', label: 'Note', icon: '📝', color: '#6b7280' },
  { key: 'email', label: 'Email', icon: '✉️', color: '#8b5cf6' },
  { key: 'visit', label: 'Site Visit', icon: '📍', color: '#f59e0b' },
  { key: 'text', label: 'Text', icon: '💬', color: '#10b981' },
];

const OUTCOMES = ['Left voicemail', 'Spoke with owner', 'No answer', 'Interested', 'Not interested', 'Follow-up scheduled', 'Contract discussed'];

const TYPE_META = {
  stage_change: { icon: '🔄', color: '#4b5563', label: 'Stage Change' },
  approval: { icon: '✅', color: '#059669', label: 'Approval' },
  call: { icon: '📞', color: '#3b82f6', label: 'Call' },
  note: { icon: '📝', color: '#6b7280', label: 'Note' },
  email: { icon: '✉️', color: '#8b5cf6', label: 'Email' },
  visit: { icon: '📍', color: '#f59e0b', label: 'Site Visit' },
  text: { icon: '💬', color: '#10b981', label: 'Text' },
};

const STAGE_LABELS = {
  prospect: 'Prospect', initial_contact: 'Initial Contact', site_visit_scheduled: 'Site Visit Scheduled',
  site_qualified: 'Site Qualified', proposal_sent: 'Proposal Sent', agreement_signed: 'Agreement Signed',
  licensing: 'Licensing', install_scheduled: 'Install Scheduled', live: 'Live', lost: 'Lost', archived: 'Archived',
};

function fmtDate(str) {
  if (!str) return '';
  const d = new Date(str);
  if (isNaN(d)) return str;
  const now = new Date();
  const diffMs = now - d;
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffDays === 0) return 'Today ' + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: diffDays > 365 ? 'numeric' : undefined });
}

export default function LeadDrawer({ lead, isAdmin, onClose, onUpdate }) {
  const { data: activities, refetch: refetchActivities } = useApi(
    lead ? `/api/activities?entity_type=lead&entity_id=${lead.id}` : null
  );

  const [logType, setLogType] = useState('call');
  const [logSubject, setLogSubject] = useState('');
  const [logBody, setLogBody] = useState('');
  const [logOutcome, setLogOutcome] = useState('');
  const [logDuration, setLogDuration] = useState('');
  const [logging, setLogging] = useState(false);
  const [showLogForm, setShowLogForm] = useState(false);

  const [approvalNotes, setApprovalNotes] = useState('');
  const [approving, setApproving] = useState(false);
  const [showApprovalForm, setShowApprovalForm] = useState(false);

  if (!lead) return null;

  const needsApproval = lead.approval_status === 'pending';
  const isApproved = lead.approval_status === 'approved';
  const isRejected = lead.approval_status === 'rejected';

  const handleLogActivity = async (e) => {
    e.preventDefault();
    setLogging(true);
    try {
      await apiPost('/api/activities', {
        entity_type: 'lead', entity_id: lead.id,
        type: logType,
        subject: logSubject || ACTIVITY_TYPES.find(t => t.key === logType)?.label,
        body: logBody,
        outcome: logOutcome,
        duration_mins: logDuration ? parseInt(logDuration) : null,
      });
      setLogSubject(''); setLogBody(''); setLogOutcome(''); setLogDuration('');
      setShowLogForm(false);
      refetchActivities();
      onUpdate?.();
    } finally { setLogging(false); }
  };

  const handleApprove = async () => {
    setApproving(true);
    try {
      await apiPost(`/api/leads/${lead.id}/approve`, { notes: approvalNotes });
      setApprovalNotes(''); setShowApprovalForm(false);
      onUpdate?.();
    } finally { setApproving(false); }
  };

  const handleReject = async () => {
    if (!approvalNotes) { alert('Please add a reason for rejection.'); return; }
    setApproving(true);
    try {
      await apiPost(`/api/leads/${lead.id}/reject`, { notes: approvalNotes });
      setApprovalNotes(''); setShowApprovalForm(false);
      onUpdate?.();
    } finally { setApproving(false); }
  };

  const openContract = () => {
    window.open(`/api/contract/${lead.id}`, '_blank');
  };

  return (
    <>
      {/* Backdrop */}
      <div onClick={onClose} style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 200,
      }} />

      {/* Drawer */}
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0,
        width: 'min(480px, 100vw)',
        background: '#fff', zIndex: 201, display: 'flex', flexDirection: 'column',
        boxShadow: '-8px 0 32px rgba(0,0,0,0.12)',
      }}>

        {/* Header */}
        <div style={{ padding: '16px 16px 14px', borderBottom: '1px solid #f1f5f9', flexShrink: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#111827' }}>{lead.name}</div>
              {lead.business_name && <div style={{ fontSize: 13, color: '#6b7280', marginTop: 2 }}>{lead.business_name}</div>}
              <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 4 }}>
                {lead.city}{lead.city && lead.state ? ', ' : ''}{lead.state}
                {lead.county ? ` · ${lead.county} County` : ''}
              </div>
            </div>
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: '#9ca3af', padding: 4, lineHeight: 1 }}>✕</button>
          </div>

          {/* Quick info chips */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 12 }}>
            <Chip label={STAGE_LABELS[lead.stage] || lead.stage} color="#4b5563" />
            {lead.revenue_split && <Chip label={lead.revenue_split + ' split'} color="#b8943d" />}
            {lead.num_games && <Chip label={`${lead.num_games} machines`} color="#0891b2" />}
            {needsApproval && <Chip label="⚠️ Needs Approval" color="#f59e0b" />}
            {isApproved && <Chip label="✓ Approved" color="#059669" />}
            {isRejected && <Chip label="✕ Rejected" color="#ef4444" />}
          </div>

          {/* Contact */}
          <div style={{ display: 'flex', gap: 12, marginTop: 12, fontSize: 12 }}>
            {lead.phone && (
              <a href={`tel:${lead.phone}`} style={{ color: '#4f46e5', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
                📞 {lead.phone}
              </a>
            )}
            {lead.email && (
              <a href={`mailto:${lead.email}`} style={{ color: '#4f46e5', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
                ✉️ {lead.email}
              </a>
            )}
          </div>
        </div>

        {/* Action bar */}
        <div style={{ padding: '12px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', gap: 8, flexShrink: 0, flexWrap: 'wrap' }}>
          <button onClick={() => setShowLogForm(f => !f)} style={btnStyle('#b8943d')}>
            + Log Activity
          </button>
          <button onClick={openContract} style={btnStyle('#374151', true)}>
            📄 Contract
          </button>
          {isAdmin && needsApproval && (
            <button onClick={() => setShowApprovalForm(f => !f)} style={btnStyle('#f59e0b')}>
              ⚠️ Review Approval
            </button>
          )}
        </div>

        {/* Log activity form */}
        {showLogForm && (
          <div style={{ padding: '16px 24px', borderBottom: '1px solid #f1f5f9', background: '#f8fafc', flexShrink: 0 }}>
            <form onSubmit={handleLogActivity}>
              <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
                {ACTIVITY_TYPES.map(t => (
                  <button key={t.key} type="button" onClick={() => setLogType(t.key)} style={{
                    padding: '5px 12px', borderRadius: 20, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 500,
                    background: logType === t.key ? t.color : '#e5e7eb',
                    color: logType === t.key ? '#fff' : '#374151',
                  }}>
                    {t.icon} {t.label}
                  </button>
                ))}
              </div>
              <input
                style={inputSt} placeholder="Subject (optional)"
                value={logSubject} onChange={e => setLogSubject(e.target.value)}
              />
              <textarea
                style={{ ...inputSt, height: 60, resize: 'vertical' }}
                placeholder="Notes..."
                value={logBody} onChange={e => setLogBody(e.target.value)}
              />
              {logType === 'call' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
                  <select style={inputSt} value={logOutcome} onChange={e => setLogOutcome(e.target.value)}>
                    <option value="">Outcome...</option>
                    {OUTCOMES.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                  <input style={inputSt} type="number" placeholder="Duration (mins)" value={logDuration} onChange={e => setLogDuration(e.target.value)} />
                </div>
              )}
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="submit" disabled={logging} style={btnStyle('#b8943d')}>{logging ? 'Saving...' : 'Save'}</button>
                <button type="button" onClick={() => setShowLogForm(false)} style={btnStyle('#6b7280', true)}>Cancel</button>
              </div>
            </form>
          </div>
        )}

        {/* Approval form */}
        {showApprovalForm && isAdmin && (
          <div style={{ padding: '16px 24px', borderBottom: '1px solid #f1f5f9', background: '#fffbeb', flexShrink: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8, color: '#92400e' }}>
              ⚠️ 50/50 Split — Requires Approval
            </div>
            {lead.approval_notes && (
              <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 8, fontStyle: 'italic' }}>Previous: {lead.approval_notes}</div>
            )}
            <textarea
              style={{ ...inputSt, height: 56 }}
              placeholder="Notes (required for rejection)..."
              value={approvalNotes} onChange={e => setApprovalNotes(e.target.value)}
            />
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={handleApprove} disabled={approving} style={btnStyle('#059669')}>
                {approving ? '...' : '✓ Approve'}
              </button>
              <button onClick={handleReject} disabled={approving} style={btnStyle('#ef4444')}>
                {approving ? '...' : '✕ Reject'}
              </button>
              <button onClick={() => setShowApprovalForm(false)} style={btnStyle('#6b7280', true)}>Cancel</button>
            </div>
          </div>
        )}

        {/* Notes */}
        {lead.notes && (
          <div style={{ padding: '14px 24px', borderBottom: '1px solid #f1f5f9', background: '#fafafa', flexShrink: 0 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Notes</div>
            <div style={{ fontSize: 12.5, color: '#374151', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{lead.notes}</div>
          </div>
        )}

        {/* Activity Timeline */}
        <div style={{ flex: 1, overflow: 'auto', padding: '16px 24px' }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 14 }}>
            Activity ({(activities || []).length})
          </div>

          {(!activities || activities.length === 0) && (
            <div style={{ textAlign: 'center', padding: '32px 0', color: '#9ca3af', fontSize: 13 }}>
              No activity logged yet. Use "Log Activity" to record calls, notes, and visits.
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {(activities || []).map((act, i) => {
              const meta = TYPE_META[act.type] || { icon: '·', color: '#9ca3af', label: act.type };
              const isLast = i === (activities.length - 1);
              return (
                <div key={act.id} style={{ display: 'flex', gap: 12, paddingBottom: isLast ? 0 : 16, position: 'relative' }}>
                  {/* Timeline line */}
                  {!isLast && (
                    <div style={{ position: 'absolute', left: 15, top: 28, bottom: 0, width: 2, background: '#f1f5f9' }} />
                  )}
                  {/* Icon */}
                  <div style={{
                    width: 32, height: 32, borderRadius: '50%', background: meta.color + '15',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 14, flexShrink: 0, border: `2px solid ${meta.color}20`, zIndex: 1,
                  }}>
                    {meta.icon}
                  </div>
                  {/* Content */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>{act.subject || meta.label}</div>
                      <div style={{ fontSize: 11, color: '#9ca3af', whiteSpace: 'nowrap', flexShrink: 0 }}>{fmtDate(act.created_at)}</div>
                    </div>
                    {act.body && <div style={{ fontSize: 12, color: '#6b7280', marginTop: 3, lineHeight: 1.5 }}>{act.body}</div>}
                    <div style={{ display: 'flex', gap: 10, marginTop: 4, fontSize: 11, color: '#9ca3af', flexWrap: 'wrap' }}>
                      {act.outcome && <span style={{ color: '#b8943d', fontWeight: 500 }}>{act.outcome}</span>}
                      {act.duration_mins && <span>{act.duration_mins} min</span>}
                      {act.created_by_name && <span>by {act.created_by_name}</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}

function Chip({ label, color }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', padding: '3px 10px',
      borderRadius: 10, fontSize: 11, fontWeight: 600,
      background: color + '15', color, border: `1px solid ${color}30`,
    }}>{label}</span>
  );
}

const btnStyle = (bg, ghost = false) => ({
  padding: '7px 14px', borderRadius: 7, border: ghost ? `1px solid ${bg}40` : 'none',
  cursor: 'pointer', fontSize: 12, fontWeight: 600,
  background: ghost ? 'transparent' : bg,
  color: ghost ? bg : '#fff',
});

const inputSt = {
  width: '100%', padding: '7px 10px', border: '1px solid #e5e7eb',
  borderRadius: 6, fontSize: 12, marginBottom: 8, boxSizing: 'border-box',
  background: '#fff',
};
