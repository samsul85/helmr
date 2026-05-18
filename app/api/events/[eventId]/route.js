import { NextResponse } from 'next/server';
import { getEvent, updateEvent } from '@/lib/events';

export const runtime = 'nodejs';

export async function GET(request, { params }) {
  try {
    const event = await getEvent(params.eventId);
    if (!event) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(event);
  } catch (err) {
    console.error('GET /api/events/[id] error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function PATCH(request, { params }) {
  try {
    const body = await request.json();
    const updated = await updateEvent(params.eventId, body);
    if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(updated);
  } catch (err) {
    console.error('PATCH /api/events/[id] error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
