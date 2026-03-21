import { useState } from 'react';

export default function Contact() {
  const [form, setForm] = useState({ name: '', email: '', phone: '', business: '', business_type: '', city: '', state: 'TX', interest: '', brand: '', machines: '', message: '', sms_consent: false });
  const [status, setStatus] = useState('');
  const [sending, setSending] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSending(true);
    setStatus('');
    try {
      // Send to our CRM webhook
      await fetch('/api/leads/webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, _source: 'omni.games', sms_consent: form.sms_consent ? 'yes' : 'no' }),
      });
      setStatus('success');
      setForm({ name: '', email: '', phone: '', business: '', business_type: '', city: '', state: 'TX', interest: '', brand: '', machines: '', message: '', sms_consent: false });
    } catch {
      setStatus('error');
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <section className="page-hero">
        <div className="container">
          <h1>Get In <span className="accent">Touch</span></h1>
          <p>Whether you're interested in skill game placement, distribution, or partnership opportunities — we'd like to hear from you.</p>
        </div>
      </section>

      <section className="section section-dark">
        <div className="container">
          <div className="contact-grid">
            <div className="contact-form">
              {status === 'success' ? (
                <div style={{ textAlign: 'center', padding: '40px 0' }}>
                  <div style={{ fontSize: 48, marginBottom: 16 }}>&#10003;</div>
                  <h3 style={{ marginBottom: 8 }}>Message Sent</h3>
                  <p style={{ color: 'var(--text-secondary)' }}>We'll get back to you within 24 hours.</p>
                  <button className="btn-primary" style={{ marginTop: 20 }} onClick={() => setStatus('')}>Send Another</button>
                </div>
              ) : (
                <form onSubmit={handleSubmit}>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Full Name *</label>
                      <input type="text" value={form.name} onChange={e => set('name', e.target.value)} required placeholder="Your name" />
                    </div>
                    <div className="form-group">
                      <label>Phone *</label>
                      <input type="tel" value={form.phone} onChange={e => set('phone', e.target.value)} required placeholder="(555) 123-4567" />
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Email *</label>
                      <input type="email" value={form.email} onChange={e => set('email', e.target.value)} required placeholder="you@example.com" />
                    </div>
                    <div className="form-group">
                      <label>Business Name</label>
                      <input type="text" value={form.business} onChange={e => set('business', e.target.value)} placeholder="Your business" />
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Business Type</label>
                      <select value={form.business_type} onChange={e => set('business_type', e.target.value)}>
                        <option value="">Select...</option>
                        <option>Bar</option><option>Restaurant</option><option>Convenience Store</option>
                        <option>Game Room</option><option>Truck Stop</option><option>Gas Station</option>
                        <option>Hotel</option><option>Other</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label>City</label>
                      <input type="text" value={form.city} onChange={e => set('city', e.target.value)} placeholder="Your city" />
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>State</label>
                      <select value={form.state} onChange={e => set('state', e.target.value)}>
                        <option value="TX">Texas</option>
                        <option value="PA">Pennsylvania</option>
                        <option value="DC">Washington DC</option>
                        <option value="VA">Virginia</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Interest</label>
                      <select value={form.interest} onChange={e => set('interest', e.target.value)}>
                        <option value="">Select...</option>
                        <option>Revenue Share Placement</option>
                        <option>Buy Machines (JVL)</option>
                        <option>Distribution Partnership</option>
                        <option>General Inquiry</option>
                      </select>
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Preferred Brand</label>
                      <select value={form.brand} onChange={e => set('brand', e.target.value)}>
                        <option value="">No Preference</option>
                        <option>Banilla</option><option>JVL</option>
                        <option>Primero</option><option>Jenka Labs / Aurora</option>
                        <option>Multiple</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Number of Machines</label>
                      <select value={form.machines} onChange={e => set('machines', e.target.value)}>
                        <option value="">Not Sure</option>
                        <option>1-2</option><option>3-5</option><option>6-10</option><option>10+</option>
                      </select>
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Message</label>
                    <textarea value={form.message} onChange={e => set('message', e.target.value)} placeholder="Tell us about your location and what you're looking for..." />
                  </div>
                  <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <input type="checkbox" id="sms" checked={form.sms_consent} onChange={e => set('sms_consent', e.target.checked)} style={{ width: 'auto' }} />
                    <label htmlFor="sms" style={{ margin: 0, fontSize: 12 }}>I consent to receive SMS messages from Omni Gaming</label>
                  </div>
                  {status === 'error' && <p style={{ color: 'var(--danger)', fontSize: 13, marginBottom: 12 }}>Something went wrong. Please try again or email us directly.</p>}
                  <button type="submit" className="btn-primary" style={{ width: '100%', opacity: sending ? 0.7 : 1 }} disabled={sending}>
                    {sending ? 'Sending...' : 'Send Message'}
                  </button>
                </form>
              )}
            </div>

            <div className="contact-info">
              <div className="info-card">
                <h3>Contact Information</h3>
                <div className="info-item"><span className="icon">&#9993;</span> <a href="mailto:info@omni.games">info@omni.games</a></div>
                <div className="info-item"><span className="icon">&#9742;</span> <a href="tel:+14703042695">(470) 304-2695</a></div>
              </div>
              <div className="info-card">
                <h3>State-Specific Sites</h3>
                <div className="info-item"><span className="icon">&#10003;</span> <a href="https://www.skillgamestexas.com" target="_blank" rel="noopener noreferrer">Skill Games Texas</a></div>
                <div className="info-item"><span className="icon">&#10003;</span> <a href="https://skillgamesforpa.com" target="_blank" rel="noopener noreferrer">Skill Games Pennsylvania</a></div>
                <div className="info-item"><span className="icon">&#10003;</span> <a href="https://www.skillgamesdc.com" target="_blank" rel="noopener noreferrer">Skill Games DC</a></div>
                <div className="info-item"><span className="icon">&#10003;</span> <a href="https://www.skillgamesva.com" target="_blank" rel="noopener noreferrer">Skill Games Virginia</a></div>
              </div>
              <div className="info-card">
                <h3>What to Expect</h3>
                <div className="info-item"><span className="icon">&#9201;</span> We respond within 24 hours on business days</div>
                <div className="info-item"><span className="icon">&#128222;</span> Prefer a call? Dial us directly anytime</div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
