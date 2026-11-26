// Server-side Expo push — resolve an organizer's tokens and send notifications.
//
// Tokens live on the organizer's Supabase user (`user_metadata.expoPushTokens`),
// written by the mobile client. Guests never have tokens (they get email).
import { getSupabaseAdmin } from './supabase-admin';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

// Read an organizer's registered device tokens.
export async function getUserPushTokens(userId) {
  if (!userId) return [];
  try {
    const admin = getSupabaseAdmin();
    const { data, error } = await admin.auth.admin.getUserById(userId);
    if (error) throw error;
    const tokens = data.user?.user_metadata?.expoPushTokens;
    return Array.isArray(tokens) ? tokens.filter(Boolean) : [];
  } catch (err) {
    console.error('getUserPushTokens error:', err);
    return [];
  }
}

// Drop dead tokens (e.g. Expo reported DeviceNotRegistered) from the user.
async function removeUserPushTokens(userId, badTokens) {
  if (!userId || !badTokens?.length) return;
  try {
    const admin = getSupabaseAdmin();
    const { data, error } = await admin.auth.admin.getUserById(userId);
    if (error) throw error;
    const current = data.user?.user_metadata || {};
    const remaining = (current.expoPushTokens || []).filter(t => !badTokens.includes(t));
    await admin.auth.admin.updateUserById(userId, {
      user_metadata: { ...current, expoPushTokens: remaining },
    });
  } catch (err) {
    console.error('removeUserPushTokens error:', err);
  }
}

// POST a batch of messages to Expo. Returns the tickets array (or []).
async function postToExpo(messages) {
  const res = await fetch(EXPO_PUSH_URL, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(messages),
  });
  if (!res.ok) {
    console.error('Expo push HTTP error:', res.status, await res.text().catch(() => ''));
    return [];
  }
  const json = await res.json().catch(() => null);
  return Array.isArray(json?.data) ? json.data : [];
}

// Send a push to every device an organizer has registered.
// Prunes tokens Expo rejects as unregistered. Never throws.
export async function sendOrganizerPush({ ownerId, title, body, data }) {
  const tokens = await getUserPushTokens(ownerId);
  if (tokens.length === 0) return { sent: 0, reason: 'no_tokens' };

  const messages = tokens.map(to => ({
    to,
    title,
    body,
    sound: 'default',
    data: data || {},
  }));

  // Expo accepts up to 100 messages per request.
  const tickets = [];
  for (let i = 0; i < messages.length; i += 100) {
    tickets.push(...(await postToExpo(messages.slice(i, i + 100))));
  }

  // Reconcile: prune tokens whose ticket came back DeviceNotRegistered.
  const badTokens = [];
  tickets.forEach((ticket, idx) => {
    if (ticket?.status === 'error' && ticket?.details?.error === 'DeviceNotRegistered') {
      badTokens.push(messages[idx].to);
    }
  });
  if (badTokens.length) await removeUserPushTokens(ownerId, badTokens);

  const sent = tickets.filter(t => t?.status === 'ok').length;
  return { sent, pruned: badTokens.length };
}
