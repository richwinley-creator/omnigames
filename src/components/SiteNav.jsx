import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

export default function SiteNav() {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  const path = location.pathname;

  return (
    <nav className="site-nav">
      <div className="site-nav-inner">
        <Link to="/" className="site-nav-logo">
          <img src="/images/omni-icon.jpeg" alt="Omni Gaming" />
          <span className="logo-text">OMNI GAMING</span>
        </Link>
        <ul className={`site-nav-links${menuOpen ? ' open' : ''}`}>
          <li><Link to="/" className={path === '/' ? 'active' : ''} onClick={() => setMenuOpen(false)}>Home</Link></li>
          <li><Link to="/about" className={path === '/about' ? 'active' : ''} onClick={() => setMenuOpen(false)}>About</Link></li>
          <li><Link to="/games" className={path === '/games' ? 'active' : ''} onClick={() => setMenuOpen(false)}>Our Games</Link></li>
          <li><Link to="/markets" className={path === '/markets' ? 'active' : ''} onClick={() => setMenuOpen(false)}>Markets</Link></li>
          <li><Link to="/contact" className={path === '/contact' ? 'active' : ''} onClick={() => setMenuOpen(false)}>Contact</Link></li>
          <li><Link to="/portal" className="nav-cta" onClick={() => setMenuOpen(false)}>Team Login</Link></li>
        </ul>
        <button className="mobile-menu-btn" onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle menu">
          <span></span><span></span><span></span>
        </button>
      </div>
    </nav>
  );
}
