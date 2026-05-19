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
  const merged = { ...existing, ...event, id, updatedAt: Date.now() };
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
