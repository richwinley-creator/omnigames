import { Link } from 'react-router-dom';

const markets = [
  {
    name: 'Texas',
    status: 'Active',
    statusColor: '#22c55e',
    site: 'https://www.skillgamestexas.com',
    desc: 'Court-affirmed legal skill games across the Lone Star State. We\'re an authorized Banilla, JVL, Primero, and Jenka Labs distributor serving bars, restaurants, convenience stores, and game rooms statewide.',
    highlights: ['Authorized distributor for all major brands', 'Revenue share and purchase options', 'Statewide coverage', 'Fast 48-hour installation'],
  },
  {
    name: 'Pennsylvania',
    status: 'Active',
    statusColor: '#22c55e',
    site: 'https://skillgamesforpa.com',
    desc: 'Serving Pennsylvania businesses with authorized skill game machines and full-service route operations. The largest skill game market in the U.S. with 67,000+ machines operating statewide.',
    highlights: ['Largest skill game market in the U.S.', 'Full compliance support', 'Premium machine selection', 'Established route operations'],
  },
  {
    name: 'Washington DC',
    status: 'Active',
    statusColor: '#22c55e',
    site: 'https://www.skillgamesdc.com',
    desc: 'Legal skill games under DC Code Title 36. ABCA licensed route operations across the District, serving bars, restaurants, and entertainment venues throughout Washington DC.',
    highlights: ['DC Code Title 36 compliant', 'ABCA licensed operations', 'District-wide coverage', 'Established location partnerships'],
  },
  {
    name: 'Virginia',
    status: 'Coming 2026',
    statusColor: '#f59e0b',
    site: 'https://www.skillgamesva.com',
    desc: 'SB 661 passed the General Assembly — skill games are returning to Virginia with a 25% tax rate and $800/month per machine fee. Applications open July 1, 2026. We\'re ready to deploy.',
    highlights: ['SB 661 signed into law', 'Applications open July 2026', 'Virginia Lottery oversight', 'Ready to deploy on day one'],
  },
];

export default function Markets() {
  return (
    <>
      <section className="page-hero">
        <div className="container">
          <h1>Our <span className="accent">Markets</span></h1>
          <p>Omni Gaming operates skill game route services across regulated markets in the United States.</p>
        </div>
      </section>

      <section className="section section-dark">
        <div className="container">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
            {markets.map(m => (
              <div key={m.name} className="vendor-card" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 40, alignItems: 'center' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                    <h2 style={{ fontSize: 28, fontWeight: 800, margin: 0 }}>{m.name}</h2>
                    <span className="vendor-badge" style={{ background: m.statusColor + '20', color: m.statusColor }}>{m.status}</span>
                  </div>
                  <p style={{ color: 'var(--text-secondary)', fontSize: 15, lineHeight: 1.7 }}>{m.desc}</p>
                  {m.site && (
                    <a href={m.site} target="_blank" rel="noopener noreferrer" className="btn-primary" style={{ display: 'inline-block', marginTop: 20, padding: '10px 24px', fontSize: 13 }}>
                      Visit {m.name} Site →
                    </a>
                  )}
                </div>
                <div>
                  <div className="vendor-features">
                    {m.highlights.map(h => (
                      <div key={h} className="vendor-feature" style={{ fontSize: 14 }}>
                        <span className="check">&#10003;</span> {h}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="cta-section">
        <div className="container">
          <h2>Want Games in Your Location?</h2>
          <p>We're expanding in all four markets. Contact us to get started.</p>
          <div className="cta-buttons">
            <Link to="/contact" className="btn-primary">Get In Touch</Link>
          </div>
        </div>
      </section>
    </>
  );
}
