import { getEvent } from '@/lib/events';
import GuestView from './GuestView';

export const dynamic = 'force-dynamic';

export default async function GuestPage({ params, searchParams }) {
  const event = await getEvent(params.eventId);
  const guestId = searchParams?.g || null;

  if (!event) {
    return (
      <div style={{ minHeight: '100vh', background: '#f5f3ee', padding: '60px 20px', textAlign: 'center', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
        <div style={{ fontSize: '48px', marginBottom: '8px' }}>⚓</div>
        <h2 style={{ fontWeight: 500, margin: '0 0 8px' }}>Event not found</h2>
        <p style={{ color: '#666', fontSize: '14px' }}>
          This link may be expired or incorrect. Please check with the organizer.
        </p>
      </div>
    );
  }

  return <GuestView event={event} guestId={guestId} />;
}
