import { NextResponse } from 'next/server';
import { createEvent, listEventsByOwner } from '@/lib/events';
import { applySupabaseCookies, getSupabaseUserFromRequest } from '@/lib/supabase-server';

export const runtime = 'nodejs';

export async function POST(request) {
  try {
    const body = await request.json();

    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
    }

    const ownerId = typeof body.ownerId === 'string' ? body.ownerId.trim() : '';
    if (!ownerId) {
      return NextResponse.json({ error: 'Missing ownerId' }, { status: 400 });
    }

    const { user, cookiesToSet } = await getSupabaseUserFromRequest(request);
    if (!user) {
      const response = NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      return applySupabaseCookies(response, cookiesToSet);
    }
    if (ownerId !== user.id) {
      const response = NextResponse.json({ error: 'Invalid ownerId' }, { status: 403 });
      return applySupabaseCookies(response, cookiesToSet);
    }

    const existingEvents = await listEventsByOwner(ownerId);
    if (existingEvents.length >= 1) {
      const response = NextResponse.json(
        { error: 'Upgrade to Pro to create unlimited events' },
        { status: 403 }
      );
      return applySupabaseCookies(response, cookiesToSet);
    }

    const event = await createEvent({
      ownerId,
      eventType: body.eventType || null,
      eventName: body.eventName || '',
      eventDate: body.eventDate || '',
      eventLoc: body.eventLoc || '',
      dateTBD: !!body.dateTBD,
      locTBD: !!body.locTBD,
      organizerName: body.organizerName || 'Organizer',
      organizerEmail: body.organizerEmail || '',
      mode: body.mode === 'open_pool' ? 'open_pool' : 'cost_split',
      inviteMode: body.inviteMode === 'broadcast' ? 'broadcast' : 'personal',
      goal: Number(body.goal) || 0,
      suggestionAmount: Number(body.suggestionAmount) || 0,
      suggestionUnit: body.suggestionUnit || '',
      people: body.people || [],
      expenses: body.expenses || [],
      tip: Number(body.tip) || 0,
      viewCount: 0,
    });

    const response = NextResponse.json(event);
    return applySupabaseCookies(response, cookiesToSet);
  } catch (err) {
    console.error('POST /api/events error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
