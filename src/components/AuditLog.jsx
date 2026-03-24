import { useState } from 'react';
import { useApi } from '../hooks/useApi';

const styles = {
  card: { background: '#fff', borderRadius: 10, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 },
  h2: { margin: 0, fontSize: 20, fontWeight: 700 },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 13 },
  th: { textAlign: 'left', padding: '10px 12px', borderBottom: '2px solid #e5e7eb', fontWeight: 600, color: '#374151', fontSize: 12 },
  td: { padding: '10px 12px', borderBottom: '1px solid #f3f4f6', verticalAlign: 'top' },
  badge: (color) => ({ display: 'inline-block', padding: '2px 10px', borderRadius: 12, fontSize: 11, fontWeight: 600, background: color + '18', color }),
  select: { padding: '6px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13, background: '#fff' },
  filters: { display: 'flex', gap: 8, alignItems: 'center' },
};

const ACTION_COLORS = { create: '#22c55e', update: '#3b82f6', delete: '#ef4444', stage_change: '#f59e0b' };

export default function AuditLog() {
  const [entityFilter, setEntityFilter] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const url = `/api/audit?${entityFilter ? `entity_type=${entityFilter}&` : ''}${actionFilter ? `action=${actionFilter}&` : ''}limit=200`;
  const { data: logs } = useApi(url);

  return (
    <div style={styles.card}>
      <div style={styles.header}>
        <h2 style={styles.h2}>Audit Log</h2>
        <div style={styles.filters}>
          <select style={styles.select} value={entityFilter} onChange={e => setEntityFilter(e.target.value)}>
            <option value="">All Entities</option>
            <option value="lead">Leads</option>
            <option value="location">Locations</option>
            <option value="deal">JVL Deals</option>
            <option value="ticket">Service Tickets</option>
            <option value="task">Tasks</option>
          </select>
          <select style={styles.select} value={actionFilter} onChange={e => setActionFilter(e.target.value)}>
            <option value="">All Actions</option>
            <option value="create">Create</option>
            <option value="update">Update</option>
            <option value="delete">Delete</option>
          </select>
        </div>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Time</th>
              <th style={styles.th}>User</th>
              <th style={styles.th}>Action</th>
              <th style={styles.th}>Entity</th>
              <th style={styles.th}>Field</th>
              <th style={styles.th}>Old Value</th>
              <th style={styles.th}>New Value</th>
            </tr>
          </thead>
          <tbody>
            {(logs || []).map(log => (
              <tr key={log.id}>
                <td style={styles.td}><span style={{ fontSize: 11, color: '#6b7280' }}>{new Date(log.created_at).toLocaleString()}</span></td>
                <td style={styles.td}>{log.user_name || '—'}</td>
                <td style={styles.td}><span style={styles.badge(ACTION_COLORS[log.action] || '#6b7280')}>{log.action}</span></td>
                <td style={styles.td}>{log.entity_type} #{log.entity_id}</td>
                <td style={styles.td}>{log.field_name || '—'}</td>
                <td style={styles.td}><span style={{ color: '#ef4444', fontSize: 12 }}>{log.old_value || '—'}</span></td>
                <td style={styles.td}><span style={{ color: '#22c55e', fontSize: 12 }}>{log.new_value || '—'}</span></td>
              </tr>
            ))}
            {(logs || []).length === 0 && (
              <tr><td colSpan={7} style={{ ...styles.td, textAlign: 'center', color: '#9ca3af', padding: 40 }}>No audit entries yet. Changes will appear here as you use the system.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
