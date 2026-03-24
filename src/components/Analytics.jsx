import { useApi } from '../hooks/useApi';
import { useState } from 'react';

const styles = {
  grid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 },
  card: { background: '#fff', borderRadius: 10, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' },
  fullCard: { background: '#fff', borderRadius: 10, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.08)', marginBottom: 20 },
  h3: { margin: '0 0 16px', fontSize: 16, fontWeight: 600 },
  stat: { fontSize: 32, fontWeight: 700, color: '#4f46e5' },
  statLabel: { fontSize: 12, color: '#6b7280' },
  bar: (pct, color) => ({ height: 24, width: `${Math.max(pct, 2)}%`, background: color, borderRadius: 4, transition: 'width 0.3s', minWidth: 2 }),
  barRow: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 },
  barLabel: { width: 100, fontSize: 12, fontWeight: 500, textAlign: 'right', flexShrink: 0 },
  barValue: { fontSize: 12, fontWeight: 600, color: '#374151', minWidth: 30 },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 13 },
  th: { textAlign: 'left', padding: '8px 12px', borderBottom: '2px solid #e5e7eb', fontWeight: 600, color: '#374151', fontSize: 12 },
  td: { padding: '8px 12px', borderBottom: '1px solid #f3f4f6' },
  topStats: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12, marginBottom: 20 },
  topStat: (color) => ({ background: color, color: '#fff', borderRadius: 12, padding: '16px 20px' }),
  topStatLabel: { fontSize: 12, opacity: 0.8 },
  topStatValue: { fontSize: 28, fontWeight: 700 },
  dateRow: { display: 'flex', gap: 12, marginBottom: 20, alignItems: 'center' },
  dateInput: { padding: '6px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13 },
};

const fmt = (n) => '$' + (n || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

export default function Analytics() {
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const { data: overview } = useApi('/api/analytics/overview');
  const { data: funnel } = useApi('/api/analytics/lead-funnel');
  const { data: revTrend } = useApi('/api/analytics/revenue-trend');
  const { data: jvl } = useApi('/api/analytics/jvl-analysis');
  const { data: depTrend } = useApi('/api/analytics/deposit-trend');
  const { data: revByLoc } = useApi(`/api/analytics/revenue-by-location?start=${dateRange.start}&end=${dateRange.end}`);

  const maxFunnel = funnel ? Math.max(...Object.values(funnel.stages || {}), 1) : 1;

  const STAGE_COLORS = {
    prospect: '#6b7280', initial_contact: '#3b82f6', site_visit_scheduled: '#8b5cf6',
    site_qualified: '#06b6d4', proposal_sent: '#f59e0b', agreement_signed: '#10b981',
    licensing: '#ec4899', install_scheduled: '#14b8a6', live: '#22c55e', lost: '#ef4444',
  };

  return (
    <div>
      {/* Top Stats */}
      {overview && (
        <div style={styles.topStats}>
          <div style={styles.topStat('#4f46e5')}>
            <div style={styles.topStatLabel}>Total Leads</div>
            <div style={styles.topStatValue}>{overview.totalLeads}</div>
          </div>
          <div style={styles.topStat('#7c3aed')}>
            <div style={styles.topStatLabel}>Active Pipeline</div>
            <div style={styles.topStatValue}>{overview.activeLeads}</div>
          </div>
          <div style={styles.topStat('#059669')}>
            <div style={styles.topStatLabel}>Live Locations</div>
            <div style={styles.topStatValue}>{overview.liveLeads}</div>
          </div>
          <div style={styles.topStat('#0891b2')}>
            <div style={styles.topStatLabel}>This Month Revenue</div>
            <div style={styles.topStatValue}>{fmt(overview.thisMonth)}</div>
          </div>
          <div style={styles.topStat(overview.thisMonth >= overview.lastMonth ? '#059669' : '#ef4444')}>
            <div style={styles.topStatLabel}>vs Last Month</div>
            <div style={styles.topStatValue}>
              {overview.lastMonth > 0 ? ((overview.thisMonth - overview.lastMonth) / overview.lastMonth * 100).toFixed(0) + '%' : '—'}
            </div>
          </div>
          <div style={styles.topStat('#ef4444')}>
            <div style={styles.topStatLabel}>Overdue Tasks</div>
            <div style={styles.topStatValue}>{overview.overdueTaskCount}</div>
          </div>
        </div>
      )}

      <div style={styles.grid}>
        {/* Lead Funnel */}
        <div style={styles.card}>
          <h3 style={styles.h3}>Lead Conversion Funnel</h3>
          {funnel && (
            <>
              <div style={{ display: 'flex', gap: 20, marginBottom: 16 }}>
                <div><div style={styles.stat}>{funnel.conversionRate}%</div><div style={styles.statLabel}>Conversion Rate</div></div>
                <div><div style={{ ...styles.stat, color: '#059669' }}>{funnel.winRate}%</div><div style={styles.statLabel}>Win Rate</div></div>
              </div>
              {Object.entries(funnel.stages || {}).map(([stage, count]) => (
                <div key={stage} style={styles.barRow}>
                  <div style={styles.barLabel}>{stage.replace(/_/g, ' ')}</div>
                  <div style={{ flex: 1 }}>
                    <div style={styles.bar((count / maxFunnel) * 100, STAGE_COLORS[stage] || '#6b7280')} />
                  </div>
                  <div style={styles.barValue}>{count}</div>
                </div>
              ))}
            </>
          )}
        </div>

        {/* JVL Pipeline Analysis */}
        <div style={styles.card}>
          <h3 style={styles.h3}>JVL Pipeline Analysis</h3>
          {jvl && (
            <>
              <div style={{ display: 'flex', gap: 20, marginBottom: 16 }}>
                <div><div style={styles.stat}>{jvl.winRate}%</div><div style={styles.statLabel}>Win Rate</div></div>
                <div><div style={{ ...styles.stat, color: '#059669' }}>{fmt(jvl.avgDealSize)}</div><div style={styles.statLabel}>Avg Deal</div></div>
                <div><div style={{ ...styles.stat, color: '#7c3aed' }}>{jvl.totalDeals}</div><div style={styles.statLabel}>Total Deals</div></div>
              </div>
              <table style={styles.table}>
                <thead><tr><th style={styles.th}>Stage</th><th style={{ ...styles.th, textAlign: 'right' }}>Deals</th><th style={{ ...styles.th, textAlign: 'right' }}>Commission</th></tr></thead>
                <tbody>
                  {(jvl.byStage || []).map(s => (
                    <tr key={s.stage}><td style={styles.td}>{s.stage}</td><td style={{ ...styles.td, textAlign: 'right' }}>{s.count}</td><td style={{ ...styles.td, textAlign: 'right' }}>{fmt(s.total_commission)}</td></tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </div>
      </div>

      {/* Revenue Trend */}
      <div style={styles.fullCard}>
        <h3 style={styles.h3}>Revenue Trend (Monthly)</h3>
        {revTrend && revTrend.length > 0 ? (
          <div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 200, padding: '0 8px' }}>
              {revTrend.map((m, i) => {
                const maxRev = Math.max(...revTrend.map(r => r.total_net || 0), 1);
                const h = ((m.total_net || 0) / maxRev) * 180;
                return (
                  <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                    <span style={{ fontSize: 10, fontWeight: 600 }}>{fmt(m.total_net)}</span>
                    <div style={{ width: '80%', height: Math.max(h, 2), background: 'linear-gradient(180deg, #4f46e5, #7c3aed)', borderRadius: '4px 4px 0 0' }} />
                    <span style={{ fontSize: 10, color: '#6b7280' }}>{m.month}</span>
                  </div>
                );
              })}
            </div>
            <table style={{ ...styles.table, marginTop: 16 }}>
              <thead><tr><th style={styles.th}>Month</th><th style={{ ...styles.th, textAlign: 'right' }}>Net Revenue</th><th style={{ ...styles.th, textAlign: 'right' }}>GSE Share</th><th style={{ ...styles.th, textAlign: 'right' }}>Partner Share</th><th style={{ ...styles.th, textAlign: 'right' }}>Locations</th></tr></thead>
              <tbody>
                {revTrend.map(m => (
                  <tr key={m.month}>
                    <td style={styles.td}>{m.month}</td>
                    <td style={{ ...styles.td, textAlign: 'right', fontWeight: 600 }}>{fmt(m.total_net)}</td>
                    <td style={{ ...styles.td, textAlign: 'right', color: '#059669' }}>{fmt(m.gse_share)}</td>
                    <td style={{ ...styles.td, textAlign: 'right', color: '#f59e0b' }}>{fmt(m.partner_share)}</td>
                    <td style={{ ...styles.td, textAlign: 'right' }}>{m.locations}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p style={{ color: '#9ca3af', fontSize: 13 }}>No revenue data yet. Import meter readings to see trends.</p>
        )}
      </div>

      {/* Revenue by Location with date filter */}
      <div style={styles.fullCard}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
          <h3 style={{ ...styles.h3, margin: 0 }}>Revenue by Location</h3>
          <div style={styles.dateRow}>
            <input type="date" style={styles.dateInput} value={dateRange.start} onChange={e => setDateRange(d => ({ ...d, start: e.target.value }))} />
            <span style={{ color: '#6b7280', fontSize: 13 }}>to</span>
            <input type="date" style={styles.dateInput} value={dateRange.end} onChange={e => setDateRange(d => ({ ...d, end: e.target.value }))} />
            {(dateRange.start || dateRange.end) && (
              <button onClick={() => setDateRange({ start: '', end: '' })} style={{ padding: '4px 10px', borderRadius: 4, border: 'none', cursor: 'pointer', fontSize: 11, background: '#e5e7eb', color: '#374151' }}>Clear</button>
            )}
          </div>
        </div>
        <table style={styles.table}>
          <thead><tr><th style={styles.th}>Location</th><th style={{ ...styles.th, textAlign: 'right' }}>Machines</th><th style={{ ...styles.th, textAlign: 'right' }}>Net Revenue</th><th style={{ ...styles.th, textAlign: 'right' }}>GSE %</th><th style={{ ...styles.th, textAlign: 'right' }}>GSE Share</th><th style={{ ...styles.th, textAlign: 'right' }}>Readings</th></tr></thead>
          <tbody>
            {(revByLoc || []).map(l => (
              <tr key={l.name}>
                <td style={styles.td}>{l.name}</td>
                <td style={{ ...styles.td, textAlign: 'right' }}>{l.machines}</td>
                <td style={{ ...styles.td, textAlign: 'right', fontWeight: 600 }}>{fmt(l.total_net)}</td>
                <td style={{ ...styles.td, textAlign: 'right' }}>{l.gse_pct}%</td>
                <td style={{ ...styles.td, textAlign: 'right', color: '#059669', fontWeight: 600 }}>{fmt(l.gse_share)}</td>
                <td style={{ ...styles.td, textAlign: 'right' }}>{l.reading_dates}</td>
              </tr>
            ))}
            {(revByLoc || []).length === 0 && (
              <tr><td colSpan={6} style={{ ...styles.td, textAlign: 'center', color: '#9ca3af', padding: 20 }}>No data</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Deposit Trend */}
      <div style={styles.fullCard}>
        <h3 style={styles.h3}>Deposit Trend</h3>
        {depTrend && depTrend.length > 0 ? (
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 160, padding: '0 8px' }}>
            {depTrend.map((m, i) => {
              const maxDep = Math.max(...depTrend.map(r => r.total || 0), 1);
              const h = ((m.total || 0) / maxDep) * 140;
              return (
                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                  <span style={{ fontSize: 10, fontWeight: 600 }}>{fmt(m.total)}</span>
                  <div style={{ width: '80%', height: Math.max(h, 2), background: 'linear-gradient(180deg, #059669, #10b981)', borderRadius: '4px 4px 0 0' }} />
                  <span style={{ fontSize: 10, color: '#6b7280' }}>{m.month}</span>
                </div>
              );
            })}
          </div>
        ) : (
          <p style={{ color: '#9ca3af', fontSize: 13 }}>No deposit data yet.</p>
        )}
      </div>
    </div>
  );
}
