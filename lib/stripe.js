import Stripe from 'stripe';

let stripeClient;

export function getStripeConfigStatus() {
  return {
    hasSecretKey: Boolean(process.env.STRIPE_SECRET_KEY),
    hasMonthlyPrice: Boolean(process.env.STRIPE_PRICE_MONTHLY),
    hasYearlyPrice: Boolean(process.env.STRIPE_PRICE_YEARLY),
    monthlyPriceId: process.env.STRIPE_PRICE_MONTHLY || null,
    yearlyPriceId: process.env.STRIPE_PRICE_YEARLY || null,
  };
}

export function getStripe() {
  const secretKey = process.env.STRIPE_SECRET_KEY?.trim();
  if (!secretKey) {
    const status = getStripeConfigStatus();
    console.error('[stripe] Missing STRIPE_SECRET_KEY', status);
    throw new Error('Missing STRIPE_SECRET_KEY');
  }

  if (!stripeClient) {
    stripeClient = new Stripe(secretKey);
  }

  return stripeClient;
}

export function getStripePriceId(interval) {
  const monthlyPriceId = process.env.STRIPE_PRICE_MONTHLY?.trim();
  const yearlyPriceId = process.env.STRIPE_PRICE_YEARLY?.trim();
  const priceId = interval === 'yearly' ? yearlyPriceId : monthlyPriceId;

  if (!priceId) {
    const status = getStripeConfigStatus();
    console.error('[stripe] Missing price ID for interval:', interval, status);
    throw new Error(
      interval === 'yearly'
        ? 'Missing STRIPE_PRICE_YEARLY'
        : 'Missing STRIPE_PRICE_MONTHLY'
    );
  }

  return priceId;
}
