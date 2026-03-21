import { useState } from 'react';
import { useApi, apiPost, apiPut } from '../hooks/useApi';

const styles = {
  card: { background: '#fff', borderRadius: 10, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  h2: { margin: 0, fontSize: 20, fontWeight: 700 },
  addBtn: { padding: '8px 16px', background: '#4f46e5', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 13 },
  th: { textAlign: 'left', padding: '10px 12px', borderBottom: '2px solid #e5e7eb', fontWeight: 600, color: '#374151', fontSize: 12 },
  td: { padding: '10px 12px', borderBottom: '1px solid #f3f4f6' },
  badge: (active) => ({ display: 'inline-block', padding: '2px 10px', borderRadius: 12, fontSize: 11, fontWeight: 600, background: active ? '#dcfce7' : '#fee2e2', color: active ? '#16a34a' : '#dc2626' }),
  roleBadge: (role) => ({ display: 'inline-block', padding: '2px 10px', borderRadius: 12, fontSize: 11, fontWeight: 600, background: role === 'admin' ? '#ede9fe' : '#e0f2fe', color: role === 'admin' ? '#7c3aed' : '#0284c7' }),
  modal: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modalCard: { background: '#fff', borderRadius: 12, padding: 28, width: 400 },
  input: { width: '100%', padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13, marginBottom: 12, boxSizing: 'border-box' },
  select: { width: '100%', padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13, marginBottom: 12, boxSizing: 'border-box', background: '#fff' },
  label: { display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 3 },
  actionBtn: (color) => ({ padding: '4px 10px', borderRadius: 4, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 600, background: color + '18', color, marginRight: 4 }),
};

export default function Team() {
  const [showForm, setShowForm] = useState(false);
  const { data: users, refetch } = useApi('/api/auth/users');

  const toggleActive = async (user) => {
    await apiPut(`/api/auth/users/${user.id}`, { active: !user.active });
    refetch();
  };

  return (
    <div style={styles.card}>
      <div style={styles.header}>
        <h2 style={styles.h2}>Team Members</h2>
        <button style={styles.addBtn} onClick={() => setShowForm(true)}>+ Add User</button>
      </div>
      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>Name</th>
            <th style={styles.th}>Username</th>
            <th style={styles.th}>Role</th>
            <th style={styles.th}>Status</th>
            <th style={styles.th}>Joined</th>
            <th style={styles.th}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {(users || []).map(u => (
            <tr key={u.id}>
              <td style={styles.td}><span style={{ fontWeight: 600 }}>{u.name}</span></td>
              <td style={styles.td}>{u.username}</td>
              <td style={styles.td}><span style={styles.roleBadge(u.role)}>{u.role}</span></td>
              <td style={styles.td}><span style={styles.badge(u.active)}>{u.active ? 'Active' : 'Disabled'}</span></td>
              <td style={styles.td}>{u.created_at?.slice(0, 10)}</td>
              <td style={styles.td}>
                <button style={styles.actionBtn(u.active ? '#ef4444' : '#22c55e')} onClick={() => toggleActive(u)}>
                  {u.active ? 'Disable' : 'Enable'}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {showForm && <UserForm onClose={() => setShowForm(false)} onSave={() => { refetch(); setShowForm(false); }} />}
    </div>
  );
}

function UserForm({ onClose, onSave }) {
  const [form, setForm] = useState({ username: '', password: '', name: '', role: 'team' });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await apiPost('/api/auth/users', form);
      onSave();
    } catch (e) { alert(e.message); } finally { setSaving(false); }
  };

  return (
    <div style={styles.modal} onClick={onClose}>
      <form style={styles.modalCard} onClick={e => e.stopPropagation()} onSubmit={handleSave}>
        <h3 style={{ margin: '0 0 20px', fontSize: 18 }}>Add Team Member</h3>
        <label style={styles.label}>Full Name *</label>
        <input style={styles.input} value={form.name} onChange={e => set('name', e.target.value)} required />
        <label style={styles.label}>Username *</label>
        <input style={styles.input} value={form.username} onChange={e => set('username', e.target.value)} required />
        <label style={styles.label}>Password *</label>
        <input style={styles.input} type="password" value={form.password} onChange={e => set('password', e.target.value)} required />
        <label style={styles.label}>Role</label>
        <select style={styles.select} value={form.role} onChange={e => set('role', e.target.value)}>
          <option value="team">Team Member</option>
          <option value="admin">Admin</option>
        </select>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
          <button type="button" style={{ ...styles.addBtn, background: '#e5e7eb', color: '#374151' }} onClick={onClose}>Cancel</button>
          <button style={{ ...styles.addBtn, opacity: saving ? 0.7 : 1 }} disabled={saving}>{saving ? 'Saving...' : 'Add User'}</button>
        </div>
      </form>
    </div>
  );
}
