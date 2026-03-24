import { useState } from 'react';
import { useApi, apiPost, apiPut, apiDelete } from '../hooks/useApi';

const PRIORITIES = [
  { key: 'urgent', label: 'Urgent', color: '#ef4444' },
  { key: 'high', label: 'High', color: '#f59e0b' },
  { key: 'normal', label: 'Normal', color: '#3b82f6' },
  { key: 'low', label: 'Low', color: '#6b7280' },
];
const STATUSES = [
  { key: 'pending', label: 'Pending', color: '#f59e0b' },
  { key: 'in_progress', label: 'In Progress', color: '#3b82f6' },
  { key: 'completed', label: 'Completed', color: '#22c55e' },
  { key: 'cancelled', label: 'Cancelled', color: '#9ca3af' },
];
const PRIORITY_MAP = Object.fromEntries(PRIORITIES.map(p => [p.key, p]));
const STATUS_MAP = Object.fromEntries(STATUSES.map(s => [s.key, s]));

const styles = {
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 },
  h2: { margin: 0, fontSize: 20, fontWeight: 700 },
  addBtn: { padding: '8px 16px', background: '#4f46e5', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  card: { background: '#fff', borderRadius: 10, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 13 },
  th: { textAlign: 'left', padding: '10px 12px', borderBottom: '2px solid #e5e7eb', fontWeight: 600, color: '#374151', fontSize: 12 },
  td: { padding: '10px 12px', borderBottom: '1px solid #f3f4f6', verticalAlign: 'top' },
  badge: (color) => ({ display: 'inline-block', padding: '2px 10px', borderRadius: 12, fontSize: 11, fontWeight: 600, background: color + '18', color }),
  pills: { display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 },
  pill: (active) => ({ padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 500, cursor: 'pointer', border: 'none', background: active ? '#4f46e5' : '#e5e7eb', color: active ? '#fff' : '#374151' }),
  actionBtn: (color) => ({ padding: '4px 10px', borderRadius: 4, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 600, background: color + '18', color, marginRight: 4 }),
  stats: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 12, marginBottom: 20 },
  statCard: (color) => ({ background: color + '10', borderRadius: 8, padding: '12px 16px', textAlign: 'center', borderLeft: `3px solid ${color}` }),
  statNum: { fontSize: 24, fontWeight: 700 },
  statLabel: { fontSize: 10, color: '#6b7280', textTransform: 'uppercase' },
  modal: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modalCard: { background: '#fff', borderRadius: 12, padding: 28, width: 480, maxHeight: '85vh', overflow: 'auto' },
  input: { width: '100%', padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13, marginBottom: 12, boxSizing: 'border-box' },
  select: { width: '100%', padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13, marginBottom: 12, boxSizing: 'border-box', background: '#fff' },
  label: { display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 3 },
  row: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 },
  overdue: { background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 16px', marginBottom: 16, fontSize: 13, color: '#991b1b', display: 'flex', alignItems: 'center', gap: 8 },
};

export default function Tasks() {
  const [filter, setFilter] = useState('active');
  const [showForm, setShowForm] = useState(false);
  const [editTask, setEditTask] = useState(null);
  const { data: tasks, refetch } = useApi('/api/tasks');
  const { data: summary, refetch: refetchSummary } = useApi('/api/tasks/summary');
  const { data: users } = useApi('/api/auth/users');

  const today = new Date().toISOString().split('T')[0];
  const filtered = (tasks || []).filter(t => {
    if (filter === 'active') return t.status !== 'completed' && t.status !== 'cancelled';
    if (filter === 'overdue') return t.due_date && t.due_date < today && t.status !== 'completed' && t.status !== 'cancelled';
    return t.status === filter;
  });

  const refresh = () => { refetch(); refetchSummary(); };
  const isOverdue = (t) => t.due_date && t.due_date < today && t.status !== 'completed' && t.status !== 'cancelled';

  const handleStatusChange = async (task, newStatus) => {
    await apiPut(`/api/tasks/${task.id}`, { status: newStatus });
    refresh();
  };

  return (
    <div>
      {summary && (
        <div style={styles.stats}>
          {STATUSES.map(s => {
            const count = (summary.byStatus || []).find(b => b.status === s.key)?.count || 0;
            return (
              <div key={s.key} style={styles.statCard(s.color)}>
                <div style={{ ...styles.statNum, color: s.color }}>{count}</div>
                <div style={styles.statLabel}>{s.label}</div>
              </div>
            );
          })}
          <div style={styles.statCard('#ef4444')}>
            <div style={{ ...styles.statNum, color: '#ef4444' }}>{summary.overdue || 0}</div>
            <div style={styles.statLabel}>Overdue</div>
          </div>
          <div style={styles.statCard('#f59e0b')}>
            <div style={{ ...styles.statNum, color: '#f59e0b' }}>{summary.dueToday || 0}</div>
            <div style={styles.statLabel}>Due Today</div>
          </div>
        </div>
      )}

      {summary?.overdue > 0 && (
        <div style={styles.overdue}>⚠️ You have {summary.overdue} overdue task{summary.overdue > 1 ? 's' : ''} that need attention!</div>
      )}

      <div style={styles.card}>
        <div style={styles.header}>
          <h2 style={styles.h2}>Tasks</h2>
          <button style={styles.addBtn} onClick={() => { setEditTask(null); setShowForm(true); }}>+ New Task</button>
        </div>

        <div style={styles.pills}>
          {[{ key: 'active', label: 'Active' }, { key: 'overdue', label: 'Overdue' },
            ...STATUSES].map(s => (
            <button key={s.key} style={styles.pill(filter === s.key)} onClick={() => setFilter(s.key)}>
              {s.label} {s.key === 'overdue' ? `(${summary?.overdue || 0})` : ''}
            </button>
          ))}
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Task</th>
                <th style={styles.th}>Related To</th>
                <th style={styles.th}>Assigned</th>
                <th style={styles.th}>Priority</th>
                <th style={styles.th}>Due Date</th>
                <th style={styles.th}>Status</th>
                <th style={styles.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(task => {
                const pri = PRIORITY_MAP[task.priority] || PRIORITY_MAP.normal;
                const sta = STATUS_MAP[task.status] || STATUS_MAP.pending;
                const overdue = isOverdue(task);
                return (
                  <tr key={task.id} style={overdue ? { background: '#fef2f2' } : {}}>
                    <td style={styles.td}>
                      <div style={{ fontWeight: 600 }}>{task.title}</div>
                      {task.description && <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>{task.description.slice(0, 80)}</div>}
                    </td>
                    <td style={styles.td}>
                      {task.entity_type ? <span style={{ fontSize: 11, color: '#6b7280' }}>{task.entity_type} #{task.entity_id}</span> : '—'}
                    </td>
                    <td style={styles.td}>{task.assigned_name || '—'}</td>
                    <td style={styles.td}><span style={styles.badge(pri.color)}>{pri.label}</span></td>
                    <td style={{ ...styles.td, color: overdue ? '#ef4444' : '#374151', fontWeight: overdue ? 600 : 400 }}>
                      {task.due_date || '—'}{overdue && ' ⚠️'}
                    </td>
                    <td style={styles.td}><span style={styles.badge(sta.color)}>{sta.label}</span></td>
                    <td style={styles.td}>
                      {task.status === 'pending' && <button style={styles.actionBtn('#3b82f6')} onClick={() => handleStatusChange(task, 'in_progress')}>Start</button>}
                      {task.status === 'in_progress' && <button style={styles.actionBtn('#22c55e')} onClick={() => handleStatusChange(task, 'completed')}>Complete</button>}
                      {task.status === 'completed' && <button style={styles.actionBtn('#f59e0b')} onClick={() => handleStatusChange(task, 'pending')}>Reopen</button>}
                      <button style={styles.actionBtn('#6b7280')} onClick={() => { setEditTask(task); setShowForm(true); }}>Edit</button>
                      {task.status !== 'completed' && <button style={styles.actionBtn('#9ca3af')} onClick={() => handleStatusChange(task, 'cancelled')}>Cancel</button>}
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={7} style={{ ...styles.td, textAlign: 'center', color: '#9ca3af', padding: 40 }}>No tasks found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showForm && <TaskForm task={editTask} users={users || []} onClose={() => { setShowForm(false); setEditTask(null); }} onSave={refresh} />}
    </div>
  );
}

function TaskForm({ task, users, onClose, onSave }) {
  const [form, setForm] = useState({
    title: task?.title || '', description: task?.description || '',
    assigned_to: task?.assigned_to || '', priority: task?.priority || 'normal',
    due_date: task?.due_date || '', status: task?.status || 'pending',
    entity_type: task?.entity_type || '', entity_id: task?.entity_id || '',
  });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...form, assigned_to: form.assigned_to ? Number(form.assigned_to) : null,
        entity_id: form.entity_id ? Number(form.entity_id) : null,
        entity_type: form.entity_type || null };
      if (task) await apiPut(`/api/tasks/${task.id}`, payload);
      else await apiPost('/api/tasks', payload);
      onSave(); onClose();
    } catch (e) { alert(e.message); }
    finally { setSaving(false); }
  };

  return (
    <div style={styles.modal} onClick={onClose}>
      <form style={styles.modalCard} onClick={e => e.stopPropagation()} onSubmit={handleSave}>
        <h3 style={{ margin: '0 0 20px', fontSize: 18 }}>{task ? 'Edit Task' : 'New Task'}</h3>
        <label style={styles.label}>Title *</label>
        <input style={styles.input} value={form.title} onChange={e => set('title', e.target.value)} required />
        <label style={styles.label}>Description</label>
        <textarea style={{ ...styles.input, height: 60, resize: 'vertical' }} value={form.description} onChange={e => set('description', e.target.value)} />
        <div style={styles.row}>
          <div>
            <label style={styles.label}>Assigned To</label>
            <select style={styles.select} value={form.assigned_to} onChange={e => set('assigned_to', e.target.value)}>
              <option value="">Unassigned</option>
              {users.filter(u => u.active).map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          </div>
          <div>
            <label style={styles.label}>Priority</label>
            <select style={styles.select} value={form.priority} onChange={e => set('priority', e.target.value)}>
              {PRIORITIES.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}
            </select>
          </div>
        </div>
        <div style={styles.row}>
          <div>
            <label style={styles.label}>Due Date</label>
            <input style={styles.input} type="date" value={form.due_date} onChange={e => set('due_date', e.target.value)} />
          </div>
          <div>
            <label style={styles.label}>Status</label>
            <select style={styles.select} value={form.status} onChange={e => set('status', e.target.value)}>
              {STATUSES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
            </select>
          </div>
        </div>
        <div style={styles.row}>
          <div>
            <label style={styles.label}>Related Type</label>
            <select style={styles.select} value={form.entity_type} onChange={e => set('entity_type', e.target.value)}>
              <option value="">None</option>
              <option value="lead">Lead</option>
              <option value="location">Location</option>
              <option value="deal">JVL Deal</option>
              <option value="ticket">Service Ticket</option>
            </select>
          </div>
          <div>
            <label style={styles.label}>Related ID</label>
            <input style={styles.input} type="number" value={form.entity_id} onChange={e => set('entity_id', e.target.value)} placeholder="#" />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
          <button type="button" style={{ ...styles.addBtn, background: '#e5e7eb', color: '#374151' }} onClick={onClose}>Cancel</button>
          <button style={{ ...styles.addBtn, opacity: saving ? 0.7 : 1 }} disabled={saving}>{saving ? 'Saving...' : 'Save Task'}</button>
        </div>
      </form>
    </div>
  );
}
