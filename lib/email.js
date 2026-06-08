import { Resend } from 'resend';

const FROM_EMAIL = 'sam@helmr.ca';

let resendClient;

function getResendClient() {
  if (!process.env.RESEND_API_KEY) {
    return null;
  }

  if (!resendClient) {
    resendClient = new Resend(process.env.RESEND_API_KEY);
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

export async function sendOrganizerLiveNotification({ event, whatHappened, actorName }) {
  if (!event || event.notificationPreference === 'digest') {
    return { skipped: true, reason: 'digest_preference' };
  }
  if (!event.organizerEmail) {
    return { skipped: true, reason: 'missing_organizer_email' };
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

  try {
    return await sendEmail({
      to: event.organizerEmail,
      subject,
      text,
      html,
    });
  } catch (err) {
    console.error('Organizer notification email failed:', err);
    return { skipped: true, reason: 'send_failed' };
  }
}
