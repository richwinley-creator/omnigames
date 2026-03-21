import { Link } from 'react-router-dom';

export default function Home() {
  return (
    <>
      {/* Hero */}
      <section className="hero">
        <div className="container hero-content">
          <div className="hero-badge">Multi-Market Skill Game Operator</div>
          <h1>Powering the Future of <span className="accent">Skill Gaming</span></h1>
          <p>Omni Gaming is a leading skill game operator and authorized distributor, delivering premium gaming experiences and revenue solutions across multiple U.S. markets.</p>
          <div className="hero-buttons">
            <Link to="/contact" className="btn-primary">Partner With Us</Link>
            <Link to="/markets" className="btn-outline">Explore Markets</Link>
          </div>
          <div className="hero-stats">
            <div className="hero-stat"><span className="number">4</span><span className="label">Active Markets</span></div>
            <div className="hero-stat"><span className="number">100+</span><span className="label">Locations</span></div>
            <div className="hero-stat"><span className="number">24/7</span><span className="label">Support</span></div>
          </div>
        </div>
      </section>

      {/* About */}
      <section className="section section-dark">
        <div className="container">
          <div className="about-grid">
            <div className="about-content">
              <div className="accent-line" style={{ margin: '0 0 16px' }}></div>
              <h2>Built for the Business of Gaming</h2>
              <p>Omni Gaming operates as a full-service skill game company, providing route operations, machine distribution, and compliance support across regulated U.S. markets.</p>
              <p>From Washington DC to Texas, we partner with bars, restaurants, convenience stores, and entertainment venues to deliver revenue-generating gaming solutions — legally and professionally.</p>
            </div>
            <div>
              <img src="/images/installation-bar-lounge.jpg" alt="Skill games installed in a bar" style={{ width: '100%', borderRadius: 12, border: '1px solid var(--border)' }} />
            </div>
          </div>
        </div>
      </section>

      {/* Why Omni */}
      <section className="section">
        <div className="container">
          <div className="section-header">
            <div className="accent-line"></div>
            <h2>Why Omni Gaming</h2>
            <p>What sets us apart in the skill gaming industry.</p>
          </div>
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">&#128737;</div>
              <h4>Fully Licensed & Compliant</h4>
              <p>Licensed in every market we operate, with full regulatory compliance across all states.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">&#128176;</div>
              <h4>Revenue Share Model</h4>
              <p>Zero upfront cost. We install, maintain, and service — you earn passive income from day one.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">&#9889;</div>
              <h4>Fast Installation</h4>
              <p>Machines installed within 48 hours of agreement. We handle everything from setup to compliance.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">&#128736;</div>
              <h4>Full-Service Operation</h4>
              <p>We handle installation, maintenance, collections, and compliance. You focus on your business.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Vendors Preview */}
      <section className="section section-dark">
        <div className="container">
          <div className="section-header">
            <div className="accent-line"></div>
            <h2>Premium Game Partners</h2>
            <p>We distribute machines from the industry's top manufacturers.</p>
          </div>
          <div className="markets-grid">
            {[
              { name: 'Banilla Games', desc: 'The gold standard in skill gaming. Lightning Edition platforms with proven revenue performance.', img: '/images/banilla/banilla-cabinets.jpg' },
              { name: 'JVL Entertainment', desc: 'Cutting-edge touchscreen technology with progressive jackpots. FLEX cabinet lineup.', img: '/images/jvl/jvl-flex-lineup.jpg' },
              { name: 'Primero Games', desc: 'Innovative skill games with unique themes. Great value with strong player engagement.', img: '/images/primero-cabinets.jpg' },
              { name: 'Jenka Labs / Aurora', desc: 'Multi-game boards with the Aurora and Northern Light series. Rapidly expanding lineup.', img: '/images/jenka/aurora-northern-lineup.png' },
            ].map(v => (
              <Link to="/games" key={v.name} className="market-card">
                <img src={v.img} alt={v.name} style={{ width: '100%', borderRadius: 8, marginBottom: 16, height: 160, objectFit: 'cover' }} />
                <h3>{v.name}</h3>
                <p>{v.desc}</p>
                <span className="market-link">View Details →</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="cta-section">
        <div className="container">
          <h2>Ready to Partner With Omni Gaming?</h2>
          <p>Whether you want skill games in your location or distribution in your market, we'd like to hear from you.</p>
          <div className="cta-buttons">
            <Link to="/contact" className="btn-primary">Get In Touch</Link>
            <Link to="/games" className="btn-outline">Explore Our Games</Link>
          </div>
        </div>
      </section>
    </>
  );
}
