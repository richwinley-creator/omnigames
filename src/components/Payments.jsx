import { useApi, apiPost, apiPut } from '../hooks/useApi';

const styles = {
  section: { background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' },
  title: { fontSize: 18, fontWeight: 600, margin: '0 0 16px', color: '#1a1a2e' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 13 },
  th: { textAlign: 'left', padding: '10px 12px', borderBottom: '2px solid #e5e7eb', color: '#6b7280', fontWeight: 500, fontSize: 11, textTransform: 'uppercase' },
  td: { padding: '10px 12px', borderBottom: '1px solid #f3f4f6' },
  badge: (paid) => ({
    display: 'inline-block',
    padding: '2px 10px',
    borderRadius: 10,
    fontSize: 11,
    fontWeight: 600,
    background: paid ? '#dcfce7' : '#fef3c7',
    color: paid ? '#166534' : '#92400e',
  }),
  payBtn: {
    padding: '4px 12px',
    background: '#059669',
    color: '#fff',
    border: 'none',
    borderRadius: 4,
    cursor: 'pointer',
    fontSize: 11,
    fontWeight: 500,
  },
  summary: { display: 'flex', gap: 16, marginBottom: 16, flexWrap: 'wrap' },
  summaryCard: (bg) => ({
    padding: '12px 20px',
    borderRadius: 8,
    background: bg,
    flex: '1 1 150px',
  }),
};

const fmt = (n) => '$' + (n || 0).toLocaleString();

export default function Payments() {
  const { data: payments, refetch } = useApi('/api/payments');
  const list = payments || [];

  const unpaid = list.filter(p => p.status === 'unpaid');
  const paid = list.filter(p => p.status === 'paid');
  const unpaidTotal = unpaid.reduce((s, p) => s + p.amount, 0);
  const paidTotal = paid.reduce((s, p) => s + p.amount, 0);

  const markPaid = async (id) => {
    await apiPut(`/api/payments/${id}/pay`, {});
    refetch();
  };

  return (
    <div style={styles.section}>
      <h2 style={styles.title}>Partner Payments</h2>

      <div style={styles.summary}>
        <div style={styles.summaryCard('#fef3c7')}>
          <div style={{ fontSize: 11, color: '#92400e' }}>Unpaid</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#92400e' }}>{fmt(unpaidTotal)}</div>
          <div style={{ fontSize: 11, color: '#92400e' }}>{unpaid.length} payments</div>
        </div>
        <div style={styles.summaryCard('#dcfce7')}>
          <div style={{ fontSize: 11, color: '#166534' }}>Paid</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#166534' }}>{fmt(paidTotal)}</div>
          <div style={{ fontSize: 11, color: '#166534' }}>{paid.length} payments</div>
        </div>
      </div>

      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>Location</th>
            <th style={styles.th}>Partner</th>
            <th style={styles.th}>Period</th>
            <th style={{ ...styles.th, textAlign: 'right' }}>Amount</th>
            <th style={{ ...styles.th, textAlign: 'center' }}>Status</th>
            <th style={{ ...styles.th, textAlign: 'center' }}>Action</th>
          </tr>
        </thead>
        <tbody>
          {list.map(p => (
            <tr key={p.id}>
              <td style={styles.td}>{p.location_name}</td>
              <td style={styles.td}>{p.partner}</td>
              <td style={styles.td}>{p.period}</td>
              <td style={{ ...styles.td, textAlign: 'right', fontWeight: 600 }}>{fmt(p.amount)}</td>
              <td style={{ ...styles.td, textAlign: 'center' }}>
                <span style={styles.badge(p.status === 'paid')}>
                  {p.status === 'paid' ? 'Paid' : 'Unpaid'}
                </span>
              </td>
              <td style={{ ...styles.td, textAlign: 'center' }}>
                {p.status === 'unpaid' && (
                  <button style={styles.payBtn} onClick={() => markPaid(p.id)}>Mark Paid</button>
                )}
                {p.status === 'paid' && <span style={{ fontSize: 11, color: '#9ca3af' }}>{p.paid_date?.split('T')[0]}</span>}
              </td>
            </tr>
          ))}
          {list.length === 0 && (
            <tr><td colSpan={6} style={{ ...styles.td, textAlign: 'center', color: '#9ca3af' }}>No partner payments recorded. Payments are created when meter readings are saved.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
