import { NextResponse } from 'next/server';
import { setGuestContribution, addBroadcastContribution } from '@/lib/events';

export const runtime = 'nodejs';

export async function POST(request, { params }) {
  try {
    const body = await request.json();
    const { guestId, name, amount } = body || {};

    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt < 0) {
      return NextResponse.json({ error: 'invalid amount' }, { status: 400 });
    }

    if (guestId) {
      // Personal-link or returning-broadcast guest: update existing record
      const event = await setGuestContribution(params.eventId, guestId, amt);
      if (!event) return NextResponse.json({ error: 'Not found' }, { status: 404 });
      return NextResponse.json({ ok: true, guestId });
    }

    // Broadcast first-time pledge: create a new record from the entered name
    const cleanName = String(name || '').trim();
    if (!cleanName) {
      return NextResponse.json({ error: 'name required' }, { status: 400 });
    }

    const result = await addBroadcastContribution(params.eventId, cleanName, amt);
    if (!result) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ ok: true, guestId: result.guestId });
  } catch (err) {
    console.error('POST contribute error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
