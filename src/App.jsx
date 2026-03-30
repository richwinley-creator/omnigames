import { useState, useRef, useEffect } from 'react';
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
import Counties from './components/Counties';
import Inventory from './components/Inventory';
import Welcome from './components/Welcome';
import { ToastProvider } from './components/Toast';
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
// primary: true = always visible; false = hamburger menu
const ADMIN_TABS = [
  { key: 'overview', label: 'Dashboard', path: '', primary: true },
  { key: 'leads', label: 'Leads', path: 'leads', primary: true },
  { key: 'tasks', label: 'Tasks', path: 'tasks', primary: true },
  { key: 'locations', label: 'Locations', path: 'locations', primary: true },
  { key: 'inventory', label: 'Inventory', path: 'inventory', primary: true },
  { key: 'counties', label: 'Counties', path: 'counties', primary: false },
  { key: 'analytics', label: 'Analytics', path: 'analytics', primary: false },
  { key: 'jvl', label: 'JVL Pipeline', path: 'jvl', primary: false },
  { key: 'fills', label: 'Fills', path: 'fills', primary: false },
  { key: 'service', label: 'Service', path: 'service', primary: false },
  { key: 'deposits', label: 'Deposits', path: 'deposits', primary: false },
  { key: 'payments', label: 'Payments', path: 'payments', primary: false },
  { key: 'meter', label: 'Meter Import', path: 'meter', primary: false },
  { key: 'bulk', label: 'Bulk Ops', path: 'bulk', primary: false },
  { key: 'ramp', label: 'Ramp Plan', path: 'ramp', primary: false },
  { key: 'audit', label: 'Audit Log', path: 'audit', primary: false },
  { key: 'team', label: 'Team', path: 'team', primary: false },
];

const TEAM_TABS = [
  { key: 'overview', label: 'Dashboard', path: '', primary: true },
  { key: 'leads', label: 'My Leads', path: 'leads', primary: true },
  { key: 'tasks', label: 'My Tasks', path: 'tasks', primary: true },
  { key: 'locations', label: 'Locations', path: 'locations', primary: true },
  { key: 'inventory', label: 'Inventory', path: 'inventory', primary: false },
  { key: 'fills', label: 'Fills', path: 'fills', primary: false },
  { key: 'service', label: 'Service', path: 'service', primary: false },
  { key: 'analytics', label: 'Analytics', path: 'analytics', primary: false },
];

/* ─── Avatar initials helper ─── */
function getInitials(name) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// Deterministic color from name string
const AVATAR_COLORS = ['#b8943d', '#059669', '#3b82f6', '#8b5cf6', '#ec4899', '#0284c7', '#d97706', '#14b8a6'];
function avatarColor(name) {
  if (!name) return AVATAR_COLORS[0];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) | 0;
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

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
    background: active ? 'rgba(184,148,61,0.85)' : 'transparent',
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
    background: isAdmin ? 'rgba(184,148,61,0.15)' : 'rgba(16,185,129,0.15)',
    color: isAdmin ? '#d4b85c' : '#6ee7b7',
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
  const [menuOpen, setMenuOpen] = useState(false);
  const [showWelcome, setShowWelcome] = useState(() => {
    try { return !localStorage.getItem('gse_welcome_seen'); } catch { return true; }
  });
  const menuRef = useRef(null);
  const location = useLocation();

  const isAdmin = user?.role === 'admin';
  const refresh = () => setRefreshKey(k => k + 1);

  // Close hamburger when clicking outside
  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpen]);

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
  const primaryTabs = tabs.filter(t => t.primary);
  const secondaryTabs = tabs.filter(t => !t.primary);
  const currentPath = location.pathname.replace(basePath, '').replace(/^\//, '') || '';
  const secondaryActive = secondaryTabs.some(t => t.path === currentPath);

  return (
    <div style={{ background: '#f8fafc', minHeight: '100vh' }}>
      <div style={dashStyles.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 15, fontWeight: 700 }}>GSE Dashboard</span>
          <span style={dashStyles.roleBadge(isAdmin)}>{isAdmin ? 'Admin' : 'Team'}</span>
        </div>
        <nav style={dashStyles.nav}>
          {primaryTabs.map(t => (
            <Link key={t.key} to={`${basePath}/${t.path}`} className="dash-nav-tab" style={dashStyles.tab(currentPath === t.path)}>
              {t.label}
            </Link>
          ))}
          <div ref={menuRef} style={{ position: 'relative' }} className="dash-hamburger-wrap">
            <button
              onClick={() => setMenuOpen(o => !o)}
              style={{
                ...dashStyles.tab(secondaryActive || menuOpen),
                display: 'flex', alignItems: 'center', gap: 5, background:
                  secondaryActive ? 'rgba(184,148,61,0.85)' : menuOpen ? 'rgba(255,255,255,0.1)' : 'transparent',
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
              </svg>
              <span className="dash-more-label">More</span>
            </button>
            {menuOpen && (
              <div style={{
                position: 'absolute', top: 'calc(100% + 8px)', right: 0, background: '#1e293b',
                borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.3)', minWidth: 180,
                border: '1px solid rgba(255,255,255,0.08)', zIndex: 100, overflow: 'hidden',
              }}>
                {/* Primary tabs shown here on mobile only */}
                {primaryTabs.map(t => (
                  <Link
                    key={`m-${t.key}`}
                    to={`${basePath}/${t.path}`}
                    onClick={() => setMenuOpen(false)}
                    className="dash-mobile-menu-item"
                    style={{
                      display: 'none', padding: '11px 16px', fontSize: 13, fontWeight: 600,
                      color: currentPath === t.path ? '#d4b85c' : '#cbd5e1',
                      background: currentPath === t.path ? 'rgba(184,148,61,0.12)' : 'transparent',
                      textDecoration: 'none',
                      borderLeft: currentPath === t.path ? '3px solid #b8943d' : '3px solid transparent',
                    }}
                  >
                    {t.label}
                  </Link>
                ))}
                {/* Divider between primary and secondary on mobile */}
                {secondaryTabs.length > 0 && <div className="dash-mobile-divider" style={{ display: 'none', height: 1, background: 'rgba(255,255,255,0.08)', margin: '4px 0' }} />}
                {secondaryTabs.map(t => (
                  <Link
                    key={t.key}
                    to={`${basePath}/${t.path}`}
                    onClick={() => setMenuOpen(false)}
                    style={{
                      display: 'block', padding: '10px 16px', fontSize: 13, fontWeight: 500,
                      color: currentPath === t.path ? '#d4b85c' : '#cbd5e1',
                      background: currentPath === t.path ? 'rgba(184,148,61,0.12)' : 'transparent',
                      textDecoration: 'none', transition: 'background 0.1s',
                      borderLeft: currentPath === t.path ? '3px solid #b8943d' : '3px solid transparent',
                    }}
                  >
                    {t.label}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </nav>
        <div style={dashStyles.userInfo}>
          <span className="dash-search-wrap"><SearchBar onNavigate={(type, id) => {
            const routes = { lead: 'leads', location: 'locations', ticket: 'service', deal: 'jvl', task: 'tasks' };
            window.location.hash = '';
            window.location.pathname = `${basePath}/${routes[type] || ''}`;
          }} /></span>
          <Notifications />
          <button
            className="dash-help-btn"
            onClick={() => setShowWelcome(true)}
            style={{ ...dashStyles.logoutBtn, display: 'flex', alignItems: 'center', gap: 4 }}
            title="Quick Start Guide"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
            <span className="dash-help-label">Help</span>
          </button>
          <div className="dash-username" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              width: 30, height: 30, borderRadius: '50%',
              background: avatarColor(user.name),
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 12, fontWeight: 700, color: '#fff', flexShrink: 0,
              userSelect: 'none',
            }}>
              {getInitials(user.name)}
            </div>
            <span style={dashStyles.userName}>{user.name}</span>
          </div>
          <button style={dashStyles.logoutBtn} onClick={handleLogout}>Sign Out</button>
        </div>
      </div>
      {showWelcome && <Welcome user={user} onDismiss={() => { setShowWelcome(false); localStorage.setItem('gse_welcome_seen', '1'); }} />}
      <main className="dash-content" style={dashStyles.content}>
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
          {isAdmin && <Route path="counties" element={<Counties key={refreshKey} />} />}
          {isAdmin && <Route path="team" element={<Team key={refreshKey} />} />}
          <Route path="inventory" element={<Inventory key={refreshKey} />} />
        </Routes>
      </main>
    </div>
  );
}

/* ─── Root App ─── */
export default function App() {
  return (
    <ToastProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/dashboard/*" element={<DashboardShell />} />
          <Route path="/portal/*" element={<Navigate to="/dashboard" />} />
          <Route path="/*" element={<PublicLayout />} />
        </Routes>
      </BrowserRouter>
    </ToastProvider>
  );
}
