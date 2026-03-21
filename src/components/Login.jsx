import { useState } from 'react';

const styles = {
  wrapper: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  card: {
    background: '#fff',
    borderRadius: 12,
    padding: 40,
    width: 380,
    boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
  },
  title: { fontSize: 24, fontWeight: 700, margin: 0, color: '#1a1a2e', textAlign: 'center' },
  subtitle: { fontSize: 14, color: '#6b7280', textAlign: 'center', marginTop: 4, marginBottom: 28 },
  label: { display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 4 },
  input: {
    width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: 8,
    fontSize: 14, marginBottom: 16, boxSizing: 'border-box', outline: 'none',
  },
  btn: {
    width: '100%', padding: '12px', background: '#4f46e5', color: '#fff', border: 'none',
    borderRadius: 8, fontSize: 15, fontWeight: 600, cursor: 'pointer',
  },
  error: {
    background: '#fef2f2', color: '#dc2626', padding: '8px 12px', borderRadius: 6,
    fontSize: 13, marginBottom: 16, textAlign: 'center',
  },
};

export default function Login({ onLogin, title = 'Admin Dashboard' }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Login failed');
      localStorage.setItem('gse_token', data.token);
      localStorage.setItem('gse_user', JSON.stringify(data.user));
      onLogin(data.user);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.wrapper}>
      <form style={styles.card} onSubmit={handleSubmit}>
        <img src="/images/omni-icon.jpeg" alt="Omni Gaming" style={{ width: 60, height: 60, display: 'block', margin: '0 auto 16px', borderRadius: 12 }} />
        <h1 style={styles.title}>Omni Gaming</h1>
        <p style={styles.subtitle}>{title}</p>
        {error && <div style={styles.error}>{error}</div>}
        <label style={styles.label}>Username</label>
        <input style={styles.input} value={username} onChange={e => setUsername(e.target.value)} autoFocus />
        <label style={styles.label}>Password</label>
        <input style={styles.input} type="password" value={password} onChange={e => setPassword(e.target.value)} />
        <button style={{ ...styles.btn, opacity: loading ? 0.7 : 1 }} disabled={loading}>
          {loading ? 'Signing in...' : 'Sign In'}
        </button>
      </form>
    </div>
  );
}
