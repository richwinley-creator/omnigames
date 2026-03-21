import { useState } from 'react';
import { useApi, apiPost } from '../hooks/useApi';

const styles = {
  section: { background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' },
  title: { fontSize: 18, fontWeight: 600, margin: '0 0 16px', color: '#1a1a2e' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 13 },
  th: { textAlign: 'left', padding: '10px 12px', borderBottom: '2px solid #e5e7eb', color: '#6b7280', fontWeight: 500, fontSize: 11, textTransform: 'uppercase' },
  td: { padding: '10px 12px', borderBottom: '1px solid #f3f4f6' },
  form: { display: 'flex', gap: 12, alignItems: 'end', flexWrap: 'wrap', marginBottom: 20, padding: 16, background: '#f9fafb', borderRadius: 8 },
  field: { display: 'flex', flexDirection: 'column', gap: 4 },
  label: { fontSize: 11, color: '#6b7280', textTransform: 'uppercase', fontWeight: 500 },
  input: { padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13 },
  btn: { padding: '8px 20px', background: '#4f46e5', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 500 },
  total: { padding: 16, background: '#f0fdf4', borderRadius: 8, marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
};

const fmt = (n) => '$' + (n || 0).toLocaleString();

export default function Deposits() {
  const { data: deposits, refetch } = useApi('/api/deposits');
  const [form, setForm] = useState({ date: '', amount: '', bank: 'Bank of America', ref: '' });
  const [showForm, setShowForm] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.date || !form.amount) return;
    await apiPost('/api/deposits', { ...form, amount: parseFloat(form.amount) });
    setForm({ date: '', amount: '', bank: 'Bank of America', ref: '' });
    setShowForm(false);
    refetch();
  };

  const total = (deposits || []).reduce((s, d) => s + d.amount, 0);

  return (
    <div style={styles.section}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={styles.title}>Bank Deposits</h2>
        <button style={styles.btn} onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancel' : '+ Add Deposit'}
        </button>
      </div>

      <div style={styles.total}>
        <span style={{ fontSize: 14, color: '#166534' }}>Total Deposits</span>
        <span style={{ fontSize: 20, fontWeight: 700, color: '#166534' }}>{fmt(total)}</span>
      </div>

      {showForm && (
        <form style={styles.form} onSubmit={submit}>
          <div style={styles.field}>
            <label style={styles.label}>Date</label>
            <input type="date" style={styles.input} value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} required />
          </div>
          <div style={styles.field}>
            <label style={styles.label}>Amount</label>
            <input type="number" step="0.01" style={styles.input} value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} placeholder="0.00" required />
          </div>
          <div style={styles.field}>
            <label style={styles.label}>Bank</label>
            <input style={styles.input} value={form.bank} onChange={e => setForm({ ...form, bank: e.target.value })} />
          </div>
          <div style={styles.field}>
            <label style={styles.label}>Reference</label>
            <input style={styles.input} value={form.ref} onChange={e => setForm({ ...form, ref: e.target.value })} placeholder="Seq# 000" />
          </div>
          <button type="submit" style={styles.btn}>Save</button>
        </form>
      )}

      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>Date</th>
            <th style={styles.th}>Bank</th>
            <th style={styles.th}>Reference</th>
            <th style={{ ...styles.th, textAlign: 'right' }}>Amount</th>
          </tr>
        </thead>
        <tbody>
          {(deposits || []).map(d => (
            <tr key={d.id}>
              <td style={styles.td}>{d.date}</td>
              <td style={styles.td}>{d.bank}</td>
              <td style={styles.td}>{d.ref}</td>
              <td style={{ ...styles.td, textAlign: 'right', fontWeight: 600 }}>{fmt(d.amount)}</td>
            </tr>
          ))}
          {(deposits || []).length === 0 && (
            <tr><td colSpan={4} style={{ ...styles.td, textAlign: 'center', color: '#9ca3af' }}>No deposits yet</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
