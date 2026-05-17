'use client';

import { useState } from 'react';

// ============ CONFIG ============
// 🚨 REPLACE THIS with your real Formspree endpoint after signing up at formspree.io
const FORMSPREE_ENDPOINT = ' https://formspree.io/f/mredzlyn';

const eventTypes = [
  { id: 'trip', icon: '✈️', label: 'Trip', expenses: ['Hotel', 'Flights', 'Excursions', 'Meals', 'Transport'] },
  { id: 'bday', icon: '🎂', label: 'Birthday', expenses: ['Venue', 'Cake', 'Decor', 'Catering', 'Gift'] },
  { id: 'concert', icon: '🎵', label: 'Concert', expenses: ['Tickets', 'Transport', 'Pre-drinks', 'Food'] },
  { id: 'golf', icon: '🏌️', label: 'Golf day', expenses: ['Green fees', 'Cart', 'Food', 'Prizes'] },
  { id: 'dinner', icon: '🍽️', label: 'Dinner', expenses: ['Restaurant', 'Drinks', 'Dessert', 'Tip'] },
  { id: 'bach', icon: '🎉', label: 'Bachelor/ette', expenses: ['Accommodation', 'Activities', 'Dinner', 'Drinks', 'Decor'] },
  { id: 'offsite', icon: '🏢', label: 'Offsite', expenses: ['Venue', 'Accommodation', 'Activities', 'Catering', 'AV'] },
  { id: 'grad', icon: '🎓', label: 'Graduation', expenses: ['Venue', 'Catering', 'Photographer', 'Decor'] },
  { id: 'gift', icon: '🎁', label: 'Group gift', expenses: ['Main gift', 'Card', 'Wrapping'] },
  { id: 'beach', icon: '🏖️', label: 'Beach day', expenses: ['Rental', 'Food', 'Drinks', 'Equipment'] },
  { id: 'other', icon: '➕', label: 'Other', expenses: [] },
];

const statusStyles = {
  invited:   { bg: '#eeeae0', fg: '#666' },
  confirmed: { bg: '#e1f5ee', fg: '#085041' },
  paid:      { bg: '#eaf3de', fg: '#27500a' },
  declined:  { bg: '#fcebeb', fg: '#791f1f' },
};

// ============ STYLES ============
const S = {
  page: { minHeight: '100vh', background: '#f5f3ee', padding: '12px', boxSizing: 'border-box' },
  frame: { maxWidth: '420px', margin: '0 auto', background: 'white', borderRadius: '20px', minHeight: '85vh', overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.06)' },
  topBar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', borderBottom: '0.5px solid #eee' },
  btn: { width: '100%', padding: '14px', borderRadius: '10px', border: '0.5px solid #ccc', background: 'white', cursor: 'pointer', fontSize: '15px', fontWeight: 500, fontFamily: 'inherit' },
  btnPrimary: { background: '#1a1a1a', color: 'white', border: 'none' },
  btnGhost: { background: 'transparent', border: 'none', color: '#666', fontSize: '13px', padding: '8px', cursor: 'pointer', fontFamily: 'inherit' },
  input: { width: '100%', padding: '12px', borderRadius: '10px', border: '0.5px solid #ddd', fontSize: '15px', fontFamily: 'inherit', boxSizing: 'border-box', outline: 'none' },
  card: { background: 'white', border: '0.5px solid #eee', borderRadius: '12px', padding: '14px', marginBottom: '10px' },
  label: { fontSize: '12px', color: '#777', marginBottom: '4px', display: 'block' },
  pill: { fontSize: '11px', padding: '3px 10px', borderRadius: '999px', fontWeight: 500, cursor: 'pointer', userSelect: 'none' },
  tab: { flex: 1, padding: '10px 4px', textAlign: 'center', fontSize: '12px', cursor: 'pointer', borderBottom: '2px solid transparent', color: '#777', fontWeight: 500 },
  tabActive: { borderBottomColor: '#1a1a1a', color: '#1a1a1a' },
  evt: { padding: '16px 8px', borderRadius: '12px', border: '0.5px solid #e8e4d8', background: 'white', cursor: 'pointer', textAlign: 'center', fontSize: '13px' },
  feedbackBtn: { position: 'fixed', bottom: '20px', right: '20px', background: '#1a1a1a', color: 'white', border: 'none', borderRadius: '999px', padding: '12px 18px', fontSize: '14px', fontWeight: 500, cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,0.2)', zIndex: 100, fontFamily: 'inherit' },
  modalOverlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', zIndex: 200 },
  modal: { background: 'white', borderRadius: '16px', padding: '20px', maxWidth: '420px', width: '100%' },
};

// ============ FEEDBACK MODAL ============
function FeedbackModal({ open, onClose, currentScreen }) {
  const [verdict, setVerdict] = useState('');
  const [comment, setComment] = useState('');
  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  if (!open) return null;

  const submit = async () => {
    setSubmitting(true);
    try {
      await fetch(FORMSPREE_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ verdict, comment, name, screen: currentScreen }),
      });
      setSubmitted(true);
    } catch {
      alert('Could not send feedback — please try again.');
    }
    setSubmitting(false);
  };

  if (submitted) {
    return (
      <div style={S.modalOverlay} onClick={onClose}>
        <div style={S.modal} onClick={e => e.stopPropagation()}>
          <h3 style={{ margin: '0 0 8px' }}>Thanks 🙏</h3>
          <p style={{ margin: '0 0 16px', color: '#666', fontSize: '14px' }}>This helps a lot.</p>
          <button style={{ ...S.btn, ...S.btnPrimary }} onClick={() => { setSubmitted(false); onClose(); }}>Close</button>
        </div>
      </div>
    );
  }

  return (
    <div style={S.modalOverlay} onClick={onClose}>
      <div style={S.modal} onClick={e => e.stopPropagation()}>
        <h3 style={{ margin: '0 0 4px' }}>Quick feedback</h3>
        <p style={{ margin: '0 0 16px', color: '#666', fontSize: '13px' }}>Takes 30 seconds. Helps me figure out if this is worth building.</p>

        <label style={S.label}>Would you use Helmr for your next group event?</label>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
          {['Yes', 'Maybe', 'No'].map(v => (
            <button
              key={v}
              onClick={() => setVerdict(v)}
              style={{ flex: 1, padding: '10px', borderRadius: '10px', border: verdict === v ? '2px solid #1a1a1a' : '0.5px solid #ddd', background: verdict === v ? '#1a1a1a' : 'white', color: verdict === v ? 'white' : '#1a1a1a', fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}
            >{v}</button>
          ))}
        </div>

        <label style={S.label}>What's missing, confusing, or great?</label>
        <textarea
          value={comment}
          onChange={e => setComment(e.target.value)}
          style={{ ...S.input, minHeight: '80px', resize: 'vertical', marginBottom: '14px' }}
          placeholder="Anything goes…"
        />

        <label style={S.label}>Name (optional)</label>
        <input style={{ ...S.input, marginBottom: '16px' }} value={name} onChange={e => setName(e.target.value)} placeholder="So I know who said this" />

        <div style={{ display: 'flex', gap: '8px' }}>
          <button style={S.btn} onClick={onClose}>Cancel</button>
          <button
            style={{ ...S.btn, ...S.btnPrimary, opacity: (verdict || comment) ? 1 : 0.5 }}
            disabled={!verdict && !comment || submitting}
            onClick={submit}
          >{submitting ? 'Sending…' : 'Send feedback'}</button>
        </div>
      </div>
    </div>
  );
}

// ============ MAIN APP ============
export default function Helmr() {
  const [screen, setScreen] = useState('welcome');
  const [eventType, setEventType] = useState(null);
  const [eventName, setEventName] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [eventLoc, setEventLoc] = useState('');
  const [dateTBD, setDateTBD] = useState(false);
  const [locTBD, setLocTBD] = useState(false);
  const [tab, setTab] = useState('overview');
  const [tip, setTip] = useState(0);
  const [feedbackOpen, setFeedbackOpen] = useState(false);

  const [people, setPeople] = useState([
    { id: 1, name: 'Sam (you)', status: 'paid', role: 'organizer' },
    { id: 2, name: 'Layla', status: 'confirmed' },
    { id: 3, name: 'Omar', status: 'invited' },
    { id: 4, name: 'Yusuf', status: 'declined' },
  ]);
  const [expenses, setExpenses] = useState([
    { id: 1, name: 'Venue rental', amount: 600 },
    { id: 2, name: 'Catering', amount: 400 },
  ]);

  const total = expenses.reduce((s, e) => s + (Number(e.amount) || 0), 0);
  const confirmed = people.filter(p => p.status === 'confirmed' || p.status === 'paid').length;
  const perPerson = confirmed > 0 ? Math.round((total + Number(tip)) / confirmed) : 0;

  const pickType = (id) => {
    setEventType(id);
    const t = eventTypes.find(e => e.id === id);
    setExpenses((t.expenses || []).map((name, i) => ({ id: i + 1, name, amount: 0 })));
    setScreen('details');
  };

  const cycleStatus = (id) => {
    const cycle = ['invited', 'confirmed', 'paid', 'declined'];
    setPeople(people.map(p => {
      if (p.id !== id || p.role === 'organizer') return p;
      return { ...p, status: cycle[(cycle.indexOf(p.status) + 1) % cycle.length] };
    }));
  };

  // ===== SCREENS =====
  const renderScreen = () => {
    if (screen === 'welcome') return (
      <div style={{ padding: '60px 20px', textAlign: 'center' }}>
        <div style={{ fontSize: '52px', marginBottom: '8px' }}>⚓</div>
        <h1 style={{ fontSize: '32px', margin: '8px 0 4px', fontWeight: 500 }}>Helmr</h1>
        <p style={{ fontSize: '15px', color: '#666', margin: '0 0 32px' }}>Take the helm of your next group plan</p>
        <button style={{ ...S.btn, ...S.btnPrimary, marginBottom: '10px' }} onClick={() => setScreen('chooseType')}>Plan something</button>
        <button style={S.btn} onClick={() => setScreen('guest')}>I was invited</button>
        <p style={{ fontSize: '11px', color: '#999', marginTop: '24px' }}>This is a prototype — nothing saves yet</p>
      </div>
    );

    if (screen === 'chooseType') return (
      <div style={{ padding: '20px' }}>
        <button style={S.btnGhost} onClick={() => setScreen('welcome')}>← Back</button>
        <h2 style={{ fontSize: '22px', margin: '8px 0 4px', fontWeight: 500 }}>What are you planning?</h2>
        <p style={{ fontSize: '13px', color: '#777', margin: '0 0 20px' }}>We'll suggest expenses to get you started</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          {eventTypes.map(e => (
            <div key={e.id} style={S.evt} onClick={() => pickType(e.id)}>
              <div style={{ fontSize: '24px', marginBottom: '4px' }}>{e.icon}</div>
              {e.label}
            </div>
          ))}
        </div>
      </div>
    );

    if (screen === 'details') {
      const t = eventTypes.find(e => e.id === eventType);
      return (
        <div style={{ padding: '20px' }}>
          <button style={S.btnGhost} onClick={() => setScreen('chooseType')}>← Back</button>
          <h2 style={{ fontSize: '22px', margin: '8px 0 16px', fontWeight: 500 }}>{t.icon} {t.label} details</h2>
          <label style={S.label}>Event name</label>
          <input style={S.input} placeholder="e.g. Layla's 30th" value={eventName} onChange={e => setEventName(e.target.value)} />
          <div style={{ height: '14px' }} />
          <label style={S.label}><input type="checkbox" checked={dateTBD} onChange={() => setDateTBD(!dateTBD)} style={{ marginRight: '4px' }} /> Date TBD</label>
          {!dateTBD && <input style={S.input} type="date" value={eventDate} onChange={e => setEventDate(e.target.value)} />}
          <div style={{ height: '14px' }} />
          <label style={S.label}><input type="checkbox" checked={locTBD} onChange={() => setLocTBD(!locTBD)} style={{ marginRight: '4px' }} /> Location TBD</label>
          {!locTBD && <input style={S.input} placeholder="Where?" value={eventLoc} onChange={e => setEventLoc(e.target.value)} />}
          <div style={{ height: '20px' }} />
          <button style={{ ...S.btn, ...S.btnPrimary }} onClick={() => setScreen('dashboard')}>Continue</button>
        </div>
      );
    }

    if (screen === 'dashboard') return (
      <div style={{ padding: '14px 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <div>
            <div style={{ fontSize: '11px', color: '#999', letterSpacing: '0.5px' }}>ORGANIZER VIEW</div>
            <h2 style={{ fontSize: '20px', margin: '2px 0 0', fontWeight: 500 }}>{eventName || 'Your event'}</h2>
          </div>
          <button style={S.btnGhost} onClick={() => setScreen('guest')}>Guest view →</button>
        </div>
        <div style={{ display: 'flex', borderBottom: '0.5px solid #eee', marginBottom: '14px' }}>
          {['overview', 'people', 'expenses', 'extras'].map(t => (
            <div key={t} style={{ ...S.tab, ...(tab === t ? S.tabActive : {}) }} onClick={() => setTab(t)}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </div>
          ))}
        </div>

        {tab === 'overview' && (
          <>
            <div style={S.card}>
              <div style={S.label}>Total cost</div>
              <div style={{ fontSize: '26px', fontWeight: 500 }}>${total.toLocaleString()}</div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <div style={S.card}>
                <div style={S.label}>Confirmed</div>
                <div style={{ fontSize: '18px', fontWeight: 500 }}>{confirmed} / {people.length}</div>
              </div>
              <div style={S.card}>
                <div style={S.label}>Per person</div>
                <div style={{ fontSize: '18px', fontWeight: 500 }}>${perPerson}</div>
              </div>
            </div>
            <button style={{ ...S.btn, marginTop: '12px' }} onClick={() => alert('In the real app, this copies a shareable link to send to your group.')}>📋 Share invite link</button>
          </>
        )}

        {tab === 'people' && (
          <>
            {people.map(p => {
              const c = statusStyles[p.status];
              return (
                <div key={p.id} style={S.card}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: '15px', fontWeight: 500 }}>
                      {p.name}{p.role === 'organizer' && <span style={{ fontSize: '11px', color: '#999', fontWeight: 400 }}> · organizer</span>}
                    </div>
                    <span style={{ ...S.pill, background: c.bg, color: c.fg }} onClick={() => cycleStatus(p.id)}>{p.status}</span>
                  </div>
                </div>
              );
            })}
            <button style={S.btn} onClick={() => {
              const n = prompt('Name?');
              if (n) setPeople([...people, { id: Date.now(), name: n, status: 'invited' }]);
            }}>+ Add person</button>
            <p style={{ fontSize: '11px', color: '#999', marginTop: '8px' }}>Tap a status to cycle through invited → confirmed → paid → declined</p>
          </>
        )}

        {tab === 'expenses' && (
          <>
            {expenses.map(e => (
              <div key={e.id} style={S.card}>
                <input style={{ ...S.input, marginBottom: '8px' }} value={e.name} onChange={ev => setExpenses(expenses.map(x => x.id === e.id ? { ...x, name: ev.target.value } : x))} />
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <span style={{ fontSize: '14px', color: '#777' }}>$</span>
                  <input style={S.input} type="number" value={e.amount} onChange={ev => setExpenses(expenses.map(x => x.id === e.id ? { ...x, amount: ev.target.value } : x))} />
                  <button style={S.btnGhost} onClick={() => setExpenses(expenses.filter(x => x.id !== e.id))}>🗑️</button>
                </div>
              </div>
            ))}
            <button style={S.btn} onClick={() => {
              const n = prompt('Expense name?');
              if (n) setExpenses([...expenses, { id: Date.now(), name: n, amount: 0 }]);
            }}>+ Add expense</button>
          </>
        )}

        {tab === 'extras' && (
          <>
            <div style={S.card}>
              <div style={{ fontWeight: 500, marginBottom: '4px' }}>🎩 Tip the planner</div>
              <p style={{ fontSize: '12px', color: '#777', margin: '0 0 8px' }}>Optional add-on for the organizer's time</p>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <span>$</span>
                <input style={S.input} type="number" value={tip} onChange={e => setTip(e.target.value)} />
              </div>
            </div>
            <div style={S.card}>
              <div style={{ fontWeight: 500, marginBottom: '4px' }}>🎁 Surprise gift</div>
              <p style={{ fontSize: '12px', color: '#777', margin: '0 0 8px' }}>Propose a gift; requires organizer approval</p>
              <button style={S.btn} onClick={() => alert('Surprise gift flow — propose a gift, organizer approves before it shows up to other guests.')}>+ Propose surprise gift</button>
            </div>
          </>
        )}
      </div>
    );

    if (screen === 'guest') return (
      <div style={{ padding: '14px 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <div>
            <div style={{ fontSize: '11px', color: '#999', letterSpacing: '0.5px' }}>YOU'RE INVITED</div>
            <h2 style={{ fontSize: '20px', margin: '2px 0 0', fontWeight: 500 }}>{eventName || "Layla's 30th"}</h2>
          </div>
          <button style={S.btnGhost} onClick={() => setScreen('dashboard')}>Organizer →</button>
        </div>

        <div style={S.card}>
          <div style={S.label}>Your share</div>
          <div style={{ fontSize: '32px', fontWeight: 500 }}>${perPerson}</div>
          <div style={{ fontSize: '12px', color: '#777', marginTop: '4px' }}>Split among {confirmed} confirmed guests</div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '10px' }}>
          <button style={{ ...S.btn, background: '#e1f5ee', borderColor: '#5dcaa5', color: '#085041' }}>I'm in ✓</button>
          <button style={{ ...S.btn, background: '#fcebeb', borderColor: '#f09595', color: '#791f1f' }}>Can't make it ✗</button>
        </div>

        <div style={S.card}>
          <div style={{ fontWeight: 500, marginBottom: '8px' }}>💸 Send your share</div>
          <p style={{ fontSize: '12px', color: '#777', margin: '0 0 8px' }}>Interac e-Transfer to:</p>
          <div style={{ background: '#f5f3ee', padding: '10px 12px', borderRadius: '8px', fontFamily: 'monospace', fontSize: '14px' }}>sam@helmr.app</div>
          <p style={{ fontSize: '11px', color: '#999', margin: '8px 0 0' }}>Include event code: HLMR-DEMO</p>
        </div>

        <div style={S.card}>
          <div style={{ fontWeight: 500, marginBottom: '8px' }}>What's it for</div>
          {expenses.map(e => (
            <div key={e.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: '14px' }}>
              <span style={{ color: '#777' }}>{e.name}</span>
              <span>${(Number(e.amount) || 0).toLocaleString()}</span>
            </div>
          ))}
          <div style={{ height: '0.5px', background: '#eee', margin: '8px 0' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 500 }}>
            <span>Total</span><span>${total.toLocaleString()}</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div style={S.page}>
      <div style={S.frame}>{renderScreen()}</div>
      <button style={S.feedbackBtn} onClick={() => setFeedbackOpen(true)}>💬 Feedback</button>
      <FeedbackModal open={feedbackOpen} onClose={() => setFeedbackOpen(false)} currentScreen={screen} />
    </div>
  );
}
