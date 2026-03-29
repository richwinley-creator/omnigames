import { useState } from 'react';

const SECTIONS = [
  {
    title: 'What Is This?',
    icon: '🎰',
    content: `This is the GSE Operations Dashboard — the central hub for managing Omni Gaming's skill game business. It tracks every location, machine, lead, dollar, and task across all our markets.`,
  },
  {
    title: 'Dashboard',
    icon: '📊',
    tab: 'Dashboard',
    content: `Your home screen. Shows today's priorities at the top — tasks due and leads that need follow-up. Below that: revenue numbers, top-performing locations, and quick stats. Check this first thing every day.`,
    whatToDo: `Review your "Today's Focus" section. Start or complete tasks. Click through to leads that need attention.`,
  },
  {
    title: 'Leads',
    icon: '📋',
    tab: 'Leads',
    content: `Every potential customer who's interested in placing machines. Leads come in from our websites, phone calls, and referrals. Each lead moves through stages: Prospect → Initial Contact → Site Visit → Proposal → Agreement → Live.`,
    whatToDo: `When a new lead is assigned to you, call or text them within 24 hours. Update the stage as you move them forward. Add notes after every interaction. Set follow-up dates so nothing falls through the cracks.`,
  },
  {
    title: 'Tasks',
    icon: '✅',
    tab: 'Tasks',
    content: `Your to-do list. Tasks get created automatically (when a lead moves stages) or manually (by you or your admin). They have priorities (urgent/high/normal/low) and due dates.`,
    whatToDo: `Check tasks daily. Click "Start" to mark a task in progress. Click "Done" when complete. If something is blocked, add a note and flag it.`,
  },
  {
    title: 'Locations',
    icon: '📍',
    tab: 'Locations',
    content: `Every active location where we have machines placed. Shows machine count, revenue split percentages, partner info, and status. Active locations are generating revenue.`,
    whatToDo: `If you service locations, check here for machine counts and contact info before a visit. Report any issues through the Service tab.`,
  },
  {
    title: 'Fills',
    icon: '💵',
    tab: 'Fills',
    content: `Records of cash fills — when someone physically puts money into or collects from machines at a location.`,
    whatToDo: `Log every fill immediately after it happens. Include the location, amount, date, and any notes.`,
  },
  {
    title: 'Service',
    icon: '🔧',
    tab: 'Service',
    content: `Service tickets for machine issues — jams, errors, screens not working, connectivity problems. Each ticket tracks the location, machine, issue, and resolution.`,
    whatToDo: `Create a ticket whenever you find or hear about a machine problem. Update status when you fix it. Attach photos if needed.`,
  },
];

const s = {
  overlay: {
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
    background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 1000, padding: 20,
  },
  card: {
    background: '#fff', borderRadius: 16, width: '100%', maxWidth: 640,
    maxHeight: '85vh', overflow: 'hidden', display: 'flex', flexDirection: 'column',
    boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
  },
  header: {
    padding: '28px 32px 20px', borderBottom: '1px solid #f1f5f9',
  },
  body: {
    padding: '0 32px', overflowY: 'auto', flex: 1,
  },
  footer: {
    padding: '16px 32px', borderTop: '1px solid #f1f5f9',
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  },
  section: {
    padding: '20px 0', borderBottom: '1px solid #f9fafb',
  },
  sectionTitle: {
    fontSize: 15, fontWeight: 700, color: '#111827', margin: '0 0 8px',
    display: 'flex', alignItems: 'center', gap: 8,
  },
  tab: {
    display: 'inline-block', fontSize: 11, fontWeight: 600, padding: '2px 8px',
    borderRadius: 5, background: 'rgba(184,148,61,0.12)', color: '#92740e',
    marginLeft: 8,
  },
  content: { fontSize: 14, color: '#4b5563', lineHeight: 1.65, margin: 0 },
  whatToDo: {
    marginTop: 10, padding: '10px 14px', borderRadius: 10,
    background: '#f8fafc', border: '1px solid #e2e8f0',
  },
  whatLabel: {
    fontSize: 11, fontWeight: 700, color: '#b8943d', textTransform: 'uppercase',
    letterSpacing: '0.05em', marginBottom: 4,
  },
  whatText: { fontSize: 13, color: '#374151', lineHeight: 1.6, margin: 0 },
  btn: {
    padding: '10px 24px', background: '#b8943d', color: '#fff', border: 'none',
    borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer',
  },
  btnOutline: {
    padding: '10px 24px', background: 'transparent', color: '#6b7280', border: '1px solid #e5e7eb',
    borderRadius: 10, fontSize: 14, fontWeight: 500, cursor: 'pointer',
  },
  dots: { display: 'flex', gap: 6, alignItems: 'center' },
  dot: (active) => ({
    width: active ? 20 : 8, height: 8, borderRadius: 10,
    background: active ? '#b8943d' : '#e5e7eb', transition: 'all 0.2s',
  }),
};

export default function Welcome({ user, onDismiss }) {
  const [page, setPage] = useState(0);
  const isLast = page === SECTIONS.length - 1;
  const sec = SECTIONS[page];

  return (
    <div style={s.overlay} onClick={onDismiss}>
      <div style={s.card} onClick={e => e.stopPropagation()}>
        <div style={s.header}>
          <h2 style={{ margin: '0 0 4px', fontSize: 20, fontWeight: 800, color: '#111827' }}>
            {page === 0 ? `Welcome to GSE, ${user?.name?.split(' ')[0] || 'Team'}` : sec.title}
          </h2>
          <p style={{ margin: 0, fontSize: 13, color: '#9ca3af' }}>
            {page === 0 ? 'A quick walkthrough of how everything works.' : `Step ${page} of ${SECTIONS.length - 1}`}
          </p>
        </div>

        <div style={s.body}>
          <div style={s.section}>
            <div style={s.sectionTitle}>
              <span style={{ fontSize: 20 }}>{sec.icon}</span>
              {sec.title}
              {sec.tab && <span style={s.tab}>{sec.tab} tab</span>}
            </div>
            <p style={s.content}>{sec.content}</p>
            {sec.whatToDo && (
              <div style={s.whatToDo}>
                <div style={s.whatLabel}>What you need to do</div>
                <p style={s.whatText}>{sec.whatToDo}</p>
              </div>
            )}
          </div>
        </div>

        <div style={s.footer}>
          <div style={s.dots}>
            {SECTIONS.map((_, i) => (
              <div key={i} style={s.dot(i === page)} onClick={() => setPage(i)} />
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {page > 0 && (
              <button style={s.btnOutline} onClick={() => setPage(p => p - 1)}>Back</button>
            )}
            {isLast ? (
              <button style={s.btn} onClick={onDismiss}>Got It, Let's Go</button>
            ) : (
              <button style={s.btn} onClick={() => setPage(p => p + 1)}>Next</button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
