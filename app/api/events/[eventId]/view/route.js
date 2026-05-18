import { NextResponse } from 'next/server';
import { markGuestViewed } from '@/lib/events';

export const runtime = 'nodejs';

export async function POST(request, { params }) {
  try {
    const { guestId } = await request.json();
    if (!guestId) return NextResponse.json({ error: 'guestId required' }, { status: 400 });
    const event = await markGuestViewed(params.eventId, guestId);
    if (!event) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('POST view error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
