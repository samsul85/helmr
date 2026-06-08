import { NextResponse } from 'next/server';
import { getEvent, updateEvent } from '@/lib/events';
import { sendOrganizerLiveNotification } from '@/lib/email';

export const runtime = 'nodejs';

const VALID = new Set(['invited', 'confirmed', 'declined']);

function deadlineHasPassed(event) {
  if (!event || !event.responseDeadline) return false;
  const t = new Date(event.responseDeadline).getTime();
  return Number.isFinite(t) && t < Date.now();
}

function guestIsAlreadyIn(guest) {
  if (!guest) return false;
  if (Number(guest.contributedAmount) > 0) return true;
  if (guest.status && guest.status !== 'invited') return true;
  return false;
}

export async function POST(request, { params }) {
  try {
    const { guestId, status, customFieldValue } = await request.json();
    if (!guestId) return NextResponse.json({ error: 'guestId required' }, { status: 400 });
    if (!VALID.has(status)) return NextResponse.json({ error: 'invalid status' }, { status: 400 });

    const event = await getEvent(params.eventId);
    if (!event) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const existing = (event.people || []).find(p => p.id === guestId);
    if (deadlineHasPassed(event) && !guestIsAlreadyIn(existing)) {
      return NextResponse.json({ error: 'Event is closed to new joiners.' }, { status: 410 });
    }

    const cleanCustom = customFieldValue != null
      ? String(customFieldValue).trim().slice(0, 120)
      : undefined;

    const people = (event.people || []).map(p => {
      if (p.id !== guestId) return p;
      // Don't downgrade a paid guest back to confirmed
      if (p.status === 'paid' && status === 'confirmed') {
        const next = { ...p };
        if (cleanCustom !== undefined) next.customFieldValue = cleanCustom;
        return next;
      }
      const next = { ...p, status, rsvpAt: Date.now() };
      if (cleanCustom !== undefined) next.customFieldValue = cleanCustom;
      return next;
    });

    const updated = await updateEvent(params.eventId, { people });
    const guest = updated.people.find(p => p.id === guestId);
    await sendOrganizerLiveNotification({
      event: updated,
      whatHappened: `RSVP updated to ${guest?.status || status}`,
      actorName: guest?.name || 'Guest',
    });

    return NextResponse.json({ ok: true, status: guest?.status });
  } catch (err) {
    console.error('POST rsvp error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
