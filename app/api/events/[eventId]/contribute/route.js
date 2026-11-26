import { NextResponse } from 'next/server';
import { setGuestContribution, addBroadcastContribution } from '@/lib/events';
import { createOrganizerNotificationEmail, createGuestContributionConfirmedEmail, sendEmail } from '@/lib/email';
import { sendOrganizerPush } from '@/lib/push';

export const runtime = 'nodejs';

// Fire-and-forget organizer push; never let a push problem fail the guest action.
async function pushOrganizer(event, message, eventId) {
  if (!event?.ownerId) return;
  try {
    await sendOrganizerPush({
      ownerId: event.ownerId,
      title: event.eventName || 'Helmr',
      body: message,
      data: { eventId, title: event.eventName },
    });
  } catch (err) {
    console.error('Organizer push failed:', err);
  }
}

// Email the guest their pledge + e-Transfer details (only if they gave an email).
async function emailGuestPledge(event, guest) {
  const email = createGuestContributionConfirmedEmail({ event, guest });
  if (!email) return;
  try {
    await sendEmail(email);
  } catch (err) {
    console.error('Guest contribution email failed:', err);
  }
}

export async function POST(request, { params }) {
  try {
    const body = await request.json();
    const { guestId, name, amount, customFieldValue, email: guestEmailInput } = body || {};

    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt < 0) {
      return NextResponse.json({ error: 'invalid amount' }, { status: 400 });
    }

    if (guestId) {
      // Personal-link or returning-broadcast guest: update existing record
      const result = await setGuestContribution(params.eventId, guestId, amt, customFieldValue, guestEmailInput);
      if (!result) return NextResponse.json({ error: 'Not found' }, { status: 404 });
      if (result.closed) {
        return NextResponse.json({ error: 'Event is closed to new joiners.' }, { status: 410 });
      }
      const guest = result.people?.find(p => p.id === guestId);
      await emailGuestPledge(result, guest);
      await pushOrganizer(
        result,
        `${guest?.name || 'A guest'} contributed $${Math.round(amt).toLocaleString()}`,
        params.eventId,
      );
      return NextResponse.json({ ok: true, guestId });
    }

    // Broadcast first-time pledge: create a new record from the entered name
    const cleanName = String(name || '').trim();
    if (!cleanName) {
      return NextResponse.json({ error: 'name required' }, { status: 400 });
    }

    const result = await addBroadcastContribution(params.eventId, cleanName, amt, customFieldValue, guestEmailInput);
    if (!result) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (result.closed) {
      return NextResponse.json({ error: 'Event is closed to new contributions.' }, { status: 410 });
    }
    const guest = result.event.people.find(p => p.id === result.guestId);
    const email = createOrganizerNotificationEmail({
      event: result.event,
      whatHappened: `Broadcast contribution pledged: $${Math.round(amt).toLocaleString()}`,
      actorName: guest?.name || cleanName,
    });
    if (email) {
      try {
        await sendEmail(email);
      } catch (emailError) {
        console.error('Broadcast contribution notification email failed:', emailError);
      }
    }
    await emailGuestPledge(result.event, guest);
    await pushOrganizer(
      result.event,
      `${guest?.name || cleanName} contributed $${Math.round(amt).toLocaleString()}`,
      params.eventId,
    );

    return NextResponse.json({ ok: true, guestId: result.guestId });
  } catch (err) {
    console.error('POST contribute error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
