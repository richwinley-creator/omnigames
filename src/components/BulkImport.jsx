import { useState } from 'react';
import { apiPost } from '../hooks/useApi';

const styles = {
  card: { background: '#fff', borderRadius: 10, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.08)', marginBottom: 20 },
  h2: { margin: '0 0 16px', fontSize: 20, fontWeight: 700 },
  h3: { margin: '0 0 12px', fontSize: 16, fontWeight: 600 },
  tabs: { display: 'flex', gap: 4, marginBottom: 20, borderBottom: '2px solid #e5e7eb', paddingBottom: 0 },
  tab: (active) => ({
    padding: '8px 20px', background: 'none', border: 'none', borderBottom: active ? '2px solid #4f46e5' : '2px solid transparent',
    marginBottom: -2, cursor: 'pointer', fontSize: 13, fontWeight: active ? 600 : 400, color: active ? '#4f46e5' : '#6b7280',
  }),
  dropzone: {
    border: '2px dashed #d1d5db', borderRadius: 8, padding: '40px 20px', textAlign: 'center',
    cursor: 'pointer', background: '#f9fafb', marginBottom: 16,
  },
  input: { width: '100%', padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13, marginBottom: 12, boxSizing: 'border-box' },
  btn: { padding: '8px 16px', background: '#4f46e5', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  btnSecondary: { padding: '8px 16px', background: '#e5e7eb', color: '#374151', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  preview: { maxHeight: 300, overflow: 'auto', marginBottom: 16 },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 12 },
  th: { textAlign: 'left', padding: '6px 8px', borderBottom: '2px solid #e5e7eb', fontWeight: 600, fontSize: 11 },
  td: { padding: '6px 8px', borderBottom: '1px solid #f3f4f6' },
  result: (ok) => ({
    padding: '12px 16px', borderRadius: 8, marginTop: 12,
    background: ok ? '#f0fdf4' : '#fef2f2',
    border: `1px solid ${ok ? '#bbf7d0' : '#fecaca'}`,
    color: ok ? '#166534' : '#991b1b', fontSize: 13,
  }),
  label: { display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 4 },
};

function parseCSV(text) {
  const lines = text.trim().split('\n');
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_'));
  return lines.slice(1).map(line => {
    const vals = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
    const obj = {};
    headers.forEach((h, i) => { obj[h] = vals[i] || ''; });
    return obj;
  });
}

export default function BulkImport() {
  const [tab, setTab] = useState('leads');

  return (
    <div>
      <h2 style={styles.h2}>Bulk Operations</h2>
      <div style={styles.tabs}>
        <button style={styles.tab(tab === 'leads')} onClick={() => setTab('leads')}>Import Leads</button>
        <button style={styles.tab(tab === 'deposits')} onClick={() => setTab('deposits')}>Import Deposits</button>
        <button style={styles.tab(tab === 'payments')} onClick={() => setTab('payments')}>Generate Payments</button>
      </div>

      {tab === 'leads' && <CSVImport type="leads" />}
      {tab === 'deposits' && <CSVImport type="deposits" />}
      {tab === 'payments' && <GeneratePayments />}
    </div>
  );
}

function CSVImport({ type }) {
  const [data, setData] = useState(null);
  const [result, setResult] = useState(null);
  const [importing, setImporting] = useState(false);

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const parsed = parseCSV(ev.target.result);
      setData(parsed);
      setResult(null);
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (!data || data.length === 0) return;
    setImporting(true);
    try {
      const res = await apiPost(`/api/bulk/${type}`, { [type]: data });
      setResult(res);
    } catch (e) {
      setResult({ error: e.message });
    } finally {
      setImporting(false);
    }
  };

  const expectedCols = type === 'leads'
    ? 'name, email, phone, business_name, business_type, city, state, interest, notes'
    : 'date, amount, bank, ref';

  return (
    <div style={styles.card}>
      <h3 style={styles.h3}>Import {type === 'leads' ? 'Leads' : 'Deposits'} from CSV</h3>
      <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 12 }}>
        Expected columns: <code style={{ background: '#f3f4f6', padding: '2px 6px', borderRadius: 4 }}>{expectedCols}</code>
      </p>
      <div style={styles.dropzone}>
        <input type="file" accept=".csv" onChange={handleFile} style={{ fontSize: 13 }} />
        <p style={{ marginTop: 8, fontSize: 12, color: '#9ca3af' }}>Upload a CSV file</p>
      </div>

      {data && data.length > 0 && (
        <>
          <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>{data.length} rows found. Preview:</p>
          <div style={styles.preview}>
            <table style={styles.table}>
              <thead>
                <tr>{Object.keys(data[0]).map(k => <th key={k} style={styles.th}>{k}</th>)}</tr>
              </thead>
              <tbody>
                {data.slice(0, 10).map((row, i) => (
                  <tr key={i}>{Object.values(row).map((v, j) => <td key={j} style={styles.td}>{v}</td>)}</tr>
                ))}
              </tbody>
            </table>
            {data.length > 10 && <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>...and {data.length - 10} more rows</p>}
          </div>
          <button style={{ ...styles.btn, opacity: importing ? 0.7 : 1 }} onClick={handleImport} disabled={importing}>
            {importing ? 'Importing...' : `Import ${data.length} ${type}`}
          </button>
        </>
      )}

      {result && (
        <div style={styles.result(!result.error)}>
          {result.error ? (
            <span>Error: {result.error}</span>
          ) : (
            <span>Imported {result.imported} of {result.total} {type}. {result.errors?.length > 0 && `${result.errors.length} errors.`}</span>
          )}
        </div>
      )}
    </div>
  );
}

function GeneratePayments() {
  const [period, setPeriod] = useState(new Date().toISOString().slice(0, 7));
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const res = await apiPost('/api/bulk/generate-payments', { period });
      setResult(res);
    } catch (e) {
      setResult({ error: e.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.card}>
      <h3 style={styles.h3}>Auto-Generate Partner Payments</h3>
      <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 16 }}>
        Generate payment records from meter readings for a specific month. Uses each location's revenue split percentages.
      </p>
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end' }}>
        <div>
          <label style={styles.label}>Period (YYYY-MM)</label>
          <input type="month" style={styles.input} value={period} onChange={e => setPeriod(e.target.value)} />
        </div>
        <button style={{ ...styles.btn, marginBottom: 12, opacity: loading ? 0.7 : 1 }} onClick={handleGenerate} disabled={loading}>
          {loading ? 'Generating...' : 'Generate Payments'}
        </button>
      </div>
      {result && (
        <div style={styles.result(!result.error)}>
          {result.error ? (
            <span>Error: {result.error}</span>
          ) : (
            <span>Created {result.created} payments, skipped {result.skipped} (already exist). {result.total} locations with revenue.</span>
          )}
        </div>
      )}
    </div>
  );
}
