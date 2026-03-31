import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useApi } from '../hooks/useApi';

const fmt = (n) => '$' + (n || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
const fmtK = (n) => {
  if (n >= 1000000) return '$' + (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000) return '$' + (n / 1000).toFixed(1) + 'K';
  return fmt(n);
};

function BarChart({ data, valueKey, color }) {
  if (!data || data.length === 0) return null;
  const max = Math.max(...data.map(d => d[valueKey] || 0), 1);
  return (
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
  );
}

const tabStyle = (active) => ({
  padding: '8px 18px', borderRadius: 8, border: 'none', cursor: 'pointer',
  fontSize: 13, fontWeight: active ? 600 : 500,
  background: active ? '#b8943d' : '#f3f4f6',
  color: active ? '#fff' : '#6b7280',
  transition: 'all 0.15s',
});

export default function LocationDetail() {
  const { id } = useParams();
  const [tab, setTab] = useState('readings');
  const { data: summary, loading } = useApi(`/api/analytics/location-summary/${id}`);
  const { data: readings } = useApi(`/api/readings?location_id=${id}`);
  const { data: serviceTickets } = useApi(`/api/service?location_id=${id}`);

  if (loading) {
    return <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>Loading location...</div>;
  }

  if (!summary || !summary.location) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>
        <div style={{ fontSize: 16, fontWeight: 600, color: '#374151', marginBottom: 8 }}>Location not found</div>
        <Link to="/dashboard/locations" style={{ color: '#b8943d', fontSize: 13 }}>Back to Locations</Link>
      </div>
    );
  }

  const loc = summary.location;
  const weeklyData = summary.weeklyRevenue || [];
  const fillsData = summary.fills || [];
  const paymentsData = summary.payments || [];
  const readingsData = readings || [];

  const outstandingPartner = (loc.partner_share || 0) - (summary.totalPaid || 0);

  return (
    <div>
      {/* Breadcrumb */}
      <div style={{ marginBottom: 16, fontSize: 13 }}>
        <Link to="/dashboard/locations" style={{ color: '#9ca3af', textDecoration: 'none' }}>Locations</Link>
        <span style={{ color: '#d1d5db', margin: '0 8px' }}>/</span>
        <span style={{ color: '#111827', fontWeight: 600 }}>{loc.name}</span>
      </div>

      {/* Header */}
      <div className="d-card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>{loc.name}</h2>
              <span style={{
                padding: '3px 12px', borderRadius: 12, fontSize: 11, fontWeight: 600,
                background: loc.status === 'active' ? '#dcfce7' : '#f3f4f6',
                color: loc.status === 'active' ? '#166534' : '#9ca3af',
              }}>
                {loc.status === 'active' ? 'Active' : 'Inactive'}
              </span>
            </div>
            <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', fontSize: 13, color: '#6b7280' }}>
              <span>{loc.machines} machines</span>
              <span>GSE {loc.gse_pct}% / Partner {loc.partner_pct}%</span>
              <span>Partner: {loc.partner || '—'}</span>
              {loc.machine_type && <span>Type: {loc.machine_type}</span>}
            </div>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="d-kpi-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))' }}>
        <div className="d-kpi" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 4 }}>
          <div className="d-kpi-label">Total Revenue</div>
          <div className="d-kpi-value" style={{ fontSize: 22 }}>{fmtK(loc.net)}</div>
          <div className="d-kpi-sub">{loc.reading_count || 0} readings</div>
        </div>
        <div className="d-kpi" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 4, borderTopColor: '#059669' }}>
          <div className="d-kpi-label">GSE Share</div>
          <div className="d-kpi-value" style={{ fontSize: 22, color: '#059669' }}>{fmtK(loc.gse_share)}</div>
          <div className="d-kpi-sub">{loc.gse_pct}% of net</div>
        </div>
        <div className="d-kpi" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 4, borderTopColor: '#3b82f6' }}>
          <div className="d-kpi-label">Last Collection</div>
          <div className="d-kpi-value" style={{ fontSize: 18 }}>
            {summary.lastFillDate ? new Date(summary.lastFillDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Never'}
          </div>
          <div className="d-kpi-sub">{fmtK(summary.totalCollected)} total</div>
        </div>
        <div className="d-kpi" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 4, borderTopColor: outstandingPartner > 0 ? '#f59e0b' : '#22c55e' }}>
          <div className="d-kpi-label">Partner Balance</div>
          <div className="d-kpi-value" style={{ fontSize: 22, color: outstandingPartner > 0 ? '#f59e0b' : '#22c55e' }}>
            {outstandingPartner > 0 ? fmt(outstandingPartner) : 'Settled'}
          </div>
          <div className="d-kpi-sub">{fmtK(summary.totalPaid)} paid</div>
        </div>
      </div>

      {/* Revenue Chart */}
      {weeklyData.length > 0 && (
        <div className="d-card" style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#111827', marginBottom: 14 }}>Weekly Revenue (Last 12 Weeks)</div>
          <BarChart data={weeklyData} valueKey="total_net" color="#b8943d" />
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
        {[
          { key: 'readings', label: `Readings (${readingsData.length})` },
          { key: 'collections', label: `Collections (${fillsData.length})` },
          { key: 'payments', label: `Payments (${paymentsData.length})` },
          { key: 'service', label: `Service (${(serviceTickets || []).length})` },
        ].map(t => (
          <button key={t.key} style={tabStyle(tab === t.key)} onClick={() => setTab(t.key)}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="d-card">
        {tab === 'readings' && (
          readingsData.length > 0 ? (
            <div className="d-table-wrap">
              <table className="d-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Machine</th>
                    <th style={{ textAlign: 'right' }}>Prev In</th>
                    <th style={{ textAlign: 'right' }}>Curr In</th>
                    <th style={{ textAlign: 'right' }}>Prev Out</th>
                    <th style={{ textAlign: 'right' }}>Curr Out</th>
                    <th style={{ textAlign: 'right' }}>Net</th>
                  </tr>
                </thead>
                <tbody>
                  {readingsData.map((r, i) => (
                    <tr key={r.id || i} style={{ background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                      <td style={{ fontWeight: 500 }}>{r.date}</td>
                      <td>{r.machine_name || '—'}</td>
                      <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>{(r.prev_in || 0).toLocaleString()}</td>
                      <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>{(r.curr_in || 0).toLocaleString()}</td>
                      <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>{(r.prev_out || 0).toLocaleString()}</td>
                      <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>{(r.curr_out || 0).toLocaleString()}</td>
                      <td style={{ textAlign: 'right', fontFamily: 'monospace', fontWeight: 700, color: (r.net || 0) >= 0 ? '#059669' : '#ef4444' }}>
                        {fmt(r.net)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>No readings recorded for this location.</div>
          )
        )}

        {tab === 'collections' && (
          fillsData.length > 0 ? (
            <div className="d-table-wrap">
              <table className="d-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th style={{ textAlign: 'right' }}>Amount</th>
                    <th>Filled By</th>
                    <th>Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {fillsData.map((f, i) => (
                    <tr key={f.id || i} style={{ background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                      <td style={{ fontWeight: 500 }}>{f.date}</td>
                      <td style={{ textAlign: 'right', fontFamily: 'monospace', fontWeight: 700, color: '#059669' }}>{fmt(f.amount)}</td>
                      <td>{f.filled_by_name || '—'}</td>
                      <td style={{ color: '#6b7280', fontSize: 12 }}>{f.notes || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>No collections recorded for this location.</div>
          )
        )}

        {tab === 'payments' && (
          paymentsData.length > 0 ? (
            <div className="d-table-wrap">
              <table className="d-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Partner</th>
                    <th>Period</th>
                    <th style={{ textAlign: 'right' }}>Amount</th>
                    <th style={{ textAlign: 'center' }}>Status</th>
                    <th>Paid Date</th>
                  </tr>
                </thead>
                <tbody>
                  {paymentsData.map((p, i) => (
                    <tr key={p.id || i} style={{ background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                      <td style={{ fontWeight: 500 }}>{p.created_at ? new Date(p.created_at).toLocaleDateString() : '—'}</td>
                      <td>{p.partner || '—'}</td>
                      <td>{p.period || '—'}</td>
                      <td style={{ textAlign: 'right', fontFamily: 'monospace', fontWeight: 700 }}>{fmt(p.amount)}</td>
                      <td style={{ textAlign: 'center' }}>
                        <span style={{
                          padding: '3px 10px', borderRadius: 12, fontSize: 11, fontWeight: 600,
                          background: p.status === 'paid' ? '#dcfce7' : '#fef3c7',
                          color: p.status === 'paid' ? '#166534' : '#92400e',
                        }}>
                          {p.status === 'paid' ? 'Paid' : 'Pending'}
                        </span>
                      </td>
                      <td style={{ color: '#6b7280', fontSize: 12 }}>{p.paid_date ? new Date(p.paid_date).toLocaleDateString() : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>No partner payments recorded for this location.</div>
          )
        )}

        {tab === 'service' && (
          (serviceTickets || []).length > 0 ? (
            <div className="d-table-wrap">
              <table className="d-table">
                <thead>
                  <tr>
                    <th>Issue</th>
                    <th>Machine</th>
                    <th style={{ textAlign: 'center' }}>Priority</th>
                    <th style={{ textAlign: 'center' }}>Status</th>
                    <th>Assigned</th>
                    <th>Created</th>
                  </tr>
                </thead>
                <tbody>
                  {(serviceTickets || []).map((t, i) => {
                    const priColors = { urgent: '#ef4444', high: '#f59e0b', normal: '#3b82f6', low: '#6b7280' };
                    return (
                      <tr key={t.id || i} style={{ background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                        <td style={{ fontWeight: 500 }}>
                          <div>{t.issue_type}</div>
                          {t.description && <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>{t.description}</div>}
                        </td>
                        <td>{t.machine_name || '—'}</td>
                        <td style={{ textAlign: 'center' }}>
                          <span style={{
                            padding: '3px 10px', borderRadius: 12, fontSize: 11, fontWeight: 600,
                            color: priColors[t.priority] || '#6b7280',
                            background: `${priColors[t.priority] || '#6b7280'}15`,
                          }}>
                            {t.priority}
                          </span>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <span style={{
                            padding: '3px 10px', borderRadius: 12, fontSize: 11, fontWeight: 600,
                            background: t.status === 'resolved' ? '#dcfce7' : '#fef3c7',
                            color: t.status === 'resolved' ? '#166534' : '#92400e',
                          }}>
                            {t.status}
                          </span>
                        </td>
                        <td>{t.assigned_name || '—'}</td>
                        <td style={{ color: '#6b7280', fontSize: 12 }}>{t.created_at ? new Date(t.created_at).toLocaleDateString() : '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>No service tickets for this location.</div>
          )
        )}
      </div>
    </div>
  );
}
