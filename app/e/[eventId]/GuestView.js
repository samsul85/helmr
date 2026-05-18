'use client';

import { useEffect } from 'react';

const S = {
  page: { minHeight: '100vh', background: '#f5f3ee', padding: '12px', boxSizing: 'border-box' },
  frame: { maxWidth: '420px', margin: '0 auto', background: 'white', borderRadius: '20px', minHeight: '85vh', overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.06)' },
  btn: { width: '100%', padding: '14px', borderRadius: '10px', border: '0.5px solid #ccc', background: 'white', cursor: 'pointer', fontSize: '15px', fontWeight: 500, fontFamily: 'inherit' },
  card: { background: 'white', border: '0.5px solid #eee', borderRadius: '12px', padding: '14px', marginBottom: '10px' },
  label: { fontSize: '12px', color: '#777', marginBottom: '4px', display: 'block' },
};

export default function GuestView({ event, guestId }) {
  const guest = guestId ? (event.people || []).find(p => p.id === guestId) : null;

  useEffect(() => {
    if (!guestId) return;
    fetch(`/api/events/${event.id}/view`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ guestId }),
    }).catch(() => {});
  }, [event.id, guestId]);

  const total = (event.expenses || []).reduce((s, e) => s + (Number(e.amount) || 0), 0);
  const confirmed = (event.people || []).filter(p => p.status === 'confirmed' || p.status === 'paid').length;
  const perPerson = confirmed > 0 ? Math.round((total + Number(event.tip || 0)) / confirmed) : 0;
  const organizerEmail = 'sam@helmr.app';

  return (
    <div style={S.page}>
      <div style={S.frame}>
        <div style={{ padding: '14px 20px' }}>
          <div style={{ marginBottom: '12px' }}>
            <div style={{ fontSize: '11px', color: '#999', letterSpacing: '0.5px' }}>YOU'RE INVITED</div>
            <h2 style={{ fontSize: '20px', margin: '2px 0 0', fontWeight: 500 }}>{event.eventName || 'Group event'}</h2>
            {guest && <div style={{ fontSize: '13px', color: '#666', marginTop: '4px' }}>Hi {guest.name} 👋</div>}
            {!guest && guestId && <div style={{ fontSize: '12px', color: '#a55', marginTop: '4px' }}>Note: your guest link may be outdated.</div>}
          </div>

          <div style={S.card}>
            <div style={S.label}>Your share</div>
            <div style={{ fontSize: '32px', fontWeight: 500 }}>${perPerson}</div>
            <div style={{ fontSize: '12px', color: '#777', marginTop: '4px' }}>
              Split among {confirmed} confirmed {confirmed === 1 ? 'guest' : 'guests'}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '10px' }}>
            <button style={{ ...S.btn, background: '#e1f5ee', borderColor: '#5dcaa5', color: '#085041' }}>I'm in ✓</button>
            <button style={{ ...S.btn, background: '#fcebeb', borderColor: '#f09595', color: '#791f1f' }}>Can't make it ✗</button>
          </div>
          <p style={{ fontSize: '11px', color: '#999', textAlign: 'center', margin: '0 0 12px' }}>
            (RSVP buttons aren't wired up yet — let the organizer know directly for now)
          </p>

          <div style={S.card}>
            <div style={{ fontWeight: 500, marginBottom: '8px' }}>💸 Send your share</div>
            <p style={{ fontSize: '12px', color: '#777', margin: '0 0 8px' }}>Interac e-Transfer to:</p>
            <div style={{ background: '#f5f3ee', padding: '10px 12px', borderRadius: '8px', fontFamily: 'monospace', fontSize: '14px' }}>{organizerEmail}</div>
            <p style={{ fontSize: '11px', color: '#999', margin: '8px 0 0' }}>Include event code: {event.id.toUpperCase()}</p>
          </div>

          <div style={S.card}>
            <div style={{ fontWeight: 500, marginBottom: '8px' }}>What's it for</div>
            {(event.expenses || []).map(e => (
              <div key={e.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: '14px' }}>
                <span style={{ color: '#777' }}>{e.name}</span>
                <span>${(Number(e.amount) || 0).toLocaleString()}</span>
              </div>
            ))}
            <div style={{ height: '
'use client';

import { useEffect } from 'react';

const S = {
  page: { minHeight: '100vh', background: '#f5f3ee', padding: '12px', boxSizing: 'border-box' },
  frame: { maxWidth: '420px', margin: '0 auto', background: 'white', borderRadius: '20px', minHeight: '85vh', overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.06)' },
  btn: { width: '100%', padding: '14px', borderRadius: '10px', border: '0.5px solid #ccc', background: 'white', cursor: 'pointer', fontSize: '15px', fontWeight: 500, fontFamily: 'inherit' },
  card: { background: 'white', border: '0.5px solid #eee', borderRadius: '12px', padding: '14px', marginBottom: '10px' },
  label: { fontSize: '12px', color: '#777', marginBottom: '4px', display: 'block' },
};

export default function GuestView({ event, guestId }) {
  const guest = guestId ? (event.people || []).find(p => p.id === guestId) : null;

  useEffect(() => {
    if (!guestId) return;
    fetch(`/api/events/${event.id}/view`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ guestId }),
    }).catch(() => {});
  }, [event.id, guestId]);

  const total = (event.expenses || []).reduce((s, e) => s + (Number(e.amount) || 0), 0);
  const confirmed = (event.people || []).filter(p => p.status === 'confirmed' || p.status === 'paid').length;
  const perPerson = confirmed > 0 ? Math.round((total + Number(event.tip || 0)) / confirmed) : 0;
  const organizerEmail = 'sam@helmr.app';

  return (
    <div style={S.page}>
      <div style={S.frame}>
        <div style={{ padding: '14px 20px' }}>
          <div style={{ marginBottom: '12px' }}>
            <div style={{ fontSize: '11px', color: '#999', letterSpacing: '0.5px' }}>YOU'RE INVITED</div>
            <h2 style={{ fontSize: '20px', margin: '2px 0 0', fontWeight: 500 }}>{event.eventName || 'Group event'}</h2>
            {guest && <div style={{ fontSize: '13px', color: '#666', marginTop: '4px' }}>Hi {guest.name} 👋</div>}
            {!guest && guestId && <div style={{ fontSize: '12px', color: '#a55', marginTop: '4px' }}>Note: your guest link may be outdated.</div>}
          </div>

          <div style={S.card}>
            <div style={S.label}>Your share</div>
            <div style={{ fontSize: '32px', fontWeight: 500 }}>${perPerson}</div>
            <div style={{ fontSize: '12px', color: '#777', marginTop: '4px' }}>
              Split among {confirmed} confirmed {confirmed === 1 ? 'guest' : 'guests'}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '10px' }}>
            <button style={{ ...S.btn, background: '#e1f5ee', borderColor: '#5dcaa5', color: '#085041' }}>I'm in ✓</button>
            <button style={{ ...S.btn, background: '#fcebeb', borderColor: '#f09595', color: '#791f1f' }}>Can't make it ✗</button>
          </div>
          <p style={{ fontSize: '11px', color: '#999', textAlign: 'center', margin: '0 0 12px' }}>
            (RSVP buttons aren't wired up yet — let the organizer know directly for now)
          </p>

          <div style={S.card}>
            <div style={{ fontWeight: 500, marginBottom: '8px' }}>💸 Send your share</div>
            <p style={{ fontSize: '12px', color: '#777', margin: '0 0 8px' }}>Interac e-Transfer to:</p>
            <div style={{ background: '#f5f3ee', padding: '10px 12px', borderRadius: '8px', fontFamily: 'monospace', fontSize: '14px' }}>{organizerEmail}</div>
            <p style={{ fontSize: '11px', color: '#999', margin: '8px 0 0' }}>Include event code: {event.id.toUpperCase()}</p>
          </div>

          <div style={S.card}>
            <div style={{ fontWeight: 500, marginBottom: '8px' }}>What's it for</div>
            {(event.expenses || []).map(e => (
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
      </div>
    </div>
  );
}
