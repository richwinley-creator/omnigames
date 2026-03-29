import { useState } from 'react';

const styles = {
  wrapper: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  card: {
    background: '#fff',
    borderRadius: 16,
    padding: '44px 40px 36px',
    width: 400,
    boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
  },
  title: { fontSize: 22, fontWeight: 800, margin: 0, color: '#0f172a', textAlign: 'center', letterSpacing: '-0.02em' },
  subtitle: { fontSize: 14, color: '#94a3b8', textAlign: 'center', marginTop: 6, marginBottom: 32, fontWeight: 400 },
  label: { display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 5 },
  input: {
    width: '100%', padding: '11px 14px', border: '1px solid #e2e8f0', borderRadius: 10,
    fontSize: 14, marginBottom: 18, boxSizing: 'border-box', outline: 'none',
    transition: 'border-color 0.15s, box-shadow 0.15s',
    background: '#f8fafc',
  },
  btn: {
    width: '100%', padding: '12px', background: '#b8943d', color: '#fff', border: 'none',
    borderRadius: 10, fontSize: 15, fontWeight: 600, cursor: 'pointer',
    transition: 'background 0.15s, transform 0.1s',
    marginTop: 4,
  },
  error: {
    background: '#fef2f2', color: '#dc2626', padding: '10px 14px', borderRadius: 10,
    fontSize: 13, marginBottom: 18, textAlign: 'center', border: '1px solid #fecaca',
  },
  divider: {
    display: 'flex', alignItems: 'center', gap: 12, margin: '24px 0 0',
    fontSize: 11, color: '#94a3b8',
  },
  line: { flex: 1, height: 1, background: '#e2e8f0' },
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
        <img
          src="/images/omni-icon.jpeg"
          alt="Omni Gaming"
          style={{ width: 56, height: 56, display: 'block', margin: '0 auto 18px', borderRadius: 14, boxShadow: '0 4px 12px rgba(0,0,0,0.12)' }}
        />
        <h1 style={styles.title}>Omni Gaming</h1>
        <p style={styles.subtitle}>{title}</p>
        {error && <div style={styles.error}>{error}</div>}
        <label style={styles.label}>Username</label>
        <input
          style={styles.input}
          value={username}
          onChange={e => setUsername(e.target.value)}
          placeholder="Enter your username"
          autoFocus
        />
        <label style={styles.label}>Password</label>
        <input
          style={styles.input}
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          placeholder="Enter your password"
        />
        <button style={{ ...styles.btn, opacity: loading ? 0.7 : 1 }} disabled={loading}>
          {loading ? 'Signing in...' : 'Sign In'}
        </button>
        <div style={styles.divider}>
          <div style={styles.line} />
          <span>Omni Gaming Operations</span>
          <div style={styles.line} />
        </div>
      </form>
    </div>
  );
}
