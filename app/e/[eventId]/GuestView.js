'use client';

import { useEffect, useRef, useState } from 'react';
import { computePersonShare, participantsForExpense } from '../../../lib/shares';

const BRAND = '#0F6E56';
const CREAM = '#F5F3EE';
const TEAL_LIGHT = '#E1F5EE';
const CARD_BORDER = '#e8e4d8';
const FONT = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

const S = {
  page: { minHeight: '100vh', background: CREAM, padding: '12px', boxSizing: 'border-box', fontFamily: FONT },
  shell: { maxWidth: '420px', margin: '0 auto' },
  card: {
    background: 'white',
    border: `0.5px solid ${CARD_BORDER}`,
    borderRadius: '18px',
    padding: '18px',
    marginBottom: '12px',
  },
  label: { fontSize: '12px', color: '#888', marginBottom: '6px', display: 'block', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 500 },
  input: { width: '100%', padding: '14px 18px', borderRadius: '999px', border: '0.5px solid #ddd', fontSize: '15px', fontFamily: FONT, boxSizing: 'border-box', outline: 'none', background: 'white' },
  shareAmount: { fontSize: '42px', fontWeight: 600, color: BRAND, letterSpacing: '-0.02em', lineHeight: 1.1, margin: '4px 0 12px' },
  deadlinePill: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '13px',
    fontWeight: 500,
    color: BRAND,
    background: TEAL_LIGHT,
    padding: '6px 12px',
    borderRadius: '999px',
  },
  btnIn: {
    width: '100%',
    padding: '16px',
    borderRadius: '999px',
    border: 'none',
    background: BRAND,
    color: 'white',
    cursor: 'pointer',
    fontSize: '16px',
    fontWeight: 600,
    fontFamily: FONT,
    marginBottom: '10px',
  },
  btnInActive: {
    background: BRAND,
    color: 'white',
    boxShadow: '0 4px 14px rgba(15,110,86,0.3)',
  },
  btnOut: {
    width: '100%',
    padding: '16px',
    borderRadius: '999px',
    border: `1.5px solid ${CARD_BORDER}`,
    background: 'white',
    color: '#666',
    cursor: 'pointer',
    fontSize: '16px',
    fontWeight: 500,
    fontFamily: FONT,
    marginBottom: '16px',
  },
  btnOutActive: {
    borderColor: '#ccc',
    color: '#888',
    background: '#f5f3ee',
  },
  btnUpload: {
    width: '100%',
    padding: '14px',
    borderRadius: '999px',
    border: `1.5px dashed ${BRAND}`,
    background: TEAL_LIGHT,
    color: BRAND,
    cursor: 'pointer',
    fontSize: '15px',
    fontWeight: 500,
    fontFamily: FONT,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    marginBottom: '12px',
  },
  btn: { width: '100%', padding: '14px', borderRadius: '999px', border: `0.5px solid ${CARD_BORDER}`, background: 'white', cursor: 'pointer', fontSize: '15px', fontWeight: 500, fontFamily: FONT },
  btnPrimary: { background: BRAND, color: 'white', border: 'none' },
  copyField: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    background: TEAL_LIGHT,
    border: `1.5px solid ${BRAND}`,
    borderRadius: '14px',
    padding: '12px 14px',
    marginTop: '8px',
  },
};

function daysRemaining(deadlineDate) {
  if (!deadlineDate || isNaN(deadlineDate.getTime())) return null;
  const diff = deadlineDate.getTime() - Date.now();
  if (diff <= 0) return 0;
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function deadlineCountdownLabel(deadlineDate, deadlinePassed) {
  if (!deadlineDate || isNaN(deadlineDate.getTime())) return null;
  if (deadlinePassed) return 'RSVP deadline has passed';
  const days = daysRemaining(deadlineDate);
  if (days === 0) return 'Last day to respond';
  if (days === 1) return '1 day remaining';
  return `${days} days remaining`;
}

// Per-event localStorage key for broadcast self-signups
const lsBroadcastKey = (eventId) => `helmr.broadcast.${eventId}`;

export default function GuestView({ event, guestId: initialGuestIdProp, preview = false }) {
  const mode = event.mode === 'open_pool' ? 'open_pool' : 'cost_split';
  const inviteMode = event.inviteMode === 'broadcast' ? 'broadcast' : 'personal';

  // Resolve which guest record (if any) this viewer is acting as.
  // Priority: URL ?g= param > localStorage (for broadcast revisits) > null.
  const [resolvedGuestId, setResolvedGuestId] = useState(initialGuestIdProp || null);

  useEffect(() => {
    if (initialGuestIdProp) return;
    if (inviteMode !== 'broadcast') return;
    if (preview) return; // never touch storage in preview mode
    if (typeof window === 'undefined') return;
    try {
      const stored = window.localStorage.getItem(lsBroadcastKey(event.id));
      if (stored) setResolvedGuestId(stored);
    } catch {}
  }, [event.id, initialGuestIdProp, inviteMode, preview]);

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

  // Custom field on join (optional; configured by organizer)
  const customFieldLabel = (event.customFieldLabel || '').trim();
  const hasCustomField = customFieldLabel.length > 0;
  const [customFieldValue, setCustomFieldValue] = useState(initialGuest?.customFieldValue || '');

  // Response deadline — lenient mode:
  //   - Already-confirmed / paid / declined / pledged guests retain full access.
  //   - New joiners (no record yet, or status='invited' with no contribution) are blocked.
  const deadlineDate = event.responseDeadline ? new Date(event.responseDeadline) : null;
  const deadlinePassed = !!(deadlineDate && !isNaN(deadlineDate.getTime()) && deadlineDate.getTime() < Date.now());
  const formatDeadline = (d) => {
    if (!d || isNaN(d.getTime())) return '';
    return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  };
  // A viewer counts as "already in" if they have a record AND have done something
  // (responded, contributed, or been added by organizer with a status beyond 'invited').
  const isAlreadyIn = !!(initialGuest && (
    (initialGuest.status && initialGuest.status !== 'invited') ||
    Number(initialGuest.contributedAmount) > 0
  ));
  const lockedOut = deadlinePassed && !isAlreadyIn && !preview;

  // Payment screenshot upload state
  const [screenshotUploadedAt, setScreenshotUploadedAt] = useState(initialGuest?.paymentScreenshotUploadedAt || null);
  const [uploadingScreenshot, setUploadingScreenshot] = useState(false);
  const [screenshotCacheBust, setScreenshotCacheBust] = useState(0);
  const screenshotInputRef = useRef(null);
  const [emailCopied, setEmailCopied] = useState(false);

  // Planner tip — voluntary add-on, only if organizer enabled tipping.
  const tipsEnabled = !!event.tipsEnabled;
  const [guestTip, setGuestTip] = useState(Number(initialGuest?.tipAmount) || 0);
  const [savingTip, setSavingTip] = useState(false);
  const sendTip = async (amount) => {
    if (preview) {
      setGuestTip(amount);
      return;
    }
    if (!guestId) return;
    try {
      setSavingTip(true);
      const res = await fetch(`/api/events/${event.id}/tip`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ guestId, amount }),
      });
      if (res.ok) {
        const data = await res.json();
        setGuestTip(Number(data.tipAmount) || 0);
      }
    } catch (e) {
      console.error('tip save failed', e);
    } finally {
      setSavingTip(false);
    }
  };

  const uploadScreenshot = async (file) => {
    if (preview) {
      alert("Preview mode — guests will be able to do this for real.");
      return;
    }
    if (!guestId) {
      alert('You need to be in the event before uploading a screenshot.');
      return;
    }
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('Please choose an image file.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert('That image is over 5 MB. Please choose a smaller one or screenshot at lower resolution.');
      return;
    }
    setUploadingScreenshot(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('guestId', guestId);
      const res = await fetch(`/api/events/${event.id}/screenshot`, {
        method: 'POST',
        body: fd,
      });
      if (res.status === 410) {
        alert("This event has closed.");
        return;
      }
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Upload failed');
      }
      setScreenshotUploadedAt(Date.now());
      setScreenshotCacheBust(c => c + 1);
      setStatus('paid');
    } catch (err) {
      alert(err.message || "Upload failed. Please try again.");
    } finally {
      setUploadingScreenshot(false);
    }
  };

  // Fire view ping. With a guestId → personal mark. Without → broadcast counter.
  // Skip entirely in preview mode so the organizer's preview doesn't inflate counts.
  useEffect(() => {
    if (preview) return;
    fetch(`/api/events/${event.id}/view`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(guestId ? { guestId } : {}),
    }).catch(() => {});
    // Only fire once per page load
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event.id]);

  const sendRsvp = async (newStatus) => {
    if (preview) {
      alert("Preview mode — guests will be able to do this for real.");
      return;
    }
    if (!guestId) {
      alert('To RSVP, please use the personal link your organizer sent you.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/events/${event.id}/rsvp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          guestId,
          status: newStatus,
          customFieldValue: hasCustomField ? customFieldValue.trim() : undefined,
        }),
      });
      if (res.status === 410) {
        alert("This event has closed and isn't accepting new RSVPs.");
        return;
      }
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
    if (preview) {
      alert("Preview mode — guests will be able to do this for real.");
      return;
    }
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
          body: JSON.stringify({
            name,
            amount: amt,
            customFieldValue: hasCustomField ? customFieldValue.trim() : undefined,
          }),
        });
        if (res.status === 410) {
          alert("This pool has closed and isn't accepting new contributions.");
          return;
        }
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
        body: JSON.stringify({
          guestId,
          amount: amt,
          customFieldValue: hasCustomField ? customFieldValue.trim() : undefined,
        }),
      });
      if (res.status === 410) {
        alert("This pool has closed and isn't accepting new contributions.");
        return;
      }
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

  // Per-expense share math: each guest's share is the sum of their share of each
  // expense they're on. An expense without participantIds defaults to "everyone".
  //
  // We compute the guest's share two ways:
  //   - "if all join" — pretends every invited guest is confirmed (provisional/upper bound on each split's denominator)
  //   - "current" — only confirmed guests count toward the denominator
  // The labels stay consistent with the existing UX from the broadcast-mode build.
  const organizerRow = (event.people || []).find(p => p.role === 'organizer');
  const organizerInSplit = !!(organizerRow && organizerRow.includedInSplit);

  // For "if all join": treat every guest as confirmed.
  const allJoinPeople = peopleWithMyStatus.map(p =>
    p.role === 'organizer' ? p : { ...p, status: 'confirmed' }
  );

  let shareIfAllJoin = 0;
  let shareCurrent = 0;
  if (guestId) {
    const { share: ifAll } = computePersonShare(guestId, event.expenses || [], allJoinPeople, {
      confirmedOnly: true, // everyone is "confirmed" in this simulation
      includeOrganizer: organizerInSplit,
    });
    const { share: now } = computePersonShare(guestId, event.expenses || [], peopleWithMyStatus, {
      confirmedOnly: true,
      includeOrganizer: organizerInSplit,
    });
    shareIfAllJoin = Math.round(ifAll);
    shareCurrent = Math.round(now);
  } else {
    // Fallback (no guestId — preview or pre-RSVP broadcast): flat average
    const denomConfirmed = confirmedGuests > 0 ? confirmedGuests : 1;
    const denomInvited = invitedCount > 0 ? invitedCount : 1;
    shareIfAllJoin = Math.round(total / denomInvited);
    shareCurrent = Math.round(total / denomConfirmed);
  }

  // For "What we're covering" breakdown: which expenses is this guest on?
  const guestExpenseRows = (event.expenses || []).map(e => {
    const participants = participantsForExpense(e, peopleWithMyStatus, {
      confirmedOnly: false,
      includeOrganizer: organizerInSplit,
    });
    const onThis = guestId ? participants.some(p => p.id === guestId) : true;
    return { ...e, _onThis: onThis, _splitCount: participants.length };
  });

  const organizerEmail = event.organizerEmail || null;
  const declined = status === 'declined';
  const confirmedSelf = status === 'confirmed' || status === 'paid';

  const copyOrganizerEmail = async () => {
    if (!organizerEmail) return;
    try {
      await navigator.clipboard.writeText(organizerEmail);
      setEmailCopied(true);
      setTimeout(() => setEmailCopied(false), 2000);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = organizerEmail;
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand('copy');
        setEmailCopied(true);
        setTimeout(() => setEmailCopied(false), 2000);
      } catch {}
      document.body.removeChild(ta);
    }
  };

  const renderCopyableEmail = (amountLabel) => (
    <div style={S.card}>
      <div style={{ fontWeight: 600, fontSize: '15px', marginBottom: '4px' }}>Interac e-Transfer</div>
      {amountLabel && (
        <p style={{ fontSize: '13px', color: '#666', margin: '0 0 4px' }}>
          Send <strong style={{ color: BRAND }}>{amountLabel}</strong> via Interac e-Transfer
        </p>
      )}
      {organizerEmail ? (
        <>
          <p style={{ fontSize: '12px', color: '#888', margin: '0 0 2px' }}>Transfer to</p>
          <div style={S.copyField}>
            <span style={{ flex: 1, color: BRAND, fontWeight: 600, fontSize: '14px', wordBreak: 'break-all' }}>
              {organizerEmail}
            </span>
            <button
              type="button"
              onClick={copyOrganizerEmail}
              aria-label="Copy email"
              style={{
                background: 'white',
                border: 'none',
                borderRadius: '10px',
                padding: '8px 10px',
                cursor: 'pointer',
                color: BRAND,
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <i className={`ti ${emailCopied ? 'ti-check' : 'ti-copy'}`} style={{ fontSize: '18px' }} />
            </button>
          </div>
          {emailCopied && (
            <p style={{ fontSize: '12px', color: BRAND, margin: '6px 0 0', fontWeight: 500 }}>Copied!</p>
          )}
          <p style={{ fontSize: '11px', color: '#999', margin: '8px 0 0' }}>
            Include event code: {event.id.toUpperCase()}
          </p>
        </>
      ) : (
        <p style={{ fontSize: '13px', color: '#E8645A', margin: 0 }}>
          The organizer hasn&apos;t added their Interac email yet. Contact them directly.
        </p>
      )}
    </div>
  );

  const renderScreenshotUpload = () => {
    if (!guestId) return null;
    const hasScreenshot = !!screenshotUploadedAt;
    const previewUrl = hasScreenshot
      ? `/api/events/${event.id}/screenshot?guestId=${guestId}&v=${screenshotCacheBust}`
      : null;
    return (
      <>
        {previewUrl && (
          <div style={{ ...S.card, padding: '12px' }}>
            <a href={previewUrl} target="_blank" rel="noopener noreferrer" style={{ display: 'block' }}>
              <img
                src={previewUrl}
                alt="Your e-Transfer screenshot"
                style={{ width: '100%', borderRadius: '12px', border: `0.5px solid ${CARD_BORDER}`, display: 'block' }}
              />
            </a>
          </div>
        )}
        <input
          ref={screenshotInputRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={(e) => {
            const f = e.target.files && e.target.files[0];
            if (f) uploadScreenshot(f);
            e.target.value = '';
          }}
        />
        <button
          type="button"
          style={{ ...S.btnUpload, opacity: uploadingScreenshot ? 0.6 : 1 }}
          disabled={uploadingScreenshot}
          onClick={() => screenshotInputRef.current && screenshotInputRef.current.click()}
        >
          <i className="ti ti-camera" style={{ fontSize: '18px' }} />
          {uploadingScreenshot
            ? 'Uploading…'
            : hasScreenshot ? 'Replace payment screenshot' : 'Upload payment screenshot'}
        </button>
      </>
    );
  };

  // Tip the planner card — only when organizer has enabled tipping.
  // Soft, non-pressuring framing. Default is $0. Chips for quick selection + custom field.
  const renderTipCard = () => {
    if (!tipsEnabled) return null;
    const presets = [0, 5, 10, 20];
    const isPreset = presets.includes(guestTip);
    const planner = event.organizerName || 'the planner';
    return (
      <div style={S.card}>
        <div style={{ fontWeight: 600, fontSize: '15px', marginBottom: '4px' }}>Tip {planner}?</div>
        <p style={{ fontSize: '13px', color: '#888', margin: '0 0 12px' }}>
          Totally optional — stays $0 unless you choose to add.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginBottom: '10px' }}>
          {presets.map(p => (
            <button
              key={p}
              type="button"
              disabled={savingTip}
              onClick={() => sendTip(p)}
              style={{
                padding: '10px 4px',
                borderRadius: '999px',
                border: guestTip === p ? `2px solid ${BRAND}` : `0.5px solid ${CARD_BORDER}`,
                background: guestTip === p ? TEAL_LIGHT : 'white',
                color: guestTip === p ? BRAND : '#333',
                fontSize: '14px',
                fontWeight: 500,
                cursor: savingTip ? 'wait' : 'pointer',
                fontFamily: FONT,
              }}
            >
              {p === 0 ? 'No tip' : `$${p}`}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '13px', color: '#666' }}>Custom $</span>
          <input
            type="number"
            min="0"
            inputMode="numeric"
            disabled={savingTip}
            value={isPreset ? '' : (guestTip || '')}
            placeholder="0"
            onChange={e => {
              const v = Math.max(0, Number(e.target.value) || 0);
              setGuestTip(v);
            }}
            onBlur={e => {
              const v = Math.max(0, Number(e.target.value) || 0);
              sendTip(v);
            }}
            style={{ ...S.input, padding: '10px 14px', fontSize: '14px', flex: 1 }}
          />
        </div>
      </div>
    );
  };

  // ============================================================
  // CLOSED VIEW (deadline passed, viewer not already in)
  // ============================================================
  if (lockedOut) {
    return (
      <div style={S.page}>
        <div style={S.shell}>
          <div style={{ ...S.card, padding: '40px 24px', textAlign: 'center' }}>
            <div style={{ fontSize: '40px', marginBottom: '8px' }}>🔒</div>
            <h2 style={{ fontSize: '20px', margin: '0 0 8px', fontWeight: 600 }}>This event has closed</h2>
            <p style={{ fontSize: '14px', color: '#666', margin: '0 0 12px' }}>
              {event.eventName || 'The event'} stopped accepting new {mode === 'open_pool' ? 'contributions' : 'RSVPs'} on {formatDeadline(deadlineDate)}.
            </p>
            {event.organizerName && (
              <p style={{ fontSize: '13px', color: '#999', margin: 0 }}>
                Reach out to {event.organizerName} directly if you&apos;d still like to chip in.
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ============================================================
  // OPEN POOL VIEW (covers both personal-link and broadcast)
  // ============================================================
  if (mode === 'open_pool') {
    const goal = Number(event.goal) || 0;
    // Pool total includes the organizer's own contribution if they've added one.
    const pooledTotal = (event.people || [])
      .reduce((s, p) => s + (Number(p.contributedAmount) || 0), 0);
    const contributors = (event.people || [])
      .filter(p => Number(p.contributedAmount) > 0).length;
    const hasPledged = pledged != null;
    const unitLabel = event.suggestionUnit || 'per person';
    const showSuggestion = suggestion > 0;
    const isBroadcastFirstTime = inviteMode === 'broadcast' && !guestId;

    const poolPct = goal > 0 ? Math.min(100, (pooledTotal / goal) * 100) : 0;
    const countdownLabel = deadlineCountdownLabel(deadlineDate, deadlinePassed);
    const paymentTotal = (hasPledged ? pledged : 0) + guestTip;

    return (
      <div style={S.page}>
        <div style={S.shell}>
          {preview && (
            <div style={{ background: '#fef6dd', color: '#7a5d00', padding: '10px 16px', fontSize: '13px', fontWeight: 500, textAlign: 'center', borderRadius: '14px', marginBottom: '12px' }}>
              👁 Preview mode — actions are disabled
            </div>
          )}

          {/* Event header */}
          <div style={S.card}>
            <h1 style={{ fontSize: '22px', fontWeight: 700, margin: '0 0 6px', color: '#1a1a1a', lineHeight: 1.25 }}>
              {event.eventName || 'Group pool'}
            </h1>
            {event.organizerName && (
              <p style={{ fontSize: '14px', color: '#666', margin: 0 }}>
                Organized by {event.organizerName}
              </p>
            )}
            {initialGuest && !isBroadcastFirstTime && (
              <p style={{ fontSize: '13px', color: '#888', margin: '8px 0 0' }}>Hi {initialGuest.name} 👋</p>
            )}
            {!initialGuest && initialGuestIdProp && (
              <p style={{ fontSize: '12px', color: '#E8645A', margin: '8px 0 0' }}>
                Your guest link may be outdated — please contact the organizer.
              </p>
            )}
          </div>

          {/* Pool status */}
          <div style={S.card}>
            <div style={S.label}>Pooled so far</div>
            <div style={S.shareAmount}>${pooledTotal.toLocaleString()}</div>
            <p style={{ fontSize: '13px', color: '#888', margin: '0 0 12px' }}>
              {contributors} {contributors === 1 ? 'person has' : 'people have'} chipped in
            </p>
            {countdownLabel && (
              <div style={{ ...S.deadlinePill, marginBottom: goal > 0 ? '12px' : 0 }}>
                <i className="ti ti-clock" style={{ fontSize: '14px' }} />
                {countdownLabel}
              </div>
            )}
            {goal > 0 && (
              <>
                <div style={{ height: '6px', background: TEAL_LIGHT, borderRadius: '999px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${poolPct}%`, background: BRAND, borderRadius: '999px' }} />
                </div>
                <p style={{ fontSize: '12px', color: '#888', margin: '8px 0 0' }}>
                  Goal: ${goal.toLocaleString()} · {Math.round(poolPct)}% funded
                </p>
              </>
            )}
          </div>

          {/* Pledge box */}
          {!hasPledged && !declined && (
            <div style={S.card}>
              <div style={{ fontWeight: 600, fontSize: '15px', marginBottom: '6px' }}>How much would you like to chip in?</div>
              {showSuggestion ? (
                <p style={{ fontSize: '13px', color: '#888', margin: '0 0 12px' }}>
                  Suggested: <strong style={{ color: BRAND }}>${suggestion}</strong> {unitLabel}. No pressure — give what feels right.
                </p>
              ) : (
                <p style={{ fontSize: '13px', color: '#888', margin: '0 0 12px' }}>
                  Any amount helps. No pressure — give what feels right.
                </p>
              )}

              {isBroadcastFirstTime && (
                <>
                  <label style={S.label}>Your name</label>
                  <input
                    type="text"
                    style={{ ...S.input, marginBottom: '12px' }}
                    value={selfName}
                    onChange={e => setSelfName(e.target.value)}
                    placeholder="So the organizer knows who chipped in"
                  />
                </>
              )}

              {hasCustomField && (
                <>
                  <label style={S.label}>{customFieldLabel}</label>
                  <input
                    type="text"
                    style={{ ...S.input, marginBottom: '12px' }}
                    value={customFieldValue}
                    onChange={e => setCustomFieldValue(e.target.value)}
                    maxLength={80}
                  />
                </>
              )}

              <label style={S.label}>Amount</label>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '16px' }}>
                <span style={{ fontSize: '20px', color: BRAND, fontWeight: 600 }}>$</span>
                <input
                  type="number"
                  min="0"
                  style={{ ...S.input, fontSize: '18px', fontWeight: 600, color: BRAND }}
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  placeholder="0"
                />
              </div>
            </div>
          )}

          {!hasPledged && !declined && (
            <>
              <button
                type="button"
                style={{ ...S.btnIn, opacity: submitting ? 0.6 : 1 }}
                disabled={submitting}
                onClick={sendContribution}
              >
                {submitting ? 'Saving…' : 'Confirm my contribution'}
              </button>
              {guestId && (
                <button
                  type="button"
                  style={{ ...S.btnOut, opacity: submitting ? 0.6 : 1 }}
                  disabled={submitting}
                  onClick={() => sendRsvp('declined')}
                >
                  Can&apos;t make it
                </button>
              )}
            </>
          )}

          {hasPledged && pledged > 0 && (
            <div style={S.card}>
              <div style={S.label}>Your contribution</div>
              <div style={S.shareAmount}>${pledged.toLocaleString()}</div>
              <p style={{ fontSize: '13px', color: '#888', margin: '0 0 12px' }}>Thanks! Send your e-Transfer below.</p>
              {tipsEnabled && guestTip > 0 && (
                <div style={{ paddingTop: '14px', borderTop: `0.5px solid ${CARD_BORDER}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', color: '#666', marginBottom: '4px' }}>
                    <span>Contribution</span><span>${pledged.toLocaleString()}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', color: '#666', marginBottom: '8px' }}>
                    <span>Tip</span><span>${guestTip.toLocaleString()}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '16px', fontWeight: 600, color: BRAND }}>
                    <span>Total due</span><span>${paymentTotal.toLocaleString()}</span>
                  </div>
                </div>
              )}
              <button
                type="button"
                style={{ ...S.btnOut, marginTop: '14px', marginBottom: 0 }}
                onClick={() => { setPledged(null); setAmount(String(pledged)); }}
              >
                Change amount
              </button>
            </div>
          )}

          {hasPledged && pledged === 0 && (
            <div style={S.card}>
              <p style={{ fontSize: '14px', color: '#666', margin: 0 }}>
                You&apos;ve passed on this one — totally fine. Tap below to change your mind.
              </p>
              <button
                type="button"
                style={{ ...S.btnIn, marginTop: '14px', marginBottom: 0 }}
                onClick={() => { setPledged(null); setAmount(showSuggestion ? String(suggestion) : ''); }}
              >
                Actually, I&apos;ll chip in
              </button>
            </div>
          )}

          {declined && (
            <div style={S.card}>
              <p style={{ fontSize: '14px', color: '#666', margin: 0 }}>
                You&apos;ve declined this invite. Tap below if that changes.
              </p>
              <button
                type="button"
                style={{ ...S.btnIn, marginTop: '14px', marginBottom: 0 }}
                disabled={submitting || !guestId}
                onClick={() => { setStatus(null); }}
              >
                Actually, I&apos;d like to chip in
              </button>
            </div>
          )}

          {hasPledged && pledged > 0 && renderTipCard()}

          {hasPledged && pledged > 0 && renderCopyableEmail(`$${paymentTotal.toLocaleString()}`)}

          {hasPledged && pledged > 0 && renderScreenshotUpload()}

          {(event.expenses || []).some(e => Number(e.amount) > 0 || e.name) && (
            <div style={S.card}>
              <div style={{ fontWeight: 600, fontSize: '15px', marginBottom: '10px' }}>What we&apos;re hoping to cover</div>
              {(event.expenses || []).map(e => (
                <div key={e.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: '14px' }}>
                  <span style={{ color: '#666' }}>{e.name}</span>
                  {Number(e.amount) > 0 && (
                    <span style={{ color: '#1a1a1a', fontWeight: 500 }}>~${(Number(e.amount) || 0).toLocaleString()}</span>
                  )}
                </div>
              ))}
              <p style={{ fontSize: '12px', color: '#999', margin: '10px 0 0' }}>
                Rough plan — we&apos;ll do what the pool allows.
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ============================================================
  // COST SPLIT VIEW — guest payment screen
  // ============================================================
  const displayShare = deadlinePassed ? shareCurrent : shareIfAllJoin;
  const countdownLabel = deadlineCountdownLabel(deadlineDate, deadlinePassed);
  const canShowPayment = confirmedSelf && (!deadlineDate || deadlinePassed);
  const paymentTotal = shareCurrent + guestTip;

  return (
    <div style={S.page}>
      <div style={S.shell}>
        {preview && (
          <div style={{ background: '#fef6dd', color: '#7a5d00', padding: '10px 16px', fontSize: '13px', fontWeight: 500, textAlign: 'center', borderRadius: '14px', marginBottom: '12px' }}>
            👁 Preview mode — actions are disabled
          </div>
        )}

        {/* Event header */}
        <div style={S.card}>
          <h1 style={{ fontSize: '22px', fontWeight: 700, margin: '0 0 6px', color: '#1a1a1a', lineHeight: 1.25 }}>
            {event.eventName || 'Group event'}
          </h1>
          {event.organizerName && (
            <p style={{ fontSize: '14px', color: '#666', margin: 0 }}>
              Organized by {event.organizerName}
            </p>
          )}
          {initialGuest && (
            <p style={{ fontSize: '13px', color: '#888', margin: '8px 0 0' }}>Hi {initialGuest.name} 👋</p>
          )}
          {!initialGuest && initialGuestIdProp && (
            <p style={{ fontSize: '12px', color: '#E8645A', margin: '8px 0 0' }}>
              Your guest link may be outdated — please contact the organizer.
            </p>
          )}
        </div>

        {!declined && (
          <div style={S.card}>
            <div style={S.label}>Your share</div>
            <div style={S.shareAmount}>${displayShare.toLocaleString()}</div>

            {countdownLabel && (
              <div style={S.deadlinePill}>
                <i className="ti ti-clock" style={{ fontSize: '14px' }} />
                {countdownLabel}
              </div>
            )}

            {!deadlinePassed && deadlineDate && (
              <p style={{ fontSize: '12px', color: '#888', margin: '12px 0 0' }}>
                Final amount locks in after {formatDeadline(deadlineDate)}.
                {shareCurrent !== shareIfAllJoin && (
                  <> Could adjust to ~${shareCurrent.toLocaleString()} based on who joins.</>
                )}
              </p>
            )}
            {deadlinePassed && (
              <p style={{ fontSize: '12px', color: BRAND, margin: '12px 0 0', fontWeight: 500 }}>
                Final amount — RSVPs are closed.
              </p>
            )}

            {tipsEnabled && confirmedSelf && guestTip > 0 && (
              <div style={{ marginTop: '16px', paddingTop: '14px', borderTop: `0.5px solid ${CARD_BORDER}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', color: '#666', marginBottom: '4px' }}>
                  <span>Share</span><span>${displayShare.toLocaleString()}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', color: '#666', marginBottom: '8px' }}>
                  <span>Tip</span><span>${guestTip.toLocaleString()}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '16px', fontWeight: 600, color: BRAND }}>
                  <span>Total due</span><span>${paymentTotal.toLocaleString()}</span>
                </div>
              </div>
            )}
          </div>
        )}

        {hasCustomField && !declined && (
          <div style={S.card}>
            <label style={S.label}>{customFieldLabel}</label>
            <input
              type="text"
              style={S.input}
              value={customFieldValue}
              onChange={e => setCustomFieldValue(e.target.value)}
              maxLength={80}
            />
            <p style={{ fontSize: '11px', color: '#999', margin: '6px 0 0' }}>Saved when you RSVP.</p>
          </div>
        )}

        <button
          type="button"
          disabled={submitting || !guestId}
          onClick={() => sendRsvp('confirmed')}
          style={{
            ...S.btnIn,
            ...(confirmedSelf ? S.btnInActive : {}),
            opacity: submitting ? 0.6 : 1,
          }}
        >
          {confirmedSelf ? "You're in ✓" : "I'm in"}
        </button>
        <button
          type="button"
          disabled={submitting || !guestId}
          onClick={() => sendRsvp('declined')}
          style={{
            ...S.btnOut,
            ...(declined ? S.btnOutActive : {}),
            opacity: submitting ? 0.6 : 1,
          }}
        >
          {declined ? "Declined" : "Can't make it"}
        </button>

        {!guestId && (
          <p style={{ fontSize: '12px', color: '#999', textAlign: 'center', margin: '0 0 16px' }}>
            Open your personal invite link to RSVP.
          </p>
        )}

        {confirmedSelf && deadlineDate && !deadlinePassed && (
          <div style={{ ...S.card, background: TEAL_LIGHT, border: `0.5px solid ${BRAND}` }}>
            <div style={{ fontWeight: 600, fontSize: '14px', color: BRAND, marginBottom: '4px' }}>
              Hold off on sending money
            </div>
            <p style={{ fontSize: '13px', color: '#666', margin: 0 }}>
              You&apos;re confirmed. Payment details appear once RSVPs close on{' '}
              <strong>{formatDeadline(deadlineDate)}</strong>.
            </p>
          </div>
        )}

        {canShowPayment && renderCopyableEmail(`$${paymentTotal.toLocaleString()}`)}

        {canShowPayment && renderScreenshotUpload()}

        {confirmedSelf && renderTipCard()}

        {declined && (
          <p style={{ fontSize: '14px', color: '#888', textAlign: 'center', padding: '8px 0 16px' }}>
            You&apos;ve declined this invite. Tap &ldquo;I&apos;m in&rdquo; if that changes.
          </p>
        )}

        {!declined && guestExpenseRows.some(e => e._onThis) && (
          <div style={S.card}>
            <div style={{ fontWeight: 600, fontSize: '15px', marginBottom: '10px' }}>What it&apos;s for</div>
            {guestExpenseRows.map(e => (
              <div key={e.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: '14px' }}>
                <span style={{ color: e._onThis ? '#666' : '#bbb', textDecoration: e._onThis ? 'none' : 'line-through' }}>
                  {e.name}
                </span>
                <span style={{ color: e._onThis ? '#1a1a1a' : '#bbb', fontWeight: 500 }}>
                  ${(Number(e.amount) || 0).toLocaleString()}
                </span>
              </div>
            ))}
            <div style={{ height: '0.5px', background: CARD_BORDER, margin: '10px 0' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600, fontSize: '14px' }}>
              <span>Group total</span>
              <span>${total.toLocaleString()}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
