'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import UpgradeModal from '../../components/UpgradeModal';
import AppDialog, { createDialogHelpers } from '../../components/AppDialog';
import BottomNav from '../../components/BottomNav';
import { participantsForExpense, computePersonShare } from '../../lib/shares';
import { BRAND, DS, getEventColor, STATUS_STYLES, FONT } from '../../lib/design';

// ============ CONFIG ============
const FORMSPREE_ENDPOINT = 'https://formspree.io/f/mredzlyn';
const LS_KEY = 'helmr.events.v1';
const OWNER_ID = 'local-user';

const eventTypes = [
  // School / community / fundraising types first — these are what PAC organizers
  // and community groups look for. A school treasurer evaluating Helmr should see
  // relevant options immediately, not a screen of trips and bachelor parties.
  { id: 'fundraiser', icon: '💛', tablerIcon: 'ti-heart', label: 'Fundraiser', expenses: [], defaultMode: 'open_pool' },
  { id: 'potluck', icon: '🥗', tablerIcon: 'ti-tools-kitchen-2', label: 'Potluck / Class fund', expenses: [], defaultMode: 'open_pool' },
  { id: 'gift', icon: '🎁', tablerIcon: 'ti-gift', label: 'Group gift', expenses: ['Main gift', 'Card', 'Wrapping'], defaultMode: 'open_pool' },
  { id: 'team', icon: '🏅', tablerIcon: 'ti-trophy', label: 'Team / Club fees', expenses: ['Equipment', 'Tournament fees', 'Uniforms', 'Travel'], defaultMode: 'cost_split' },
  { id: 'grad', icon: '🎓', tablerIcon: 'ti-school', label: 'Graduation', expenses: ['Venue', 'Catering', 'Photographer', 'Decor'], defaultMode: 'cost_split' },
  // Social / personal types
  { id: 'trip', icon: '✈️', tablerIcon: 'ti-plane', label: 'Trip', expenses: ['Hotel', 'Flights', 'Excursions', 'Meals', 'Transport'], defaultMode: 'cost_split' },
  { id: 'dinner', icon: '🍽️', tablerIcon: 'ti-fork', label: 'Dinner', expenses: ['Restaurant', 'Drinks', 'Dessert', 'Tip'], defaultMode: 'cost_split' },
  { id: 'bday', icon: '🎂', tablerIcon: 'ti-cake', label: 'Birthday', expenses: ['Venue', 'Cake', 'Decor', 'Catering', 'Gift'], defaultMode: 'cost_split' },
  { id: 'concert', icon: '🎵', tablerIcon: 'ti-music', label: 'Concert', expenses: ['Tickets', 'Transport', 'Pre-drinks', 'Food'], defaultMode: 'cost_split' },
  { id: 'golf', icon: '🏌️', tablerIcon: 'ti-ball-golf', label: 'Golf day', expenses: ['Green fees', 'Cart', 'Food', 'Prizes'], defaultMode: 'cost_split' },
  { id: 'bach', icon: '🎉', tablerIcon: 'ti-confetti', label: 'Bachelor/ette', expenses: ['Accommodation', 'Activities', 'Dinner', 'Drinks', 'Decor'], defaultMode: 'cost_split' },
  { id: 'offsite', icon: '🏢', tablerIcon: 'ti-building', label: 'Offsite', expenses: ['Venue', 'Accommodation', 'Activities', 'Catering', 'AV'], defaultMode: 'cost_split' },
  { id: 'beach', icon: '🏖️', tablerIcon: 'ti-beach', label: 'Beach day', expenses: ['Rental', 'Food', 'Drinks', 'Equipment'], defaultMode: 'cost_split' },
  { id: 'other', icon: '➕', tablerIcon: 'ti-plus', label: 'Other', expenses: [], defaultMode: 'cost_split' },
];

function newGuestId() {
  return 'g' + Math.random().toString(36).slice(2, 9);
}

function loadSavedEvents() {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(LS_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch { return []; }
}

function saveEventToLocal(entry) {
  if (typeof window === 'undefined') return;
  try {
    const existing = loadSavedEvents().filter(e => e.id !== entry.id);
    const updated = [entry, ...existing].slice(0, 10);
    window.localStorage.setItem(LS_KEY, JSON.stringify(updated));
  } catch {}
}

function removeEventFromLocal(id) {
  if (typeof window === 'undefined') return;
  try {
    const updated = loadSavedEvents().filter(e => e.id !== id);
    window.localStorage.setItem(LS_KEY, JSON.stringify(updated));
  } catch {}
}

function normalizeSavedEvent(event) {
  if (!event || !event.id) return null;
  return {
    id: event.id,
    name: event.name || event.eventName || 'Untitled event',
    eventType: event.eventType || 'other',
    mode: event.mode === 'open_pool' ? 'open_pool' : 'cost_split',
    responseDeadline: event.responseDeadline || '',
    total: Number(event.total) || 0,
    pooled: Number(event.pooled) || 0,
    updatedAt: Number(event.updatedAt || event.createdAt) || Date.now(),
  };
}

// Convert a <input type="datetime-local"> value (no timezone, e.g. "2026-05-23T22:20")
// into an ISO string anchored to the user's local timezone, ready to store on the server.
// Returns '' if input is empty/invalid.
function datetimeLocalToIso(s) {
  if (!s) return '';
  const d = new Date(s);
  if (isNaN(d.getTime())) return '';
  return d.toISOString();
}

// Convert a stored ISO string back into the format the datetime-local input expects
// (YYYY-MM-DDTHH:MM in local time). Returns '' if missing/invalid.
function isoToDatetimeLocal(s) {
  if (!s) return '';
  const d = new Date(s);
  if (isNaN(d.getTime())) return '';
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function FeedbackModal({ open, onClose, currentScreen, onAlert }) {
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
      if (onAlert) await onAlert('Could not send feedback — please try again.');
    }
    setSubmitting(false);
  };

  if (submitted) {
    return (
      <div style={DS.modalOverlay} onClick={onClose}>
        <div style={DS.modal} onClick={e => e.stopPropagation()}>
          <h3 style={{ margin: '0 0 8px' }}>Thanks 🙏</h3>
          <p style={{ margin: '0 0 16px', color: '#666', fontSize: '14px' }}>This helps a lot.</p>
          <button style={{ ...DS.btn, ...DS.btnPrimary }} onClick={() => { setSubmitted(false); onClose(); }}>Close</button>
        </div>
      </div>
    );
  }

  return (
    <div style={DS.modalOverlay} onClick={onClose}>
      <div style={DS.modal} onClick={e => e.stopPropagation()}>
        <h3 style={{ margin: '0 0 4px' }}>Quick feedback</h3>
        <p style={{ margin: '0 0 16px', color: '#666', fontSize: '13px' }}>Takes 30 seconds. Helps me figure out if this is worth building.</p>

        <label style={DS.label}>Would you use Helmr for your next group event?</label>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
          {['Yes', 'Maybe', 'No'].map(v => (
            <button
              key={v}
              onClick={() => setVerdict(v)}
              style={{ flex: 1, padding: '10px', borderRadius: '10px', border: verdict === v ? `2px solid ${BRAND}` : '0.5px solid #ddd', background: verdict === v ? BRAND : 'white', color: verdict === v ? 'white' : '#1a1a1a', fontWeight: 500, cursor: 'pointer', fontFamily: FONT }}
            >{v}</button>
          ))}
        </div>

        <label style={DS.label}>What's missing, confusing, or great?</label>
        <textarea
          value={comment}
          onChange={e => setComment(e.target.value)}
          style={{ ...DS.input, minHeight: '80px', resize: 'vertical', marginBottom: '14px' }}
          placeholder="Anything goes…"
        />

        <label style={DS.label}>Name (optional)</label>
        <input style={{ ...DS.input, marginBottom: '16px' }} value={name} onChange={e => setName(e.target.value)} placeholder="So I know who said this" />

        <div style={{ display: 'flex', gap: '8px' }}>
          <button style={DS.btn} onClick={onClose}>Cancel</button>
          <button
            style={{ ...DS.btn, ...DS.btnPrimary, opacity: (verdict || comment) ? 1 : 0.5 }}
            disabled={!verdict && !comment || submitting}
            onClick={submit}
          >{submitting ? 'Sending…' : 'Send feedback'}</button>
        </div>
      </div>
    </div>
  );
}

function ShareModal({ open, onClose, event }) {
  const [copiedId, setCopiedId] = useState(null);
  if (!open || !event) return null;

  const guests = (event.people || []).filter(p => p.role !== 'organizer');
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const eventBase = `${baseUrl}/e/${event.id}`;
  const inviteMode = event.inviteMode || 'personal';

  const copy = async (text, id) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1500);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); setCopiedId(id); setTimeout(() => setCopiedId(null), 1500); } catch {}
      document.body.removeChild(ta);
    }
  };

  // ============================================================
  // BROADCAST MODE — one shared link
  // ============================================================
  if (inviteMode === 'broadcast') {
    const verb = event.mode === 'open_pool' ? 'chip in' : 'join';
    const ename = event.eventName || 'our event';
    const msg = `You're invited to ${verb} for ${ename}. ${eventBase}`;
    const waUrl = `https://wa.me/?text=${encodeURIComponent(msg)}`;
    const smsUrl = `sms:?&body=${encodeURIComponent(msg)}`;

    return (
      <div style={DS.modalOverlay} onClick={onClose}>
        <div style={{ ...DS.modal, maxHeight: '80vh', overflow: 'auto' }} onClick={e => e.stopPropagation()}>
          <h3 style={{ margin: '0 0 4px' }}>Share the link</h3>
          <p style={{ margin: '0 0 16px', color: '#666', fontSize: '13px' }}>
            Post this in your group chat. Anyone with the link can join.
          </p>

          <div style={{ marginBottom: '14px', padding: '12px', background: '#f5f3ee', borderRadius: '10px' }}>
            <div style={{ fontFamily: 'monospace', fontSize: '13px', wordBreak: 'break-all', marginBottom: '10px' }}>{eventBase}</div>
            <button style={{ ...DS.btn, ...DS.btnPrimary }} onClick={() => copy(eventBase, 'link')}>
              {copiedId === 'link' ? '✓ Copied' : 'Copy link'}
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
            <a href={waUrl} target="_blank" rel="noopener noreferrer" style={{ ...DS.btn, textDecoration: 'none', textAlign: 'center', color: '#1a1a1a', display: 'block' }}>
              💬 WhatsApp
            </a>
            <a href={smsUrl} style={{ ...DS.btn, textDecoration: 'none', textAlign: 'center', color: '#1a1a1a', display: 'block' }}>
              📱 SMS
            </a>
          </div>
          <button style={{ ...DS.btn, marginBottom: '8px' }} onClick={() => copy(msg, 'msg')}>
            {copiedId === 'msg' ? '✓ Copied' : 'Copy invite message'}
          </button>

          <button
            style={{ ...DS.btn, marginBottom: '8px' }}
            onClick={() => window.open(`${eventBase}?preview=1`, '_blank', 'noopener')}
          >
            👁 Preview as guest
          </button>

          <p style={{ fontSize: '11px', color: '#999', textAlign: 'center', margin: '12px 0' }}>
            You'll see contributors show up on your dashboard as they pledge.
          </p>

          <button style={DS.btn} onClick={onClose}>Done</button>
        </div>
      </div>
    );
  }

  // ============================================================
  // PERSONAL MODE — per-guest links
  // ============================================================
  return (
    <div style={DS.modalOverlay} onClick={onClose}>
      <div style={{ ...DS.modal, maxHeight: '80vh', overflow: 'auto' }} onClick={e => e.stopPropagation()}>
        <h3 style={{ margin: '0 0 4px' }}>Share invite links</h3>
        <p style={{ margin: '0 0 16px', color: '#666', fontSize: '13px' }}>Send each person their own link. You'll see when they view it and RSVP.</p>

        <div style={{ marginBottom: '14px', padding: '10px 12px', background: '#f5f3ee', borderRadius: '10px' }}>
          <div style={{ fontSize: '11px', color: '#777', marginBottom: '4px' }}>General link (anyone)</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ flex: 1, fontFamily: 'monospace', fontSize: '12px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{eventBase}</div>
            <button style={{ ...DS.btn, width: 'auto', padding: '6px 10px', fontSize: '12px' }} onClick={() => copy(eventBase, 'general')}>
              {copiedId === 'general' ? '✓' : 'Copy'}
            </button>
          </div>
        </div>

        {guests.length === 0 && (
          <p style={{ fontSize: '13px', color: '#999', textAlign: 'center', padding: '20px 0' }}>
            Add people on the Guests tab to get personal links.
          </p>
        )}

        {guests.map(g => {
          const link = `${eventBase}?g=${g.id}`;
          return (
            <div key={g.id} style={{ ...DS.card, marginBottom: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <div style={{ fontSize: '14px', fontWeight: 500 }}>{g.name}</div>
                <div style={{ display: 'flex', gap: '4px' }}>
                  {g.viewedAt && <span style={{ fontSize: '10px', color: '#085041', background: '#e1f5ee', padding: '2px 8px', borderRadius: '999px' }}>viewed</span>}
                  {g.status && g.status !== 'invited' && <span style={{ fontSize: '10px', color: STATUS_STYLES[g.status]?.fg, background: STATUS_STYLES[g.status]?.bg, padding: '2px 8px', borderRadius: '999px' }}>{g.status}</span>}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ flex: 1, fontFamily: 'monospace', fontSize: '11px', color: '#666', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{link}</div>
                <button style={{ ...DS.btn, width: 'auto', padding: '6px 10px', fontSize: '12px' }} onClick={() => copy(link, g.id)}>
                  {copiedId === g.id ? '✓' : 'Copy'}
                </button>
              </div>
            </div>
          );
        })}

        <button
          style={{ ...DS.btn, marginTop: '8px' }}
          onClick={() => window.open(`${eventBase}?preview=1`, '_blank', 'noopener')}
        >
          👁 Preview as guest (general link)
        </button>

        <button style={{ ...DS.btn, marginTop: '8px' }} onClick={onClose}>Done</button>
      </div>
    </div>
  );
}

export default function Helmr() {
  const [screen, setScreen] = useState('welcome');
  const [eventId, setEventId] = useState(null);
  const [eventType, setEventType] = useState(null);
  const [eventName, setEventName] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [eventLoc, setEventLoc] = useState('');
  const [dateTBD, setDateTBD] = useState(false);
  const [locTBD, setLocTBD] = useState(false);
  const [tab, setTab] = useState('home');
  const [dialog, setDialog] = useState(null);
  const dlg = useMemo(() => createDialogHelpers(setDialog), []);
  const [tipsEnabled, setTipsEnabled] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);

  const [organizerName, setOrganizerName] = useState('');
  const [organizerEmail, setOrganizerEmail] = useState('');
  const [mode, setMode] = useState('cost_split'); // 'cost_split' | 'open_pool'
  const [inviteMode, setInviteMode] = useState('personal'); // 'personal' | 'broadcast'
  const [viewCount, setViewCount] = useState(0);
  const [goal, setGoal] = useState(0);
  const [suggestionAmount, setSuggestionAmount] = useState(0);
  const [suggestionUnit, setSuggestionUnit] = useState('per person');
  const [customFieldLabel, setCustomFieldLabel] = useState(''); // e.g. "Child's name"; empty = feature off
  const [notificationPreference, setNotificationPreference] = useState('live'); // 'live' | 'digest'
  const [responseDeadline, setResponseDeadline] = useState(''); // datetime-local string or ''
  const [people, setPeople] = useState([
    { id: 'organizer', name: 'You', status: 'paid', role: 'organizer' },
  ]);
  const [expenses, setExpenses] = useState([]);
  // Local-only UI state: which expense rows have their participant picker open.
  // Not persisted — lives in component memory.
  const [expandedExpenseIds, setExpandedExpenseIds] = useState(new Set());
  const toggleExpenseExpanded = (id) => {
    setExpandedExpenseIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const [savedEvents, setSavedEvents] = useState([]);
  useEffect(() => {
    setSavedEvents(loadSavedEvents().map(normalizeSavedEvent).filter(Boolean));
  }, []);

  const total = expenses.reduce((s, e) => s + (Number(e.amount) || 0), 0);
  // Cost Split: organizer only counts as "confirmed" (and gets a share of the bill)
  // if they've explicitly opted themselves in via the "Include myself" toggle.
  // The flag lives on the organizer row as `includedInSplit`. Default = false
  // (host-pays-separately is the common case). Existing events default to false too.
  const organizerRow = people.find(p => p.role === 'organizer');
  const organizerIncludedInSplit = !!(organizerRow && organizerRow.includedInSplit);
  const confirmed = people.filter(p =>
    (p.role === 'organizer' ? organizerIncludedInSplit : (p.status === 'confirmed' || p.status === 'paid'))
  ).length;

  // Per-person shares: compute each person's expected total across all expenses
  // they're on (using per-expense participant lists when set, else "everyone").
  // Note: planner tips (event.tipsEnabled) are voluntary per-guest add-ons,
  // NOT folded into the split. Each guest's tip lives on their person row as
  // `tipAmount` and is sent to the organizer alongside their share.
  const shareOpts = { confirmedOnly: true, includeOrganizer: organizerIncludedInSplit };
  const peopleShares = people.map(p => {
    const includedInAnyExpense = p.role === 'organizer' ? organizerIncludedInSplit : true;
    if (!includedInAnyExpense) return { id: p.id, share: 0, breakdown: [] };
    const { share, breakdown } = computePersonShare(p.id, expenses, people, shareOpts);
    return { id: p.id, share, breakdown };
  });
  // Average + range for the Overview card. If all expenses default to everyone,
  // every person's share is identical and min === max === avg.
  const confirmedSharesArr = peopleShares
    .filter(s => {
      const p = people.find(x => x.id === s.id);
      if (!p) return false;
      return p.role === 'organizer' ? organizerIncludedInSplit : (p.status === 'confirmed' || p.status === 'paid');
    })
    .map(s => s.share);
  const perPerson = confirmedSharesArr.length > 0
    ? Math.round(confirmedSharesArr.reduce((a, b) => a + b, 0) / confirmedSharesArr.length)
    : 0;
  const minShare = confirmedSharesArr.length > 0 ? Math.round(Math.min(...confirmedSharesArr)) : 0;
  const maxShare = confirmedSharesArr.length > 0 ? Math.round(Math.max(...confirmedSharesArr)) : 0;
  const sharesVary = minShare !== maxShare;

  // Open Pool: pooled total = sum of ALL contributions, organizer included.
  // The organizer's contribution lives on their person row like everyone else's,
  // so the dashboard reflects what they personally chipped in alongside guests.
  const pooledTotal = people
    .reduce((s, p) => s + (Number(p.contributedAmount) || 0), 0);
  const contributorCount = people.filter(p => Number(p.contributedAmount) > 0).length;
  const inviteeCount = people.filter(p => p.role !== 'organizer').length;

  // Deadline helpers: parse the datetime-local string into a JS Date.
  // Empty string = no deadline. Passed = closed.
  const deadlineDate = responseDeadline ? new Date(responseDeadline) : null;
  const deadlinePassed = !!(deadlineDate && !isNaN(deadlineDate.getTime()) && deadlineDate.getTime() < Date.now());
  const formatDeadline = (d) => {
    if (!d || isNaN(d.getTime())) return '';
    return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  };

  const resumeEvent = async (id) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/events/${id}`);
      if (!res.ok) {
        if (res.status === 404) {
          await dlg.alert('That event has expired or was deleted.');
          removeEventFromLocal(id);
          setSavedEvents(prev => prev.filter(e => e.id !== id));
        } else {
          await dlg.alert("Couldn't load event.");
        }
        return;
      }
      const data = await res.json();
      setEventId(data.id);
      setEventType(data.eventType || null);
      setEventName(data.eventName || '');
      setEventDate(data.eventDate || '');
      setEventLoc(data.eventLoc || '');
      setDateTBD(!!data.dateTBD);
      setLocTBD(!!data.locTBD);
      setOrganizerName(data.organizerName || '');
      setOrganizerEmail(data.organizerEmail || '');
      const loadedMode = data.mode === 'open_pool' ? 'open_pool' : 'cost_split';
      setMode(loadedMode);
      // Cost Split only supports personal links. If a legacy event has broadcast, clamp it.
      const loadedInviteMode = data.inviteMode === 'broadcast' ? 'broadcast' : 'personal';
      setInviteMode(loadedMode === 'cost_split' ? 'personal' : loadedInviteMode);
      setViewCount(Number(data.viewCount) || 0);
      setGoal(Number(data.goal) || 0);
      setSuggestionAmount(Number(data.suggestionAmount) || 0);
      setSuggestionUnit(data.suggestionUnit || 'per person');
      setCustomFieldLabel(data.customFieldLabel || '');
      setNotificationPreference(data.notificationPreference === 'digest' ? 'digest' : 'live');
      setResponseDeadline(isoToDatetimeLocal(data.responseDeadline || ''));
      setPeople(data.people || [{ id: 'organizer', name: 'You', status: 'organizer', role: 'organizer' }]);
      setExpenses(data.expenses || []);
      setTipsEnabled(!!data.tipsEnabled);
      setScreen('dashboard');
    } catch {
      await dlg.alert("Couldn't load event.");
    } finally {
      setLoading(false);
    }
  };

  const saveTimerRef = useRef(null);
  const knownGuestIdsRef = useRef(new Set());
  // Track which guest IDs the client has ever seen, so deletes can be told
  // apart from "joined after last sync" on the server side.
  useEffect(() => {
    people.forEach(p => knownGuestIdsRef.current.add(p.id));
  }, [people]);

  useEffect(() => {
    if (!eventId || screen !== 'dashboard') return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      try {
        setSaving(true);
        await fetch(`/api/events/${eventId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            eventName, eventDate, eventLoc, dateTBD, locTBD,
            organizerName, organizerEmail,
            mode, inviteMode, goal: Number(goal) || 0,
            suggestionAmount: Number(suggestionAmount) || 0, suggestionUnit,
            customFieldLabel,
            notificationPreference,
            responseDeadline: datetimeLocalToIso(responseDeadline),
            people, expenses, tipsEnabled,
            knownGuestIds: Array.from(knownGuestIdsRef.current),
          }),
        });
        if (eventId) saveEventToLocal({ id: eventId, name: eventName || 'Untitled event', updatedAt: Date.now() });
      } catch (e) {
        console.error('Save failed', e);
      } finally {
        setSaving(false);
      }
    }, 800);
    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); };
  }, [eventId, screen, eventName, eventDate, eventLoc, dateTBD, locTBD, organizerName, organizerEmail, mode, inviteMode, goal, suggestionAmount, suggestionUnit, customFieldLabel, notificationPreference, responseDeadline, people, expenses, tipsEnabled]);

  // Poll for server-side guest changes (viewedAt, RSVP status, broadcast signups, view counter)
  useEffect(() => {
    if (!eventId || screen !== 'dashboard') return;
    let cancelled = false;
    const tick = async () => {
      try {
        if (saving) return; // never reconcile while a save is in flight
        const r = await fetch(`/api/events/${eventId}`);
        if (!r.ok || cancelled) return;
        const data = await r.json();
        if (!data || !Array.isArray(data.people)) return;

        // Pull view counter (used in broadcast mode)
        if (typeof data.viewCount === 'number') setViewCount(data.viewCount);

        setPeople(prev => {
          const serverById = new Map(data.people.map(p => [p.id, p]));
          const localIds = new Set(prev.map(p => p.id));

          // First: walk local list and merge server-managed fields
          const merged = prev.map(local => {
            const server = serverById.get(local.id);
            if (!server) return local;
            const m = { ...local };
            if (server.viewedAt && !local.viewedAt) m.viewedAt = server.viewedAt;
            if (server.rsvpAt && server.rsvpAt !== local.rsvpAt) {
              m.rsvpAt = server.rsvpAt;
              m.status = server.status;
            }
            if (server.contributedAmount !== undefined && server.contributedAmount !== local.contributedAmount) {
              m.contributedAmount = server.contributedAmount;
            }
            if (server.paymentScreenshotKey !== local.paymentScreenshotKey) {
              m.paymentScreenshotKey = server.paymentScreenshotKey;
              m.paymentScreenshotUploadedAt = server.paymentScreenshotUploadedAt;
              // Adopt the 'paid' status that the screenshot upload set on the server
              if (server.status === 'paid' && local.status !== 'paid') {
                m.status = 'paid';
              }
            }
            if (server.customFieldValue !== undefined && server.customFieldValue !== local.customFieldValue) {
              m.customFieldValue = server.customFieldValue;
            }
            return m;
          });

          // Then: append any server-only people (broadcast self-signups)
          // marked with source='broadcast'. Don't touch organizer-added rows.
          const additions = data.people.filter(p =>
            !localIds.has(p.id) && p.source === 'broadcast' && p.role !== 'organizer'
          );
          return additions.length ? [...merged, ...additions] : merged;
        });
      } catch {}
    };
    const interval = setInterval(tick, 5000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [eventId, screen, saving]);

  const pickType = (id) => {
    setEventType(id);
    const t = eventTypes.find(e => e.id === id);
    setExpenses((t.expenses || []).map((name, i) => ({ id: i + 1, name, amount: 0 })));
    setMode(t.defaultMode || 'cost_split');
    // Default invite mode follows the payment mode:
    // Open Pool → broadcast (one link, anyone chips in)
    // Cost Split → personal (per-guest links for tracking)
    setInviteMode(t.defaultMode === 'open_pool' ? 'broadcast' : 'personal');
    // Sensible defaults for the suggestion unit per type
    if (t.defaultMode === 'open_pool') {
      if (t.id === 'potluck') setSuggestionUnit('per kid');
      else setSuggestionUnit('per person');
    }
    setScreen('details');
  };

  // Reset all event state so "Plan something new" starts from a clean slate.
  // Without this, fields from the previously-open event leak into the new one.
  const checkEventLimit = () => {
    const count = loadSavedEvents().length;
    return { blocked: count >= 1 };
  };

  const startNewEvent = async () => {
    const { blocked } = checkEventLimit();
    if (blocked) {
      setUpgradeOpen(true);
      return;
    }

    setEventId(null);
    setEventType(null);
    setEventName('');
    setEventDate('');
    setEventLoc('');
    setDateTBD(false);
    setLocTBD(false);
    setOrganizerEmail('');
    // Keep organizerName — that's a "you" thing, not an event thing.
    setMode('cost_split');
    setInviteMode('personal');
    setGoal(0);
    setSuggestionAmount(0);
    setSuggestionUnit('per person');
    setCustomFieldLabel('');
    setNotificationPreference('live');
    setResponseDeadline('');
    setViewCount(0);
    setTipsEnabled(false);
    setExpenses([]);
    setPeople([{ id: 'organizer', name: organizerName || 'You', status: 'paid', role: 'organizer' }]);
    setTab('home');
    setScreen('chooseType');
  };

  const cycleStatus = (id) => {
    const cycle = ['invited', 'confirmed', 'paid', 'declined'];
    setPeople(people.map(p => {
      if (p.id !== id || p.role === 'organizer') return p;
      return { ...p, status: cycle[(cycle.indexOf(p.status) + 1) % cycle.length] };
    }));
  };

  const goToDashboard = async () => {
    // Cost Split requires a deadline: it gates when guests see their final share
    // and the e-transfer details. Without it, the whole "RSVP first, pay after"
    // flow breaks.
    if (mode === 'cost_split' && !responseDeadline) {
      await dlg.alert('Please set a response deadline. Guests will see their final share and how to pay only after this date.');
      return;
    }
    if (mode === 'cost_split' && responseDeadline) {
      const d = new Date(responseDeadline);
      if (!isNaN(d.getTime()) && d.getTime() < Date.now()) {
        await dlg.alert('The response deadline is in the past. Please pick a future date.');
        return;
      }
    }
    try {
      setSaving(true);
      const { blocked } = checkEventLimit();
      if (blocked) {
        setUpgradeOpen(true);
        return;
      }

      const res = await fetch(`${window.location.origin}/api/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ownerId: OWNER_ID,
          eventType, eventName, eventDate, eventLoc, dateTBD, locTBD,
          organizerName, organizerEmail,
          mode, inviteMode, goal: Number(goal) || 0,
          suggestionAmount: Number(suggestionAmount) || 0, suggestionUnit,
          customFieldLabel,
          notificationPreference,
          responseDeadline: datetimeLocalToIso(responseDeadline),
          people, expenses, tipsEnabled,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        if (data.error === 'Upgrade to Pro to create unlimited events') {
          setUpgradeOpen(true);
          return;
        }
        throw new Error('Failed');
      }
      const data = await res.json();
      setEventId(data.id);
      saveEventToLocal({
        id: data.id,
        name: eventName || 'Untitled event',
        eventType,
        mode,
        responseDeadline: datetimeLocalToIso(responseDeadline),
        total: 0,
        pooled: 0,
        updatedAt: Date.now(),
      });
      setSavedEvents(loadSavedEvents().map(normalizeSavedEvent).filter(Boolean));
      setScreen('dashboard');
    } catch (e) {
      await dlg.alert("Couldn't save event — please try again.");
    } finally {
      setSaving(false);
    }
  };

  const renderScreen = () => {
    if (screen === 'welcome') return (
      <div>
        <div style={DS.tealHeader}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
            <img src="/logo.svg" alt="Helmr" style={{ width: '36px', height: '36px' }} />
            <span style={{ fontSize: '22px', fontWeight: 500 }}>Helmr</span>
          </div>
          <p style={{ margin: 0, fontSize: '16px', opacity: 0.9 }}>
            Hey {organizerName || 'there'} 👋
          </p>
          <p style={{ margin: '4px 0 0', fontSize: '13px', opacity: 0.75 }}>
            Take the helm of your next group plan
          </p>
        </div>

        <div style={{ padding: '0 20px 24px' }}>
          {savedEvents.length > 0 && (
            <div style={{ marginBottom: '20px' }}>
              <div style={{ ...DS.label, marginBottom: '10px' }}>Your events</div>
              {savedEvents.map(ev => {
                const evColor = getEventColor(ev.eventType);
                const typeInfo = eventTypes.find(t => t.id === ev.eventType);
                const statAmt = ev.mode === 'open_pool' ? ev.pooled : ev.total;
                const statLabel = ev.mode === 'open_pool' ? 'pooled' : 'total';
                const evDeadline = ev.responseDeadline ? formatDeadline(new Date(ev.responseDeadline)) : null;
                return (
                  <div
                    key={ev.id}
                    style={{
                      ...DS.card,
                      display: 'flex',
                      alignItems: 'stretch',
                      cursor: loading ? 'wait' : 'pointer',
                      borderLeft: `4px solid ${evColor}`,
                      padding: 0,
                      overflow: 'hidden',
                    }}
                    onClick={() => !loading && resumeEvent(ev.id)}
                  >
                    <div style={{ flex: 1, padding: '14px 14px 14px 12px', minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <span style={{ fontSize: '20px' }}>{typeInfo?.icon || '📋'}</span>
                        <div style={{ fontSize: '15px', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ev.name}</div>
                      </div>
                      <div style={{ fontSize: '13px', color: evColor, fontWeight: 500 }}>
                        ${statAmt.toLocaleString()} {statLabel}
                      </div>
                      {evDeadline && (
                        <div style={{ fontSize: '11px', color: '#888', marginTop: '4px' }}>
                          ⏰ RSVP by {evDeadline}
                        </div>
                      )}
                    </div>
                    <button
                      style={{ ...DS.btnGhost, alignSelf: 'center', padding: '8px 12px', fontSize: '14px' }}
                      onClick={async (e) => {
                        e.stopPropagation();
                        if (await dlg.confirm(`Remove "${ev.name}" from this list? (The event itself isn't deleted.)`)) {
                          removeEventFromLocal(ev.id);
                          setSavedEvents(prev => prev.filter(x => x.id !== ev.id));
                        }
                      }}
                    >✕</button>
                  </div>
                );
              })}
            </div>
          )}

          <button style={{ ...DS.btn, ...DS.btnPrimary }} onClick={startNewEvent}>Plan something new</button>
          <p style={{ fontSize: '11px', color: '#999', marginTop: '16px', textAlign: 'center' }}>Prototype — events saved for 90 days</p>
        </div>
      </div>
    );

    if (screen === 'chooseType') return (
      <div style={{ padding: '20px' }}>
        <button style={DS.btnGhost} onClick={() => setScreen('welcome')}>← Back</button>
        <h2 style={{ fontSize: '22px', margin: '8px 0 4px', fontWeight: 500 }}>What are you planning?</h2>
        <p style={{ fontSize: '13px', color: '#777', margin: '0 0 20px' }}>We'll suggest expenses to get you started</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          {eventTypes.map(e => {
            const color = getEventColor(e.id);
            return (
              <div
                key={e.id}
                onClick={() => pickType(e.id)}
                style={{
                  padding: '20px 12px',
                  borderRadius: '16px',
                  background: color,
                  color: 'white',
                  cursor: 'pointer',
                  textAlign: 'center',
                  fontSize: '13px',
                  fontWeight: 500,
                  fontFamily: FONT,
                }}
              >
                <i className={`ti ${e.tablerIcon}`} style={{ color: 'white', fontSize: '36px', marginBottom: '6px', display: 'block' }} />
                {e.label}
              </div>
            );
          })}
        </div>
      </div>
    );

    if (screen === 'details') {
      const t = eventTypes.find(e => e.id === eventType);
      const updateOrganizerName = (newName) => {
        setOrganizerName(newName);
        setPeople(people.map(p => p.role === 'organizer' ? { ...p, name: newName || 'You' } : p));
      };
      return (
        <div style={{ padding: '0 0 20px' }}>
          <button style={{ ...DS.btnGhost, margin: '12px 20px 0' }} onClick={() => setScreen('chooseType')}>← Back</button>
          <div style={{ ...DS.accentHeader(getEventColor(eventType)), margin: '8px 20px 16px' }}>
            <div style={{ fontSize: '36px', marginBottom: '4px' }}>{t.icon}</div>
            <h2 style={{ margin: 0, fontSize: '22px', fontWeight: 500 }}>{t.label}</h2>
          </div>
          <div style={{ padding: '0 20px' }}>

          <label style={DS.label}>How is this being paid for?</label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '4px' }}>
            <button
              onClick={() => {
                setMode('cost_split');
                setInviteMode('personal');
              }}
              style={{ padding: '10px 8px', borderRadius: '12px', border: mode === 'cost_split' ? `2px solid ${BRAND}` : '0.5px solid #ddd', background: mode === 'cost_split' ? BRAND : 'white', color: mode === 'cost_split' ? 'white' : '#1a1a1a', cursor: 'pointer', fontFamily: FONT, textAlign: 'left' }}
            >
              <div style={{ fontSize: '13px', fontWeight: 500 }}>Split a cost</div>
              <div style={{ fontSize: '11px', opacity: 0.75, marginTop: '2px' }}>Known total, split evenly</div>
            </button>
            <button
              onClick={() => setMode('open_pool')}
              style={{ padding: '10px 8px', borderRadius: '12px', border: mode === 'open_pool' ? `2px solid ${BRAND}` : '0.5px solid #ddd', background: mode === 'open_pool' ? BRAND : 'white', color: mode === 'open_pool' ? 'white' : '#1a1a1a', cursor: 'pointer', fontFamily: FONT, textAlign: 'left' }}
            >
              <div style={{ fontSize: '13px', fontWeight: 500 }}>Open pool</div>
              <div style={{ fontSize: '11px', opacity: 0.75, marginTop: '2px' }}>Chip in what you want</div>
            </button>
          </div>
          <p style={{ fontSize: '11px', color: '#999', margin: '4px 0 14px' }}>
            {mode === 'cost_split'
              ? "Everyone owes an equal share of the total."
              : "No pressure, no fixed share. Each person decides their contribution."}
          </p>

          {mode === 'open_pool' && (
            <>
              <label style={DS.label}>How are you inviting people?</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '4px' }}>
                <button
                  onClick={() => setInviteMode('personal')}
                  style={{ padding: '10px 8px', borderRadius: '12px', border: inviteMode === 'personal' ? `2px solid ${BRAND}` : '0.5px solid #ddd', background: inviteMode === 'personal' ? BRAND : 'white', color: inviteMode === 'personal' ? 'white' : '#1a1a1a', cursor: 'pointer', fontFamily: FONT, textAlign: 'left' }}
                >
                  <div style={{ fontSize: '13px', fontWeight: 500 }}>Personal links</div>
                  <div style={{ fontSize: '11px', opacity: 0.75, marginTop: '2px' }}>One link per guest, track who viewed</div>
                </button>
                <button
                  onClick={() => setInviteMode('broadcast')}
                  style={{ padding: '10px 8px', borderRadius: '12px', border: inviteMode === 'broadcast' ? `2px solid ${BRAND}` : '0.5px solid #ddd', background: inviteMode === 'broadcast' ? BRAND : 'white', color: inviteMode === 'broadcast' ? 'white' : '#1a1a1a', cursor: 'pointer', fontFamily: FONT, textAlign: 'left' }}
                >
                  <div style={{ fontSize: '13px', fontWeight: 500 }}>One shared link</div>
                  <div style={{ fontSize: '11px', opacity: 0.75, marginTop: '2px' }}>Post in a group chat, anyone can join</div>
                </button>
              </div>
              <p style={{ fontSize: '11px', color: '#999', margin: '4px 0 14px' }}>
                {inviteMode === 'personal'
                  ? "Add your list of guests; each gets a unique link."
                  : "No need to add names upfront — people enter their own when they chip in."}
              </p>
            </>
          )}

          <label style={DS.label}>Your name</label>
          <input style={DS.input} placeholder="e.g. Sam" value={organizerName} onChange={e => updateOrganizerName(e.target.value)} />
          <div style={{ height: '14px' }} />

          <label style={DS.label}>Your Interac e-Transfer email</label>
          <input style={DS.input} type="email" placeholder="e.g. you@example.com" value={organizerEmail} onChange={e => setOrganizerEmail(e.target.value)} />
          <p style={{ fontSize: '11px', color: '#999', margin: '4px 0 0' }}>This is where guests send their contribution</p>
          <div style={{ height: '14px' }} />

          <label style={DS.label}>Event name</label>
          <input style={DS.input} placeholder="e.g. Layla's 30th" value={eventName} onChange={e => setEventName(e.target.value)} />
          <div style={{ height: '14px' }} />

          {mode === 'open_pool' && (
            <>
              <label style={DS.label}>Suggested contribution (optional)</label>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <span style={{ fontSize: '14px', color: '#777' }}>$</span>
                <input style={DS.input} type="number" min="0" placeholder="10" value={suggestionAmount || ''} onChange={e => setSuggestionAmount(e.target.value)} />
                <select
                  style={{ ...DS.input, width: 'auto' }}
                  value={suggestionUnit}
                  onChange={e => setSuggestionUnit(e.target.value)}
                >
                  <option value="per person">per person</option>
                  <option value="per kid">per kid</option>
                  <option value="per family">per family</option>
                  <option value="total">total</option>
                </select>
              </div>
              <p style={{ fontSize: '11px', color: '#999', margin: '4px 0 0' }}>Just a starting point — guests can give more, less, or nothing.</p>
              <div style={{ height: '14px' }} />

              <label style={DS.label}>Goal (optional)</label>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <span style={{ fontSize: '14px', color: '#777' }}>$</span>
                <input style={DS.input} type="number" min="0" placeholder="Leave blank for no target" value={goal || ''} onChange={e => setGoal(e.target.value)} />
              </div>
              <p style={{ fontSize: '11px', color: '#999', margin: '4px 0 0' }}>If you're trying to buy something specific.</p>
              <div style={{ height: '14px' }} />
            </>
          )}

          <label style={DS.label}><input type="checkbox" checked={dateTBD} onChange={() => setDateTBD(!dateTBD)} style={{ marginRight: '4px' }} /> Date TBD</label>
          {!dateTBD && <input style={DS.input} type="date" value={eventDate} onChange={e => setEventDate(e.target.value)} />}
          <div style={{ height: '14px' }} />

          <label style={DS.label}><input type="checkbox" checked={locTBD} onChange={() => setLocTBD(!locTBD)} style={{ marginRight: '4px' }} /> Location TBD</label>
          {!locTBD && <input style={DS.input} placeholder="Where?" value={eventLoc} onChange={e => setEventLoc(e.target.value)} />}
          <div style={{ height: '14px' }} />

          <label style={DS.label}>
            Response deadline {mode === 'cost_split' ? <span style={{ color: '#a55' }}>*</span> : <span style={{ color: '#999', fontWeight: 400 }}>(optional)</span>}
          </label>
          <input
            style={DS.input}
            type="datetime-local"
            value={responseDeadline}
            onChange={e => setResponseDeadline(e.target.value)}
          />
          <p style={{ fontSize: '11px', color: '#999', margin: '4px 0 0' }}>
            {mode === 'cost_split'
              ? 'When RSVPs close. After this, guests see their final share and where to send funds.'
              : 'After this, new people can\u2019t join. Already-confirmed guests can still pay.'}
          </p>
          <div style={{ height: '14px' }} />

          <label style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', background: '#f5f3ee', borderRadius: '10px', cursor: 'pointer', marginBottom: '4px' }}>
            <input
              type="checkbox"
              checked={tipsEnabled}
              onChange={e => setTipsEnabled(e.target.checked)}
              style={{ width: '18px', height: '18px', cursor: 'pointer' }}
            />
            <span style={{ fontSize: '14px', fontWeight: 500 }}>🎩 Allow guests to tip the planner</span>
          </label>
          <p style={{ fontSize: '11px', color: '#999', margin: '4px 0 0' }}>
            Shows a "thank the planner" prompt on the guest invite. Default is $0 — no pressure.
          </p>
          <div style={{ height: '14px' }} />

          <label style={DS.label}>Ask each guest for… (optional)</label>
          <input
            style={DS.input}
            placeholder={mode === 'open_pool' ? "e.g. Child's name" : "e.g. Dietary restriction"}
            value={customFieldLabel}
            onChange={e => setCustomFieldLabel(e.target.value)}
            maxLength={40}
          />
          <p style={{ fontSize: '11px', color: '#999', margin: '4px 0 0' }}>
            Adds a short text field on the guest page. Leave blank to skip.
          </p>
          <div style={{ height: '20px' }} />

          <button style={{ ...DS.btn, ...DS.btnPrimary, opacity: saving ? 0.6 : 1 }} disabled={saving} onClick={goToDashboard}>
            {saving ? 'Saving…' : 'Continue'}
          </button>
          </div>
        </div>
      );
    }

    if (screen === 'dashboard') {
      const accentColor = getEventColor(eventType);
      const typeInfo = eventTypes.find(e => e.id === eventType);
      const guestList = people.filter(p => p.role !== 'organizer');

      return (
      <div>
        <div style={{ background: BRAND, color: 'white', padding: '14px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <img src="/logo.svg" alt="" style={{ width: '28px', height: '28px' }} />
            <span style={{ fontWeight: 500, fontSize: '18px' }}>Helmr</span>
            {saving && <span style={{ fontSize: '11px', opacity: 0.7 }}>· saving…</span>}
          </div>
          <button style={{ ...DS.btnGhost, color: 'rgba(255,255,255,0.85)' }} onClick={() => setScreen('welcome')}>← Events</button>
        </div>

        <div style={{ padding: '16px 20px' }}>
          <div style={{ ...DS.accentHeader(accentColor), marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <span style={{ fontSize: '24px' }}>{typeInfo?.icon || '📋'}</span>
              <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 500 }}>{eventName || 'Your event'}</h2>
            </div>
            {mode === 'cost_split' ? (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', fontSize: '13px' }}>
                <div>
                  <div style={{ opacity: 0.8, fontSize: '11px' }}>Total</div>
                  <div style={{ fontWeight: 600, fontSize: '18px' }}>${total.toLocaleString()}</div>
                </div>
                <div>
                  <div style={{ opacity: 0.8, fontSize: '11px' }}>Confirmed</div>
                  <div style={{ fontWeight: 600, fontSize: '18px' }}>
                    {confirmed - (organizerIncludedInSplit ? 1 : 0)}{inviteMode !== 'broadcast' ? ` / ${inviteeCount}` : ''}
                  </div>
                </div>
                <div>
                  <div style={{ opacity: 0.8, fontSize: '11px' }}>{sharesVary ? 'Avg/person' : 'Per person'}</div>
                  <div style={{ fontWeight: 600, fontSize: '18px' }}>${perPerson}</div>
                </div>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '13px' }}>
                <div>
                  <div style={{ opacity: 0.8, fontSize: '11px' }}>Pooled</div>
                  <div style={{ fontWeight: 600, fontSize: '18px' }}>${pooledTotal.toLocaleString()}</div>
                </div>
                <div>
                  <div style={{ opacity: 0.8, fontSize: '11px' }}>Contributors</div>
                  <div style={{ fontWeight: 600, fontSize: '18px' }}>{contributorCount}</div>
                </div>
              </div>
            )}
          </div>

        {deadlineDate && !isNaN(deadlineDate.getTime()) && (
          <div style={{
            padding: '8px 12px',
            borderRadius: '12px',
            marginBottom: '12px',
            fontSize: '12px',
            background: deadlinePassed ? '#fce8e4' : '#f5f3ee',
            color: deadlinePassed ? '#E8645A' : '#666',
            border: `0.5px solid ${deadlinePassed ? '#f09595' : '#e5e0d4'}`,
          }}>
            {deadlinePassed
              ? <>🔒 Closed to new joiners since {formatDeadline(deadlineDate)}. Already-confirmed guests can still pay.</>
              : <>⏰ Closes to new joiners on {formatDeadline(deadlineDate)}</>
            }
          </div>
        )}

        {tab === 'home' && (
          <>
            {guestList.length > 0 && (
              <div style={{ ...DS.card, marginBottom: '12px' }}>
                <div style={DS.label}>Payment progress</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '8px' }}>
                  {guestList.map(p => {
                    const isPaid = p.status === 'paid';
                    const isDeclined = p.status === 'declined';
                    return (
                      <div
                        key={p.id}
                        title={`${p.name} — ${p.status}`}
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: '50%',
                          background: isPaid ? BRAND : isDeclined ? '#E8645A' : 'transparent',
                          border: isPaid ? 'none' : isDeclined ? '2px solid #E8645A' : '2px dashed #bbb',
                          flexShrink: 0,
                        }}
                      />
                    );
                  })}
                </div>
                <div style={{ display: 'flex', gap: '12px', marginTop: '10px', fontSize: '11px', color: '#888' }}>
                  <span><span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: BRAND, marginRight: 4 }} />Paid</span>
                  <span><span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', border: '1px dashed #bbb', marginRight: 4 }} />Pending</span>
                  <span><span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: '#E8645A', marginRight: 4 }} />Declined</span>
                </div>
              </div>
            )}

            {mode === 'cost_split' ? (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  {inviteMode === 'broadcast' && (
                    <div style={DS.card}>
                      <div style={DS.label}>Link views</div>
                      <div style={{ fontSize: '18px', fontWeight: 500 }}>{viewCount}</div>
                    </div>
                  )}
                  {sharesVary && (
                    <div style={DS.card}>
                      <div style={DS.label}>Share range</div>
                      <div style={{ fontSize: '18px', fontWeight: 500 }}>${minShare}–${maxShare}</div>
                    </div>
                  )}
                </div>
                {tipsEnabled && (() => {
                  const tipsTotal = people.reduce((s, p) => s + (Number(p.tipAmount) || 0), 0);
                  const tippers = people.filter(p => Number(p.tipAmount) > 0).length;
                  return (
                    <div style={DS.card}>
                      <div style={DS.label}>🎩 Tips for you</div>
                      <div style={{ fontSize: '18px', fontWeight: 500 }}>${tipsTotal}</div>
                      <div style={{ fontSize: '11px', color: '#999', marginTop: '2px' }}>
                        {tippers === 0 ? 'No tips yet' : `From ${tippers} ${tippers === 1 ? 'person' : 'people'}`}
                      </div>
                    </div>
                  );
                })()}
              </>
            ) : (
              <>
                {Number(goal) > 0 && (
                  <div style={DS.card}>
                    <div style={DS.label}>Goal progress</div>
                    <div style={{ height: '6px', background: '#eee', borderRadius: '999px', marginTop: '8px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${Math.min(100, (pooledTotal / Number(goal)) * 100)}%`, background: accentColor }} />
                    </div>
                    <div style={{ fontSize: '12px', color: '#777', marginTop: '6px' }}>Goal: ${Number(goal).toLocaleString()}</div>
                  </div>
                )}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  {inviteMode === 'broadcast' ? (
                    <div style={DS.card}>
                      <div style={DS.label}>Link views</div>
                      <div style={{ fontSize: '18px', fontWeight: 500 }}>{viewCount}</div>
                    </div>
                  ) : (
                    <div style={DS.card}>
                      <div style={DS.label}>Contributed</div>
                      <div style={{ fontSize: '18px', fontWeight: 500 }}>{contributorCount} / {inviteeCount}</div>
                    </div>
                  )}
                  {Number(suggestionAmount) > 0 && (
                    <div style={DS.card}>
                      <div style={DS.label}>Suggested</div>
                      <div style={{ fontSize: '18px', fontWeight: 500 }}>${Number(suggestionAmount)}</div>
                      <div style={{ fontSize: '11px', color: '#999' }}>{suggestionUnit}</div>
                    </div>
                  )}
                </div>
                {tipsEnabled && (() => {
                  const tipsTotal = people.reduce((s, p) => s + (Number(p.tipAmount) || 0), 0);
                  const tippers = people.filter(p => Number(p.tipAmount) > 0).length;
                  return (
                    <div style={DS.card}>
                      <div style={DS.label}>🎩 Tips for you</div>
                      <div style={{ fontSize: '18px', fontWeight: 500 }}>${tipsTotal}</div>
                      <div style={{ fontSize: '11px', color: '#999', marginTop: '2px' }}>
                        {tippers === 0 ? 'No tips yet' : `From ${tippers} ${tippers === 1 ? 'person' : 'people'}`}
                      </div>
                    </div>
                  );
                })()}
              </>
            )}
            {(() => {
              const missingDeadline = mode === 'cost_split' && !responseDeadline;
              return (
                <>
                  <div
                    style={{
                      ...DS.card,
                      marginTop: '12px',
                      cursor: missingDeadline ? 'not-allowed' : 'pointer',
                      opacity: missingDeadline ? 0.6 : 1,
                      borderColor: accentColor + '44',
                    }}
                    onClick={() => !missingDeadline && setShareOpen(true)}
                  >
                    <div style={{ fontSize: '15px', fontWeight: 500, color: accentColor }}>
                      📋 {inviteMode === 'broadcast' ? 'Share the link' : 'Share invite links'}
                    </div>
                    <div style={{ fontSize: '12px', color: '#888', marginTop: '4px' }}>
                      {inviteMode === 'broadcast' ? 'Post in your group chat' : 'Send each guest their personal link'}
                    </div>
                  </div>
                  <p style={{ fontSize: '11px', color: '#999', marginTop: '8px', textAlign: 'center' }}>Event ID: {eventId}</p>
                  {missingDeadline && (
                    <div style={{ ...DS.card, marginTop: '12px', borderColor: '#f0c595', background: '#fdf6ec' }}>
                      <div style={{ fontSize: '13px', color: '#7a5320', marginBottom: '4px' }}>⚠️ Set a response deadline before sharing.</div>
                      <div style={{ fontSize: '12px', color: '#7a5320' }}>Guests need a clear "RSVP by" date so the math finalizes before they're asked to pay. Edit in the Settings tab.</div>
                    </div>
                  )}
                </>
              );
            })()}
            {!organizerEmail && (
              <div style={{ ...DS.card, marginTop: '12px', borderColor: '#f0c595', background: '#fdf6ec' }}>
                <div style={{ fontSize: '13px', color: '#7a5320' }}>⚠️ Add your Interac email in the Settings tab so guests know where to send funds.</div>
              </div>
            )}
          </>
        )}

        {tab === 'guests' && (
          <>
            {inviteMode === 'broadcast' && (
              <p style={{ fontSize: '12px', color: '#777', margin: '0 0 10px', padding: '8px 10px', background: '#f5f3ee', borderRadius: '8px' }}>
                Contributors will show up here as people pledge from the shared link.
              </p>
            )}
        {people.map(p => {
              const c = STATUS_STYLES[p.status];
              const isOrganizer = p.role === 'organizer';
              const contributed = Number(p.contributedAmount) || 0;
              const isBroadcastGuest = p.source === 'broadcast';
              const personShare = peopleShares.find(s => s.id === p.id);
              const shareAmt = personShare ? Math.round(personShare.share) : 0;
              const shouldShowShare = mode === 'cost_split' && (
                isOrganizer ? organizerIncludedInSplit : (p.status === 'confirmed' || p.status === 'paid')
              ) && shareAmt > 0;
              return (
                <div key={p.id} style={DS.card}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                    <div style={{ fontSize: '15px', fontWeight: 500, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {p.name}
                      {isOrganizer && <span style={{ fontSize: '11px', color: '#999', fontWeight: 400 }}> · organizer</span>}
                      {p.viewedAt && !isOrganizer && <span style={{ fontSize: '11px', color: BRAND, fontWeight: 400 }}> · viewed</span>}
                      {isBroadcastGuest && <span style={{ fontSize: '11px', color: '#999', fontWeight: 400 }}> · self-added</span>}
                    </div>
                    {isOrganizer && mode === 'open_pool' && contributed > 0 && (
                      <span style={{ fontSize: '13px', fontWeight: 500, color: BRAND }}>${contributed}</span>
                    )}
                    {!isOrganizer && mode === 'open_pool' && contributed > 0 && (
                      <span style={{ fontSize: '13px', fontWeight: 500, color: BRAND }}>${contributed}</span>
                    )}
                    {shouldShowShare && (
                      <span style={{ fontSize: '13px', fontWeight: 500, color: BRAND }}>${shareAmt}</span>
                    )}
                    {!isOrganizer && mode === 'cost_split' && (
                      <span style={{ ...DS.pill, background: c?.bg || '#eee', color: c?.fg || '#666' }} onClick={() => cycleStatus(p.id)}>{p.status}</span>
                    )}
                    {!isOrganizer && mode === 'open_pool' && (
                      <span
                        style={{ ...DS.pill, background: c?.bg || '#eeeae0', color: c?.fg || '#666' }}
                        onClick={() => cycleStatus(p.id)}
                      >
                        {p.status === 'invited' && contributed === 0 ? 'waiting' : p.status}
                      </span>
                    )}
                    {!isOrganizer && (
                      <button
                        style={{ ...DS.btnGhost, padding: '4px' }}
                        onClick={async () => {
                          const hasContributed = Number(p.contributedAmount) > 0;
                          const hasResponded = p.status && p.status !== 'invited';
                          let msg = `Remove ${p.name} from this event?`;
                          if (hasContributed) {
                            msg = `Remove ${p.name}? They've already contributed $${Number(p.contributedAmount)}. This will erase their record from the pool and can't be undone.`;
                          } else if (hasResponded) {
                            msg = `Remove ${p.name}? They've already responded (${p.status}). This can't be undone.`;
                          }
                          if (await dlg.confirm(msg)) {
                            setPeople(people.filter(x => x.id !== p.id));
                          }
                        }}
                        aria-label="Remove"
                      >🗑️</button>
                    )}
                  </div>

                  {/* Organizer-specific controls */}
                  {isOrganizer && mode === 'open_pool' && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px' }}>
                      <span style={{ fontSize: '13px', color: '#666', whiteSpace: 'nowrap' }}>My contribution:</span>
                      <div style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                        <span style={{ fontSize: '14px', color: '#666', marginRight: '2px' }}>$</span>
                        <input
                          type="number"
                          min="0"
                          step="1"
                          inputMode="numeric"
                          value={contributed || ''}
                          placeholder="0"
                          onChange={e => {
                            const v = Math.max(0, Number(e.target.value) || 0);
                            setPeople(people.map(x =>
                              x.id === p.id ? { ...x, contributedAmount: v } : x
                            ));
                          }}
                          style={{ ...DS.input, padding: '6px 8px', fontSize: '14px', flex: 1 }}
                        />
                      </div>
                    </div>
                  )}
                  {isOrganizer && mode === 'cost_split' && (
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px', fontSize: '13px', color: '#666', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={!!p.includedInSplit}
                        onChange={e => {
                          const checked = e.target.checked;
                          setPeople(people.map(x =>
                            x.id === p.id ? { ...x, includedInSplit: checked } : x
                          ));
                        }}
                        style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                      />
                      Include myself in the split
                    </label>
                  )}

                  {!isOrganizer && customFieldLabel && p.customFieldValue && (
                    <div style={{ fontSize: '12px', color: '#777', marginTop: '4px' }}>
                      {customFieldLabel}: <span style={{ color: '#333' }}>{p.customFieldValue}</span>
                    </div>
                  )}
                  {!isOrganizer && tipsEnabled && Number(p.tipAmount) > 0 && (() => {
                    // Show the organizer what this guest will actually e-transfer:
                    // their share/contribution + the tip they chose to add on top.
                    const tipAmt = Number(p.tipAmount) || 0;
                    const baseAmt = mode === 'open_pool' ? contributed : shareAmt;
                    const baseLabel = mode === 'open_pool' ? 'Contribution' : 'Share';
                    return (
                      <div style={{ marginTop: '6px', padding: '6px 8px', background: '#f5f3ee', borderRadius: '6px', fontSize: '12px', color: '#666' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span>{baseLabel}</span><span>${baseAmt}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2px' }}>
                          <span>Tip 🎩</span><span>${tipAmt}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px', paddingTop: '4px', borderTop: '0.5px solid #e5e0d4', fontWeight: 500, color: '#333' }}>
                          <span>Expected e-Transfer</span><span>${baseAmt + tipAmt}</span>
                        </div>
                      </div>
                    );
                  })()}
                  {!isOrganizer && p.paymentScreenshotKey && (
                    <a
                      href={`/api/events/${eventId}/screenshot?guestId=${p.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ display: 'inline-block', marginTop: '6px', fontSize: '12px', color: BRAND, textDecoration: 'none', fontWeight: 500 }}
                    >
                      📎 View e-Transfer screenshot
                    </a>
                  )}
                </div>
              );
            })}
            {people.length === 1 && inviteMode === 'personal' && (
              <p style={{ fontSize: '12px', color: '#999', textAlign: 'center', padding: '12px 0' }}>Add the people you're inviting to your event.</p>
            )}
            {inviteMode === 'personal' && (
              <>
                <button style={DS.btn} onClick={async () => {
                  const n = await dlg.prompt('Name?');
                  if (n) setPeople([...people, { id: newGuestId(), name: n, status: 'invited' }]);
                }}>+ Add person</button>
                <p style={{ fontSize: '11px', color: '#999', marginTop: '8px' }}>Guests can RSVP themselves from their link. Tap a status to manually override.</p>
              </>
            )}
          </>
        )}

        {tab === 'expenses' && (
          <>
            <div style={{ ...DS.statNumber, color: accentColor, marginBottom: '16px' }}>
              ${total.toLocaleString()}
              <span style={{ fontSize: '13px', color: '#888', fontWeight: 400, marginLeft: '8px' }}>total</span>
            </div>
            {mode === 'open_pool' && (
              <p style={{ fontSize: '12px', color: '#777', margin: '0 0 10px', padding: '8px 10px', background: '#f5f3ee', borderRadius: '8px' }}>
                In Open Pool, expenses are just a wish-list — they don't set each person's share. Guests give what they want, and you spend what's pooled.
              </p>
            )}
            {expenses.map(e => {
              const ids = Array.isArray(e.participantIds) ? e.participantIds : [];
              const hasCustom = ids.length > 0;
              // Eligible = everyone in people list; organizer only if included in split
              const eligible = people.filter(p =>
                p.role === 'organizer' ? organizerIncludedInSplit : true
              );
              const summary = !hasCustom
                ? `Everyone (${eligible.length})`
                : `${ids.filter(id => eligible.some(p => p.id === id)).length} of ${eligible.length}`;
              return (
                <div key={e.id} style={DS.card}>
                  <input style={{ ...DS.input, marginBottom: '8px' }} value={e.name} onChange={ev => setExpenses(expenses.map(x => x.id === e.id ? { ...x, name: ev.target.value } : x))} />
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <span style={{ fontSize: '14px', color: '#777' }}>$</span>
                    <input style={DS.input} type="number" value={e.amount} onChange={ev => setExpenses(expenses.map(x => x.id === e.id ? { ...x, amount: ev.target.value } : x))} />
                    <button style={DS.btnGhost} onClick={() => setExpenses(expenses.filter(x => x.id !== e.id))}>🗑️</button>
                  </div>
                  {mode === 'cost_split' && (
                    <>
                      <div
                        style={{
                          marginTop: '8px',
                          fontSize: '13px',
                          color: '#666',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          cursor: 'pointer',
                          padding: '6px 8px',
                          background: '#f5f3ee',
                          borderRadius: '6px',
                        }}
                        onClick={() => toggleExpenseExpanded(e.id)}
                      >
                        <span>Who's on this: <span style={{ color: '#333', fontWeight: 500 }}>{summary}</span></span>
                        <span style={{ fontSize: '11px', color: '#999' }}>{expandedExpenseIds.has(e.id) ? '▲' : '▼'}</span>
                      </div>
                      {expandedExpenseIds.has(e.id) && (
                        <div style={{ marginTop: '6px', padding: '4px 4px 0' }}>
                          {eligible.length === 0 && (
                            <p style={{ fontSize: '12px', color: '#999', margin: '4px 0' }}>Add people on the Guests tab first.</p>
                          )}
                          {eligible.map(p => {
                            const onThis = hasCustom ? ids.includes(p.id) : true;
                            return (
                              <label
                                key={p.id}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '8px',
                                  padding: '6px 0',
                                  fontSize: '14px',
                                  cursor: 'pointer',
                                }}
                              >
                                <input
                                  type="checkbox"
                                  checked={onThis}
                                  onChange={ev => {
                                    const checked = ev.target.checked;
                                    setExpenses(expenses.map(x => {
                                      if (x.id !== e.id) return x;
                                      // First edit: initialize participantIds from "everyone".
                                      // After that, just add/remove the toggled person.
                                      let nextIds = Array.isArray(x.participantIds) && x.participantIds.length > 0
                                        ? [...x.participantIds]
                                        : eligible.map(q => q.id);
                                      if (checked) {
                                        if (!nextIds.includes(p.id)) nextIds.push(p.id);
                                      } else {
                                        nextIds = nextIds.filter(id => id !== p.id);
                                      }
                                      // If they re-selected everyone, drop participantIds back to default ("everyone")
                                      // so future-added guests are automatically included.
                                      if (nextIds.length === eligible.length && eligible.every(q => nextIds.includes(q.id))) {
                                        return { ...x, participantIds: [] };
                                      }
                                      return { ...x, participantIds: nextIds };
                                    }));
                                  }}
                                  style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                                />
                                <span style={{ flex: 1 }}>
                                  {p.name}
                                  {p.role === 'organizer' && <span style={{ fontSize: '11px', color: '#999' }}> · you</span>}
                                </span>
                              </label>
                            );
                          })}
                          {hasCustom && (
                            <button
                              style={{ ...DS.btnGhost, fontSize: '12px', padding: '4px 0', marginTop: '4px' }}
                              onClick={() => setExpenses(expenses.map(x =>
                                x.id === e.id ? { ...x, participantIds: [] } : x
                              ))}
                            >
                              Reset to everyone
                            </button>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>
              );
            })}
            <button style={DS.btn} onClick={async () => {
              const n = await dlg.prompt('Expense name?');
              if (n) setExpenses([...expenses, { id: Date.now(), name: n, amount: 0 }]);
            }}>+ Add expense</button>
          </>
        )}

        {tab === 'settings' && (
          <>
            <div style={DS.card}>
              <div style={{ fontWeight: 500, marginBottom: '12px' }}>Account</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <span style={{ fontSize: '14px', color: '#666' }}>Plan</span>
                <span style={{
                  ...DS.pill,
                  background: '#eeeae0',
                  color: '#666',
                  cursor: 'default',
                }}>
                  Free
                </span>
              </div>
            </div>

            <div style={DS.card}>
              <div style={{ fontWeight: 500, marginBottom: '8px' }}>📝 Event details</div>

              <label style={DS.label}>Event name</label>
              <input style={{ ...DS.input, marginBottom: '10px' }} value={eventName} onChange={e => setEventName(e.target.value)} placeholder="e.g. Layla's 30th" />

              <label style={DS.label}><input type="checkbox" checked={dateTBD} onChange={() => setDateTBD(!dateTBD)} style={{ marginRight: '4px' }} /> Date TBD</label>
              {!dateTBD && <input style={{ ...DS.input, marginBottom: '10px' }} type="date" value={eventDate} onChange={e => setEventDate(e.target.value)} />}

              <label style={DS.label}><input type="checkbox" checked={locTBD} onChange={() => setLocTBD(!locTBD)} style={{ marginRight: '4px' }} /> Location TBD</label>
              {!locTBD && <input style={{ ...DS.input, marginBottom: '10px' }} placeholder="Where?" value={eventLoc} onChange={e => setEventLoc(e.target.value)} />}

              <label style={DS.label}>
                Response deadline {mode === 'cost_split' ? <span style={{ color: '#a55' }}>*</span> : <span style={{ color: '#999', fontWeight: 400 }}>(optional)</span>}
              </label>
              <input
                style={{ ...DS.input, marginBottom: '4px' }}
                type="datetime-local"
                value={responseDeadline}
                onChange={e => setResponseDeadline(e.target.value)}
              />
              <p style={{ fontSize: '11px', color: '#999', margin: '0 0 10px' }}>
                {mode === 'cost_split'
                  ? 'When RSVPs close. Guests see final share + payment details after this.'
                  : 'After this, new people can\u2019t join. Already-confirmed guests can still pay.'}
              </p>

              <label style={DS.label}>Ask each guest for… (optional)</label>
              <input
                style={{ ...DS.input, marginBottom: '4px' }}
                placeholder={mode === 'open_pool' ? "e.g. Child's name" : "e.g. Dietary restriction"}
                value={customFieldLabel}
                onChange={e => setCustomFieldLabel(e.target.value)}
                maxLength={40}
              />
              <p style={{ fontSize: '11px', color: '#999', margin: 0 }}>
                Adds a short text field on the guest page.
              </p>
            </div>

            {mode === 'open_pool' && (
              <div style={DS.card}>
                <div style={{ fontWeight: 500, marginBottom: '8px' }}>💵 Pool settings</div>

                <label style={DS.label}>Suggested contribution (optional)</label>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '10px' }}>
                  <span style={{ fontSize: '14px', color: '#777' }}>$</span>
                  <input style={DS.input} type="number" min="0" placeholder="10" value={suggestionAmount || ''} onChange={e => setSuggestionAmount(e.target.value)} />
                  <select
                    style={{ ...DS.input, width: 'auto' }}
                    value={suggestionUnit}
                    onChange={e => setSuggestionUnit(e.target.value)}
                  >
                    <option value="per person">per person</option>
                    <option value="per kid">per kid</option>
                    <option value="per family">per family</option>
                    <option value="total">total</option>
                  </select>
                </div>

                <label style={DS.label}>Goal (optional)</label>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <span style={{ fontSize: '14px', color: '#777' }}>$</span>
                  <input style={DS.input} type="number" min="0" placeholder="Leave blank for no target" value={goal || ''} onChange={e => setGoal(e.target.value)} />
                </div>
              </div>
            )}

            <div style={DS.card}>
              <div style={{ fontWeight: 500, marginBottom: '4px' }}>💸 Your Interac email</div>
              <p style={{ fontSize: '12px', color: '#777', margin: '0 0 8px' }}>Where guests send their share</p>
              <input style={DS.input} type="email" placeholder="you@example.com" value={organizerEmail} onChange={e => setOrganizerEmail(e.target.value)} />
            </div>
            <div style={DS.card}>
              <div style={{ fontWeight: 500, marginBottom: '4px' }}>🔔 Email notifications</div>
              <p style={{ fontSize: '12px', color: '#777', margin: '0 0 10px' }}>
                Choose when Helmr emails you about guest activity.
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setNotificationPreference('live')}
                  style={{
                    padding: '10px 8px',
                    borderRadius: '10px',
                    border: notificationPreference === 'live' ? `2px solid ${BRAND}` : '0.5px solid #ddd',
                    background: notificationPreference === 'live' ? BRAND : 'white',
                    color: notificationPreference === 'live' ? 'white' : '#1a1a1a',
                    cursor: 'pointer',
                    fontFamily: FONT,
                    fontWeight: 500,
                  }}
                >
                  Live updates
                </button>
                <button
                  type="button"
                  onClick={() => setNotificationPreference('digest')}
                  style={{
                    padding: '10px 8px',
                    borderRadius: '10px',
                    border: notificationPreference === 'digest' ? `2px solid ${BRAND}` : '0.5px solid #ddd',
                    background: notificationPreference === 'digest' ? BRAND : 'white',
                    color: notificationPreference === 'digest' ? 'white' : '#1a1a1a',
                    cursor: 'pointer',
                    fontFamily: FONT,
                    fontWeight: 500,
                  }}
                >
                  Daily digest
                </button>
              </div>
              <p style={{ fontSize: '11px', color: '#999', margin: '8px 0 0' }}>
                Live updates send individual emails. Daily digest groups activity into a summary.
              </p>
            </div>
            <div style={DS.card}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 500, marginBottom: '4px' }}>🎩 Tip the planner</div>
                  <p style={{ fontSize: '12px', color: '#777', margin: 0 }}>
                    Show guests an optional tip prompt when they opt in. Defaults to $0 — no pressure.
                  </p>
                </div>
                <label style={{ display: 'inline-flex', alignItems: 'center', cursor: 'pointer', paddingTop: '2px' }}>
                  <input
                    type="checkbox"
                    checked={tipsEnabled}
                    onChange={e => setTipsEnabled(e.target.checked)}
                    style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                  />
                </label>
              </div>
              {tipsEnabled && (() => {
                const tipsTotal = people.reduce((s, p) => s + (Number(p.tipAmount) || 0), 0);
                const tippers = people.filter(p => Number(p.tipAmount) > 0).length;
                return (
                  <div style={{ marginTop: '10px', padding: '8px 10px', background: '#f5f3ee', borderRadius: '8px', fontSize: '13px', color: '#666' }}>
                    {tippers === 0
                      ? 'No tips received yet.'
                      : <>Received: <strong>${tipsTotal}</strong> from {tippers} {tippers === 1 ? 'person' : 'people'}.</>
                    }
                  </div>
                );
              })()}
            </div>
            <div style={DS.card}>
              <div style={{ fontWeight: 500, marginBottom: '4px' }}>🎁 Surprise gift</div>
              <p style={{ fontSize: '12px', color: '#777', margin: '0 0 8px' }}>Propose a gift; requires organizer approval</p>
              <button style={DS.btn} onClick={async () => { await dlg.alert('Surprise gift flow — propose a gift, organizer approves before it shows up to other guests.'); }}>+ Propose surprise gift</button>
            </div>
          </>
        )}
        </div>
      </div>
      );
    }
  };

  return (
    <div style={DS.page}>
      <div style={DS.frame}>
        {screen === 'dashboard' ? (
          <div style={DS.screenBody}>{renderScreen()}</div>
        ) : (
          renderScreen()
        )}
        {screen === 'dashboard' && (
          <BottomNav activeTab={tab} onTabChange={setTab} onNewEvent={startNewEvent} />
        )}
      </div>
      <button style={DS.feedbackBtn} onClick={() => setFeedbackOpen(true)}>💬 Feedback</button>
      <AppDialog dialog={dialog} onClose={() => setDialog(null)} />
      <FeedbackModal
        open={feedbackOpen}
        onClose={() => setFeedbackOpen(false)}
        currentScreen={screen}
        onAlert={msg => dlg.alert(msg)}
      />
      <ShareModal
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        event={eventId ? { id: eventId, people, inviteMode, eventName, mode } : null}
      />
      <UpgradeModal
        open={upgradeOpen}
        onClose={() => setUpgradeOpen(false)}
        email={organizerEmail}
      />
    </div>
  );
}
