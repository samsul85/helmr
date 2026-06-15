import { NextResponse } from 'next/server';
import { getStripe, getStripeConfigStatus, getStripePriceId } from '@/lib/stripe';
import { applySupabaseCookies, getSupabaseUserFromRequest } from '@/lib/supabase-server';

export const runtime = 'nodejs';

function getOrigin(request) {
  const forwardedHost = request.headers.get('x-forwarded-host');
  const forwardedProto = request.headers.get('x-forwarded-proto') || 'https';
  if (forwardedHost) {
    return `${forwardedProto}://${forwardedHost}`;
  }

  const host = request.headers.get('host');
  if (host) {
    const protocol = host.includes('localhost') ? 'http' : 'https';
    return `${protocol}://${host}`;
  }

  return process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
}

export async function POST(request) {
  try {
    const body = await request.json();
    const interval = body?.interval === 'yearly' ? 'yearly' : 'monthly';
    const email = typeof body?.email === 'string' ? body.email.trim() : '';

    console.error('[stripe/checkout] request received', {
      interval,
      hasEmail: Boolean(email),
      env: getStripeConfigStatus(),
    });

    if (!email) {
      console.error('[stripe/checkout] missing email in request body');
      return NextResponse.json({ error: 'Missing email' }, { status: 400 });
    }

    const { user, cookiesToSet } = await getSupabaseUserFromRequest(request);
    if (!user) {
      console.error('[stripe/checkout] unauthorized — no Supabase user in session');
      const response = NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      return applySupabaseCookies(response, cookiesToSet);
    }

    const stripe = getStripe();
    const origin = getOrigin(request);
    const priceId = getStripePriceId(interval);

    console.error('[stripe/checkout] creating session', {
      userId: user.id,
      interval,
      priceId,
      origin,
    });

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer_email: email,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/app?upgraded=true`,
      cancel_url: `${origin}/app`,
      client_reference_id: user.id,
      metadata: {
        supabase_user_id: user.id,
        plan_interval: interval,
      },
      subscription_data: {
        metadata: {
          supabase_user_id: user.id,
          plan_interval: interval,
        },
      },
    });

    if (!session.url) {
      console.error('[stripe/checkout] Stripe returned session without url', {
        sessionId: session.id,
      });
      return NextResponse.json({ error: 'Stripe session missing checkout URL' }, { status: 500 });
    }

    console.error('[stripe/checkout] session created', { sessionId: session.id });

    const response = NextResponse.json({ url: session.url });
    return applySupabaseCookies(response, cookiesToSet);
  } catch (err) {
    console.error('[stripe/checkout] failed', {
      message: err?.message,
      type: err?.type,
      code: err?.code,
      statusCode: err?.statusCode,
      raw: err?.raw,
      env: getStripeConfigStatus(),
    });
    return NextResponse.json(
      { error: err?.message || 'Could not start checkout' },
      { status: 500 }
    );
  }
}
