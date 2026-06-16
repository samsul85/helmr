import { NextResponse } from 'next/server';
import { listEventsByOwner } from '@/lib/events';
import { applySupabaseCookies, getSupabaseUserFromRequest } from '@/lib/supabase-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function summarizeEvent(event) {
  const expenses = Array.isArray(event.expenses) ? event.expenses : [];
  const people = Array.isArray(event.people) ? event.people : [];
  const total = expenses.reduce((s, e) => s + (Number(e.amount) || 0), 0);
  const pooled = people.reduce((s, p) => s + (Number(p.contributedAmount) || 0), 0);
  return {
    id: event.id,
    name: event.eventName || 'Untitled event',
    eventName: event.eventName || '',
    eventType: event.eventType || 'other',
    mode: event.mode === 'open_pool' ? 'open_pool' : 'cost_split',
    responseDeadline: event.responseDeadline || '',
    total,
    pooled,
    updatedAt: event.updatedAt || event.createdAt || 0,
    createdAt: event.createdAt || 0,
  };
}

export async function GET(request) {
  try {
    const { user, cookiesToSet } = await getSupabaseUserFromRequest(request);

    if (!user) {
      const response = NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      return applySupabaseCookies(response, cookiesToSet);
    }

    const events = await listEventsByOwner(user.id);
    const response = NextResponse.json({
      events: events.map(summarizeEvent),
    });
    return applySupabaseCookies(response, cookiesToSet);
  } catch (err) {
    console.error('GET /api/user/events error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
