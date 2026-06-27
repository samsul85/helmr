import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getStripe } from '@/lib/stripe';

export const runtime = 'nodejs';

const supabaseAdmin = createClient(
  'https://vckmiesiybrtgfphprqh.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'PASTE_SERVICE_ROLE_KEY_HERE',
  { auth: { autoRefreshToken: false, persistSession: false } },
);

export async function POST(request) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error('[stripe/webhook] Missing STRIPE_WEBHOOK_SECRET');
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
    console.error('[stripe/webhook] Signature verification failed:', err.message);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  console.log('[stripe/webhook] received event:', event.type);

  if (event.type !== 'checkout.session.completed') {
    return NextResponse.json({ received: true }, { status: 200 });
  }

  const session = event.data.object;
  const supabaseUserId = session.metadata?.supabase_user_id;
  const planInterval = session.metadata?.plan_interval;

  if (!supabaseUserId) {
    console.error('[stripe/webhook] checkout.session.completed missing supabase_user_id');
    return NextResponse.json({ received: true }, { status: 200 });
  }

  try {
    const { error } = await supabaseAdmin.auth.admin.updateUserById(supabaseUserId, {
      user_metadata: {
        plan: 'pro',
        plan_interval: planInterval,
      },
    });

    if (error) {
      console.error('[stripe/webhook] updateUserById failed:', {
        userId: supabaseUserId,
        message: error.message,
        status: error.status,
      });
      return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
    }

    console.log('[stripe/webhook] user upgraded to pro', {
      userId: supabaseUserId,
      planInterval,
    });
  } catch (err) {
    console.error('[stripe/webhook] handler error:', err);
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
  }

  return NextResponse.json({ received: true }, { status: 200 });
}
