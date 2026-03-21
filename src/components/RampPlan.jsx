import { RAMP_PLAN } from '../data/locations';

const TARGET = 530000;

const styles = {
  section: { background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' },
  title: { fontSize: 18, fontWeight: 600, margin: '0 0 4px', color: '#1a1a2e' },
  subtitle: { fontSize: 13, color: '#6b7280', margin: '0 0 20px' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 13 },
  th: { textAlign: 'left', padding: '10px 12px', borderBottom: '2px solid #e5e7eb', color: '#6b7280', fontWeight: 500, fontSize: 11, textTransform: 'uppercase' },
  td: { padding: '10px 12px', borderBottom: '1px solid #f3f4f6' },
  chart: { marginBottom: 24 },
  bar: (pct, color) => ({
    height: 28,
    width: `${Math.min(pct, 100)}%`,
    background: color,
    borderRadius: '0 4px 4px 0',
    display: 'flex',
    alignItems: 'center',
    paddingLeft: 8,
    fontSize: 11,
    color: '#fff',
    fontWeight: 600,
    minWidth: pct > 0 ? 40 : 0,
    transition: 'width 0.3s',
  }),
  barRow: { display: 'flex', alignItems: 'center', marginBottom: 4, gap: 8 },
  barLabel: { width: 40, fontSize: 12, fontWeight: 500, color: '#374151', textAlign: 'right' },
  targetLine: { fontSize: 11, color: '#ef4444', fontWeight: 600, textAlign: 'right', marginBottom: 8 },
};

const fmt = (n) => '$' + (n / 1000).toFixed(0) + 'k';

export default function RampPlan() {
  const maxTotal = Math.max(...RAMP_PLAN.map(r => r.routeGse + r.jvlRev), TARGET);

  return (
    <div style={styles.section}>
      <h2 style={styles.title}>2026 Revenue Ramp Plan</h2>
      <p style={styles.subtitle}>Target: $530K/month GSE revenue by December 2026. Route (supply-constrained) + JVL game sales (uncapped).</p>

      {/* Visual chart */}
      <div style={styles.chart}>
        <div style={styles.targetLine}>Target: $530K ↓</div>
        {RAMP_PLAN.map(r => {
          const total = r.routeGse + r.jvlRev;
          const routePct = (r.routeGse / maxTotal) * 100;
          const jvlPct = (r.jvlRev / maxTotal) * 100;
          const hitTarget = total >= TARGET;
          return (
            <div key={r.month} style={styles.barRow}>
              <span style={styles.barLabel}>{r.month}</span>
              <div style={{ flex: 1, display: 'flex', background: '#f3f4f6', borderRadius: 4, overflow: 'hidden', position: 'relative' }}>
                <div style={styles.bar(routePct, '#4f46e5')}>{routePct > 8 ? fmt(r.routeGse) : ''}</div>
                <div style={styles.bar(jvlPct, '#7c3aed')}>{jvlPct > 8 ? fmt(r.jvlRev) : ''}</div>
                {/* Target marker */}
                <div style={{
                  position: 'absolute',
                  left: `${(TARGET / maxTotal) * 100}%`,
                  top: 0,
                  bottom: 0,
                  width: 2,
                  background: '#ef4444',
                }} />
              </div>
              <span style={{ fontSize: 12, fontWeight: hitTarget ? 700 : 400, color: hitTarget ? '#059669' : '#374151', width: 60, textAlign: 'right' }}>
                {fmt(total)} {hitTarget ? '✓' : ''}
              </span>
            </div>
          );
        })}
        <div style={{ display: 'flex', gap: 16, marginTop: 12, fontSize: 12 }}>
          <span><span style={{ display: 'inline-block', width: 12, height: 12, background: '#4f46e5', borderRadius: 2, marginRight: 4, verticalAlign: 'middle' }}></span> Route GSE</span>
          <span><span style={{ display: 'inline-block', width: 12, height: 12, background: '#7c3aed', borderRadius: 2, marginRight: 4, verticalAlign: 'middle' }}></span> JVL Sales</span>
          <span><span style={{ display: 'inline-block', width: 12, height: 2, background: '#ef4444', marginRight: 4, verticalAlign: 'middle' }}></span> $530K Target</span>
        </div>
      </div>

      {/* Data table */}
      <div style={{ overflowX: 'auto' }}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Month</th>
              <th style={{ ...styles.th, textAlign: 'center' }}>Kiosks Added</th>
              <th style={{ ...styles.th, textAlign: 'center' }}>Total Machines</th>
              <th style={{ ...styles.th, textAlign: 'right' }}>Route GSE</th>
              <th style={{ ...styles.th, textAlign: 'center' }}>JVL Reps</th>
              <th style={{ ...styles.th, textAlign: 'right' }}>JVL Revenue</th>
              <th style={{ ...styles.th, textAlign: 'right' }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {RAMP_PLAN.map(r => {
              const total = r.routeGse + r.jvlRev;
              const hit = total >= TARGET;
              return (
                <tr key={r.month} style={hit ? { background: '#f0fdf4' } : {}}>
                  <td style={{ ...styles.td, fontWeight: 500 }}>{r.month} 2026</td>
                  <td style={{ ...styles.td, textAlign: 'center' }}>{r.kiosks}</td>
                  <td style={{ ...styles.td, textAlign: 'center' }}>{r.machines}</td>
                  <td style={{ ...styles.td, textAlign: 'right' }}>{fmt(r.routeGse)}</td>
                  <td style={{ ...styles.td, textAlign: 'center' }}>{r.jvlReps}</td>
                  <td style={{ ...styles.td, textAlign: 'right' }}>{fmt(r.jvlRev)}</td>
                  <td style={{ ...styles.td, textAlign: 'right', fontWeight: 700, color: hit ? '#059669' : '#374151' }}>
                    {fmt(total)} {hit ? '✓' : ''}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
