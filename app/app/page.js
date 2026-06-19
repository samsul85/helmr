'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import UpgradeModal from '../../components/UpgradeModal';
import AppDialog, { createDialogHelpers } from '../../components/AppDialog';
import BottomNav from '../../components/BottomNav';
import { participantsForExpense, computePersonShare } from '../../lib/shares';
import { BRAND, CREAM, DS, getEventColor, STATUS_STYLES, FONT, TEAL_LIGHT, TEXT_DARK, CARD_BORDER } from '../../lib/design';

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

const COMMUNITY_TYPE_IDS = ['fundraiser', 'potluck', 'gift', 'team', 'grad'];

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
  if (!event || typeof event !== 'object') return null;
  const id = event.id || event.eventId;
  if (!id) return null;
  return {
    id,
    name: event.name || event.eventName || 'Untitled event',
    eventType: event.eventType || 'other',
    mode: event.mode === 'open_pool' ? 'open_pool' : 'cost_split',
    responseDeadline: event.responseDeadline || '',
    total: Number(event.total) || 0,
    pooled: Number(event.pooled) || 0,
    goal: Number(event.goal) || 0,
    paidCount: Number(event.paidCount) || 0,
    guestCount: Number(event.guestCount) || 0,
    updatedAt: Number(event.updatedAt || event.createdAt) || Date.now(),
  };
}

function colorWithAlpha(hex, alpha) {
  const h = hex.replace('#', '');
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function isWelcomeEventDone(ev) {
  if (!ev.responseDeadline) return false;
  const d = new Date(ev.responseDeadline);
  return !isNaN(d.getTime()) && d.getTime() < Date.now();
}

function welcomeEventSubtitle(ev) {
  if (ev.mode === 'open_pool') {
    const collected = ev.pooled || 0;
    if (ev.goal > 0) {
      return `${ev.guestCount || 0} contributors · $${collected.toLocaleString()} of $${ev.goal.toLocaleString()}`;
    }
    return `${ev.guestCount || 0} contributors · $${collected.toLocaleString()} collected`;
  }
  const paid = ev.paidCount || 0;
  const guests = ev.guestCount || 0;
  const amount = ev.total || 0;
  if (guests > 0) {
    return `${paid} of ${guests} paid · $${amount.toLocaleString()} collected`;
  }
  return `$${amount.toLocaleString()} total`;
}

function welcomeEventProgress(ev) {
  if (ev.mode === 'open_pool') {
    if (ev.goal > 0) return Math.min(100, ((ev.pooled || 0) / ev.goal) * 100);
    return (ev.pooled || 0) > 0 ? 100 : 0;
  }
  if ((ev.guestCount || 0) > 0) {
    return Math.min(100, ((ev.paidCount || 0) / ev.guestCount) * 100);
  }
  return 0;
}

function getInitials(name) {
  const parts = (name || '?').trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return (parts[0]?.[0] || '?').toUpperCase();
}

function formatTimeAgo(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
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

  const refreshSavedEvents = () => {
    const events = loadSavedEvents().map(normalizeSavedEvent).filter(Boolean);
    setSavedEvents(events);
    return events;
  };

  useEffect(() => {
    refreshSavedEvents();
  }, []);

  useEffect(() => {
    if (screen === 'welcome') refreshSavedEvents();
  }, [screen]);

  const removeSavedEvent = async (ev) => {
    if (await dlg.confirm(`Remove "${ev.name}" from this list? (The event itself isn't deleted.)`)) {
      removeEventFromLocal(ev.id);
      setSavedEvents(prev => prev.filter(x => x.id !== ev.id));
    }
  };

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
      const guests = (data.people || []).filter(p => p.role !== 'organizer');
      const expenses = data.expenses || [];
      saveEventToLocal({
        id: data.id,
        name: data.eventName || 'Untitled event',
        eventType: data.eventType || 'other',
        mode: loadedMode,
        responseDeadline: data.responseDeadline || '',
        total: expenses.reduce((s, e) => s + (Number(e.amount) || 0), 0),
        pooled: (data.people || []).reduce((s, p) => s + (Number(p.contributedAmount) || 0), 0),
        goal: Number(data.goal) || 0,
        paidCount: guests.filter(p => p.status === 'paid').length,
        guestCount: guests.length,
        updatedAt: Date.now(),
      });
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
        if (eventId) {
          const guests = people.filter(p => p.role !== 'organizer');
          saveEventToLocal({
            id: eventId,
            name: eventName || 'Untitled event',
            eventType,
            mode,
            responseDeadline: datetimeLocalToIso(responseDeadline),
            total: expenses.reduce((s, e) => s + (Number(e.amount) || 0), 0),
            pooled: people.reduce((s, p) => s + (Number(p.contributedAmount) || 0), 0),
            goal: Number(goal) || 0,
            paidCount: guests.filter(p => p.status === 'paid').length,
            guestCount: guests.length,
            updatedAt: Date.now(),
          });
        }
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
        total: expenses.reduce((s, e) => s + (Number(e.amount) || 0), 0),
        pooled: 0,
        goal: Number(goal) || 0,
        paidCount: 0,
        guestCount: 0,
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
    if (screen === 'welcome') {
      const welcomeEvents = typeof window !== 'undefined'
        ? loadSavedEvents().map(normalizeSavedEvent).filter(Boolean)
        : savedEvents;
      const activeEventCount = welcomeEvents.filter(ev => !isWelcomeEventDone(ev)).length;
      const totalCollected = welcomeEvents.reduce(
        (sum, ev) => sum + (ev.mode === 'open_pool' ? (ev.pooled || 0) : (ev.total || 0)),
        0,
      );

      return (
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
        <div style={{
          background: TEAL_LIGHT,
          padding: '48px 24px 32px',
          display: 'flex',
          flexDirection: 'column',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
            <span style={{ fontSize: '20px', fontWeight: 600, color: BRAND, letterSpacing: '-0.01em' }}>helmr</span>
            <button type="button" aria-label="Notifications" style={{ background: 'none', border: 'none', padding: '4px', cursor: 'pointer' }}>
              <i className="ti ti-bell" style={{ fontSize: '22px', color: BRAND }} />
            </button>
          </div>

          <p style={{ margin: '0 0 8px', fontSize: '15px', color: TEXT_DARK, fontWeight: 500 }}>
            Hey {organizerName || 'there'} 👋
          </p>
          <h1 style={{
            margin: '0 0 20px',
            fontSize: '30px',
            color: TEXT_DARK,
            fontWeight: 500,
            lineHeight: 1.2,
            letterSpacing: '-0.02em',
          }}>
            Take the helm of your next group plan.
          </h1>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '20px' }}>
            <div style={{
              background: 'white',
              borderRadius: '18px',
              border: `0.5px solid ${CARD_BORDER}`,
              padding: '14px 16px',
            }}>
              <div style={{ fontSize: '12px', color: '#888', marginBottom: '4px' }}>Active events</div>
              <div style={{ fontSize: '26px', fontWeight: 500, color: TEXT_DARK, letterSpacing: '-0.02em' }}>
                {activeEventCount}
              </div>
            </div>
            <div style={{
              background: 'white',
              borderRadius: '18px',
              border: `0.5px solid ${CARD_BORDER}`,
              padding: '14px 16px',
            }}>
              <div style={{ fontSize: '12px', color: '#888', marginBottom: '4px' }}>Total collected</div>
              <div style={{ fontSize: '26px', fontWeight: 500, color: TEXT_DARK, letterSpacing: '-0.02em' }}>
                ${totalCollected.toLocaleString()}
              </div>
            </div>
          </div>

          <button style={{ ...DS.btn, ...DS.btnPrimary }} onClick={startNewEvent}>
            + Plan something new
          </button>
        </div>

        <div style={{ flex: 1, background: CREAM, padding: '20px 16px 24px' }}>
          <div style={DS.label}>Your events</div>

          {welcomeEvents.length === 0 && (
            <p style={{ fontSize: '13px', color: '#888', margin: '8px 0 0' }}>No saved events yet — plan something new to get started.</p>
          )}

          {welcomeEvents.map(ev => {
            const evColor = getEventColor(ev.eventType);
            const typeInfo = eventTypes.find(t => t.id === ev.eventType);
            const done = isWelcomeEventDone(ev);
            const progress = welcomeEventProgress(ev);
            return (
              <div
                key={ev.id}
                style={{
                  position: 'relative',
                  background: 'white',
                  borderRadius: '18px',
                  border: `0.5px solid ${CARD_BORDER}`,
                  padding: '16px',
                  marginBottom: '10px',
                  cursor: loading ? 'wait' : 'pointer',
                }}
                onClick={() => !loading && resumeEvent(ev.id)}
              >
                <button
                  type="button"
                  aria-label={`Remove ${ev.name}`}
                  style={{
                    position: 'absolute',
                    top: '10px',
                    right: '10px',
                    background: 'transparent',
                    border: 'none',
                    padding: '4px',
                    cursor: 'pointer',
                    color: '#bbb',
                    zIndex: 2,
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    removeSavedEvent(ev);
                  }}
                >
                  <i className="ti ti-x" style={{ fontSize: '16px' }} />
                </button>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                  <div style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '14px',
                    background: colorWithAlpha(evColor, 0.12),
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    <i className={`ti ${typeInfo?.tablerIcon || 'ti-plus'}`} style={{ fontSize: '22px', color: evColor }} />
                  </div>

                  <div style={{ flex: 1, minWidth: 0, paddingRight: '20px' }}>
                    <div style={{ fontSize: '15px', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: '2px' }}>
                      {ev.name}
                    </div>
                    <div style={{ fontSize: '12px', color: '#888' }}>
                      {welcomeEventSubtitle(ev)}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                    <span style={{
                      fontSize: '11px',
                      fontWeight: 500,
                      padding: '4px 10px',
                      borderRadius: '999px',
                      background: done ? '#eeeae0' : colorWithAlpha(evColor, 0.12),
                      color: done ? '#888' : evColor,
                    }}>
                      {done ? 'Done' : 'Active'}
                    </span>
                    <i className="ti ti-chevron-right" style={{ fontSize: '18px', color: '#ccc' }} />
                  </div>
                </div>

                <div style={{ height: '4px', background: '#f0ede6', borderRadius: '999px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${progress}%`, background: evColor, borderRadius: '999px', transition: 'width 0.3s' }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
      );
    }

    if (screen === 'chooseType') {
      const renderTypeGrid = (typeIds) => (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          {typeIds.map(id => {
            const e = eventTypes.find(t => t.id === id);
            if (!e) return null;
            const color = getEventColor(e.id);
            return (
              <div
                key={e.id}
                onClick={() => pickType(e.id)}
                style={{
                  aspectRatio: '1',
                  borderRadius: '16px',
                  background: color,
                  color: 'white',
                  cursor: 'pointer',
                  padding: '14px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  fontFamily: FONT,
                }}
              >
                <span style={{ fontSize: '24px', lineHeight: 1 }}>{e.icon}</span>
                <span style={{ fontSize: '13px', fontWeight: 500, lineHeight: 1.2 }}>{e.label}</span>
              </div>
            );
          })}
        </div>
      );

      return (
        <div style={{ minHeight: '85vh', background: CREAM }}>
          <div style={{ background: BRAND, color: 'white', padding: '16px 20px 20px' }}>
            <button
              type="button"
              onClick={() => setScreen('welcome')}
              style={{ background: 'none', border: 'none', color: 'white', padding: '4px 0', marginBottom: '8px', cursor: 'pointer', fontFamily: FONT, fontSize: '14px', display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              <i className="ti ti-arrow-left" style={{ fontSize: '18px' }} /> Back
            </button>
            <h2 style={{ margin: 0, fontSize: '22px', fontWeight: 500 }}>What are you planning?</h2>
          </div>

          <div style={{ padding: '16px' }}>
            <div style={{ ...DS.label, marginBottom: '10px' }}>Community</div>
            {renderTypeGrid(COMMUNITY_TYPE_IDS)}
            <div style={{ ...DS.label, marginTop: '20px', marginBottom: '10px' }}>Social</div>
            {renderTypeGrid(eventTypes.filter(t => !COMMUNITY_TYPE_IDS.includes(t.id)).map(t => t.id))}
          </div>
        </div>
      );
    }

    if (screen === 'details') {
      const t = eventTypes.find(e => e.id === eventType);
      const updateOrganizerName = (newName) => {
        setOrganizerName(newName);
        setPeople(people.map(p => p.role === 'organizer' ? { ...p, name: newName || 'You' } : p));
      };
      const accent = getEventColor(eventType);
      const pillToggle = (active) => ({
        flex: 1,
        padding: '12px 16px',
        borderRadius: '999px',
        border: active ? 'none' : '0.5px solid #ccc',
        background: active ? BRAND : 'white',
        color: active ? 'white' : '#666',
        cursor: 'pointer',
        fontFamily: FONT,
        fontSize: '14px',
        fontWeight: 500,
      });
      const fieldBlock = (icon, label, children, hint) => (
        <div style={{ marginBottom: '16px' }}>
          <label style={DS.fieldLabel}><i className={`ti ${icon}`} style={{ fontSize: '14px' }} />{label}</label>
          {children}
          {hint && <p style={{ fontSize: '11px', color: '#999', margin: '6px 0 0' }}>{hint}</p>}
        </div>
      );
      return (
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: '85vh', background: CREAM }}>
          <div style={{ background: accent, color: 'white', padding: '16px 20px' }}>
            <button type="button" onClick={() => setScreen('chooseType')} style={{ background: 'none', border: 'none', color: 'white', padding: '4px 0', marginBottom: '12px', cursor: 'pointer', fontFamily: FONT, fontSize: '14px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <i className="ti ti-arrow-left" style={{ fontSize: '18px' }} /> Back
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span style={{ fontSize: '24px' }}>{t.icon}</span>
              <span style={{ fontSize: '15px', fontWeight: 500, opacity: 0.9 }}>{t.label}</span>
            </div>
            <h2 style={{ margin: 0, fontSize: '22px', fontWeight: 500 }}>Event details</h2>
          </div>

          <div style={{ flex: 1, padding: '20px 16px', overflow: 'auto' }}>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
              <button type="button" style={pillToggle(mode === 'cost_split')} onClick={() => { setMode('cost_split'); setInviteMode('personal'); }}>Split a cost</button>
              <button type="button" style={pillToggle(mode === 'open_pool')} onClick={() => setMode('open_pool')}>Open pool</button>
            </div>

            {mode === 'open_pool' && (
              <>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                  <button type="button" style={pillToggle(inviteMode === 'personal')} onClick={() => setInviteMode('personal')}>Personal links</button>
                  <button type="button" style={pillToggle(inviteMode === 'broadcast')} onClick={() => setInviteMode('broadcast')}>One shared link</button>
                </div>
              </>
            )}

            {fieldBlock('ti-tag', 'Event name', <input style={DS.input} placeholder="e.g. Layla's 30th" value={eventName} onChange={e => setEventName(e.target.value)} />)}
            {fieldBlock('ti-user', 'Your name', <input style={DS.input} placeholder="e.g. Sam" value={organizerName} onChange={e => updateOrganizerName(e.target.value)} />)}
            {fieldBlock('ti-mail', 'Interac e-Transfer email', <input style={DS.input} type="email" placeholder="e.g. you@example.com" value={organizerEmail} onChange={e => setOrganizerEmail(e.target.value)} />, 'This is where guests send their contribution')}

            {mode === 'open_pool' && (
              <>
                {fieldBlock('ti-coin', 'Suggested contribution (optional)', (
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <span style={{ fontSize: '14px', color: '#777' }}>$</span>
                    <input style={{ ...DS.input, flex: 1 }} type="number" min="0" placeholder="10" value={suggestionAmount || ''} onChange={e => setSuggestionAmount(e.target.value)} />
                    <select style={{ ...DS.input, width: 'auto' }} value={suggestionUnit} onChange={e => setSuggestionUnit(e.target.value)}>
                      <option value="per person">per person</option>
                      <option value="per kid">per kid</option>
                      <option value="per family">per family</option>
                      <option value="total">total</option>
                    </select>
                  </div>
                ))}
                {fieldBlock('ti-target', 'Goal (optional)', (
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <span style={{ fontSize: '14px', color: '#777' }}>$</span>
                    <input style={DS.input} type="number" min="0" placeholder="Leave blank for no target" value={goal || ''} onChange={e => setGoal(e.target.value)} />
                  </div>
                ))}
              </>
            )}

            {fieldBlock('ti-calendar', 'Date', (
              <>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#666', marginBottom: '8px' }}>
                  <input type="checkbox" checked={dateTBD} onChange={() => setDateTBD(!dateTBD)} /> Date TBD
                </label>
                {!dateTBD && <input style={DS.input} type="date" value={eventDate} onChange={e => setEventDate(e.target.value)} />}
              </>
            ))}
            {fieldBlock('ti-map-pin', 'Location', (
              <>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#666', marginBottom: '8px' }}>
                  <input type="checkbox" checked={locTBD} onChange={() => setLocTBD(!locTBD)} /> Location TBD
                </label>
                {!locTBD && <input style={DS.input} placeholder="Where?" value={eventLoc} onChange={e => setEventLoc(e.target.value)} />}
              </>
            ))}
            {fieldBlock('ti-clock', `Response deadline${mode === 'cost_split' ? ' *' : ''}`, (
              <input style={DS.input} type="datetime-local" value={responseDeadline} onChange={e => setResponseDeadline(e.target.value)} />
            ), mode === 'cost_split' ? 'When RSVPs close. Guests see final share + payment details after this.' : 'After this, new people can\u2019t join.')}

            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 16px', background: 'white', borderRadius: '18px', border: `0.5px solid ${CARD_BORDER}`, cursor: 'pointer', marginBottom: '16px' }}>
              <input type="checkbox" checked={tipsEnabled} onChange={e => setTipsEnabled(e.target.checked)} style={{ width: '18px', height: '18px' }} />
              <span style={{ fontSize: '14px', fontWeight: 500 }}>Allow guests to tip the planner</span>
            </label>

            {fieldBlock('ti-forms', 'Ask each guest for… (optional)', (
              <input style={DS.input} placeholder={mode === 'open_pool' ? "e.g. Child's name" : "e.g. Dietary restriction"} value={customFieldLabel} onChange={e => setCustomFieldLabel(e.target.value)} maxLength={40} />
            ))}
          </div>

          <div style={DS.stickyBottom}>
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

      const paidCount = guestList.filter(p => p.status === 'paid').length;
      const pendingCount = guestList.filter(p => p.status !== 'paid' && p.status !== 'declined').length;
      const declinedCount = guestList.filter(p => p.status === 'declined').length;
      const confirmedGuests = confirmed - (organizerIncludedInSplit ? 1 : 0);
      const goalNum = Number(goal) || 0;
      const fundedPct = goalNum > 0 ? Math.min(100, Math.round((pooledTotal / goalNum) * 100)) : null;
      const toGo = goalNum > 0 ? Math.max(0, goalNum - pooledTotal) : null;
      const missingDeadline = mode === 'cost_split' && !responseDeadline;
      const contributors = people.filter(p => Number(p.contributedAmount) > 0);

      return (
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
        <div style={{ background: BRAND, color: 'white', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            type="button"
            aria-label="Back to events"
            onClick={() => setScreen('welcome')}
            style={{ background: 'none', border: 'none', color: 'white', padding: '4px', cursor: 'pointer', display: 'flex' }}
          >
            <i className="ti ti-arrow-left" style={{ fontSize: '20px' }} />
          </button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '16px', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {eventName || 'Your event'}
            </div>
            {saving && <span style={{ fontSize: '11px', opacity: 0.7 }}>saving…</span>}
          </div>
          <button
            type="button"
            aria-label="Settings menu"
            onClick={() => setTab('settings')}
            style={{ background: 'none', border: 'none', color: 'white', padding: '4px', cursor: 'pointer', display: 'flex' }}
          >
            <i className="ti ti-dots" style={{ fontSize: '20px' }} />
          </button>
        </div>

        <div style={{ padding: '0 0 80px' }}>
          {deadlineDate && !isNaN(deadlineDate.getTime()) && (
            <div style={{
              padding: '8px 12px',
              borderRadius: '12px',
              margin: '16px 16px 0',
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

        {tab === 'home' && mode === 'cost_split' && (
          <>
            <div style={{
              background: accentColor,
              color: 'white',
              borderRadius: '20px',
              padding: '20px',
              margin: '16px',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                <span style={{ fontSize: '12px', fontWeight: 500, background: 'rgba(255,255,255,0.25)', padding: '4px 12px', borderRadius: '999px' }}>Cost Split</span>
                <span style={{ fontSize: '28px' }}>{typeInfo?.icon || '📋'}</span>
              </div>
              <div style={{ fontSize: '13px', opacity: 0.85, marginBottom: '4px' }}>Total cost</div>
              <div style={{ ...DS.statNumber, color: 'white', marginBottom: '16px' }}>${total.toLocaleString()}</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div style={{ background: 'rgba(255,255,255,0.2)', borderRadius: '12px', padding: '12px' }}>
                  <div style={{ fontSize: '11px', opacity: 0.85, marginBottom: '4px' }}>{sharesVary ? 'Avg/person' : 'Per person'}</div>
                  <div style={{ fontSize: '18px', fontWeight: 600 }}>${sharesVary ? `${minShare}–${maxShare}` : perPerson}</div>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.2)', borderRadius: '12px', padding: '12px' }}>
                  <div style={{ fontSize: '11px', opacity: 0.85, marginBottom: '4px' }}>Confirmed</div>
                  <div style={{ fontSize: '18px', fontWeight: 600 }}>
                    {confirmedGuests}{inviteMode !== 'broadcast' ? ` / ${inviteeCount}` : ''}
                  </div>
                </div>
              </div>
            </div>

            {guestList.length > 0 && (
              <div style={{ ...DS.card, margin: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <div style={{ fontSize: '15px', fontWeight: 500 }}>Payment progress</div>
                  <div style={{ fontSize: '13px', color: '#888' }}>{paidCount} of {guestList.length} paid</div>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {guestList.map(p => {
                    const isPaid = p.status === 'paid';
                    const isDeclined = p.status === 'declined';
                    return (
                      <div
                        key={p.id}
                        title={`${p.name} — ${p.status}`}
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: '50%',
                          background: isPaid ? BRAND : 'white',
                          border: isPaid ? 'none' : isDeclined ? '2px solid #E8645A' : `1.5px solid ${CARD_BORDER}`,
                          flexShrink: 0,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '11px',
                          fontWeight: 600,
                          color: isPaid ? 'white' : isDeclined ? '#E8645A' : '#666',
                        }}
                      >
                        {isPaid ? <i className="ti ti-check" style={{ fontSize: '14px' }} /> : isDeclined ? <i className="ti ti-x" style={{ fontSize: '14px' }} /> : getInitials(p.name)}
                      </div>
                    );
                  })}
                </div>
                <div style={{ display: 'flex', gap: '16px', marginTop: '12px', fontSize: '12px', color: '#888' }}>
                  <span>{paidCount} paid</span>
                  <span>{pendingCount} pending</span>
                  <span>{declinedCount} declined</span>
                </div>
              </div>
            )}

            <div style={{ ...DS.label, margin: '0 16px 8px' }}>Guests ({guestList.length})</div>
            {guestList.map(p => {
              const c = STATUS_STYLES[p.status];
              const personShare = peopleShares.find(s => s.id === p.id);
              const shareAmt = personShare ? Math.round(personShare.share) : 0;
              const showAmt = (p.status === 'confirmed' || p.status === 'paid') && shareAmt > 0;
              return (
                <div
                  key={p.id}
                  onClick={() => cycleStatus(p.id)}
                  style={{
                    background: 'white',
                    padding: '14px',
                    borderRadius: '14px',
                    margin: '0 16px 8px',
                    border: `0.5px solid ${CARD_BORDER}`,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{
                    width: 36,
                    height: 36,
                    borderRadius: '50%',
                    background: colorWithAlpha(accentColor, 0.12),
                    color: accentColor,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '13px',
                    fontWeight: 600,
                    flexShrink: 0,
                  }}>
                    {getInitials(p.name)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '15px', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                    <span style={{ ...DS.pill, background: c?.bg || '#eee', color: c?.fg || '#666', marginTop: '4px', display: 'inline-block' }}>{p.status}</span>
                  </div>
                  {showAmt && (
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontSize: '15px', fontWeight: 600, color: BRAND }}>${shareAmt}</div>
                      <div style={{ fontSize: '11px', color: '#999' }}>{p.status === 'paid' ? 'received' : 'owed'}</div>
                    </div>
                  )}
                </div>
              );
            }            )}

            {missingDeadline && (
              <div style={{ ...DS.card, margin: '12px 16px 0', borderColor: '#f0c595', background: '#fdf6ec' }}>
                <div style={{ fontSize: '13px', color: '#7a5320', marginBottom: '4px' }}>⚠️ Set a response deadline before sharing.</div>
                <div style={{ fontSize: '12px', color: '#7a5320' }}>Guests need a clear "RSVP by" date so the math finalizes before they're asked to pay. Edit in the Settings tab.</div>
              </div>
            )}
            {!organizerEmail && (
              <div style={{ ...DS.card, margin: '12px 16px 0', borderColor: '#f0c595', background: '#fdf6ec' }}>
                <div style={{ fontSize: '13px', color: '#7a5320' }}>⚠️ Add your Interac email in the Settings tab so guests know where to send funds.</div>
              </div>
            )}
          </>
        )}

        {tab === 'home' && mode === 'open_pool' && (
          <>
            <div style={{
              background: accentColor,
              color: 'white',
              borderRadius: '20px',
              padding: '20px',
              margin: '16px',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                <span style={{ fontSize: '12px', fontWeight: 500, background: 'rgba(255,255,255,0.25)', padding: '4px 12px', borderRadius: '999px' }}>Open Pool</span>
                <i className="ti ti-link" style={{ fontSize: '22px', opacity: 0.9 }} />
              </div>
              <div style={{ fontSize: '13px', opacity: 0.85, marginBottom: '4px' }}>Pooled so far</div>
              <div style={{ ...DS.statNumber, color: 'white' }}>
                ${pooledTotal.toLocaleString()}
                {goalNum > 0 && <span style={{ fontSize: '18px', fontWeight: 400, opacity: 0.85 }}> of ${goalNum.toLocaleString()}</span>}
              </div>
              {goalNum > 0 && (
                <>
                  <div style={{ height: '6px', background: 'rgba(255,255,255,0.35)', borderRadius: '999px', marginTop: '14px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${fundedPct}%`, background: 'white', borderRadius: '999px' }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', fontSize: '13px', opacity: 0.9 }}>
                    <span>{fundedPct}% funded</span>
                    <span>${toGo.toLocaleString()} to go</span>
                  </div>
                </>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', margin: '0 16px 16px' }}>
              <div style={{ ...DS.card, marginBottom: 0 }}>
                <div style={DS.label}>Contributors</div>
                <div style={{ fontSize: '20px', fontWeight: 500 }}>{contributorCount}</div>
              </div>
              <div style={{ ...DS.card, marginBottom: 0 }}>
                <div style={DS.label}>Suggested</div>
                <div style={{ fontSize: '20px', fontWeight: 500 }}>
                  {Number(suggestionAmount) > 0 ? `$${Number(suggestionAmount)}` : '—'}
                </div>
                {Number(suggestionAmount) > 0 && (
                  <div style={{ fontSize: '11px', color: '#999', marginTop: '2px' }}>{suggestionUnit}</div>
                )}
              </div>
            </div>

            <button
              type="button"
              style={{
                ...DS.btn,
                background: accentColor,
                color: 'white',
                border: 'none',
                margin: '0 16px 16px',
                width: 'calc(100% - 32px)',
              }}
              onClick={() => setShareOpen(true)}
            >
              <i className="ti ti-share" style={{ marginRight: '6px' }} />
              {inviteMode === 'broadcast' ? 'Share the link' : 'Share invite links'}
            </button>

            {tipsEnabled && (() => {
              const tipsTotal = people.reduce((s, p) => s + (Number(p.tipAmount) || 0), 0);
              return (
                <div style={{
                  margin: '0 16px 16px',
                  padding: '12px 16px',
                  background: '#fdf6ec',
                  borderRadius: '14px',
                  border: '0.5px solid #f0d9a8',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  fontSize: '14px',
                  color: '#7a5320',
                }}>
                  <span>❤️</span>
                  <span><strong>${tipsTotal}</strong> in tips received</span>
                </div>
              );
            })()}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '0 16px 8px' }}>
              <div style={DS.label}>Contributors ({contributorCount})</div>
              <div style={{ fontSize: '15px', fontWeight: 600, color: BRAND }}>${pooledTotal.toLocaleString()}</div>
            </div>
            {contributors.map(p => {
              const contributed = Number(p.contributedAmount) || 0;
              const tipAmt = Number(p.tipAmount) || 0;
              return (
                <div
                  key={p.id}
                  style={{
                    background: 'white',
                    padding: '14px',
                    borderRadius: '14px',
                    margin: '0 16px 8px',
                    border: `0.5px solid ${CARD_BORDER}`,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                  }}
                >
                  <div style={{
                    width: 36,
                    height: 36,
                    borderRadius: '50%',
                    background: colorWithAlpha(accentColor, 0.12),
                    color: accentColor,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '13px',
                    fontWeight: 600,
                    flexShrink: 0,
                  }}>
                    {getInitials(p.name)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '15px', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                    <div style={{ fontSize: '12px', color: '#999', marginTop: '2px' }}>
                      {formatTimeAgo(p.contributedAt || p.rsvpAt)}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: '15px', fontWeight: 600, color: BRAND }}>${contributed}</div>
                    {tipAmt > 0 && <div style={{ fontSize: '11px', color: '#999' }}>+${tipAmt} tip</div>}
                  </div>
                </div>
              );
            })}

            {!organizerEmail && (
              <div style={{ ...DS.card, margin: '12px 16px 0', borderColor: '#f0c595', background: '#fdf6ec' }}>
                <div style={{ fontSize: '13px', color: '#7a5320' }}>⚠️ Add your Interac email in the Settings tab so guests know where to send funds.</div>
              </div>
            )}
          </>
        )}

        {tab === 'guests' && (
          <div style={{ padding: '16px' }}>
            {inviteMode === 'broadcast' && (
              <p style={{ fontSize: '12px', color: '#777', margin: '0 0 12px', padding: '10px 14px', background: '#f5f3ee', borderRadius: '14px' }}>
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
                <div key={p.id} style={{ ...DS.card, marginBottom: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      width: 36,
                      height: 36,
                      borderRadius: '50%',
                      background: colorWithAlpha(accentColor, 0.12),
                      color: accentColor,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '13px',
                      fontWeight: 600,
                      flexShrink: 0,
                    }}>
                      {getInitials(p.name)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
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
                    </div>
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
                <button style={{ ...DS.btn, marginTop: '4px' }} onClick={async () => {
                  const n = await dlg.prompt('Name?');
                  if (n) setPeople([...people, { id: newGuestId(), name: n, status: 'invited' }]);
                }}>+ Add person</button>
                <p style={{ fontSize: '11px', color: '#999', marginTop: '8px' }}>Guests can RSVP themselves from their link. Tap a status to manually override.</p>
              </>
            )}
          </div>
        )}

        {tab === 'expenses' && (
          <div style={{ padding: '16px' }}>
            <div style={{ ...DS.statNumber, color: accentColor, marginBottom: '16px' }}>
              ${total.toLocaleString()}
              <span style={{ fontSize: '13px', color: '#888', fontWeight: 400, marginLeft: '8px' }}>total</span>
            </div>
            {mode === 'open_pool' && (
              <p style={{ fontSize: '12px', color: '#777', margin: '0 0 12px', padding: '10px 14px', background: '#f5f3ee', borderRadius: '14px' }}>
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
                <div key={e.id} style={{ ...DS.card, marginBottom: '10px' }}>
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
                          padding: '10px 14px',
                          background: '#f5f3ee',
                          borderRadius: '14px',
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
            <button style={{ ...DS.btn, marginTop: '4px' }} onClick={async () => {
              const n = await dlg.prompt('Expense name?');
              if (n) setExpenses([...expenses, { id: Date.now(), name: n, amount: 0 }]);
            }}>+ Add expense</button>
          </div>
        )}

        {tab === 'settings' && (
          <div style={{ padding: '16px' }}>
            <div style={{ ...DS.card, marginBottom: '10px' }}>
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

            <div style={{ ...DS.card, marginBottom: '10px' }}>
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
              <div style={{ ...DS.card, marginBottom: '10px' }}>
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

            <div style={{ ...DS.card, marginBottom: '10px' }}>
              <div style={{ fontWeight: 500, marginBottom: '4px' }}>💸 Your Interac email</div>
              <p style={{ fontSize: '12px', color: '#777', margin: '0 0 8px' }}>Where guests send their share</p>
              <input style={DS.input} type="email" placeholder="you@example.com" value={organizerEmail} onChange={e => setOrganizerEmail(e.target.value)} />
            </div>
            <div style={{ ...DS.card, marginBottom: '10px' }}>
              <div style={{ fontWeight: 500, marginBottom: '4px' }}>🔔 Email notifications</div>
              <p style={{ fontSize: '12px', color: '#777', margin: '0 0 10px' }}>
                Choose when Helmr emails you about guest activity.
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setNotificationPreference('live')}
                  style={{
                    padding: '12px 16px',
                    borderRadius: '999px',
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
                    padding: '12px 16px',
                    borderRadius: '999px',
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
            <div style={{ ...DS.card, marginBottom: '10px' }}>
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
            <div style={{ ...DS.card, marginBottom: '10px' }}>
              <div style={{ fontWeight: 500, marginBottom: '4px' }}>🎁 Surprise gift</div>
              <p style={{ fontSize: '12px', color: '#777', margin: '0 0 8px' }}>Propose a gift; requires organizer approval</p>
              <button style={DS.btn} onClick={async () => { await dlg.alert('Surprise gift flow — propose a gift, organizer approves before it shows up to other guests.'); }}>+ Propose surprise gift</button>
            </div>
          </div>
        )}
        </div>

        {tab === 'home' && mode === 'cost_split' && (
          <div style={DS.stickyBottom}>
            <button
              type="button"
              style={{
                ...DS.btn,
                ...DS.btnPrimary,
                opacity: missingDeadline ? 0.6 : 1,
              }}
              disabled={missingDeadline}
              onClick={() => !missingDeadline && setShareOpen(true)}
            >
              {inviteMode === 'broadcast' ? 'Share the link' : 'Share invite links'}
            </button>
          </div>
        )}
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
          <div style={{ flex: 1, overflow: 'auto', WebkitOverflowScrolling: 'touch' }}>{renderScreen()}</div>
        )}
      </div>
      {screen === 'dashboard' && (
        <BottomNav
          activeTab={tab}
          onHome={() => setScreen('welcome')}
          onActivity={() => setTab('home')}
          onTabChange={setTab}
          onNewEvent={startNewEvent}
        />
      )}
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
