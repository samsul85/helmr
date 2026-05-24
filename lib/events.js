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

  // People-list merge to prevent autosave from clobbering broadcast contributors
  // who joined between the client's last load and the next save.
  //
  // Rule: if the incoming payload includes `people`, we take the client's list
  // but re-add any server-only broadcast contributors whose IDs the client
  // didn't know about. The client signals what it knew via `knownGuestIds`.
  // - Person on server, ID in knownGuestIds, missing from incoming → client
  //   explicitly removed them, respect the delete.
  // - Person on server, ID NOT in knownGuestIds, missing from incoming →
  //   joined after the client's last sync, keep them.
  let nextPeople = event.people;
  if (Array.isArray(event.people)) {
    const incomingIds = new Set(event.people.map(p => p.id));
    const knownIds = new Set(Array.isArray(event.knownGuestIds) ? event.knownGuestIds : []);
    const survivors = (existing.people || []).filter(p =>
      p.source === 'broadcast' && !incomingIds.has(p.id) && !knownIds.has(p.id)
    );
    nextPeople = [...event.people, ...survivors];
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

// For Open Pool events: record a guest's contribution amount
export async function setGuestContribution(eventId, guestId, amount) {
  const event = await getEvent(eventId);
  if (!event) return null;
  const people = (event.people || []).map(p => {
    if (p.id !== guestId) return p;
    return {
      ...p,
      contributedAmount: Number(amount) || 0,
      status: 'confirmed',
      rsvpAt: Date.now(),
    };
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
export async function addBroadcastContribution(eventId, name, amount) {
  const event = await getEvent(eventId);
  if (!event) return null;
  const cleanName = String(name || '').trim().slice(0, 80) || 'Anonymous';
  const amt = Number(amount) || 0;
  const newGuest = {
    id: generateGuestId(),
    name: cleanName,
    status: 'confirmed',
    contributedAmount: amt,
    rsvpAt: Date.now(),
    source: 'broadcast',
  };
  const people = [...(event.people || []), newGuest];
  const updated = await updateEvent(eventId, { people });
  return { event: updated, guestId: newGuest.id };
}
