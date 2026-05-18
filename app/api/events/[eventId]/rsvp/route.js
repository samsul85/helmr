import { NextResponse } from 'next/server';
import { getEvent, updateEvent } from '@/lib/events';

export const runtime = 'nodejs';

const VALID = new Set(['invited', 'confirmed', 'declined']);

export async function POST(request, { params }) {
  try {
    const { guestId, status } = await request.json();
    if (!guestId) return NextResponse.json({ error: 'guestId required' }, { status: 400 });
    if (!VALID.has(status)) return NextResponse.json({ error: 'invalid status' }, { status: 400 });

    const event = await getEvent(params.eventId);
    if (!event) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const people = (event.people || []).map(p => {
      if (p.id !== guestId) return p;
      if (p.status === 'paid' && status === 'confirmed') return p;
      return { ...p, status, rsvpAt: Date.now() };
    });

    const updated = await updateEvent(params.eventId, { people });
    return NextResponse.json({ ok: true, status: updated.people.find(p => p.id === guestId)?.status });
  } catch (err) {
    console.error('POST rsvp error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
