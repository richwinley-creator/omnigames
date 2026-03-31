import { useState } from 'react';
import { useApi } from '../hooks/useApi';
import { Link } from 'react-router-dom';

const fmt = (n) => '$' + (n || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
const fmtK = (n) => {
  if (n >= 1000000) return '$' + (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000) return '$' + (n / 1000).toFixed(1) + 'K';
  return fmt(n);
};

function BarChart({ data, valueKey, color, label }) {
  if (!data || data.length === 0) return null;
  const max = Math.max(...data.map(d => d[valueKey] || 0), 1);
  return (
    <div>
      {label && <div style={{ fontSize: 13, fontWeight: 700, color: '#111827', marginBottom: 14 }}>{label}</div>}
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 140, padding: '0 4px' }}>
        {data.map((d, i) => {
          const val = d[valueKey] || 0;
          const h = Math.max((val / max) * 120, 2);
          const prev = i > 0 ? (data[i - 1][valueKey] || 0) : val;
          const up = val >= prev;
          return (
            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, minWidth: 0 }}>
              <span style={{ fontSize: 9, fontWeight: 600, color: val === 0 ? '#d1d5db' : '#374151', whiteSpace: 'nowrap', overflow: 'hidden' }}>
                {val > 0 ? fmtK(val) : ''}
              </span>
              <div style={{
                width: '85%', height: h, borderRadius: '4px 4px 0 0',
                background: val === 0 ? '#f3f4f6' : up ? color : `${color}88`,
                transition: 'height 0.4s ease',
              }} />
              <span style={{ fontSize: 8, color: '#9ca3af', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}>
                {d.week_start ? new Date(d.week_start + 'T00:00:00').toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' }) : ''}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StatusDot({ color }) {
  return <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0 }} />;
}

function daysSince(dateStr) {
  if (!dateStr) return Infinity;
  const d = new Date(dateStr);
  const now = new Date();
  return Math.floor((now - d) / (1000 * 60 * 60 * 24));
}

function getLocationStatus(row) {
  const fillDays = daysSince(row.last_fill_date);
  const paymentOk = row.last_payment_status === 'paid' || row.total_paid > 0;
  if (fillDays > 21 || (!paymentOk && row.partner_share > 500)) return { color: '#ef4444', label: 'Needs attention' };
  if (fillDays > 14 || (!paymentOk && row.partner_share > 0)) return { color: '#f59e0b', label: 'Due soon' };
  return { color: '#22c55e', label: 'On track' };
}

export default function Money() {
  const [locationFilter, setLocationFilter] = useState('');
  const { data: reconciliation, loading: loadingRecon } = useApi('/api/analytics/reconciliation');
  const { data: weekly } = useApi(`/api/analytics/revenue-weekly?weeks=12${locationFilter ? '&location_id=' + locationFilter : ''}`);
  const { data: deposits } = useApi('/api/deposits');
  const { data: fills } = useApi('/api/fills');
  const { data: payments } = useApi('/api/payments');
  const { data: locations } = useApi('/api/locations');

  const recon = reconciliation || [];
  const deps = deposits || [];
  const allFills = fills || [];
  const allPayments = payments || [];

  // KPI calculations
  const totalNet = recon.reduce((s, r) => s + (r.net_revenue || 0), 0);
  const totalGseShare = recon.reduce((s, r) => s + (r.gse_share || 0), 0);
  const totalCollected = allFills.reduce((s, f) => s + (f.amount || 0), 0);
  const totalDeposited = deps.reduce((s, d) => s + (d.amount || 0), 0);
  const variance = totalGseShare - totalDeposited;

  // Alerts
  const alerts = [];
  recon.forEach(r => {
    const fillDays = daysSince(r.last_fill_date);
    if (fillDays > 14 && fillDays !== Infinity) {
      alerts.push({ type: 'warning', msg: `${r.name}: Not collected in ${fillDays} days`, icon: 'clock' });
    } else if (fillDays === Infinity && r.net_revenue > 0) {
      alerts.push({ type: 'warning', msg: `${r.name}: Never collected`, icon: 'clock' });
    }
  });

  // Partner payments overdue
  allPayments.filter(p => p.status !== 'paid').forEach(p => {
    alerts.push({ type: 'danger', msg: `${p.location_name}: Partner payment of ${fmt(p.amount)} unpaid`, icon: 'alert' });
  });

  // Deposit variance
  if (variance > 500) {
    alerts.push({ type: 'info', msg: `Deposits ${fmt(variance)} short of expected GSE share`, icon: 'bank' });
  }

  // Declining revenue check from weekly data
  if (weekly && weekly.length >= 2) {
    const curr = weekly[weekly.length - 1]?.total_net || 0;
    const prev = weekly[weekly.length - 2]?.total_net || 0;
    if (prev > 0) {
      const pctChange = ((curr - prev) / prev) * 100;
      if (pctChange < -20) {
        alerts.push({ type: 'danger', msg: `Revenue dropped ${Math.abs(pctChange).toFixed(0)}% week over week (${fmtK(prev)} to ${fmtK(curr)})`, icon: 'chart' });
      }
    }
  }

  // Week over week
  let wow = null;
  if (weekly && weekly.length >= 2) {
    const curr = weekly[weekly.length - 1]?.total_net || 0;
    const prev = weekly[weekly.length - 2]?.total_net || 0;
    if (prev > 0) wow = ((curr - prev) / prev * 100).toFixed(0);
  }

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ margin: '0 0 4px', fontSize: 20, fontWeight: 700 }}>Money</h2>
        <p style={{ margin: 0, fontSize: 13, color: '#9ca3af' }}>Revenue to bank reconciliation. Full financial operations view.</p>
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="d-card" style={{ borderTop: '3px solid #ef4444', marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#111827', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 7 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            Alerts ({alerts.length})
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {alerts.map((a, i) => (
              <div key={i} style={{
                padding: '8px 12px', borderRadius: 8, fontSize: 13,
                display: 'flex', alignItems: 'center', gap: 8,
                background: a.type === 'danger' ? '#fef2f2' : a.type === 'warning' ? '#fffbeb' : '#eff6ff',
                color: a.type === 'danger' ? '#991b1b' : a.type === 'warning' ? '#92400e' : '#1e40af',
                border: `1px solid ${a.type === 'danger' ? '#fecaca' : a.type === 'warning' ? '#fde68a' : '#bfdbfe'}`,
              }}>
                <StatusDot color={a.type === 'danger' ? '#ef4444' : a.type === 'warning' ? '#f59e0b' : '#3b82f6'} />
                {a.msg}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* KPI Row */}
      <div className="d-kpi-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))' }}>
        <div className="d-kpi" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 4 }}>
          <div className="d-kpi-label">Net Revenue</div>
          <div className="d-kpi-value" style={{ fontSize: 22 }}>{fmtK(totalNet)}</div>
          <div className="d-kpi-sub">all time</div>
        </div>
        <div className="d-kpi" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 4, borderTopColor: '#059669' }}>
          <div className="d-kpi-label">GSE Share</div>
          <div className="d-kpi-value" style={{ fontSize: 22, color: '#059669' }}>{fmtK(totalGseShare)}</div>
          <div className="d-kpi-sub">expected</div>
        </div>
        <div className="d-kpi" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 4, borderTopColor: '#3b82f6' }}>
          <div className="d-kpi-label">Collected</div>
          <div className="d-kpi-value" style={{ fontSize: 22, color: '#3b82f6' }}>{fmtK(totalCollected)}</div>
          <div className="d-kpi-sub">from fills</div>
        </div>
        <div className="d-kpi" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 4, borderTopColor: '#8b5cf6' }}>
          <div className="d-kpi-label">Deposited</div>
          <div className="d-kpi-value" style={{ fontSize: 22, color: '#8b5cf6' }}>{fmtK(totalDeposited)}</div>
          <div className="d-kpi-sub">{deps.length} deposits</div>
        </div>
        <div className="d-kpi" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 4, borderTopColor: variance > 500 ? '#ef4444' : '#22c55e' }}>
          <div className="d-kpi-label">Variance</div>
          <div className="d-kpi-value" style={{ fontSize: 22, color: variance > 500 ? '#ef4444' : '#22c55e' }}>
            {variance > 0 ? '-' : '+'}{fmtK(Math.abs(variance))}
          </div>
          <div className="d-kpi-sub">GSE share vs deposits</div>
        </div>
      </div>

      {/* Per-location reconciliation table */}
      <div className="d-card" style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#111827', marginBottom: 14 }}>
          Per-Location Reconciliation
        </div>
        {loadingRecon ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>Loading...</div>
        ) : recon.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>No location data yet.</div>
        ) : (
          <div className="d-table-wrap">
            <table className="d-table">
              <thead>
                <tr>
                  <th>Location</th>
                  <th style={{ textAlign: 'right' }}>Net Revenue</th>
                  <th style={{ textAlign: 'center' }}>GSE %</th>
                  <th style={{ textAlign: 'right' }}>GSE Share</th>
                  <th style={{ textAlign: 'center' }}>Last Collection</th>
                  <th style={{ textAlign: 'right' }}>Partner Share</th>
                  <th style={{ textAlign: 'center' }}>Partner Paid?</th>
                  <th style={{ textAlign: 'center' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {recon.map(r => {
                  const status = getLocationStatus(r);
                  const fillDays = daysSince(r.last_fill_date);
                  const fillLabel = r.last_fill_date
                    ? `${new Date(r.last_fill_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} (${fillDays}d ago)`
                    : 'Never';
                  const paidStatus = r.last_payment_status === 'paid' ? 'Paid' : r.total_paid > 0 ? 'Partial' : 'Unpaid';
                  return (
                    <tr key={r.id}>
                      <td style={{ fontWeight: 600 }}>
                        <Link to={`/dashboard/locations/${r.id}`} style={{ color: '#111827', textDecoration: 'none' }}>
                          {r.name}
                        </Link>
                      </td>
                      <td style={{ textAlign: 'right', fontFamily: 'monospace', fontWeight: 700 }}>{fmt(r.net_revenue)}</td>
                      <td style={{ textAlign: 'center' }}>{r.gse_pct}%</td>
                      <td style={{ textAlign: 'right', fontFamily: 'monospace', color: '#059669', fontWeight: 700 }}>{fmt(r.gse_share)}</td>
                      <td style={{ textAlign: 'center', fontSize: 12, color: fillDays > 14 ? '#ef4444' : '#6b7280' }}>{fillLabel}</td>
                      <td style={{ textAlign: 'right', fontFamily: 'monospace', color: '#6b7280' }}>{fmt(r.partner_share)}</td>
                      <td style={{ textAlign: 'center' }}>
                        <span style={{
                          padding: '3px 10px', borderRadius: 12, fontSize: 11, fontWeight: 600,
                          background: paidStatus === 'Paid' ? '#dcfce7' : paidStatus === 'Partial' ? '#fef3c7' : '#f3f4f6',
                          color: paidStatus === 'Paid' ? '#166534' : paidStatus === 'Partial' ? '#92400e' : '#6b7280',
                        }}>
                          {paidStatus}
                        </span>
                      </td>
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
        )}
      </div>

      {/* Weekly Revenue Trend */}
      <div className="d-card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#111827' }}>
            Weekly Net Revenue
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
        {weekly && weekly.length > 0 ? (
          <BarChart data={weekly} valueKey="total_net" color="#b8943d" />
        ) : (
          <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>
            No weekly revenue data available yet.
          </div>
        )}
      </div>
    </div>
  );
}
