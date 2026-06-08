'use client';

import { useState, useEffect, useRef } from 'react';
import Auth from '../../components/Auth';
import { getSupabaseClient } from '../../lib/supabase';
import { participantsForExpense, computePersonShare } from '../../lib/shares';

// ============ CONFIG ============
const FORMSPREE_ENDPOINT = 'https://formspree.io/f/mredzlyn';
const LS_KEY = 'helmr.events.v1';

const eventTypes = [
  // School / community / fundraising types first — these are what PAC organizers
  // and community groups look for. A school treasurer evaluating Helmr should see
  // relevant options immediately, not a screen of trips and bachelor parties.
  { id: 'fundraiser', icon: '💛', label: 'Fundraiser', expenses: [], defaultMode: 'open_pool' },
  { id: 'potluck', icon: '🥗', label: 'Potluck / Class fund', expenses: [], defaultMode: 'open_pool' },
  { id: 'gift', icon: '🎁', label: 'Group gift', expenses: ['Main gift', 'Card', 'Wrapping'], defaultMode: 'open_pool' },
  { id: 'team', icon: '🏅', label: 'Team / Club fees', expenses: ['Equipment', 'Tournament fees', 'Uniforms', 'Travel'], defaultMode: 'cost_split' },
  { id: 'grad', icon: '🎓', label: 'Graduation', expenses: ['Venue', 'Catering', 'Photographer', 'Decor'], defaultMode: 'cost_split' },
  // Social / personal types
  { id: 'trip', icon: '✈️', label: 'Trip', expenses: ['Hotel', 'Flights', 'Excursions', 'Meals', 'Transport'], defaultMode: 'cost_split' },
  { id: 'dinner', icon: '🍽️', label: 'Dinner', expenses: ['Restaurant', 'Drinks', 'Dessert', 'Tip'], defaultMode: 'cost_split' },
  { id: 'bday', icon: '🎂', label: 'Birthday', expenses: ['Venue', 'Cake', 'Decor', 'Catering', 'Gift'], defaultMode: 'cost_split' },
  { id: 'concert', icon: '🎵', label: 'Concert', expenses: ['Tickets', 'Transport', 'Pre-drinks', 'Food'], defaultMode: 'cost_split' },
  { id: 'golf', icon: '🏌️', label: 'Golf day', expenses: ['Green fees', 'Cart', 'Food', 'Prizes'], defaultMode: 'cost_split' },
  { id: 'bach', icon: '🎉', label: 'Bachelor/ette', expenses: ['Accommodation', 'Activities', 'Dinner', 'Drinks', 'Decor'], defaultMode: 'cost_split' },
  { id: 'offsite', icon: '🏢', label: 'Offsite', expenses: ['Venue', 'Accommodation', 'Activities', 'Catering', 'AV'], defaultMode: 'cost_split' },
  { id: 'beach', icon: '🏖️', label: 'Beach day', expenses: ['Rental', 'Food', 'Drinks', 'Equipment'], defaultMode: 'cost_split' },
  { id: 'other', icon: '➕', label: 'Other', expenses: [], defaultMode: 'cost_split' },
];

const statusStyles = {
  invited:   { bg: '#eeeae0', fg: '#666' },
  confirmed: { bg: '#e1f5ee', fg: '#085041' },
  paid:      { bg: '#eaf3de', fg: '#27500a' },
  declined:  { bg: '#fcebeb', fg: '#791f1f' },
};

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
    updatedAt: Number(event.updatedAt || event.createdAt) || Date.now(),
  };
}

async function fetchUserEventSummaries() {
  const res = await fetch('/api/user/events');
  if (!res.ok) throw new Error('Failed to load user events');
  const data = await res.json();
  return Array.isArray(data.events)
    ? data.events.map(normalizeSavedEvent).filter(Boolean)
    : [];
}

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
      <div style={S.modalOverlay} onClick={onClose}>
        <div style={{ ...S.modal, maxHeight: '80vh', overflow: 'auto' }} onClick={e => e.stopPropagation()}>
          <h3 style={{ margin: '0 0 4px' }}>Share the link</h3>
          <p style={{ margin: '0 0 16px', color: '#666', fontSize: '13px' }}>
            Post this in your group chat. Anyone with the link can join.
          </p>

          <div style={{ marginBottom: '14px', padding: '12px', background: '#f5f3ee', borderRadius: '10px' }}>
            <div style={{ fontFamily: 'monospace', fontSize: '13px', wordBreak: 'break-all', marginBottom: '10px' }}>{eventBase}</div>
            <button style={{ ...S.btn, ...S.btnPrimary }} onClick={() => copy(eventBase, 'link')}>
              {copiedId === 'link' ? '✓ Copied' : 'Copy link'}
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
            <a href={waUrl} target="_blank" rel="noopener noreferrer" style={{ ...S.btn, textDecoration: 'none', textAlign: 'center', color: '#1a1a1a', display: 'block' }}>
              💬 WhatsApp
            </a>
            <a href={smsUrl} style={{ ...S.btn, textDecoration: 'none', textAlign: 'center', color: '#1a1a1a', display: 'block' }}>
              📱 SMS
            </a>
          </div>
          <button style={{ ...S.btn, marginBottom: '8px' }} onClick={() => copy(msg, 'msg')}>
            {copiedId === 'msg' ? '✓ Copied' : 'Copy invite message'}
          </button>

          <button
            style={{ ...S.btn, marginBottom: '8px' }}
            onClick={() => window.open(`${eventBase}?preview=1`, '_blank', 'noopener')}
          >
            👁 Preview as guest
          </button>

          <p style={{ fontSize: '11px', color: '#999', textAlign: 'center', margin: '12px 0' }}>
            You'll see contributors show up on your dashboard as they pledge.
          </p>

          <button style={S.btn} onClick={onClose}>Done</button>
        </div>
      </div>
    );
  }

  // ============================================================
  // PERSONAL MODE — per-guest links
  // ============================================================
  return (
    <div style={S.modalOverlay} onClick={onClose}>
      <div style={{ ...S.modal, maxHeight: '80vh', overflow: 'auto' }} onClick={e => e.stopPropagation()}>
        <h3 style={{ margin: '0 0 4px' }}>Share invite links</h3>
        <p style={{ margin: '0 0 16px', color: '#666', fontSize: '13px' }}>Send each person their own link. You'll see when they view it and RSVP.</p>

        <div style={{ marginBottom: '14px', padding: '10px 12px', background: '#f5f3ee', borderRadius: '10px' }}>
          <div style={{ fontSize: '11px', color: '#777', marginBottom: '4px' }}>General link (anyone)</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ flex: 1, fontFamily: 'monospace', fontSize: '12px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{eventBase}</div>
            <button style={{ ...S.btn, width: 'auto', padding: '6px 10px', fontSize: '12px' }} onClick={() => copy(eventBase, 'general')}>
              {copiedId === 'general' ? '✓' : 'Copy'}
            </button>
          </div>
        </div>

        {guests.length === 0 && (
          <p style={{ fontSize: '13px', color: '#999', textAlign: 'center', padding: '20px 0' }}>
            Add people on the People tab to get personal links.
          </p>
        )}

        {guests.map(g => {
          const link = `${eventBase}?g=${g.id}`;
          return (
            <div key={g.id} style={{ ...S.card, marginBottom: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <div style={{ fontSize: '14px', fontWeight: 500 }}>{g.name}</div>
                <div style={{ display: 'flex', gap: '4px' }}>
                  {g.viewedAt && <span style={{ fontSize: '10px', color: '#085041', background: '#e1f5ee', padding: '2px 8px', borderRadius: '999px' }}>viewed</span>}
                  {g.status && g.status !== 'invited' && <span style={{ fontSize: '10px', color: statusStyles[g.status]?.fg, background: statusStyles[g.status]?.bg, padding: '2px 8px', borderRadius: '999px' }}>{g.status}</span>}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ flex: 1, fontFamily: 'monospace', fontSize: '11px', color: '#666', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{link}</div>
                <button style={{ ...S.btn, width: 'auto', padding: '6px 10px', fontSize: '12px' }} onClick={() => copy(link, g.id)}>
                  {copiedId === g.id ? '✓' : 'Copy'}
                </button>
              </div>
            </div>
          );
        })}

        <button
          style={{ ...S.btn, marginTop: '8px' }}
          onClick={() => window.open(`${eventBase}?preview=1`, '_blank', 'noopener')}
        >
          👁 Preview as guest (general link)
        </button>

        <button style={{ ...S.btn, marginTop: '8px' }} onClick={onClose}>Done</button>
      </div>
    </div>
  );
}

export default function Helmr() {
  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [screen, setScreen] = useState('welcome');
  const [eventId, setEventId] = useState(null);
  const [eventType, setEventType] = useState(null);
  const [eventName, setEventName] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [eventLoc, setEventLoc] = useState('');
  const [dateTBD, setDateTBD] = useState(false);
  const [locTBD, setLocTBD] = useState(false);
  const [tab, setTab] = useState('overview');
  const [tipsEnabled, setTipsEnabled] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
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
  const [userEventsLoading, setUserEventsLoading] = useState(false);
  useEffect(() => {
    let mounted = true;
    const supabase = getSupabaseClient();

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      setAuthLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setAuthLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);
  useEffect(() => {
    if (!session?.user?.id) {
      setSavedEvents([]);
      setUserEventsLoading(false);
      return;
    }

    let cancelled = false;
    setUserEventsLoading(true);
    fetchUserEventSummaries()
      .then(events => {
        if (!cancelled) setSavedEvents(events);
      })
      .catch(() => {
        if (!cancelled) setSavedEvents([]);
      })
      .finally(() => {
        if (!cancelled) setUserEventsLoading(false);
      });

    return () => { cancelled = true; };
  }, [session?.user?.id]);

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
          alert('That event has expired or was deleted.');
          removeEventFromLocal(id);
          setSavedEvents(prev => prev.filter(e => e.id !== id));
        } else {
          alert("Couldn't load event.");
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
      setResponseDeadline(isoToDatetimeLocal(data.responseDeadline || ''));
      setPeople(data.people || [{ id: 'organizer', name: 'You', status: 'organizer', role: 'organizer' }]);
      setExpenses(data.expenses || []);
      setTipsEnabled(!!data.tipsEnabled);
      setScreen('dashboard');
    } catch {
      alert("Couldn't load event.");
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
  }, [eventId, screen, eventName, eventDate, eventLoc, dateTBD, locTBD, organizerName, organizerEmail, mode, inviteMode, goal, suggestionAmount, suggestionUnit, customFieldLabel, responseDeadline, people, expenses, tipsEnabled]);

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
  const startNewEvent = () => {
    if (userEventsLoading) {
      alert('Still loading your events — please try again in a moment.');
      return;
    }
    if (savedEvents.length >= 1) {
      alert('Upgrade to Pro to create unlimited events');
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
    setResponseDeadline('');
    setViewCount(0);
    setTipsEnabled(false);
    setExpenses([]);
    setPeople([{ id: 'organizer', name: organizerName || 'You', status: 'paid', role: 'organizer' }]);
    setTab('overview');
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
      alert('Please set a response deadline. Guests will see their final share and how to pay only after this date.');
      return;
    }
    if (mode === 'cost_split' && responseDeadline) {
      const d = new Date(responseDeadline);
      if (!isNaN(d.getTime()) && d.getTime() < Date.now()) {
        alert('The response deadline is in the past. Please pick a future date.');
        return;
      }
    }
    try {
      setSaving(true);
      const supabase = getSupabaseClient();
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        setSession(null);
        alert('Please sign in again.');
        return;
      }

      const ownedEvents = await fetchUserEventSummaries();
      setSavedEvents(ownedEvents);
      if (ownedEvents.length >= 1) {
        alert('Upgrade to Pro to create unlimited events');
        return;
      }

      const res = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ownerId: user.id,
          eventType, eventName, eventDate, eventLoc, dateTBD, locTBD,
          organizerName, organizerEmail,
          mode, inviteMode, goal: Number(goal) || 0,
          suggestionAmount: Number(suggestionAmount) || 0, suggestionUnit,
          customFieldLabel,
          responseDeadline: datetimeLocalToIso(responseDeadline),
          people, expenses, tipsEnabled,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        if (data.error === 'Upgrade to Pro to create unlimited events') {
          alert('Upgrade to Pro to create unlimited events');
          return;
        }
        throw new Error('Failed');
      }
      const data = await res.json();
      setEventId(data.id);
      saveEventToLocal({ id: data.id, name: eventName || 'Untitled event', updatedAt: Date.now() });
      const savedEvent = normalizeSavedEvent(data);
      setSavedEvents(savedEvent ? [savedEvent] : []);
      setScreen('dashboard');
    } catch (e) {
      alert("Couldn't save event — please try again.");
    } finally {
      setSaving(false);
    }
  };

  const renderScreen = () => {
    if (screen === 'welcome') return (
      <div style={{ padding: '40px 20px', textAlign: 'center' }}>
        <div style={{ fontSize: '52px', marginBottom: '8px' }}>⚓</div>
        <h1 style={{ fontSize: '32px', margin: '8px 0 4px', fontWeight: 500 }}>Helmr</h1>
        <p style={{ fontSize: '15px', color: '#666', margin: '0 0 24px' }}>Take the helm of your next group plan</p>

        {userEventsLoading && (
          <p style={{ fontSize: '13px', color: '#777', margin: '0 0 16px' }}>
            Loading your events...
          </p>
        )}

        {savedEvents.length > 0 && (
          <div style={{ textAlign: 'left', marginBottom: '24px' }}>
            <div style={{ fontSize: '11px', color: '#999', letterSpacing: '0.5px', marginBottom: '8px', textTransform: 'uppercase' }}>Your events</div>
            {savedEvents.map(ev => (
              <div key={ev.id} style={{ ...S.card, display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: loading ? 'wait' : 'pointer' }} onClick={() => !loading && resumeEvent(ev.id)}>
                <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
                  <div style={{ fontSize: '14px', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ev.name}</div>
                  <div style={{ fontSize: '11px', color: '#999', fontFamily: 'monospace' }}>{ev.id}</div>
                </div>
                <button style={{ ...S.btnGhost, fontSize: '11px', padding: '4px 8px' }} onClick={(e) => { e.stopPropagation(); if (confirm(`Remove "${ev.name}" from this list? (The event itself isn't deleted.)`)) { removeEventFromLocal(ev.id); setSavedEvents(prev => prev.filter(x => x.id !== ev.id)); } }}>✕</button>
              </div>
            ))}
          </div>
        )}

        <button style={{ ...S.btn, ...S.btnPrimary, marginBottom: '10px' }} onClick={startNewEvent}>Plan something new</button>
        <p style={{ fontSize: '11px', color: '#999', marginTop: '16px' }}>Prototype — events saved for 90 days</p>
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
      const updateOrganizerName = (newName) => {
        setOrganizerName(newName);
        setPeople(people.map(p => p.role === 'organizer' ? { ...p, name: newName || 'You' } : p));
      };
      return (
        <div style={{ padding: '20px' }}>
          <button style={S.btnGhost} onClick={() => setScreen('chooseType')}>← Back</button>
          <h2 style={{ fontSize: '22px', margin: '8px 0 16px', fontWeight: 500 }}>{t.icon} {t.label} details</h2>

          <label style={S.label}>How is this being paid for?</label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '4px' }}>
            <button
              onClick={() => {
                setMode('cost_split');
                // Cost Split only supports personal links — math relies on a known guest list.
                setInviteMode('personal');
              }}
              style={{ padding: '10px 8px', borderRadius: '10px', border: mode === 'cost_split' ? '2px solid #1a1a1a' : '0.5px solid #ddd', background: mode === 'cost_split' ? '#1a1a1a' : 'white', color: mode === 'cost_split' ? 'white' : '#1a1a1a', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left' }}
            >
              <div style={{ fontSize: '13px', fontWeight: 500 }}>Split a cost</div>
              <div style={{ fontSize: '11px', opacity: 0.75, marginTop: '2px' }}>Known total, split evenly</div>
            </button>
            <button
              onClick={() => setMode('open_pool')}
              style={{ padding: '10px 8px', borderRadius: '10px', border: mode === 'open_pool' ? '2px solid #1a1a1a' : '0.5px solid #ddd', background: mode === 'open_pool' ? '#1a1a1a' : 'white', color: mode === 'open_pool' ? 'white' : '#1a1a1a', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left' }}
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
              <label style={S.label}>How are you inviting people?</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '4px' }}>
                <button
                  onClick={() => setInviteMode('personal')}
                  style={{ padding: '10px 8px', borderRadius: '10px', border: inviteMode === 'personal' ? '2px solid #1a1a1a' : '0.5px solid #ddd', background: inviteMode === 'personal' ? '#1a1a1a' : 'white', color: inviteMode === 'personal' ? 'white' : '#1a1a1a', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left' }}
                >
                  <div style={{ fontSize: '13px', fontWeight: 500 }}>Personal links</div>
                  <div style={{ fontSize: '11px', opacity: 0.75, marginTop: '2px' }}>One link per guest, track who viewed</div>
                </button>
                <button
                  onClick={() => setInviteMode('broadcast')}
                  style={{ padding: '10px 8px', borderRadius: '10px', border: inviteMode === 'broadcast' ? '2px solid #1a1a1a' : '0.5px solid #ddd', background: inviteMode === 'broadcast' ? '#1a1a1a' : 'white', color: inviteMode === 'broadcast' ? 'white' : '#1a1a1a', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left' }}
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

          <label style={S.label}>Your name</label>
          <input style={S.input} placeholder="e.g. Sam" value={organizerName} onChange={e => updateOrganizerName(e.target.value)} />
          <div style={{ height: '14px' }} />

          <label style={S.label}>Your Interac e-Transfer email</label>
          <input style={S.input} type="email" placeholder="e.g. you@example.com" value={organizerEmail} onChange={e => setOrganizerEmail(e.target.value)} />
          <p style={{ fontSize: '11px', color: '#999', margin: '4px 0 0' }}>This is where guests send their contribution</p>
          <div style={{ height: '14px' }} />

          <label style={S.label}>Event name</label>
          <input style={S.input} placeholder="e.g. Layla's 30th" value={eventName} onChange={e => setEventName(e.target.value)} />
          <div style={{ height: '14px' }} />

          {mode === 'open_pool' && (
            <>
              <label style={S.label}>Suggested contribution (optional)</label>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <span style={{ fontSize: '14px', color: '#777' }}>$</span>
                <input style={S.input} type="number" min="0" placeholder="10" value={suggestionAmount || ''} onChange={e => setSuggestionAmount(e.target.value)} />
                <select
                  style={{ ...S.input, width: 'auto' }}
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

              <label style={S.label}>Goal (optional)</label>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <span style={{ fontSize: '14px', color: '#777' }}>$</span>
                <input style={S.input} type="number" min="0" placeholder="Leave blank for no target" value={goal || ''} onChange={e => setGoal(e.target.value)} />
              </div>
              <p style={{ fontSize: '11px', color: '#999', margin: '4px 0 0' }}>If you're trying to buy something specific.</p>
              <div style={{ height: '14px' }} />
            </>
          )}

          <label style={S.label}><input type="checkbox" checked={dateTBD} onChange={() => setDateTBD(!dateTBD)} style={{ marginRight: '4px' }} /> Date TBD</label>
          {!dateTBD && <input style={S.input} type="date" value={eventDate} onChange={e => setEventDate(e.target.value)} />}
          <div style={{ height: '14px' }} />

          <label style={S.label}><input type="checkbox" checked={locTBD} onChange={() => setLocTBD(!locTBD)} style={{ marginRight: '4px' }} /> Location TBD</label>
          {!locTBD && <input style={S.input} placeholder="Where?" value={eventLoc} onChange={e => setEventLoc(e.target.value)} />}
          <div style={{ height: '14px' }} />

          <label style={S.label}>
            Response deadline {mode === 'cost_split' ? <span style={{ color: '#a55' }}>*</span> : <span style={{ color: '#999', fontWeight: 400 }}>(optional)</span>}
          </label>
          <input
            style={S.input}
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

          <label style={S.label}>Ask each guest for… (optional)</label>
          <input
            style={S.input}
            placeholder={mode === 'open_pool' ? "e.g. Child's name" : "e.g. Dietary restriction"}
            value={customFieldLabel}
            onChange={e => setCustomFieldLabel(e.target.value)}
            maxLength={40}
          />
          <p style={{ fontSize: '11px', color: '#999', margin: '4px 0 0' }}>
            Adds a short text field on the guest page. Leave blank to skip.
          </p>
          <div style={{ height: '20px' }} />

          <button style={{ ...S.btn, ...S.btnPrimary, opacity: saving ? 0.6 : 1 }} disabled={saving} onClick={goToDashboard}>
            {saving ? 'Saving…' : 'Continue'}
          </button>
        </div>
      );
    }

    if (screen === 'dashboard') return (
      <div style={{ padding: '14px 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <div>
            <div style={{ fontSize: '11px', color: '#999', letterSpacing: '0.5px' }}>
              ORGANIZER VIEW {saving && <span style={{ color: '#aaa' }}>· saving…</span>}
            </div>
            <h2 style={{ fontSize: '20px', margin: '2px 0 0', fontWeight: 500 }}>{eventName || 'Your event'}</h2>
          </div>
          <button style={S.btnGhost} onClick={() => setScreen('welcome')}>← Home</button>
        </div>
        <div style={{ display: 'flex', borderBottom: '0.5px solid #eee', marginBottom: '14px' }}>
          {['overview', 'people', 'expenses', 'extras'].map(t => (
            <div key={t} style={{ ...S.tab, ...(tab === t ? S.tabActive : {}) }} onClick={() => setTab(t)}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </div>
          ))}
        </div>

        {deadlineDate && !isNaN(deadlineDate.getTime()) && (
          <div style={{
            padding: '8px 12px',
            borderRadius: '8px',
            marginBottom: '10px',
            fontSize: '12px',
            background: deadlinePassed ? '#fcebeb' : '#f5f3ee',
            color: deadlinePassed ? '#791f1f' : '#666',
            border: `0.5px solid ${deadlinePassed ? '#f09595' : '#e5e0d4'}`,
          }}>
            {deadlinePassed
              ? <>🔒 Closed to new joiners since {formatDeadline(deadlineDate)}. Already-confirmed guests can still pay.</>
              : <>⏰ Closes to new joiners on {formatDeadline(deadlineDate)}</>
            }
          </div>
        )}

        {tab === 'overview' && (
          <>
            {mode === 'cost_split' ? (
              <>
                <div style={S.card}>
                  <div style={S.label}>Total cost</div>
                  <div style={{ fontSize: '26px', fontWeight: 500 }}>${total.toLocaleString()}</div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <div style={S.card}>
                    <div style={S.label}>Confirmed</div>
                    <div style={{ fontSize: '18px', fontWeight: 500 }}>
                      {inviteMode === 'broadcast'
                        ? `${confirmed - (organizerIncludedInSplit ? 1 : 0)}`
                        : `${confirmed - (organizerIncludedInSplit ? 1 : 0)} / ${inviteeCount}`}
                      {organizerIncludedInSplit && <span style={{ fontSize: '12px', color: '#666', fontWeight: 400 }}> + you</span>}
                    </div>
                  </div>
                  <div style={S.card}>
                    <div style={S.label}>{sharesVary ? 'Per person (avg)' : 'Per person'}</div>
                    <div style={{ fontSize: '18px', fontWeight: 500 }}>${perPerson}</div>
                    {sharesVary && (
                      <div style={{ fontSize: '11px', color: '#999', marginTop: '2px' }}>
                        Range ${minShare}–${maxShare}
                      </div>
                    )}
                  </div>
                </div>
                {inviteMode === 'broadcast' && (
                  <div style={{ ...S.card, marginTop: '8px' }}>
                    <div style={S.label}>Link views</div>
                    <div style={{ fontSize: '18px', fontWeight: 500 }}>{viewCount}</div>
                  </div>
                )}
                {tipsEnabled && (() => {
                  const tipsTotal = people.reduce((s, p) => s + (Number(p.tipAmount) || 0), 0);
                  const tippers = people.filter(p => Number(p.tipAmount) > 0).length;
                  return (
                    <div style={{ ...S.card, marginTop: '8px' }}>
                      <div style={S.label}>🎩 Tips for you</div>
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
                <div style={S.card}>
                  <div style={S.label}>Pooled so far</div>
                  <div style={{ fontSize: '26px', fontWeight: 500 }}>${pooledTotal.toLocaleString()}</div>
                  {Number(goal) > 0 && (
                    <>
                      <div style={{ height: '6px', background: '#eee', borderRadius: '999px', marginTop: '10px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${Math.min(100, (pooledTotal / Number(goal)) * 100)}%`, background: '#085041' }} />
                      </div>
                      <div style={{ fontSize: '12px', color: '#777', marginTop: '6px' }}>Goal: ${Number(goal).toLocaleString()}</div>
                    </>
                  )}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  {inviteMode === 'broadcast' ? (
                    <>
                      <div style={S.card}>
                        <div style={S.label}>Link views</div>
                        <div style={{ fontSize: '18px', fontWeight: 500 }}>{viewCount}</div>
                      </div>
                      <div style={S.card}>
                        <div style={S.label}>Contributors</div>
                        <div style={{ fontSize: '18px', fontWeight: 500 }}>{contributorCount}</div>
                        {Number(suggestionAmount) > 0 && (
                          <div style={{ fontSize: '11px', color: '#999', marginTop: '2px' }}>
                            Suggested ${Number(suggestionAmount)} {suggestionUnit}
                          </div>
                        )}
                      </div>
                    </>
                  ) : (
                    <>
                      <div style={S.card}>
                        <div style={S.label}>Contributed</div>
                        <div style={{ fontSize: '18px', fontWeight: 500 }}>{contributorCount} / {inviteeCount}</div>
                      </div>
                      <div style={S.card}>
                        <div style={S.label}>Suggested</div>
                        <div style={{ fontSize: '18px', fontWeight: 500 }}>
                          {Number(suggestionAmount) > 0 ? `$${Number(suggestionAmount)}` : '—'}
                        </div>
                        {Number(suggestionAmount) > 0 && (
                          <div style={{ fontSize: '11px', color: '#999' }}>{suggestionUnit}</div>
                        )}
                      </div>
                    </>
                  )}
                </div>
                {tipsEnabled && (() => {
                  const tipsTotal = people.reduce((s, p) => s + (Number(p.tipAmount) || 0), 0);
                  const tippers = people.filter(p => Number(p.tipAmount) > 0).length;
                  return (
                    <div style={{ ...S.card, marginTop: '8px' }}>
                      <div style={S.label}>🎩 Tips for you</div>
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
                  <button
                    style={{
                      ...S.btn,
                      ...S.btnPrimary,
                      marginTop: '12px',
                      opacity: missingDeadline ? 0.5 : 1,
                      cursor: missingDeadline ? 'not-allowed' : 'pointer',
                    }}
                    disabled={missingDeadline}
                    onClick={() => setShareOpen(true)}
                  >
                    📋 {inviteMode === 'broadcast' ? 'Share the link' : 'Share invite links'}
                  </button>
                  <p style={{ fontSize: '11px', color: '#999', marginTop: '8px', textAlign: 'center' }}>Event ID: {eventId}</p>
                  {missingDeadline && (
                    <div style={{ ...S.card, marginTop: '12px', borderColor: '#f0c595', background: '#fdf6ec' }}>
                      <div style={{ fontSize: '13px', color: '#7a5320', marginBottom: '4px' }}>⚠️ Set a response deadline before sharing.</div>
                      <div style={{ fontSize: '12px', color: '#7a5320' }}>Guests need a clear "RSVP by" date so the math finalizes before they're asked to pay. Edit in the Extras tab.</div>
                    </div>
                  )}
                </>
              );
            })()}
            {!organizerEmail && (
              <div style={{ ...S.card, marginTop: '12px', borderColor: '#f0c595', background: '#fdf6ec' }}>
                <div style={{ fontSize: '13px', color: '#7a5320' }}>⚠️ Add your Interac email in the Extras tab so guests know where to send funds.</div>
              </div>
            )}
          </>
        )}

        {tab === 'people' && (
          <>
            {inviteMode === 'broadcast' && (
              <p style={{ fontSize: '12px', color: '#777', margin: '0 0 10px', padding: '8px 10px', background: '#f5f3ee', borderRadius: '8px' }}>
                Contributors will show up here as people pledge from the shared link.
              </p>
            )}
        {people.map(p => {
              const c = statusStyles[p.status];
              const isOrganizer = p.role === 'organizer';
              const contributed = Number(p.contributedAmount) || 0;
              const isBroadcastGuest = p.source === 'broadcast';
              const personShare = peopleShares.find(s => s.id === p.id);
              const shareAmt = personShare ? Math.round(personShare.share) : 0;
              const shouldShowShare = mode === 'cost_split' && (
                isOrganizer ? organizerIncludedInSplit : (p.status === 'confirmed' || p.status === 'paid')
              ) && shareAmt > 0;
              return (
                <div key={p.id} style={S.card}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                    <div style={{ fontSize: '15px', fontWeight: 500, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {p.name}
                      {isOrganizer && <span style={{ fontSize: '11px', color: '#999', fontWeight: 400 }}> · organizer</span>}
                      {p.viewedAt && !isOrganizer && <span style={{ fontSize: '11px', color: '#085041', fontWeight: 400 }}> · viewed</span>}
                      {isBroadcastGuest && <span style={{ fontSize: '11px', color: '#999', fontWeight: 400 }}> · self-added</span>}
                    </div>
                    {isOrganizer && mode === 'open_pool' && contributed > 0 && (
                      <span style={{ fontSize: '13px', fontWeight: 500, color: '#085041' }}>${contributed}</span>
                    )}
                    {!isOrganizer && mode === 'open_pool' && contributed > 0 && (
                      <span style={{ fontSize: '13px', fontWeight: 500, color: '#085041' }}>${contributed}</span>
                    )}
                    {shouldShowShare && (
                      <span style={{ fontSize: '13px', fontWeight: 500, color: '#085041' }}>${shareAmt}</span>
                    )}
                    {!isOrganizer && mode === 'cost_split' && (
                      <span style={{ ...S.pill, background: c?.bg || '#eee', color: c?.fg || '#666' }} onClick={() => cycleStatus(p.id)}>{p.status}</span>
                    )}
                    {!isOrganizer && mode === 'open_pool' && (
                      <span
                        style={{ ...S.pill, background: c?.bg || '#eeeae0', color: c?.fg || '#666' }}
                        onClick={() => cycleStatus(p.id)}
                      >
                        {p.status === 'invited' && contributed === 0 ? 'waiting' : p.status}
                      </span>
                    )}
                    {!isOrganizer && (
                      <button
                        style={{ ...S.btnGhost, padding: '4px' }}
                        onClick={() => {
                          const hasContributed = Number(p.contributedAmount) > 0;
                          const hasResponded = p.status && p.status !== 'invited';
                          let msg = `Remove ${p.name} from this event?`;
                          if (hasContributed) {
                            msg = `Remove ${p.name}? They've already contributed $${Number(p.contributedAmount)}. This will erase their record from the pool and can't be undone.`;
                          } else if (hasResponded) {
                            msg = `Remove ${p.name}? They've already responded (${p.status}). This can't be undone.`;
                          }
                          if (confirm(msg)) {
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
                          style={{ ...S.input, padding: '6px 8px', fontSize: '14px', flex: 1 }}
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
                      style={{ display: 'inline-block', marginTop: '6px', fontSize: '12px', color: '#085041', textDecoration: 'none', fontWeight: 500 }}
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
                <button style={S.btn} onClick={() => {
                  const n = prompt('Name?');
                  if (n) setPeople([...people, { id: newGuestId(), name: n, status: 'invited' }]);
                }}>+ Add person</button>
                <p style={{ fontSize: '11px', color: '#999', marginTop: '8px' }}>Guests can RSVP themselves from their link. Tap a status to manually override.</p>
              </>
            )}
          </>
        )}

        {tab === 'expenses' && (
          <>
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
                <div key={e.id} style={S.card}>
                  <input style={{ ...S.input, marginBottom: '8px' }} value={e.name} onChange={ev => setExpenses(expenses.map(x => x.id === e.id ? { ...x, name: ev.target.value } : x))} />
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <span style={{ fontSize: '14px', color: '#777' }}>$</span>
                    <input style={S.input} type="number" value={e.amount} onChange={ev => setExpenses(expenses.map(x => x.id === e.id ? { ...x, amount: ev.target.value } : x))} />
                    <button style={S.btnGhost} onClick={() => setExpenses(expenses.filter(x => x.id !== e.id))}>🗑️</button>
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
                            <p style={{ fontSize: '12px', color: '#999', margin: '4px 0' }}>Add people on the People tab first.</p>
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
                              style={{ ...S.btnGhost, fontSize: '12px', padding: '4px 0', marginTop: '4px' }}
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
            <button style={S.btn} onClick={() => {
              const n = prompt('Expense name?');
              if (n) setExpenses([...expenses, { id: Date.now(), name: n, amount: 0 }]);
            }}>+ Add expense</button>
          </>
        )}

        {tab === 'extras' && (
          <>
            <div style={S.card}>
              <div style={{ fontWeight: 500, marginBottom: '8px' }}>📝 Event details</div>

              <label style={S.label}>Event name</label>
              <input style={{ ...S.input, marginBottom: '10px' }} value={eventName} onChange={e => setEventName(e.target.value)} placeholder="e.g. Layla's 30th" />

              <label style={S.label}><input type="checkbox" checked={dateTBD} onChange={() => setDateTBD(!dateTBD)} style={{ marginRight: '4px' }} /> Date TBD</label>
              {!dateTBD && <input style={{ ...S.input, marginBottom: '10px' }} type="date" value={eventDate} onChange={e => setEventDate(e.target.value)} />}

              <label style={S.label}><input type="checkbox" checked={locTBD} onChange={() => setLocTBD(!locTBD)} style={{ marginRight: '4px' }} /> Location TBD</label>
              {!locTBD && <input style={{ ...S.input, marginBottom: '10px' }} placeholder="Where?" value={eventLoc} onChange={e => setEventLoc(e.target.value)} />}

              <label style={S.label}>
                Response deadline {mode === 'cost_split' ? <span style={{ color: '#a55' }}>*</span> : <span style={{ color: '#999', fontWeight: 400 }}>(optional)</span>}
              </label>
              <input
                style={{ ...S.input, marginBottom: '4px' }}
                type="datetime-local"
                value={responseDeadline}
                onChange={e => setResponseDeadline(e.target.value)}
              />
              <p style={{ fontSize: '11px', color: '#999', margin: '0 0 10px' }}>
                {mode === 'cost_split'
                  ? 'When RSVPs close. Guests see final share + payment details after this.'
                  : 'After this, new people can\u2019t join. Already-confirmed guests can still pay.'}
              </p>

              <label style={S.label}>Ask each guest for… (optional)</label>
              <input
                style={{ ...S.input, marginBottom: '4px' }}
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
              <div style={S.card}>
                <div style={{ fontWeight: 500, marginBottom: '8px' }}>💵 Pool settings</div>

                <label style={S.label}>Suggested contribution (optional)</label>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '10px' }}>
                  <span style={{ fontSize: '14px', color: '#777' }}>$</span>
                  <input style={S.input} type="number" min="0" placeholder="10" value={suggestionAmount || ''} onChange={e => setSuggestionAmount(e.target.value)} />
                  <select
                    style={{ ...S.input, width: 'auto' }}
                    value={suggestionUnit}
                    onChange={e => setSuggestionUnit(e.target.value)}
                  >
                    <option value="per person">per person</option>
                    <option value="per kid">per kid</option>
                    <option value="per family">per family</option>
                    <option value="total">total</option>
                  </select>
                </div>

                <label style={S.label}>Goal (optional)</label>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <span style={{ fontSize: '14px', color: '#777' }}>$</span>
                  <input style={S.input} type="number" min="0" placeholder="Leave blank for no target" value={goal || ''} onChange={e => setGoal(e.target.value)} />
                </div>
              </div>
            )}

            <div style={S.card}>
              <div style={{ fontWeight: 500, marginBottom: '4px' }}>💸 Your Interac email</div>
              <p style={{ fontSize: '12px', color: '#777', margin: '0 0 8px' }}>Where guests send their share</p>
              <input style={S.input} type="email" placeholder="you@example.com" value={organizerEmail} onChange={e => setOrganizerEmail(e.target.value)} />
            </div>
            <div style={S.card}>
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
            <div style={S.card}>
              <div style={{ fontWeight: 500, marginBottom: '4px' }}>🎁 Surprise gift</div>
              <p style={{ fontSize: '12px', color: '#777', margin: '0 0 8px' }}>Propose a gift; requires organizer approval</p>
              <button style={S.btn} onClick={() => alert('Surprise gift flow — propose a gift, organizer approves before it shows up to other guests.')}>+ Propose surprise gift</button>
            </div>
          </>
        )}
      </div>
    );
  };

  if (authLoading) {
    return (
      <div style={S.page}>
        <div style={{ ...S.frame, minHeight: '320px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666', fontSize: '14px' }}>
          Loading...
        </div>
      </div>
    );
  }

  if (!session) {
    return <Auth />;
  }

  return (
    <div style={S.page}>
      <div style={S.frame}>{renderScreen()}</div>
      <button style={S.feedbackBtn} onClick={() => setFeedbackOpen(true)}>💬 Feedback</button>
      <FeedbackModal open={feedbackOpen} onClose={() => setFeedbackOpen(false)} currentScreen={screen} />
      <ShareModal
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        event={eventId ? { id: eventId, people, inviteMode, eventName, mode } : null}
      />
    </div>
  );
}
