import { useState, useRef, useCallback } from 'react';
import { useApi, apiPost } from '../hooks/useApi';
import { read, utils } from 'xlsx';

const styles = {
  section: { background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' },
  title: { fontSize: 18, fontWeight: 600, margin: '0 0 4px', color: '#1a1a2e' },
  subtitle: { fontSize: 13, color: '#6b7280', margin: '0 0 20px' },
  tabs: { display: 'flex', gap: 2, background: '#f3f4f6', borderRadius: 8, padding: 3, marginBottom: 20 },
  tab: (active) => ({
    flex: 1, padding: '8px 16px', borderRadius: 6, border: 'none', cursor: 'pointer',
    fontSize: 13, fontWeight: active ? 600 : 500, textAlign: 'center',
    background: active ? '#fff' : 'transparent', color: active ? '#111827' : '#6b7280',
    boxShadow: active ? '0 1px 2px rgba(0,0,0,0.06)' : 'none', transition: 'all 0.15s',
  }),
  dropZone: (dragging) => ({
    border: `2px dashed ${dragging ? '#b8943d' : '#d1d5db'}`,
    borderRadius: 12, padding: 48, textAlign: 'center', cursor: 'pointer',
    background: dragging ? '#fdf8ef' : '#fafafa', transition: 'all 0.15s', marginBottom: 20,
  }),
  dropText: { fontSize: 15, color: '#6b7280', margin: '8px 0' },
  dropHint: { fontSize: 12, color: '#9ca3af' },
  btn: (variant) => ({
    padding: '10px 24px', border: 'none', borderRadius: 8, cursor: 'pointer',
    fontSize: 14, fontWeight: 600, marginRight: 8,
    background: variant === 'primary' ? '#b8943d' : variant === 'danger' ? '#ef4444' : '#e5e7eb',
    color: variant === 'primary' || variant === 'danger' ? '#fff' : '#374151',
  }),
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 13, marginBottom: 16 },
  th: { textAlign: 'left', padding: '8px 10px', borderBottom: '2px solid #e5e7eb', color: '#6b7280', fontWeight: 500, fontSize: 11, textTransform: 'uppercase' },
  td: { padding: '6px 10px', borderBottom: '1px solid #f3f4f6' },
  input: { width: '100%', padding: '4px 8px', border: '1px solid #d1d5db', borderRadius: 4, fontSize: 13, boxSizing: 'border-box' },
  select: { padding: '6px 12px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13, marginBottom: 16 },
  status: (type) => ({
    padding: '10px 16px', borderRadius: 8, fontSize: 13, marginBottom: 16,
    background: type === 'error' ? '#fef2f2' : type === 'success' ? '#f0fdf4' : '#eff6ff',
    color: type === 'error' ? '#991b1b' : type === 'success' ? '#166534' : '#1e40af',
  }),
  preview: { maxWidth: 300, maxHeight: 200, borderRadius: 8, marginBottom: 16 },
};

export default function MeterImport({ onSave }) {
  const { data: locations } = useApi('/api/locations');
  const [mode, setMode] = useState('spreadsheet'); // 'photo' or 'spreadsheet'
  const [dragging, setDragging] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [extracted, setExtracted] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [selectedLocation, setSelectedLocation] = useState('');
  const [status, setStatus] = useState(null);
  const [saving, setSaving] = useState(false);
  const [readingDate, setReadingDate] = useState(new Date().toISOString().split('T')[0]);
  const fileRef = useRef();
  const xlsRef = useRef();

  // ── Photo AI extraction ──
  const processImage = useCallback(async (file) => {
    setStatus(null);
    setExtracted(null);
    setImagePreview(URL.createObjectURL(file));

    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result.split(',')[1];
      setExtracting(true);
      try {
        const result = await apiPost('/api/extract', { image: base64, mimeType: file.type || 'image/png' });
        setExtracted(result);
        if (result.location && locations) {
          const match = locations.find(l =>
            l.name.toLowerCase().includes(result.location.toLowerCase()) ||
            result.location.toLowerCase().includes(l.name.toLowerCase())
          );
          if (match) setSelectedLocation(String(match.id));
        }
        if (result.date) setReadingDate(result.date);
        setStatus({ type: 'success', msg: `Extracted ${result.machines?.length || 0} machine readings` });
      } catch (err) {
        setStatus({ type: 'error', msg: err.message });
      } finally {
        setExtracting(false);
      }
    };
    reader.readAsDataURL(file);
  }, [locations]);

  // ── Spreadsheet parsing ──
  const processSpreadsheet = useCallback((file) => {
    setStatus(null);
    setExtracted(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const wb = read(e.target.result, { type: 'array' });

        // Try each sheet
        for (const sheetName of wb.SheetNames) {
          const sheet = wb.Sheets[sheetName];
          const rows = utils.sheet_to_json(sheet, { header: 1, defval: '' });

          if (rows.length < 2) continue;

          // Find header row — look for columns containing "in" and "out"
          let headerIdx = -1;
          for (let i = 0; i < Math.min(rows.length, 10); i++) {
            const row = rows[i].map(c => String(c).toLowerCase());
            const hasIn = row.some(c => c.includes('prev') && c.includes('in') || c.includes('previous in'));
            const hasOut = row.some(c => c.includes('prev') && c.includes('out') || c.includes('previous out'));
            const hasCurrIn = row.some(c => c.includes('curr') && c.includes('in') || c.includes('current in'));
            if (hasIn || hasOut || hasCurrIn) { headerIdx = i; break; }
          }

          // Fallback: look for "machine" or first row with numbers after it
          if (headerIdx === -1) {
            for (let i = 0; i < Math.min(rows.length, 10); i++) {
              const row = rows[i].map(c => String(c).toLowerCase());
              if (row.some(c => c.includes('machine') || c.includes('game') || c.includes('name'))) {
                headerIdx = i;
                break;
              }
            }
          }

          if (headerIdx === -1) headerIdx = 0;

          const headers = rows[headerIdx].map(c => String(c).toLowerCase().trim());

          // Map columns
          const findCol = (...terms) => headers.findIndex(h => terms.some(t => h.includes(t)));
          const nameCol = findCol('machine', 'game', 'name');
          const prevInCol = findCol('prev') !== -1 && findCol('prev') === findCol('previous in', 'prev in', 'perivous in', 'pervious in')
            ? findCol('previous in', 'prev in', 'perivous in', 'pervious in')
            : headers.findIndex(h => (h.includes('prev') || h.includes('previous') || h.includes('perivous') || h.includes('pervious')) && h.includes('in'));
          const currInCol = headers.findIndex(h => (h.includes('curr') || h.includes('current')) && h.includes('in'));
          const prevOutCol = headers.findIndex(h => (h.includes('prev') || h.includes('previous') || h.includes('perivous') || h.includes('pervious')) && h.includes('out'));
          const currOutCol = headers.findIndex(h => (h.includes('curr') || h.includes('current')) && h.includes('out'));

          // If we can't find specific columns, try positional: name, prev_in, curr_in, prev_out, curr_out
          const machines = [];
          for (let i = headerIdx + 1; i < rows.length; i++) {
            const row = rows[i];
            if (!row || row.length === 0) continue;

            const name = nameCol >= 0 ? String(row[nameCol] || '').trim() : String(row[0] || '').trim();
            if (!name || name.toLowerCase() === 'total' || name.toLowerCase() === 'totals') continue;

            const getNum = (col) => {
              if (col < 0 || col >= row.length) return 0;
              const v = parseFloat(String(row[col]).replace(/[,$]/g, ''));
              return isNaN(v) ? 0 : v;
            };

            // Try mapped columns first, then positional
            const pi = prevInCol >= 0 ? getNum(prevInCol) : getNum(1);
            const ci = currInCol >= 0 ? getNum(currInCol) : getNum(2);
            const po = prevOutCol >= 0 ? getNum(prevOutCol) : getNum(3);
            const co = currOutCol >= 0 ? getNum(currOutCol) : getNum(4);

            // Skip rows that are all zeros or have no numeric data
            if (pi === 0 && ci === 0 && po === 0 && co === 0) continue;

            machines.push({ machine_name: name, prev_in: pi, curr_in: ci, prev_out: po, curr_out: co });
          }

          if (machines.length > 0) {
            // Try to match location from sheet name
            let matchedLoc = '';
            if (locations) {
              const match = locations.find(l =>
                l.name.toLowerCase().includes(sheetName.toLowerCase()) ||
                l.sheet_name?.toLowerCase() === sheetName.toLowerCase() ||
                sheetName.toLowerCase().includes(l.name.toLowerCase())
              );
              if (match) matchedLoc = String(match.id);
            }

            setExtracted({ location: sheetName, date: readingDate, machines });
            if (matchedLoc) setSelectedLocation(matchedLoc);
            setStatus({ type: 'success', msg: `Found ${machines.length} machines in sheet "${sheetName}"` });
            return;
          }
        }

        setStatus({ type: 'error', msg: 'Could not find meter reading data. Make sure columns include machine name, previous in, current in, previous out, current out.' });
      } catch (err) {
        setStatus({ type: 'error', msg: `Failed to parse file: ${err.message}` });
      }
    };
    reader.readAsArrayBuffer(file);
  }, [locations, readingDate]);

  const onDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer?.files?.[0];
    if (!file) return;
    if (mode === 'photo') processImage(file);
    else processSpreadsheet(file);
  };

  const onPaste = useCallback((e) => {
    if (mode !== 'photo') return;
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of items) {
      if (item.type.startsWith('image/')) { processImage(item.getAsFile()); break; }
    }
  }, [processImage, mode]);

  const updateMachine = (idx, field, value) => {
    setExtracted(prev => ({
      ...prev,
      machines: prev.machines.map((m, i) => i === idx
        ? { ...m, [field]: field === 'machine_name' ? value : (parseFloat(value) || 0) }
        : m
      ),
    }));
  };

  const removeMachine = (idx) => {
    setExtracted(prev => ({
      ...prev,
      machines: prev.machines.filter((_, i) => i !== idx),
    }));
  };

  const saveReadings = async () => {
    if (!selectedLocation || !extracted?.machines?.length) return;
    setSaving(true);
    try {
      await apiPost('/api/readings', {
        location_id: parseInt(selectedLocation),
        date: readingDate || new Date().toISOString().split('T')[0],
        machines: extracted.machines,
      });
      setStatus({ type: 'success', msg: 'Readings saved successfully!' });
      setExtracted(null);
      setImagePreview(null);
      if (onSave) onSave();
    } catch (err) {
      setStatus({ type: 'error', msg: err.message });
    } finally {
      setSaving(false);
    }
  };

  const reset = () => {
    setExtracted(null);
    setImagePreview(null);
    setStatus(null);
    setSelectedLocation('');
  };

  return (
    <div style={styles.section} onPaste={onPaste} tabIndex={0}>
      <h2 style={styles.title}>Meter Reading Import</h2>
      <p style={styles.subtitle}>Upload an Excel spreadsheet or photo of meter readings.</p>

      {/* Mode toggle */}
      <div style={styles.tabs}>
        <button style={styles.tab(mode === 'spreadsheet')} onClick={() => { reset(); setMode('spreadsheet'); }}>
          📊 Spreadsheet (Excel/CSV)
        </button>
        <button style={styles.tab(mode === 'photo')} onClick={() => { reset(); setMode('photo'); }}>
          📸 Photo (AI Extract)
        </button>
      </div>

      {status && <div style={styles.status(status.type)}>{status.msg}</div>}

      {!extracted && (
        <div
          style={styles.dropZone(dragging)}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          onClick={() => mode === 'photo' ? fileRef.current?.click() : xlsRef.current?.click()}
        >
          {extracting ? (
            <div>
              <p style={{ fontSize: 16, color: '#b8943d', fontWeight: 600 }}>Extracting data...</p>
              <p style={styles.dropHint}>AI is reading the meter image</p>
            </div>
          ) : mode === 'spreadsheet' ? (
            <div>
              <p style={{ fontSize: 32, margin: 0 }}>📊</p>
              <p style={styles.dropText}>Drop Excel or CSV file here</p>
              <p style={styles.dropHint}>or click to browse — supports .xlsx, .xls, .csv</p>
              <p style={{ fontSize: 11, color: '#b8943d', marginTop: 12 }}>
                Columns: Machine Name, Previous In, Current In, Previous Out, Current Out
              </p>
            </div>
          ) : (
            <div>
              <p style={{ fontSize: 32, margin: 0 }}>📸</p>
              <p style={styles.dropText}>Drop meter reading image here</p>
              <p style={styles.dropHint}>or click to browse — also supports Cmd+V paste</p>
            </div>
          )}
          <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }}
            onChange={(e) => e.target.files?.[0] && processImage(e.target.files[0])} />
          <input ref={xlsRef} type="file" accept=".xlsx,.xls,.csv" style={{ display: 'none' }}
            onChange={(e) => e.target.files?.[0] && processSpreadsheet(e.target.files[0])} />
        </div>
      )}

      {imagePreview && !extracted && <img src={imagePreview} alt="Preview" style={styles.preview} />}

      {extracted && (
        <div>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 16, flexWrap: 'wrap' }}>
            <div>
              <label style={{ fontSize: 12, color: '#6b7280', display: 'block', marginBottom: 4 }}>Location</label>
              <select style={styles.select} value={selectedLocation} onChange={e => setSelectedLocation(e.target.value)}>
                <option value="">Select location...</option>
                {(locations || []).map(l => (
                  <option key={l.id} value={l.id}>{l.name} ({l.gse_pct}% GSE)</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 12, color: '#6b7280', display: 'block', marginBottom: 4 }}>Date</label>
              <input type="date" style={styles.select} value={readingDate}
                onChange={e => setReadingDate(e.target.value)} />
            </div>
            {extracted.location && (
              <div style={{ fontSize: 12, color: '#6b7280' }}>
                Detected: <strong>{extracted.location}</strong>
              </div>
            )}
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Machine</th>
                  <th style={styles.th}>Prev In</th>
                  <th style={styles.th}>Curr In</th>
                  <th style={styles.th}>Prev Out</th>
                  <th style={styles.th}>Curr Out</th>
                  <th style={{ ...styles.th, background: '#f0fdf4' }}>Total In</th>
                  <th style={{ ...styles.th, background: '#fef2f2' }}>Total Out</th>
                  <th style={{ ...styles.th, background: '#eff6ff', fontWeight: 700 }}>Net</th>
                  <th style={styles.th}></th>
                </tr>
              </thead>
              <tbody>
                {extracted.machines.map((m, i) => {
                  const totalIn = (m.curr_in || 0) - (m.prev_in || 0);
                  const totalOut = (m.curr_out || 0) - (m.prev_out || 0);
                  const net = totalIn - totalOut;
                  return (
                    <tr key={i}>
                      <td style={styles.td}><input style={styles.input} value={m.machine_name} onChange={e => updateMachine(i, 'machine_name', e.target.value)} /></td>
                      <td style={styles.td}><input style={styles.input} type="number" value={m.prev_in} onChange={e => updateMachine(i, 'prev_in', e.target.value)} /></td>
                      <td style={styles.td}><input style={styles.input} type="number" value={m.curr_in} onChange={e => updateMachine(i, 'curr_in', e.target.value)} /></td>
                      <td style={styles.td}><input style={styles.input} type="number" value={m.prev_out} onChange={e => updateMachine(i, 'prev_out', e.target.value)} /></td>
                      <td style={styles.td}><input style={styles.input} type="number" value={m.curr_out} onChange={e => updateMachine(i, 'curr_out', e.target.value)} /></td>
                      <td style={{ ...styles.td, background: '#f0fdf4', fontWeight: 500 }}>{totalIn.toLocaleString()}</td>
                      <td style={{ ...styles.td, background: '#fef2f2' }}>{totalOut.toLocaleString()}</td>
                      <td style={{ ...styles.td, background: '#eff6ff', fontWeight: 700, color: net < 0 ? '#ef4444' : '#059669' }}>{net.toLocaleString()}</td>
                      <td style={styles.td}>
                        <button onClick={() => removeMachine(i)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 16 }}>×</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {selectedLocation && (() => {
            const loc = (locations || []).find(l => l.id === parseInt(selectedLocation));
            if (!loc) return null;
            const totalNet = extracted.machines.reduce((s, m) => s + ((m.curr_in || 0) - (m.prev_in || 0)) - ((m.curr_out || 0) - (m.prev_out || 0)), 0);
            return (
              <div style={{ background: '#f9fafb', borderRadius: 8, padding: 16, marginBottom: 16 }}>
                <div style={{ display: 'flex', gap: 24, fontSize: 14 }}>
                  <div>Net: <strong>${totalNet.toLocaleString()}</strong></div>
                  <div>GSE ({loc.gse_pct}%): <strong style={{ color: '#059669' }}>${(totalNet * loc.gse_pct / 100).toFixed(0)}</strong></div>
                  <div>{loc.partner} ({loc.partner_pct}%): <strong>${(totalNet * loc.partner_pct / 100).toFixed(0)}</strong></div>
                </div>
              </div>
            );
          })()}

          <div>
            <button style={styles.btn('primary')} onClick={saveReadings} disabled={!selectedLocation || saving}>
              {saving ? 'Saving...' : 'Save Readings'}
            </button>
            <button style={styles.btn()} onClick={reset}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}
