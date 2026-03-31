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
  const [workbook, setWorkbook] = useState(null);
  const [sheetNames, setSheetNames] = useState([]);
  const [selectedSheet, setSelectedSheet] = useState('');

  const isPrevIn = (h) => (h.includes('perivous') || h.includes('pervious') || h.includes('previous') || h.includes('prev')) && h.includes('in') && !h.includes('out');
  const isCurrIn = (h) => (h.includes('current') || h.includes('curr')) && h.includes('in') && !h.includes('out');
  const isPrevOut = (h) => (h.includes('perivous') || h.includes('pervious') || h.includes('previous') || h.includes('prev')) && h.includes('out');
  const isCurrOut = (h) => (h.includes('current') || h.includes('curr')) && h.includes('out');
  const skipRows = ['total', 'totals', 'total in', 'total out', 'total left', 'kss', 'gse', 'net', 'grand total'];

  const parseSheet = useCallback((wb, sheetName) => {
    const sheet = wb.Sheets[sheetName];
    const rows = utils.sheet_to_json(sheet, { header: 1, defval: '' });
    if (rows.length < 3) return null;

    // Row 0 or 1 is often the location name (big merged cell)
    let locationName = '';
    for (let i = 0; i < Math.min(rows.length, 3); i++) {
      const cell = String(rows[i]?.[0] || rows[i]?.[1] || '').trim();
      if (cell && !cell.toLowerCase().includes('machine') && !cell.match(/^\d+$/) && cell.length > 2) {
        locationName = cell;
        break;
      }
    }

    // Find header row — look for "machine" column
    let headerIdx = -1;
    for (let i = 0; i < Math.min(rows.length, 10); i++) {
      const row = rows[i].map(c => String(c).toLowerCase().trim());
      if (row.some(c => c.includes('machine') || c === 'machines')) { headerIdx = i; break; }
    }
    // Fallback: look for "perivous" or "previous" or "current"
    if (headerIdx === -1) {
      for (let i = 0; i < Math.min(rows.length, 10); i++) {
        const row = rows[i].map(c => String(c).toLowerCase().trim());
        if (row.some(c => isPrevIn(c) || isCurrIn(c))) { headerIdx = i; break; }
      }
    }
    if (headerIdx === -1) return null;

    const headers = rows[headerIdx].map(c => String(c).toLowerCase().trim());

    // Map columns
    const nameCol = headers.findIndex(h => h.includes('machine') || h === 'machines');
    const prevInCol = headers.findIndex(h => isPrevIn(h));
    const currInCol = headers.findIndex(h => isCurrIn(h));
    const prevOutCol = headers.findIndex(h => isPrevOut(h));
    const currOutCol = headers.findIndex(h => isCurrOut(h));

    const getNum = (row, col) => {
      if (col < 0 || col >= row.length) return 0;
      const v = parseFloat(String(row[col]).replace(/[,$\s]/g, ''));
      return isNaN(v) ? 0 : v;
    };

    const machines = [];
    for (let i = headerIdx + 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.every(c => c === '')) continue;

      const name = nameCol >= 0 ? String(row[nameCol] || '').trim() : String(row[1] || row[0] || '').trim();
      if (!name) continue;
      if (skipRows.some(s => name.toLowerCase().startsWith(s))) continue;

      const pi = getNum(row, prevInCol >= 0 ? prevInCol : 3);
      const ci = getNum(row, currInCol >= 0 ? currInCol : 4);
      const po = getNum(row, prevOutCol >= 0 ? prevOutCol : 7);
      const co = getNum(row, currOutCol >= 0 ? currOutCol : 8);

      if (pi === 0 && ci === 0 && po === 0 && co === 0) continue;

      machines.push({ machine_name: name, prev_in: pi, curr_in: ci, prev_out: po, curr_out: co });
    }

    if (machines.length === 0) return null;

    // Try to parse date from sheet name (e.g. "3-30-26" → 2026-03-30)
    let parsedDate = readingDate;
    const dateMatch = sheetName.match(/(\d{1,2})-(\d{1,2})-(\d{2,4})/);
    if (dateMatch) {
      const [, m, d, y] = dateMatch;
      const year = y.length === 2 ? '20' + y : y;
      parsedDate = `${year}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    }

    return { location: locationName, date: parsedDate, machines };
  }, [readingDate]);

  const processSpreadsheet = useCallback((file) => {
    setStatus(null);
    setExtracted(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const wb = read(e.target.result, { type: 'array' });
        setWorkbook(wb);
        setSheetNames(wb.SheetNames);

        // Default to last sheet (most recent date)
        const lastSheet = wb.SheetNames[wb.SheetNames.length - 1];
        setSelectedSheet(lastSheet);

        const result = parseSheet(wb, lastSheet);
        if (result) {
          setExtracted(result);
          setReadingDate(result.date);

          // Match location
          if (result.location && locations) {
            const match = locations.find(l =>
              l.name.toLowerCase().includes(result.location.toLowerCase()) ||
              result.location.toLowerCase().includes(l.name.toLowerCase()) ||
              l.sheet_name?.toLowerCase() === result.location.toLowerCase()
            );
            if (match) setSelectedLocation(String(match.id));
          }

          setStatus({ type: 'success', msg: `Found ${result.machines.length} machines from "${lastSheet}" — ${result.location || 'Unknown location'}` });
        } else {
          setStatus({ type: 'error', msg: `Could not parse sheet "${lastSheet}". Try a different sheet tab.` });
        }
      } catch (err) {
        setStatus({ type: 'error', msg: `Failed to parse file: ${err.message}` });
      }
    };
    reader.readAsArrayBuffer(file);
  }, [locations, readingDate, parseSheet]);

  const switchSheet = (sheetName) => {
    setSelectedSheet(sheetName);
    if (!workbook) return;
    const result = parseSheet(workbook, sheetName);
    if (result) {
      setExtracted(result);
      setReadingDate(result.date);
      if (result.location && locations) {
        const match = locations.find(l =>
          l.name.toLowerCase().includes(result.location.toLowerCase()) ||
          result.location.toLowerCase().includes(l.name.toLowerCase())
        );
        if (match) setSelectedLocation(String(match.id));
      }
      setStatus({ type: 'success', msg: `Found ${result.machines.length} machines from "${sheetName}" — ${result.location || 'Unknown location'}` });
    } else {
      setExtracted(null);
      setStatus({ type: 'error', msg: `Could not parse sheet "${sheetName}".` });
    }
  };

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
          {/* Sheet tabs */}
          {sheetNames.length > 1 && (
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, color: '#6b7280', display: 'block', marginBottom: 6 }}>Sheet (date)</label>
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                {sheetNames.map(s => (
                  <button key={s} onClick={() => switchSheet(s)} style={{
                    padding: '6px 12px', borderRadius: 6, border: '1px solid #e5e7eb', cursor: 'pointer',
                    fontSize: 12, fontWeight: selectedSheet === s ? 600 : 400,
                    background: selectedSheet === s ? '#b8943d' : '#fff',
                    color: selectedSheet === s ? '#fff' : '#6b7280',
                  }}>{s}</button>
                ))}
              </div>
            </div>
          )}

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
