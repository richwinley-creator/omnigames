import { useApi } from '../hooks/useApi';
import { apiPut } from '../hooks/useApi';
import { REVENUE_SEED } from '../data/locations';

const styles = {
  section: { background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' },
  title: { fontSize: 18, fontWeight: 600, margin: '0 0 16px', color: '#1a1a2e' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 13 },
  th: { textAlign: 'left', padding: '10px 12px', borderBottom: '2px solid #e5e7eb', color: '#6b7280', fontWeight: 500, fontSize: 11, textTransform: 'uppercase' },
  td: { padding: '10px 12px', borderBottom: '1px solid #f3f4f6' },
  badge: (active) => ({
    display: 'inline-block',
    padding: '2px 10px',
    borderRadius: 10,
    fontSize: 11,
    fontWeight: 600,
    background: active ? '#dcfce7' : '#fee2e2',
    color: active ? '#166534' : '#991b1b',
    cursor: 'pointer',
  }),
  exportBtn: {
    padding: '8px 20px',
    background: '#4f46e5',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    cursor: 'pointer',
    fontSize: 13,
    fontWeight: 500,
  },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
};

const fmt = (n) => '$' + (n || 0).toLocaleString();

export default function Locations() {
  const { data: locations, refetch } = useApi('/api/locations');
  const locs = locations || [];

  // Merge seed revenue for locations without readings
  const locsWithRevenue = locs.map(l => {
    if (l.net > 0) return l;
    const seed = REVENUE_SEED.find(r => r.name === l.name);
    return seed ? { ...l, net: seed.net, gse_share: seed.gseRev, partner_share: seed.net - seed.gseRev } : l;
  });

  const toggleStatus = async (loc) => {
    await apiPut(`/api/locations/${loc.id}`, { status: loc.status === 'active' ? 'inactive' : 'active' });
    refetch();
  };

  const totalMachines = locsWithRevenue.reduce((s, l) => s + l.machines, 0);
  const totalNet = locsWithRevenue.reduce((s, l) => s + (l.net || 0), 0);
  const totalGse = locsWithRevenue.reduce((s, l) => s + (l.gse_share || 0), 0);

  return (
    <div style={styles.section}>
      <div style={styles.header}>
        <h2 style={styles.title}>{locs.length} Locations — {totalMachines} Machines</h2>
        <a href="/api/export/excel" download>
          <button style={styles.exportBtn}>Export Excel</button>
        </a>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Location</th>
              <th style={styles.th}>Partner</th>
              <th style={{ ...styles.th, textAlign: 'center' }}>Machines</th>
              <th style={{ ...styles.th, textAlign: 'center' }}>GSE %</th>
              <th style={{ ...styles.th, textAlign: 'right' }}>Net</th>
              <th style={{ ...styles.th, textAlign: 'right' }}>GSE Share</th>
              <th style={{ ...styles.th, textAlign: 'right' }}>Partner Share</th>
              <th style={{ ...styles.th, textAlign: 'center' }}>Type</th>
              <th style={{ ...styles.th, textAlign: 'center' }}>Last Read</th>
              <th style={{ ...styles.th, textAlign: 'center' }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {locsWithRevenue.map(l => (
              <tr key={l.id}>
                <td style={{ ...styles.td, fontWeight: 500 }}>{l.name}</td>
                <td style={styles.td}>{l.partner}</td>
                <td style={{ ...styles.td, textAlign: 'center' }}>{l.machines}</td>
                <td style={{ ...styles.td, textAlign: 'center' }}>{l.gse_pct}%</td>
                <td style={{ ...styles.td, textAlign: 'right' }}>{fmt(l.net)}</td>
                <td style={{ ...styles.td, textAlign: 'right', color: '#059669', fontWeight: 600 }}>{fmt(l.gse_share)}</td>
                <td style={{ ...styles.td, textAlign: 'right', color: '#6b7280' }}>{fmt(l.partner_share)}</td>
                <td style={{ ...styles.td, textAlign: 'center', fontSize: 11 }}>{l.machine_type}</td>
                <td style={{ ...styles.td, textAlign: 'center', color: '#6b7280' }}>{l.last_read_date || '—'}</td>
                <td style={{ ...styles.td, textAlign: 'center' }}>
                  <span style={styles.badge(l.status === 'active')} onClick={() => toggleStatus(l)}>
                    {l.status === 'active' ? 'Active' : 'Inactive'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr style={{ background: '#f9fafb', fontWeight: 600 }}>
              <td style={styles.td}>Totals</td>
              <td style={styles.td}></td>
              <td style={{ ...styles.td, textAlign: 'center' }}>{totalMachines}</td>
              <td style={styles.td}></td>
              <td style={{ ...styles.td, textAlign: 'right' }}>{fmt(totalNet)}</td>
              <td style={{ ...styles.td, textAlign: 'right', color: '#059669' }}>{fmt(totalGse)}</td>
              <td style={{ ...styles.td, textAlign: 'right', color: '#6b7280' }}>{fmt(totalNet - totalGse)}</td>
              <td style={styles.td}></td>
              <td style={styles.td}></td>
              <td style={styles.td}></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
