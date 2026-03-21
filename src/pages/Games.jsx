import { Link } from 'react-router-dom';

const vendors = [
  {
    name: 'Banilla Games',
    tagline: 'The Gold Standard in Skill Gaming',
    badge: { text: 'PREMIUM', bg: '#f59e0b' },
    img: '/images/banilla/banilla-cabinets.jpg',
    desc: 'Banilla is the most recognized name in skill gaming with the widest distribution footprint in the U.S. Their Lightning Edition platforms deliver proven revenue performance with stunning graphics and player engagement.',
    features: [
      'Fusion Series & Skyriser cabinets',
      'Lightning Edition technology',
      'Follow the Banana skill mechanic',
      'Fireball Unleashed, Fusion 6, Platinum 4',
      '50+ game titles',
      'Revenue share placement',
    ],
    images: [
      '/images/banilla/fusion-plus-lightning.png',
      '/images/banilla/skyriser-lightning.jpg',
      '/images/banilla/superior-skill-link-2.jpg',
    ],
  },
  {
    name: 'JVL Entertainment',
    tagline: 'Touchscreen Technology Leader',
    badge: { text: 'VERSATILE', bg: '#3b82f6' },
    img: '/images/jvl/jvl-flex-lineup.jpg',
    desc: 'JVL has been the pioneer in touchscreen bar-top entertainment for over 38 years. Their FLEX cabinet lineup features HD touchscreens, progressive jackpots, and 100+ games. The only brand available for both revenue share and direct purchase.',
    features: [
      'FLEX V43 & D27 cabinet lineup',
      'Multi-tier progressive jackpots up to $10,000+',
      'Diamond Link, Georgia Peach, Cash Cats',
      '100+ touchscreen game titles',
      'Revenue share OR direct purchase ($4K-$8K)',
      'Countertop and upright form factors',
    ],
    images: [
      '/images/jvl/jvl-flex-v43-peach-cabinet.jpg',
      '/images/jvl/jvl-flex-v43-diamond-cabinet.jpg',
    ],
  },
  {
    name: 'Primero Games',
    tagline: 'Innovative Value Play',
    badge: { text: 'VALUE', bg: '#22c55e' },
    img: '/images/primero-cabinets.jpg',
    desc: 'Primero delivers innovative skill games with unique themes and strong player engagement at a competitive price point. Vertically integrated — they design, manufacture, and service everything in-house. Certified in 6+ states.',
    features: [
      'Piggy Bank Deluxe flagship series',
      'Progressive jackpots up to $2,500+',
      'Modern RGB lighting cabinets',
      '30+ game titles',
      'PrimePay cash redemption kiosk',
      'Revenue share placement',
    ],
    images: ['/images/primero-cabinets.jpg'],
  },
  {
    name: 'Jenka Labs / Aurora',
    tagline: 'Multi-Game Innovation',
    badge: { text: 'RISING STAR', bg: '#8b5cf6' },
    img: '/images/jenka/aurora-northern-lineup.png',
    desc: 'Jenka Labs has rapidly expanded since 2020 with the Aurora (skill) and Northern Light (amusement) series. High game density boards with up to 9 games per unit, compatible with multiple cabinet configurations.',
    features: [
      'Aurora XPerience (7-in-1), Aurora Link (9-in-1)',
      'Northern Light & Northern Gold series',
      'Favorite Link dual-screen series',
      '40+ game titles',
      'Cherry Master harness compatible',
      'Wood and metal cabinet options',
    ],
    images: [
      '/images/jenka/aurora-super-link-board.png',
      '/images/jenka/jenka-cabinet-northern-gold.png',
    ],
  },
];

export default function Games() {
  return (
    <>
      <section className="page-hero">
        <div className="container">
          <h1>Our <span className="accent">Games</span></h1>
          <p>Premium skill game machines from the industry's top manufacturers. We're authorized distributors for all four brands.</p>
        </div>
      </section>

      {vendors.map((v, i) => (
        <section key={v.name} className={`section ${i % 2 === 0 ? 'section-dark' : ''}`}>
          <div className="container">
            <div className="about-grid" style={{ direction: i % 2 === 1 ? 'rtl' : 'ltr' }}>
              <div className="about-content" style={{ direction: 'ltr' }}>
                <span className="vendor-badge" style={{ background: v.badge.bg + '20', color: v.badge.bg }}>{v.badge.text}</span>
                <h2>{v.name}</h2>
                <div style={{ color: 'var(--accent)', fontSize: 15, fontWeight: 500, marginBottom: 16 }}>{v.tagline}</div>
                <p>{v.desc}</p>
                <div className="vendor-features" style={{ marginTop: 20 }}>
                  {v.features.map(f => (
                    <div key={f} className="vendor-feature">
                      <span className="check">&#10003;</span> {f}
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ direction: 'ltr' }}>
                <img src={v.img} alt={v.name} style={{ width: '100%', borderRadius: 12, border: '1px solid var(--border)', marginBottom: 12 }} />
                {v.images.length > 1 && (
                  <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(v.images.length, 3)}, 1fr)`, gap: 8 }}>
                    {v.images.slice(0, 3).map(img => (
                      <img key={img} src={img} alt={v.name} style={{ width: '100%', borderRadius: 8, border: '1px solid var(--border)', height: 100, objectFit: 'cover' }} />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      ))}

      <section className="cta-section">
        <div className="container">
          <h2>Find the Right Games for Your Location</h2>
          <p>We'll help you choose the best machines based on your venue type, foot traffic, and revenue goals.</p>
          <div className="cta-buttons">
            <Link to="/contact" className="btn-primary">Get a Free Quote</Link>
          </div>
        </div>
      </section>
    </>
  );
}
