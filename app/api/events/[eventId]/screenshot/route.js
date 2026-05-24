import { NextResponse } from 'next/server';
import { put, get, del } from '@vercel/blob';
import { getEvent, updateEvent } from '@/lib/events';

export const runtime = 'nodejs';

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif']);

function deadlineHasPassed(event) {
  if (!event || !event.responseDeadline) return false;
  const t = new Date(event.responseDeadline).getTime();
  return Number.isFinite(t) && t < Date.now();
}

function guestIsAlreadyIn(guest) {
  if (!guest) return false;
  if (Number(guest.contributedAmount) > 0) return true;
  if (guest.status && guest.status !== 'invited') return true;
  return false;
}

// POST: upload a screenshot for a guest
export async function POST(request, { params }) {
  try {
    const form = await request.formData();
    const file = form.get('file');
    const guestId = form.get('guestId');

    if (!guestId || typeof guestId !== 'string') {
      return NextResponse.json({ error: 'guestId required' }, { status: 400 });
    }
    if (!file || typeof file === 'string') {
      return NextResponse.json({ error: 'file required' }, { status: 400 });
    }
    if (!ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json({ error: 'Only image files (JPG, PNG, HEIC, WebP, GIF) are accepted.' }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: 'File is too large (max 5 MB).' }, { status: 400 });
    }

    const event = await getEvent(params.eventId);
    if (!event) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const existing = (event.people || []).find(p => p.id === guestId);
    if (!existing) {
      return NextResponse.json({ error: 'Guest not in event' }, { status: 404 });
    }

    // Lenient closed-pool: an already-in guest can still upload proof of payment
    if (deadlineHasPassed(event) && !guestIsAlreadyIn(existing)) {
      return NextResponse.json({ error: 'Event is closed.' }, { status: 410 });
    }

    // Upload to private Vercel Blob. The returned pathname is the durable handle.
    const ext = (file.type.split('/')[1] || 'bin').toLowerCase();
    const filename = `screenshots/${params.eventId}/${guestId}.${ext}`;
    const blob = await put(filename, file, {
      access: 'private',
      addRandomSuffix: true,
      contentType: file.type,
    });

    // If the guest already had a screenshot, delete the old one to save space.
    const oldKey = existing.paymentScreenshotKey;
    if (oldKey && oldKey !== blob.pathname) {
      try { await del(oldKey); } catch {}
    }

    // Update the guest record — mark paid and store the key + metadata.
    const people = (event.people || []).map(p => {
      if (p.id !== guestId) return p;
      return {
        ...p,
        paymentScreenshotKey: blob.pathname,
        paymentScreenshotUploadedAt: Date.now(),
        status: 'paid',
      };
    });

    await updateEvent(params.eventId, { people });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('POST screenshot error:', err);
    return NextResponse.json({ error: 'Upload failed. Please try again.' }, { status: 500 });
  }
}

// GET: stream the screenshot through. The blob is private — only our API can fetch it.
// Anyone with the eventId + guestId pair can view, which matches the existing event-data access model.
export async function GET(request, { params }) {
  try {
    const { searchParams } = new URL(request.url);
    const guestId = searchParams.get('guestId');
    if (!guestId) return NextResponse.json({ error: 'guestId required' }, { status: 400 });

    const event = await getEvent(params.eventId);
    if (!event) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const guest = (event.people || []).find(p => p.id === guestId);
    if (!guest || !guest.paymentScreenshotKey) {
      return NextResponse.json({ error: 'No screenshot' }, { status: 404 });
    }

    const blob = await get(guest.paymentScreenshotKey);
    if (!blob) return NextResponse.json({ error: 'No screenshot' }, { status: 404 });

    // get() returns a stream-able response from the private blob.
    return new Response(blob.body, {
      status: 200,
      headers: {
        'Content-Type': blob.contentType || 'application/octet-stream',
        'Cache-Control': 'private, max-age=300',
      },
    });
  } catch (err) {
    console.error('GET screenshot error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// DELETE: remove a screenshot (organizer or guest themselves)
export async function DELETE(request, { params }) {
  try {
    const { guestId } = await request.json().catch(() => ({}));
    if (!guestId) return NextResponse.json({ error: 'guestId required' }, { status: 400 });

    const event = await getEvent(params.eventId);
    if (!event) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const guest = (event.people || []).find(p => p.id === guestId);
    if (!guest || !guest.paymentScreenshotKey) {
      return NextResponse.json({ ok: true });
    }

    try { await del(guest.paymentScreenshotKey); } catch {}

    const people = (event.people || []).map(p => {
      if (p.id !== guestId) return p;
      const next = { ...p };
      delete next.paymentScreenshotKey;
      delete next.paymentScreenshotUploadedAt;
      return next;
    });

    await updateEvent(params.eventId, { people });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('DELETE screenshot error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
