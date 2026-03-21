import { useState } from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import SiteNav from './components/SiteNav';
import SiteFooter from './components/SiteFooter';
import Home from './pages/Home';
import About from './pages/About';
import Games from './pages/Games';
import Markets from './pages/Markets';
import Contact from './pages/Contact';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import Locations from './components/Locations';
import MeterImport from './components/MeterImport';
import JVLPipeline from './components/JVLPipeline';
import Deposits from './components/Deposits';
import Payments from './components/Payments';
import RampPlan from './components/RampPlan';
import Leads from './components/Leads';
import Service from './components/Service';
import Fills from './components/Fills';
import Team from './components/Team';
import './styles.css';

/* ─── Public Layout ─── */
function PublicLayout() {
  return (
    <>
      <SiteNav />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
        <Route path="/games" element={<Games />} />
        <Route path="/markets" element={<Markets />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/dashboard/*" element={<DashboardShell mode="admin" />} />
        <Route path="/portal/*" element={<DashboardShell mode="team" />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
      <Routes>
        <Route path="/dashboard/*" element={null} />
        <Route path="/portal/*" element={null} />
        <Route path="*" element={<SiteFooter />} />
      </Routes>
    </>
  );
}

/* ─── Dashboard Shell (auth-gated) ─── */
const ADMIN_TABS = [
  { key: 'overview', label: 'Dashboard', path: '' },
  { key: 'leads', label: 'Leads', path: 'leads' },
  { key: 'locations', label: 'Locations', path: 'locations' },
  { key: 'meter', label: 'Meter Import', path: 'meter' },
  { key: 'fills', label: 'Fills', path: 'fills' },
  { key: 'service', label: 'Service', path: 'service' },
  { key: 'jvl', label: 'JVL Pipeline', path: 'jvl' },
  { key: 'deposits', label: 'Deposits', path: 'deposits' },
  { key: 'payments', label: 'Payments', path: 'payments' },
  { key: 'ramp', label: 'Ramp Plan', path: 'ramp' },
  { key: 'team', label: 'Team', path: 'team', adminOnly: true },
];

const TEAM_TABS = [
  { key: 'overview', label: 'Dashboard', path: '' },
  { key: 'leads', label: 'Leads', path: 'leads' },
  { key: 'locations', label: 'Locations', path: 'locations' },
  { key: 'meter', label: 'Meter Import', path: 'meter' },
  { key: 'fills', label: 'Fills', path: 'fills' },
  { key: 'service', label: 'Service', path: 'service' },
  { key: 'deposits', label: 'Deposits', path: 'deposits' },
  { key: 'payments', label: 'Payments', path: 'payments' },
];

const dashStyles = {
  header: {
    background: '#1a1a2e', color: '#fff', padding: '12px 24px',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    flexWrap: 'wrap', gap: 8, position: 'sticky', top: 64, zIndex: 50,
    borderBottom: '1px solid #1e293b',
  },
  nav: { display: 'flex', gap: 4, flexWrap: 'wrap', alignItems: 'center' },
  tab: (active) => ({
    padding: '6px 14px', border: 'none', borderRadius: 6, cursor: 'pointer',
    fontSize: 12, fontWeight: active ? 600 : 400,
    background: active ? '#4f46e5' : 'transparent',
    color: active ? '#fff' : '#9ca3af', transition: 'all 0.15s',
    textDecoration: 'none', display: 'inline-block',
  }),
  content: { padding: 24, maxWidth: 1400, margin: '0 auto', minHeight: 'calc(100vh - 128px)' },
  userInfo: {
    display: 'flex', alignItems: 'center', gap: 12,
  },
  userName: { fontSize: 13, color: '#d1d5db' },
  logoutBtn: {
    padding: '5px 12px', background: '#374151', color: '#9ca3af', border: 'none',
    borderRadius: 6, fontSize: 11, cursor: 'pointer',
  },
};

function DashboardShell({ mode = 'admin' }) {
  const isAdmin = mode === 'admin';
  const storagePrefix = isAdmin ? 'gse' : 'gse_team';
  const basePath = isAdmin ? '/dashboard' : '/portal';

  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem(`${storagePrefix}_user`);
      const token = localStorage.getItem(`${storagePrefix}_token`);
      if (stored && token) {
        localStorage.setItem('gse_token', token);
        return JSON.parse(stored);
      }
      return null;
    } catch { return null; }
  });
  const [refreshKey, setRefreshKey] = useState(0);
  const location = useLocation();

  const refresh = () => setRefreshKey(k => k + 1);
  const handleLogin = (u) => {
    const token = localStorage.getItem('gse_token');
    localStorage.setItem(`${storagePrefix}_token`, token);
    localStorage.setItem(`${storagePrefix}_user`, JSON.stringify(u));
    setUser(u);
  };
  const handleLogout = () => {
    localStorage.removeItem('gse_token');
    localStorage.removeItem(`${storagePrefix}_token`);
    localStorage.removeItem(`${storagePrefix}_user`);
    setUser(null);
  };

  if (!user) {
    return <Login onLogin={handleLogin} title={isAdmin ? 'Admin Dashboard' : 'Team Portal'} />;
  }

  // Admin gets all tabs, team gets limited tabs
  const allTabs = isAdmin ? ADMIN_TABS : TEAM_TABS;
  const visibleTabs = allTabs.filter(t => !t.adminOnly || user.role === 'admin');
  const currentPath = location.pathname.replace(basePath, '').replace(/^\//, '') || '';

  return (
    <div style={{ background: '#f5f5f5', minHeight: 'calc(100vh - 64px)' }}>
      <div style={dashStyles.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ fontSize: 15, fontWeight: 700 }}>{isAdmin ? 'Admin Dashboard' : 'Team Portal'}</span>
        </div>
        <nav style={dashStyles.nav}>
          {visibleTabs.map(t => (
            <Link key={t.key} to={`${basePath}/${t.path}`} style={dashStyles.tab(currentPath === t.path)}>
              {t.label}
            </Link>
          ))}
        </nav>
        <div style={dashStyles.userInfo}>
          <span style={dashStyles.userName}>{user.name}</span>
          <button style={dashStyles.logoutBtn} onClick={handleLogout}>Sign Out</button>
        </div>
      </div>
      <main style={dashStyles.content}>
        <Routes>
          <Route path="" element={<Dashboard key={refreshKey} />} />
          <Route path="leads" element={<Leads key={refreshKey} />} />
          <Route path="locations" element={<Locations key={refreshKey} />} />
          <Route path="meter" element={<MeterImport onSave={refresh} />} />
          <Route path="fills" element={<Fills key={refreshKey} />} />
          <Route path="service" element={<Service key={refreshKey} />} />
          <Route path="deposits" element={<Deposits key={refreshKey} />} />
          <Route path="payments" element={<Payments key={refreshKey} />} />
          {isAdmin && <Route path="jvl" element={<JVLPipeline />} />}
          {isAdmin && <Route path="ramp" element={<RampPlan />} />}
          {isAdmin && user.role === 'admin' && <Route path="team" element={<Team key={refreshKey} />} />}
        </Routes>
      </main>
    </div>
  );
}

/* ─── Root App ─── */
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/*" element={<PublicLayout />} />
      </Routes>
    </BrowserRouter>
  );
}
