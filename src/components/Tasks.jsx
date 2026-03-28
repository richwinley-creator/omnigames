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

const st = {
  addBtn: { padding: '9px 18px', background: '#4f46e5', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  pill: (active) => ({
    padding: '5px 14px', borderRadius: 20, fontSize: 12, fontWeight: 500, cursor: 'pointer', border: 'none',
    background: active ? '#4f46e5' : '#e5e7eb', color: active ? '#fff' : '#374151', transition: 'all 0.15s',
  }),
  stats: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 12, marginBottom: 20 },
  statCard: (color) => ({ background: color + '10', borderRadius: 10, padding: '12px 16px', textAlign: 'center', borderLeft: `3px solid ${color}` }),
  statNum: { fontSize: 24, fontWeight: 700 },
  statLabel: { fontSize: 10, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.04em' },
  modal: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modalCard: { background: '#fff', borderRadius: 12, padding: 28, width: 480, maxHeight: '85vh', overflow: 'auto' },
  input: { width: '100%', padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13, marginBottom: 12, boxSizing: 'border-box' },
  select: { width: '100%', padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13, marginBottom: 12, boxSizing: 'border-box', background: '#fff' },
  label: { display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 3 },
  row: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 },
};

function TaskCard({ task, today, onStatusChange, onEdit }) {
  const pri = PRIORITY_MAP[task.priority] || PRIORITY_MAP.normal;
  const sta = STATUS_MAP[task.status] || STATUS_MAP.pending;
  const isOverdue = task.due_date && task.due_date < today && task.status !== 'completed' && task.status !== 'cancelled';

  return (
    <div style={{
      background: '#fff', borderRadius: 12, padding: '16px 18px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.07)',
      borderLeft: `4px solid ${isOverdue ? '#ef4444' : pri.color}`,
      display: 'flex', flexDirection: 'column', gap: 10,
      opacity: task.status === 'cancelled' ? 0.55 : 1,
    }}>
      {/* Top row: title + status badge */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ fontWeight: 600, fontSize: 14, color: '#111827', lineHeight: 1.3 }}>{task.title}</div>
        <span style={{
          flexShrink: 0, fontSize: 10, fontWeight: 700, padding: '3px 9px', borderRadius: 10,
          background: sta.color + '18', color: sta.color, textTransform: 'uppercase', letterSpacing: '0.04em',
        }}>{sta.label}</span>
      </div>

      {/* Description */}
      {task.description && (
        <div style={{ fontSize: 12, color: '#6b7280', lineHeight: 1.5 }}>{task.description}</div>
      )}

      {/* Meta row */}
      <div style={{ display: 'flex', gap: 14, fontSize: 12, color: '#9ca3af', flexWrap: 'wrap' }}>
        {task.assigned_name && <span>👤 {task.assigned_name}</span>}
        {task.due_date && (
          <span style={{ color: isOverdue ? '#ef4444' : '#9ca3af', fontWeight: isOverdue ? 600 : 400 }}>
            {isOverdue ? '⚠️ Overdue · ' : '📅 '}{task.due_date}
          </span>
        )}
        {task.entity_type && <span style={{ color: '#c4b5fd' }}>{task.entity_type} #{task.entity_id}</span>}
      </div>

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: 8, marginTop: 2 }}>
        {task.status === 'pending' && (
          <button onClick={() => onStatusChange(task, 'in_progress')} style={{
            flex: 1, padding: '7px 0', borderRadius: 7, border: 'none', cursor: 'pointer',
            fontSize: 13, fontWeight: 600, background: '#3b82f6', color: '#fff',
          }}>▶ Start</button>
        )}
        {task.status === 'in_progress' && (
          <button onClick={() => onStatusChange(task, 'completed')} style={{
            flex: 1, padding: '7px 0', borderRadius: 7, border: 'none', cursor: 'pointer',
            fontSize: 13, fontWeight: 600, background: '#10b981', color: '#fff',
          }}>✓ Done</button>
        )}
        {task.status === 'completed' && (
          <button onClick={() => onStatusChange(task, 'pending')} style={{
            flex: 1, padding: '7px 0', borderRadius: 7, border: 'none', cursor: 'pointer',
            fontSize: 13, fontWeight: 600, background: '#f3f4f6', color: '#374151',
          }}>↩ Reopen</button>
        )}
        <button onClick={() => onEdit(task)} style={{
          padding: '7px 14px', borderRadius: 7, border: '1px solid #e5e7eb', cursor: 'pointer',
          fontSize: 13, fontWeight: 500, background: '#fff', color: '#374151',
        }}>Edit</button>
        {task.status !== 'completed' && task.status !== 'cancelled' && (
          <button onClick={() => onStatusChange(task, 'cancelled')} style={{
            padding: '7px 14px', borderRadius: 7, border: 'none', cursor: 'pointer',
            fontSize: 12, fontWeight: 500, background: '#f3f4f6', color: '#9ca3af',
          }}>✕</button>
        )}
      </div>
    </div>
  );
}

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

  // Group by priority for active/overdue views
  const useGrouped = filter === 'active' || filter === 'overdue';
  const groups = useGrouped
    ? PRIORITIES.map(p => ({ ...p, tasks: filtered.filter(t => t.priority === p.key) })).filter(g => g.tasks.length > 0)
    : [{ key: 'all', label: null, color: '#6b7280', tasks: filtered }];

  const refresh = () => { refetch(); refetchSummary(); };

  const handleStatusChange = async (task, newStatus) => {
    await apiPut(`/api/tasks/${task.id}`, { status: newStatus });
    refresh();
  };

  return (
    <div>
      {/* Stats */}
      {summary && (
        <div style={st.stats}>
          {STATUSES.map(s => {
            const count = (summary.byStatus || []).find(b => b.status === s.key)?.count || 0;
            return (
              <div key={s.key} style={st.statCard(s.color)}>
                <div style={{ ...st.statNum, color: s.color }}>{count}</div>
                <div style={st.statLabel}>{s.label}</div>
              </div>
            );
          })}
          <div style={st.statCard('#ef4444')}>
            <div style={{ ...st.statNum, color: '#ef4444' }}>{summary.overdue || 0}</div>
            <div style={st.statLabel}>Overdue</div>
          </div>
          <div style={st.statCard('#f59e0b')}>
            <div style={{ ...st.statNum, color: '#f59e0b' }}>{summary.dueToday || 0}</div>
            <div style={st.statLabel}>Due Today</div>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {[
            { key: 'active', label: 'Active' },
            { key: 'overdue', label: `Overdue${summary?.overdue ? ` (${summary.overdue})` : ''}` },
            ...STATUSES,
          ].map(s => (
            <button key={s.key} style={st.pill(filter === s.key)} onClick={() => setFilter(s.key)}>{s.label}</button>
          ))}
        </div>
        <button style={st.addBtn} onClick={() => { setEditTask(null); setShowForm(true); }}>+ New Task</button>
      </div>

      {/* Cards */}
      {filtered.length === 0 ? (
        <div style={{ background: '#fff', borderRadius: 12, padding: 48, textAlign: 'center', color: '#9ca3af', boxShadow: '0 1px 3px rgba(0,0,0,0.07)' }}>
          No tasks here. You're all caught up!
        </div>
      ) : (
        groups.map(group => (
          <div key={group.key} style={{ marginBottom: 24 }}>
            {group.label && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: group.color }} />
                <span style={{ fontSize: 12, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {group.label} · {group.tasks.length}
                </span>
              </div>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 12 }}>
              {group.tasks.map(task => (
                <TaskCard
                  key={task.id}
                  task={task}
                  today={today}
                  onStatusChange={handleStatusChange}
                  onEdit={(t) => { setEditTask(t); setShowForm(true); }}
                />
              ))}
            </div>
          </div>
        ))
      )}

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
    <div style={st.modal} onClick={onClose}>
      <form style={st.modalCard} onClick={e => e.stopPropagation()} onSubmit={handleSave}>
        <h3 style={{ margin: '0 0 20px', fontSize: 18 }}>{task ? 'Edit Task' : 'New Task'}</h3>
        <label style={st.label}>Title *</label>
        <input style={st.input} value={form.title} onChange={e => set('title', e.target.value)} required />
        <label style={st.label}>Description</label>
        <textarea style={{ ...st.input, height: 60, resize: 'vertical' }} value={form.description} onChange={e => set('description', e.target.value)} />
        <div style={st.row}>
          <div>
            <label style={st.label}>Assigned To</label>
            <select style={st.select} value={form.assigned_to} onChange={e => set('assigned_to', e.target.value)}>
              <option value="">Unassigned</option>
              {users.filter(u => u.active).map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          </div>
          <div>
            <label style={st.label}>Priority</label>
            <select style={st.select} value={form.priority} onChange={e => set('priority', e.target.value)}>
              {PRIORITIES.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}
            </select>
          </div>
        </div>
        <div style={st.row}>
          <div>
            <label style={st.label}>Due Date</label>
            <input style={st.input} type="date" value={form.due_date} onChange={e => set('due_date', e.target.value)} />
          </div>
          <div>
            <label style={st.label}>Status</label>
            <select style={st.select} value={form.status} onChange={e => set('status', e.target.value)}>
              {STATUSES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
            </select>
          </div>
        </div>
        <div style={st.row}>
          <div>
            <label style={st.label}>Related Type</label>
            <select style={st.select} value={form.entity_type} onChange={e => set('entity_type', e.target.value)}>
              <option value="">None</option>
              <option value="lead">Lead</option>
              <option value="location">Location</option>
              <option value="deal">JVL Deal</option>
              <option value="ticket">Service Ticket</option>
            </select>
          </div>
          <div>
            <label style={st.label}>Related ID</label>
            <input style={st.input} type="number" value={form.entity_id} onChange={e => set('entity_id', e.target.value)} placeholder="#" />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
          <button type="button" style={{ ...st.addBtn, background: '#e5e7eb', color: '#374151' }} onClick={onClose}>Cancel</button>
          <button style={{ ...st.addBtn, opacity: saving ? 0.7 : 1 }} disabled={saving}>{saving ? 'Saving...' : 'Save Task'}</button>
        </div>
      </form>
    </div>
  );
}
