import { NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe';
import { setUserProStatus } from '@/lib/supabase-admin';

export const runtime = 'nodejs';

function getUserIdFromSession(session) {
  return session?.metadata?.supabase_user_id || session?.client_reference_id || null;
}

export async function POST(request) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error('Missing STRIPE_WEBHOOK_SECRET');
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 });
  }

  const signature = request.headers.get('stripe-signature');
  if (!signature) {
    return NextResponse.json({ error: 'Missing stripe-signature' }, { status: 400 });
  }

  let event;
  try {
    const stripe = getStripe();
    const rawBody = await request.text();
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    console.error('Stripe webhook signature verification failed:', err.message);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const userId = getUserIdFromSession(session);

      if (!userId) {
        console.error('checkout.session.completed missing supabase user id');
        return NextResponse.json({ received: true });
      }

      await setUserProStatus(userId, true);
    }
  } catch (err) {
    console.error('Stripe webhook handler error:', err);
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
