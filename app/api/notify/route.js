import { NextResponse } from 'next/server';
import { getEvent } from '@/lib/events';
import { sendOrganizerPush } from '@/lib/push';
import { applySupabaseCookies, getSupabaseUserFromRequest } from '@/lib/supabase-server';

export const runtime = 'nodejs';

// POST /api/notify
// Body: { eventId, title, body, data? }
// Sends a push to the *organizer's* own devices. The caller must be the
// authenticated organizer who owns the event (Bearer access token).
export async function POST(request) {
  try {
    const { user, cookiesToSet } = await getSupabaseUserFromRequest(request);
    if (!user) {
      const response = NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      return applySupabaseCookies(response, cookiesToSet);
    }

    const body = await request.json();
    const { eventId, title, body: message, data } = body || {};
    if (!eventId) {
      return NextResponse.json({ error: 'eventId required' }, { status: 400 });
    }

    const event = await getEvent(eventId);
    if (!event) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    // Only the owner may trigger pushes for their event.
    if (event.ownerId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const result = await sendOrganizerPush({
      ownerId: user.id,
      title: title || event.eventName || 'Helmr',
      body: message || 'You have a new update.',
      data: { eventId, title: event.eventName, ...(data || {}) },
    });

    const response = NextResponse.json({ ok: true, ...result });
    return applySupabaseCookies(response, cookiesToSet);
  } catch (err) {
    console.error('POST /api/notify error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
