import { NextResponse } from 'next/server';
import { createEvent } from '@/lib/events';

export const runtime = 'nodejs';

export async function POST(request) {
  try {
    const body = await request.json();

    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
    }

    const event = await createEvent({
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

    return NextResponse.json(event);
  } catch (err) {
    console.error('POST /api/events error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
