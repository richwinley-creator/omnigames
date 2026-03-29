import { useState, useEffect, useRef } from 'react';
import { useApi, apiPut } from '../hooks/useApi';

const TYPE_COLORS = { new_lead: '#3b82f6', task_due: '#f59e0b', task_overdue: '#ef4444', ticket_urgent: '#ef4444', stage_change: '#10b981' };

const styles = {
  wrapper: { position: 'relative' },
  bell: {
    background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: '#d1d5db',
    position: 'relative', padding: '4px 8px',
  },
  count: {
    position: 'absolute', top: 0, right: 2, background: '#ef4444', color: '#fff',
    borderRadius: '50%', width: 16, height: 16, fontSize: 10, fontWeight: 700,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  dropdown: {
    position: 'absolute', top: '100%', right: 0, marginTop: 8,
    background: '#fff', borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
    width: 360, maxHeight: 420, overflow: 'auto', zIndex: 200,
  },
  header: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '12px 16px', borderBottom: '1px solid #e5e7eb',
  },
  title: { fontSize: 14, fontWeight: 700 },
  markAll: { fontSize: 12, color: '#b8943d', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 },
  item: (read) => ({
    padding: '10px 16px', borderBottom: '1px solid #f3f4f6', cursor: 'pointer',
    background: read ? '#fff' : '#fffbeb',
  }),
  itemTitle: { fontSize: 13, fontWeight: 600, marginBottom: 2 },
  itemBody: { fontSize: 12, color: '#6b7280' },
  itemTime: { fontSize: 10, color: '#9ca3af', marginTop: 4 },
  dot: (color) => ({
    display: 'inline-block', width: 8, height: 8, borderRadius: '50%',
    background: color, marginRight: 6,
  }),
  empty: { padding: '24px 16px', textAlign: 'center', color: '#9ca3af', fontSize: 13 },
};

export default function Notifications() {
  const [show, setShow] = useState(false);
  const { data: notifications, refetch } = useApi('/api/notifications?limit=30');
  const { data: unreadData, refetch: refetchCount } = useApi('/api/notifications/unread-count');
  const ref = useRef();

  const unread = unreadData?.count || 0;

  useEffect(() => {
    const interval = setInterval(() => { refetchCount(); }, 30000);
    return () => clearInterval(interval);
  }, [refetchCount]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setShow(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarkRead = async (id) => {
    await apiPut(`/api/notifications/${id}/read`);
    refetch(); refetchCount();
  };

  const handleMarkAll = async () => {
    await apiPut('/api/notifications/read-all');
    refetch(); refetchCount();
  };

  return (
    <div style={styles.wrapper} ref={ref}>
      <button style={styles.bell} onClick={() => { setShow(!show); if (!show) refetch(); }}>
        🔔
        {unread > 0 && <span style={styles.count}>{unread > 9 ? '9+' : unread}</span>}
      </button>
      {show && (
        <div style={styles.dropdown}>
          <div style={styles.header}>
            <span style={styles.title}>Notifications</span>
            {unread > 0 && <button style={styles.markAll} onClick={handleMarkAll}>Mark all read</button>}
          </div>
          {(notifications || []).length === 0 ? (
            <div style={styles.empty}>No notifications yet.</div>
          ) : (
            (notifications || []).map(n => (
              <div key={n.id} style={styles.item(n.read)} onClick={() => !n.read && handleMarkRead(n.id)}>
                <div style={styles.itemTitle}>
                  <span style={styles.dot(TYPE_COLORS[n.type] || '#6b7280')} />
                  {n.title}
                </div>
                {n.body && <div style={styles.itemBody}>{n.body}</div>}
                <div style={styles.itemTime}>{new Date(n.created_at).toLocaleString()}</div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
