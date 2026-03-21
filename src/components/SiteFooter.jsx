import { Link } from 'react-router-dom';

export default function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="container">
        <div className="footer-grid">
          <div className="footer-brand">
            <div className="site-nav-logo" style={{ display: 'inline-flex' }}>
              <img src="/images/omni-icon.jpeg" alt="Omni Gaming" style={{ height: 36 }} />
              <span className="logo-text">OMNI GAMING</span>
            </div>
            <p>Multi-market skill game operator and authorized distributor. Delivering premium gaming experiences across the United States.</p>
          </div>
          <div>
            <h4>Company</h4>
            <ul className="footer-links">
              <li><Link to="/">Home</Link></li>
              <li><Link to="/about">About Us</Link></li>
              <li><Link to="/games">Our Games</Link></li>
              <li><Link to="/contact">Contact</Link></li>
            </ul>
          </div>
          <div>
            <h4>Markets</h4>
            <ul className="footer-links">
              <li><a href="https://www.skillgamestexas.com" target="_blank" rel="noopener noreferrer">Texas</a></li>
              <li><a href="https://skillgamesforpa.com" target="_blank" rel="noopener noreferrer">Pennsylvania</a></li>
              <li><a href="https://www.skillgamesdc.com" target="_blank" rel="noopener noreferrer">Washington DC</a></li>
              <li><a href="https://www.skillgamesva.com" target="_blank" rel="noopener noreferrer">Virginia</a></li>
            </ul>
          </div>
          <div>
            <h4>Contact</h4>
            <ul className="footer-links">
              <li><a href="mailto:info@omni.games">info@omni.games</a></li>
              <li><a href="tel:+14703042695">(470) 304-2695</a></li>
            </ul>
          </div>
        </div>
        <div className="footer-bottom">
          <p>&copy; {new Date().getFullYear()} Omni Gaming. All rights reserved.</p>
          <p>TX &middot; PA &middot; DC &middot; VA</p>
        </div>
      </div>
    </footer>
  );
}
