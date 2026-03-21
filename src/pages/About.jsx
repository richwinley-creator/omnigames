import { Link } from 'react-router-dom';

export default function About() {
  return (
    <>
      <section className="page-hero">
        <div className="container">
          <h1>About <span className="accent">Omni Gaming</span></h1>
          <p>Multi-market skill game operator delivering premium gaming experiences and revenue solutions across the United States.</p>
        </div>
      </section>

      <section className="section section-dark">
        <div className="container">
          <div className="about-grid">
            <div className="about-content">
              <div className="accent-line" style={{ margin: '0 0 16px' }}></div>
              <h2>Who We Are</h2>
              <p>Omni Gaming is a full-service skill game company operating across multiple U.S. markets. We partner with bars, restaurants, convenience stores, truck stops, and entertainment venues to provide legal, revenue-generating gaming solutions.</p>
              <p>We handle everything — from machine selection and installation to ongoing maintenance, collections, and regulatory compliance. Our location partners earn passive income with zero upfront investment.</p>
              <p>As authorized distributors for Banilla Games, JVL Entertainment, Primero Games, and Jenka Labs, we offer the widest selection of premium skill game machines in the industry.</p>
            </div>
            <div>
              <div className="stat-grid">
                <div className="stat-card"><span className="number">4</span><span className="label">U.S. Markets</span></div>
                <div className="stat-card"><span className="number">100+</span><span className="label">Locations</span></div>
                <div className="stat-card"><span className="number">4</span><span className="label">Game Vendors</span></div>
                <div className="stat-card"><span className="number">24/7</span><span className="label">Support</span></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section-header">
            <div className="accent-line"></div>
            <h2>How It Works</h2>
            <p>Getting started with Omni Gaming is simple.</p>
          </div>
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon" style={{ fontSize: 24, fontWeight: 800, color: 'var(--accent)' }}>1</div>
              <h4>Contact Us</h4>
              <p>Reach out through our website or give us a call. We'll discuss your location and revenue potential.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon" style={{ fontSize: 24, fontWeight: 800, color: 'var(--accent)' }}>2</div>
              <h4>Site Evaluation</h4>
              <p>We visit your location to assess foot traffic, space, and the best machine configuration for maximum revenue.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon" style={{ fontSize: 24, fontWeight: 800, color: 'var(--accent)' }}>3</div>
              <h4>Agreement & Licensing</h4>
              <p>We handle all licensing and compliance. You sign a simple revenue share agreement — no upfront cost.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon" style={{ fontSize: 24, fontWeight: 800, color: 'var(--accent)' }}>4</div>
              <h4>Installation & Earning</h4>
              <p>Machines are installed within 48 hours. You start earning revenue immediately. We handle maintenance and collections.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="section section-dark">
        <div className="container">
          <div className="section-header">
            <div className="accent-line"></div>
            <h2>Our Locations</h2>
            <p>Skill games performing across a variety of venues.</p>
          </div>
          <div className="markets-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
            {[
              { img: '/images/installation-bar-lounge.jpg', label: 'Bars & Lounges' },
              { img: '/images/installation-convenience-store.jpg', label: 'Convenience Stores' },
              { img: '/images/installation-restaurant.jpg', label: 'Restaurants' },
            ].map(loc => (
              <div key={loc.label} className="market-card" style={{ padding: 0, overflow: 'hidden' }}>
                <img src={loc.img} alt={loc.label} style={{ width: '100%', height: 200, objectFit: 'cover' }} />
                <div style={{ padding: '20px 24px' }}>
                  <h3>{loc.label}</h3>
                  <p>Proven revenue performance in {loc.label.toLowerCase()} across all our markets.</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="cta-section">
        <div className="container">
          <h2>Ready to Earn?</h2>
          <p>Zero investment. We handle everything. You earn passive income.</p>
          <div className="cta-buttons">
            <Link to="/contact" className="btn-primary">Get Started</Link>
          </div>
        </div>
      </section>
    </>
  );
}
