import Stripe from 'stripe';

let stripeClient;

export function getStripe() {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error('Missing STRIPE_SECRET_KEY');
  }

  if (!stripeClient) {
    stripeClient = new Stripe(secretKey);
  }

  return stripeClient;
}

export function getStripePriceId(interval) {
  const priceId = interval === 'yearly'
    ? process.env.STRIPE_PRICE_YEARLY
    : process.env.STRIPE_PRICE_MONTHLY;

  if (!priceId) {
    throw new Error(
      interval === 'yearly'
        ? 'Missing STRIPE_PRICE_YEARLY'
        : 'Missing STRIPE_PRICE_MONTHLY'
    );
  }

  return priceId;
}
