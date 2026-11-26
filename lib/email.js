import { Resend } from 'resend';

const FROM_EMAIL = 'sam@helmr.ca';
const RESEND_API_KEY = process.env.RESEND_API_KEY;

let resendClient;

function getResendClient() {
  if (!RESEND_API_KEY) {
    return null;
  }

  if (!resendClient) {
    resendClient = new Resend(RESEND_API_KEY);
  }

  return resendClient;
}

export async function sendEmail({ to, subject, html, text }) {
  if (!to) {
    return { skipped: true, reason: 'missing_to' };
  }

  const resend = getResendClient();
  if (!resend) {
    console.warn('RESEND_API_KEY is not configured; skipping email send.');
    return { skipped: true, reason: 'missing_api_key' };
  }

  return resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject,
    html,
    text,
  });
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function formatCurrency(amount) {
  return `$${Math.round(Number(amount) || 0).toLocaleString()}`;
}

function getCurrentTotal(event) {
  if (event?.mode === 'open_pool') {
    return (event.people || []).reduce((sum, person) => {
      return sum + (Number(person.contributedAmount) || 0);
    }, 0);
  }

  return (event?.expenses || []).reduce((sum, expense) => {
    return sum + (Number(expense.amount) || 0);
  }, 0);
}

export function createOrganizerNotificationEmail({ event, whatHappened, actorName }) {
  if (!event || event.notificationPreference === 'digest') {
    return null;
  }
  if (!event.organizerEmail) {
    return null;
  }

  const eventName = event.eventName || 'Your event';
  const who = actorName || 'Someone';
  const currentTotal = formatCurrency(getCurrentTotal(event));
  const subject = `Helmr update: ${eventName}`;
  const text = [
    eventName,
    '',
    `What happened: ${whatHappened}`,
    `Who: ${who}`,
    `Current total: ${currentTotal}`,
  ].join('\n');
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1a1a1a; line-height: 1.5;">
      <h2 style="margin: 0 0 12px;">${escapeHtml(eventName)}</h2>
      <p style="margin: 0 0 8px;"><strong>What happened:</strong> ${escapeHtml(whatHappened)}</p>
      <p style="margin: 0 0 8px;"><strong>Who:</strong> ${escapeHtml(who)}</p>
      <p style="margin: 0;"><strong>Current total:</strong> ${escapeHtml(currentTotal)}</p>
    </div>
  `;

  return {
    to: event.organizerEmail,
    subject,
    text,
    html,
  };
}

// Wrap body HTML in the shared shell. `preheader` shows in inbox previews.
function guestEmailShell({ title, bodyHtml }) {
  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1a1a1a; line-height: 1.5;">
      <h2 style="margin: 0 0 12px; color: #0F6E56;">${escapeHtml(title)}</h2>
      ${bodyHtml}
      <p style="margin: 20px 0 0; font-size: 12px; color: #999;">
        You're getting this because you shared your email when responding to this event on Helmr.
        Reply to this email to reach the organizer, or ignore it to stop updates for this event.
      </p>
    </div>
  `;
}

// Sent to a guest when the organizer marks them paid.
export function createGuestPaymentConfirmedEmail({ event, guest }) {
  if (!event || !guest || !guest.email) return null;

  const eventName = event.eventName || 'your event';
  const name = guest.name || 'there';
  const paid = Number(guest.contributedAmount) > 0 ? formatCurrency(guest.contributedAmount) : null;
  const subject = `Payment confirmed — ${eventName}`;
  const text = [
    `Hi ${name},`,
    '',
    `Your payment for "${eventName}" has been confirmed by the organizer${paid ? ` (${paid})` : ''}.`,
    'Thanks for chipping in!',
  ].join('\n');
  const html = guestEmailShell({
    title: 'Payment confirmed',
    bodyHtml: `
      <p style="margin: 0 0 8px;">Hi ${escapeHtml(name)},</p>
      <p style="margin: 0 0 8px;">Your payment for <strong>${escapeHtml(eventName)}</strong> has been confirmed by the organizer${paid ? ` (<strong>${escapeHtml(paid)}</strong>)` : ''}.</p>
      <p style="margin: 0;">Thanks for chipping in! 🎉</p>
    `,
  });

  return { to: guest.email, subject, text, html };
}

// Sent to guests when the organizer updates the event.
export function createGuestEventUpdateEmail({ event, guest }) {
  if (!event || !guest || !guest.email) return null;

  const eventName = event.eventName || 'your event';
  const name = guest.name || 'there';
  const when = event.eventDate ? `When: ${event.eventDate}` : null;
  const where = event.eventLoc ? `Where: ${event.eventLoc}` : null;
  const details = [when, where].filter(Boolean);
  const subject = `Update — ${eventName}`;
  const text = [
    `Hi ${name},`,
    '',
    `The organizer updated "${eventName}". Here are the latest details:`,
    ...details,
    '',
    'Open your event link for the full picture.',
  ].filter(Boolean).join('\n');
  const html = guestEmailShell({
    title: `Update — ${eventName}`,
    bodyHtml: `
      <p style="margin: 0 0 8px;">Hi ${escapeHtml(name)},</p>
      <p style="margin: 0 0 8px;">The organizer just updated <strong>${escapeHtml(eventName)}</strong>.</p>
      ${details.length ? `<p style="margin: 0 0 8px;">${details.map(escapeHtml).join('<br>')}</p>` : ''}
      <p style="margin: 0;">Open your event link for the full picture.</p>
    `,
  });

  return { to: guest.email, subject, text, html };
}

export async function sendOrganizerLiveNotification({ event, whatHappened, actorName }) {
  const email = createOrganizerNotificationEmail({ event, whatHappened, actorName });
  if (!email) {
    return { skipped: true, reason: 'notification_not_sendable' };
  }

  try {
    return await sendEmail(email);
  } catch (err) {
    console.error('Organizer notification email failed:', err);
    return { skipped: true, reason: 'send_failed' };
  }
}
