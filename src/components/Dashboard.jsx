import { useApi } from '../hooks/useApi';
import { REVENUE_SEED } from '../data/locations';

const TARGET = 530000;
const CURRENT_MONTHLY = 41368;

const fmt = (n) => '$' + (n || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
const fmtCompact = (n) => {
  if (n >= 1000000) return '$' + (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000) return '$' + (n / 1000).toFixed(1) + 'K';
  return fmt(n);
};

const icons = {
  revenue: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
    </svg>
  ),
  chart: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>
    </svg>
  ),
  machine: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>
    </svg>
  ),
  bank: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 21h18"/><path d="M3 10h18"/><path d="M12 3l9 7H3z"/><path d="M5 10v8"/><path d="M19 10v8"/><path d="M9 10v8"/><path d="M15 10v8"/>
    </svg>
  ),
  alert: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
    </svg>
  ),
  check: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
    </svg>
  ),
  target: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>
    </svg>
  ),
};

const s = {
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 24 },
  kpi: (accent) => ({
    background: '#fff', borderRadius: 14, padding: '22px 24px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
    borderLeft: `4px solid ${accent}`, display: 'flex', alignItems: 'flex-start', gap: 16,
    transition: 'box-shadow 0.2s, transform 0.2s',
  }),
  kpiIcon: (accent) => ({
    width: 44, height: 44, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: accent + '14', color: accent, flexShrink: 0,
  }),
  kpiLabel: { fontSize: 12, fontWeight: 500, color: '#6b7280', margin: 0, letterSpacing: '0.02em' },
  kpiValue: { fontSize: 26, fontWeight: 800, margin: '2px 0 0', color: '#111827', lineHeight: 1.1 },
  kpiSub: { fontSize: 11, color: '#9ca3af', margin: '4px 0 0', fontWeight: 500 },
  section: {
    background: '#fff', borderRadius: 14, padding: '22px 24px', marginBottom: 16,
    boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
  },
  sectionTitle: { fontSize: 15, fontWeight: 700, margin: '0 0 14px', color: '#111827', display: 'flex', alignItems: 'center', gap: 8 },
  table: { width: '100%', borderCollapse: 'separate', borderSpacing: 0, fontSize: 13 },
  th: {
    textAlign: 'left', padding: '10px 14px', borderBottom: '2px solid #f3f4f6',
    color: '#6b7280', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em',
  },
  td: { padding: '10px 14px', borderBottom: '1px solid #f9fafb' },
  alert: (type) => ({
    padding: '10px 14px', borderRadius: 10, marginBottom: 8, fontSize: 13,
    display: 'flex', alignItems: 'center', gap: 10,
    background: type === 'danger' ? '#fef2f2' : type === 'warn' ? '#fffbeb' : '#f0fdf4',
    color: type === 'danger' ? '#991b1b' : type === 'warn' ? '#92400e' : '#166534',
    border: `1px solid ${type === 'danger' ? '#fecaca' : type === 'warn' ? '#fde68a' : '#bbf7d0'}`,
  }),
  progressWrap: { width: '100%', height: 10, background: '#f3f4f6', borderRadius: 10, overflow: 'hidden' },
  progressFill: (pct) => ({
    width: `${Math.min(pct, 100)}%`, height: '100%',
    background: 'linear-gradient(90deg, #4f46e5, #7c3aed)',
    borderRadius: 10, transition: 'width 0.6s ease',
  }),
  greeting: { fontSize: 22, fontWeight: 800, color: '#111827', margin: '0 0 4px' },
  greetingSub: { fontSize: 14, color: '#6b7280', margin: '0 0 24px', fontWeight: 400 },
  rank: (i) => ({
    width: 22, height: 22, borderRadius: 6, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 11, fontWeight: 700, marginRight: 8,
    background: i === 0 ? '#fef3c7' : i === 1 ? '#f3f4f6' : i === 2 ? '#fff7ed' : '#f9fafb',
    color: i === 0 ? '#92400e' : i === 1 ? '#6b7280' : i === 2 ? '#c2410c' : '#9ca3af',
  }),
};

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function Dashboard({ isAdmin = true, user }) {
  const { data: locations } = useApi('/api/locations');
  const { data: deposits } = useApi(isAdmin ? '/api/deposits' : null);
  const { data: overview } = useApi('/api/analytics/overview');

  const locs = locations || [];
  const hasReadings = locs.some(l => l.net > 0);

  const totalNet = hasReadings
    ? locs.reduce((s, l) => s + (l.net || 0), 0)
    : REVENUE_SEED.reduce((s, r) => s + r.net, 0);

  const totalGse = hasReadings
    ? locs.reduce((s, l) => s + (l.gse_share || 0), 0)
    : REVENUE_SEED.reduce((s, r) => s + r.gseRev, 0);

  const totalMachines = locs.reduce((s, l) => s + (l.machines || 0), 0) || 54;
  const totalLocations = locs.length || 13;
  const totalDeposits = (deposits || []).reduce((s, d) => s + d.amount, 0);
  const progressPct = (CURRENT_MONTHLY / TARGET) * 100;

  const revenueData = hasReadings
    ? locs.map(l => ({ name: l.name, net: l.net || 0, gseRev: l.gse_share || 0 }))
    : REVENUE_SEED.map(r => ({ name: r.name, net: r.net, gseRev: r.gseRev }));

  const alerts = [];
  revenueData.forEach(l => {
    if (l.net < 0) alerts.push({ type: 'danger', msg: `${l.name}: Negative net (${fmt(l.net)}) — paying out more than in` });
    if (l.net === 0) alerts.push({ type: 'warn', msg: `${l.name}: Zero activity — may be down` });
  });

  const topLocations = [...revenueData].sort((a, b) => b.gseRev - a.gseRev).slice(0, 5);

  return (
    <div>
      {/* Greeting */}
      <h1 style={s.greeting}>{getGreeting()}, {user?.name?.split(' ')[0] || 'Team'}</h1>
      <p style={s.greetingSub}>Here's how things are looking today.</p>

      {/* KPI Cards */}
      <div style={s.grid}>
        <div style={s.kpi('#4f46e5')}>
          <div style={s.kpiIcon('#4f46e5')}>{icons.revenue}</div>
          <div>
            <p style={s.kpiLabel}>Total Net Revenue</p>
            <p style={s.kpiValue}>{fmtCompact(totalNet)}</p>
            <p style={s.kpiSub}>{totalLocations} active locations</p>
          </div>
        </div>
        <div style={s.kpi('#7c3aed')}>
          <div style={s.kpiIcon('#7c3aed')}>{icons.chart}</div>
          <div>
            <p style={s.kpiLabel}>GSE Share</p>
            <p style={s.kpiValue}>{fmtCompact(totalGse)}</p>
            <p style={s.kpiSub}>After partner splits</p>
          </div>
        </div>
        <div style={s.kpi('#0891b2')}>
          <div style={s.kpiIcon('#0891b2')}>{icons.machine}</div>
          <div>
            <p style={s.kpiLabel}>Machines</p>
            <p style={s.kpiValue}>{totalMachines}</p>
            <p style={s.kpiSub}>{totalLocations} locations</p>
          </div>
        </div>
        {isAdmin && (
          <div style={s.kpi('#059669')}>
            <div style={s.kpiIcon('#059669')}>{icons.bank}</div>
            <div>
              <p style={s.kpiLabel}>Bank Deposits</p>
              <p style={s.kpiValue}>{fmtCompact(totalDeposits)}</p>
              <p style={s.kpiSub}>{(deposits || []).length} deposits</p>
            </div>
          </div>
        )}
      </div>

      {/* Target Progress */}
      <div style={s.section}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <h3 style={s.sectionTitle}>{icons.target} Monthly Target</h3>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#4f46e5' }}>
            {fmtCompact(CURRENT_MONTHLY)} <span style={{ color: '#9ca3af', fontWeight: 400 }}>of {fmtCompact(TARGET)}</span>
          </span>
        </div>
        <div style={s.progressWrap}>
          <div style={s.progressFill(progressPct)} />
        </div>
        <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 6 }}>
          {progressPct.toFixed(1)}% — {fmtCompact(TARGET - CURRENT_MONTHLY)} to go
        </p>
      </div>

      {/* Two-column: Top Locations + Alerts */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 16, marginBottom: 16 }}>
        <div style={s.section}>
          <h3 style={s.sectionTitle}>{icons.chart} Top Locations</h3>
          <table style={s.table}>
            <thead>
              <tr>
                <th style={s.th}>#</th>
                <th style={s.th}>Location</th>
                <th style={{ ...s.th, textAlign: 'right' }}>Net</th>
                <th style={{ ...s.th, textAlign: 'right' }}>GSE Share</th>
              </tr>
            </thead>
            <tbody>
              {topLocations.map((l, i) => (
                <tr key={l.name} style={{ background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                  <td style={s.td}><span style={s.rank(i)}>{i + 1}</span></td>
                  <td style={{ ...s.td, fontWeight: 600, color: '#1f2937' }}>{l.name}</td>
                  <td style={{ ...s.td, textAlign: 'right', fontFamily: 'monospace', fontSize: 13 }}>{fmt(l.net)}</td>
                  <td style={{ ...s.td, textAlign: 'right', fontWeight: 700, color: '#059669', fontFamily: 'monospace', fontSize: 13 }}>{fmt(l.gseRev)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={s.section}>
          <h3 style={s.sectionTitle}>{icons.alert} Alerts</h3>
          {alerts.length === 0 ? (
            <div style={{ ...s.alert('success'), marginBottom: 0 }}>
              {icons.check}
              <span>All locations performing normally.</span>
            </div>
          ) : (
            alerts.map((a, i) => (
              <div key={i} style={s.alert(a.type)}>
                {icons.alert}
                <span>{a.msg}</span>
              </div>
            ))
          )}
          {overview && (
            <div style={{ marginTop: 16, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div style={{ background: '#f9fafb', borderRadius: 10, padding: '12px 14px', textAlign: 'center' }}>
                <div style={{ fontSize: 20, fontWeight: 800, color: '#4f46e5' }}>{overview.activeLeads || 0}</div>
                <div style={{ fontSize: 11, color: '#6b7280', fontWeight: 500 }}>Active Leads</div>
              </div>
              <div style={{ background: '#f9fafb', borderRadius: 10, padding: '12px 14px', textAlign: 'center' }}>
                <div style={{ fontSize: 20, fontWeight: 800, color: '#f59e0b' }}>{overview.openTickets || 0}</div>
                <div style={{ fontSize: 11, color: '#6b7280', fontWeight: 500 }}>Open Tickets</div>
              </div>
              <div style={{ background: '#f9fafb', borderRadius: 10, padding: '12px 14px', textAlign: 'center' }}>
                <div style={{ fontSize: 20, fontWeight: 800, color: '#059669' }}>{overview.liveLeads || 0}</div>
                <div style={{ fontSize: 11, color: '#6b7280', fontWeight: 500 }}>Live Deals</div>
              </div>
              <div style={{ background: '#f9fafb', borderRadius: 10, padding: '12px 14px', textAlign: 'center' }}>
                <div style={{ fontSize: 20, fontWeight: 800, color: '#ef4444' }}>{overview.overdueTaskCount || 0}</div>
                <div style={{ fontSize: 11, color: '#6b7280', fontWeight: 500 }}>Overdue Tasks</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Recent Deposits - Admin only */}
      {isAdmin && deposits && deposits.length > 0 && (
        <div style={s.section}>
          <h3 style={s.sectionTitle}>{icons.bank} Recent Deposits</h3>
          <table style={s.table}>
            <thead>
              <tr>
                <th style={s.th}>Date</th>
                <th style={s.th}>Bank</th>
                <th style={s.th}>Reference</th>
                <th style={{ ...s.th, textAlign: 'right' }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {deposits.slice(0, 5).map((d, i) => (
                <tr key={d.id} style={{ background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                  <td style={s.td}>{d.date}</td>
                  <td style={s.td}>{d.bank}</td>
                  <td style={{ ...s.td, color: '#6b7280' }}>{d.ref || '—'}</td>
                  <td style={{ ...s.td, textAlign: 'right', fontWeight: 700, fontFamily: 'monospace' }}>{fmt(d.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
