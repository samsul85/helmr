import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

// Generate a short, friendly event ID (7 chars, no ambiguous chars)
export function generateEventId() {
  const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
  let id = '';
  for (let i = 0; i < 7; i++) id += chars[Math.floor(Math.random() * chars.length)];
  return id;
}

export function generateGuestId() {
  return 'g' + Math.random().toString(36).slice(2, 9);
}

const KEY = (id) => `event:${id}`;

export async function createEvent(event) {
  const id = generateEventId();
  const record = {
    ...event,
    id,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  await redis.set(KEY(id), record, { ex: 60 * 60 * 24 * 90 });
  return record;
}

export async function getEvent(id) {
  if (!id) return null;
  const event = await redis.get(KEY(id));
  return event || null;
}

export async function updateEvent(id, event) {
  const existing = await getEvent(id);
  if (!existing) return null;

  // People-list merge to prevent autosave from clobbering server-managed fields.
  //
  // Two protections, both important:
  //
  // 1. Preserve broadcast contributors who joined after the client's last sync.
  //    Rule: if incoming people list doesn't contain a server person whose ID
  //    is also not in knownGuestIds, that person joined after the client's
  //    last load — keep them. If their ID IS in knownGuestIds, the client
  //    explicitly removed them, so let the delete go through.
  //
  // 2. Merge server-managed fields onto people present in both lists.
  //    Fields like paymentScreenshotKey, viewedAt, rsvpAt are set by guest-side
  //    endpoints (POST /screenshot, POST /rsvp, POST /contribute) and the
  //    organizer's autosave doesn't know about new values that arrived between
  //    polls. If the incoming person doesn't have a value but the existing
  //    one does, keep the existing value.
  const SERVER_MANAGED_FIELDS = [
    'viewedAt', 'rsvpAt', 'contributedAmount', 'tipAmount',
    'paymentScreenshotKey', 'paymentScreenshotUploadedAt',
    'customFieldValue', 'source',
  ];

  let nextPeople = event.people;
  if (Array.isArray(event.people)) {
    const existingById = new Map((existing.people || []).map(p => [p.id, p]));
    const incomingIds = new Set(event.people.map(p => p.id));
    const knownIds = new Set(Array.isArray(event.knownGuestIds) ? event.knownGuestIds : []);

    // Merge server-managed fields into incoming people who already exist on the server.
    const mergedIncoming = event.people.map(p => {
      const prior = existingById.get(p.id);
      if (!prior) return p;
      const next = { ...p };
      for (const field of SERVER_MANAGED_FIELDS) {
        // Keep prior value if incoming doesn't have one. This protects new
        // uploads, RSVPs, contributions etc. from being clobbered by an
        // organizer autosave that hasn't seen them yet.
        if ((next[field] === undefined || next[field] === null) && prior[field] !== undefined) {
          next[field] = prior[field];
        }
      }
      // Status: incoming wins for explicit cycles, but never downgrade 'paid' → anything else
      // unless the incoming person is going to 'declined' (organizer-explicit move).
      if (prior.status === 'paid' && next.status !== 'paid' && next.status !== 'declined') {
        next.status = 'paid';
      }
      return next;
    });

    // Append broadcast survivors the client doesn't know about
    const survivors = (existing.people || []).filter(p =>
      p.source === 'broadcast' && !incomingIds.has(p.id) && !knownIds.has(p.id)
    );
    nextPeople = [...mergedIncoming, ...survivors];
  }

  const cleanEvent = { ...event };
  // knownGuestIds is a transport-only hint; don't persist it.
  delete cleanEvent.knownGuestIds;
  if (nextPeople !== undefined) cleanEvent.people = nextPeople;

  const merged = { ...existing, ...cleanEvent, id, updatedAt: Date.now() };
  await redis.set(KEY(id), merged, { ex: 60 * 60 * 24 * 90 });
  return merged;
}

export async function markGuestViewed(eventId, guestId) {
  const event = await getEvent(eventId);
  if (!event) return null;
  const people = (event.people || []).map(p => {
    if (p.id !== guestId) return p;
    return p.viewedAt ? p : { ...p, viewedAt: Date.now() };
  });
  return updateEvent(eventId, { people });
}

// True if the event's response deadline has passed.
function deadlineHasPassed(event) {
  if (!event || !event.responseDeadline) return false;
  const t = new Date(event.responseDeadline).getTime();
  return Number.isFinite(t) && t < Date.now();
}

// Whether this existing guest record counts as "already in" — used to allow
// payment/status updates after the response deadline (lenient mode).
function guestIsAlreadyIn(guest) {
  if (!guest) return false;
  if (Number(guest.contributedAmount) > 0) return true;
  if (guest.status && guest.status !== 'invited') return true;
  return false;
}

// For any event: record a guest's tip amount (planner tip).
// Only allowed while the event hasn't passed its deadline.
export async function setGuestTip(eventId, guestId, amount) {
  const event = await getEvent(eventId);
  if (!event) return null;
  if (!event.tipsEnabled) return { disabled: true };
  const existing = (event.people || []).find(p => p.id === guestId);
  // Tips can be edited before deadline; after deadline only already-in guests can adjust.
  if (deadlineHasPassed(event) && !guestIsAlreadyIn(existing)) {
    return { closed: true };
  }
  const tip = Math.max(0, Math.min(99999, Number(amount) || 0));
  const people = (event.people || []).map(p => {
    if (p.id !== guestId) return p;
    return { ...p, tipAmount: tip };
  });
  return updateEvent(eventId, { people });
}

// For Open Pool events: record a guest's contribution amount
export async function setGuestContribution(eventId, guestId, amount, customFieldValue) {
  const event = await getEvent(eventId);
  if (!event) return null;
  const existing = (event.people || []).find(p => p.id === guestId);
  // After deadline, only already-in guests can still update their contribution.
  if (deadlineHasPassed(event) && !guestIsAlreadyIn(existing)) {
    return { closed: true };
  }
  const cleanCustom = customFieldValue != null ? String(customFieldValue).trim().slice(0, 120) : undefined;
  const people = (event.people || []).map(p => {
    if (p.id !== guestId) return p;
    const next = {
      ...p,
      contributedAmount: Number(amount) || 0,
      status: 'confirmed',
      rsvpAt: Date.now(),
    };
    if (cleanCustom !== undefined) next.customFieldValue = cleanCustom;
    return next;
  });
  return updateEvent(eventId, { people });
}

// Broadcast mode: increment a simple view counter
export async function incrementViewCount(eventId) {
  const event = await getEvent(eventId);
  if (!event) return null;
  const viewCount = (Number(event.viewCount) || 0) + 1;
  return updateEvent(eventId, { viewCount });
}

// Broadcast mode: create a new self-signed-up contributor
export async function addBroadcastContribution(eventId, name, amount, customFieldValue) {
  const event = await getEvent(eventId);
  if (!event) return null;
  // After deadline, new broadcast contributors are blocked entirely.
  if (deadlineHasPassed(event)) {
    return { closed: true };
  }
  const cleanName = String(name || '').trim().slice(0, 80) || 'Anonymous';
  const amt = Number(amount) || 0;
  const cleanCustom = customFieldValue != null ? String(customFieldValue).trim().slice(0, 120) : '';
  const newGuest = {
    id: generateGuestId(),
    name: cleanName,
    status: 'confirmed',
    contributedAmount: amt,
    rsvpAt: Date.now(),
    source: 'broadcast',
  };
  if (cleanCustom) newGuest.customFieldValue = cleanCustom;
  const people = [...(event.people || []), newGuest];
  const updated = await updateEvent(eventId, { people });
  return { event: updated, guestId: newGuest.id };
}

// For Cost-Split events: record a guest's RSVP
export async function setGuestRsvp(eventId, guestId, status, customFieldValue) {
  const event = await getEvent(eventId);
  if (!event) return null;
  const existing = (event.people || []).find(p => p.id === guestId);
  // After deadline, only already-in guests can still update status.
  if (deadlineHasPassed(event) && !guestIsAlreadyIn(existing)) {
    return { closed: true };
  }
  const cleanCustom = customFieldValue != null ? String(customFieldValue).trim().slice(0, 120) : undefined;
  const allowed = new Set(['invited', 'confirmed', 'paid', 'declined']);
  const nextStatus = allowed.has(status) ? status : 'confirmed';
  const people = (event.people || []).map(p => {
    if (p.id !== guestId) return p;
    const next = { ...p, status: nextStatus, rsvpAt: Date.now() };
    if (cleanCustom !== undefined) next.customFieldValue = cleanCustom;
    return next;
  });
  return updateEvent(eventId, { people });
}
