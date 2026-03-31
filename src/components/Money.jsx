import { useState } from 'react';
import { useApi } from '../hooks/useApi';
import { Link } from 'react-router-dom';
import Skeleton from './Skeleton';

const fmt = (n) => '$' + (n || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
const fmtK = (n) => {
  if (n >= 1000000) return '$' + (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000) return '$' + (n / 1000).toFixed(1) + 'K';
  return fmt(n);
};

function formatWeekDate(dateStr) {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr.includes('T') ? dateStr : dateStr + 'T00:00:00');
    if (isNaN(d)) return dateStr;
    return d.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' });
  } catch { return dateStr; }
}

function BarChart({ data, valueKey, color }) {
  if (!data || data.length === 0) return null;
  const max = Math.max(...data.map(d => d[valueKey] || 0), 1);
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 160, padding: '0 4px' }}>
      {data.map((d, i) => {
        const val = d[valueKey] || 0;
        const h = Math.max((val / max) * 130, 3);
        const prev = i > 0 ? (data[i - 1][valueKey] || 0) : val;
        const up = val >= prev;
        return (
          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, minWidth: 0 }}>
            <span style={{ fontSize: 10, fontWeight: 600, color: val === 0 ? '#d1d5db' : '#374151', whiteSpace: 'nowrap' }}>
              {val > 0 ? fmtK(val) : ''}
            </span>
            <div style={{
              width: '80%', height: h, borderRadius: '5px 5px 0 0',
              background: val === 0 ? '#f3f4f6' : `linear-gradient(180deg, ${color}, ${color}cc)`,
              opacity: up ? 1 : 0.7,
              transition: 'height 0.4s ease',
            }} />
            <span style={{ fontSize: 9, color: '#9ca3af', whiteSpace: 'nowrap' }}>
              {formatWeekDate(d.week_start || d.month)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function StatusDot({ color }) {
  return <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0 }} />;
}

function daysSince(dateStr) {
  if (!dateStr) return Infinity;
  try {
    const d = new Date(dateStr);
    if (isNaN(d)) return Infinity;
    return Math.floor((new Date() - d) / (1000 * 60 * 60 * 24));
  } catch { return Infinity; }
}

function getLocationStatus(row) {
  // No revenue = not active yet, show gray
  if (!row.net_revenue || row.net_revenue === 0) return { color: '#d1d5db', label: 'No data' };

  const fillDays = daysSince(row.last_fill_date);
  const hasPartnerDue = row.partner_share > 100;
  const partnerPaid = row.last_payment_status === 'paid' || row.total_paid >= row.partner_share * 0.8;

  if (fillDays > 21 && row.net_revenue > 0) return { color: '#ef4444', label: 'Overdue' };
  if (fillDays > 14 && row.net_revenue > 0) return { color: '#f59e0b', label: 'Due soon' };
  if (hasPartnerDue && !partnerPaid) return { color: '#f59e0b', label: 'Payment due' };
  return { color: '#22c55e', label: 'On track' };
}

export default function Money() {
  const [locationFilter, setLocationFilter] = useState('');
  const [showInactive, setShowInactive] = useState(false);
  const { data: reconciliation, loading: loadingRecon } = useApi('/api/analytics/reconciliation');
  const { data: weekly } = useApi(`/api/analytics/revenue-weekly?weeks=12${locationFilter ? '&location_id=' + locationFilter : ''}`);
  const { data: deposits } = useApi('/api/deposits');
  const { data: fills } = useApi('/api/fills');
  const { data: locations } = useApi('/api/locations');

  const recon = reconciliation || [];
  const deps = deposits || [];
  const allFills = fills || [];

  // Split locations into active (has revenue) and inactive
  const activeLocations = recon.filter(r => r.net_revenue && r.net_revenue > 0);
  const inactiveLocations = recon.filter(r => !r.net_revenue || r.net_revenue === 0);

  // KPIs — from active locations only
  const totalNet = activeLocations.reduce((s, r) => s + (r.net_revenue || 0), 0);
  const totalGseShare = activeLocations.reduce((s, r) => s + (r.gse_share || 0), 0);
  const totalCollected = allFills.reduce((s, f) => s + (f.amount || 0), 0);
  const totalDeposited = deps.reduce((s, d) => s + (d.amount || 0), 0);
  const variance = totalGseShare - totalDeposited;

  // Smart alerts — only for locations with actual revenue
  const alerts = [];
  activeLocations.forEach(r => {
    const fillDays = daysSince(r.last_fill_date);
    if (fillDays > 14 && fillDays !== Infinity) {
      alerts.push({ type: 'warning', msg: `${r.name}: Not collected in ${fillDays} days` });
    } else if (fillDays === Infinity) {
      alerts.push({ type: 'warning', msg: `${r.name}: Has ${fmt(r.net_revenue)} revenue but never collected` });
    }
  });

  if (variance > 500) {
    alerts.push({ type: 'info', msg: `Deposits ${fmt(variance)} short of expected GSE share` });
  }

  if (weekly && weekly.length >= 2) {
    const curr = weekly[weekly.length - 1]?.total_net || 0;
    const prev = weekly[weekly.length - 2]?.total_net || 0;
    if (prev > 0) {
      const pctChange = ((curr - prev) / prev) * 100;
      if (pctChange < -20) {
        alerts.push({ type: 'danger', msg: `Revenue dropped ${Math.abs(pctChange).toFixed(0)}% week over week` });
      }
    }
  }

  // WoW
  let wow = null;
  if (weekly && weekly.length >= 2) {
    const curr = weekly[weekly.length - 1]?.total_net || 0;
    const prev = weekly[weekly.length - 2]?.total_net || 0;
    if (prev > 0) wow = ((curr - prev) / prev * 100).toFixed(0);
  }

  if (loadingRecon) return <Skeleton variant="kpi" />;

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ margin: '0 0 4px', fontSize: 20, fontWeight: 700 }}>Money</h2>
        <p style={{ margin: 0, fontSize: 13, color: '#9ca3af' }}>Revenue to bank reconciliation across all locations.</p>
      </div>

      {/* Alerts — only show if there are real problems */}
      {alerts.length > 0 && (
        <div className="d-card" style={{ borderTop: '3px solid #f59e0b', marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#111827', marginBottom: 10 }}>
            Needs Attention ({alerts.length})
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {alerts.map((a, i) => (
              <div key={i} style={{
                padding: '8px 12px', borderRadius: 8, fontSize: 13,
                display: 'flex', alignItems: 'center', gap: 8,
                background: a.type === 'danger' ? '#fef2f2' : a.type === 'warning' ? '#fffbeb' : '#eff6ff',
                color: a.type === 'danger' ? '#991b1b' : a.type === 'warning' ? '#92400e' : '#1e40af',
              }}>
                <StatusDot color={a.type === 'danger' ? '#ef4444' : a.type === 'warning' ? '#f59e0b' : '#3b82f6'} />
                {a.msg}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* KPI Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Net Revenue', value: fmtK(totalNet), sub: `${activeLocations.length} locations`, color: '#b8943d' },
          { label: 'GSE Share', value: fmtK(totalGseShare), sub: 'expected', color: '#059669' },
          { label: 'Collected', value: fmtK(totalCollected), sub: `${allFills.length} fills`, color: '#3b82f6' },
          { label: 'Deposited', value: fmtK(totalDeposited), sub: `${deps.length} deposits`, color: '#8b5cf6' },
          { label: 'Variance', value: `${variance > 0 ? '-' : '+'}${fmtK(Math.abs(variance))}`, sub: 'GSE vs deposits', color: Math.abs(variance) > 500 ? '#ef4444' : '#22c55e' },
        ].map(kpi => (
          <div key={kpi.label} style={{
            background: '#fff', borderRadius: 12, padding: '16px 18px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.06)', borderLeft: `4px solid ${kpi.color}`,
          }}>
            <div style={{ fontSize: 11, color: '#6b7280', fontWeight: 500, marginBottom: 2 }}>{kpi.label}</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#111827' }}>{kpi.value}</div>
            <div style={{ fontSize: 11, color: '#9ca3af' }}>{kpi.sub}</div>
          </div>
        ))}
      </div>

      {/* Active Locations Reconciliation */}
      {activeLocations.length > 0 && (
        <div className="d-card" style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#111827', marginBottom: 14 }}>
            Location Reconciliation ({activeLocations.length} with revenue)
          </div>
          <div className="d-table-wrap">
            <table className="d-table">
              <thead>
                <tr>
                  <th>Location</th>
                  <th style={{ textAlign: 'right' }}>Net Revenue</th>
                  <th style={{ textAlign: 'center' }}>Split</th>
                  <th style={{ textAlign: 'right' }}>GSE Share</th>
                  <th style={{ textAlign: 'center' }}>Last Collection</th>
                  <th style={{ textAlign: 'right' }}>Partner Owed</th>
                  <th style={{ textAlign: 'center' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {activeLocations.map(r => {
                  const status = getLocationStatus(r);
                  const fillDays = daysSince(r.last_fill_date);
                  const fillLabel = r.last_fill_date
                    ? `${formatWeekDate(r.last_fill_date)} (${fillDays}d)`
                    : 'Never';
                  return (
                    <tr key={r.id}>
                      <td style={{ fontWeight: 600 }}>
                        <Link to={`/dashboard/locations/${r.id}`} style={{ color: '#111827', textDecoration: 'none' }}>
                          {r.name}
                        </Link>
                        <div style={{ fontSize: 11, color: '#9ca3af' }}>{r.machines} machines</div>
                      </td>
                      <td style={{ textAlign: 'right', fontFamily: 'monospace', fontWeight: 700 }}>{fmt(r.net_revenue)}</td>
                      <td style={{ textAlign: 'center', fontSize: 12, color: '#6b7280' }}>{r.gse_pct}/{r.partner_pct}</td>
                      <td style={{ textAlign: 'right', fontFamily: 'monospace', color: '#059669', fontWeight: 700 }}>{fmt(r.gse_share)}</td>
                      <td style={{ textAlign: 'center', fontSize: 12, color: fillDays > 14 ? '#ef4444' : fillDays === Infinity ? '#d1d5db' : '#6b7280', fontWeight: fillDays > 14 ? 600 : 400 }}>
                        {fillLabel}
                      </td>
                      <td style={{ textAlign: 'right', fontFamily: 'monospace', color: '#6b7280' }}>{fmt(r.partner_share)}</td>
                      <td style={{ textAlign: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center' }}>
                          <StatusDot color={status.color} />
                          <span style={{ fontSize: 11, color: '#6b7280' }}>{status.label}</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Inactive locations — collapsed */}
      {inactiveLocations.length > 0 && (
        <div className="d-card" style={{ marginBottom: 16 }}>
          <button
            onClick={() => setShowInactive(!showInactive)}
            style={{
              background: 'none', border: 'none', cursor: 'pointer', padding: 0,
              fontSize: 13, fontWeight: 600, color: '#9ca3af', display: 'flex', alignItems: 'center', gap: 6,
            }}
          >
            {showInactive ? '▾' : '▸'} {inactiveLocations.length} locations with no readings yet
          </button>
          {showInactive && (
            <div style={{ marginTop: 12, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {inactiveLocations.map(r => (
                <Link key={r.id} to={`/dashboard/locations/${r.id}`} style={{
                  padding: '6px 14px', borderRadius: 8, background: '#f9fafb', border: '1px solid #e5e7eb',
                  fontSize: 12, color: '#6b7280', textDecoration: 'none',
                }}>
                  {r.name} ({r.machines} machines)
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Weekly Revenue Chart */}
      <div className="d-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#111827' }}>Weekly Revenue</span>
            {wow !== null && (
              <span style={{ marginLeft: 10, fontSize: 12, fontWeight: 600, color: parseInt(wow) >= 0 ? '#059669' : '#ef4444' }}>
                {parseInt(wow) >= 0 ? '+' : ''}{wow}% WoW
              </span>
            )}
          </div>
          <select
            value={locationFilter}
            onChange={e => setLocationFilter(e.target.value)}
            style={{ padding: '6px 12px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 12, background: '#fff' }}
          >
            <option value="">All Locations</option>
            {(locations || []).map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
        </div>
        {weekly && weekly.length > 1 ? (
          <BarChart data={weekly} valueKey="total_net" color="#b8943d" />
        ) : weekly && weekly.length === 1 ? (
          <div style={{ textAlign: 'center', padding: '30px 0' }}>
            <div style={{ fontSize: 32, fontWeight: 800, color: '#b8943d' }}>{fmtK(weekly[0].total_net)}</div>
            <div style={{ fontSize: 13, color: '#9ca3af', marginTop: 4 }}>
              First week of data ({formatWeekDate(weekly[0].week_start)}). More bars will appear as readings are imported.
            </div>
          </div>
        ) : (
          <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>
            Import meter readings to see weekly revenue trends.
          </div>
        )}
      </div>
    </div>
  );
}
