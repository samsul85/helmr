import { NextResponse } from 'next/server';
import { setGuestTip } from '@/lib/events';

export const runtime = 'nodejs';

export async function POST(request, { params }) {
  try {
    const { guestId, amount } = await request.json();
    if (!guestId) return NextResponse.json({ error: 'guestId required' }, { status: 400 });

    const result = await setGuestTip(params.eventId, guestId, amount);
    if (!result) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (result.disabled) return NextResponse.json({ error: 'Tipping not enabled for this event' }, { status: 403 });
    if (result.closed) return NextResponse.json({ error: 'Event is closed to new joiners.' }, { status: 410 });

    const updated = result;
    const me = updated.people.find(p => p.id === guestId);
    return NextResponse.json({ ok: true, tipAmount: me?.tipAmount || 0 });
  } catch (err) {
    console.error('POST tip error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
