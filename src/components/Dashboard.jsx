import { useApi } from '../hooks/useApi';
import { REVENUE_SEED } from '../data/locations';

const TARGET = 530000;
const CURRENT_MONTHLY = 41368;

const card = (bg) => ({
  background: bg,
  color: '#fff',
  borderRadius: 12,
  padding: '20px 24px',
  flex: '1 1 200px',
  minWidth: 200,
});

const styles = {
  grid: { display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 24 },
  cardLabel: { fontSize: 12, opacity: 0.8, margin: 0 },
  cardValue: { fontSize: 28, fontWeight: 700, margin: '4px 0' },
  cardSub: { fontSize: 12, opacity: 0.7, margin: 0 },
  section: { background: '#fff', borderRadius: 12, padding: 20, marginBottom: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' },
  sectionTitle: { fontSize: 16, fontWeight: 600, margin: '0 0 12px', color: '#1a1a2e' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 13 },
  th: { textAlign: 'left', padding: '8px 12px', borderBottom: '2px solid #e5e7eb', color: '#6b7280', fontWeight: 500, fontSize: 11, textTransform: 'uppercase' },
  td: { padding: '8px 12px', borderBottom: '1px solid #f3f4f6' },
  alert: (type) => ({
    padding: '10px 14px',
    borderRadius: 8,
    marginBottom: 8,
    fontSize: 13,
    background: type === 'danger' ? '#fef2f2' : type === 'warn' ? '#fffbeb' : '#f0fdf4',
    color: type === 'danger' ? '#991b1b' : type === 'warn' ? '#92400e' : '#166534',
    border: `1px solid ${type === 'danger' ? '#fecaca' : type === 'warn' ? '#fde68a' : '#bbf7d0'}`,
  }),
  progressBar: { width: '100%', height: 24, background: '#e5e7eb', borderRadius: 12, overflow: 'hidden', marginTop: 8 },
  progressFill: (pct) => ({ width: `${Math.min(pct, 100)}%`, height: '100%', background: 'linear-gradient(90deg, #4f46e5, #7c3aed)', borderRadius: 12, transition: 'width 0.5s' }),
};

const fmt = (n) => '$' + (n || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

export default function Dashboard({ isAdmin = true }) {
  const { data: locations } = useApi('/api/locations');
  const { data: deposits } = useApi(isAdmin ? '/api/deposits' : '/api/health');

  // Use API data if readings exist, otherwise seed data
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

  // Alerts
  const alerts = [];
  const revenueData = hasReadings
    ? locs.map(l => ({ name: l.name, net: l.net || 0, gseRev: l.gse_share || 0 }))
    : REVENUE_SEED.map(r => ({ name: r.name, net: r.net, gseRev: r.gseRev }));

  revenueData.forEach(l => {
    if (l.net < 0) alerts.push({ type: 'danger', msg: `${l.name}: Negative net ($${l.net}) — machine paying out more than taking in` });
    if (l.net === 0) alerts.push({ type: 'warn', msg: `${l.name}: Zero activity — machine may be down` });
  });

  const topLocations = [...revenueData].sort((a, b) => b.gseRev - a.gseRev).slice(0, 5);

  return (
    <div>
      <div style={styles.grid}>
        <div style={card('#4f46e5')}>
          <p style={styles.cardLabel}>Total Net Revenue</p>
          <p style={styles.cardValue}>{fmt(totalNet)}</p>
          <p style={styles.cardSub}>{totalLocations} locations</p>
        </div>
        <div style={card('#7c3aed')}>
          <p style={styles.cardLabel}>GSE Share</p>
          <p style={styles.cardValue}>{fmt(totalGse)}</p>
          <p style={styles.cardSub}>After partner splits</p>
        </div>
        <div style={card('#0891b2')}>
          <p style={styles.cardLabel}>Machines</p>
          <p style={styles.cardValue}>{totalMachines}</p>
          <p style={styles.cardSub}>Across {totalLocations} locations</p>
        </div>
        {isAdmin && (
          <div style={card('#059669')}>
            <p style={styles.cardLabel}>Bank Deposits</p>
            <p style={styles.cardValue}>{fmt(totalDeposits)}</p>
            <p style={styles.cardSub}>{(deposits || []).length} deposits</p>
          </div>
        )}
      </div>

      {/* Target Progress */}
      <div style={styles.section}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={styles.sectionTitle}>Progress to $530K/mo Target</h3>
          <span style={{ fontSize: 13, color: '#6b7280' }}>{fmt(CURRENT_MONTHLY)} / {fmt(TARGET)} ({progressPct.toFixed(1)}%)</span>
        </div>
        <div style={styles.progressBar}>
          <div style={styles.progressFill(progressPct)} />
        </div>
      </div>

      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        {/* Top Locations */}
        <div style={{ ...styles.section, flex: '1 1 400px' }}>
          <h3 style={styles.sectionTitle}>Top Locations by GSE Revenue</h3>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Location</th>
                <th style={{ ...styles.th, textAlign: 'right' }}>Net</th>
                <th style={{ ...styles.th, textAlign: 'right' }}>GSE Share</th>
              </tr>
            </thead>
            <tbody>
              {topLocations.map(l => (
                <tr key={l.name}>
                  <td style={styles.td}>{l.name}</td>
                  <td style={{ ...styles.td, textAlign: 'right' }}>{fmt(l.net)}</td>
                  <td style={{ ...styles.td, textAlign: 'right', fontWeight: 600, color: '#059669' }}>{fmt(l.gseRev)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Alerts */}
        <div style={{ ...styles.section, flex: '1 1 300px' }}>
          <h3 style={styles.sectionTitle}>Alerts</h3>
          {alerts.length === 0 ? (
            <p style={{ color: '#6b7280', fontSize: 13 }}>No alerts — all locations performing normally.</p>
          ) : (
            alerts.map((a, i) => <div key={i} style={styles.alert(a.type)}>{a.msg}</div>)
          )}
        </div>
      </div>

      {/* Recent Deposits - Admin only */}
      {isAdmin && (
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>Recent Deposits</h3>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Date</th>
                <th style={styles.th}>Bank</th>
                <th style={styles.th}>Ref</th>
                <th style={{ ...styles.th, textAlign: 'right' }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {(deposits || []).slice(0, 5).map(d => (
                <tr key={d.id}>
                  <td style={styles.td}>{d.date}</td>
                  <td style={styles.td}>{d.bank}</td>
                  <td style={styles.td}>{d.ref}</td>
                  <td style={{ ...styles.td, textAlign: 'right', fontWeight: 600 }}>{fmt(d.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
