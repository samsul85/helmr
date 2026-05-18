'use client';

import { useEffect, useState } from 'react';

const S = {
  page: { minHeight: '100vh', background: '#f5f3ee', padding: '12px', boxSizing: 'border-box' },
  frame: { maxWidth: '420px', margin: '0 auto', background: 'white', borderRadius: '20px', minHeight: '85vh', overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.06)' },
  btn: { width: '100%', padding: '14px', borderRadius: '10px', border: '0.5px solid #ccc', background: 'white', cursor: 'pointer', fontSize: '15px', fontWeight: 500, fontFamily: 'inherit' },
  card: { background: 'white', border: '0.5px solid #eee', borderRadius: '12px', padding: '14px', marginBottom: '10px' },
  label: { fontSize: '12px', color: '#777', marginBottom: '4px', display: 'block' },
};

export default function GuestView({ event, guestId }) {
  const initialGuest = guestId ? (event.people || []).find(p => p.id === guestId) : null;
  const [status, setStatus] = useState(initialGuest?.status || null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!guestId) return;
    fetch(`/api/events/${event.id}/view`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ guestId }),
    }).catch(() => {});
  }, [event.id, guestId]);

  const sendRsvp = async (newStatus) => {
    if (!guestId) {
      alert('To RSVP, please use the personal link your organizer sent you.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/events/${event.id}/rsvp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ guestId, status: newStatus }),
      });
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      setStatus(data.status || newStatus);
    } catch {
      alert("Couldn't send your RSVP. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const peopleWithMyStatus = (event.people || []).map(p =>
    p.id === guestId && status ? { ...p, status } : p
  );
  const total = (event.expenses || []).reduce((s, e) => s + (Number(e.amount) || 0), 0);
  const confirmed = peopleWithMyStatus.filter(p => p.status === 'confirmed' || p.status === 'paid').length;
  const perPerson = confirmed > 0 ? Math.round((total + Number(event.tip || 0)) / confirmed) : 0;

  const organizerEmail = event.organizerEmail || null;
  const declined = status === 'declined';
  const confirmedSelf = status === 'confirmed' || status === 'paid';

  return (
    <div style={S.page}>
      <div style={S.frame}>
        <div style={{ padding: '14px 20px' }}>
          <div style={{ marginBottom: '12px' }}>
            <div style={{ fontSize: '11px', color: '#999', letterSpacing: '0.5px' }}>YOU'RE INVITED</div>
            <h2 style={{ fontSize: '20px', margin: '2px 0 0', fontWeight: 500 }}>{event.eventName || 'Group event'}</h2>
            {initialGuest && <div style={{ fontSize: '13px', color: '#666', marginTop: '4px' }}>Hi {initialGuest.name} 👋</div>}
            {!initialGuest && guestId && <div style={{ fontSize: '12px', color: '#a55', marginTop: '4px' }}>Your guest link may be outdated — please contact the organizer.</div>}
            {event.organizerName && <div style={{ fontSize: '12px', color: '#999', marginTop: '2px' }}>From {event.organizerName}</div>}
          </div>

          {!declined && (
            <div style={S.card}>
              <div style={S.label}>Your share</div>
              <div style={{ fontSize: '32px', fontWeight: 500 }}>${perPerson}</div>
              <div style={{ fontSize: '12px', color: '#777', marginTop: '4px' }}>
                Split among {confirmed} confirmed {confirmed === 1 ? 'guest' : 'guests'}
              </div>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '10px' }}>
            <button
              disabled={submitting || !guestId}
              onClick={() => sendRsvp('confirmed')}
              style={{
                ...S.btn,
                background: confirmedSelf ? '#085041' : '#e1f5ee',
                borderColor: '#5dcaa5',
                color: confirmedSelf ? 'white' : '#085041',
                opacity: submitting ? 0.6 : 1,
              }}
            >
              {confirmedSelf ? "You're in ✓" : "I'm in ✓"}
            </button>
            <button
              disabled={submitting || !guestId}
              onClick={() => sendRsvp('declined')}
              style={{
                ...S.btn,
                background: declined ? '#791f1f' : '#fcebeb',
                borderColor: '#f09595',
                color: declined ? 'white' : '#791f1f',
                opacity: submitting ? 0.6 : 1,
              }}
            >
              {declined ? "Declined ✗" : "Can't make it ✗"}
            </button>
          </div>

          {!guestId && (
            <p style={{ fontSize: '11px', color: '#999', textAlign: 'center', margin: '0 0 12px' }}>
              Open your personal invite link to RSVP.
            </p>
          )}

          {confirmedSelf && (
            <div style={S.card}>
              <div style={{ fontWeight: 500, marginBottom: '8px' }}>💸 Send your share</div>
              {organizerEmail ? (
                <>
                  <p style={{ fontSize: '12px', color: '#777', margin: '0 0 8px' }}>Interac e-Transfer to:</p>
                  <div style={{ background: '#f5f3ee', padding: '10px 12px', borderRadius: '8px', fontFamily: 'monospace', fontSize: '14px', wordBreak: 'break-all' }}>{organizerEmail}</div>
                  <p style={{ fontSize: '11px', color: '#999', margin: '8px 0 0' }}>Include event code: {event.id.toUpperCase()}</p>
                </>
              ) : (
                <p style={{ fontSize: '12px', color: '#a55', margin: 0 }}>The organizer hasn't added their Interac email yet. Contact them directly.</p>
              )}
            </div>
          )}

          {declined && (
            <p style={{ fontSize: '13px', color: '#777', textAlign: 'center', padding: '20px 0' }}>You've declined this invite. Tap "I'm in" if that changes.</p>
          )}

          {!declined && (
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
          )}
        </div>
      </div>
    </div>
  );
}
