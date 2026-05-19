import { NextResponse } from 'next/server';
import { markGuestViewed, incrementViewCount } from '@/lib/events';

export const runtime = 'nodejs';

export async function POST(request, { params }) {
  try {
    const { guestId } = await request.json().catch(() => ({}));

    if (guestId) {
      // Personal-link mode: mark the specific guest as viewed
      const event = await markGuestViewed(params.eventId, guestId);
      if (!event) return NextResponse.json({ error: 'Not found' }, { status: 404 });
      return NextResponse.json({ ok: true });
    }

    // Broadcast mode: just increment the anonymous view counter
    const event = await incrementViewCount(params.eventId);
    if (!event) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('POST view error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
