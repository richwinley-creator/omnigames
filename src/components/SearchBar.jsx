import { useState, useEffect, useRef } from 'react';

const ENTITY_COLORS = { lead: '#3b82f6', location: '#059669', ticket: '#ef4444', deal: '#7c3aed', task: '#f59e0b' };
const ENTITY_LABELS = { lead: 'Lead', location: 'Location', ticket: 'Ticket', deal: 'JVL Deal', task: 'Task' };

const styles = {
  wrapper: { position: 'relative' },
  input: {
    padding: '6px 12px 6px 32px', background: '#2a2a4a', border: '1px solid #3a3a5a',
    borderRadius: 6, color: '#d1d5db', fontSize: 12, width: 220, outline: 'none',
  },
  icon: { position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 13, color: '#6b7280' },
  dropdown: {
    position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 4,
    background: '#fff', borderRadius: 8, boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
    maxHeight: 360, overflow: 'auto', zIndex: 200, minWidth: 320,
  },
  group: { padding: '8px 12px', fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', background: '#f9fafb' },
  item: {
    padding: '8px 14px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between',
    alignItems: 'center', borderBottom: '1px solid #f3f4f6', fontSize: 13,
  },
  itemHover: { background: '#f3f4f6' },
  badge: (color) => ({ display: 'inline-block', padding: '1px 8px', borderRadius: 10, fontSize: 10, fontWeight: 600, background: color + '18', color }),
  noResults: { padding: '16px 14px', color: '#9ca3af', fontSize: 13, textAlign: 'center' },
};

export default function SearchBar({ onNavigate }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [show, setShow] = useState(false);
  const [hoveredIdx, setHoveredIdx] = useState(-1);
  const ref = useRef();
  const timerRef = useRef();

  useEffect(() => {
    if (query.length < 2) { setResults(null); setShow(false); return; }
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      try {
        const token = localStorage.getItem('gse_token');
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        setResults(data.results || []);
        setShow(true);
      } catch { setResults([]); }
    }, 300);
    return () => clearTimeout(timerRef.current);
  }, [query]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setShow(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const grouped = {};
  (results || []).forEach(r => {
    if (!grouped[r.type]) grouped[r.type] = [];
    grouped[r.type].push(r);
  });

  return (
    <div style={styles.wrapper} ref={ref}>
      <span style={styles.icon}>🔍</span>
      <input style={styles.input} placeholder="Search leads, locations..." value={query}
        onChange={e => setQuery(e.target.value)} onFocus={() => results && setShow(true)} />
      {show && (
        <div style={styles.dropdown}>
          {results && results.length === 0 && <div style={styles.noResults}>No results for "{query}"</div>}
          {Object.entries(grouped).map(([type, items]) => (
            <div key={type}>
              <div style={styles.group}>{ENTITY_LABELS[type] || type}s</div>
              {items.map((item, i) => (
                <div key={`${type}-${item.id}`}
                  style={{ ...styles.item, ...(hoveredIdx === `${type}-${i}` ? styles.itemHover : {}) }}
                  onMouseEnter={() => setHoveredIdx(`${type}-${i}`)}
                  onMouseLeave={() => setHoveredIdx(-1)}
                  onClick={() => { onNavigate && onNavigate(type, item.id); setShow(false); setQuery(''); }}>
                  <div>
                    <div style={{ fontWeight: 600 }}>{item.title}</div>
                    {item.subtitle && <div style={{ fontSize: 11, color: '#6b7280' }}>{item.subtitle}</div>}
                  </div>
                  {item.status && <span style={styles.badge(ENTITY_COLORS[type] || '#6b7280')}>{item.status}</span>}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
