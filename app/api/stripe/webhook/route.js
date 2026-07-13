import { NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe';
import { setUserProStatus } from '@/lib/supabase-admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function getUserIdFromStripeObject(obj) {
  return (
    obj?.metadata?.supabase_user_id
    || obj?.client_reference_id
    || null
  );
}

async function grantPro(userId, planInterval) {
  await setUserProStatus(userId, true, { planInterval: planInterval || null });
  console.log('[stripe/webhook] user upgraded to pro', { userId, planInterval });
}

async function revokePro(userId) {
  await setUserProStatus(userId, false);
  console.log('[stripe/webhook] user reverted to free', { userId });
}

export async function POST(request) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error('[stripe/webhook] Missing STRIPE_WEBHOOK_SECRET');
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 });
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('[stripe/webhook] Missing SUPABASE_SERVICE_ROLE_KEY');
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

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;

        // Subscription checkouts should only grant Pro once payment succeeded.
        if (
          session.mode === 'subscription'
          && session.payment_status
          && session.payment_status !== 'paid'
          && session.payment_status !== 'no_payment_required'
        ) {
          console.log('[stripe/webhook] skipping unpaid checkout session', {
            sessionId: session.id,
            payment_status: session.payment_status,
          });
          break;
        }

        const userId = getUserIdFromStripeObject(session);
        if (!userId) {
          console.error('[stripe/webhook] checkout.session.completed missing supabase user id');
          break;
        }

        await grantPro(userId, session.metadata?.plan_interval);
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        const userId = getUserIdFromStripeObject(subscription);
        if (!userId) {
          console.error('[stripe/webhook] subscription.updated missing supabase_user_id');
          break;
        }

        const activeStatuses = new Set(['active', 'trialing']);
        if (activeStatuses.has(subscription.status)) {
          await grantPro(userId, subscription.metadata?.plan_interval);
        } else {
          await revokePro(userId);
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        const userId = getUserIdFromStripeObject(subscription);
        if (!userId) {
          console.error('[stripe/webhook] subscription.deleted missing supabase_user_id');
          break;
        }
        await revokePro(userId);
        break;
      }

      default:
        // Acknowledge unhandled events so Stripe does not retry them.
        break;
    }
  } catch (err) {
    console.error('[stripe/webhook] handler error:', {
      type: event.type,
      message: err?.message,
      status: err?.status,
    });
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
  }

  return NextResponse.json({ received: true }, { status: 200 });
}
