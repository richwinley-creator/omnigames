import { useState } from 'react';
import { useApi } from '../hooks/useApi';

const fmt = (n) => '$' + (n || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
const fmtK = (n) => n >= 1000 ? '$' + (n / 1000).toFixed(1) + 'K' : fmt(n);

const s = {
  card: { background: '#fff', borderRadius: 14, padding: '22px 24px', marginBottom: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' },
  h2: { margin: '0 0 4px', fontSize: 20, fontWeight: 700 },
  sub: { margin: '0 0 20px', fontSize: 13, color: '#9ca3af' },
  tabs: { display: 'flex', gap: 2, background: '#f3f4f6', borderRadius: 8, padding: 3, marginBottom: 20, width: 'fit-content' },
  tab: (active) => ({
    padding: '7px 16px', borderRadius: 6, border: 'none', cursor: 'pointer',
    fontSize: 13, fontWeight: active ? 600 : 500,
    background: active ? '#fff' : 'transparent', color: active ? '#111827' : '#6b7280',
    boxShadow: active ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
  }),
  th: { textAlign: 'left', padding: '10px 14px', borderBottom: '2px solid #f3f4f6', color: '#6b7280', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' },
  td: { padding: '10px 14px', borderBottom: '1px solid #f9fafb' },
  select: { padding: '7px 12px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 13, background: '#fff' },
};

function WeekLabel({ start, end }) {
  if (!start) return '—';
  const d = new Date(start + 'T00:00:00');
  const e = end ? new Date(end + 'T00:00:00') : d;
  const mo = d.toLocaleDateString('en-US', { month: 'short' });
  const emo = e.toLocaleDateString('en-US', { month: 'short' });
  return `${mo} ${d.getDate()}–${mo !== emo ? emo + ' ' : ''}${e.getDate()}`;
}

function BarChart({ data, valueKey, maxVal, color }) {
  if (!data || data.length === 0) return null;
  const max = maxVal || Math.max(...data.map(d => d[valueKey] || 0), 1);
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
              {d.week_start ? new Date(d.week_start + 'T00:00:00').toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' }) : d.month?.slice(5)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export default function Revenue() {
  const [view, setView] = useState('weekly');
  const [locationFilter, setLocationFilter] = useState('');
  const { data: weekly } = useApi(`/api/analytics/revenue-weekly?weeks=12${locationFilter ? '&location_id=' + locationFilter : ''}`);
  const { data: monthly } = useApi('/api/analytics/revenue-trend?months=12');
  const { data: locations } = useApi('/api/locations');
  const { data: byLoc } = useApi('/api/analytics/revenue-by-location');

  const data = view === 'weekly' ? weekly : monthly;
  const hasData = data && data.length > 0;

  // Totals
  const totalNet = hasData ? data.reduce((s, d) => s + (d.total_net || 0), 0) : 0;
  const totalGse = hasData ? data.reduce((s, d) => s + (d.gse_share || 0), 0) : 0;

  // Week-over-week change
  let wow = null;
  if (view === 'weekly' && weekly && weekly.length >= 2) {
    const curr = weekly[weekly.length - 1]?.total_net || 0;
    const prev = weekly[weekly.length - 2]?.total_net || 0;
    if (prev > 0) wow = ((curr - prev) / prev * 100).toFixed(0);
  }

  return (
    <div>
      <h2 style={s.h2}>Revenue</h2>
      <p style={s.sub}>Track net revenue, GSE share, and partner splits over time.</p>

      {/* Controls */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 20, flexWrap: 'wrap' }}>
        <div style={s.tabs}>
          <button style={s.tab(view === 'weekly')} onClick={() => setView('weekly')}>Weekly</button>
          <button style={s.tab(view === 'monthly')} onClick={() => setView('monthly')}>Monthly</button>
        </div>
        {view === 'weekly' && (
          <select style={s.select} value={locationFilter} onChange={e => setLocationFilter(e.target.value)}>
            <option value="">All Locations</option>
            {(locations || []).map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
        )}
      </div>

      {/* KPI row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 20 }}>
        <div style={{ ...s.card, borderLeft: '4px solid #b8943d', marginBottom: 0 }}>
          <div style={{ fontSize: 11, color: '#6b7280', fontWeight: 500 }}>Total Net Revenue</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#111827' }}>{fmtK(totalNet)}</div>
          <div style={{ fontSize: 11, color: '#9ca3af' }}>{data?.length || 0} {view === 'weekly' ? 'weeks' : 'months'}</div>
        </div>
        <div style={{ ...s.card, borderLeft: '4px solid #059669', marginBottom: 0 }}>
          <div style={{ fontSize: 11, color: '#6b7280', fontWeight: 500 }}>GSE Share</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#059669' }}>{fmtK(totalGse)}</div>
          <div style={{ fontSize: 11, color: '#9ca3af' }}>after partner splits</div>
        </div>
        {wow !== null && (
          <div style={{ ...s.card, borderLeft: `4px solid ${parseInt(wow) >= 0 ? '#059669' : '#ef4444'}`, marginBottom: 0 }}>
            <div style={{ fontSize: 11, color: '#6b7280', fontWeight: 500 }}>Week over Week</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: parseInt(wow) >= 0 ? '#059669' : '#ef4444' }}>
              {parseInt(wow) >= 0 ? '+' : ''}{wow}%
            </div>
            <div style={{ fontSize: 11, color: '#9ca3af' }}>vs previous week</div>
          </div>
        )}
      </div>

      {/* Chart */}
      {hasData && (
        <div style={s.card}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#111827', marginBottom: 14 }}>
            {view === 'weekly' ? 'Weekly' : 'Monthly'} Net Revenue
          </div>
          <BarChart data={data} valueKey="total_net" color="#b8943d" />
        </div>
      )}

      {/* GSE Share chart */}
      {hasData && (
        <div style={s.card}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#111827', marginBottom: 14 }}>
            {view === 'weekly' ? 'Weekly' : 'Monthly'} GSE Share
          </div>
          <BarChart data={data} valueKey="gse_share" color="#059669" />
        </div>
      )}

      {/* Table */}
      {hasData && (
        <div style={s.card}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#111827', marginBottom: 14 }}>
            {view === 'weekly' ? 'Week by Week' : 'Month by Month'} Breakdown
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, fontSize: 13 }}>
              <thead>
                <tr>
                  <th style={s.th}>{view === 'weekly' ? 'Week' : 'Month'}</th>
                  <th style={{ ...s.th, textAlign: 'right' }}>Net Revenue</th>
                  <th style={{ ...s.th, textAlign: 'right' }}>GSE Share</th>
                  <th style={{ ...s.th, textAlign: 'right' }}>Partner Share</th>
                  <th style={{ ...s.th, textAlign: 'right' }}>Locations</th>
                  <th style={{ ...s.th, textAlign: 'right' }}>Change</th>
                </tr>
              </thead>
              <tbody>
                {[...data].reverse().map((d, i, arr) => {
                  const prev = arr[i + 1]?.total_net || 0;
                  const curr = d.total_net || 0;
                  const change = prev > 0 ? ((curr - prev) / prev * 100).toFixed(0) : null;
                  return (
                    <tr key={i} style={{ background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                      <td style={{ ...s.td, fontWeight: 600 }}>
                        {view === 'weekly' ? <WeekLabel start={d.week_start} end={d.week_end} /> : d.month}
                      </td>
                      <td style={{ ...s.td, textAlign: 'right', fontFamily: 'monospace', fontWeight: 700 }}>{fmt(curr)}</td>
                      <td style={{ ...s.td, textAlign: 'right', fontFamily: 'monospace', color: '#059669' }}>{fmt(d.gse_share)}</td>
                      <td style={{ ...s.td, textAlign: 'right', fontFamily: 'monospace', color: '#f59e0b' }}>{fmt(d.partner_share)}</td>
                      <td style={{ ...s.td, textAlign: 'right' }}>{d.locations || d.locations_count || '—'}</td>
                      <td style={{ ...s.td, textAlign: 'right', fontWeight: 600, color: change === null ? '#9ca3af' : parseInt(change) >= 0 ? '#059669' : '#ef4444' }}>
                        {change === null ? '—' : `${parseInt(change) >= 0 ? '+' : ''}${change}%`}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Revenue by location */}
      {byLoc && byLoc.length > 0 && (
        <div style={s.card}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#111827', marginBottom: 14 }}>
            Revenue by Location (All Time)
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, fontSize: 13 }}>
              <thead>
                <tr>
                  <th style={s.th}>Location</th>
                  <th style={{ ...s.th, textAlign: 'right' }}>Machines</th>
                  <th style={{ ...s.th, textAlign: 'right' }}>Net Revenue</th>
                  <th style={{ ...s.th, textAlign: 'right' }}>GSE %</th>
                  <th style={{ ...s.th, textAlign: 'right' }}>GSE Share</th>
                </tr>
              </thead>
              <tbody>
                {byLoc.map((l, i) => (
                  <tr key={l.name} style={{ background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                    <td style={{ ...s.td, fontWeight: 600 }}>{l.name}</td>
                    <td style={{ ...s.td, textAlign: 'right' }}>{l.machines}</td>
                    <td style={{ ...s.td, textAlign: 'right', fontFamily: 'monospace', fontWeight: 700 }}>{fmt(l.total_net)}</td>
                    <td style={{ ...s.td, textAlign: 'right' }}>{l.gse_pct}%</td>
                    <td style={{ ...s.td, textAlign: 'right', fontFamily: 'monospace', color: '#059669', fontWeight: 700 }}>{fmt(l.gse_share)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!hasData && (
        <div style={{ ...s.card, textAlign: 'center', padding: 60, color: '#9ca3af' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📊</div>
          <div style={{ fontSize: 16, fontWeight: 600, color: '#374151', marginBottom: 4 }}>No revenue data yet</div>
          <div style={{ fontSize: 13 }}>Import meter readings to see weekly and monthly revenue trends.</div>
        </div>
      )}
    </div>
  );
}
