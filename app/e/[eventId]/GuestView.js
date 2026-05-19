'use client';

import { useEffect, useState } from 'react';

const S = {
  page: { minHeight: '100vh', background: '#f5f3ee', padding: '12px', boxSizing: 'border-box' },
  frame: { maxWidth: '420px', margin: '0 auto', background: 'white', borderRadius: '20px', minHeight: '85vh', overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.06)' },
  btn: { width: '100%', padding: '14px', borderRadius: '10px', border: '0.5px solid #ccc', background: 'white', cursor: 'pointer', fontSize: '15px', fontWeight: 500, fontFamily: 'inherit' },
  btnPrimary: { background: '#1a1a1a', color: 'white', border: 'none' },
  card: { background: 'white', border: '0.5px solid #eee', borderRadius: '12px', padding: '14px', marginBottom: '10px' },
  label: { fontSize: '12px', color: '#777', marginBottom: '4px', display: 'block' },
  input: { width: '100%', padding: '12px', borderRadius: '10px', border: '0.5px solid #ddd', fontSize: '15px', fontFamily: 'inherit', boxSizing: 'border-box', outline: 'none' },
};

// Per-event localStorage key for broadcast self-signups
const lsBroadcastKey = (eventId) => `helmr.broadcast.${eventId}`;

export default function GuestView({ event, guestId: initialGuestIdProp }) {
  const mode = event.mode === 'open_pool' ? 'open_pool' : 'cost_split';
  const inviteMode = event.inviteMode === 'broadcast' ? 'broadcast' : 'personal';

  // Resolve which guest record (if any) this viewer is acting as.
  // Priority: URL ?g= param > localStorage (for broadcast revisits) > null.
  const [resolvedGuestId, setResolvedGuestId] = useState(initialGuestIdProp || null);

  useEffect(() => {
    if (initialGuestIdProp) return;
    if (inviteMode !== 'broadcast') return;
    if (typeof window === 'undefined') return;
    try {
      const stored = window.localStorage.getItem(lsBroadcastKey(event.id));
      if (stored) setResolvedGuestId(stored);
    } catch {}
  }, [event.id, initialGuestIdProp, inviteMode]);

  const guestId = resolvedGuestId;
  const initialGuest = guestId ? (event.people || []).find(p => p.id === guestId) : null;

  const [status, setStatus] = useState(initialGuest?.status || null);
  const [submitting, setSubmitting] = useState(false);

  // Open Pool state
  const suggestion = Number(event.suggestionAmount) || 0;
  const [amount, setAmount] = useState(
    initialGuest?.contributedAmount != null
      ? String(initialGuest.contributedAmount)
      : suggestion > 0 ? String(suggestion) : ''
  );
  const [pledged, setPledged] = useState(initialGuest?.contributedAmount != null ? Number(initialGuest.contributedAmount) : null);

  // Broadcast: viewer's own name (only used when they don't have a record yet)
  const [selfName, setSelfName] = useState(initialGuest?.name || '');

  // Fire view ping. With a guestId → personal mark. Without → broadcast counter.
  useEffect(() => {
    fetch(`/api/events/${event.id}/view`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(guestId ? { guestId } : {}),
    }).catch(() => {});
    // Only fire once per page load
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event.id]);

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

  const sendContribution = async () => {
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt < 0) {
      alert('Please enter a valid amount (or 0).');
      return;
    }

    // Broadcast first-time pledge requires a name
    if (!guestId && inviteMode === 'broadcast') {
      const name = selfName.trim();
      if (!name) {
        alert('Please enter your name so the organizer knows who chipped in.');
        return;
      }
      setSubmitting(true);
      try {
        const res = await fetch(`/api/events/${event.id}/contribute`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, amount: amt }),
        });
        if (!res.ok) throw new Error('Failed');
        const data = await res.json();
        const newId = data.guestId;
        if (newId) {
          setResolvedGuestId(newId);
          if (typeof window !== 'undefined') {
            try { window.localStorage.setItem(lsBroadcastKey(event.id), newId); } catch {}
          }
        }
        setPledged(amt);
        setStatus('confirmed');
      } catch {
        alert("Couldn't save your pledge. Please try again.");
      } finally {
        setSubmitting(false);
      }
      return;
    }

    if (!guestId) {
      alert('To pledge, please use the personal link your organizer sent you.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/events/${event.id}/contribute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ guestId, amount: amt }),
      });
      if (!res.ok) throw new Error('Failed');
      setPledged(amt);
      setStatus('confirmed');
    } catch {
      alert("Couldn't save your pledge. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const peopleWithMyStatus = (event.people || []).map(p =>
    p.id === guestId && status ? { ...p, status } : p
  );
  const total = (event.expenses || []).reduce((s, e) => s + (Number(e.amount) || 0), 0);
  const invitedCount = (event.people || []).filter(p => p.role !== 'organizer').length;
  const confirmedGuests = peopleWithMyStatus.filter(p => p.role !== 'organizer' && (p.status === 'confirmed' || p.status === 'paid')).length;

  // Cost-Split share labeling (also addresses friends' "$1500 each" feedback):
  const denomConfirmed = confirmedGuests > 0 ? confirmedGuests : 1;
  const denomInvited = invitedCount > 0 ? invitedCount : 1;
  const totalWithTip = total + Number(event.tip || 0);
  const shareIfAllJoin = Math.round(totalWithTip / denomInvited);
  const shareCurrent = Math.round(totalWithTip / denomConfirmed);

  const organizerEmail = event.organizerEmail || null;
  const declined = status === 'declined';
  const confirmedSelf = status === 'confirmed' || status === 'paid';

  // ============================================================
  // OPEN POOL VIEW (covers both personal-link and broadcast)
  // ============================================================
  if (mode === 'open_pool') {
    const goal = Number(event.goal) || 0;
    const pooledTotal = (event.people || [])
      .filter(p => p.role !== 'organizer')
      .reduce((s, p) => s + (Number(p.contributedAmount) || 0), 0);
    const contributors = (event.people || [])
      .filter(p => p.role !== 'organizer' && Number(p.contributedAmount) > 0).length;
    const hasPledged = pledged != null;
    const unitLabel = event.suggestionUnit || 'per person';
    const showSuggestion = suggestion > 0;
    const isBroadcastFirstTime = inviteMode === 'broadcast' && !guestId;

    return (
      <div style={S.page}>
        <div style={S.frame}>
          <div style={{ padding: '14px 20px' }}>
            <div style={{ marginBottom: '12px' }}>
              <div style={{ fontSize: '11px', color: '#999', letterSpacing: '0.5px' }}>YOU'RE INVITED TO CHIP IN</div>
              <h2 style={{ fontSize: '20px', margin: '2px 0 0', fontWeight: 500 }}>{event.eventName || 'Group pool'}</h2>
              {initialGuest && !isBroadcastFirstTime && <div style={{ fontSize: '13px', color: '#666', marginTop: '4px' }}>Hi {initialGuest.name} 👋</div>}
              {!initialGuest && initialGuestIdProp && <div style={{ fontSize: '12px', color: '#a55', marginTop: '4px' }}>Your guest link may be outdated — please contact the organizer.</div>}
              {event.organizerName && <div style={{ fontSize: '12px', color: '#999', marginTop: '2px' }}>From {event.organizerName}</div>}
            </div>

            {/* Pool status */}
            <div style={S.card}>
              <div style={S.label}>Pooled so far</div>
              <div style={{ fontSize: '28px', fontWeight: 500 }}>${pooledTotal.toLocaleString()}</div>
              <div style={{ fontSize: '12px', color: '#777', marginTop: '4px' }}>
                {contributors} {contributors === 1 ? 'person has' : 'people have'} chipped in
              </div>
              {goal > 0 && (
                <>
                  <div style={{ height: '6px', background: '#eee', borderRadius: '999px', marginTop: '10px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${Math.min(100, (pooledTotal / goal) * 100)}%`, background: '#085041' }} />
                  </div>
                  <div style={{ fontSize: '12px', color: '#777', marginTop: '6px' }}>Goal: ${goal.toLocaleString()}</div>
                </>
              )}
            </div>

            {/* Pledge box */}
            {!hasPledged && !declined && (
              <div style={S.card}>
                <div style={{ fontWeight: 500, marginBottom: '4px' }}>How much would you like to chip in?</div>
                {showSuggestion && (
                  <p style={{ fontSize: '12px', color: '#777', margin: '0 0 8px' }}>
                    Suggested: <strong>${suggestion}</strong> {unitLabel}. No pressure — give what feels right, or skip.
                  </p>
                )}
                {!showSuggestion && (
                  <p style={{ fontSize: '12px', color: '#777', margin: '0 0 8px' }}>
                    Any amount helps. No pressure — give what feels right, or skip.
                  </p>
                )}

                {isBroadcastFirstTime && (
                  <>
                    <label style={S.label}>Your name</label>
                    <input
                      type="text"
                      style={{ ...S.input, marginBottom: '10px' }}
                      value={selfName}
                      onChange={e => setSelfName(e.target.value)}
                      placeholder="So the organizer knows who chipped in"
                    />
                  </>
                )}

                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '10px' }}>
                  <span style={{ fontSize: '20px', color: '#777' }}>$</span>
                  <input
                    type="number"
                    min="0"
                    style={{ ...S.input, fontSize: '18px' }}
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    placeholder="0"
                  />
                </div>
                <button
                  style={{ ...S.btn, ...S.btnPrimary, opacity: submitting ? 0.6 : 1 }}
                  disabled={submitting}
                  onClick={sendContribution}
                >
                  {submitting ? 'Saving…' : 'Confirm my contribution'}
                </button>
                {guestId && (
                  <button
                    style={{ ...S.btn, marginTop: '8px' }}
                    disabled={submitting}
                    onClick={() => sendRsvp('declined')}
                  >
                    I can't this time
                  </button>
                )}
              </div>
            )}

            {hasPledged && pledged > 0 && (
              <div style={S.card}>
                <div style={{ fontSize: '13px', color: '#777' }}>Your contribution</div>
                <div style={{ fontSize: '28px', fontWeight: 500, color: '#085041' }}>${pledged}</div>
                <p style={{ fontSize: '12px', color: '#777', margin: '8px 0 0' }}>Thanks! Send your e-Transfer below.</p>
                <button
                  style={{ ...S.btn, marginTop: '10px' }}
                  onClick={() => { setPledged(null); setAmount(String(pledged)); }}
                >
                  Change amount
                </button>
              </div>
            )}

            {hasPledged && pledged === 0 && (
              <div style={S.card}>
                <p style={{ fontSize: '14px', color: '#555', margin: 0 }}>
                  You've passed on this one — totally fine. Tap below to change your mind.
                </p>
                <button
                  style={{ ...S.btn, marginTop: '10px' }}
                  onClick={() => { setPledged(null); setAmount(showSuggestion ? String(suggestion) : ''); }}
                >
                  Actually, I'll chip in
                </button>
              </div>
            )}

            {declined && (
              <div style={S.card}>
                <p style={{ fontSize: '14px', color: '#555', margin: 0 }}>
                  You've declined this invite. Tap below if that changes.
                </p>
                <button
                  style={{ ...S.btn, marginTop: '10px' }}
                  disabled={submitting || !guestId}
                  onClick={() => { setStatus(null); }}
                >
                  Actually, I'd like to chip in
                </button>
              </div>
            )}

            {/* Interac instructions — only after pledging > 0 */}
            {hasPledged && pledged > 0 && (
              <div style={S.card}>
                <div style={{ fontWeight: 500, marginBottom: '8px' }}>💸 Send your ${pledged}</div>
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

            {/* What it's for — informational only */}
            {(event.expenses || []).some(e => Number(e.amount) > 0 || e.name) && (
              <div style={S.card}>
                <div style={{ fontWeight: 500, marginBottom: '8px' }}>What we're hoping to cover</div>
                {(event.expenses || []).map(e => (
                  <div key={e.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: '14px' }}>
                    <span style={{ color: '#777' }}>{e.name}</span>
                    {Number(e.amount) > 0 && <span style={{ color: '#777' }}>~${(Number(e.amount) || 0).toLocaleString()}</span>}
                  </div>
                ))}
                <p style={{ fontSize: '11px', color: '#999', margin: '8px 0 0' }}>
                  Rough plan — we'll do what the pool allows.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ============================================================
  // COST SPLIT VIEW
  // ============================================================
  return (
    <div style={S.page}>
      <div style={S.frame}>
        <div style={{ padding: '14px 20px' }}>
          <div style={{ marginBottom: '12px' }}>
            <div style={{ fontSize: '11px', color: '#999', letterSpacing: '0.5px' }}>YOU'RE INVITED</div>
            <h2 style={{ fontSize: '20px', margin: '2px 0 0', fontWeight: 500 }}>{event.eventName || 'Group event'}</h2>
            {initialGuest && <div style={{ fontSize: '13px', color: '#666', marginTop: '4px' }}>Hi {initialGuest.name} 👋</div>}
            {!initialGuest && initialGuestIdProp && <div style={{ fontSize: '12px', color: '#a55', marginTop: '4px' }}>Your guest link may be outdated — please contact the organizer.</div>}
            {event.organizerName && <div style={{ fontSize: '12px', color: '#999', marginTop: '2px' }}>From {event.organizerName}</div>}
          </div>

          {!declined && (
            <div style={S.card}>
              <div style={S.label}>Your share</div>
              <div style={{ fontSize: '32px', fontWeight: 500 }}>${shareIfAllJoin}</div>
              <div style={{ fontSize: '12px', color: '#777', marginTop: '4px' }}>
                If all {invitedCount} {invitedCount === 1 ? 'guest joins' : 'guests join'}.
              </div>
              {shareCurrent !== shareIfAllJoin && (
                <div style={{ fontSize: '12px', color: '#a55', marginTop: '4px' }}>
                  Could rise to ~${shareCurrent} if some can't make it.
                </div>
              )}
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
