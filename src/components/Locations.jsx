import { useState } from 'react';
import { useApi, apiPut } from '../hooks/useApi';
import { REVENUE_SEED } from '../data/locations';

const fmt = (n) => '$' + (n || 0).toLocaleString();

const st = {
  section: { background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' },
  th: { textAlign: 'left', padding: '10px 12px', borderBottom: '2px solid #e5e7eb', color: '#6b7280', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.04em' },
  td: { padding: '11px 12px', borderBottom: '1px solid #f3f4f6', fontSize: 13 },
  statusBadge: (active) => ({
    display: 'inline-flex', alignItems: 'center', gap: 5,
    padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 600, cursor: 'pointer',
    background: active ? '#dcfce7' : '#f3f4f6',
    color: active ? '#166534' : '#9ca3af',
    border: `1px solid ${active ? '#bbf7d0' : '#e5e7eb'}`,
    userSelect: 'none',
  }),
  filterBtn: (active) => ({
    padding: '6px 16px', borderRadius: 20, fontSize: 12, fontWeight: 500, cursor: 'pointer', border: 'none',
    background: active ? '#0f172a' : '#e5e7eb', color: active ? '#fff' : '#374151', transition: 'all 0.15s',
  }),
  exportBtn: { padding: '8px 18px', background: '#b8943d', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 500 },
  kpiRow: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 20 },
  kpi: (color) => ({
    background: '#fff', borderRadius: 12, padding: '16px 20px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.07)', borderLeft: `4px solid ${color}`,
  }),
};

export default function Locations() {
  const { data: locations, refetch } = useApi('/api/locations');
  const [statusFilter, setStatusFilter] = useState('active');

  const locs = locations || [];

  const locsWithRevenue = locs.map(l => {
    if (l.net > 0) return l;
    const seed = REVENUE_SEED.find(r => r.name === l.name);
    return seed ? { ...l, net: seed.net, gse_share: seed.gseRev, partner_share: seed.net - seed.gseRev } : l;
  });

  const filtered = statusFilter === 'all' ? locsWithRevenue : locsWithRevenue.filter(l => l.status === statusFilter);
  const activeLocs = locsWithRevenue.filter(l => l.status === 'active');
  const inactiveLocs = locsWithRevenue.filter(l => l.status !== 'active');

  const totalMachines = activeLocs.reduce((s, l) => s + l.machines, 0);
  const totalNet = activeLocs.reduce((s, l) => s + (l.net || 0), 0);
  const totalGse = activeLocs.reduce((s, l) => s + (l.gse_share || 0), 0);

  const toggleStatus = async (loc) => {
    await apiPut(`/api/locations/${loc.id}`, { status: loc.status === 'active' ? 'inactive' : 'active' });
    refetch();
  };

  return (
    <div>
      {/* KPI summary row */}
      <div className="d-kpi-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))' }}>
        {[
          { label: 'Active Locations', val: activeLocs.length, fmt: false },
          { label: 'Machines Running', val: totalMachines, fmt: false },
          { label: 'GSE Revenue', val: fmt(totalGse), fmt: true, green: true },
          { label: 'Total Net', val: fmt(totalNet), fmt: true },
        ].map(k => (
          <div key={k.label} className="d-kpi" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 4 }}>
            <div className="d-kpi-label">{k.label}</div>
            <div className="d-kpi-value" style={{ fontSize: 24, color: k.green ? '#059669' : '#111827' }}>{k.val}</div>
          </div>
        ))}
      </div>

      <div style={st.section}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <button style={st.filterBtn(statusFilter === 'active')} onClick={() => setStatusFilter('active')}>
              Active ({activeLocs.length})
            </button>
            <button style={st.filterBtn(statusFilter === 'inactive')} onClick={() => setStatusFilter('inactive')}>
              Inactive ({inactiveLocs.length})
            </button>
            <button style={st.filterBtn(statusFilter === 'all')} onClick={() => setStatusFilter('all')}>
              All ({locs.length})
            </button>
          </div>
          <a href="/api/export/excel" download style={{ textDecoration: 'none' }}>
            <button style={st.exportBtn}>Export Excel</button>
          </a>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={st.th}>Location</th>
                <th style={st.th}>Partner</th>
                <th style={{ ...st.th, textAlign: 'center' }}>Machines</th>
                <th style={{ ...st.th, textAlign: 'center' }}>GSE %</th>
                <th style={{ ...st.th, textAlign: 'right' }}>Net</th>
                <th style={{ ...st.th, textAlign: 'right' }}>GSE Share</th>
                <th style={{ ...st.th, textAlign: 'right' }}>Partner Share</th>
                <th style={{ ...st.th, textAlign: 'center' }}>Last Read</th>
                <th style={{ ...st.th, textAlign: 'center' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((l, i) => (
                <tr key={l.id} style={{ background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                  <td style={{ ...st.td, fontWeight: 600, color: '#111827' }}>
                    {l.name}
                    {l.machine_type && <div style={{ fontSize: 11, color: '#9ca3af', fontWeight: 400 }}>{l.machine_type}</div>}
                  </td>
                  <td style={st.td}>{l.partner}</td>
                  <td style={{ ...st.td, textAlign: 'center', fontWeight: 600 }}>{l.machines}</td>
                  <td style={{ ...st.td, textAlign: 'center' }}>{l.gse_pct}%</td>
                  <td style={{ ...st.td, textAlign: 'right', fontFamily: 'monospace' }}>{fmt(l.net)}</td>
                  <td style={{ ...st.td, textAlign: 'right', color: '#059669', fontWeight: 700, fontFamily: 'monospace' }}>{fmt(l.gse_share)}</td>
                  <td style={{ ...st.td, textAlign: 'right', color: '#6b7280', fontFamily: 'monospace' }}>{fmt(l.partner_share)}</td>
                  <td style={{ ...st.td, textAlign: 'center', color: '#6b7280' }}>{l.last_read_date || '—'}</td>
                  <td style={{ ...st.td, textAlign: 'center' }}>
                    <span style={st.statusBadge(l.status === 'active')} onClick={() => toggleStatus(l)} title="Click to toggle">
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: l.status === 'active' ? '#16a34a' : '#9ca3af', flexShrink: 0 }} />
                      {l.status === 'active' ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
            {filtered.length > 1 && (
              <tfoot>
                <tr style={{ background: '#f0f4ff', fontWeight: 700 }}>
                  <td style={st.td}>Totals</td>
                  <td style={st.td} />
                  <td style={{ ...st.td, textAlign: 'center' }}>{filtered.reduce((s, l) => s + l.machines, 0)}</td>
                  <td style={st.td} />
                  <td style={{ ...st.td, textAlign: 'right', fontFamily: 'monospace' }}>{fmt(filtered.reduce((s, l) => s + (l.net || 0), 0))}</td>
                  <td style={{ ...st.td, textAlign: 'right', color: '#059669', fontFamily: 'monospace' }}>{fmt(filtered.reduce((s, l) => s + (l.gse_share || 0), 0))}</td>
                  <td style={{ ...st.td, textAlign: 'right', color: '#6b7280', fontFamily: 'monospace' }}>{fmt(filtered.reduce((s, l) => s + (l.partner_share || 0), 0))}</td>
                  <td style={st.td} />
                  <td style={st.td} />
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        {filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}>No locations found.</div>
        )}
      </div>
    </div>
  );
}
