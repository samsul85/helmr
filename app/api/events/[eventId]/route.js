import { NextResponse } from 'next/server';
import { getEvent, updateEvent, deleteEvent } from '@/lib/events';
import {
  createGuestPaymentConfirmedEmail,
  createGuestEventUpdateEmail,
  sendEmail,
} from '@/lib/email';

export const runtime = 'nodejs';

function deadlineHasPassed(event) {
  if (!event || !event.responseDeadline) return false;
  const t = new Date(event.responseDeadline).getTime();
  return Number.isFinite(t) && t < Date.now();
}

// Fan out guest-facing emails after an organizer write. Two triggers:
//   1. Mark paid — a guest's status transitioned to 'paid' (before → after).
//      Fires automatically; the before/after diff makes it idempotent, so
//      repeated autosaves never re-email an already-paid guest.
//   2. Event update — only when the caller explicitly sets `notifyGuests: true`.
//      This gate is deliberate: the organizer dashboard autosaves constantly,
//      and auto-emailing on every PATCH would spam guests. Recipients are
//      deadline-gated: before the deadline → confirmed guests; after → paid.
// Only guests who opted in with an email are contacted.
async function dispatchGuestEmails({ before, after, notifyGuests }) {
  const emails = [];

  const prevById = new Map((before?.people || []).map(p => [p.id, p]));
  const guests = (after?.people || []).filter(p => p.role !== 'organizer' && p.email);

  // Trigger 1: newly-paid guests.
  for (const g of guests) {
    const was = prevById.get(g.id);
    if (g.status === 'paid' && was?.status !== 'paid') {
      const email = createGuestPaymentConfirmedEmail({ event: after, guest: g });
      if (email) emails.push(email);
    }
  }

  // Trigger 2: explicit "notify guests of update".
  if (notifyGuests) {
    const passed = deadlineHasPassed(after);
    const recipients = guests.filter(g =>
      passed ? g.status === 'paid' : (g.status === 'confirmed' || g.status === 'paid')
    );
    for (const g of recipients) {
      const email = createGuestEventUpdateEmail({ event: after, guest: g });
      if (email) emails.push(email);
    }
  }

  if (emails.length === 0) return;
  const results = await Promise.allSettled(emails.map(e => sendEmail(e)));
  const failed = results.filter(r => r.status === 'rejected').length;
  if (failed) console.error(`dispatchGuestEmails: ${failed}/${emails.length} guest emails failed`);
}

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
    // `notifyGuests` is a transport-only flag; strip it before persisting.
    const { notifyGuests, ...patch } = body || {};

    const before = await getEvent(params.eventId);
    const updated = await updateEvent(params.eventId, patch);
    if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    // Guest emails (mark-paid + optional update broadcast). Never block or fail
    // the write on email problems.
    try {
      await dispatchGuestEmails({ before, after: updated, notifyGuests: !!notifyGuests });
    } catch (emailError) {
      console.error('PATCH guest email dispatch failed:', emailError);
    }

    return NextResponse.json(updated);
  } catch (err) {
    console.error('PATCH /api/events/[id] error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const deleted = await deleteEvent(params.eventId);
    if (!deleted) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('DELETE /api/events/[id] error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
