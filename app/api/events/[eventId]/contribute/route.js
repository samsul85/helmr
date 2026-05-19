import { NextResponse } from 'next/server';
import { setGuestContribution } from '@/lib/events';

export const runtime = 'nodejs';

export async function POST(request, { params }) {
  try {
    const { guestId, amount } = await request.json();
    if (!guestId) return NextResponse.json({ error: 'guestId required' }, { status: 400 });
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt < 0) return NextResponse.json({ error: 'invalid amount' }, { status: 400 });

    const event = await setGuestContribution(params.eventId, guestId, amt);
    if (!event) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('POST contribute error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
