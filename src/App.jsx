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
import Tasks from './components/Tasks';
import Analytics from './components/Analytics';
import AuditLog from './components/AuditLog';
import BulkImport from './components/BulkImport';
import SearchBar from './components/SearchBar';
import Notifications from './components/Notifications';
import './styles.css';

/* ─── Public Layout (with site nav + footer) ─── */
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
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
      <SiteFooter />
    </>
  );
}

/* ─── Tab configs by role ─── */
const ADMIN_TABS = [
  { key: 'overview', label: 'Dashboard', path: '' },
  { key: 'leads', label: 'Leads', path: 'leads' },
  { key: 'tasks', label: 'Tasks', path: 'tasks' },
  { key: 'locations', label: 'Locations', path: 'locations' },
  { key: 'meter', label: 'Meter Import', path: 'meter' },
  { key: 'fills', label: 'Fills', path: 'fills' },
  { key: 'service', label: 'Service', path: 'service' },
  { key: 'jvl', label: 'JVL Pipeline', path: 'jvl' },
  { key: 'deposits', label: 'Deposits', path: 'deposits' },
  { key: 'payments', label: 'Payments', path: 'payments' },
  { key: 'analytics', label: 'Analytics', path: 'analytics' },
  { key: 'bulk', label: 'Bulk Ops', path: 'bulk' },
  { key: 'ramp', label: 'Ramp Plan', path: 'ramp' },
  { key: 'audit', label: 'Audit Log', path: 'audit' },
  { key: 'team', label: 'Team', path: 'team' },
];

const TEAM_TABS = [
  { key: 'overview', label: 'Dashboard', path: '' },
  { key: 'leads', label: 'My Leads', path: 'leads' },
  { key: 'tasks', label: 'My Tasks', path: 'tasks' },
  { key: 'locations', label: 'Locations', path: 'locations' },
  { key: 'fills', label: 'Fills', path: 'fills' },
  { key: 'service', label: 'Service', path: 'service' },
  { key: 'analytics', label: 'Analytics', path: 'analytics' },
];

const dashStyles = {
  header: {
    background: '#0f172a', color: '#fff', padding: '0 24px',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    gap: 12, position: 'sticky', top: 0, zIndex: 50,
    borderBottom: '1px solid rgba(255,255,255,0.06)',
    height: 56,
  },
  nav: { display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' },
  tab: (active) => ({
    padding: '7px 14px', border: 'none', borderRadius: 8, cursor: 'pointer',
    fontSize: 13, fontWeight: active ? 600 : 500,
    background: active ? 'rgba(79,70,229,0.9)' : 'transparent',
    color: active ? '#fff' : '#94a3b8', transition: 'all 0.15s',
    textDecoration: 'none', display: 'inline-block',
    letterSpacing: '-0.01em',
  }),
  content: { padding: '28px 28px 40px', maxWidth: 1400, margin: '0 auto', minHeight: 'calc(100vh - 56px)' },
  userInfo: {
    display: 'flex', alignItems: 'center', gap: 10,
  },
  userName: { fontSize: 13, color: '#cbd5e1', fontWeight: 500 },
  roleBadge: (isAdmin) => ({
    fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 10,
    background: isAdmin ? 'rgba(129,140,248,0.15)' : 'rgba(16,185,129,0.15)',
    color: isAdmin ? '#a5b4fc' : '#6ee7b7',
    textTransform: 'uppercase', letterSpacing: '0.05em',
  }),
  logoutBtn: {
    padding: '6px 14px', background: 'rgba(255,255,255,0.08)', color: '#94a3b8', border: 'none',
    borderRadius: 8, fontSize: 12, cursor: 'pointer', fontWeight: 500,
    transition: 'all 0.15s',
  },
};

function DashboardShell() {
  const basePath = '/dashboard';

  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('gse_user');
      const token = localStorage.getItem('gse_token');
      if (stored && token) return JSON.parse(stored);
      return null;
    } catch { return null; }
  });
  const [refreshKey, setRefreshKey] = useState(0);
  const location = useLocation();

  const isAdmin = user?.role === 'admin';
  const refresh = () => setRefreshKey(k => k + 1);

  const handleLogin = (u) => {
    localStorage.setItem('gse_user', JSON.stringify(u));
    setUser(u);
  };
  const handleLogout = () => {
    localStorage.removeItem('gse_token');
    localStorage.removeItem('gse_user');
    // Clean up legacy keys
    localStorage.removeItem('gse_team_token');
    localStorage.removeItem('gse_team_user');
    setUser(null);
  };

  if (!user) {
    return <Login onLogin={handleLogin} title="GSE Dashboard" />;
  }

  const tabs = isAdmin ? ADMIN_TABS : TEAM_TABS;
  const currentPath = location.pathname.replace(basePath, '').replace(/^\//, '') || '';

  return (
    <div style={{ background: '#f8fafc', minHeight: '100vh' }}>
      <div style={dashStyles.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 15, fontWeight: 700 }}>GSE Dashboard</span>
          <span style={dashStyles.roleBadge(isAdmin)}>{isAdmin ? 'Admin' : 'Team'}</span>
        </div>
        <nav style={dashStyles.nav}>
          {tabs.map(t => (
            <Link key={t.key} to={`${basePath}/${t.path}`} style={dashStyles.tab(currentPath === t.path)}>
              {t.label}
            </Link>
          ))}
        </nav>
        <div style={dashStyles.userInfo}>
          <SearchBar onNavigate={(type, id) => {
            const routes = { lead: 'leads', location: 'locations', ticket: 'service', deal: 'jvl', task: 'tasks' };
            window.location.hash = '';
            window.location.pathname = `${basePath}/${routes[type] || ''}`;
          }} />
          <Notifications />
          <span style={dashStyles.userName}>{user.name}</span>
          <button style={dashStyles.logoutBtn} onClick={handleLogout}>Sign Out</button>
        </div>
      </div>
      <main style={dashStyles.content}>
        <Routes>
          <Route path="" element={<Dashboard key={refreshKey} isAdmin={isAdmin} user={user} />} />
          <Route path="leads" element={<Leads key={refreshKey} user={user} />} />
          <Route path="tasks" element={<Tasks key={refreshKey} user={user} />} />
          <Route path="locations" element={<Locations key={refreshKey} />} />
          <Route path="fills" element={<Fills key={refreshKey} />} />
          <Route path="service" element={<Service key={refreshKey} />} />
          <Route path="analytics" element={<Analytics key={refreshKey} isAdmin={isAdmin} />} />
          {isAdmin && <Route path="meter" element={<MeterImport onSave={refresh} />} />}
          {isAdmin && <Route path="deposits" element={<Deposits key={refreshKey} />} />}
          {isAdmin && <Route path="payments" element={<Payments key={refreshKey} />} />}
          {isAdmin && <Route path="bulk" element={<BulkImport key={refreshKey} />} />}
          {isAdmin && <Route path="jvl" element={<JVLPipeline />} />}
          {isAdmin && <Route path="ramp" element={<RampPlan />} />}
          {isAdmin && <Route path="audit" element={<AuditLog key={refreshKey} />} />}
          {isAdmin && <Route path="team" element={<Team key={refreshKey} />} />}
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
        <Route path="/dashboard/*" element={<DashboardShell />} />
        <Route path="/portal/*" element={<Navigate to="/dashboard" />} />
        <Route path="/*" element={<PublicLayout />} />
      </Routes>
    </BrowserRouter>
  );
}
