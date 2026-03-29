import { useApi, apiPut } from '../hooks/useApi';
import { REVENUE_SEED } from '../data/locations';
import { Link } from 'react-router-dom';
import Skeleton from './Skeleton';

const TARGET = 530000;
const CURRENT_MONTHLY = 41368;

const fmt = (n) => '$' + (n || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
const fmtCompact = (n) => {
  if (n >= 1000000) return '$' + (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000) return '$' + (n / 1000).toFixed(1) + 'K';
  return fmt(n);
};

const icons = {
  revenue: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>,
  chart: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>,
  machine: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="2" width="13" height="19" rx="2"/><rect x="6" y="5" width="9" height="7" rx="1"/><line x1="9" y1="5" x2="9" y2="12"/><line x1="12.5" y1="5" x2="12.5" y2="12"/><line x1="17" y1="8" x2="20" y2="6"/><circle cx="20" cy="5.5" r="1.5"/><rect x="6" y="17" width="9" height="2" rx="1"/></svg>,
  bank: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21h18"/><path d="M3 10h18"/><path d="M12 3l9 7H3z"/><path d="M5 10v8"/><path d="M19 10v8"/><path d="M9 10v8"/><path d="M15 10v8"/></svg>,
  alert: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>,
  check: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>,
  target: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>,
  clock: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
};

const PRIORITY_COLORS = { urgent: '#ef4444', high: '#f59e0b', normal: '#3b82f6', low: '#6b7280' };

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function Dashboard({ isAdmin = true, user }) {
  const { data: locations, loading: loadingLocations } = useApi('/api/locations');
  const { data: deposits } = useApi(isAdmin ? '/api/deposits' : null);
  const { data: overview } = useApi('/api/analytics/overview');
  const { data: tasks, refetch: refetchTasks } = useApi('/api/tasks');
  const { data: allLeads } = useApi('/api/leads');

  const today = new Date().toISOString().split('T')[0];

  const locs = locations || [];
  const hasReadings = locs.some(l => l.net > 0);
  const totalNet = hasReadings ? locs.reduce((s, l) => s + (l.net || 0), 0) : REVENUE_SEED.reduce((s, r) => s + r.net, 0);
  const totalGse = hasReadings ? locs.reduce((s, l) => s + (l.gse_share || 0), 0) : REVENUE_SEED.reduce((s, r) => s + r.gseRev, 0);
  const totalMachines = locs.reduce((s, l) => s + (l.machines || 0), 0) || 54;
  const totalLocations = locs.length || 13;
  const totalDeposits = (deposits || []).reduce((s, d) => s + d.amount, 0);
  const progressPct = (CURRENT_MONTHLY / TARGET) * 100;

  const revenueData = hasReadings
    ? locs.map(l => ({ name: l.name, net: l.net || 0, gseRev: l.gse_share || 0 }))
    : REVENUE_SEED.map(r => ({ name: r.name, net: r.net, gseRev: r.gseRev }));

  const locationAlerts = [];
  revenueData.forEach(l => {
    if (l.net < 0) locationAlerts.push({ type: 'danger', msg: `${l.name}: Negative net (${fmt(l.net)})` });
    if (l.net === 0) locationAlerts.push({ type: 'warn', msg: `${l.name}: Zero activity — may be down` });
  });

  const topLocations = [...revenueData].sort((a, b) => b.gseRev - a.gseRev).slice(0, 5);

  // Today's focus
  const dueTasks = (tasks || [])
    .filter(t => t.status !== 'completed' && t.status !== 'cancelled' && t.due_date && t.due_date <= today)
    .sort((a, b) => (a.due_date || '').localeCompare(b.due_date || ''))
    .slice(0, 5);

  const followUpLeads = (allLeads || [])
    .filter(l => l.follow_up_date && l.follow_up_date <= today && l.stage !== 'archived' && l.stage !== 'lost' && l.stage !== 'live')
    .sort((a, b) => (a.follow_up_date || '').localeCompare(b.follow_up_date || ''))
    .slice(0, 5);

  const hasFocus = dueTasks.length > 0 || followUpLeads.length > 0;

  const completeTask = async (task) => {
    const newStatus = task.status === 'pending' ? 'in_progress' : 'completed';
    await apiPut(`/api/tasks/${task.id}`, { status: newStatus });
    refetchTasks();
  };

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: '#111827', margin: '0 0 4px' }}>
          {getGreeting()}, {user?.name?.split(' ')[0] || 'Team'}
        </h1>
        <p style={{ fontSize: 14, color: '#9ca3af', margin: 0 }}>Here's what needs your attention today.</p>
      </div>

      {/* ── Today's Focus ── */}
      {hasFocus && (
        <div className="d-card" style={{ borderTop: '3px solid #b8943d', marginBottom: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#111827', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 7 }}>
            {icons.clock} Today's Focus
          </div>
          <div className="d-two-col" style={{ display: 'grid', gridTemplateColumns: dueTasks.length > 0 && followUpLeads.length > 0 ? '1fr 1fr' : '1fr', gap: 24 }}>
            {dueTasks.length > 0 && (
              <div>
                <div className="d-section-label">Tasks Due</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {dueTasks.map(t => {
                    const isOverdue = t.due_date < today;
                    const priColor = PRIORITY_COLORS[t.priority] || '#6b7280';
                    return (
                      <div key={t.id} style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        padding: '9px 12px', borderRadius: 9,
                        background: isOverdue ? '#fef2f2' : '#f8fafc',
                        border: `1px solid ${isOverdue ? '#fecaca' : '#e5e7eb'}`,
                        borderLeft: `3px solid ${priColor}`,
                      }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 600, fontSize: 13, color: '#111827', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.title}</div>
                          <div style={{ fontSize: 11, color: isOverdue ? '#ef4444' : '#9ca3af', marginTop: 2 }}>
                            {isOverdue ? 'Overdue · ' : 'Due '}{t.due_date}{t.assigned_name ? ` · ${t.assigned_name}` : ''}
                          </div>
                        </div>
                        <button onClick={() => completeTask(t)} style={{
                          padding: '4px 11px', borderRadius: 6, border: 'none', cursor: 'pointer',
                          fontSize: 12, fontWeight: 600, background: '#10b981', color: '#fff', whiteSpace: 'nowrap', flexShrink: 0,
                        }}>
                          {t.status === 'pending' ? '▶ Start' : '✓ Done'}
                        </button>
                      </div>
                    );
                  })}
                </div>
                <Link to="/dashboard/tasks" style={{ display: 'inline-block', marginTop: 9, fontSize: 12, color: '#b8943d', textDecoration: 'none', fontWeight: 500 }}>
                  View all tasks →
                </Link>
              </div>
            )}
            {followUpLeads.length > 0 && (
              <div>
                <div className="d-section-label">Leads to Follow Up</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {followUpLeads.map(l => {
                    const isOverdue = l.follow_up_date < today;
                    return (
                      <div key={l.id} style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        padding: '9px 12px', borderRadius: 9,
                        background: isOverdue ? '#fffbeb' : '#f8fafc',
                        border: `1px solid ${isOverdue ? '#fde68a' : '#e5e7eb'}`,
                        borderLeft: '3px solid #f59e0b',
                      }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 600, fontSize: 13, color: '#111827', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {l.name}{l.business_name ? ` · ${l.business_name}` : ''}
                          </div>
                          <div style={{ fontSize: 11, color: isOverdue ? '#92400e' : '#9ca3af', marginTop: 2 }}>
                            {isOverdue ? 'Overdue · ' : 'Follow up '}{l.follow_up_date}{l.city ? ` · ${l.city}` : ''}
                          </div>
                        </div>
                        <Link to="/dashboard/leads" style={{
                          padding: '4px 11px', borderRadius: 6, fontSize: 12, fontWeight: 600,
                          background: '#f59e0b', color: '#fff', textDecoration: 'none', whiteSpace: 'nowrap', flexShrink: 0,
                        }}>
                          View
                        </Link>
                      </div>
                    );
                  })}
                </div>
                <Link to="/dashboard/leads" style={{ display: 'inline-block', marginTop: 9, fontSize: 12, color: '#b8943d', textDecoration: 'none', fontWeight: 500 }}>
                  View all leads →
                </Link>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── KPI Cards ── */}
      {loadingLocations && <div style={{ marginBottom: 20 }}><Skeleton variant="kpi" count={4} /></div>}
      <div className="d-kpi-grid">
        <div className="d-kpi">
          <div className="d-kpi-icon">{icons.revenue}</div>
          <div>
            <p className="d-kpi-label">Total Net Revenue</p>
            <p className="d-kpi-value">{fmtCompact(totalNet)}</p>
            <p className="d-kpi-sub">{totalLocations} active locations</p>
          </div>
        </div>
        <div className="d-kpi">
          <div className="d-kpi-icon">{icons.chart}</div>
          <div>
            <p className="d-kpi-label">GSE Share</p>
            <p className="d-kpi-value">{fmtCompact(totalGse)}</p>
            <p className="d-kpi-sub">After partner splits</p>
          </div>
        </div>
        <div className="d-kpi">
          <div className="d-kpi-icon">{icons.machine}</div>
          <div>
            <p className="d-kpi-label">Machines</p>
            <p className="d-kpi-value">{totalMachines}</p>
            <p className="d-kpi-sub">{totalLocations} locations</p>
          </div>
        </div>
        {isAdmin && (
          <div className="d-kpi">
            <div className="d-kpi-icon">{icons.bank}</div>
            <div>
              <p className="d-kpi-label">Bank Deposits</p>
              <p className="d-kpi-value">{fmtCompact(totalDeposits)}</p>
              <p className="d-kpi-sub">{(deposits || []).length} deposits</p>
            </div>
          </div>
        )}
      </div>

      {/* ── Monthly Target ── */}
      <div className="d-card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#111827', display: 'flex', alignItems: 'center', gap: 7 }}>
            {icons.target} Monthly Target
          </div>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#b8943d' }}>
            {fmtCompact(CURRENT_MONTHLY)} <span style={{ color: '#9ca3af', fontWeight: 400 }}>of {fmtCompact(TARGET)}</span>
          </span>
        </div>
        <div style={{ width: '100%', height: 8, background: '#f1f5f9', borderRadius: 10, overflow: 'hidden' }}>
          <div style={{ width: `${Math.min(progressPct, 100)}%`, height: '100%', background: 'linear-gradient(90deg, #b8943d, #d4b85c)', borderRadius: 10, transition: 'width 0.6s ease' }} />
        </div>
        <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 6 }}>
          {progressPct.toFixed(1)}% — {fmtCompact(TARGET - CURRENT_MONTHLY)} to go
        </p>
      </div>

      {/* ── Top Locations + Overview Stats ── */}
      <div className="d-two-col" style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 16 }}>
        <div className="d-card">
          <div style={{ fontSize: 13, fontWeight: 700, color: '#111827', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 7 }}>
            {icons.chart} Top Locations
          </div>
          <div className="d-table-wrap">
            <table className="d-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Location</th>
                  <th style={{ textAlign: 'right' }}>Net</th>
                  <th style={{ textAlign: 'right' }}>GSE Share</th>
                </tr>
              </thead>
              <tbody>
                {topLocations.map((l, i) => (
                  <tr key={l.name}>
                    <td style={{ width: 32, color: '#9ca3af', fontWeight: 600 }}>{i + 1}</td>
                    <td style={{ fontWeight: 600, color: '#111827' }}>{l.name}</td>
                    <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>{fmt(l.net)}</td>
                    <td style={{ textAlign: 'right', fontWeight: 700, color: '#059669', fontFamily: 'monospace' }}>{fmt(l.gseRev)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="d-card">
          <div style={{ fontSize: 13, fontWeight: 700, color: '#111827', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 7 }}>
            {icons.alert} Overview
          </div>

          {/* Alerts */}
          {locationAlerts.length === 0 ? (
            <div style={{
              padding: '9px 12px', borderRadius: 9, marginBottom: 14, fontSize: 13,
              display: 'flex', alignItems: 'center', gap: 8,
              background: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0',
            }}>
              {icons.check} All locations performing normally.
            </div>
          ) : (
            locationAlerts.map((a, i) => (
              <div key={i} style={{
                padding: '9px 12px', borderRadius: 9, marginBottom: 8, fontSize: 13,
                display: 'flex', alignItems: 'center', gap: 8,
                background: a.type === 'danger' ? '#fef2f2' : '#fffbeb',
                color: a.type === 'danger' ? '#991b1b' : '#92400e',
                border: `1px solid ${a.type === 'danger' ? '#fecaca' : '#fde68a'}`,
              }}>
                {icons.alert} {a.msg}
              </div>
            ))
          )}

          {/* Quick stats */}
          {overview && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {[
                { val: overview.activeLeads || 0, label: 'Active Leads' },
                { val: overview.openTickets || 0, label: 'Open Tickets' },
                { val: overview.liveLeads || 0, label: 'Live Deals' },
                { val: overview.overdueTaskCount || 0, label: 'Overdue Tasks' },
              ].map(item => (
                <div key={item.label} className="d-stat-mini">
                  <div className="d-stat-mini-val">{item.val}</div>
                  <div className="d-stat-mini-label">{item.label}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
